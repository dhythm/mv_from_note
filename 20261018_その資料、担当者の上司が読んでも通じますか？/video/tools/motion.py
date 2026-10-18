"""区間動画の動きの量: python tools/motion.py <mp4> <開始秒> [しきい値]
0.5 秒窓ごとの隣接フレーム差の平均（160×90 の輝度）を出し、しきい値未満の窓を列挙する。"""
import subprocess
import sys

import numpy as np

src, off = sys.argv[1], float(sys.argv[2])
thr = float(sys.argv[3]) if len(sys.argv) > 3 else 0.6
W, H = 160, 90
raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', src, '-vf', f'scale={W}:{H}', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], capture_output=True, check=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W).astype(np.float32)
d = np.abs(np.diff(fr, axis=0)).mean(axis=(1, 2))
rows = [(off + s / 30, float(d[s:s + 15].mean())) for s in range(0, len(d), 15)]
print('frames', len(fr), 'mean', round(float(d.mean()), 3))
print('low windows:', [(round(t, 1), round(m, 2)) for t, m in rows if m < thr])
