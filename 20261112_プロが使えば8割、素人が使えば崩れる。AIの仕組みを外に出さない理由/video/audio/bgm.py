"""この作品用の BGM と効果音を合成する: python audio/bgm.py → audio/bgm.wav（固定の種。課金なし）
条件（plan.html「音」）: 乾いたキック、短いベース、輪郭のあるプラック。120BPM。
帯が並ぶ所、100% が止まる所、倒れる所にアクセント。倒れる前に 0.3 秒だけ音を抜く。エンドロゴの終わりで収める。
曲: Em9–Cmaj7–G–D（思い込み・根拠・留保）と、G–D–Em7–Cmaj7（決め語・結び）。編成は場面ごとに変える。"""
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
rng = np.random.default_rng(20261112)
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
A_SET = [(40, [66, 67, 71, 74]), (36, [64, 67, 71, 76]), (43, [62, 67, 71, 74]), (38, [62, 66, 69, 74])]
B_SET = [(43, [67, 71, 74, 79]), (38, [66, 69, 74, 78]), (40, [67, 71, 74, 76]), (36, [64, 67, 72, 76])]


def at(cut, t):
    return S[cut] + t


# 編成の切り替え: (開始秒, 太鼓 0-3, ベース, 撥ね 0-2, 和音, 並び)
SEC = [
    (0, 0, 0, 1, 0, 'A'),
    (2.5, 1, 1, 1, 0, 'A'),
    (at('02', 0), 2, 1, 1, 0, 'A'),
    (at('02', 4.0), 3, 1, 2, 1, 'B'),
    (at('03', 0), 3, 1, 2, 0, 'A'),
    (at('03', 6.5), 0, 2, 0, 0, 'A'),
    (at('03', 8.5), 2, 1, 1, 0, 'A'),
    (at('03', 12.0), 3, 1, 2, 1, 'B'),
    (at('04', 0), 2, 1, 1, 0, 'A'),
    (at('04', 4.5), 3, 1, 2, 0, 'B'),
    (at('05', 0), 3, 1, 2, 0, 'A'),
    (at('05', 3.0), 1, 2, 0, 0, 'A'),
    (at('05', 5.0), 3, 1, 2, 1, 'B'),
    (at('05', 10.5), 1, 1, 1, 0, 'A'),
    (at('06', 0), 1, 0, 1, 0, 'A'),
    (at('06', 3.0), 2, 1, 1, 0, 'A'),
    (at('06', 6.0), 0, 2, 0, 0, 'A'),
    (at('06', 9.0), 0, 0, 0, 0, 'A'),
    (at('06', 12.0), 1, 2, 0, 0, 'A'),
    (at('07', 0), 2, 1, 1, 0, 'A'),
    (at('07', 7.0), 3, 1, 2, 1, 'B'),
    (at('08', 0), 3, 1, 2, 0, 'A'),
    (at('08', 6.5), 1, 0, 0, 0, 'A'),
    (at('08', 9.0), 3, 1, 1, 0, 'A'),
    (at('09', 0), 1, 1, 0, 0, 'A'),
    (at('09', 5.5), 2, 1, 1, 0, 'A'),
    (at('09', 8.5), 3, 1, 2, 1, 'B'),
    (at('10', 0), 2, 1, 1, 0, 'A'),
    (at('10', 5.0), 1, 2, 0, 0, 'A'),
    (at('10', 7.5), 0, 0, 1, 1, 'B'),
    (at('10', 10.5), 3, 1, 2, 1, 'B'),
    (LOGO - 0.05, 0, 0, 0, 0, 'B'),
]


def sec_at(t):
    cur = SEC[0]
    for s in SEC:
        if t >= s[0] - 1e-6:
            cur = s
    return cur


def stab(m, d=0.5):
    t = tt(d)
    f = mtof(m)
    x = lp(2 * ((f * t) % 1) - 1 + (2 * ((f * 1.006 * t) % 1) - 1), 2400)
    return x * np.exp(-t * 7) * env(d, 0.004, 0.05) * 0.12


