import asyncio
import json
import socket
import threading
from http.server import HTTPServer, BaseHTTPRequestHandler

try:
    from websockets.asyncio.server import serve
    from websockets.exceptions import ConnectionClosed
    print("[init] Using websockets.asyncio.server (modern API)")
except ImportError:
    from websockets.server import serve
    from websockets.exceptions import ConnectionClosed
    print("[init] Using legacy websockets.server API")

# ⚠️ DPI awareness — MUST run before pynput reads screen metrics
try:
    import ctypes
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
    print("[init] DPI awareness: per-monitor")
except Exception as e:
    print(f"[init] DPI awareness not set: {e}")

from pynput.mouse import Controller, Button
mouse = Controller()

# ── Screen info using the SAME API pynput uses ──
def get_screen_info():
    try:
        import ctypes
        u = ctypes.windll.user32
        return {
            'primary_w': u.GetSystemMetrics(0),
            'primary_h': u.GetSystemMetrics(1),
            'virt_x':    u.GetSystemMetrics(76),
            'virt_y':    u.GetSystemMetrics(77),
            'virt_w':    u.GetSystemMetrics(78),
            'virt_h':    u.GetSystemMetrics(79),
        }
    except Exception as e:
        print(f"[screen] fallback: {e}")
        try:
            import tkinter as tk
            r = tk.Tk(); r.withdraw()
            w, h = r.winfo_screenwidth(), r.winfo_screenheight()
            r.destroy()
            return {'primary_w': w, 'primary_h': h,
                    'virt_x': 0, 'virt_y': 0, 'virt_w': w, 'virt_h': h}
        except Exception:
            return {'primary_w': 1920, 'primary_h': 1080,
                    'virt_x': 0, 'virt_y': 0, 'virt_w': 1920, 'virt_h': 1080}

SCREEN = get_screen_info()

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except Exception:
        return "127.0.0.1"
    finally:
        s.close()

LOCAL_IP = get_local_ip()

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/ip':
            self._send(LOCAL_IP, 'text/plain')
        elif self.path == '/screen':
            self._send(json.dumps(SCREEN), 'application/json')
        else:
            self.send_response(404); self.end_headers()
    def _send(self, body, ctype):
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body.encode() if isinstance(body, str) else body)
    def log_message(self, *a): pass

def start_http():
    try:
        HTTPServer(('127.0.0.1', 8766), Handler).serve_forever()
    except Exception as e:
        print(f"[http] failed: {e}")

threading.Thread(target=start_http, daemon=True).start()

async def ws_handler(ws):
    print("[ws] HTML connected — mouse bridge active")
    try:
        async for msg in ws:
            try:
                d = json.loads(msg)
                x, y, click = d.get("x"), d.get("y"), d.get("click")
                if x is not None and y is not None:
                    mouse.position = (int(x), int(y))
                if click == "left":   mouse.click(Button.left, 1)
                elif click == "right": mouse.click(Button.right, 1)
                elif click == "double": mouse.click(Button.left, 2)
            except Exception as e:
                print(f"[ws-msg] {type(e).__name__}: {e}")
    except ConnectionClosed:
        print("[ws] HTML disconnected")
    except Exception as e:
        print(f"[ws-err] {type(e).__name__}: {e}")

async def main():
    print(f"[ready] Local IP: {LOCAL_IP}")
    print(f"[ready] Screen: primary {SCREEN['primary_w']}x{SCREEN['primary_h']}, "
          f"virtual {SCREEN['virt_w']}x{SCREEN['virt_h']} "
          f"(offset {SCREEN['virt_x']},{SCREEN['virt_y']})")
    print(f"[ready] Mouse bridge on ws://0.0.0.0:8765")
    print(f"[ready] HTTP discovery on http://127.0.0.1:8766/{{ip|screen}}")
    async with serve(ws_handler, "0.0.0.0", 8765):
        await asyncio.Future()

asyncio.run(main())