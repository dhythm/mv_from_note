"""BGM とナレーションを混ぜる: .venv/bin/python audio/mix.py → public/mix.m4a
ナレーションは audio/narration.json の start に置く（start は src/timeline.json から決まる）。声のある間は BGM を下げる（立ち上がり 0.08 秒、戻り 0.4 秒）。
全体を統合ラウドネス -14 LUFS に合わせ、真のピークを抑える。"""
import json
import re
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 48000
ROOT = Path(__file__).resolve().parents[1]
spec = json.loads((ROOT / 'audio' / 'narration.json').read_text())


def load(path: Path) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-ac', '2', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).reshape(-1, 2).astype(np.float64) / 32768


# BGM（約 -11 LUFS）を声（約 -20 LUFS）の下に置く。全体で -8 dB、声のある間はさらに -9 dB
bgm = load(ROOT / 'audio' / 'bgm.wav') * 10 ** (-8 / 20)
N = len(bgm)
voice = np.zeros((N, 2))
for seg in spec['segments']:
    v = load(ROOT / 'audio' / 'voice' / f"{seg['id']}.mp3")
    i = int(seg['start'] * SR)
    n = min(len(v), N - i)
    voice[i:i + n] += v[:n]
    # 次の区切りへ食い込まないことを確認
    end_speech = seg['start'] + len(v) / SR
    assert end_speech <= seg['end'] + 0.25, (seg['id'], end_speech, seg['end'])

# 声の有無の包絡 → BGM の下げ幅（-9 dB）
lvl = np.abs(voice).max(axis=1)
win = int(0.03 * SR)
act = np.convolve(lvl > 0.01, np.ones(win), 'same') > 0
env = np.zeros(N)
a_up = 1 - np.exp(-1 / (0.08 * SR))
a_dn = 1 - np.exp(-1 / (0.4 * SR))
e = 0.0
# 区間ごとに一定値なので、変化点だけで積分する（全サンプルの python ループを避ける）
target = act.astype(np.float64)
idx = np.flatnonzero(np.diff(target)) + 1
bounds = np.concatenate([[0], idx, [N]])
for b0, b1 in zip(bounds[:-1], bounds[1:]):
    tg = target[b0]
    a = a_up if tg > e else a_dn
    k = np.arange(1, b1 - b0 + 1)
    env[b0:b1] = tg + (e - tg) * (1 - a) ** k
    e = env[b1 - 1]
duck = 10 ** (-9 * env / 20)
mix = bgm * duck[:, None] + voice * 1.0
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
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(tmp), '-af', f'lowpass=f=16000,volume={gain:.2f}dB,alimiter=limit=0.6:level=false:attack=1:release=50', '-c:a', 'aac', '-b:a', '256k', str(ROOT / 'public' / 'mix.m4a')], check=True)
print('mix ok', f'gain {gain:+.2f} dB')
