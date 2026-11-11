"""この作品用の BGM と効果音を合成する: python audio/bgm.py → audio/bgm.wav（固定の種。課金なし）
条件（plan.html「音」）: 線が折れるときの緊張と、70 から 90 が伸びるときの明快さ。拍が立ち、矢印の走り・折れ・伸び・語の着地を支える。
本人の結論でまとまり、ロゴの終わりで収める。尺は映像（エンドロゴの終わりまで）と同じ。
曲: 120BPM。Dm9–B♭maj7–Fmaj7–C（留保・問いの場面）と、F–C–Dm7–B♭maj7（70→90、結び）の二つの並び。
エレピの和音、撥ねる単音、ベース、キック／クラップ／ハット。場面ごとに編成を変え、語の着地・カメラの振り・折れ・伸びは映像の時刻に効果音で合わせる。"""
import json
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
ROOT = Path(__file__).resolve().parents[1]
tl = json.loads((ROOT / 'src' / 'timeline.json').read_text())
S = {}
acc = 0.0
for c in tl['cuts']:
    S[c['id']] = acc
    acc += c['dur']
LOGO = acc
TOTAL = acc + tl['logoDur']
N = int(TOTAL * SR) + SR
rng = np.random.default_rng(20261111)
BEAT = 0.5
BAR = 2.0

mus = np.zeros((N, 2))  # 曲（キックで少し沈む）
drm = np.zeros((N, 2))
sfx = np.zeros((N, 2))
duck = np.ones(N)


def put(buf, sig, t, gain=1.0, pan=0.0):
    i = int(t * SR)
    if i < 0 or i >= N:
        return
    n = min(len(sig), N - i)
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    buf[i : i + n, 0] += sig[:n] * gain * l * 1.414
    buf[i : i + n, 1] += sig[:n] * gain * r * 1.414


def tt(d):
    return np.arange(int(d * SR)) / SR


def lp(x, f, order=2):
    return sosfilt(butter(order, min(f, SR * 0.45), 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)


def bp(x, a, b):
    return sosfilt(butter(2, [a, b], 'band', fs=SR, output='sos'), x)


def env(d, a=0.005, r=0.05):
    t = tt(d)
    e = np.minimum(1, t / a) * np.minimum(1, (d - t) / r)
    return np.clip(e, 0, 1)


def mtof(m):
    return 440 * 2 ** ((m - 69) / 12)


def kick(g=1.0):
    t = tt(0.32)
    f = 46 + 110 * np.exp(-t * 38)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)
    x += 0.25 * hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 220)
    return x * g


def hat(open_=False):
    d = 0.22 if open_ else 0.05
    t = tt(d)
    return hp(rng.standard_normal(len(t)), 7500) * np.exp(-t * (16 if open_ else 80)) * 0.5


def clap():
    t = tt(0.22)
    x = bp(rng.standard_normal(len(t)), 900, 3200)
    e = np.exp(-t * 26) + sum(np.where(t > o, np.exp(-(t - o) * 90), 0) for o in (0.011, 0.023))
    return x * e * 0.5


def snare():
    t = tt(0.16)
    return (bp(rng.standard_normal(len(t)), 1200, 6000) * np.exp(-t * 32) * 0.6 + np.sin(2 * np.pi * 190 * t) * np.exp(-t * 40) * 0.4) * 0.6


def bass(m, d):
    t = tt(d)
    f = mtof(m)
    x = np.sin(2 * np.pi * f * t) + 0.5 * lp(2 * ((f * t) % 1) - 1, 420)
    return x * np.exp(-t * 3.2) * env(d, 0.006, 0.04) * 0.6


def pluck(m, d=0.42, bright=1.0):
    t = tt(d)
    f = mtof(m)
    x = 2 * ((f * t) % 1) - 1 + 0.6 * (2 * ((f * 1.004 * t) % 1) - 1)
    x = lp(x, 900 + 2600 * bright)
    x += 0.5 * np.sin(2 * np.pi * f * t)
    return x * np.exp(-t * 9) * env(d, 0.003, 0.03) * 0.3


def keys(m, d):
    t = tt(d)
    f = mtof(m)
    mod = np.sin(2 * np.pi * f * 14 * t) * 0.35 * np.exp(-t * 18)
    x = np.sin(2 * np.pi * f * t + mod) + 0.3 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 5)
    trem = 1 + 0.12 * np.sin(2 * np.pi * 4.2 * t)
    return x * trem * np.exp(-t * 1.6) * env(d, 0.008, 0.12) * 0.16


