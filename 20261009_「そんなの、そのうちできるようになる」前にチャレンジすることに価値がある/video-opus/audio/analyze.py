"""BGM の目視検査: 対数周波数のスペクトログラム＋0.25秒ごとの RMS とカット境界を1枚の画像に。
加えて区間ごとの RMS・ピーク・低域/中域/高域の比、意図しない無音（-45dB 未満が0.5秒以上）を JSON に出す。
使い方: .venv/bin/python audio/analyze.py audio/bgm_H.wav [start end]"""
import json
import sys
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

src = Path(sys.argv[1])
root = Path(__file__).resolve().parent.parent
tl = json.loads((root / 'src' / 'lib' / 'timeline.json').read_text())
with wave.open(str(src)) as w:
    sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2).astype(np.float64) / 32768
s0 = float(sys.argv[2]) if len(sys.argv) > 2 else 0
s1 = float(sys.argv[3]) if len(sys.argv) > 3 else len(x) / sr
seg = x[int(s0 * sr): int(s1 * sr)].mean(axis=1)
hop = 512
nfft = 2048
frames = (len(seg) - nfft) // hop
win = np.hanning(nfft)
spec = np.stack([np.abs(np.fft.rfft(seg[i * hop: i * hop + nfft] * win)) for i in range(frames)], 1)
freqs = np.fft.rfftfreq(nfft, 1 / sr)
H = 300
Wpx = 1600
logf = np.geomspace(30, 16000, H)
idx = np.clip(np.searchsorted(freqs, logf), 0, len(freqs) - 1)
img = 20 * np.log10(spec[idx] + 1e-6)
img = np.clip((img + 30) / 70, 0, 1)[::-1]
cols = np.linspace(0, img.shape[1] - 1, Wpx).astype(int)
img = img[:, cols]
rgb = np.stack([img ** 1.5 * 255, img * 255, img ** 0.6 * 120], -1).astype(np.uint8)
canvas = Image.new('RGB', (Wpx, H + 140), (10, 10, 10))
canvas.paste(Image.fromarray(rgb), (0, 0))
d = ImageDraw.Draw(canvas)
blk = int(0.25 * sr)
rms = [20 * np.log10(np.sqrt(np.mean(seg[i:i + blk] ** 2)) + 1e-9) for i in range(0, len(seg) - blk, blk)]
for i, r in enumerate(rms):
    xx = int(i / len(rms) * Wpx)
    hh = int(np.clip((r + 50) / 50, 0, 1) * 120)
    d.line([xx, H + 135, xx, H + 135 - hh], fill=(210, 255, 26), width=max(1, Wpx // len(rms)))
for c in tl['cuts']:
    if s0 <= c['start'] <= s1:
        xx = int((c['start'] - s0) / (s1 - s0) * Wpx)
        d.line([xx, 0, xx, H + 140], fill=(255, 80, 80), width=1)
        d.text((xx + 3, 3), str(c['cut']), fill=(255, 255, 255))
out = src.with_suffix('.png')
canvas.save(out)

# 区間ごとの数値
def band(sig, lo, hi):
    f = np.fft.rfft(sig)
    fr = np.fft.rfftfreq(len(sig), 1 / sr)
    return float(np.sqrt(np.sum(np.abs(f[(fr >= lo) & (fr < hi)]) ** 2)))

rep = {'file': str(src.name), 'sections': []}
mono = x.mean(axis=1)
for c in tl['cuts']:
    a = mono[int(c['start'] * sr): int(c['end'] * sr)]
    tot = band(a, 20, 20000) + 1e-9
    rep['sections'].append({
        'cut': c['cut'],
        'rms_db': round(20 * np.log10(np.sqrt(np.mean(a ** 2)) + 1e-9), 1),
        'low<200': round(band(a, 20, 200) / tot, 2),
        'mid200-4k': round(band(a, 200, 4000) / tot, 2),
        'high>4k': round(band(a, 4000, 20000) / tot, 2),
    })
b2 = int(0.5 * sr)
quiet = [round(i / sr, 1) for i in range(0, len(mono) - b2, b2) if 20 * np.log10(np.sqrt(np.mean(mono[i:i + b2] ** 2)) + 1e-9) < -45]
rep['quiet_0.5s_blocks'] = quiet
rep['peak_dbfs'] = round(float(20 * np.log10(np.max(np.abs(x)) + 1e-9)), 2)
rep['clipped'] = int(np.sum(np.abs(x) >= 0.999))
rep['duration'] = round(len(x) / sr, 3)
rep['tail_last_0.3s_rms_db'] = round(float(20 * np.log10(np.sqrt(np.mean(mono[-int(0.3 * sr):] ** 2)) + 1e-9)), 1)
(src.with_suffix('.json')).write_text(json.dumps(rep, ensure_ascii=False, indent=1))
print(out)
print(json.dumps(rep, ensure_ascii=False))
