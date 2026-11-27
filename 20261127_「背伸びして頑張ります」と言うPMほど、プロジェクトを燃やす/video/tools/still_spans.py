"""動きの少ない区間を探す: .venv/bin/python tools/still_spans.py <動画> [しきい値] [最短秒]
0.1 秒ごとのコマの差分（平均絶対差）を取り、しきい値未満が続く区間を書き出す。
静止区間を探す道具であり、演出の合格基準ではない。"""
import subprocess
import sys

import numpy as np

src = sys.argv[1]
th = float(sys.argv[2]) if len(sys.argv) > 2 else 0.25
min_len = float(sys.argv[3]) if len(sys.argv) > 3 else 2.5
W, H, FPS = 240, 135, 10
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vf', f'fps={FPS},scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True, check=True).stdout
f = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
d = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))
start = None
for i, v in enumerate(list(d) + [1e9]):
    if v < th and start is None:
        start = i
    elif v >= th and start is not None:
        if (i - start) / FPS >= min_len:
            print(f'{start / FPS:7.1f} - {i / FPS:7.1f}  ({(i - start) / FPS:.1f}s)  平均差 {d[start:i].mean():.3f}')
        start = None
print('中央値', round(float(np.median(d)), 3))