nb = int(TOTAL / BEAT)
for b in range(nb):
    t = b * BEAT
    _, dl, bs, pl, ky, st = sec_at(t)
    bar = int(t // BAR)
    ib = b % 4
    root, chord = (A_SET if st == 'A' else B_SET)[bar % 4]
    if t >= LOGO - 0.05:
        break
    # 和音の短い刻み（決め語の場面だけ）
    if ky and ib in (0, 2):
        for off in ((0, 0.375) if ib == 0 else (0.25,)):
            for i, m in enumerate(chord):
                put(mus, stab(m), t + off + i * 0.006, 0.8, (i - 1.5) * 0.35)
    # 短いベース
    if bs == 1:
        pat = {0: [(0, root)], 1: [(0.25, root), (0.375, root)], 2: [(0, root + 12)], 3: [(0.125, root), (0.25, root + 7)]}[ib]
        for off, m in pat:
            put(mus, bass(m, 0.22), t + off, 0.95)
    elif bs == 2:  # 張りつめた 8 分の刻み
        for off in (0, 0.25):
            put(mus, bass(root, 0.16), t + off, 0.7)
    # 輪郭のあるプラック（16 分の型）
    if pl:
        arp = chord + [chord[0] + 12, chord[2] + 12]
        steps = [0, 0.375] if pl == 1 else [0, 0.125, 0.25, 0.375]
        for k, off in enumerate(steps):
            idx = (b * len(steps) + k) * (5 if pl == 2 else 3)
            if pl == 2 and (b * 4 + k) % 8 in (3, 6):
                continue
            m = arp[idx % len(arp)] + (12 if pl == 2 and (b + k) % 5 == 2 else 0)
            x = pluck(m, 0.3, 0.75 + 0.25 * pl / 2)
            pan = 0.55 * np.sin(b * 1.3 + k * 0.7)
            put(mus, x, t + off, 0.75, pan)
            put(mus, x, t + off + 0.375, 0.16, -pan)
    # 太鼓（乾いたキック）
    if dl >= 2:
        if dl == 3 or ib in (0, 2):
            put(drm, kick(), t, 0.95)
            if dl == 3 and ib == 3:
                put(drm, kick(0.7), t + 0.375, 0.7)
            i = int(t * SR)
            n = int(0.2 * SR)
            if i + n < N:
                duck[i : i + n] = np.minimum(duck[i : i + n], 0.5 + 0.5 * np.linspace(0, 1, n) ** 1.5)
    if dl == 3 and ib in (1, 3):
        put(drm, clap(), t, 0.5, 0.1)
    if dl == 2 and ib == 2:
        put(drm, snare(), t, 0.35, 0.1)
    if dl >= 1:
        put(drm, hat(), t + 0.25, 0.3 if dl > 1 else 0.2, 0.3)
        if dl >= 2:
            put(drm, hat(), t, 0.14, -0.3)
        if dl == 3:
            put(drm, hat(), t + 0.125, 0.1, 0.4)
            put(drm, hat(ib == 3), t + 0.375, 0.14 if ib != 3 else 0.2, -0.2)


# ---- 効果音（映像の時刻に合わせる。src/world.tsx・src/type.tsx の時刻と同じ数字）----
def knock(f=320, g=1.0):
    t = tt(0.12)
    return (np.sin(2 * np.pi * f * t) * np.exp(-t * 45) + 0.4 * bp(rng.standard_normal(len(t)), 800, 3000) * np.exp(-t * 90)) * g * 0.6


# カメラの速い振り
for c in ('03', '04', '05', '07', '08', '09', '10'):
    put(sfx, whoosh(0.75), at(c, -0.35), 0.34, rng.uniform(-0.3, 0.3))
put(sfx, whoosh(0.6), at('02', -0.05), 0.26)
put(sfx, whoosh(0.55, 700, 7000), at('06', 9.25), 0.4)
put(sfx, whoosh(1.2, 300, 3000), at('03', 6.0), 0.2)
put(sfx, whoosh(0.9, 400, 5000), at('03', 11.3), 0.26)
put(sfx, whoosh(1.0, 300, 3000), at('09', 8.6), 0.22)
# 語の着地（大）
for c, t in [('01', 4.78), ('02', 4.1), ('03', 11.97), ('04', 4.45), ('05', 5.0), ('07', 7.2), ('08', 3.9), ('09', 8.72), ('10', 10.35), ('10', 12.2)]:
    put(sfx, impact(), at(c, t), 0.55)
# 語の着地・物が置かれる（小）
for c, t in [('01', 0.6), ('01', 0.73), ('01', 0.86), ('01', 2.85), ('03', 11.2), ('04', 0.4), ('04', 0.5), ('04', 0.6), ('05', 3.25), ('06', 1.45), ('07', 0.45), ('07', 8.75), ('08', 0.5), ('08', 0.6), ('08', 0.7), ('09', 0.45), ('10', 0.5), ('10', 1.3)]:
    put(sfx, thud(), at(c, t), 0.45)
# 01: 渡した先の積みがずれる（音程がよれる）
t = tt(1.0)
f = mtof(64) * (1 - 0.06 * (t / 1.0)) * (1 + 0.03 * np.sin(2 * np.pi * 6 * t))
put(sfx, np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3) * 0.2, at('01', 4.8), 1, 0.4)
# 02: 琥珀の線が引かれる
put(sfx, whoosh(0.5, 1500, 6000), at('02', 4.2), 0.2, -0.3)
put(sfx, bell(86, 1.0), at('02', 4.2), 0.3, -0.3)
put(sfx, thud(1.1), at('02', 4.1), 0.6, 0.4)
# 03: AI が素材を見ていく（細かい刻み）。拾われた所で鈴。残りが沈む。並ぶ
for i in range(36):
    put(sfx, click(1500 + i * 30), at('03', 1.6 + i * 0.081), 0.1, -0.8 + i * 0.045)
