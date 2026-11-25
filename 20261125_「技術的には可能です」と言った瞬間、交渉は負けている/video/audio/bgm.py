"""この作品用の新規 BGM と効果音を合成する: python audio/bgm.py → audio/bgm.wav（固定の種。課金なし）
交渉の机の上の、乾いた緊張と前へ進む足取り。マリンバ風の短い音、輪郭のある低音、リムとウッド。120BPM。
前作までの合成部品（打楽器・低音・効果音）を使い、主旋律の音色（マリンバ風）、調、進行、刻み、編成、アクセントはこの作品用に組んだ。
着地: 01「渡す。」「やめた方が、いい。」、02「出さない。」、03 のホイップパンと「やる前提」、04 の束の崩れと「渡す。」「なぜなら、」、
05「理由を、先に。」、06「お金で、時間は買えない。」、07「無理です。」で音楽が止まる、08「納得してもらう。」。
エンドロゴの終わりまで覆い、最後の 1.5 秒で収める。
曲: D dorian / F major。
  A進行（婉曲・相手の札）: Dm9 – G13 – Bbmaj7 – A7sus4
  B進行（本人の言葉・結び）: Bbmaj7 – C6 – Dm9 – Fadd9
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
rng = np.random.default_rng(20261125)
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


# ---- 進行（D dorian / F major） ----
DM9 = (38, [60, 64, 65, 69])
G13 = (43, [59, 62, 64, 65])
BBM7 = (46, [58, 62, 65, 69])
A7S = (45, [57, 62, 64, 67])
C6 = (36, [60, 64, 67, 69])
FADD9 = (41, [60, 65, 67, 69])
A_SET = [DM9, G13, BBM7, A7S]
B_SET = [BBM7, C6, DM9, FADD9]

FLIP = vt('03', 'やる前提')
STOP = vt('07', '無理です')
# セクション編成: (開始秒, 打楽器 0-3, ベース 0-2, 旋律の密度 0-2, 和音刻み 0-1, 進行 A/B)
SEC = [
    (0.0, 1, 2, 1, 0, 'A'),
    (vt('01', '交渉'), 2, 1, 1, 0, 'A'),
    (vt('01', '「やめた'), 3, 1, 2, 1, 'A'),
    (at('02', 0.0), 2, 1, 1, 0, 'B'),
    (vt('02', '選ばれない'), 2, 2, 1, 0, 'A'),
    (vt('02', '判断を'), 3, 1, 2, 0, 'A'),
    (vt('02', 'だから'), 2, 1, 1, 0, 'B'),
    (vt('02', '出しません'), 3, 1, 2, 1, 'B'),
    (at('03', 0.0), 1, 2, 1, 0, 'A'),
    (vt('03', 'お金と時間'), 2, 2, 1, 0, 'A'),
    (FLIP - 2.0, 1, 2, 2, 0, 'A'),
    (FLIP, 3, 1, 2, 1, 'A'),
    (at('04', 0.0), 2, 1, 1, 0, 'B'),
    (vt('04', '出せません'), 3, 1, 2, 1, 'B'),
    (vt('04', 'すうひゃく'), 2, 2, 1, 0, 'A'),
    (vt('04', '引き受ける'), 3, 2, 2, 0, 'A'),
    (vt('04', '断るため'), 2, 1, 1, 0, 'B'),
    (vt('04', '渡して'), 3, 1, 2, 1, 'B'),
    (vt('04', 'だから'), 2, 1, 2, 0, 'B'),
    (vt('04', 'なぜなら'), 3, 1, 2, 1, 'B'),
    (at('05', 0.0), 2, 1, 1, 0, 'A'),
    (vt('05', '払うから'), 3, 2, 2, 0, 'A'),
    (vt('05', 'やるべきではないなら'), 1, 2, 1, 0, 'A'),
    (vt('05', '出しません'), 3, 1, 2, 1, 'A'),
    (vt('05', '先に'), 2, 1, 2, 1, 'B'),
    (vt('05', '個人的'), 1, 2, 1, 0, 'A'),
    (vt('05', 'そのうえで'), 2, 1, 2, 0, 'B'),
    (vt('05', 'それでも'), 3, 1, 2, 1, 'B'),
    (at('06', 0.0), 1, 1, 1, 0, 'A'),
    (vt('06', 'お金で何とか'), 3, 1, 2, 1, 'A'),
    (vt('06', 'でも'), 2, 2, 1, 0, 'B'),
    (vt('06', 'さんばい'), 2, 2, 2, 0, 'A'),
    (vt('06', '間に合わない'), 3, 2, 2, 0, 'A'),
    (vt('06', '人を足す'), 2, 2, 2, 0, 'A'),
    (vt('06', 'さらに遅れる'), 3, 1, 2, 1, 'A'),
    (vt('06', 'お金で解決'), 1, 1, 1, 0, 'B'),
    (vt('06', 'それも'), 2, 1, 2, 0, 'B'),
    (vt('06', 'できない段階'), 2, 1, 1, 0, 'B'),
    (vt('06', '一緒に'), 3, 1, 2, 1, 'B'),
    (at('07', 0.0), 2, 1, 1, 0, 'A'),
    (STOP - 0.05, 0, 0, 0, 0, 'A'),          # 「無理です。」で音楽が止まる
    (vt('07', '断るなら') - 0.2, 2, 1, 1, 0, 'B'),
    (vt('07', 'カードだけ'), 3, 1, 2, 1, 'B'),
    (vt('07', '出したカード'), 2, 2, 1, 0, 'A'),
    (vt('07', '必ず'), 3, 1, 2, 0, 'A'),
    (vt('07', '切ります'), 3, 1, 2, 1, 'A'),
    (at('08', 0.0), 1, 2, 1, 0, 'A'),
    (vt('08', '迷惑'), 3, 2, 2, 0, 'A'),
    (vt('08', 'できないことは') - 0.2, 1, 1, 1, 0, 'B'),
    (vt('08', '納得'), 3, 1, 2, 1, 'B'),
    (vt('08', '言いそうに'), 1, 1, 1, 0, 'B'),
    (vt('08', 'たぶん'), 2, 1, 2, 1, 'B'),
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
# 03: 2 秒の寄り（上がる音）→ 0.4 秒のホイップパン（大きく）→ 着地
put(sfx, glide(2.0, 50, 62), FLIP - 2.0, 1.0)
put(sfx, whoosh(0.62, 380, 6200), FLIP - 0.1, 0.46)
# 07: 止まる
put(sfx, thud(1.0), STOP + 0.3, 0.4)

# 決め語の着地（大）
BIG = [vt('01', '可能'), vt('01', '交渉') + 0.7, vt('01', '「やめた') + 0.1, vt('02', 'それが欲しい') + 0.75, vt('02', '判断を') + 0.1, vt('02', '出しません'),
       FLIP + 0.3, vt('04', '出せません'), vt('04', '引き受ける'), vt('04', '渡して') + 0.1, vt('04', 'なぜなら'),
       vt('05', '同じ'), vt('05', '出しません'), vt('05', '先に') + 0.1, vt('05', 'それでも') + 0.6,
       vt('06', 'でも') + 0.05, vt('06', '間に合わない'), vt('06', 'さらに遅れる'), vt('06', '一緒に'),
       STOP, vt('07', 'カードだけ'), vt('07', '必ず'), vt('07', '切ります'), vt('08', '迷惑'), vt('08', '納得')]
for t in BIG:
    put(sfx, impact(0.9), t, 0.40)
# 行・語・札の動き（小）
SMALL = [vt('01', 'と言った') - 0.1, vt('02', 'おとり'), vt('03', 'そう受け'), vt('03', 'やって'), FLIP + 0.75, vt('04', '今は'), vt('05', '払うから'), vt('05', 'で決まり'),
         vt('06', 'お金で何とか') + 0.45, vt('06', 'それも'), vt('06', '何が足りない'), vt('08', 'できなかった'), vt('08', 'たぶん')]
for t in SMALL:
    put(sfx, thud(0.85), t, 0.30)
# 札が滑る・裏返る（短い風）
for t in [vt('01', '交渉'), vt('01', '「やめた') + 1.0, vt('04', '選ぶ権利'), at('05', 0.45), vt('05', 'で決まり'), vt('05', '先に') + 0.4, vt('05', '先に') + 0.95, vt('07', '必ず'), vt('08', 'いちど') + 0.1, vt('08', 'たぶん') + 0.5]:
    put(sfx, whoosh(0.34, 700, 3600), t, 0.16, rng.uniform(-0.3, 0.3))
# 生成動画インサートの出入り（面の切り替え）
for t in [vt('01', 'たいてい') - 0.4, vt('05', '先に'), vt('05', 'そのうえで') - 0.2, vt('07', '出したカード') + 0.1, vt('07', '出したカード') + 6.9, at('08', 15.0)]:
    put(sfx, whoosh(0.42, 600, 4200), t, 0.2, rng.uniform(-0.25, 0.25))
# 02: 箱が棚に乗る、印が動く
for i, t in enumerate([at('02', 0.5), at('02', 0.65), at('02', 1.1), vt('02', '選ばれない') + 0.4]):
    put(sfx, wood(72 + i * 2), t, 0.5, -0.2 + i * 0.15)
for t, m in [(vt('02', 'それが欲しい') + 0.25, 74), (vt('02', '判断を') + 0.05, 77), (vt('02', 'なおさら'), 81)]:
    put(sfx, bell(m, 1.0), t + 0.5, 0.2, 0.2)
# 04: 束が積み上がり（刻みが詰まる）、崩れる。手元の束は 9 枚
K0 = vt('04', '出せません')
for i in range(26):
    k = i / 25
    put(sfx, wood(70 + int(k * 14)), at('04', 0.6) + (K0 - 0.3 - at('04', 0.6)) * (k ** 0.7), 0.20 + 0.2 * k, 0.3)
put(sfx, flutter(1.0), K0, 0.9, 0.25)
for i in range(9):
    put(sfx, wood(74 + i), vt('04', 'すうひゃく') + 0.1 + i * 0.07, 0.34, 0.3)
# 06: 柱が立つ、費用が伸びる、印、帯が止まる、届く
for i, ph in enumerate(['品質、', '納期、', '費用です']):
    put(sfx, marimba(62 + i * 3, 0.5), vt('06', ph), 0.8, 0.2 + i * 0.15)
put(sfx, glide(0.8, 55, 67), vt('06', 'お金で何とか'), 0.9, 0.3)
put(sfx, bell(74, 1.2), vt('06', 'いっかげつ'), 0.2, 0.3)
put(sfx, glide(1.6, 62, 60.5), vt('06', 'さんばい') + 0.5, 0.8)
put(sfx, glide(0.9, 62, 55), vt('06', 'さらに遅れる'), 0.9)
for i, m in enumerate((69, 74, 77)):
    put(sfx, bell(m, 1.6), vt('06', 'それも') + 0.5 + i * 0.04, 0.2, -0.2 + i * 0.2)
# 07: 引き受けられない札が机の外へ
for i in range(4):
    put(sfx, whoosh(0.3, 900, 3000), vt('07', '引き受けられる') + 0.15 + i * 0.14, 0.12, -0.4 + i * 0.25)
# 08: 周りの札が巻き込まれる、結びの和音
for i in range(9):
    put(sfx, wood(80 - i), vt('08', 'よほど') + 0.15 + i * 0.07, 0.3, 0.2 + 0.05 * i)
put(sfx, bell(77, 1.4), vt('08', 'たぶん') + 2.7, 0.2, 0.3)
for i, m in enumerate((58, 62, 65, 69, 74)):
    put(sfx, bell(m, 2.2), vt('08', '納得') + i * 0.035, 0.24, -0.4 + i * 0.2)

# ロゴへの横振りとエンドロゴ（5.5秒の終わりまで覆い、最後の1.5秒で収める）
put(sfx, whoosh(0.55, 500, 5800), LOGO - 0.48, 0.34)
for m in (41, 53, 60, 65, 67, 69, 72, 76):  # Fadd9 の余韻
    d = TOTAL - LOGO
    t = tt(d)
    x = np.sin(2 * np.pi * mtof(m) * t) + 0.22 * np.sin(4 * np.pi * mtof(m) * t)
    put(mus, x * np.exp(-t * 0.48) * env(d, 0.02, 1.5) * 0.068, LOGO, 1.0, (m % 5 - 2) * 0.18)

# o の着地バウンド（0.572s, 1.196s, 1.612s）
for tb, g in [(0.572, 1.0), (1.196, 0.68), (1.612, 0.42)]:
    put(sfx, thud(), LOGO + tb, 0.42 * g)
    put(sfx, marimba(65 if g == 1 else 72, 0.4, 0.9), LOGO + tb, 0.7 * g)
put(sfx, whoosh(0.48, 800, 3800), LOGO + 2.60, 0.20)
for i, m in enumerate((72, 77, 79, 84, 89)):  # .work
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
