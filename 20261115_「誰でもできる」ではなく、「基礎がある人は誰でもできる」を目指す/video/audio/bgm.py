"""この作品用の BGM と効果音を合成する: python audio/bgm.py → audio/bgm.wav（固定の種。課金なし）
条件（plan.html「音」）: 乾いた木、短い撥弦、輪郭のあるプラック。112BPM。
01 の着地、02 の停止、06 の括り、09 の結びにアクセント。留保の区間は層を減らすが、拍は止めない。エンドロゴの終わりで収める。
曲: Am9–Fmaj7–Cadd9–G6（問い・留保）と、Fmaj7–G–Em7–Am7（決め語・結び）。編成は場面ごとに変える。"""
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
    acc += c['beats'] * 60 / tl['bpm']
LOGO = acc
TOTAL = acc + tl['logoDur']
N = int(TOTAL * SR) + SR
rng = np.random.default_rng(20261115)
BEAT = 60 / tl['bpm']
BAR = BEAT * 4

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


# ---- この作品の楽器 ----
def rim(g=1.0):
    t = tt(0.07)
    x = np.sin(2 * np.pi * 1750 * t) * np.exp(-t * 95) + 0.6 * np.sin(2 * np.pi * 820 * t) * np.exp(-t * 70)
    x += 0.5 * hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 260)
    return x * g * 0.55


def wood(m=76, g=1.0):
    t = tt(0.12)
    f = mtof(m)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 48) + 0.35 * np.sin(2 * np.pi * f * 2.71 * t) * np.exp(-t * 90)
    x += 0.2 * bp(rng.standard_normal(len(t)), 1500, 5000) * np.exp(-t * 300)
    return x * g * 0.5


def glide(d, m0, m1, g=1.0):
    """語りの経路が伸びる音（音程がなめらかに動く、柔らかい正弦）"""
    t = tt(d)
    k = t / d
    f = mtof(m0 + (m1 - m0) * (k * k * (3 - 2 * k)))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.2 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return x * env(d, 0.06, min(0.3, d * 0.4)) * 0.12 * g


def stab(m, d=0.5):
    t = tt(d)
    f = mtof(m)
    x = lp(2 * ((f * t) % 1) - 1 + (2 * ((f * 1.006 * t) % 1) - 1), 2400)
    return x * np.exp(-t * 7) * env(d, 0.004, 0.05) * 0.12


def knock(f=320, g=1.0):
    t = tt(0.12)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 45) + 0.4 * bp(rng.standard_normal(len(t)), 800, 3000) * np.exp(-t * 90)) * g * 0.6


# ---- 曲 ----
A_SET = [(45, [64, 67, 71, 72]), (41, [64, 65, 69, 72]), (36, [64, 67, 72, 74]), (43, [62, 67, 71, 76])]
B_SET = [(41, [65, 69, 72, 76]), (43, [62, 67, 71, 74]), (40, [62, 64, 67, 71]), (45, [64, 67, 69, 72])]


def at(cut, t):
    return S[cut] + t