for j, i in enumerate((8, 25, 43, 62)):
    put(sfx, bell(79 + j * 3, 0.9), at('03', 1.75 + (i * 0.4 + 1) / 31 * 2.9), 0.32, -0.6 + j * 0.4)
d = 1.5
t = tt(d)
k = t / d
put(sfx, lp(rng.standard_normal(len(t)), 2400 - 2000 * k[-1] * 0 - 0) * (1 - k) ** 0.5 * env(d, 0.05, 0.3) * 0.12, at('03', 6.7), 1)
f = mtof(64) * 2 ** (-k * 1.2)
put(sfx, np.sin(2 * np.pi * np.cumsum(f) / SR) * env(d, 0.05, 0.5) * 0.1, at('03', 6.7), 1)
for j in range(4):
    put(sfx, pluck(76 + j * 2, 0.3, 1), at('03', 10.3 + j * 0.06), 0.5, -0.3 + j * 0.2)
    put(sfx, knock(420 + j * 40), at('03', 11.95 + j * 0.06), 0.6, -0.2 + j * 0.13)
# 04: 構成が抜ける。記事が並ぶ
put(sfx, whoosh(0.6, 500, 5000), at('04', 3.75), 0.3, -0.4)
for j in range(3):
    put(sfx, knock(500 + j * 60), at('04', 7.85 + j * 0.16), 0.45, 0.3 + j * 0.15)
# 05: 8 本が立つ（上がる音階）。2 本が収まる。100% で止まる
for i, m in enumerate((64, 67, 69, 71, 74, 76, 79, 81)):
    put(sfx, pluck(m, 0.3, 1), at('05', 0.3 + i * 0.09), 0.55, -0.6 + i * 0.17)
for j, L in enumerate((2.95, 3.25)):
    put(sfx, whoosh(0.4, 3000, 600), at('05', L - 0.42), 0.2, 0.4)
    put(sfx, thud(1.2), at('05', L), 0.7, 0.4)
    put(sfx, bell(83 + j * 5, 1.2), at('05', L), 0.4, 0.4)
for i, m in enumerate((67, 71, 74, 79, 83)):
    put(sfx, bell(m, 1.8), at('05', 5.0 + i * 0.03), 0.3, -0.4 + i * 0.2)
# 06: 2 本が抜ける。震えが大きくなる。押されて順に当たり、まとめて倒れる
put(sfx, whoosh(0.7, 800, 5000), at('06', 0.1), 0.26, 0.4)
d = 3.6
t = tt(d)
k = t / d
rum = lp(rng.standard_normal(len(t)), 140) * 2.2 + 0.5 * np.sin(2 * np.pi * 52 * t) * (1 + 0.5 * np.sin(2 * np.pi * (5 + 9 * k) * t))
put(sfx, rum * k ** 1.6 * env(d, 0.1, 0.03) * 0.3, at('06', 5.9), 1)
FALL = 9.55
for i, u in enumerate((0.27, 0.46, 0.66, 0.85, 0.98, 1.08, 1.16)):
    put(sfx, knock(300 - i * 14, 1.0 + i * 0.08), at('06', FALL + u), 0.7, -0.6 + i * 0.2)
