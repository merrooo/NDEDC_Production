from pathlib import Path
text = Path('Calib.html').read_text(encoding='utf-8')
encs = ['latin1','windows-1256','cp1252']
for src in encs:
    try:
        fixed = text.encode(src, errors='replace').decode('utf-8', errors='replace')
        print(src, fixed[:120])
    except Exception as e:
        print(src, e)
