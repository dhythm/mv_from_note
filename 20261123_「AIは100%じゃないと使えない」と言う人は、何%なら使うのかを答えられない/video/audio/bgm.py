"""この作品用の新規 BGM と効果音を合成する: python audio/bgm.py → audio/bgm.wav（固定の種。課金なし）
乾いた打楽器、短いピアノ、輪郭のある低音。120BPM。前作（20261123・116BPM・D major）の合成部品を使い、
調・テンポ・進行の並び・アルペジオの刻み・編成・アクセントはこの作品用に組み直した。
着地: 01「使うのか。」、02 の 99%／99.9%、03「拾えない。」、05 のホイップパンと「結論が、覆る。」、07「精度は、合意だ。」。
エンドロゴの終わりまで覆い、最後の 1.5 秒で収める。
曲: C major / A minor。
  A進行（問い・留保）: Am9 – Fmaj7 – Em7 – G6
  B進行（根拠・決め語・結び）: Fmaj7 – G6 – Am9 – Cadd9
"""
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
rng = np.random.default_rng(20261123)
BEAT = 60 / tl['bpm']
Q = BEAT / 4  # 16分音符

mus = np.zeros((N, 2))
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


def env(d, a=0.004, r=0.04):
    t = tt(d)
    e = np.minimum(1, t / a) * np.minimum(1, (d - t) / r)
    return np.clip(e, 0, 1)


def mtof(m):
    return 440 * 2 ** ((m - 69) / 12)


# ---- 楽器（乾いた打楽器・短いピアノ・輪郭のある低音） ----
def kick(g=1.0):
    t = tt(0.28)
    f = 48 + 105 * np.exp(-t * 42)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 13)
    x += 0.22 * hp(rng.standard_normal(len(t)), 2800) * np.exp(-t * 240)
    return x * g


def rim(g=1.0):
    t = tt(0.065)
    x = np.sin(2 * np.pi * 1820 * t) * np.exp(-t * 105) + 0.55 * np.sin(2 * np.pi * 860 * t) * np.exp(-t * 75)
    x += 0.45 * hp(rng.standard_normal(len(t)), 3200) * np.exp(-t * 280)
    return x * g * 0.52


def wood(m=78, g=1.0):
    t = tt(0.11)
    f = mtof(m)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 52) + 0.3 * np.sin(2 * np.pi * f * 2.71 * t) * np.exp(-t * 95)
    x += 0.18 * bp(rng.standard_normal(len(t)), 1600, 5200) * np.exp(-t * 300)
    return x * g * 0.45


def hat(open_=False):
    d = 0.18 if open_ else 0.045
    t = tt(d)
    return hp(rng.standard_normal(len(t)), 7800) * np.exp(-t * (18 if open_ else 90)) * 0.42


def piano(m, d=0.45, bright=0.8):
    """短いフェルト寄りピアノ（立ち上がり明瞭・余韻は短く歯切れ良い）"""
    t = tt(d)
    f = mtof(m)
    # ハンマー打鍵ノイズ + 基音と倍音の自然な減衰
    x = (
        1.0 * np.sin(2 * np.pi * f * t) * np.exp(-t * 5.2)
        + 0.42 * bright * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 9.5)
        + 0.18 * bright * np.sin(2 * np.pi * 3 * f * t) * np.exp(-t * 15.0)
        + 0.08 * bright * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 22.0)
    )
    hammer = bp(rng.standard_normal(len(t)), 1200, 4200) * np.exp(-t * 180) * 0.14
    return (x + hammer) * env(d, 0.003, 0.05) * 0.28


def bass(m, d=0.22):
    """輪郭のあるクリーンベース"""
    t = tt(d)
    f = mtof(m)
    x = np.sin(2 * np.pi * f * t) + 0.45 * lp(2 * ((f * t) % 1) - 1, 480) + 0.2 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t * 10)
    return x * np.exp(-t * 3.8) * env(d, 0.005, 0.035) * 0.56


def bell(m, d=1.3):
    t = tt(d)
    f = mtof(m)
    x = np.sin(2 * np.pi * f * t) + 0.42 * np.sin(2 * np.pi * f * 2.76 * t) * np.exp(-t * 6.5) + 0.2 * np.sin(2 * np.pi * f * 5.4 * t) * np.exp(-t * 11)
    return x * np.exp(-t * 3.2) * env(d, 0.002, 0.12) * 0.23


