"""スチルを一覧にする: .venv/bin/python tools/sheet.py <出力png> <列数> <t1> <t2> ..."""
import sys
from pathlib import Path
from PIL import Image

out, cols, ts = sys.argv[1], int(sys.argv[2]), sys.argv[3:]
W, H = 640, 360
im = Image.new('RGB', (W * cols, H * ((len(ts) + cols - 1) // cols)), 'gray')
for i, t in enumerate(ts):
    f = Path(__file__).resolve().parents[1] / 'out' / 'review' / f"still_{t.replace('.', '_')}.png"
    im.paste(Image.open(f).convert('RGB').resize((W, H)), ((i % cols) * W, (i // cols) * H))
im.save(out)
