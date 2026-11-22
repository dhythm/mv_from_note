"""この作品用の新規 BGM と効果音を合成する: python audio/bgm.py → audio/bgm.wav（固定の種。課金なし）
条件（plan.html「音」）: 乾いた打楽器、短いピアノ、輪郭のある低音。116BPM。
01 の着地、02 で点が前へ出て吹き出しが出る瞬間、04 で丸が線に乗る瞬間、07 の着地にアクセント。
エンドロゴ（1:51.0）の終わりまで覆い、最後の 1.5 秒で収める。
曲（本作新規）: D major / B minor。
  A進行（問い・素通り・留保）: Bm9 – Gmaj7 – Dadd9 – A6
  B進行（届く・通り道・決め語・結び）: Gmaj7 – A6 – F#m7 – Bm9
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
rng = np.random.default_rng(20261122)
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


# ---- 進行（D major / B minor） ----
# A: Bm9 - Gmaj7 - Dadd9 - A6
A_SET = [
    (47, [62, 66, 69, 73]),
    (43, [62, 66, 67, 71]),
    (38, [62, 64, 66, 69]),
    (45, [61, 64, 66, 69]),
]
# B: Gmaj7 - A6 - F#m7 - Bm9
B_SET = [
    (43, [62, 66, 67, 71]),
    (45, [61, 64, 66, 69]),
    (42, [61, 64, 66, 69]),
    (47, [62, 66, 69, 73]),
]

# セクション編成: (開始秒, 打楽器 0-3, ベース 0-2, ピアノ密度 1-2, 和音刻み 0-1, 進行 A/B)
SEC = [
    (0.0, 1, 0, 1, 0, 'A'),              # 01 冒頭: 紙カードが流れる軽やかな導入
    (at('01', 5.05), 2, 1, 1, 0, 'A'),   # 01 点の列へ戻る
    (at('01', 10.55), 3, 1, 2, 1, 'B'),  # 01 だから、発信していい。
    (at('02', 0.0), 2, 1, 1, 0, 'A'),    # 02 素通り
    (at('02', 5.10), 2, 1, 2, 0, 'B'),   # 02 動画インサート（1人が立ち止まる）
    (at('02', 8.30), 3, 1, 2, 1, 'B'),   # 02 相談したい
    (at('03', 0.0), 1, 1, 1, 0, 'A'),    # 03 留保（悪意ではない）: 層を少し減らし拍は維持
    (at('03', 5.55), 2, 1, 1, 0, 'A'),   # 03 動画インサート（それぞれの日常）
    (at('04', 0.0), 2, 2, 1, 0, 'A'),    # 04 知らせなければ存在しない
    (at('04', 8.05), 3, 1, 2, 1, 'B'),   # 04 通り道に出す
    (at('05', 0.0), 2, 1, 1, 0, 'B'),    # 05 話を聞かせて
    (at('05', 7.10), 2, 1, 2, 0, 'B'),   # 05 動画インサート（信頼できる人に相談）
    (at('05', 12.05), 3, 1, 2, 1, 'B'),  # 05 まず、知る人へ
    (at('06', 0.0), 2, 2, 1, 0, 'A'),    # 06 留保（打算的だ）
    (at('06', 7.05), 3, 1, 2, 1, 'B'),   # 06 打算ではない
    (at('06', 11.50), 2, 1, 1, 0, 'A'),  # 06 真摯な意見・雑音は流す
    (at('07', 0.0), 1, 2, 1, 0, 'A'),    # 07 恐れてやめる（緊張）
    (at('07', 6.90), 2, 1, 2, 0, 'B'),   # 07 点がほどける
    (at('07', 9.55), 3, 1, 2, 1, 'B'),   # 07 自分の言葉で（クライマックス）
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
    steps = [0, 2] if pl == 1 else [0, 1, 2, 3]
    for k, q in enumerate(steps):
        if pl == 2 and (b * 4 + k) % 8 in (3, 7):
            continue
        idx = (b * len(steps) + k) * (3 if pl == 1 else 5)
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
# 速い振り・インサート転換
for t_whip in [
    at('01', 4.92),
    at('02', 5.00),
    at('02', 10.95),
    at('03', -0.22),
    at('03', 5.45),
    at('03', 10.45),
    at('04', -0.24),
    at('05', -0.22),
    at('05', 7.00),
    at('05', 12.95),
    at('06', -0.22),
    at('07', -0.24),
    at('07', 9.45),
]:
    put(sfx, whoosh(0.52), t_whip, 0.28, rng.uniform(-0.25, 0.25))

# 決め語の着地（大）
for c, t in [
    ('01', 7.55),
    ('01', 10.55),
    ('02', 1.70),
    ('03', 8.85),
    ('04', 4.20),
    ('06', 7.05),
    ('07', 12.05),
]:
    put(sfx, impact(0.9), at(c, t), 0.44)

# 行の登場（小）
for c, t in [
    ('01', 2.25),
    ('03', 3.10),
    ('04', 2.30),
    ('04', 8.35),
    ('05', 4.20),
    ('05', 12.05),
    ('06', 0.55),
    ('06', 11.50),
    ('06', 13.55),
    ('07', 2.35),
    ('07', 10.65),
]:
    put(sfx, thud(0.85), at(c, t), 0.30)

# 02: 点が減速し、吹き出し「相談したい」が一塊で出る瞬間
put(sfx, glide(0.7, 66, 62), at('02', 4.2), 0.9, -0.2)
put(sfx, pop_bubble(1.0), at('02', 8.30), 0.72, 0.15)
for i, m in enumerate((62, 66, 69, 74)):
    put(sfx, bell(m, 1.5), at('02', 8.32 + i * 0.03), 0.20, -0.25 + i * 0.18)

# 04: 丸が通り道の線の上へ昇って琥珀に灯る瞬間
put(sfx, glide(0.75, 57, 69), at('04', 7.95), 1.15)
for i, m in enumerate((66, 69, 74, 78)):
    put(sfx, bell(m, 1.6), at('04', 8.12 + i * 0.035), 0.22, -0.3 + i * 0.2)

# 05: 藍の弧が描かれる音
put(sfx, glide(1.15, 62, 74), at('05', 13.05), 1.05, 0.1)

# 06: 珊瑚の斜線が右上へ抜ける音
put(sfx, whoosh(0.45, 700, 5500), at('06', 6.80), 0.34, 0.25)

# 07: 点がほどけ、結びの「自分の言葉で。」に温かな和音ベル
put(sfx, glide(1.1, 61, 73), at('07', 6.90), 0.95)
for i, m in enumerate((62, 66, 69, 73, 78)):
    put(sfx, bell(m, 2.2), at('07', 12.05 + i * 0.035), 0.24, -0.4 + i * 0.2)

# 08: ロゴへの横振りとエンドロゴ（5.5秒の終わりまで覆い、最後の1.5秒で収める）
put(sfx, whoosh(0.55, 500, 5800), LOGO - 0.48, 0.34)
for m in (38, 50, 57, 62, 66, 69, 73, 78):  # Dmaj9 の温かく澄んだ余韻
    d = TOTAL - LOGO
    t = tt(d)
    x = np.sin(2 * np.pi * mtof(m) * t) + 0.22 * np.sin(4 * np.pi * mtof(m) * t)
    put(mus, x * np.exp(-t * 0.48) * env(d, 0.02, 1.5) * 0.068, LOGO, 1.0, (m % 5 - 2) * 0.18)

# o の着地バウンド（0.572s, 1.196s, 1.612s）
for tb, g in [(0.572, 1.0), (1.196, 0.68), (1.612, 0.42)]:
    put(sfx, thud(), LOGO + tb, 0.42 * g)
    put(sfx, piano(69 if g == 1 else 74, 0.35, 0.9), LOGO + tb, 0.55 * g)
put(sfx, whoosh(0.48, 800, 3800), LOGO + 2.60, 0.20)
for i, m in enumerate((74, 78, 81, 86, 93)):  # .work
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