# 編成の切り替え: (開始秒, 打楽器 0-3, ベース, 撥ね 0-2, 和音, 並び)
SEC = [
    (0, 0, 0, 1, 0, 'A'),
    (at('01', 4.5), 1, 1, 1, 0, 'A'),
    (at('01', 9.27), 3, 1, 2, 1, 'B'),
    (at('02', 0), 2, 1, 1, 0, 'A'),
    (at('02', 4.7), 3, 1, 2, 0, 'A'),
    (at('02', 10.3), 1, 2, 0, 0, 'A'),
    (at('02', 12.45), 2, 1, 1, 1, 'B'),
    (at('03', 0), 2, 1, 1, 0, 'A'),
    (at('03', 5.6), 3, 2, 2, 0, 'A'),
    (at('03', 8.78), 2, 1, 1, 1, 'B'),
    (at('04', 0), 1, 2, 0, 0, 'A'),
    (at('04', 3.2), 1, 2, 1, 0, 'A'),
    (at('04', 8.1), 3, 1, 2, 1, 'B'),
    (at('05', 0), 1, 1, 1, 0, 'A'),
    (at('05', 3.9), 2, 1, 1, 0, 'A'),
    (at('05', 8.7), 3, 1, 2, 0, 'B'),
    (at('06', 0), 2, 1, 1, 0, 'A'),
    (at('06', 5.4), 2, 2, 1, 0, 'A'),
    (at('06', 9.84), 3, 1, 2, 1, 'B'),
    (at('07', 0), 2, 1, 1, 0, 'A'),
    (at('07', 4.5), 3, 1, 2, 0, 'A'),
    (at('07', 9.1), 2, 2, 1, 0, 'B'),
    (at('07', 15.28), 3, 1, 2, 1, 'B'),
    (at('08', 0), 2, 1, 1, 0, 'A'),
    (at('08', 2.9), 3, 1, 2, 0, 'A'),
    (at('08', 7.3), 1, 1, 1, 0, 'A'),
    (at('08', 10.9), 3, 1, 2, 1, 'B'),
    (at('09', 0), 1, 1, 1, 0, 'A'),
    (at('09', 5.3), 2, 1, 1, 0, 'B'),
    (at('09', 7.7), 3, 1, 2, 1, 'B'),
    (at('09', 15.6), 2, 1, 1, 0, 'B'),
    (LOGO - 0.05, 0, 0, 0, 0, 'B'),
]


def sec_at(t):
    cur = SEC[0]
    for s in SEC:
        if t >= s[0] - 1e-6:
            cur = s
    return cur


Q = BEAT / 4  # 16 分
nb = int(TOTAL / BEAT)
for b in range(nb):
    t = b * BEAT
    if t >= LOGO - 0.05:
        break
    _, dl, bs, pl, ky, st = sec_at(t)
    bar = b // 4
    ib = b % 4
    root, chord = (A_SET if st == 'A' else B_SET)[bar % 4]
    # 和音の短い刻み（決め語の場面だけ）
    if ky and ib in (0, 2):
        for off in ((0, 3 * Q) if ib == 0 else (2 * Q,)):
            for i, m in enumerate(chord):
                put(mus, stab(m), t + off + i * 0.006, 0.8, (i - 1.5) * 0.35)
    # 短いベース
    if bs == 1:
        pat = {0: [(0, root)], 1: [(2 * Q, root), (3 * Q, root)], 2: [(0, root + 12)], 3: [(Q, root), (2 * Q, root + 7)]}[ib]
        for off, m in pat:
            put(mus, bass(m, 0.22), t + off, 0.95)
    elif bs == 2:  # 張りつめた 8 分の刻み
        for off in (0, 2 * Q):
            put(mus, bass(root, 0.16), t + off, 0.7)
    # 輪郭のあるプラック（16 分の型）
    if pl:
        arp = chord + [chord[0] + 12, chord[2] + 12]
        steps = [0, 3] if pl == 1 else [0, 1, 2, 3]
        for k, q in enumerate(steps):
            idx = (b * len(steps) + k) * (5 if pl == 2 else 3)
            if pl == 2 and (b * 4 + k) % 8 in (3, 6):
                continue
            m = arp[idx % len(arp)] + (12 if pl == 2 and (b + k) % 5 == 2 else 0)
            x = pluck(m, 0.3, 0.75 + 0.25 * pl / 2)
            pan = 0.55 * np.sin(b * 1.3 + k * 0.7)
            put(mus, x, t + q * Q, 0.75, pan)
            put(mus, x, t + q * Q + 3 * Q, 0.16, -pan)
    # 打楽器: 乾いたリムと短いウッドが主役。キックは土台だけ
    if dl >= 2:
        if ib in (0, 2) or dl == 3:
            put(drm, kick(0.8), t, 0.7 if dl == 3 else 0.6)
            i = int(t * SR)
            n = int(0.18 * SR)
            if i + n < N:
                duck[i : i + n] = np.minimum(duck[i : i + n], 0.6 + 0.4 * np.linspace(0, 1, n) ** 1.5)
    if dl >= 1 and ib in (1, 3):
        put(drm, rim(), t, 0.6 if dl > 1 else 0.42, 0.15)
    if dl >= 2:
        put(drm, wood(76 if ib % 2 == 0 else 81), t + 2 * Q, 0.36, -0.35)
        if ib == 3:
            put(drm, wood(83), t + 3 * Q, 0.3, 0.35)
    if dl == 3:
        put(drm, rim(0.6), t + 3 * Q, 0.3, -0.2)
        put(drm, hat(), t + Q, 0.1, 0.4)
        put(drm, hat(ib == 3), t + 2 * Q, 0.13 if ib != 3 else 0.17, -0.3)
    elif dl >= 1:
        put(drm, hat(), t + 2 * Q, 0.16, 0.3)