def whoosh(d=0.55, f0=450, f1=4800):
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
    return out * e * 0.46


def impact(g=1.0):
    t = tt(0.95)
    f = 42 + 88 * np.exp(-t * 15)
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5.0)
    x += 0.42 * lp(rng.standard_normal(len(t)), 1600) * np.exp(-t * 18)
    x += 0.16 * hp(rng.standard_normal(len(t)), 5000) * np.exp(-t * 34)
    return x * g * 0.85


def thud(g=1.0):
    t = tt(0.24)
    f = 62 + 115 * np.exp(-t * 42)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 18) + 0.26 * lp(rng.standard_normal(len(t)), 2200) * np.exp(-t * 65)) * g * 0.65


def pop_bubble(g=1.0):
    """吹き出しが一塊で弾み出る音"""
    t = tt(0.18)
    f = 340 + 420 * (1 - np.exp(-t * 35))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22)
    return x * env(0.18, 0.004, 0.04) * g * 0.42


def glide(d, m0, m1, g=1.0):
    t = tt(d)
    k = t / d
    f = mtof(m0 + (m1 - m0) * (k * k * (3 - 2 * k)))
    x = np.sin(2 * np.pi * np.cumsum(f) / SR) + 0.18 * np.sin(4 * np.pi * np.cumsum(f) / SR)
    return x * env(d, 0.05, min(0.28, d * 0.4)) * 0.12 * g


def at(cut, t):
    return S[cut] + t


# ---- 進行（C major / A minor） ----
AM9 = (45, [60, 64, 67, 71])
FM7 = (41, [60, 64, 65, 69])
EM7 = (40, [59, 62, 64, 67])
G6 = (43, [59, 62, 64, 67])
CADD9 = (36, [60, 62, 64, 67])
A_SET = [AM9, FM7, EM7, G6]
B_SET = [FM7, G6, AM9, CADD9]

