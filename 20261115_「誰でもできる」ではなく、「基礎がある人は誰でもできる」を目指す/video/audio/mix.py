"""BGM とナレーションを混ぜる: python audio/mix.py → public/mix.m4a
声は audio/voice/placed.wav（audio/place.py が文ごとに置いたもの）。
BGM（audio/bgm.wav）は全体で -8 dB、声のある間はさらに -9 dB 下げる（立ち上がり 0.08 秒、戻り 0.4 秒）。
全体（エンドロゴの終わりまで）を統合ラウドネス -14 LUFS に合わせ、ピークを抑える。NOBGM=1 で声だけ。"""
import json
import os
import re
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 48000
ROOT = Path(__file__).resolve().parents[1]


def load(path: Path) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '2', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).reshape(-1, 2).astype(np.float64) / 32768


tl = json.loads((ROOT / 'src' / 'timeline.json').read_text())
total = sum(c['beats'] * 60 / tl['bpm'] for c in tl['cuts']) + tl['logoDur']
N = int(total * SR)
voice = np.zeros((N, 2))
v = load(ROOT / 'audio' / 'voice' / 'placed.wav')
voice[: min(N, len(v))] = v[:N]
bgm = np.zeros((N, 2)) if os.environ.get('NOBGM') else load(ROOT / 'audio' / 'bgm.wav')[:N] * 10 ** (-8 / 20)
if len(bgm) < N - 2:
    raise SystemExit(f'BGM が映像より短い: {len(bgm) / SR:.2f}s < {N / SR:.2f}s')
bgm = np.vstack([bgm, np.zeros((N - len(bgm), 2))])
lvl = np.abs(voice).max(axis=1)
win = int(0.03 * SR)
act = (np.convolve(lvl > 0.01, np.ones(win), 'same') > 0).astype(np.float64)
env = np.zeros(N)
a_up = 1 - np.exp(-1 / (0.08 * SR))
a_dn = 1 - np.exp(-1 / (0.4 * SR))
e = 0.0
bounds = np.concatenate([[0], np.flatnonzero(np.diff(act)) + 1, [N]])
for b0, b1 in zip(bounds[:-1], bounds[1:]):
    tg = act[b0]
    a = a_up if tg > e else a_dn
    k = np.arange(1, b1 - b0 + 1)
    env[b0:b1] = tg + (e - tg) * (1 - a) ** k
    e = env[b1 - 1]
mix = bgm * (10 ** (-9 * env / 20))[:, None] + voice
mix /= max(1e-9, np.abs(mix).max())
mix *= 10 ** (-1 / 20)
tmp = ROOT / 'audio' / 'mix.wav'
with wave.open(str(tmp), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
meas = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(tmp), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
integrated = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', meas)[-1])
gain = -14.0 - integrated
(ROOT / 'public').mkdir(exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-af', f'lowpass=f=16000,volume={gain:.2f}dB,alimiter=limit=0.6:level=false:attack=1:release=50', '-c:a', 'aac', '-b:a', '256k', str(ROOT / 'public' / ('voice.m4a' if os.environ.get('NOBGM') else 'mix.m4a'))], check=True)
print('mix ok', f'gain {gain:+.2f} dB', f'{total:.2f}s')
