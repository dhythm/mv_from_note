"""BGM をローカルで合成する（追加課金なし・固定シード）。エンドロゴの終わりまで覆う。

企画書では BGM を後回しにしていたが、2026-11-05 にユーザーから「BGMが欲しい」と依頼があり、制作側で条件を決めて作った。
条件（作品から決めたブリーフ）:
  - トーン: 明るく前向き。小さな部品がカチッと噛み合う手触り。G 長調（G–D–Em–C）、120BPM の 4 つ打ちを軽めに。
    前作（20261102 の F マイナーのミニマル、20261031 の D 長調ポップ）は流用しない。主役の音色はマリンバ風の粒。
  - 展開: 01 は打楽器なしで粒と和音だけ → 02–04 で軽い 4 つ打みが入る → 05 で刻みが詰まり重くなる →
    06 はハーフタイムで短調（Em–C–Am–B）、合体で低い打音、ひびで音楽を落とし、巻き戻しで逆向きの風切り →
    07 の噛み合い 4 回に打音を合わせて組み直し、08 で全編成 → 09 は引きに合わせて上昇音、「点が、線になった。」で頂点、
    最後の静止（Freeze）で 1 秒だけ音楽を止める → 10 の留保は打楽器を抜いて和音と粒だけ →
    11 で少しずつ戻し、「つなぐと、化ける。」で全編成とリード、ロゴの Whip pan を経て最後の和音で終わる。
  - 声の邪魔をしない（声のある間は mix.py で下げる）。勢いは弱めない。
拍の格子は 0 秒起点の 120BPM（1 拍 0.5 秒）。カットの境目（src/timeline.json）は 1 秒単位なので拍の上にある。
アクセントの秒は「カットの頭からの秒」で、場面ファイル（src/scenes*.tsx）の秒と同じ。
音色の部品は 20261102 の bgm.py から流用し、曲（和声・編成・展開）は新しく書いた。

  python audio/bgm.py   → audio/bgm.wav, public/bgm.m4a（numpy・scipy が要る）
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
rng = np.random.default_rng(20261105)

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




def marimba(n, d=0.45):
    """マリンバ風の粒（基音＋4 倍音の速い減衰）。コマが置かれる・噛み合う手触り"""
    t = tt(d)
    f = midi(n)
    x = np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + 0.35 * np.sin(2 * np.pi * f * 3.98 * t) * np.exp(-t * 28) + 0.12 * np.sin(2 * np.pi * f * 9.2 * t) * np.exp(-t * 60)
    return x * np.minimum(1, t / 0.002)


def click():
    """噛み合う打音（木の短い打撃＋低い芯）"""
    t = tt(0.25)
    return 0.8 * bp(rng.standard_normal(len(t)), 1800, 6000) * np.exp(-t * 70) + np.sin(2 * np.pi * np.cumsum(160 + 200 * np.exp(-t * 50)) / SR) * np.exp(-t * 18)


def crash(d=2.0):
    t = tt(d)
    return hp(rng.standard_normal(len(t)), 4000) * np.exp(-t * 2.2) * np.minimum(1, t / 0.004)


# ---------- 和声 ----------
PROG = [(43, [67, 71, 74]), (38, [66, 69, 74]), (40, [67, 71, 76]), (36, [67, 72, 76])]  # G–D–Em–C
DARK = [(40, [67, 71, 76]), (36, [67, 72, 76]), (45, [69, 72, 76]), (47, [66, 71, 75])]  # Em–C–Am–B
SOFT = [(36, [67, 72, 76]), (43, [67, 71, 74]), (45, [69, 72, 76]), (40, [67, 71, 76])]  # C–G–Am–Em
ARP = [0, 1, 2, 1, 2, 0, 1, 2]


def cfg_at(t):
    c = dict(kick=0.8, hat=0.7, clap=0.6, bass=0.9, mar=0.8, pad=0.45, prog=PROG)
    if t < S['02']:
        c.update(kick=0, clap=0, hat=0, bass=0.5, mar=0.7, pad=0.7)
    elif t < S['05']:
        pass
    elif t < S['06']:
        c.update(hat16=1, mar=1, ohat=0.6, clap=0.7)  # 量が増える: 刻みが詰まる
    elif t < S['07']:
        c.update(half=1, prog=DARK, mar=0.4, hat=0.5, pad=0.8, kick=0.9)
    elif t < S['07'] + 7.0:
        c.update(kick=0, clap=0, hat=0.4, bass=0.5, mar=0.7, pad=0.6)  # 組み直す前: 軽く
    elif t < S['08']:
        c.update(ohat=0.6)
    elif t < S['09']:
        c.update(ohat=0.8, hat16=0.7, mar=1, clap=0.8)
    elif t < S['10']:
        c.update(ohat=1, hat16=1, mar=1, clap=0.8, pad=0.7, lead=1 if t > S['09'] + 5.9 else 0)
    elif t < S['11']:
        c.update(kick=0, clap=0, hat=0, bass=0.4, mar=0.6, pad=0.8, prog=SOFT)  # 留保: 打楽器を抜く
    elif t < S['11'] + 3.5:
        c.update(kick=0, clap=0, hat=0.4, bass=0.5, mar=0.7, pad=0.7)
    elif t < S['11'] + 9.7:
        c.update(clap=0.5, ohat=0.5)
    elif t < LOGO:
        c.update(ohat=1, hat16=0.8, mar=1, clap=0.8, pad=0.8, lead=1)
    else:
        c = dict(prog=PROG, end=1)
    return c


LEAD = [(0, 74, 2), (2, 76, 2), (4, 79, 4), (8, 76, 2), (10, 74, 2), (12, 71, 4), (16, 74, 2), (18, 76, 2), (20, 79, 3), (23, 81, 1), (24, 83, 8)]
nbars = int(np.ceil(DUR / BAR))
for bar in range(nbars):
    t0 = bar * BAR
    for step in range(16):
        x = t0 + step * S16
        if x >= LOGO:
            break
        cfg = cfg_at(x + 1e-6)
        root, chord = cfg['prog'][bar % 4]
        q = step % 4
        half = cfg.get('half')
        if cfg.get('kick') and q == 0 and (not half or step in (0, 10)):
            place(kick(), x, 0.85 * cfg['kick'], bus=MUS)
        if cfg.get('clap') and (step == 8 if half else step in (4, 12)):
            place(clap(), x, cfg['clap'] * 0.25, pan=0.05, rev=0.15, bus=MUS)
        if cfg.get('hat'):
            place(hat(), x, [0.3, 0.1, 0.28, 0.1][q] * 0.14 * cfg['hat'], pan=0.25 - 0.1 * (step % 2), bus=MUS)
        if cfg.get('hat16') and q in (1, 3):
            place(hat(), x, 0.03 * cfg['hat16'], pan=-0.3, bus=MUS)
        if cfg.get('ohat') and q == 2:
            place(hat(True), x, 0.05 * cfg['ohat'], pan=-0.2, rev=0.05, bus=MUS)
        if cfg.get('bass') and step % 2 == 0 and not (half and step % 4 == 2):
            place(bass(root - 12 + (12 if step in (6, 14) else 0), S16 * 1.6, 0.5), x, (0.55 if q == 0 else 0.38) * cfg['bass'], bus=MUS)
        if cfg.get('mar') and (step % 2 == 0 or cfg.get('hat16')):
            if step % 2 == 0 or step in (3, 11):
                n = chord[ARP[(step // 2) % 8] % len(chord)] + (12 if step in (6, 14) else 0)
                place(marimba(n), x, 0.2 * cfg['mar'], pan=0.3 * (1 if step % 4 == 0 else -1), rev=0.2, bus=MUS)
        if cfg.get('pad') and step == 0:
            place(pad(chord, BAR * 1.02), x, 0.2 * cfg['pad'], pan=0.1, rev=0.35, bus=CHORD_BUS)
    cfg = cfg_at(t0 + 1e-6)
    if cfg.get('lead'):
        for (pos, n, ln) in LEAD:
            if pos // 16 == bar % 2:
                place(lead(n, ln * S16 * 0.9), t0 + (pos % 16) * S16, 0.09, pan=-0.1, rev=0.35, bus=MUS)

# キックに合わせた和音のポンプ（打楽器のある区間だけ）
pump = np.ones(N)
for k in np.arange(0, LOGO, BEAT):
    if not cfg_at(k + 1e-6).get('kick'):
        continue
    i = int(k * SR)
    j = min(N, i + int(0.35 * SR))
    tk = np.arange(j - i) / SR
    pump[i:j] = np.minimum(pump[i:j], 1 - 0.4 * np.exp(-tk * 12))
MUS += CHORD_BUS * pump

# ---------- 音楽の包絡 ----------
env = np.ones(N)


def ramp_gain(a, b, g, fade=0.04):
    i, j = int(a * SR), int(b * SR)
    f = int(fade * SR)
    env[i:j] = np.minimum(env[i:j], g)
    env[max(0, i - f):i] = np.minimum(env[max(0, i - f):i], np.linspace(1, g, i - max(0, i - f)))
    env[j:j + f] = np.minimum(env[j:j + f], np.linspace(g, 1, len(env[j:j + f])))


ramp_gain(S['06'] + 8.0, S['06'] + 10.4, 0.25, 0.08)  # 06 のひび: 音楽を落とす
ramp_gain(S['09'] + 12.0, S['10'], 0.0, 0.03)  # 09 の Freeze: 1 秒止める
L += MUS[0] * env
R += MUS[1] * env


# ---------- 場面に合わせたアクセント（秒はカットの頭から） ----------
def at(cut, sec):
    return S[cut] + sec


for c in TL['cuts']:
    b = S[c['id']] + c['dur']
    if c['tr'] in ('whip', 'up', 'whipx'):
        place(swoosh(0.5, True), b - 0.5, 0.2, rev=0.1)
    elif c['tr'] == 'left':
        place(swoosh(0.5, False), b - 0.5, 0.18, pan=0.3, rev=0.1)
place(marimba(74, 1.2), at('01', 4.5), 0.25, rev=0.4)  # コマが現れる
for i in range(5):  # 02: 列にコマが置かれる
    place(marimba([67, 71, 74, 79, 83][i], 0.6), at('02', 0.3 if i == 0 else 2.2 + i * 0.55), 0.22, pan=-0.4 + 0.2 * i, rev=0.2)
place(thud(), at('02', 0.15), 0.35)  # 「小さく作る」の叩き込み
place(thud(), at('03', 4.7), 0.3)  # 「止める。」
place(boom(), at('06', 2.6), 0.4)  # 合体
place(crash(1.5), at('06', 8.0), 0.12, rev=0.3)  # ひび
place(swoosh(1.1, False)[::-1], at('06', 10.4), 0.25, rev=0.2)  # 巻き戻し
for k in range(4):  # 07: 噛み合い 4 回
    place(click(), at('07', 7.15 + k * 0.32 + 0.2), 0.3, pan=-0.3 + 0.2 * k, rev=0.1)
place(snare(), at('07', 9.0), 0.25, rev=0.3)  # 「つなぐ。」
place(riser(4.4), at('09', 1.5), 0.12)  # 引き
place(crash(2.5), at('09', 5.9), 0.14, rev=0.3)
place(boom(), at('09', 5.9), 0.3)  # 「点が、線になった。」
for k, n in enumerate([55, 59, 62, 67, 71, 74, 79, 83, 86, 91, 95, 98]):  # 11: 隣が噛み合っていく
    place(marimba(n, 0.5), at('11', 0.5 + 3.6 + (k + 1) * 0.28 + 0.22), 0.13, pan=-0.5 + k * 0.09, rev=0.2)
place(crash(2.5), at('11', 9.75), 0.14, rev=0.3)
place(boom(), at('11', 9.75), 0.3)  # 「つなぐと、化ける。」
# エンドロゴ: 最後の和音を鳴らし、o の着地に粒、保持の終わりで収める
place(pad([67, 71, 74, 79], TL['logoDur'] + 0.5), LOGO, 0.15, rev=0.3)
place(sub(31, TL['logoDur']), LOGO, 0.18)
for i, p in enumerate((0.22, 0.46, 0.62)):
    place(marimba(79 - 5 * i, 0.5), LOGO + p * 2.6, 0.15, rev=0.3)
for i, n in enumerate([74, 79, 83, 86, 91]):
    place(marimba(n, 0.6), LOGO + 3.0 + 0.2 * i, 0.12, pan=-0.4 + 0.2 * i, rev=0.3)

# ---------- 仕上げ ----------
ir_t = tt(1.6)
ir = rng.standard_normal((2, len(ir_t))) * np.exp(-ir_t * 4.0)
ir = np.array([lp(x, 5000) for x in ir])
# 残響にも音楽の包絡を掛ける（09 の Freeze で残響だけが鳴り続けないように）
L += fftconvolve(REV[0], ir[0])[:N] * 0.12 * env
R += fftconvolve(REV[1], ir[1])[:N] * 0.12 * env
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
