"""音源の技術チェック: 長さ・ピーク・クリップ・2秒ごとのRMSと帯域比（試聴の代わりではない）。"""
import subprocess
import sys

import numpy as np

path = sys.argv[1]
sr = 44100
raw = subprocess.run(["ffmpeg", "-loglevel", "error", "-i", path, "-f", "s16le", "-ac", "2", "-ar", str(sr), "-"],
                     capture_output=True, check=True).stdout
x = np.frombuffer(raw, "<i2").reshape(-1, 2).astype(float) / 32768
m = x.mean(1)
print(f"dur {len(m) / sr:.3f}s  peak {20 * np.log10(np.abs(x).max()):.2f} dBFS  clip(>=0.999) {(np.abs(x) >= 0.999).sum()}")
silent = []
for b in range(0, int(np.ceil(len(m) / sr)), 2):
    s = m[b * sr:(b + 2) * sr]
    if len(s) < sr // 10:
        continue
    e = np.abs(np.fft.rfft(s)) ** 2
    f = np.fft.rfftfreq(len(s), 1 / sr)
    lo, mid, hi = e[f < 150].sum(), e[(f >= 150) & (f < 4000)].sum(), e[f >= 4000].sum()
    tot = lo + mid + hi + 1e-12
    rms = 20 * np.log10(np.sqrt((s ** 2).mean()) + 1e-9)
    if rms < -45:
        silent.append(b)
    print(f"{b:3d}s rms {rms:6.1f}dB  low {lo / tot:.2f} mid {mid / tot:.2f} hi {hi / tot:.2f}")
print("near-silent 2s blocks:", silent or "none")