def bell(m, d=1.2):
    t = tt(d)
    f = mtof(m)
    x = np.sin(2 * np.pi * f * t) + 0.5 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6) + 0.25 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 10)
    return x * np.exp(-t * 3.5) * env(d, 0.002, 0.1) * 0.25


def whoosh(d=0.6, f0=500, f1=5000):
    n = int(d * SR)
    x = rng.standard_normal(n)
    out = np.zeros(n)
    seg = 24
    for k in range(seg):
        a = k * n // seg
        b = (k + 1) * n // seg
        fc = f0 * (f1 / f0) ** (k / (seg - 1))
        out[a:b] = bp(x, fc * 0.6, fc * 1.5)[a:b]
    e = np.sin(np.pi * np.arange(n) / n) ** 1.5
    return out * e * 0.5


def impact(g=1.0):
    t = tt(1.1)
    f = 38 + 90 * np.exp(-t * 14)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4.5)
    x += 0.5 * lp(rng.standard_normal(len(t)), 1800) * np.exp(-t * 16)
    x += 0.2 * hp(rng.standard_normal(len(t)), 5000) * np.exp(-t * 30)
    return x * g * 0.9


def thud(g=1.0):
    t = tt(0.3)
    f = 60 + 120 * np.exp(-t * 40)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 16) + 0.3 * lp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 60)) * g * 0.7


def riser(d):
    t = tt(d)
    k = t / d
    x = bp(rng.standard_normal(len(t)), 800, 9000) * k ** 2 * 0.35
    f = 220 * 2 ** (k * 2)
    x += 0.12 * np.sin(2 * np.pi * np.cumsum(f) / SR) * k
    return x


def click(f=2400):
    t = tt(0.05)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 120) * 0.5 + hp(rng.standard_normal(len(t)), 4000) * np.exp(-t * 200) * 0.3


# ---- 曲 ----
A_SET = [(38, [65, 69, 72, 76]), (34, [62, 65, 69, 72]), (41, [64, 69, 72, 76]), (36, [64, 67, 71, 74])]
B_SET = [(41, [69, 72, 77, 81]), (36, [67, 72, 76, 79]), (38, [65, 69, 72, 77]), (34, [65, 69, 74, 77])]
# 編成の切り替え: (開始秒, 太鼓 0-3, ベース, 撥ね 0-2, 和音, 並び)
SEC = [
    (0, 0, 0, 1, 1, 'A'),
    (7, 1, 1, 1, 1, 'A'),
    (15, 3, 1, 2, 1, 'A'),
    (19, 2, 1, 1, 1, 'A'),
    (22.5, 0, 2, 0, 0, 'A'),
    (26.5, 0, 0, 0, 0, 'A'),
    (28.5, 1, 0, 1, 1, 'B'),
    (30, 3, 1, 2, 1, 'B'),
    (38, 3, 1, 1, 1, 'A'),
    (46, 3, 1, 2, 1, 'A'),
    (55, 1, 0, 0, 1, 'A'),
    (59, 2, 1, 1, 1, 'A'),
    (65, 3, 1, 2, 1, 'A'),
    (68, 0, 0, 1, 1, 'A'),
    (72, 3, 1, 2, 1, 'B'),
    (76.5, 2, 1, 1, 1, 'A'),
    (82.5, 3, 1, 2, 1, 'B'),
    (86, 2, 1, 1, 1, 'A'),
    (87.3, 0, 0, 0, 0, 'A'),
    (89, 0, 0, 0, 1, 'A'),
    (91.5, 1, 2, 0, 1, 'A'),
    (94.5, 3, 1, 2, 1, 'A'),
    (99.5, 2, 1, 1, 1, 'A'),
    (108.5, 1, 1, 1, 1, 'A'),
    (113, 1, 0, 1, 1, 'A'),
    (116.5, 0, 0, 1, 1, 'B'),
    (124, 1, 2, 0, 1, 'B'),
    (126.75, 3, 1, 2, 1, 'B'),
    (133.7, 0, 2, 0, 0, 'B'),
    (136.95, 2, 1, 2, 1, 'B'),
    (LOGO - 0.05, 0, 0, 0, 0, 'B'),
]


def sec_at(t):
    cur = SEC[0]
    for s in SEC:
        if t >= s[0] - 1e-6:
            cur = s
    return cur


