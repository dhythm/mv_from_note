"""全編の連続コマ一覧（大きめ）: python tools/sheet2.py out/final.mp4 step out/review/prefix
1 枚に 4 列 × 6 行（480×270）。秒を左上に描く。"""
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw

src, step, prefix = sys.argv[1], float(sys.argv[2]), sys.argv[3]
W, H, cols, rows = 480, 270, 4, 6
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vf', f'fps={1 / step},scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
ims = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
per = cols * rows
for p in range(0, len(ims), per):
    S = Image.new('RGB', (W * cols, H * rows), 'gray')
    for i, a in enumerate(ims[p:p + per]):
        im = Image.fromarray(a)
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, 46, 13], fill='black')
        d.text((2, 1), f'{(p + i) * step:.1f}', fill='white')
        S.paste(im, ((i % cols) * W, (i // cols) * H))
    S.save(f'{prefix}_{p // per:02d}.png')
print(len(ims), (len(ims) + per - 1) // per)
