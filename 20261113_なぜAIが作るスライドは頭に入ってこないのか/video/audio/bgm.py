"""この作品用の BGM と効果音を合成する: python audio/bgm.py → audio/bgm.wav（固定の種。課金なし）
条件（plan.html「音」）: 乾いたリム、短いウッド、輪郭のあるプラック。108BPM。
02 の開口、05 の一覧から比較への展開、07 の語りの広がり、09 の並べ替え、10 の結びにアクセント。05 の比較中は層を減らす。エンドロゴの終わりで収める。
曲: Dmaj9–Bm7–Gmaj7–A6（体験・理由・留保）と、G–A–F#m7–Bm7（決め語・結び）。編成は場面ごとに変える。"""
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
rng = np.random.default_rng(20261113)
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
A_SET = [(38, [66, 69, 73, 76]), (35, [66, 69, 71, 74]), (43, [66, 67, 71, 74]), (45, [64, 69, 73, 78])]
B_SET = [(43, [67, 71, 74, 78]), (45, [64, 69, 73, 76]), (42, [64, 66, 69, 73]), (35, [66, 69, 71, 74])]


def at(cut, t):
    return S[cut] + t


# 編成の切り替え: (開始秒, 打楽器 0-3, ベース, 撥ね 0-2, 和音, 並び)
SEC = [
    (0, 0, 0, 1, 0, 'A'),
    (3.4, 1, 2, 0, 0, 'A'),
    (at('02', -0.7), 1, 0, 1, 0, 'A'),
    (at('02', 0.4), 2, 1, 1, 0, 'A'),
    (at('02', 3.0), 3, 1, 2, 1, 'B'),
    (at('03', 0), 2, 1, 1, 0, 'A'),
    (at('03', 4.1), 3, 1, 2, 0, 'A'),
    (at('04', 0), 1, 1, 1, 0, 'B'),
    (at('04', 5.2), 2, 1, 2, 0, 'B'),
    (at('05', 0), 2, 1, 2, 0, 'A'),
    (at('05', 5.2), 3, 1, 2, 1, 'B'),
    (at('05', 7.6), 1, 1, 0, 0, 'A'),
    (at('05', 14.4), 2, 1, 1, 0, 'B'),
    (at('06', 0), 1, 2, 0, 0, 'A'),
    (at('06', 5.7), 2, 1, 1, 0, 'B'),
    (at('06', 13.2), 3, 1, 2, 1, 'B'),
    (at('07', 0), 1, 2, 1, 0, 'A'),
    (at('07', 4.8), 3, 1, 2, 1, 'B'),
    (at('08', 0), 2, 1, 1, 0, 'A'),
    (at('08', 2.9), 3, 1, 2, 0, 'A'),
    (at('08', 6.2), 3, 1, 2, 1, 'B'),
    (at('09', 0), 2, 1, 1, 0, 'A'),
    (at('09', 5.1), 2, 1, 2, 0, 'B'),
    (at('09', 10.2), 3, 1, 2, 1, 'A'),
    (at('09', 12.0), 2, 1, 1, 0, 'B'),
    (at('09', 15.1), 3, 1, 2, 1, 'B'),
    (at('10', 0), 2, 1, 1, 0, 'A'),
    (at('10', 6.4), 2, 1, 2, 0, 'B'),
    (at('10', 11.2), 1, 0, 1, 0, 'B'),
    (at('10', 13.3), 3, 1, 2, 1, 'B'),
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
# カメラの速い振りと、横への移動
for c in ('03', '07', '09'):
    put(sfx, whoosh(0.75), at(c, -0.3), 0.34, rng.uniform(-0.3, 0.3))
for c, d in (('04', -0.5), ('05', -0.35), ('06', -0.5), ('08', -0.55)):
    put(sfx, whoosh(0.9, 400, 3500), at(c, d), 0.22, 0.2)
# 語の着地（大）
for c, t in [('01', 3.4), ('02', 3.0), ('04', 1.3), ('06', 14.2), ('07', 7.75), ('08', 2.95), ('09', 6.75), ('09', 14.5), ('10', 13.3)]:
    put(sfx, impact(), at(c, t), 0.5)
# 行が入る・面が置かれる（小）
for c, t in [('01', 2.5), ('02', 2.3), ('03', 1.2), ('03', 4.1), ('04', 0.6), ('05', 14.9), ('05', 15.5), ('06', 1.3), ('06', 2.3), ('06', 13.2), ('07', 2.2), ('07', 5.5), ('07', 7.0), ('08', 0.7), ('09', 2.4), ('09', 5.9), ('09', 10.3), ('09', 13.5), ('10', 1.0), ('10', 3.3), ('10', 12.4)]:
    put(sfx, thud(), at(c, t), 0.36)
# 01: 文章面が一枚ずつ迫る（だんだん低く、重く）
for i in range(6):
    a = 0.3 + i * 0.6
    put(sfx, whoosh(0.7, 2400 - i * 300, 500), at('01', a), 0.16 + i * 0.03, -0.3 + i * 0.12)
    put(sfx, thud(0.7 + i * 0.12), at('01', a + 0.45), 0.3 + i * 0.05)
# 02: 面が左右に開く。要点の面、語りの経路
put(sfx, riser(0.7), at('02', -0.75), 0.3)
put(sfx, whoosh(1.6, 300, 4200), at('02', -0.6), 0.34)
put(sfx, wood(79), at('02', 4.35), 0.6, -0.5)
put(sfx, glide(1.6, 66, 78), at('02', 6.1), 1, 0.2)
# 03: 面が上から足されていく（速くなる）。残す一枚を選ぶ
for i, d in enumerate((1.2, 1.7, 2.15, 2.55, 2.9, 3.2)):
    put(sfx, whoosh(0.3, 3000, 900), at('03', d), 0.12, -0.2 + i * 0.1)
    put(sfx, knock(260 + i * 22), at('03', d + 0.34), 0.5, -0.2 + i * 0.1)
put(sfx, whoosh(0.9, 500, 3500), at('03', 5.1), 0.24, -0.3)
put(sfx, bell(78, 1.0), at('03', 6.2), 0.26, -0.4)
# 04: 行が見出しごとにまとまる
for j in range(3):
    put(sfx, wood(74 + j * 2), at('04', 5.5 + j * 0.4), 0.5, -0.4)
put(sfx, whoosh(0.8, 500, 3000), at('04', 7.9), 0.2)
# 05: 四枚がめくれて並ぶ。二枠を引き出し、二面になる。外枠
for i in range(4):
    put(sfx, knock(380 + i * 40), at('05', 0.55 + i * 0.11), 0.5, -0.4 + i * 0.27)
put(sfx, whoosh(0.8, 500, 4500), at('05', 5.2), 0.3)
put(sfx, wood(81), at('05', 5.6), 0.5, 0.4)
put(sfx, wood(86), at('05', 5.75), 0.5, 0.4)
put(sfx, whoosh(1.0, 400, 3800), at('05', 6.3), 0.3)
put(sfx, thud(1.1), at('05', 7.38), 0.5, -0.4)
put(sfx, thud(1.1), at('05', 7.53), 0.5, 0.4)
put(sfx, bell(81, 1.2), at('05', 10.6), 0.3, -0.4)
put(sfx, bell(74, 1.0), at('05', 11.95), 0.24, 0.4)
put(sfx, bell(69, 1.4), at('05', 12.95), 0.28, 0.4)
put(sfx, whoosh(0.7, 600, 3000), at('05', 14.3), 0.2)
put(sfx, whoosh(0.9, 3000, 500), at('05', 19.25), 0.24)
# 06: 読む線と、聞く経路が同じ場所へ。うなりが出て、整理されると消える。図のそばの短い語句
put(sfx, glide(2.5, 78, 64), at('06', 1.9), 1, 0.5)
d = 2.6
t = tt(d)
k = t / d
beat2 = np.sin(2 * np.pi * 196 * t) + np.sin(2 * np.pi * (196 + 3 + 7 * k) * t)
put(sfx, beat2 * np.sin(np.pi * k) ** 1.5 * 0.06, at('06', 2.9), 1)
put(sfx, whoosh(0.9, 3500, 500), at('06', 5.7), 0.26, -0.4)
for q in range(4):
    put(sfx, pluck(69 + [0, 4, 7, 12][q], 0.3, 1), at('06', 6.3 + q * 0.12), 0.4, 0.2 + q * 0.1)
    put(sfx, wood(74 + [0, 2, 5, 7][q]), at('06', 7.95 + q * 0.3), 0.6, 0.1 + q * 0.15)
put(sfx, glide(1.3, 62, 69, 0.7), at('06', 5.7), 1, 0.3)
# 07: 一段ずつなぞる（細かい刻み）と、行の頭へ戻る音。画面が縮み、語りが外へ広がる
for r, (a, b2) in enumerate(((0.5, 1.35), (1.45, 2.3), (2.4, 3.25), (3.35, 4.2))):
    n = 10
    for i in range(n):
        put(sfx, click(1700 + r * 60), at('07', a + (b2 - a) * i / n), 0.11, -0.7 + 1.4 * i / n)
    put(sfx, whoosh(0.14, 4000, 1500), at('07', b2 - 0.01), 0.16, 0.2)
    put(sfx, rim(0.7), at('07', b2 + 0.1), 0.4, -0.6)
put(sfx, whoosh(0.9, 500, 5000), at('07', 4.75), 0.34)
put(sfx, glide(2.6, 62, 81), at('07', 4.95), 1.2, 0.3)
for i, m in enumerate((69, 73, 76, 81)):
    put(sfx, bell(m, 1.6), at('07', 7.75 + i * 0.03), 0.24, -0.3 + i * 0.2)
# 08: 一行ずつ抜く。語りが受け持つ
for n in range(9):
    a = 1.7 + n * 0.4
    put(sfx, whoosh(0.3, 2600 - n * 120, 700), at('08', a), 0.17, -0.5)
    put(sfx, rim(0.6), at('08', a + 0.32), 0.3, -0.6)
put(sfx, wood(76), at('08', 5.3), 0.5, -0.5)
put(sfx, glide(2.6, 62, 69, 0.8), at('08', 3.3), 1, -0.2)
put(sfx, glide(3.0, 69, 86), at('08', 6.2), 1.3, 0.2)
put(sfx, whoosh(1.6, 400, 4500), at('08', 6.6), 0.2, 0.3)
# 09: ばらばらの面がそろう。重要な面が前へ。入れ替え。経路で順に結び、一度戻って、通す
for i in range(3):
    put(sfx, whoosh(0.5, 2500, 600), at('09', 0.15 + i * 0.15), 0.14, 0.4 - i * 0.3)
    put(sfx, wood(72 + i * 4), at('09', 2.62 + i * 0.35), 0.7, -0.5 + i * 0.5)
put(sfx, whoosh(0.6, 600, 3500), at('09', 6.9), 0.2)
for a in (10.3, 11.1):
    put(sfx, whoosh(0.7, 500, 4200), at('09', a), 0.3, -0.3)
    put(sfx, knock(420), at('09', a + 0.66), 0.5, -0.4)
    put(sfx, knock(520), at('09', a + 0.7), 0.5, 0.4)
put(sfx, glide(2.2, 62, 74), at('09', 12.0), 1.1, -0.3)
put(sfx, glide(0.65, 74, 69, 0.8), at('09', 14.3), 1, 0)
put(sfx, wood(79), at('09', 14.95), 0.5, 0)
put(sfx, glide(1.3, 69, 81), at('09', 15.1), 1.2, 0.3)
put(sfx, bell(86, 1.4), at('09', 16.4), 0.3, 0.5)
# 10: 行が書かれていく。二つの完成形。下へ送り、結びの語
for i in range(13):
    put(sfx, click(1500 + i * 40), at('10', 0.9 + i * 0.13), 0.09, -0.5)
put(sfx, glide(1.1, 66, 73, 0.7), at('10', 1.7), 1, 0.4)
put(sfx, wood(74), at('10', 7.5), 0.5, -0.5)
for j in range(3):
    put(sfx, wood(76 + j * 2), at('10', 7.8 + j * 0.3), 0.36, -0.5)
put(sfx, wood(81), at('10', 8.7), 0.5, 0.5)
put(sfx, glide(1.9, 69, 76, 0.7), at('10', 8.7), 1, 0.4)
put(sfx, whoosh(1.0, 3000, 500), at('10', 11.2), 0.24)
for i, m in enumerate((67, 71, 74, 78, 86)):
    put(sfx, bell(m, 2.0), at('10', 13.3 + i * 0.03), 0.28, -0.4 + i * 0.2)
put(sfx, glide(2.1, 67, 86), at('10', 13.3), 1.2, 0.5)
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
