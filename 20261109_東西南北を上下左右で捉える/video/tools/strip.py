"""区間の連続コマ一覧（等間隔）: .venv/bin/python tools/strip.py <動画> <開始秒> <終了秒> <間隔秒> <出力png>"""
import subprocess
import sys

import numpy as np
from PIL import Image, ImageDraw

src, s, e, step, out = sys.argv[1], float(sys.argv[2]), float(sys.argv[3]), float(sys.argv[4]), sys.argv[5]
W, H, cols = 320, 180, 8
raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', str(s), '-to', str(e), '-i', src, '-vf', f'fps={1 / step},scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
ims = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
S = Image.new('RGB', (W * cols, H * ((len(ims) + cols - 1) // cols)), 'gray')
for i, a in enumerate(ims):
    im = Image.fromarray(a)
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 52, 14], fill='black')
    d.text((2, 1), f'{s + i * step:.2f}', fill='white')
    S.paste(im, ((i % cols) * W, (i // cols) * H))
S.save(out)
print(len(ims))
