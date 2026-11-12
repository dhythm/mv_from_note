"""BGM をローカルで合成する（追加課金なし・固定シード）。エンドロゴの終わりまで覆う。

条件（plan.html「音」から）:
  - トーンは、盤の上を正確に進む軽さ。感傷や暗い環境音にしない。過去作の曲・20261007 の音源は使わない。
  - 拍が立つ。吸着と 90° の回転が拍に載る。108〜120 BPM。遅い曲に映像を合わせない。
  - 01 で入り、03・04 で層を足す。09 の留保は一段下げるが拍は残す。10 で戻り、ロゴの終わりで収める。
  - 無音は「私は回しません」の頭で半拍だけ。効果音はマスに吸着する短いクリック（特定のゲームの音は使わない）。
曲: A 長調、120BPM（1 拍 0.5 秒。カットの境目は 0.5 秒単位なので拍の上にある）。
  主役の音色は短く弾くプラック（矩形波を絞ったもの）の 8 分のアルペジオと、グロッケン風の粒。進行 A–E–F#m–D（09 は F#m–D–A–E）。
  01: プラックと粒だけ、「回して」の回転で低いキックが入る → 02: 4 つ打ちとベース →
  03–04: 裏のハイハットとクラップを足す（層を足す）。04「私は回しません」の頭で半拍だけ全部抜く →
  05–08: 同じ編成で進む。十字キーの押下・コマの吸着はクリック、回転は風切り、決め語の着地は打音 →
  09: キックを抜き、ハイハットとプラックだけで一段下げる（拍は残す）→ 10: 全編成に戻る →
  ロゴへ上へ押し出す風切り、最後の和音を保持の終わりまで鳴らして収める。
Lyria（有料の音楽生成）と比べてローカル合成を選んだ理由: コマの吸着・十字キー・回転・半拍の無音へフレーム単位で
合わせる必要があり、ローカル合成が確実で速く、費用もかからないため。

  python3 audio/bgm.py   → audio/bgm.wav, public/bgm.m4a（numpy・scipy が要る）
"""
import json
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
ROOT = Path(__file__).resolve().parents[1]
TL = json.loads((ROOT / 'src' / 'timeline.json').read_text())
S = {}
VO = {}
_s = 0.0
for c in TL['cuts']:
    S[c['id']] = _s
    VO[c['id']] = c['vo']
    _s += c['dur']
LOGO = _s
DUR = LOGO + TL['logoDur']
BEAT = 0.5
BAR = 2.0
N = int(SR * DUR)
rng = np.random.default_rng(20261109)
MUS = np.zeros((2, N))
DRY = np.zeros((2, N))  # 打楽器・効果音（残響を少なく）


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def tt(d):
    return np.arange(int(d * SR)) / SR


def place(sig, t, gain=1.0, pan=0.0, bus=MUS):
    i = int(round(t * SR))
    if i >= N or i + len(sig) <= 0:
        return
    j = max(0, -i)
    sig = sig[j:]
    i = max(0, i)
    n = min(len(sig), N - i)
    bus[0, i:i + n] += sig[:n] * gain * np.sqrt(0.5 * (1 - pan))
    bus[1, i:i + n] += sig[:n] * gain * np.sqrt(0.5 * (1 + pan))


def env(n, a=0.005, r=0.2, d=None):
    x = np.arange(n) / SR
    e = np.minimum(1, x / max(a, 1e-4))
    if d is not None:
        e *= np.exp(-x / d)
    rel = int(r * SR)
    if rel and rel < n:
        e[-rel:] *= np.linspace(1, 0, rel)
    return e


# ---- 音色 ----
def kick(g=1.0):
    t = tt(0.45)
    f = 48 + 90 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) * g


def hat(open_=False):
    t = tt(0.25 if open_ else 0.06)
    n = rng.standard_normal(len(t))
    n = sosfilt(butter(4, 7000, 'hp', fs=SR, output='sos'), n)
    return n * np.exp(-t * (14 if open_ else 60)) * 0.35


def clap():
    t = tt(0.3)
    n = sosfilt(butter(2, [900, 4000], 'bp', fs=SR, output='sos'), rng.standard_normal(len(t)))
    e = sum(np.exp(-np.maximum(0, t - d) * 40) * (t >= d) for d in (0, 0.012, 0.024)) / 3
    return n * e * 0.8


def impact():
    t = tt(1.6)
    f = 40 + 60 * np.exp(-t * 10)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.5)
    n = sosfilt(butter(2, 2500, 'lp', fs=SR, output='sos'), rng.standard_normal(len(t))) * np.exp(-t * 6) * 0.4
    return body + n