put(sfx, impact(1.5), at('06', FALL + 1.32), 0.8)
put(sfx, lp(rng.standard_normal(int(0.9 * SR)), 1200) * np.exp(-tt(0.9) * 5) * 0.4, at('06', FALL + 1.32), 0.7)
t = tt(2.4)
st = sum(lp(2 * ((mtof(m) * t) % 1) - 1, 1100) for m in (40, 46, 51, 53))  # 濁った和音
put(sfx, st * np.exp(-t * 1.3) * 0.05, at('06', FALL + 1.34), 1)
# 07: 判断の面が入る
put(sfx, whoosh(0.4, 3000, 500), at('07', 6.8), 0.3)
for i, m in enumerate((67, 74, 79)):
    put(sfx, bell(m, 1.4), at('07', 7.2 + i * 0.03), 0.28, -0.2 + i * 0.2)
# 08: 道具が回る低いうなり（止まって、また動く）。成果物が境界を越える
for a, b in ((0.8, 6.4), (8.9, 12.4)):
    d = b - a
    t = tt(d)
    put(sfx, lp(2 * ((82 * t) % 1) - 1, 420) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.83 * t)) * env(d, 0.3, 0.08) * 0.07, at('08', a), 1, -0.5)
t = tt(0.7)
f = 82 * 2 ** (-(t / 0.7) * 1.6)
put(sfx, lp(2 * ((np.cumsum(f) / SR) % 1) - 1, 500) * env(0.7, 0.01, 0.3) * 0.09, at('08', 6.4), 1, -0.5)
for j in range(6):
    put(sfx, knock(520 + j * 35), at('08', 9.2 + j * 0.17 + 0.62), 0.4, 0.1 + j * 0.13)
    put(sfx, pluck(74 + [0, 2, 5, 7, 9, 12][j], 0.3, 1), at('08', 9.2 + j * 0.17 + 0.62), 0.35, 0.1 + j * 0.13)
for j in range(6):
    put(sfx, whoosh(0.3, 1200, 5000), at('08', 2.5 + j * 0.17), 0.12, -0.2 + j * 0.15)
    put(sfx, knock(460 + j * 35), at('08', 2.5 + j * 0.17 + 0.62), 0.5, 0.1 + j * 0.13)
    put(sfx, pluck(71 + [0, 3, 5, 7, 10, 12][j], 0.3, 1), at('08', 2.5 + j * 0.17 + 0.62), 0.4, 0.1 + j * 0.13)
# 09: 行が書かれる。プロの印。「そして」から 20 通りが立つ
for i in range(9):
    put(sfx, whoosh(0.3, 2000, 5000), at('09', 0.55 + i * 0.13), 0.08, -0.5 + i * 0.1)
for n in range(5):
    put(sfx, bell(81 + [0, 2, 5, 7, 9][n], 0.8), at('09', 5.75 + n * 0.2 + 0.2), 0.3, -0.5 + n * 0.25)
for j in range(20):
    put(sfx, pluck(64 + [0, 3, 5, 7, 10][j % 5] + 12 * (j // 5), 0.3, 1), at('09', 9.3 + j * 0.07), 0.38, -0.7 + j * 0.07)
# 10: 歯が当たって離れる。組み直す。一つになる
put(sfx, impact(0.8), at('10', 5.95), 0.5)
put(sfx, clap(), at('10', 5.95), 0.7)
for n in range(4):
    put(sfx, knock(520 + n * 60), at('10', 8.95 + n * 0.09), 0.4, 0.3)
put(sfx, riser(0.45), at('10', 9.9), 0.4)
for i, m in enumerate((67, 71, 74, 79, 86)):
    put(sfx, bell(m, 2.0), at('10', 10.35 + i * 0.03), 0.3, -0.4 + i * 0.2)
for j in range(3):
    put(sfx, knock(500 + j * 60), at('10', 13.1 + j * 0.13), 0.4, 0.3 + j * 0.15)
# ロゴへの押し出しと、ロゴ
put(sfx, whoosh(0.6, 500, 6000), LOGO - 0.55, 0.35)
for m in (43, 55, 62, 67, 71, 74, 81):  # 最後の和音（G add9）をロゴの終わりまで
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
