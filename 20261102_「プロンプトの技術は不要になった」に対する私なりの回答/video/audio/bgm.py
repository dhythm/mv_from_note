"""BGM と効果音をローカルで合成する（追加課金なし・固定シード）。エンドロゴの保持終了まで覆う。

音楽ブリーフ（../plan.html「音」）:
  低音のしっかりしたミニマルな電子音、116 BPM 前後。04 の Crane down と 09 の地盤で低音が最も深く、
  03 の「潜っただけ」の前に一拍だけ抜く（着水に低い水音）。08 の留保で一段下げるが勢いは切らない。
  06 の縦組みの区間はハーフタイム。10 で音を揃えて結論、エンドロゴの終わりまで覆って収める。
  前作（20261031 の D 長調ポップ）は流用しない。F マイナーのミニマルな 4 つ打ち（Fm–D♭–A♭–E♭）で新しく書いた。
拍の格子は 0 秒起点の 120BPM（1 拍 0.5 秒）。カットの境目（src/timeline.json）は 1 秒単位なので拍の上にある。
効果音の秒は「カットの頭からの秒」で、場面ファイル（src/scenes*.tsx）の秒と同じ。

  .venv/bin/python audio/bgm.py   → audio/bgm.wav, public/bgm.m4a
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
BPM = 120
BEAT = 60 / BPM
BAR = BEAT * 4
S16 = BEAT / 4
N = int(SR * DUR)
rng = np.random.default_rng(20261102)

L = np.zeros(N)
R = np.zeros(N)
REV = np.zeros((2, N))
MUS = np.zeros((2, N))  # 音楽（抜き・下げの包絡を掛ける）
CHORD_BUS = np.zeros((2, N))


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def tt(d):
    return np.arange(int(d * SR)) / SR


def place(sig, t, gain=1.0, pan=0.0, rev=0.0, bus=None):
    i = int(round(t * SR))
    if i >= N or i + len(sig) <= 0:
        return
    s = sig
    if i < 0:
        s = s[-i:]
        i = 0
    s = s[: N - i]
    gl = gain * np.cos((pan + 1) * np.pi / 4)
    gr = gain * np.sin((pan + 1) * np.pi / 4)
    if bus is None:
        L[i:i + len(s)] += s * gl
        R[i:i + len(s)] += s * gr
    else:
        bus[0, i:i + len(s)] += s * gl
        bus[1, i:i + len(s)] += s * gr
    if rev:
        REV[0, i:i + len(s)] += s * gl * rev
        REV[1, i:i + len(s)] += s * gr * rev


def lp(x, f, order=2):
    return sosfilt(butter(order, f, 'low', fs=SR, output='sos'), x)


def hp(x, f, order=2):
    return sosfilt(butter(order, f, 'high', fs=SR, output='sos'), x)


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)


# ---------- 音色 ----------
def kick(big=1.0):
    t = tt(0.42)
    f = 46 + 95 * np.exp(-t * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return (np.sin(ph) * np.exp(-t * 7.5) + 0.25 * np.exp(-t * 300) * rng.standard_normal(len(t)) * 0.3) * big


def clap():
    t = tt(0.3)
    n = rng.standard_normal(len(t))
    env = np.exp(-t * 22) + 0.6 * np.exp(-np.maximum(0, t - 0.012) * 30) * (t > 0.012) + 0.4 * np.exp(-np.maximum(0, t - 0.024) * 26) * (t > 0.024)
    return bp(n, 900, 5200) * env * 0.9 + 0.25 * np.sin(2 * np.pi * 190 * t) * np.exp(-t * 30)


def hat(open_=False):
    d = 0.22 if open_ else 0.05
    t = tt(d)
    n = hp(rng.standard_normal(len(t)), 7000)
    return n * np.exp(-t * (14 if open_ else 80))


def shaker():
    t = tt(0.09)
    n = bp(rng.standard_normal(len(t)), 4000, 11000)
    return n * np.sin(np.pi * t / 0.09) ** 2


def conga(n):
    t = tt(0.25)
    f = midi(n) * (1 + 0.25 * np.exp(-t * 40))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 14)


def bass(n, d, bright=1.0):
    t = tt(d)
    f = midi(n)
    saw = 2 * ((t * f) % 1) - 1
    sq = np.sign(np.sin(2 * np.pi * f * t))
    x = 0.6 * saw + 0.4 * sq
    # 弾む感じ: 頭の短いフィルターの開き（簡易: 2 本の低域通過を混ぜる）
    x = 0.7 * lp(x, 300 + 900 * bright) * (0.4 + 0.6 * np.exp(-t * 9)) + 0.35 * np.sin(2 * np.pi * f * t)
    env = np.minimum(1, t / 0.004) * np.exp(-t * 2.2) * np.clip((d - t) / 0.02, 0, 1)
    return x * env


def ep(notes, d):
    """エレピ風の和音（FM の軽い鐘っぽさ＋トレモロ）"""
    t = tt(d)
    out = np.zeros(len(t))
    for n in notes:
        f = midi(n)
        mod = np.sin(2 * np.pi * f * 2 * t) * 1.4 * np.exp(-t * 6)
        out += np.sin(2 * np.pi * f * t + mod) * (1 + 0.003 * np.sin(2 * np.pi * 5 * t))
    env = np.minimum(1, t / 0.006) * np.exp(-t * 3.2) * np.clip((d - t) / 0.03, 0, 1)
    return out * env / len(notes) * (1 + 0.15 * np.sin(2 * np.pi * 5.5 * t))


def pluck(n, d=0.35, bright=0.5):
    """カルプラス＝ストロングのギター風プラック"""
    f = midi(n)
    p = int(SR / f)
    buf = rng.uniform(-1, 1, p)
    out = np.zeros(int(d * SR))
    k = 0.5 + 0.49 * bright
    for i in range(len(out)):
        j = i % p
        out[i] = buf[j]
        buf[j] = k * buf[j] + (1 - k) * buf[(j + 1) % p] if j + 1 < p else k * buf[j] + (1 - k) * buf[0]
        buf[j] *= 0.996
    t = tt(d)[: len(out)]
    return hp(out, 180) * np.clip((d - t) / 0.02, 0, 1)


def lead(n, d):
    t = tt(d)
    f = midi(n) * (1 + 0.004 * np.sin(2 * np.pi * 5.8 * t) * np.minimum(1, t / 0.2))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = 0.55 * np.sign(np.sin(ph)) * 0.5 + 0.5 * np.sin(ph) + 0.2 * np.sin(2 * ph)
    env = np.minimum(1, t / 0.01) * (0.65 + 0.35 * np.exp(-t * 6)) * np.clip((d - t) / 0.05, 0, 1)
    return lp(x, 3200) * env


def swoosh(d=0.5, up=True):
    t = tt(d)
    n = rng.standard_normal(len(t))
    k = t / d
    out = np.zeros(len(t))
    # 中心周波数を動かした帯域通過を区間ごとに重ねる
    seg = 12
    for s in range(seg):
        a = int(len(t) * s / seg)
        b = int(len(t) * (s + 1) / seg)
        fc = 600 + 5000 * ((s + 0.5) / seg if up else 1 - (s + 0.5) / seg)
        out[a:b] = bp(n, fc * 0.6, min(fc * 1.6, 20000))[a:b]
    return out * np.sin(np.pi * k) ** 1.5


def tick(f=1800):
    t = tt(0.12)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 45) + 0.4 * hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 120)


def thud():
    t = tt(0.6)
    f = 70 + 60 * np.exp(-t * 18)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6)


def boom():
    t = tt(1.6)
    f = 42 + 50 * np.exp(-t * 6)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.4) + 0.25 * lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 5)


def riser(d):
    t = tt(d)
    k = t / d
    n = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    seg = 16
    for s in range(seg):
        a = int(len(t) * s / seg)
        b = int(len(t) * (s + 1) / seg)
        fc = 400 + 7000 * ((s + 0.5) / seg) ** 2
        out[a:b] = bp(n, fc * 0.7, min(fc * 1.4, 20000))[a:b]
    return out * k ** 2


def tom(n):
    t = tt(0.3)
    f = midi(n) * (1 + 0.5 * np.exp(-t * 25))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)


def pad(notes, d):
    """柔らかい持続の和音"""
    t = tt(d)
    out = np.zeros(len(t))
    for n in notes:
        f = midi(n)
        out += np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2.001 * t) + 0.12 * np.sin(2 * np.pi * f * 3 * t)
    env = np.minimum(1, t / 0.25) * np.clip((d - t) / 0.3, 0, 1)
    return lp(out, 2600) * env / len(notes)




def sub(n, d):
    """太い持続の低音（サイン＋少しの倍音）。08 の留保・09 の地盤で使う"""
    t = tt(d)
    f = midi(n)
    x = np.sin(2 * np.pi * f * t) + 0.25 * np.tanh(3 * np.sin(2 * np.pi * f * t))
    return x * np.minimum(1, t / 0.02) * np.clip((d - t) / 0.08, 0, 1)


def arp(n, d=0.2):
    """短い減衰の鋸歯の粒（ミニマルな刻み）"""
    t = tt(d)
    f = midi(n)
    saw = 2 * ((t * f) % 1) - 1
    return lp(saw, 2400) * np.exp(-t * 18) * np.minimum(1, t / 0.003)


def snare():
    t = tt(0.35)
    n = rng.standard_normal(len(t))
    return bp(n, 1500, 8000) * np.exp(-t * 16) * 0.8 + 0.5 * np.sin(2 * np.pi * 185 * t) * np.exp(-t * 25)


def plop():
    """着水の低い水音（とぷん）: 下がる正弦と短い泡"""
    t = tt(0.9)
    f = 140 + 520 * np.exp(-t * 26)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 7)
    bub = np.zeros(len(t))
    for k in range(5):
        st = 0.08 + 0.07 * k + rng.uniform(0, 0.03)
        tb = np.clip(t - st, 0, None)
        fb = rng.uniform(700, 1300) * (1 + 0.8 * tb * 6)
        bub += np.sin(2 * np.pi * np.cumsum(fb) / SR) * np.exp(-tb * 40) * (t > st) * 0.25 * (1 - k / 6)
    return body + bub


def sweep_down(d):
    """Crane down を支える低音のスイープ（高い帯域から下がる雑音＋下がる低音）"""
    t = tt(d)
    k = t / d
    n = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    seg = 16
    for s_ in range(seg):
        a = int(len(t) * s_ / seg)
        b = int(len(t) * (s_ + 1) / seg)
        fc = 5000 * (1 - (s_ + 0.5) / seg) ** 2 + 150
        out[a:b] = bp(n, fc * 0.7, min(fc * 1.4, 20000))[a:b]
    f = 90 - 50 * k
    low = np.sin(2 * np.pi * np.cumsum(f) / SR)
    return (0.5 * out + 0.9 * low * k) * np.sin(np.pi * np.clip(k * 1.1, 0, 1)) ** 0.7


# ---------- 和声: F マイナー Fm–D♭–A♭–E♭（ミニマルに繰り返す） ----------
PROG = [(41, [65, 68, 72]), (37, [65, 68, 73]), (44, [63, 68, 72]), (39, [63, 67, 70])]
OPEN = [(37, [65, 68, 73, 77]), (39, [63, 67, 70, 75]), (41, [65, 68, 72, 77]), (41, [65, 68, 72, 79])]
ARP = [0, 2, 1, 2, 0, 1, 2, 1]


def cfg_at(t):
    """その時刻の編成（区間は src/timeline.json のカットの頭からの秒で決める）"""
    c = dict(kick=1, hat=0.8, clap=0.8, bass=1, arp=0.7, pad=0.5, prog=PROG)
    if t < S['02']:
        c.update(clap=0.5, arp=0.5)
    elif t < S['03']:
        c.update(hat=0.5, arp=0.4, clap=0.6)  # 留保: 少し軽く
    elif t < S['04']:
        c.update(arp=0.8)
    elif t < S['05']:
        c.update(arp=0.9, pad=0.7, ohat=0.7)
    elif t < S['06']:
        c.update(ohat=0.8, arp=0.8)
    elif t < S['06'] + 7.3:
        c.update(half=1, arp=0.5, pad=0.8)  # 縦組み: ハーフタイム
    elif t < S['07']:
        c.update(ohat=0.8)
    elif t < S['08']:
        c.update(ohat=1, hat16=1, arp=1, pad=0.6)  # 比較: いちばん詰まる
    elif t < S['08'] + 3.4:
        c.update(kick=0, clap=0, hat=0.5, bass=0, sub=1, arp=0.5, pad=0.9)  # 留保: 一段下げる（刻みは残す）
    elif t < S['09']:
        c.update(ohat=0.7, arp=0.8)
    elif t < S['10']:
        c.update(ohat=0.6, arp=0.8, sub=0.8 if t > S['09'] + 8.7 else 0)
    elif t < LOGO:
        c.update(ohat=1, hat16=0.6, arp=1, pad=1, lead=1 if t > S['10'] + 4.3 else 0, prog=OPEN)
    else:
        c = dict(pad=0.9, arp=0.5, prog=OPEN, end=1)
    return c


LEAD = [(0, 77, 4), (4, 80, 2), (6, 79, 2), (8, 77, 6), (16, 75, 4), (20, 77, 4), (24, 72, 8)]
nbars = int(np.ceil(DUR / BAR))
for bar in range(nbars):
    t0 = bar * BAR
    for step in range(16):
        x = t0 + step * S16
        if x >= DUR:
            break
        cfg = cfg_at(x + 1e-6)
        root, chord = cfg['prog'][bar % 4]
        q = step % 4
        half = cfg.get('half')
        if cfg.get('kick') and q == 0 and (not half or step in (0, 10)):
            place(kick(), x, 0.95 * cfg['kick'], bus=MUS)
        if half and step == 10:
            place(kick(), x, 0.5, bus=MUS)
        if cfg.get('clap') and (step == 8 if half else step in (4, 12)):
            place(clap(), x, cfg['clap'] * 0.28, pan=0.05, rev=0.15, bus=MUS)
        if cfg.get('hat'):
            place(hat(), x, [0.35, 0.12, 0.3, 0.12][q] * 0.15 * cfg['hat'], pan=0.25 - 0.1 * (step % 2), bus=MUS)
        if cfg.get('hat16') and q in (1, 3):
            place(hat(), x, 0.03 * cfg['hat16'], pan=-0.3, bus=MUS)
        if cfg.get('ohat') and q == 2:
            place(hat(True), x, 0.06 * cfg['ohat'], pan=-0.2, rev=0.05, bus=MUS)
        if cfg.get('bass') and step % 2 == 0 and not (half and step % 4 == 2):
            # 8 分の脈打つ低音（拍の頭は太く）
            place(bass(root - 12 + (12 if step in (6, 14) else 0), S16 * 1.6, 0.6), x, (0.6 if q == 0 else 0.42) * cfg['bass'], bus=MUS)
        if cfg.get('sub') and step == 0:
            place(sub(root - 12, BAR * 0.98), x, 0.5 * cfg['sub'], bus=MUS)
        if cfg.get('arp') and step % 2 == 1:
            n = chord[ARP[(step // 2) % 8] % len(chord)] + (12 if step in (7, 15) else 0)
            place(arp(n), x, 0.16 * cfg['arp'], pan=0.35 * (1 if step % 4 == 1 else -1), rev=0.25, bus=MUS)
        if cfg.get('pad') and step == 0:
            place(pad(chord, BAR * 1.02), x, 0.2 * cfg['pad'], pan=0.1, rev=0.35, bus=CHORD_BUS)
    cfg = cfg_at(t0 + 1e-6)
    if cfg.get('lead'):
        for (pos, n, ln) in LEAD:
            if pos // 16 == bar % 2:
                place(lead(n, ln * S16 * 0.9), t0 + (pos % 16) * S16, 0.1, pan=-0.1, rev=0.35, bus=MUS)

# キックに合わせた和音のポンプ
pump = np.ones(N)
for k in np.arange(0, LOGO, BEAT):
    i = int(k * SR)
    j = min(N, i + int(0.35 * SR))
    tk = np.arange(j - i) / SR
    pump[i:j] = np.minimum(pump[i:j], 1 - 0.45 * np.exp(-tk * 12))
MUS += CHORD_BUS * pump

# ---------- 音楽の包絡: 03 の着水前に一拍だけ抜く。02 の波形の区間は中域を少し下げる代わりに全体を下げる ----------
env = np.ones(N)
def ramp_gain(a, b, g, fade=0.04):
    i, j = int(a * SR), int(b * SR)
    f = int(fade * SR)
    env[i:j] = np.minimum(env[i:j], g)
    env[max(0, i - f):i] = np.minimum(env[max(0, i - f):i], np.linspace(1, g, i - max(0, i - f)))
    env[j:j + f] = np.minimum(env[j:j + f], np.linspace(g, 1, len(env[j:j + f])))

SPLASH = S['03'] + 10.8
ramp_gain(SPLASH - 0.45, SPLASH, 0.0, 0.05)
ramp_gain(S['02'] + 6.3, S['02'] + 9.6, 0.72, 0.3)
L += MUS[0] * env
R += MUS[1] * env

# ---------- 効果音（秒はカットの頭から。場面ファイルの秒と同じ） ----------
def at(cut, sec):
    return S[cut] + sec

for c in TL['cuts']:
    b = S[c['id']] + c['dur']
    if c['tr'] in ('whip', 'up'):
        place(swoosh(0.5, True), b - 0.5, 0.22, rev=0.1)
    elif c['tr'] == 'left':
        place(swoosh(0.5, False), b - 0.5, 0.2, pan=0.3, rev=0.1)
# 01: 「もう要らない。」の頭（Dolly out）と前置き
place(boom(), 0.0, 0.35)
place(swoosh(0.9, False), 0.0, 0.14, rev=0.2)
place(tick(1500), at('01', 1.5), 0.08)
# 02: 札の入り・縮み・取り消し線、「音声入力で」の滑り込み
place(swoosh(0.5, False), at('02', 0.9), 0.12, pan=0.5)
place(swoosh(1.2, False), at('02', 3.9), 0.1, pan=0.4, rev=0.2)
place(tick(1100), at('02', 5.6), 0.12, pan=0.5)
place(swoosh(0.5, True), at('02', 6.2), 0.14, pan=-0.5)
place(thud(), at('02', 6.7), 0.25)
# 03: 「消えたんじゃない。」、左右の叩き込みと ≠、抜き → 着水（とぷん）→ 沈む → Crane down
place(thud(), at('03', 0.75), 0.35)
place(thud(), at('03', 4.75), 0.25, pan=-0.5)
place(tick(1300), at('03', 5.45), 0.12)
place(thud(), at('03', 6.65), 0.25, pan=0.5)
place(swoosh(0.4, False), at('03', 9.9), 0.14)
place(plop(), SPLASH, 0.6, rev=0.25)
place(boom(), SPLASH + 0.02, 0.45)
place(sweep_down(1.6), at('03', 12.7), 0.22)
# 04: Crane down の低音スイープ → 着地のスネア、ラベル、読んだ層、矢印
place(sweep_down(2.5), at('04', 1.8), 0.36)
place(snare(), at('04', 4.3), 0.3, rev=0.2)
place(boom(), at('04', 4.3), 0.3)
for i in range(4):
    place(tick(900 + 140 * i), at('04', 3.9 + 0.35 * i), 0.07, pan=-0.3)
place(swoosh(0.9, True), at('04', 9.9), 0.14, pan=0.5, rev=0.2)
# 05: 層が差し込まれる 3 回、「圧倒的に良い。」、Roll
for x in (5.5, 6.9, 7.8):
    place(thud(), at('05', x), 0.22)
    place(hat(True), at('05', x), 0.12, pan=0.3)
place(boom(), at('05', 9.6), 0.42)
place(snare(), at('05', 9.6), 0.18)
place(swoosh(0.9, False), at('05', 12.1), 0.18, rev=0.25)
# 06: 柱の立ち上がり、畳まれる、AI の円、「表は一言で済む。」
place(thud(), at('06', 1.0), 0.2)
place(swoosh(1.0, False), at('06', 7.3), 0.14, rev=0.2)
place(tick(1600), at('06', 8.9), 0.14)
place(thud(), at('06', 11.1), 0.3)
# 07: 円柱が立つ、層が 3 回積み上がる（拍の頭）、「明確な差。」で一番大きく
place(thud(), at('07', 1.2), 0.25)
for i, x in enumerate((6.4, 7.2, 8.0)):
    place(thud(), at('07', x), 0.3 + 0.05 * i)
    place(snare(), at('07', x), 0.08 + 0.03 * i, rev=0.1)
place(riser(1.2), at('07', 13.6) - 1.2, 0.2)
place(boom(), at('07', 13.6), 0.55)
place(snare(), at('07', 13.6), 0.3, rev=0.3)
# 08: 帯が降りる、円柱が伸びる（右が線を越える）、Crane up
place(swoosh(0.8, False), at('08', 3.4), 0.14)
place(thud(), at('08', 4.2), 0.25)
place(tick(1800), at('08', 5.9), 0.12, pan=0.5)
place(riser(2.0), at('08', 10.6), 0.18)
# 09: 入力、2 語の叩き込み・×、組み変わり、地盤へ（最も深く）
place(thud(), at('09', 4.4), 0.32, pan=-0.4)
place(tick(1300), at('09', 5.3), 0.12)
place(thud(), at('09', 7.0), 0.32, pan=0.4)
place(sweep_down(1.9), at('09', 8.7), 0.36)
place(boom(), at('09', 10.6), 0.55)
place(sub(29, 2.5), at('09', 10.6), 0.4)
# 10: Crane up、表層に出る、結論の 1 行で全部揃う
place(riser(2.4), at('10', 0.0), 0.2)
place(tick(1500), at('10', 2.4), 0.12)
place(boom(), at('10', 4.3), 0.45)
place(snare(), at('10', 4.3), 0.22, rev=0.3)
# エンドロゴ: o の着地、スライド、.work
for i, p in enumerate((0.22, 0.46, 0.62)):
    place(tick(900 - 150 * i), LOGO + p * 2.6, 0.2 * (1 - 0.25 * i), rev=0.2)
place(swoosh(0.6, False), LOGO + 2.6, 0.15)
for i in range(5):
    place(tick(2000 + 180 * i), LOGO + 3.0 + 0.08 * i, 0.06, pan=-0.4 + 0.2 * i)
place(boom(), LOGO, 0.3)

# ---------- 仕上げ ----------
ir_t = tt(1.6)
ir = rng.standard_normal((2, len(ir_t))) * np.exp(-ir_t * 4.0)
ir = np.array([lp(x, 5000) for x in ir])
L += fftconvolve(REV[0], ir[0])[:N] * 0.12
R += fftconvolve(REV[1], ir[1])[:N] * 0.12
mix = np.stack([L, R], axis=1)
tail = np.clip((DUR - np.arange(N) / SR) / 1.0, 0, 1)
mix *= tail[:, None] ** 1.5
mix = np.tanh(mix * 1.1) / 1.1

mix /= np.abs(mix).max() + 1e-9
mix *= 10 ** (-1 / 20)
wav = ROOT / 'audio' / 'bgm.wav'
with wave.open(str(wav), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((mix * 32767).astype(np.int16).tobytes())
(ROOT / 'public').mkdir(exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(wav), '-af', 'loudnorm=I=-15:TP=-1.5:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '256k', str(ROOT / 'public' / 'bgm.m4a')], check=True)
print('bgm ok', f'{DUR:.1f}s')
