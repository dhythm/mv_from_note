"""ナレーションをタイムラインどおりに配置し、BGM をダッキングして完成ミックスを作る（API利用なし）。

出力: public/narration.wav（声のみ）/ public/mix.wav / public/mix.m4a、audio/mix-report.json（技術確認値）
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

here = Path(__file__).resolve().parent
root = here.parent
TL = json.loads((root / 'src' / 'lib' / 'timeline.json').read_text())
SR = 44100
TOTAL = TL['total']
N = int(np.ceil(TOTAL * SR))


def decode(path):
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'f32le', '-ac', '1', '-ar', str(SR), '-'])
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


voice = np.zeros(N)
placed = []
for c in TL['cuts']:
    v = decode(here / 'narration' / 'v4' / f"cut-{c['cut']:02d}.mp3")
    i = int(round(c['voice'] * SR))
    j = min(N, i + len(v))
    if np.any(np.abs(voice[i:j]) > 1e-4):
        raise SystemExit(f"cut {c['cut']}: 前の発話と重なる")
    voice[i:j] += v[: j - i]
    placed.append({'cut': c['cut'], 'start': c['voice'], 'end': round((i + len(v)) / SR, 3), 'cut_end': c['end']})
    if (i + len(v)) / SR > c['end'] + 0.05:
        raise SystemExit(f"cut {c['cut']}: 発話がカットの終わりを越える")

sr_b, bgm = wavfile.read(root / 'public' / 'bgm.wav')
assert sr_b == SR
bgm = bgm.astype(np.float64).T / 32767
bgm = bgm[:, :N]
if bgm.shape[1] < N:
    raise SystemExit('BGM が映像より短い')

# ダッキング: 声の包絡（速い立ち上がり・ゆっくり戻る）
env = np.abs(voice)
win = int(0.03 * SR)
env = np.convolve(env, np.ones(win) / win, mode='same')
present = np.clip((20 * np.log10(env + 1e-9) + 48) / 12, 0, 1)  # -48dB→0, -36dB→1
att, rel = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.45 * SR))
g = np.zeros(N)
y = 0.0
for k in range(0, N, 64):
    x = present[k]
    y = att * y + (1 - att) * x if x > y else rel * y + (1 - rel) * x
    g[k:k + 64] = y
DUCK_DB = -7.5
MUSIC_DB = -5.5
gain = 10 ** ((MUSIC_DB + DUCK_DB * g) / 20)
music = bgm * gain
VOICE_DB = 1.5
mix = music + voice[None, :] * 10 ** (VOICE_DB / 20)
peak = np.max(np.abs(mix))
if peak > 0.93:
    mix *= 0.93 / peak
# 最後の余韻はBGMの終わりのまま
wavfile.write(root / 'public' / 'narration.wav', SR, (np.clip(voice, -1, 1) * 32767).astype(np.int16))
wavfile.write(root / 'public' / 'mix.wav', SR, (np.clip(mix, -1, 1).T * 32767).astype(np.int16))
subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', str(root / 'public' / 'mix.wav'), '-c:a', 'aac', '-b:a', '256k', str(root / 'public' / 'mix.m4a')], check=True)

# 技術確認: 2秒ごとの RMS、クリップ、無音ブロック
blk = 2 * SR
rms = [round(20 * np.log10(np.sqrt(np.mean(mix[:, i:i + blk] ** 2)) + 1e-9), 1) for i in range(0, N, blk)]
report = {
    'total_sec': TOTAL,
    'peak_dbfs': round(20 * np.log10(np.max(np.abs(mix))), 2),
    'clipped_samples': int(np.sum(np.abs(mix) >= 0.999)),
    'silent_2s_blocks': [i * 2 for i, r in enumerate(rms) if r < -50],
    'rms_2s': rms,
    'voice_placement': placed,
    'music_db': MUSIC_DB, 'duck_db': DUCK_DB, 'voice_db': VOICE_DB,
}
(here / 'mix-report.json').write_text(json.dumps(report, ensure_ascii=False, indent=1))
print({k: report[k] for k in ('total_sec', 'peak_dbfs', 'clipped_samples', 'silent_2s_blocks')})
print('rms', rms)
