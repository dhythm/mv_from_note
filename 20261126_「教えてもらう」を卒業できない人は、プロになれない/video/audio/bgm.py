"""この作品用の新規 BGM と効果音を合成する: python audio/bgm.py → audio/bgm.wav（固定の種。課金なし）
机の上で主語が自分へ移る、乾いた前への足取り。マリンバ風の短い音、輪郭のある低音、リムとウッド。120BPM。
合成部品（打楽器・低音・効果音）は前作までのものを使い、調、進行、編成、アクセントはこの作品用に組んだ。
03 の 2 秒の寄りで溜め（打楽器を抜き、上がる音）、「私が／学ぶ」に替わった瞬間に一段上げる。08 は結びへ向けて開く。
エンドロゴの終わりまで覆い、最後の 1.5 秒で収める。
曲: A minor / C major（乾いて明るく、前へ）。
  A進行（教えてもらう側・留保）: Am9 – D9 – Fmaj7 – E7sus4
  B進行（自分で学ぶ側・結び）: Fmaj7 – G6 – Am9 – Cadd9
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
rng = np.random.default_rng(20261126)
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


def marimba(m, d=0.42, bright=0.8):
    """マリンバ風の短い音（木の打音＋4 倍音の速い減衰）"""
    t = tt(d)
    f = mtof(m)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 7.5) + 0.34 * bright * np.sin(2 * np.pi * 4 * f * t) * np.exp(-t * 26) + 0.10 * bright * np.sin(2 * np.pi * 9.2 * f * t) * np.exp(-t * 60)
    knock = bp(rng.standard_normal(len(t)), 900, 3200) * np.exp(-t * 260) * 0.12
    return (x + knock) * env(d, 0.002, 0.05) * 0.30


def flutter(d=0.9):
    """紙の束が崩れて散る音"""
    n = int(d * SR)
    t = np.arange(n) / SR
    x = hp(rng.standard_normal(n), 1800) * (0.5 + 0.5 * np.sign(np.sin(2 * np.pi * (26 - 12 * t / d) * t))) * np.exp(-t * 3.2)
    return lp(x, 9000) * 0.30


def at(cut, t):
    return S[cut] + t


WORDS = json.loads((ROOT / 'audio' / 'voice' / 'words.json').read_text())
VOICE = {c['id']: c['voice'] for c in tl['cuts']}


def vt(cut, phrase):
    """声の語の時刻（全体の秒）。src/timeline.ts の vt と同じ引き方"""
    chars = WORDS[cut]['chars']
    i = ''.join(c[0] for c in chars).find(phrase)
    if i < 0:
        raise SystemExit(f'声に「{phrase}」が無い（{cut}）')
    return S[cut] + VOICE[cut] + chars[i][1]


# ---- 進行（A minor / C major） ----
AM9 = (45, [60, 64, 67, 71])
D9 = (38, [60, 64, 66, 69])
FM7 = (41, [60, 64, 65, 69])
E7S = (40, [59, 62, 64, 69])
G6 = (43, [59, 62, 64, 67])
CADD9 = (36, [60, 62, 64, 67])
A_SET = [AM9, D9, FM7, E7S]
B_SET = [FM7, G6, AM9, CADD9]

FLIP = vt('03', '私が') - 0.05
# セクション編成: (開始秒, 打楽器 0-3, ベース 0-2, 旋律の密度 0-2, 和音刻み 0-1, 進行 A/B)
SEC = [
    (0.0, 1, 2, 1, 0, 'A'),
    (vt('01', '能力の差'), 2, 1, 1, 0, 'A'),
    (vt('01', '実際は'), 2, 2, 1, 0, 'B'),
    (vt('01', '主体的'), 3, 1, 2, 1, 'B'),
    (at('02', 0.0), 2, 1, 1, 0, 'A'),
    (vt('02', '教えてもらうこと自体'), 1, 2, 1, 0, 'A'),
    (vt('02', '悪いわけ'), 2, 1, 1, 1, 'A'),
    (vt('02', '教えてくれる'), 1, 2, 1, 0, 'A'),
    (vt('02', 'その感謝'), 2, 1, 2, 0, 'A'),
    (vt('02', '自分にどう'), 2, 2, 1, 0, 'B'),
    (vt('02', '学ぶ'), 3, 1, 2, 1, 'B'),
    (at('03', 0.0), 2, 2, 1, 0, 'A'),
    (vt('03', '受動態'), 2, 1, 1, 0, 'A'),
    (vt('03', '先生が'), 2, 2, 2, 0, 'A'),
    (FLIP - 2.0, 0, 2, 1, 0, 'A'),       # 2 秒の寄り: 打楽器を抜いて溜める
    (FLIP, 3, 1, 2, 1, 'B'),             # 「私が／学ぶ」で一段上げる
    (at('04', 0.0), 1, 2, 1, 0, 'A'),
    (vt('04', '自分で調理'), 2, 1, 2, 0, 'A'),
    (vt('04', '全部'), 1, 2, 1, 0, 'A'),
    (vt('04', '使うのか'), 3, 1, 2, 0, 'B'),
    (vt('04', '自分で判断'), 3, 1, 2, 1, 'B'),
    (at('05', 0.0), 1, 1, 1, 0, 'A'),
    (vt('05', '初心者'), 2, 1, 1, 0, 'A'),
    (vt('05', 'いいです'), 2, 1, 2, 1, 'A'),
    (vt('05', 'ただ'), 1, 2, 1, 0, 'A'),
    (vt('05', '基礎'), 3, 2, 2, 0, 'A'),
    (vt('05', 'そこを'), 2, 2, 1, 0, 'A'),
    (vt('05', 'プロには'), 3, 1, 2, 1, 'A'),
    (vt('05', '詰まった'), 1, 1, 1, 0, 'B'),
    (vt('05', '一部分'), 2, 1, 2, 1, 'B'),
    (vt('05', 'この違い'), 2, 2, 1, 0, 'B'),
    (vt('05', 'かなり大きい'), 3, 1, 2, 1, 'B'),
    (at('06', 0.0), 1, 2, 1, 0, 'A'),
    (vt('06', '誰も'), 3, 2, 2, 0, 'A'),
    (vt('06', '自分で学'), 3, 1, 2, 1, 'B'),
    (vt('06', '学ぶだけ'), 1, 2, 1, 0, 'A'),
    (vt('06', 'アウトプット'), 3, 1, 2, 1, 'B'),
    (vt('06', '教えられて'), 1, 2, 1, 0, 'A'),
    (vt('06', 'お金は'), 2, 2, 2, 0, 'A'),
    (vt('06', '絶対'), 3, 1, 2, 1, 'A'),
    (at('07', 0.0), 2, 1, 1, 0, 'B'),
    (vt('07', '永遠'), 2, 1, 2, 0, 'B'),
    (vt('07', '完成している人など'), 1, 2, 1, 0, 'A'),
    (vt('07', 'いません'), 2, 2, 2, 0, 'A'),
    (vt('07', '完成していなくても'), 2, 1, 1, 0, 'B'),
    (vt('07', 'めし'), 3, 1, 2, 1, 'B'),
    (at('08', 0.0), 2, 2, 1, 0, 'B'),
    (vt('08', '絶対'), 3, 1, 2, 1, 'B'),
    (vt('08', '自分があゆみ'), 1, 2, 1, 0, 'A'),
    (vt('08', '学ぶ側'), 2, 1, 2, 0, 'B'),
    (vt('08', 'そこに'), 2, 2, 2, 0, 'B'),
    (vt('08', '「教えて'), 1, 2, 2, 0, 'B'),   # 結びの前に一度引く
    (vt('08', '景色'), 3, 1, 2, 1, 'B'),
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

    # 和音の刻み（決め語。ピアノを短く、裏拍に寄せる）
    if ky and ib in (0, 2):
        for off in ((0, 3 * Q) if ib == 0 else (Q, 3 * Q)):
            for i, m in enumerate(chord):
                put(mus, piano(m, 0.34, 0.9), t + off + i * 0.007, 0.50, (i - 1.5) * 0.30)

    # マリンバ風の旋律（8 分の刻みに 16 分の食い込み）
    if pl > 0:
        arp = chord + [chord[1] + 12, chord[3] + 12]
        steps = [0, 2] if pl == 1 else [0, 2, 3] if ib % 2 == 0 else [1, 2]
        for k, q in enumerate(steps):
            idx = (b * 3 + k * 2 + bar) % len(arp)
            m = arp[idx] + (12 if pl == 2 and (b + k) % 5 == 3 else 0)
            put(mus, marimba(m, 0.40, 0.7 + 0.2 * (pl - 1)), t + q * Q, 0.66 if pl == 1 else 0.74, 0.5 * np.sin(b * 0.9 + k * 1.3))

    # 輪郭のある低音（1: 食い込みのある動き / 2: 8 分の刻み）
    if bs == 1:
        pat = {0: [(0, root)], 1: [(3 * Q, root + 7)], 2: [(Q, root), (2 * Q, root + 12)], 3: [(2 * Q, root + 10)]}[ib]
        for off, m in pat:
            put(mus, bass(m, 0.22), t + off, 0.92)
    elif bs == 2:
        for off in (0, 2 * Q):
            put(mus, bass(root, 0.15), t + off, 0.66)

    # 乾いた打楽器
    if dl >= 2:
        hits = (0, 2) if dl == 2 else (0, 1, 2, 3)
        if ib in hits:
            put(drm, kick(0.76), t + (3 * Q if (dl == 3 and ib == 1) else 0), 0.62 if dl == 3 else 0.54)
            i = int(t * SR)
            n = int(0.16 * SR)
            if i + n < N:
                duck[i : i + n] = np.minimum(duck[i : i + n], 0.65 + 0.35 * np.linspace(0, 1, n) ** 1.5)
    if dl >= 1 and ib in (1, 3):
        put(drm, rim(), t, 0.56 if dl > 1 else 0.36, 0.16)
    if dl >= 2:
        put(drm, wood(76 if ib % 2 == 0 else 81), t + 2 * Q, 0.30, -0.32)
        if ib in (1, 3):
            put(drm, wood(83), t + 3 * Q, 0.24, 0.34)
    if dl == 3:
        put(drm, hat(), t + Q, 0.10, 0.38)
        put(drm, hat(ib == 3), t + 2 * Q, 0.13 if ib != 3 else 0.16, -0.28)
        put(drm, hat(), t + 3 * Q, 0.08, 0.2)
    elif dl >= 1:
        put(drm, hat(), t + 2 * Q, 0.13, 0.28)

# ---- 効果音（映像の出来事に同期） ----
# カットの切り替え（図の層の速い振り）
for c in ['02', '03', '04', '05', '06', '07', '08']:
    put(sfx, whoosh(0.5), at(c, -0.22), 0.26, rng.uniform(-0.25, 0.25))
# 03: 2 秒の寄り（上がる音）→ 組み替わる一撃
put(sfx, glide(2.0, 57, 69), FLIP - 2.0, 1.0)
put(sfx, whoosh(0.5, 500, 5200), FLIP - 0.05, 0.34)
for i, m in enumerate((57, 64, 69, 72, 76)):
    put(sfx, bell(m, 2.0), FLIP + 0.05 + i * 0.03, 0.22, -0.4 + i * 0.2)
put(sfx, pop_bubble(1.0), vt('03', '学ぶ') + 0.1, 0.5, 0.2)   # 述語の面が替わる
for ph, m in (('先生が', 69), ('私に', 72), ('教える', 76)):
    put(sfx, marimba(m, 0.4), vt('03', ph), 0.8, 0.0)

# 決め語の着地（大）
BIG = [vt('01', '見える'), vt('01', '主体的'), vt('01', '受動的'),
       vt('02', 'だけでは'), vt('02', '悪いわけ'), vt('02', '感謝'), vt('02', '学ぶ'), vt('02', '身につける'),
       at('03', 0.42), FLIP, vt('03', '私が') + 0.55,
       vt('04', '自分で調理') + 0.45, vt('04', '使うのか'), vt('04', '自分で判断'),
       vt('05', '悪いとは'), vt('05', 'いいです'), vt('05', '基礎'), vt('05', 'プロには'), vt('05', '一部分'),
       vt('06', '誰も') + 0.45, vt('06', '自分で学'), vt('06', 'アウトプット'), vt('06', '絶対'),
       vt('07', '学び続けています'), vt('07', 'いません'), vt('07', 'めし'),
       vt('08', '伸び'), vt('08', '回った'), vt('08', '景色')]
for t in BIG:
    put(sfx, impact(0.9), t, 0.40)
# 行・語・札の動き（小）
SMALL = [vt('01', '伸びる'), vt('01', 'とまる'), vt('01', '能力の差'), vt('01', '待つか'),
         vt('02', 'そこまで'), vt('02', 'できて'), vt('02', '自分にどう'), vt('02', 'に寄せた'),
         vt('03', '能動態'), vt('03', 'かなり'), vt('04', '全部'), vt('04', '使わない'),
         vt('05', '初心者'), vt('05', 'レベル'), vt('05', 'そこを'), vt('05', 'この違い'),
         vt('06', '学ぶだけ'), vt('06', 'できません'), vt('06', 'お金は'),
         vt('07', '永遠'), vt('07', '完成している人など'), vt('07', '学び続けている人'), vt('07', '仕事'),
         vt('08', '絶対'), vt('08', '自分があゆみ'), vt('08', '学ぶ側'), vt('08', '「教えて')]
for t in SMALL:
    put(sfx, thud(0.85), t, 0.28)
# 生成動画インサートの出入り（面の切り替え）
for t in [vt('01', '実際は') - 0.5, at('04', 0.1), vt('04', '使うのか') - 0.45, at('07', 0.1), vt('07', '完成している人など') - 0.45]:
    put(sfx, whoosh(0.42, 600, 4200), t, 0.2, rng.uniform(-0.25, 0.25))
# 01: 左の列が一枚ずつ前へ出る（上がる刻み）、右の列は低い一音で止まる
for i in range(4):
    put(sfx, wood(72 + i * 3), vt('01', '主体的') + 0.05 + i * 0.09, 0.5, -0.3)
put(sfx, thud(0.7), vt('01', '受動的') + 0.3, 0.3, 0.4)
# 02: 三枚の札が置かれる、色が付く
for i in range(3):
    put(sfx, wood(74 + i * 2), at('02', 0.6 + i * 0.1), 0.45, 0.2 + i * 0.15)
    put(sfx, marimba(69 + i * 4, 0.4), at('02', (S['03'] - S['02']) - 1.5 + i * 0.12), 0.7, 0.2 + i * 0.15)
# 04: 手前の三枚（速い）、奥の二枚（遅く、低い）
for i in range(3):
    put(sfx, wood(76 + i * 2), vt('04', '使うのか') + 0.1 + i * 0.1, 0.5, -0.4)
for i in range(2):
    put(sfx, wood(64 - i * 2), vt('04', '使わない') + 0.3 + i * 0.16, 0.4, 0.4)
# 05: 青の塊が伸びる、列が一節ずつ伸びる（上がる刻み）、橙の一節
put(sfx, glide(0.6, 52, 57), vt('05', 'レベル'), 0.8, -0.3)
G0 = max(vt('05', 'そこを') + 0.2, vt('05', 'プロには') - 1.1)
for i in range(6):
    put(sfx, marimba(60 + [0, 2, 4, 7, 9, 12][i], 0.4), G0 + i * 0.22, 0.75, 0.35)
put(sfx, bell(76, 1.4), vt('05', '一部分'), 0.24, 0.35)
# 06: 色の札が右の外へ滑る
for i in range(3):
    put(sfx, whoosh(0.4, 700 + i * 150, 3600), vt('06', '誰も') + i * 0.38, 0.2, 0.2 + i * 0.25)
# 07: 開いた輪が回り始める（終わらない音形）
for i, m in enumerate((67, 72, 74, 79)):
    put(sfx, bell(m, 1.2), vt('07', '完成している人など') + i * 0.11, 0.18, 0.3)
for i, m in enumerate((60, 64, 67, 72)):
    put(sfx, bell(m, 1.8), vt('07', 'めし') + i * 0.035, 0.22, -0.3 + i * 0.2)
# 08: 二枚が回り込む、景色が変わる（面の転換と開いた和音）
put(sfx, glide(1.7, 60, 67), vt('08', '学ぶ側') - 0.15, 0.7, 0.3)
put(sfx, pop_bubble(1.0), vt('08', 'そこに'), 0.45, 0.3)
put(sfx, whoosh(0.9, 300, 5200), vt('08', '変わり') - 0.1, 0.36)
for i, m in enumerate((48, 60, 64, 67, 72, 76, 79)):
    put(sfx, bell(m, 3.0), vt('08', '景色') + i * 0.04, 0.24, -0.5 + i * 0.16)
for i, m in enumerate((72, 76, 79, 84)):
    put(sfx, bell(m, 2.2), vt('08', '変わり') + 0.9 + i * 0.5, 0.14, 0.4 - i * 0.2)

# ロゴへの横振りとエンドロゴ（5.5秒の終わりまで覆い、最後の1.5秒で収める）
put(sfx, whoosh(0.55, 500, 5800), LOGO - 0.48, 0.34)
for m in (36, 48, 55, 60, 62, 64, 67, 72):  # Cadd9 の余韻
    d = TOTAL - LOGO
    t = tt(d)
    x = np.sin(2 * np.pi * mtof(m) * t) + 0.22 * np.sin(4 * np.pi * mtof(m) * t)
    put(mus, x * np.exp(-t * 0.48) * env(d, 0.02, 1.5) * 0.068, LOGO, 1.0, (m % 5 - 2) * 0.18)

# o の着地バウンド（0.572s, 1.196s, 1.612s）
for tb, g in [(0.572, 1.0), (1.196, 0.68), (1.612, 0.42)]:
    put(sfx, thud(), LOGO + tb, 0.42 * g)
    put(sfx, marimba(60 if g == 1 else 67, 0.4, 0.9), LOGO + tb, 0.7 * g)
put(sfx, whoosh(0.48, 800, 3800), LOGO + 2.60, 0.20)
for i, m in enumerate((72, 76, 79, 84, 88)):  # .work
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