# セクション編成: (開始秒, 打楽器 0-3, ベース 0-2, ピアノ密度 1-2, 和音刻み 0-1, 進行 A/B)
SEC = [
    (0.0, 1, 2, 1, 0, 'A'),               # 01 突き返される資料
    (at('01', 5.0), 2, 1, 1, 0, 'A'),     # 01 問い
    (at('01', 6.5), 3, 1, 2, 1, 'A'),     # 01 使うのか。
    (at('02', 0.0), 2, 1, 1, 0, 'B'),     # 02 10回のうち8回
    (at('02', 8.0), 2, 1, 2, 0, 'B'),     # 02 100個
    (at('02', 12.5), 3, 1, 2, 1, 'B'),    # 02 1000個、空の点へ寄る
    (at('02', 18.5), 1, 2, 1, 0, 'A'),    # 02 ビー玉（100%には、ならない）
    (at('03', 0.0), 2, 1, 1, 0, 'B'),     # 03 完全に一致
    (at('03', 5.5), 2, 2, 1, 0, 'A'),     # 03 通れない形
    (at('03', 9.0), 3, 1, 2, 1, 'A'),     # 03 拾えない。
    (at('03', 11.5), 2, 1, 1, 0, 'B'),    # 03 プログラムの仕事
    (at('03', 16.0), 3, 1, 2, 1, 'B'),    # 03 同時には、満たせない。
    (at('04', 0.0), 2, 1, 1, 0, 'A'),     # 04 なぜ95%か
    (at('04', 6.5), 3, 1, 2, 1, 'A'),     # 04 根拠が、要る。
    (at('04', 8.0), 1, 2, 1, 0, 'A'),     # 04 定まらない針
    (at('04', 12.5), 2, 1, 2, 0, 'B'),    # 04 理由を示せば
    (at('05', 0.0), 2, 1, 1, 0, 'B'),     # 05 95%で、成功
    (at('05', 4.5), 1, 2, 1, 0, 'A'),     # 05 二つの印
    (at('05', 10.5), 3, 2, 2, 0, 'A'),    # 05 ホイップパン、赤い帯
    (at('05', 13.5), 3, 1, 2, 1, 'A'),    # 05 結論が、覆る。
    (at('06', 0.0), 1, 1, 1, 0, 'A'),     # 06 届かない線
    (at('06', 4.5), 2, 1, 2, 0, 'B'),     # 06 ミスを減らす
    (at('07', 0.0), 2, 2, 1, 0, 'A'),     # 07 三つの言い方
    (at('07', 3.5), 2, 1, 2, 0, 'B'),     # 07 精度は
    (at('07', 6.0), 3, 1, 2, 1, 'B'),     # 07 合意だ。
    (at('07', 7.5), 2, 1, 2, 0, 'B'),     # 07 二人で貼る線
    (at('07', 11.5), 3, 1, 2, 1, 'B'),    # 07 結び
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
    if t >= LOGO - 0.05:
        break
    _, dl, bs, pl, ky, st = sec_at(t)
    bar = b // 4
    ib = b % 4
    root, chord = (A_SET if st == 'A' else B_SET)[bar % 4]

    # 短いピアノのコード刻み（決め語・クライマックス）
    if ky and ib in (0, 2):
        for off in ((0, 3 * Q) if ib == 0 else (2 * Q,)):
            for i, m in enumerate(chord):
                put(mus, piano(m, 0.38, 0.95), t + off + i * 0.008, 0.58, (i - 1.5) * 0.30)

    # 短いピアノのアルペジオ（全編の軽やかな推進力）
    arp = chord + [chord[0] + 12, chord[2] + 12]
    steps = [0, 3] if pl == 1 else [0, 1, 2, 3]
    for k, q in enumerate(steps):
        if pl == 2 and (b * 4 + k) % 8 in (3, 7):
            continue
        idx = (b * len(steps) + k) * (5 if pl == 1 else 7) + bar
        m = arp[idx % len(arp)] + (12 if pl == 2 and (b + k) % 6 == 2 else 0)
        x = piano(m, 0.32, 0.72 + 0.25 * (pl - 1))
        pan = 0.45 * np.sin(b * 1.1 + k * 0.8)
        put(mus, x, t + q * Q, 0.62 if pl == 1 else 0.72, pan)

    # 輪郭のある低音
    if bs == 1:
        pat = {0: [(0, root)], 1: [(2 * Q, root), (3 * Q, root)], 2: [(0, root + 12)], 3: [(Q, root), (2 * Q, root + 7)]}[ib]
        for off, m in pat:
            put(mus, bass(m, 0.22), t + off, 0.92)
    elif bs == 2:
        for off in (0, 2 * Q):
            put(mus, bass(root, 0.16), t + off, 0.68)

    # 乾いた打楽器（リム・ウッド・キック）
    if dl >= 2:
        if ib in (0, 2) or dl == 3:
            put(drm, kick(0.76), t, 0.66 if dl == 3 else 0.56)
            i = int(t * SR)
            n = int(0.16 * SR)
            if i + n < N:
                duck[i : i + n] = np.minimum(duck[i : i + n], 0.65 + 0.35 * np.linspace(0, 1, n) ** 1.5)
    if dl >= 1 and ib in (1, 3):
        put(drm, rim(), t, 0.58 if dl > 1 else 0.38, 0.16)
    if dl >= 2:
        put(drm, wood(78 if ib % 2 == 0 else 83), t + 2 * Q, 0.32, -0.32)
        if ib == 3:
            put(drm, wood(85), t + 3 * Q, 0.26, 0.34)
    if dl == 3:
        put(drm, rim(0.55), t + 3 * Q, 0.28, -0.22)
        put(drm, hat(), t + Q, 0.10, 0.38)
        put(drm, hat(ib == 3), t + 2 * Q, 0.13 if ib != 3 else 0.16, -0.28)
    elif dl >= 1:
        put(drm, hat(), t + 2 * Q, 0.14, 0.28)

# ---- 効果音（映像イベントに同期） ----
for c, t in [('01', 4.7), ('02', -0.2), ('02', 18.5), ('03', -0.2), ('03', 5.6), ('03', 11.0), ('04', -0.2), ('04', 8.0), ('04', 12.2),
             ('05', -0.2), ('05', 4.3), ('06', -0.2), ('06', 4.3), ('07', -0.2), ('07', 7.55)]:
    put(sfx, whoosh(0.5), at(c, t), 0.26, rng.uniform(-0.25, 0.25))
# 05 のホイップパン（大きく）
put(sfx, whoosh(0.7, 380, 6200), at('05', 9.95), 0.42)

# 決め語の着地（大）
for c, t in [('01', 2.1), ('01', 6.55), ('02', 10.3), ('02', 19.95), ('03', 8.9), ('03', 15.9), ('04', 4.5), ('04', 6.8), ('04', 9.75),
             ('05', 0.9), ('05', 13.45), ('06', 5.5), ('07', 6.0), ('07', 11.6)]:
    put(sfx, impact(0.9), at(c, t), 0.42)

# 行・語の登場（小）
for c, t in [('01', 5.45), ('02', 1.6), ('03', 2.8), ('03', 12.2), ('04', 0.9), ('05', 5.6), ('05', 11.1), ('06', 1.5), ('06', 8.4), ('07', 0.45), ('07', 0.95), ('07', 1.45), ('07', 10.2)]:
    put(sfx, thud(0.85), at(c, t), 0.30)

# 02: 点が増える（100個、1000個）と、足される 9
put(sfx, glide(0.9, 57, 64), at('02', 7.7), 0.9, -0.2)
put(sfx, glide(1.0, 60, 72), at('02', 12.4), 1.0, 0.2)
put(sfx, pop_bubble(0.9), at('02', 16.3), 0.6, -0.1)
# 03: 正方形が門へ入る
for i in range(3):
    put(sfx, wood(76 + i * 2, 1.0), at('03', 2.3 + i * 0.2), 0.5, -0.3 + i * 0.1)
# 05: 赤い帯が光る
for i, m in enumerate((64, 65, 71)):
    put(sfx, bell(m, 1.8), at('05', 10.9 + i * 0.04), 0.2, -0.2 + i * 0.2)
# 06: 途中の印
put(sfx, bell(76, 1.2), at('06', 8.4), 0.22, -0.2)
# 07: 結びの和音
for i, m in enumerate((60, 64, 67, 71, 76)):
    put(sfx, bell(m, 2.2), at('07', 11.6 + i * 0.035), 0.24, -0.4 + i * 0.2)

# 08: ロゴへの横振りとエンドロゴ（5.5秒の終わりまで覆い、最後の1.5秒で収める）
put(sfx, whoosh(0.55, 500, 5800), LOGO - 0.48, 0.34)
for m in (36, 48, 55, 60, 64, 67, 71, 74):  # Cmaj9 の余韻
    d = TOTAL - LOGO
    t = tt(d)
    x = np.sin(2 * np.pi * mtof(m) * t) + 0.22 * np.sin(4 * np.pi * mtof(m) * t)
    put(mus, x * np.exp(-t * 0.48) * env(d, 0.02, 1.5) * 0.068, LOGO, 1.0, (m % 5 - 2) * 0.18)

# o の着地バウンド（0.572s, 1.196s, 1.612s）
for tb, g in [(0.572, 1.0), (1.196, 0.68), (1.612, 0.42)]:
    put(sfx, thud(), LOGO + tb, 0.42 * g)
    put(sfx, piano(67 if g == 1 else 72, 0.35, 0.9), LOGO + tb, 0.55 * g)
put(sfx, whoosh(0.48, 800, 3800), LOGO + 2.60, 0.20)
for i, m in enumerate((72, 76, 79, 84, 91)):  # .work
    put(sfx, bell(m, 1.3), LOGO + 3.00 + i * 0.08, 0.26, -0.3 + i * 0.15)


# ---- まとめ ----
def reverb(x, d=1.05, wet=0.15):
    n = int(d * SR)
    ir = rng.standard_normal((n, 2)) * np.exp(-np.arange(n) / SR * 5.8)[:, None]
    ir = np.stack([hp(lp(ir[:, 0], 5800), 300), hp(lp(ir[:, 1], 5800), 300)], axis=1) * 0.05
    w = np.stack([fftconvolve(x[:, 0], ir[:, 0])[: len(x)], fftconvolve(x[:, 1], ir[:, 1])[: len(x)]], axis=1)
    return x + w * wet


mix = reverb(mus * duck[:, None]) * 0.95 + drm * 0.78 + reverb(sfx, 0.85) * 0.88
mix = mix[: int(TOTAL * SR)]
# 最後の 1.5 秒で滑らかに収め、末尾 0.4 秒で完全に無音へ
fo_long = int(1.5 * SR)
mix[-fo_long:] *= np.linspace(1, 0.08, fo_long)[:, None] ** 1.4
fo_end = int(0.4 * SR)
mix[-fo_end:] *= np.linspace(1, 0, fo_end)[:, None] ** 1.8

mix = np.tanh(mix * 1.08) / 1.08
mix /= max(1e-9, np.abs(mix).max())
mix *= 0.9
with wave.open(str(ROOT / 'audio' / 'bgm.wav'), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
print(f'bgm ok {TOTAL:.2f}s (LOGO={LOGO:.2f}s)')