# ---- 効果音（映像の時刻に合わせる。src/world.tsx・src/type.tsx・src/score.ts の時刻と同じ数字）----
# カメラの速い振り
for c in ('03', '04', '05', '06', '08'):
    put(sfx, whoosh(0.7), at(c, -0.32), 0.32, rng.uniform(-0.3, 0.3))
put(sfx, whoosh(0.9, 400, 3500), at('02', -0.55), 0.22, 0.1)
# 語の着地（大）
for c, t in [('01', 9.27), ('02', 12.45), ('03', 8.82), ('04', 8.15), ('04', 9.25), ('06', 5.45), ('06', 9.9), ('07', 4.6), ('07', 15.38), ('08', 2.98), ('08', 13.9), ('09', 7.7), ('09', 12.62)]:
    put(sfx, impact(), at(c, t), 0.5)
# 行が入る・語が置かれる（小）
for c, t in [('01', 0.35), ('01', 6.75), ('02', 0.5), ('02', 1.5), ('02', 4.7), ('03', 2.35), ('03', 9.3), ('04', 1.0), ('04', 2.3), ('05', 0.75), ('05', 6.2), ('05', 8.75), ('05', 11.15), ('06', 1.15), ('06', 2.55), ('06', 10.98), ('07', 0.5), ('07', 1.72), ('07', 6.3), ('07', 6.88), ('07', 10.95), ('08', 0.9), ('08', 10.92), ('09', 0.9), ('09', 3.9), ('09', 6.8), ('09', 10.3)]:
    put(sfx, thud(), at(c, t), 0.34)
# 01: 賛成の下線。7 文字が落ちてくる
put(sfx, glide(0.6, 64, 69), at('01', 4.5), 0.9, -0.2)
put(sfx, whoosh(0.35, 3000, 600), at('01', 8.95), 0.25)
for i, m in enumerate((65, 69, 72, 76)):
    put(sfx, bell(m, 1.6), at('01', 9.27 + i * 0.03), 0.22, -0.3 + i * 0.2)
# 02: 範囲の輪が出る。広がり続ける。基礎の輪が描き終わって止まる
for i, t in enumerate((0.5, 1.5, 4.7)):
    put(sfx, wood(72 - i * 5, 1.2), at('02', t), 0.6, -0.3 + i * 0.3)
put(sfx, riser(3.4), at('02', 6.6), 0.16)
put(sfx, glide(0.6, 57, 69), at('02', 11.9), 1.3)
put(sfx, knock(220, 1.2), at('02', 12.5), 0.7)
# 03: 行が短くなる。細かい行が増え続ける（速くなる刻み）。基準線
for i in range(4):
    put(sfx, wood(76 - i * 2), at('03', 1.5 + i * 0.16), 0.4, -0.4)
k = 2
while k < 64:
    t = 5.6 + 2.7 * (k / 64) ** (1 / 3)
    put(sfx, click(1800 + 30 * k), at('03', t), 0.16 + 0.002 * k, rng.uniform(-0.5, 0.5))
    k += 2 if k < 20 else 3
