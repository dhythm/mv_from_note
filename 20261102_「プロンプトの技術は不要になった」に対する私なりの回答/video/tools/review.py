"""完成動画の点検: (1) 1 秒ごとの一覧 (2) 隣接フレームの差による動きの量（静止区間の検出）
  .venv/bin/python tools/review.py out/final.mp4
出力: out/review/tile-*.png, out/review/motion.json
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

src = sys.argv[1]
out = Path('out/review')
out.mkdir(parents=True, exist_ok=True)
W, H = 160, 90
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True, check=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
diff = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
win = []
for s in range(0, len(diff), 15):
    d = diff[s:s + 15]
    win.append({'t': round(s / 30, 2), 'mean': round(float(d.mean()), 3), 'min': round(float(d.min()), 3)})
static = [w for w in win if w['mean'] < 0.6 and w['t'] < 189.5]
Path('out/review/motion.json').write_text(json.dumps({'windows': win, 'static_windows_main': static}, indent=1))
print('frames', len(fr), 'static windows (main, mean<0.6):', [w['t'] for w in static])
# 一覧（0.5 秒ごと、24 コマ×n 枚）
big = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vf', 'fps=1,scale=320:180', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
ims = np.frombuffer(big, np.uint8).reshape(-1, 180, 320, 3)
per = 24
for p in range(0, len(ims), per):
    chunk = ims[p:p + per]
    sheet = Image.new('RGB', (320 * 6, 180 * 4), 'gray')
    for i, im in enumerate(chunk):
        tile = Image.fromarray(im)
        d = ImageDraw.Draw(tile)
        d.rectangle([0, 0, 44, 14], fill='black')
        d.text((3, 2), f'{(p + i):.0f}s', fill='white')
        sheet.paste(tile, ((i % 6) * 320, (i // 6) * 180))
    sheet.save(out / f'tile-{p // per + 1}.png')