nb = int(TOTAL / BEAT)
for b in range(nb):
    t = b * BEAT
    _, dl, bs, pl, ky, st = sec_at(t)
    bar = int(t // BAR)
    ib = b % 4
    root, chord = (A_SET if st == 'A' else B_SET)[bar % 4]
    if t >= LOGO - 0.05:
        break
    # 和音（小節の頭と 3 拍目の裏）
    if ky and ib == 0:
        for i, m in enumerate(chord):
            put(mus, keys(m, 1.9), t + i * 0.012, 0.9, (i - 1.5) * 0.3)
    if ky and ib == 2:
        for i, m in enumerate(chord[1:]):
            put(mus, keys(m, 0.9), t + 0.25 + i * 0.01, 0.55, (i - 1) * 0.3)
    # ベース
    if bs == 1:
        pat = {0: [(0, root)], 1: [(0.25, root)], 2: [(0, root + 12)], 3: [(0, root), (0.25, root + 7)]}[ib]
        for off, m in pat:
            put(mus, bass(m, 0.4), t + off, 0.9)
    elif bs == 2:  # 張りつめた 8 分の刻み
        for off in (0, 0.25):
            put(mus, bass(root, 0.2), t + off, 0.7)
    # 撥ねる単音（16 分の型）
    if pl:
        arp = chord + [chord[1] + 12, chord[2] + 12]
        steps = [0, 0.25] if pl == 1 else [0, 0.125, 0.25, 0.375]
        for k, off in enumerate(steps):
            idx = (b * len(steps) + k) * (3 if pl == 2 else 5)
            if pl == 1 and (b + k) % 3 == 2:
                continue
            m = arp[idx % len(arp)] + (12 if pl == 2 and (b + k) % 7 == 3 else 0)
            x = pluck(m, 0.4, 0.5 + 0.4 * pl / 2)
            pan = 0.5 * np.sin(b * 0.9 + k)
            put(mus, x, t + off, 0.7, pan)
            put(mus, x, t + off + 0.375, 0.22, -pan)
    # 太鼓
    if dl >= 2:
        if dl == 3 or ib in (0, 2):
            put(drm, kick(), t, 0.9)
            i = int(t * SR)
            n = int(0.22 * SR)
            if i + n < N:
                duck[i : i + n] = np.minimum(duck[i : i + n], 0.55 + 0.45 * np.linspace(0, 1, n) ** 1.5)
    if dl == 3 and ib in (1, 3):
        put(drm, clap(), t, 0.55, 0.1)
    if dl >= 1:
        put(drm, hat(), t + 0.25, 0.32 if dl > 1 else 0.2, 0.3)
        if dl >= 2:
            put(drm, hat(), t, 0.16, -0.3)
        if dl == 3:
            put(drm, hat(), t + 0.125, 0.1, 0.4)
            put(drm, hat(ib == 3), t + 0.375, 0.14 if ib != 3 else 0.2, -0.2)

# ---- 効果音（映像の時刻に合わせる） ----
def at(cut, t):
    return S[cut] + t


# カメラの速い振り
for c, t, d in [('02', 0.05, 0.6), ('02', 6.3, 0.7), ('03', 3.5, 1.0), ('04', 0.05, 0.7), ('05', 0.1, 0.8), ('05', 8.5, 1.0), ('05', 12.5, 0.9), ('06', 0.05, 0.8), ('08', 0.05, 0.8), ('08', 2.5, 0.7), ('09', 0.05, 0.7), ('09', 2.9, 0.6), ('10', 0.05, 0.8), ('11', 0.05, 0.7), ('12', 0.05, 0.8), ('12', 9.7, 0.8)]:
    put(sfx, whoosh(d), at(c, t), 0.3, rng.uniform(-0.4, 0.4))
# 語の着地（大）
for c, t in [('01', 2.75), ('02', 8.35), ('03', 8.12), ('04', 6.25), ('05', 1.7), ('05', 13.35), ('06', 6.3), ('07', 4.0), ('08', 2.95), ('08', 6.05), ('09', 8.6), ('09', 11.3), ('10', 11.85), ('10', 14.75), ('12', 2.75), ('12', 7.9), ('12', 12.95)]:
    put(sfx, impact(), at(c, t), 0.55)
# 語の着地（小）
for c, t in [('02', 6.8), ('03', 5.55), ('03', 6.45), ('03', 7.2), ('06', 10.6), ('12', 2.45), ('12', 10.3), ('12', 11.5)]:
    put(sfx, thud(), at(c, t), 0.5)
# 01: 「気持ち悪い」— 音程がよれる単音
t = tt(1.4)
f = mtof(69) * (1 + 0.035 * np.sin(2 * np.pi * 5.5 * t) * (t / 1.4))
put(sfx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2) * 0.22, at('01', 2.8), 1, 0.3)
# 02: 写真の四隅、緑が満ちる、つや
put(sfx, click(), at('02', 0.8), 0.5)
put(sfx, riser(0.75), at('02', 7.7), 0.5)
put(sfx, whoosh(1.0, 2000, 9000), at('02', 9.5), 0.18)
put(sfx, bell(88), at('02', 10.0), 0.35, 0.4)
# 03: 目盛りが立つ（細かい刻み）、矢印が走って折れる、着いた瞬間
for i in range(20):
    put(sfx, click(1800 + i * 40), at('03', 0.3 + i * 0.085), 0.12, -0.6 + i * 0.06)
