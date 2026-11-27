"""この作品用の新規 BGM と効果音を合成する: python audio/bgm.py → audio/bgm.wav（固定の種。課金なし）
机の上で予定が伸び、列が倒れる、乾いた前への足取り。マリンバ風の短い音、輪郭のある低音、リムとウッド。120BPM。
合成部品（打楽器・低音・効果音）は前作の部品を使い、調、進行、編成、アクセント、効果音の配置はこの作品用に組んだ。
03 は実際の棒が予想を超えるところで一段上げ、04 は列の倒れでさらに上げる。08 は結びへ向けて開く。
長い棒にファンファーレは付けない。エンドロゴの終わりまで覆い、ロゴの終了で収める。
曲: D minor / F major。
  A進行（背伸び・超過・払う側）: Dm9 – B♭maj7 – Gm9 – A7sus4
  B進行（見通し・着地）: B♭maj7 – C6 – Dm9 – Fadd9
"""
import json
import wave
from pathlib import Path

import numpy as np
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
rng = np.random.default_rng(20261127)
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




# ---- 進行（D minor / F major） ----
DM9 = (38, [57, 60, 64, 65])
BBM7 = (34, [58, 62, 65, 69])
GM9 = (43, [58, 62, 65, 69])
A7S = (45, [57, 62, 64, 67])
C6 = (36, [57, 60, 64, 67])
FADD9 = (41, [57, 60, 65, 67])
A_SET = [DM9, BBM7, GM9, A7S]
B_SET = [BBM7, C6, DM9, FADD9]