put(sfx, whoosh(0.4, 500, 4000), at('03', 8.32), 0.3)
put(sfx, glide(0.5, 52, 57), at('03', 8.55), 1.2)
# 04: 写しが増える（だんだん弱く）
for i in range(6):
    put(sfx, click(2000 - i * 120), at('04', 3.25 + i * 0.5), 0.3 - i * 0.035, -0.2 + (i % 2) * 0.6)
# 05: 手順が渡る。層が一段ずつ厚くなる（人によって速さが違う）
for kcol in range(3):
    put(sfx, whoosh(0.4, 600, 3000), at('05', 3.9 + (2 - kcol) * 0.22 - 0.1), 0.16, -0.5 + kcol * 0.5)
    put(sfx, knock(300 + kcol * 40), at('05', 3.9 + (2 - kcol) * 0.22 + 0.45), 0.5, -0.5 + kcol * 0.5)
for kcol, n in enumerate((3, 6, 9)):
    for m in range(n):
        put(sfx, wood(64 + kcol * 4 + (m % 3) * 3, 0.9), at('05', 8.8 + 5.4 * (m + 0.3) / n), 0.3, -0.5 + kcol * 0.5)
# 06: 線の端が縮む。括る。中身と時間
put(sfx, glide(2.1, 69, 57), at('06', 7.5), 0.9)
put(sfx, knock(260, 1.2), at('06', 9.86), 0.7)
for t in (11.0, 11.6, 11.82, 12.04):
    put(sfx, wood(79), at('06', t), 0.36, 0.3)
# 07: 基準線が上がる
put(sfx, glide(1.2, 57, 64), at('07', 9.1), 1.1)
# 08: 業務の面が迫る。二面が一つになる。共有の線
put(sfx, whoosh(0.5, 300, 2500), at('08', 2.5), 0.3)
put(sfx, glide(1.7, 60, 65), at('08', 5.1), 0.8)
put(sfx, glide(0.5, 65, 72), at('08', 10.9), 1.0, 0.3)
# 09: 両立の線。7 文字がもう一度落ちてはまる。小さな輪。結び
put(sfx, glide(0.6, 60, 67), at('09', 5.3), 1.0)
put(sfx, whoosh(0.35, 3000, 600), at('09', 7.38), 0.25)
for i, m in enumerate((65, 69, 72, 76, 81)):
    put(sfx, bell(m, 2.0), at('09', 7.7 + i * 0.03), 0.24, -0.4 + i * 0.2)
put(sfx, glide(0.7, 64, 72), at('09', 11.1), 0.9, -0.2)
for i, m in enumerate((67, 71, 74, 79, 86)):
    put(sfx, bell(m, 2.2), at('09', 12.62 + i * 0.03), 0.26, -0.4 + i * 0.2)
# ロゴへの押し出しと、ロゴ
put(sfx, whoosh(0.6, 500, 6000), LOGO - 0.55, 0.35)
for m in (41, 53, 60, 64, 67, 72, 79):  # 最後の和音（Fmaj9）をロゴの終わりまで
    d = TOTAL - LOGO
    t = tt(d)
    x = np.sin(2 * np.pi * mtof(m) * t) + 0.25 * np.sin(4 * np.pi * mtof(m) * t)
    put(mus, x * np.exp(-t * 0.5) * env(d, 0.02, 1.4) * 0.07, LOGO, 1, (m % 5 - 2) * 0.2)
for tb, g in [(0.572, 1.0), (1.196, 0.7), (1.612, 0.45)]:  # o の着地
    put(sfx, thud(), LOGO + tb, 0.45 * g)
    put(sfx, pluck(67 if g == 1 else 71, 0.3, 0.8), LOGO + tb, 0.5 * g)
put(sfx, whoosh(0.5, 800, 4000), LOGO + 2.6, 0.2)
for i, m in enumerate((79, 83, 86, 91, 98)):  # .work
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