d = 2.3
t = tt(d)
k = t / d
f = 110 * 2 ** (k * 2.6)
jit = np.repeat(rng.uniform(-1, 1, int(d * 48) + 1), SR // 48)[: len(t)]
f2 = f * (1 + 0.35 * jit * k**1.5)  # 進むほど音程が折れる
x = lp(2 * ((np.cumsum(f2) / SR) % 1) - 1, 3500) * (0.25 + 0.75 * k) * 0.22
put(sfx, x * env(d, 0.02, 0.02), at('03', 5.6), 1, 0)
for i in range(18):  # 加速する連打
    put(drm, snare(), at('03', 5.6 + 2.3 * (i / 18) ** 0.6), 0.25 + 0.4 * i / 18)
put(sfx, impact(1.3), at('03', 7.9), 0.7)
t = tt(1.8)
st = sum(lp(2 * ((mtof(m) * (1 + 0.02 * np.sin(2 * np.pi * 7 * t)) * t) % 1) - 1, 1600) for m in (50, 56, 61, 63))  # 濁った和音
put(sfx, st * np.exp(-t * 1.8) * 0.06, at('03', 7.92), 1)
# 04: 実物が置かれる、撮る、光、70 → 90 が伸びる
put(sfx, thud(), at('04', 0.8), 0.6)
put(sfx, click(3000), at('04', 1.3), 0.6)
put(sfx, click(1500), at('04', 1.36), 0.4)
for i, m in enumerate((84, 88, 91, 96)):
    put(sfx, bell(m, 1.0), at('04', 2.6 + i * 0.09), 0.3, -0.3 + i * 0.2)
d = 2.0
t = tt(d)
k = (1 - np.cos(np.pi * t / d)) / 2
f = mtof(65) * 2 ** (k * 4 / 12 * 3)
put(sfx, (np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.3 * np.sin(4 * np.pi * np.cumsum(f) / SR)) * env(d, 0.15, 0.4) * 0.13, at('04', 4.9), 1, 0.2)
put(sfx, bell(89, 1.4), at('04', 6.9), 0.4, 0.3)
# 05: 帯が伸びる
for t0, m in [(2.9, 62), (5.4, 69), (6.5, 72), (9.4, 62), (11.0, 69)]:
    put(sfx, whoosh(0.5, 300, 2500), at('05', t0), 0.2)
    put(sfx, bell(m + 12, 0.8), at('05', t0 + 0.45), 0.22)
# 06: 建物が生える（弦をはじく音）、嘘が混ざる（外れた音）、並びが入れ替わる
for i in range(13):
    put(sfx, pluck([62, 65, 69, 72, 74, 77][i % 6] + 12, 0.25, 1), at('06', 4.3 + i * 0.13), 0.5, -0.7 + i * 0.11)
for j in range(7):
    put(sfx, pluck([63, 68, 70, 73][j % 4] + 12, 0.35, 0.3), at('06', 5.7 + j * 0.22), 0.55, 0.5 - j * 0.15)
for q in range(4):
    put(sfx, whoosh(0.4, 600, 3000), at('06', 10.2 + q * 0.8), 0.14, (-1) ** q * 0.5)
# 07: 面が入る
put(sfx, whoosh(0.5, 400, 4000), at('07', 3.75), 0.3)
# 08: 道具が走る低いうなり、人の手が拭く
d = 2.9
t = tt(d)
put(sfx, lp(2 * ((98 * t) % 1) - 1, 500) * (0.6 + 0.4 * np.sin(2 * np.pi * 1.78 * t)) * env(d, 0.2, 0.3) * 0.09, at('08', 0.7), 1, 0.2)
for q in range(4):
    for w in range(3):
        put(sfx, whoosh(0.16, 2500, 6000), at('08', 5.25 + q * 0.72 + 0.34 + w * 0.11), 0.2, (-1) ** q * 0.5)
    put(sfx, bell(81 + q * 2, 0.5), at('08', 5.25 + q * 0.72 + 0.66), 0.2)
# 09: 札が押される
put(sfx, impact(1.2), at('09', 1.3), 0.7)
put(sfx, clap(), at('09', 1.3), 0.8)
# 10: 跳ねる点、離れていく（下がる音階）
for i in range(12):
    put(sfx, click(900 + (i % 5) * 120), at('10', 0.6 + i * 0.27), 0.14, -0.6 + (i % 4) * 0.2)
for i in range(16):
    put(sfx, pluck(86 - i * 2, 0.3, 0.6), at('10', 10.3 + i * 0.15), 0.4 * (1 - i / 22), -0.2 + i * 0.06)
# 11: シャッター、置き換えた額が倒れる
put(sfx, click(3000), at('11', 1.0), 0.6)
put(sfx, click(1500), at('11', 1.06), 0.4)
put(sfx, thud(), at('11', 4.0), 0.5)
# 12: さくらんぼ、光、0 から 100 を走り抜ける
put(sfx, bell(93, 1.0), at('12', 4.8), 0.5, 0.4)
put(sfx, click(2200), at('12', 4.8), 0.4)
put(sfx, riser(3.2), at('12', 9.7), 0.4)
for i in range(22):
    put(drm, snare(), at('12', 9.9 + 3.0 * (i / 22) ** 0.65), 0.2 + 0.35 * i / 22)
for i, m in enumerate((77, 81, 84, 89, 93)):
    put(sfx, bell(m, 1.6), at('12', 12.95 + i * 0.07), 0.3, -0.4 + i * 0.2)
# ロゴへの押し出しと、ロゴ
put(sfx, whoosh(0.6, 500, 6000), LOGO - 0.55, 0.35)
for m in (41, 53, 60, 65, 69, 72, 79):  # 最後の和音（F add9）をロゴの終わりまで
    d = TOTAL - LOGO
    t = tt(d)
    x = np.sin(2 * np.pi * mtof(m) * t) + 0.25 * np.sin(4 * np.pi * mtof(m) * t)
    put(mus, x * np.exp(-t * 0.5) * env(d, 0.02, 1.4) * 0.07, LOGO, 1, (m % 5 - 2) * 0.2)
for tb, g in [(0.572, 1.0), (1.196, 0.7), (1.612, 0.45)]:  # o の着地
    put(sfx, thud(), LOGO + tb, 0.45 * g)
    put(sfx, pluck(65 if g == 1 else 69, 0.3, 0.8), LOGO + tb, 0.5 * g)
put(sfx, whoosh(0.5, 800, 4000), LOGO + 2.6, 0.2)
for i, m in enumerate((77, 81, 84, 89, 96)):  # .work
    put(sfx, bell(m, 1.2), LOGO + 3.0 + i * 0.08, 0.3, -0.3 + i * 0.15)

# ---- まとめ ----
def reverb(x, d=1.1, wet=0.16):
    n = int(d * SR)
    ir = rng.standard_normal((n, 2)) * np.exp(-np.arange(n) / SR * 5.5)[:, None]
    ir = np.stack([hp(lp(ir[:, 0], 6000), 300), hp(lp(ir[:, 1], 6000), 300)], axis=1) * 0.05
    w = np.stack([fftconvolve(x[:, 0], ir[:, 0])[: len(x)], fftconvolve(x[:, 1], ir[:, 1])[: len(x)]], axis=1)
    return x + w * wet / 0.16 * 0.16


mix = reverb(mus * duck[:, None]) * 0.95 + drm * 0.8 + reverb(sfx, 0.9) * 0.9
mix = mix[: int(TOTAL * SR)]
# 終わりを収める
fo = int(0.5 * SR)
mix[-fo:] *= np.linspace(1, 0, fo)[:, None] ** 1.5
mix = np.tanh(mix * 1.1) / 1.1
mix /= max(1e-9, np.abs(mix).max())
mix *= 0.9
with wave.open(str(ROOT / 'audio' / 'bgm.wav'), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print(f'bgm ok {TOTAL:.2f}s')
