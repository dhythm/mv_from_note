"""BGM と効果音をローカルで合成する（追加課金なし・固定シード）。エンドロゴの終わりまで覆う。

条件（plan.html「音」から）:
  - トーンは、注意が一点に戻るときの明快さ。暗い環境音や、失敗を責める音にしない。過去の企画の曲は使わない。
  - 拍が立ち、カードの送りと画面の大きな組み替えを支える。遅い曲に映像を合わせない。
  - 見落としから一つずつの集中へ切り替わる場面と、プログラム・AIの役割が分かれる場面にアクセント。
    本人の結論でまとまり、ロゴの終わりで収める。
  - 短い「音を薄くする間」は、見落としに気づく瞬間などの意味の転換に使う。製品の通知音は使わない。
曲: C 長調、150BPM（1 拍 0.4 秒）。進行 Dm7–G–Cmaj7–Am（1 小節ずつ）。
  主役は木琴風の短い音（マリンバ）の 8 分の型と、エレピの和音の刻み。
  01: マリンバだけで入り、吹き出しの着地で低い打音 → 02: 音を薄くする（見落としに気づく）。帯の付いた二枚で粒 →
  03: ベースと控えめなキック。「渡し方？」で打音 → 04: ハイハットが入る。円が広がるところで上がる風切り →
  05: 列を走る風切り。真ん中は打楽器を抜く（抜ける）→ 06: 「一つずつ。」の着地から全編成。カードを渡すたびに短い木の音（送りの間隔どおりに詰まる）→
  07: 全編成。札は小さな粒 → 08: 揺れる答えはドラムを抜いてエレピだけ。淡い青の面で打音、歯車の刻みに金属の短い音 →
  09: 全編成。三語がはまるたびに刻みの音 → 10・11: 一段軽く（キックは 2 拍に一度）→
  12: 「判断。」で全編成、壁の場面は薄く → 13: 全編成でまとまる → ロゴ: 最後の和音を保持の終わりまで。
Lyria（有料の音楽生成）と比べてローカル合成を選んだ理由: カードの送り（30 回、間隔が詰まる）・歯車の刻み・語の着地へ
フレーム単位で合わせる必要があり、ローカル合成が確実で、費用もかからないため。

  python audio/bgm.py   → audio/bgm.wav（numpy・scipy が要る）
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
_s = 0.0
for c in TL['cuts']:
    S[c['id']] = _s
    _s += c['dur']
LOGO = _s
DUR = LOGO + TL['logoDur']
BEAT = 0.4
BAR = 1.6
N = int(SR * DUR)
rng = np.random.default_rng(20261110)
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


def marimba(m, vel=0.3, d=0.5):
    t = tt(d)
    f = midi(m)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + 0.35 * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 22) + 0.12 * np.sin(2 * np.pi * f * 10 * t) * np.exp(-t * 60)
    return s * env(len(t), 0.002, 0.05) * vel


def wood(hi=True, vel=0.5):
    t = tt(0.09)
    f = 1150 if hi else 820
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 70) + 0.5 * np.sin(2 * np.pi * f * 2.7 * t) * np.exp(-t * 120)
    return s * vel


def ratchet(vel=0.4):
    t = tt(0.07)
    s = np.sin(2 * np.pi * 2100 * t) * np.exp(-t * 110) + 0.6 * np.sin(2 * np.pi * 3350 * t) * np.exp(-t * 150)
    n = sosfilt(butter(2, 4000, 'hp', fs=SR, output='sos'), rng.standard_normal(len(t))) * np.exp(-t * 300) * 0.3
    return (s + n) * vel


# ---- 和声: Dm7–G–Cmaj7–Am ----
PROG = [(38, [62, 65, 69, 72]), (43, [62, 67, 71, 74]), (36, [64, 67, 71, 72]), (45, [64, 69, 72, 76])]
chord_at = lambda t: PROG[int(t // BAR) % 4]


def section(t):
    for name, a in [('intro', 0), ('thin', S['02']), ('ask', S['03']), ('groove', S['04']), ('track', S['05']), ('pre', S['06']), ('full', S['06'] + 1.2), ('full', S['07']),
                    ('sway', S['08']), ('gear', S['08'] + 3.3), ('full', S['09']), ('light', S['10']), ('light', S['11']), ('pre', S['12']), ('full', S['12'] + 0.9), ('thinwall', S['12'] + 7.3), ('full', S['13']), ('logo', LOGO)][::-1]:
        if t >= a:
            return name


# 05 の真ん中（列の灰色の区間をカメラが通る間）は打楽器を抜く
HOLE = (S['05'] + 2.0, S['05'] + 3.6)

# パッド（薄く、全編）
t = 0.0
while t < LOGO:
    root, ch = chord_at(t)
    sc = section(t)
    place(pad([n - 12 for n in ch[:3]], BAR + 0.4, 0.07 if sc in ('thin', 'sway', 'thinwall') else 0.05), t)
    t += BAR

for i in range(int(LOGO / (BEAT / 4))):
    t = i * BEAT / 4
    sc = section(t)
    q = i % 16
    root, ch = chord_at(t)
    hole = HOLE[0] <= t < HOLE[1]
    drums = {'intro': 0, 'thin': 0, 'ask': 1, 'groove': 2, 'track': 2, 'pre': 1, 'full': 3, 'sway': 0, 'gear': 1, 'light': 1, 'thinwall': 1, 'logo': 0}[sc]
    if hole:
        drums = 0
    # キック
    if drums >= 2 and q % 4 == 0:
        place(kick(0.8), t, bus=DRY)
    elif drums == 1 and q in (0, 8):
        place(kick(0.6), t, bus=DRY)
    if drums == 3 and q == 10:
        place(kick(0.5), t, bus=DRY)
    # ハイハット
    if drums >= 2 and q % 4 == 2:
        place(hat(False), t, 0.5, pan=0.3, bus=DRY)
    if drums == 3 and q % 2 == 1:
        place(hat(False), t, 0.16, pan=-0.3, bus=DRY)
    if drums == 3 and q == 14:
        place(hat(True), t, 0.3, pan=0.3, bus=DRY)
    # クラップ（2・4 拍）
    if drums == 3 and q in (4, 12):
        place(clap(), t, 0.36, pan=-0.1, bus=DRY)
    # ベース
    if sc in ('groove', 'track', 'full') and not hole and q in (0, 3, 6, 10, 12):
        place(bass(root - 12 + (12 if q == 6 else 0) + (7 if q == 12 else 0), 0.18, 0.36), t)
    elif sc in ('ask', 'pre', 'gear', 'light', 'thinwall') and q in (0, 6):
        place(bass(root - 12, 0.5 if q == 0 else 0.2, 0.3), t)
    # マリンバの 8 分の型（主役）
    pat = [ch[0], ch[2], ch[1], ch[3], ch[2], ch[0] + 12, ch[1], ch[3]]
    if q % 2 == 0 and sc not in ('sway',):
        g = {'intro': 0.3, 'thin': 0.14, 'ask': 0.22, 'groove': 0.26, 'track': 0.26, 'pre': 0.2, 'full': 0.27, 'gear': 0.2, 'light': 0.24, 'thinwall': 0.16}[sc]
        if not (sc == 'thin' and q % 4 == 2):
            place(marimba(pat[(q // 2) % 8], g * (0.6 if hole else 1)), t, pan=-0.25)
    # エレピの和音の刻み（裏拍）
    if sc in ('groove', 'track', 'full', 'light') and not hole and q in (2, 7, 10):
        place(epiano(ch, 0.5, 0.2), t, pan=0.2)
    if sc == 'sway' and q in (0, 6, 11):
        place(epiano([n + (1 if q == 11 else 0) * 0 for n in ch], 1.0, 0.26), t, pan=0.2)
    if sc in ('thin', 'thinwall') and q == 0:
        place(epiano(ch, 1.4, 0.16), t, pan=0.2)

# ---- 合わせる点（全体の秒）----
hits = [(3.1, 0.6), (S['02'] + 4.25, 0.4), (S['03'] + 0.1, 0.4), (S['03'] + 4.55, 0.6), (S['04'] + 1.75, 0.45), (S['05'] + 4.6, 0.5), (S['06'] + 1.25, 0.7), (S['07'] + 13.35, 0.5),
        (S['08'] + 1.75, 0.3), (S['08'] + 3.5, 0.6), (S['10'] + 4.95, 0.5), (S['11'] + 2.85, 0.4), (S['12'] + 0.95, 0.6), (S['12'] + 10.35, 0.5), (S['13'] - 0.02, 0.7), (S['13'] + 5.05, 0.45)]
for s_, g in hits:
    place(impact(), s_, g, bus=DRY)
swooshes = [(0.0, 2.6, False, 0.25), (S['02'] + 0.1, 0.8, True, 0.3), (S['03'] - 0.35, 0.5, True, 0.35), (S['04'] - 0.35, 0.5, True, 0.35), (S['04'] + 3.2, 1.2, True, 0.4), (S['05'] + 1.3, 2.4, True, 0.4),
            (S['05'] + 3.8, 1.2, False, 0.3), (S['06'] - 0.1, 1.0, True, 0.35), (S['07'] - 0.55, 0.9, False, 0.3), (S['08'] + 3.3, 0.8, True, 0.4), (S['09'] + 3.4, 0.7, False, 0.3), (S['10'] - 0.05, 0.5, True, 0.35),
            (S['11'] - 0.35, 0.5, True, 0.35), (S['12'] - 0.35, 0.5, True, 0.35), (S['13'] - 0.35, 0.5, False, 0.35), (LOGO - 0.5, 0.55, True, 0.45)]
for s_, d, up, g in swooshes:
    place(whoosh(d, up), s_, g, pan=-0.15, bus=DRY)
# 06: カードを一枚渡すたびに木の音（src/actC.tsx の DEP と同じ式）
dep = S['06'] + 3.5
for n in range(30):
    place(wood(n % 2 == 0, 0.55), dep + 0.06, 0.8, pan=-0.3 + 0.6 * (n % 3) / 2, bus=DRY)
    dep += max(0.17, 0.5 * 0.9 ** n)
# 07: 残した三枚を、もう一度一枚ずつ
for j in range(3):
    place(wood(True, 0.5), S['07'] + 5.0 + j * 1.5 + 0.1, 0.8, bus=DRY)
    place(bell(84 + j * 2, 0.9, 0.08), S['07'] + 5.0 + j * 1.5 + 0.1, pan=0.3)
# 歯車の刻み（08 後半は 0.75 秒ごと、09 は三語がはまる時と、そのあと 0.9 秒ごと、13 は 0.8 秒ごと）
tk = S['08'] + 4.4
while tk < S['09']:
    place(ratchet(), tk + 0.08, 0.7, pan=0.3, bus=DRY)
    tk += 0.75
for w in (0.35, 0.85, 1.65):
    place(ratchet(0.5), S['09'] + w + 0.14, 0.8, pan=-0.2, bus=DRY)
    place(wood(False, 0.5), S['09'] + w + 0.05, 0.7, pan=-0.2, bus=DRY)
tk = S['09'] + 3.3
while tk < S['10']:
    place(ratchet(0.3), tk + 0.08, 0.6, pan=-0.35, bus=DRY)
    tk += 0.9
tk = S['13'] + 4.8
while tk < LOGO - 0.6:
    place(ratchet(0.3), tk + 0.08, 0.55, pan=0.35, bus=DRY)
    tk += 0.8
# 吹き出しが出る音（短い上がる二音）
for s_, base in [(3.05, 67), (S['08'] + 0.3, 72), (S['08'] + 1.2, 76), (S['08'] + 2.1, 71), (S['09'] + 4.1, 72), (S['12'] + 12.4, 67), (S['13'] + 5.5, 76)]:
    place(marimba(base, 0.3, 0.3), s_ + 0.02, pan=0.25)
    place(marimba(base + 7, 0.3, 0.4), s_ + 0.1, pan=0.25)
# プラグが付く
place(wood(False, 0.7), S['10'] + 4.72, 0.9, bus=DRY)
# ロゴ: 最後の和音（C）を保持の終わりまで
place(pad([36, 48, 55, 64, 67, 72], TL['logoDur'], 0.2), LOGO)
place(marimba(72, 0.35, 1.2), LOGO, pan=-0.2)
place(bass(24 + 12, 2.5, 0.36), LOGO)
place(kick(0.6), LOGO, bus=DRY)
for s_ in (0.57, 1.2, 1.4):  # o のバウンド（2.6 秒の 22%・46%・54%）
    place(wood(False, 0.35), LOGO + s_, 0.7, bus=DRY)
for k, m in enumerate([76, 79, 84, 88, 91]):
    place(bell(m, 2.0, 0.09), LOGO + 3.0 + 0.08 * k, pan=0.3)  # 「.work」が一文字ずつ出る

# 残響（音楽のみ）
ir_t = tt(1.2)
ir = rng.standard_normal((2, len(ir_t))) * np.exp(-ir_t * 4.2)
ir = np.stack([sosfilt(butter(2, 5000, 'lp', fs=SR, output='sos'), x) for x in ir]) * 0.02
wet = np.stack([fftconvolve(MUS[c], ir[c])[:N] for c in range(2)])
out = MUS + wet * 0.6 + DRY
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
print(f'bgm ok {DUR:.2f}s')