def whoosh(d=0.6, up=True):
    t = tt(d)
    n = rng.standard_normal(len(t))
    out = np.zeros_like(n)
    seg = 960
    for i in range(0, len(n), seg):
        k = i / len(n)
        fc = 400 + (6000 if up else 2000) * (k if up else 1 - k)
        out[i:i + seg] = sosfilt(butter(2, [fc * 0.6, fc * 1.4], 'bp', fs=SR, output='sos'), n[i:i + seg])
    e = np.sin(np.pi * np.linspace(0, 1, len(t))) ** 2
    return out * e * 0.5


def epiano(notes, d, vel=0.5):
    t = tt(d)
    s = np.zeros_like(t)
    for m in notes:
        f = midi(m)
        s += (np.sin(2 * np.pi * f * t + 0.6 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 6)) * np.exp(-t * 3.2))
    return s / max(1, len(notes)) * env(len(t), 0.004, 0.05) * vel


def bell(m, d=1.2, vel=0.3):
    t = tt(d)
    f = midi(m)
    s = np.sin(2 * np.pi * f * t + 1.2 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t * 5)) * np.exp(-t * 3)
    return s * env(len(t), 0.002, 0.1) * vel


def pad(notes, d, vel=0.12):
    t = tt(d)
    s = np.zeros_like(t)
    for m in notes:
        for det in (-0.08, 0.0, 0.08):
            s += np.sin(2 * np.pi * midi(m + det) * t + rng.uniform(0, 6))
    s = sosfilt(butter(2, 2200, 'lp', fs=SR, output='sos'), s)
    return s / (len(notes) * 3) * env(len(t), 0.6, 0.8) * vel


def bass(m, d, vel=0.4):
    t = tt(d)
    f = midi(m)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    return np.tanh(s * 1.4) * env(len(t), 0.004, 0.04) * vel


def pluck(m, d=0.35, vel=0.3, bright=2600):
    t = tt(d)
    f = midi(m)
    ph = (f * t) % 1.0
    sq = np.where(ph < 0.5, 1.0, -1.0) * 0.6 + np.sin(2 * np.pi * f * t) * 0.6
    sq = sosfilt(butter(2, bright, 'lp', fs=SR, output='sos'), sq)
    return sq * np.exp(-t * 9) * env(len(t), 0.002, 0.03) * vel


def click(hi=True):
    t = tt(0.05)
    f = 2400 if hi else 1500
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 140)
    n = sosfilt(butter(2, 5000, 'hp', fs=SR, output='sos'), rng.standard_normal(len(t))) * np.exp(-t * 400) * 0.4
    return (s + n) * 0.6


# ---- 和声 ----
# A 長調: A–E–F#m–D（根音の MIDI と和音）
MAJ = [(45, [69, 73, 76, 80]), (40, [68, 71, 76, 78]), (42, [69, 73, 76, 78]), (38, [69, 74, 78, 81])]
MIN = [(42, [69, 73, 76, 78]), (38, [69, 74, 78, 81]), (45, [69, 73, 76, 80]), (40, [68, 71, 76, 78])]


