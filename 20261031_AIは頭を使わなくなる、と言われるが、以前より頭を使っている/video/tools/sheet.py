"""out/review/still_<t>.png を秒を付けて一覧にする: .venv/bin/python tools/sheet.py <出力> <t1,t2,...>"""
import re
import sys
from PIL import Image, ImageDraw

out, times = sys.argv[1], sys.argv[2].split(',')
ims = []
for t in times:
    im = Image.open(f"out/review/still_{t.replace('.', '_')}.png").resize((480, 270))
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 60, 16], fill='black')
    d.text((3, 2), t, fill='white')
    ims.append(im)
S = Image.new('RGB', (480 * 3, 270 * ((len(ims) + 2) // 3)), 'gray')
for i, im in enumerate(ims):
    S.paste(im, ((i % 3) * 480, (i // 3) * 270))
S.save(out)
