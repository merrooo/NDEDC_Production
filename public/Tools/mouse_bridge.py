import asyncio, json, socket, threading, subprocess
from http.server import HTTPServer, BaseHTTPRequestHandler

try:
    from websockets.asyncio.server import serve
    from websockets.exceptions import ConnectionClosed
except ImportError:
    from websockets.server import serve
    from websockets.exceptions import ConnectionClosed

try:
    import ctypes
    ctypes.windll.shcore.SetProcessDpiAwareness(2)
except Exception:
    pass

from pynput.mouse import Controller as MouseController, Button
from pynput.keyboard import Controller as KeyboardController, Key

mouse = MouseController()
keyboard = KeyboardController()

KEY_MAP = {
    'Enter': Key.enter, 'NumpadEnter': Key.enter,
    'Backspace': Key.backspace, 'Tab': Key.tab,
    'Escape': Key.esc, 'Space': Key.space,
    'ArrowUp': Key.up, 'ArrowDown': Key.down,
    'ArrowLeft': Key.left, 'ArrowRight': Key.right,
    'ShiftLeft': Key.shift, 'ShiftRight': Key.shift_r,
    'ControlLeft': Key.ctrl, 'ControlRight': Key.ctrl_r,
    'AltLeft': Key.alt, 'AltRight': Key.alt_gr,
    'MetaLeft': Key.cmd, 'MetaRight': Key.cmd_r,
    'Delete': Key.delete, 'Insert': Key.insert,
    'Home': Key.home, 'End': Key.end,
    'PageUp': Key.page_up, 'PageDown': Key.page_down,
    'CapsLock': Key.caps_lock,
    'F1': Key.f1, 'F2': Key.f2, 'F3': Key.f3, 'F4': Key.f4,
    'F5': Key.f5, 'F6': Key.f6, 'F7': Key.f7, 'F8': Key.f8,
    'F9': Key.f9, 'F10': Key.f10, 'F11': Key.f11, 'F12': Key.f12,
    'Numpad0': '0', 'Numpad1': '1', 'Numpad2': '2', 'Numpad3': '3',
    'Numpad4': '4', 'Numpad5': '5', 'Numpad6': '6', 'Numpad7': '7',
    'Numpad8': '8', 'Numpad9': '9',
    'NumpadAdd': '+', 'NumpadSubtract': '-',
    'NumpadMultiply': '*', 'NumpadDivide': '/',
    'NumpadDecimal': '.',
}

def screen_info():
    try:
        u = ctypes.windll.user32
        return {'primary_w': u.GetSystemMetrics(0), 'primary_h': u.GetSystemMetrics(1),
                'virt_x': u.GetSystemMetrics(76), 'virt_y': u.GetSystemMetrics(77),
                'virt_w': u.GetSystemMetrics(78), 'virt_h': u.GetSystemMetrics(79)}
    except:
        return {'primary_w': 1920, 'primary_h': 1080, 'virt_x': 0, 'virt_y': 0, 'virt_w': 1920, 'virt_h': 1080}

def local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(("8.8.8.8", 80))
        return s.getsockname()[0]
    except:
        return "127.0.0.1"
    finally:
        s.close()

def tailscale_ip():
    for cmd in (['tailscale', 'ip', '-4'], [r'C:\Program Files\Tailscale\tailscale.exe', 'ip', '-4']):
        try:
            r = subprocess.run(cmd, capture_output=True, text=True, timeout=2)
            if r.returncode == 0:
                ip = r.stdout.strip().split('\n')[0].strip()
                if ip.startswith('100.'): return ip
        except: continue
    return None

SCREEN = screen_info()
LOCAL_IP = local_ip()

class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/ip': self._send(LOCAL_IP, 'text/plain')
        elif self.path == '/screen': self._send(json.dumps(SCREEN), 'application/json')
        elif self.path == '/tailscale': self._send(tailscale_ip() or '', 'text/plain')
        elif self.path == '/all':
            self._send(json.dumps({'lan_ip': LOCAL_IP, 'tailscale_ip': tailscale_ip(), 'screen': SCREEN}), 'application/json')
        else:
            self.send_response(404); self.end_headers()
    def _send(self, body, ctype):
        self.send_response(200)
        self.send_header('Content-Type', ctype)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body.encode() if isinstance(body, str) else body)
    def log_message(self, *a): pass

def http_server():
    try: HTTPServer(('127.0.0.1', 8766), Handler).serve_forever()
    except Exception as e: print(f"[http] {e}")

threading.Thread(target=http_server, daemon=True).start()

async def ws_handler(ws):
    print("[ws] ✅ HTML connected")
    try:
        async for msg in ws:
            try:
                d = json.loads(msg)
                t = d.get('type', '')

                # Mouse position — require BOTH x and y
                if 'x' in d and 'y' in d:
                    x, y = d.get('x'), d.get('y')
                    if x is not None and y is not None:
                        try: mouse.position = (int(x), int(y))
                        except Exception as e: print(f"[mouse.pos] {e}")

                # Mouse buttons
                click = d.get('click')
                if click == 'left': mouse.click(Button.left, 1)
                elif click == 'right': mouse.click(Button.right, 1)
                elif click == 'middle': mouse.click(Button.middle, 1)
                elif click == 'double': mouse.click(Button.left, 2)

                # Keyboard
                if t == 'key':
                    code = d.get('code'); key = d.get('key'); down = d.get('down', False)
                    k = KEY_MAP.get(code)
                    if not k:
                        if code and code.startswith('Key') and len(code) == 4:
                            k = code[3].lower()
                        elif code and code.startswith('Digit') and len(code) == 6:
                            k = code[5]
                        elif key and len(key) == 1:
                            k = key
                    if k:
                        try:
                            if down: keyboard.press(k)
                            else: keyboard.release(k)
                        except Exception as e:
                            print(f"[key] {code}: {e}")
            except Exception as e:
                print(f"[ws] {e}")
    except ConnectionClosed:
        print("[ws] ❌ disconnected")

async def main():
    print("═" * 55)
    print(f"[ready] LAN IP        : {LOCAL_IP}")
    print(f"[ready] Tailscale IP  : {tailscale_ip() or '(not detected)'}")
    print(f"[ready] Screen        : {SCREEN['virt_w']}x{SCREEN['virt_h']}")
    print("═" * 55)
    async with serve(ws_handler, "0.0.0.0", 8765, ping_interval=20, ping_timeout=20):
        print("[ready] ✅ ws://0.0.0.0:8765")
        print("[ready] ✅ http://127.0.0.1:8766")
        print("[ready] 🎯 Ready — mouse + keyboard input enabled")
        await asyncio.Future()

if __name__ == "__main__":
    try: asyncio.run(main())
    except KeyboardInterrupt: print("\n[exit]")