INS3 = vt('03', 'せんきゅう') - 0.35
INS4 = vt('04', '休日も') - 0.3
# セクション編成: (開始秒, 打楽器 0-3, ベース 0-2, 旋律の密度 0-2, 和音刻み 0-1, 進行 A/B)
SEC = [
    (0.0, 1, 2, 1, 0, 'A'),
    (vt('01', '見通し'), 2, 1, 2, 1, 'B'),
    (vt('01', '会社が'), 2, 2, 1, 0, 'A'),
    (vt('01', 'いちばん'), 3, 1, 2, 1, 'B'),
    (vt('01', 'リスクは起き'), 2, 1, 1, 0, 'B'),
    (at('02', 0.0), 2, 2, 1, 0, 'A'),
    (vt('02', 'マネジメント'), 3, 1, 2, 1, 'A'),
    (vt('02', 'うまくいっても'), 1, 2, 1, 0, 'A'),
    (vt('02', '淡々と'), 2, 1, 1, 0, 'B'),
    (at('03', 0.0), 1, 2, 1, 0, 'A'),
    (vt('03', 'けいかくさくご'), 2, 1, 2, 1, 'A'),
    (INS3, 1, 1, 1, 0, 'A'),
    (vt('03', '予想は'), 2, 2, 1, 0, 'A'),
    (vt('03', '実際は'), 2, 1, 2, 0, 'A'),
    (vt('03', 'ごじゅうご'), 3, 1, 2, 1, 'A'),   # 実際が予想を超える: 一段上げる
    (vt('03', '予想した日'), 1, 2, 1, 0, 'A'),
    (vt('03', 'さんわり'), 2, 1, 2, 1, 'B'),
    (at('04', 0.0), 2, 2, 1, 0, 'A'),
    (vt('04', 'ほぼ'), 2, 1, 2, 0, 'A'),
    (vt('04', '一つ遅れれば'), 3, 1, 2, 1, 'A'),   # 列が倒れる: さらに上げる
    (vt('04', 'だから最初に'), 2, 2, 1, 0, 'B'),
    (INS4, 1, 2, 1, 0, 'A'),
    (vt('04', '払うのは'), 3, 1, 2, 1, 'A'),
    (vt('04', '毎回'), 2, 1, 1, 0, 'A'),
    (at('05', 0.0), 1, 1, 1, 0, 'B'),
    (vt('05', '夢が'), 2, 1, 2, 0, 'B'),
    (vt('05', '着地'), 3, 1, 2, 1, 'B'),
    (vt('05', '夢を語る'), 1, 2, 1, 0, 'A'),
    (vt('05', '現実'), 2, 2, 2, 0, 'A'),
    (vt('05', '思っていた'), 3, 1, 2, 1, 'B'),
    (vt('05', '三つも'), 2, 2, 1, 0, 'A'),
    (vt('05', '次も'), 1, 2, 1, 0, 'A'),
    (at('06', 0.0), 2, 1, 1, 0, 'A'),
    (vt('06', 'でもピーエム'), 2, 2, 2, 0, 'A'),
    (vt('06', 'たんだ'), 3, 1, 2, 1, 'B'),
    (vt('06', 'さんかいの'), 1, 2, 1, 0, 'A'),
    (vt('06', '困る'), 2, 1, 1, 0, 'A'),
    (vt('06', '順番が'), 3, 1, 2, 1, 'B'),
    (at('07', 0.0), 2, 2, 1, 0, 'A'),
    (vt('07', '実際は'), 3, 1, 2, 1, 'A'),
    (vt('07', '全部受け'), 1, 2, 1, 0, 'B'),
    (vt('07', '見通しが'), 2, 2, 1, 0, 'A'),
    (vt('07', '嫌われる'), 3, 1, 2, 1, 'A'),
    (vt('07', '型に'), 1, 2, 1, 0, 'B'),
    (vt('07', 'やり切り'), 3, 1, 2, 1, 'B'),
    (at('08', 0.0), 1, 2, 1, 0, 'A'),
    (vt('08', 'ピーエムが'), 2, 1, 2, 0, 'B'),
    (vt('08', '見通しの方'), 3, 1, 2, 1, 'B'),
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
    if ky and ib in (0, 2):
        for off in ((0, 3 * Q) if ib == 0 else (Q, 3 * Q)):
            for i, m in enumerate(chord):
                put(mus, piano(m, 0.34, 0.9), t + off + i * 0.007, 0.50, (i - 1.5) * 0.30)
    if pl > 0:
        arp = chord + [chord[1] + 12, chord[3] + 12]
        steps = [0, 2] if pl == 1 else [0, 2, 3] if ib % 2 == 0 else [1, 2]
        for k, q in enumerate(steps):
            idx = (b * 3 + k * 2 + bar) % len(arp)
            m = arp[idx] + (12 if pl == 2 and (b + k) % 5 == 3 else 0)
            put(mus, marimba(m, 0.40, 0.7 + 0.2 * (pl - 1)), t + q * Q, 0.66 if pl == 1 else 0.74, 0.5 * np.sin(b * 0.9 + k * 1.3))
    if bs == 1:
        pat = {0: [(0, root)], 1: [(3 * Q, root + 7)], 2: [(Q, root), (2 * Q, root + 12)], 3: [(2 * Q, root + 10)]}[ib]
        for off, m in pat:
            put(mus, bass(m, 0.22), t + off, 0.92)
    elif bs == 2:
        for off in (0, 2 * Q):
            put(mus, bass(root, 0.15), t + off, 0.66)
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

# ---- 効果音（映像の出来事に同期。意味のない飾りの音は入れない） ----
for c in ['02', '03', '04', '05', '06', '07', '08']:
    put(sfx, whoosh(0.5), at(c, -0.22), 0.26, rng.uniform(-0.25, 0.25))
# 決め語の着地（大）
BIG = [vt('01', '頼もしく'), vt('01', '見通し'), vt('01', '経営者'), vt('01', 'いちばん'), vt('01', 'リスクは起き'),
       vt('02', 'マネジメント'), vt('02', '淡々と'),
       at('03', 0.4), vt('03', 'けいかくさくご'), INS3 + 0.3, vt('03', 'さんわり'),
       vt('04', 'バッファ'), vt('04', '負けが'), vt('04', '交渉') - 0.3, vt('04', '払うのは'), vt('04', 'いつか'),
       vt('05', '敵では') - 0.1, vt('05', '着地'), vt('05', '悪くない'), vt('05', '優秀'),
       vt('06', 'さんわりで'), vt('06', 'きゅうかいか'), vt('06', '困る'), vt('06', '順番が'),
       vt('07', '実際は'), vt('07', '丸く'), vt('07', '嫌われる'), vt('07', 'やり切り'),
       vt('08', '誰のリスク'), vt('08', '見通しの方')]
for t in BIG:
    put(sfx, impact(0.9), t, 0.38)
SMALL = [vt('01', '会社が'), vt('01', 'リスクを取らず'), vt('01', '大きさは'),
         vt('02', 'うまくいっても'), vt('02', 'メンバー'), vt('02', 'コントロール'),
         vt('03', '私も'), vt('03', '次も'), vt('03', '卒業論文'), vt('03', 'さんじゅうななにん'), vt('03', '予想した日'),
         vt('04', 'パツパツ'), vt('04', '現場が埋める'), vt('04', '無理な'),
         vt('05', 'できることと'), vt('05', 'できないこと'), vt('05', '売上'), vt('05', '現実'), vt('05', '次も'),
         vt('06', 'たんだ'), vt('06', 'ななかい'), vt('06', '逆なんです') + 0.2,
         vt('07', 'けれど'), vt('07', '言いにくい'), vt('07', '報酬'), vt('07', '型に'), vt('07', '合わない'),
         vt('08', '誰に背負'), vt('08', '頑張りでは')]
for t in SMALL:
    put(sfx, thud(0.85), t, 0.26)
# インサートの出入り
for t in [INS3, vt('03', 'の予想は') + 0.05, INS4, vt('04', '毎回') - 0.4]:
    put(sfx, whoosh(0.42, 600, 4200), t, 0.2, rng.uniform(-0.25, 0.25))
# 01: 二本が立つ、賭けの柱が伸びる、着地の柱が下がる
put(sfx, wood(74), at('01', 0.6), 0.45, 0.2)
put(sfx, wood(74), at('01', 0.7), 0.45, 0.4)
put(sfx, glide(0.9, 50, 62), vt('01', '経営者'), 0.9, 0.2)
put(sfx, glide(0.6, 62, 55), vt('01', '着地') - 0.1, 0.6, 0.4)
# 02: 背伸びで伸びる、マネジメントで戻る、メンバーが支える
put(sfx, glide(0.9, 48, 66), vt('02', '背伸び') - 0.15, 1.0, 0.3)
put(sfx, glide(0.7, 66, 53), vt('02', 'マネジメント'), 0.8, 0.3)
for i in range(3):
    put(sfx, wood(70 + i * 3), vt('02', 'うまくいっても') + 0.2 + i * 0.08, 0.45, 0.3)
# 03: 予想の棒が止まる、実際の棒は伸び続けて止まる（勝ちの音にはしない）
put(sfx, glide(1.6, 50, 57), vt('03', '予想は') + 0.1, 0.55, -0.1)
put(sfx, wood(69), vt('03', 'さんじゅうさんてん') + 1.1, 0.6, -0.1)
put(sfx, glide(2.6, 50, 62), vt('03', '実際は') + 0.15, 0.6, 0.2)
put(sfx, thud(0.9), vt('03', 'ごじゅうご') + 1.25, 0.4, 0.2)
# 04: 隙間のない列が順に倒れる（当たるたびに一つ）、バッファの列は一つ傾いて止まる
one = vt('04', '一つ遅れれば')
for i in range(9):
    put(sfx, wood(80 - i, 1.0), one + 0.12 + i * 0.19 + 0.34, 0.5, -0.1 + i * 0.05)
put(sfx, thud(0.6), one + 0.12 + 8 * 0.19 + 0.42, 0.35, 0.3)
put(sfx, wood(64), one + 0.55, 0.4, -0.3)
# 05: 夢が奥から出る、青に変わる一つ、積み上げ
put(sfx, whoosh(0.6, 300, 2600), vt('05', '夢が') - 0.2, 0.3, 0.3)
for i, m in enumerate((65, 69, 72)):
    put(sfx, bell(m, 1.6), vt('05', '思っていた') + 0.1 + i * 0.03, 0.2, 0.2)
for i in range(3):
    put(sfx, wood(72 + i * 2), vt('05', '三つも') + i * 0.14 + 0.1, 0.45, 0.4)
put(sfx, wood(79), vt('05', '四つも') + 0.1, 0.45, 0.4)
# 06: 列の組み替え、あとで一本だけ持ち上がる
for ph in ('さんわりで', 'きゅうかいか', 'さんかいの', '順番が'):
    for i in range(4):
        put(sfx, marimba(62 + i * 3, 0.3), vt('06', ph) + i * 0.06, 0.5, -0.4 + i * 0.25)
put(sfx, glide(0.55, 57, 69), vt('06', '順番が') + 1.5, 0.7, 0.5)
# 07: 帯が割れる、丸く戻る
put(sfx, whoosh(0.4, 700, 3600), vt('07', '実際は') - 0.05, 0.22, 0.2)
put(sfx, whoosh(0.4, 3600, 700), vt('07', '全部受け') + 0.2, 0.2, 0.2)
put(sfx, whoosh(0.4, 700, 3600), vt('07', '見通しが') + 0.3, 0.22, 0.2)
# 08: 結び。低い一つの青へ着地
for i, m in enumerate((57, 62, 65, 69, 72)):
    put(sfx, bell(m, 2.4), vt('08', '見通しの方') + 0.05 + i * 0.03, 0.2, -0.4 + i * 0.2)
put(sfx, whoosh(0.5, 500, 5200), LOGO - 0.45, 0.3, 0.3)
# エンドロゴ: o の着地とバウンド、.work の一文字ずつ、完成の和音（ロゴの終わりまで覆う）
for dt, g in ((0.55, 0.8), (1.25, 0.5), (1.85, 0.3)):
    put(sfx, wood(74, 1.0), LOGO + dt, g, 0.0)
for i in range(5):
    put(sfx, marimba(69 + [0, 3, 5, 7, 10][i], 0.4), LOGO + 3.0 + i * 0.2, 0.55, -0.3 + i * 0.15)
for i, m in enumerate((53, 57, 60, 65, 69)):
    put(mus, bell(m, 2.0), LOGO + 4.0 + i * 0.02, 0.24, -0.3 + i * 0.15)
put(mus, bass(41, 1.4), LOGO + 4.0, 0.7)


def reverb(x, d=1.05, wet=0.15):
    n = int(d * SR)
    ir = rng.standard_normal((n, 2)) * np.exp(-np.arange(n) / SR * 5.8)[:, None]
    ir = np.stack([hp(lp(ir[:, 0], 5800), 300), hp(lp(ir[:, 1], 5800), 300)], axis=1) * 0.05
    w = np.stack([fftconvolve(x[:, 0], ir[:, 0])[: len(x)], fftconvolve(x[:, 1], ir[:, 1])[: len(x)]], axis=1)
    return x + w * wet


mix = reverb(mus * duck[:, None]) * 0.95 + drm * 0.78 + reverb(sfx, 0.85) * 0.88
mix = mix[: int(TOTAL * SR)]
fo_long = int(1.2 * SR)
mix[-fo_long:] *= np.linspace(1, 0.08, fo_long)[:, None] ** 1.4
fo_end = int(0.35 * SR)
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