def chord_at(t, prog):
    return prog[int(t // BAR) % 4]


def V(id_, v):
    """カット id の声の頭からの秒 → 全体の秒"""
    return S[id_] + VO[id_] + v


def section(t):
    if t < S['02']:
        return 'intro'
    if t < S['03']:
        return 'drive'
    if t < S['09']:
        return 'full'
    if t < S['10']:
        return 'low'
    if t < LOGO:
        return 'full'
    return 'logo'


# 「私は回しません」の頭で半拍だけ全部抜く
GAP = (V('04', 2.9) - 0.25, V('04', 2.9))


def in_gap(t):
    return GAP[0] <= t < GAP[1]


# パッド（全編。薄く）
t = 0.0
while t < LOGO:
    sc = section(t)
    root, ch = chord_at(t, MIN if sc == 'low' else MAJ)
    place(pad([n - 12 for n in ch[:3]], BAR + 0.5, 0.1 if sc != 'low' else 0.13), t)
    t += BAR

for i in range(int(LOGO / (BEAT / 4))):
    t = i * BEAT / 4
    if in_gap(t):
        continue
    sc = section(t)
    q = i % 16
    root, ch = chord_at(t, MIN if sc == 'low' else MAJ)
    beat_on = q % 4 == 0
    # キック
    if sc == 'intro' and t >= V('01', 4.1) and q in (0, 8):
        place(kick(0.55), t, bus=DRY)
    elif sc in ('drive', 'full') and beat_on:
        place(kick(0.8), t, bus=DRY)
    # ハイハット（03 から裏、09 も残す）
    if sc in ('full', 'low') and q % 4 == 2:
        place(hat(False), t, 0.55 if sc == 'full' else 0.4, pan=0.3, bus=DRY)
    if sc == 'full' and q % 2 == 1:
        place(hat(False), t, 0.18, pan=-0.3, bus=DRY)
    # クラップ（2・4 拍）
    if sc == 'full' and q in (4, 12):
        place(clap(), t, 0.38, pan=-0.1, bus=DRY)
    # ベース
    if sc in ('drive', 'full') and q in (0, 3, 6, 8, 11, 14):
        place(bass(root - 12 + (12 if q in (6, 14) else 0), 0.2, 0.38), t)
    elif sc == 'low' and q in (0, 8):
        place(bass(root - 12, 0.6, 0.3), t)
    # プラックの 8 分のアルペジオ（主役）
    arp = [ch[0], ch[1], ch[2], ch[1] + 12, ch[3], ch[2], ch[1], ch[2] - 12]
    if q % 2 == 0:
        g = {'intro': 0.24, 'drive': 0.24, 'full': 0.22, 'low': 0.2}[sc]
        place(pluck(arp[(q // 2) % 8] - 12, 0.32, g), t, pan=-0.25)
    # グロッケン風の粒（03 から 1 拍おき、09 は抜く）
    if sc == 'full' and q in (2, 10):
        place(bell(ch[(i // 8) % 4] + 12, 0.8, 0.09), t, pan=0.35)
    if sc == 'intro' and q == 0:
        place(bell(ch[0] + 12, 1.4, 0.1), t, pan=0.35)

# ---- 合わせる点（全体の秒）----
# コマの吸着・十字キー（クリック）
SNAPS = [V('02', 2.4), V('03', 4.55), V('04', 3.0), V('04', 6.95), V('04', 7.6), V('05', 5.6), V('05', 5.75), V('05', 7.2), V('05', 7.35),
         V('06', 6.95), V('07', 5.95), V('08', 2.25), V('08', 2.6), V('09', 10.35), V('10', 7.75)]
for k, s_ in enumerate(SNAPS):
    place(click(k % 2 == 0), s_ + 0.12, 0.55, pan=0.15, bus=DRY)
# 回転（風切り）
for s_, d, up in [(V('01', 4.1), 2.6, True), (S['03'], 2.3, True), (V('03', 7.5), 0.7, True), (V('04', 0.9), 1.7, False), (V('06', 7.6), 1.0, True), (V('07', 3.5), 0.9, True)]:
    place(whoosh(d, up), s_, 0.32, pan=-0.2, bus=DRY)
# 決め語の着地（打音）
for s_, g in [(V('02', 2.4), 0.45), (V('03', 3.9), 0.35), (V('04', 6.1), 0.55), (V('06', 4.0), 0.5), (V('07', 4.25), 0.6), (V('09', 10.35), 0.45), (V('10', 4.6), 0.45)]:
    place(impact(), s_, g, bus=DRY)
# 03→04、04 の入りのズームの通過
place(whoosh(0.9), S['04'] - 0.9, 0.35, pan=0.2, bus=DRY)
# ロゴへ上へ押し出す
place(whoosh(0.55), LOGO - 0.55, 0.45, pan=0.0, bus=DRY)
# ロゴ: 最後の和音を保持の終わりまで（A）
place(pad([45, 57, 64, 69, 73], TL['logoDur'], 0.2), LOGO)
place(pluck(69, 1.0, 0.3), LOGO, pan=-0.2)
place(bass(33, 2.5, 0.38), LOGO)
place(kick(0.6), LOGO, bus=DRY)
for k, m in enumerate([81, 85, 88, 93]):
    place(bell(m, 2.0, 0.1), LOGO + 3.0 + 0.1 * k, pan=0.3)  # 「.work」が一文字ずつ出る拍

# 残響（音楽のみ）
ir_t = tt(1.4)
ir = rng.standard_normal((2, len(ir_t))) * np.exp(-ir_t * 3.8)
ir = np.stack([sosfilt(butter(2, 5000, 'lp', fs=SR, output='sos'), x) for x in ir]) * 0.02
wet = np.stack([fftconvolve(MUS[c], ir[c])[:N] for c in range(2)])
out = MUS + wet * 0.7 + DRY
fade = int(1.2 * SR)
out[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5
out /= np.abs(out).max()
out *= 0.9
p = ROOT / 'audio' / 'bgm.wav'
with wave.open(str(p), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out.T * 32767).astype(np.int16).tobytes())
(ROOT / 'public').mkdir(exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(p), '-c:a', 'aac', '-b:a', '256k', str(ROOT / 'public' / 'bgm.m4a')], check=True)
print(f'bgm ok {DUR:.2f}s')
