"""BGM と効果音をローカルで合成する（追加課金なし・固定シード）。エンドロゴの保持終了まで覆う。

音楽ブリーフ（../plan.html「音」）:
  前半はリズムの立った軽快な拍で画面の大きな動きを支え、06 の「これで良いですか？」の前で一瞬引いて Dolly in に合わせて上がり、
  07 で最も速く、10 で明るく開いてエンドロゴの終わりまで覆って収まる。遅い曲に合わせて動きを弱めない。
  前作（20261023）の曲は流用しない。新しく D 長調の軽いポップ（裏拍のオープンハット、クラップ、跳ねるベース）で書いた。
拍の格子は 0 秒起点の 120BPM（1 拍 0.5 秒、1 小節 2 秒）。カットの境目（src/timeline.json）は 1 秒単位なので、すべて拍の上にある。

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
STARTS = {}
_s = 0.0
for c in TL['cuts']:
    STARTS[c['id']] = _s
    _s += c['dur']
LOGO = _s
DUR = LOGO + TL['logoDur']
VO = TL['voiceOffset']
BPM = 120
BEAT = 60 / BPM
BAR = BEAT * 4
N = int(SR * DUR)
rng = np.random.default_rng(20261031)

L = np.zeros(N)
R = np.zeros(N)
REV = np.zeros((2, N))
CHORD_BUS = np.zeros((2, N))  # キックで軽くポンプさせる上物


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
    if bus is not None:
        bus[0, i:i + len(s)] += s * gl
        bus[1, i:i + len(s)] += s * gr
    else:
        L[i:i + len(s)] += s * gl
        R[i:i + len(s)] += s * gr
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


# ---------- 和声 ----------
# 01–05: D 長調の軽い進行 D–A/C#–Bm7–Gmaj7（明るく前へ進む）。06–07: 緊張の Bm–G–Em7–F#sus4（07 で最速）。
# 08–09: 戻って D–Gmaj7–Bm7–A。10 とロゴ: 開く Gmaj7–A–D/F#–D（明るく収まる）
BRIGHT = [(38, [62, 66, 69, 73]), (37, [61, 64, 69, 73]), (35, [62, 66, 69, 71]), (43, [62, 66, 67, 71])]
TENSE = [(35, [59, 62, 66, 69]), (43, [59, 62, 67, 71]), (40, [59, 62, 64, 67]), (42, [59, 61, 66, 71])]
BUILD = [(38, [62, 66, 69, 73]), (43, [62, 66, 67, 71]), (35, [62, 66, 69, 71]), (45, [61, 64, 69, 73])]
OPEN = [(43, [62, 66, 67, 71, 74]), (45, [61, 64, 69, 73, 76]), (42, [62, 66, 69, 74]), (38, [62, 66, 69, 73, 78])]

s = STARTS
DOLLY0 = s['06'] + 0.4  # 06 の吹き出しが迫り始める
HIT06 = s['06'] + VO + 2.95  # 吹き出しが止まる
SHIRAN = s['06'] + VO + 4.45  # 「……知らん。」
SECTIONS = [
    (0, s['02'], dict(kick=0.8, clap=0.6, hat=0.6, bass=0.7, stab=0.7, prog='bright')),
    (s['02'], s['03'], dict(kick=1, clap=1, hat=1, ohat=0.8, bass=1, stab=0.9, pluck=0.5, prog='bright')),
    (s['03'], s['04'], dict(kick=1, clap=0.9, hat=0.9, bass=0.9, stab=0.8, prog='bright')),
    (s['04'], s['05'], dict(kick=1, clap=1, hat=1, ohat=1, bass=1, stab=0.9, pluck=0.8, shaker=0.7, prog='bright')),
    (s['05'], s['06'] - 1.0, dict(kick=0.9, clap=0.9, hat=0.9, ohat=0.6, bass=0.9, stab=0.8, pad=0.5, prog='bright')),
    (s['06'] - 1.0, DOLLY0, dict(pad=0.5, prog='tense')),  # 一瞬引く
    (DOLLY0, HIT06, dict(pad=0.7, hat16=0.5, prog='tense')),  # 迫るのに合わせて上がる
    (HIT06, s['07'], dict(kick=1, clap=0.8, hat=0.8, bass=1, pad=0.6, prog='tense')),
    (s['07'], s['08'], dict(kick=1, clap=1, hat16=1, ohat=0.8, bass=1.1, drive=1, stab=0.8, tom=0.8, prog='tense')),  # 最速
    (s['08'], s['09'], dict(kick=1, clap=1, hat=1, ohat=0.8, bass=1, stab=0.8, pluck=1, shaker=0.8, prog='build')),
    (s['09'], s['10'], dict(kick=0.9, clap=0.9, hat=0.8, bass=1, pad=0.9, pluck=0.7, prog='build')),
    (s['10'], LOGO, dict(kick=1, clap=1, hat=1, ohat=1, bass=1, ep=1, pad=1, pluck=1, shaker=1, lead=1, prog='open')),
    (LOGO, DUR, dict(ep=0.8, pad=0.9, sub=1, prog='open')),
]
PROGS = {'bright': BRIGHT, 'tense': TENSE, 'build': BUILD, 'open': OPEN}

# ベース（拍内の位置[16分], 半音, 長さ[16分]）
BASS_BOUNCE = [(0, 0, 2), (3, 0, 1), (6, 12, 1), (8, 0, 2), (10, 7, 1), (11, 0, 1), (14, 12, 1)]
BASS_DRIVE = [(i, 12 if i % 4 == 2 else 0, 1) for i in range(0, 16, 2)]
PLUCK_PAT = [2, 5, 9, 12, 14]
LEAD_MOTIF = [(0, 74, 2), (2, 76, 2), (4, 78, 4), (10, 81, 2), (12, 78, 4), (16, 76, 4), (20, 74, 2), (22, 76, 2), (24, 73, 8)]


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


S16 = BEAT / 4
nbars = int(np.ceil(DUR / BAR))
for bar in range(nbars):
    t0 = bar * BAR
    for step in range(16):
        tt0 = t0 + step * S16
        sec = next((c for c in SECTIONS if c[0] <= tt0 + 1e-6 < c[1]), None)
        if sec is None:
            continue
        cfg = sec[2]
        root, chord = PROGS[cfg['prog']][bar % 4]
        sub16 = step % 4
        if cfg.get('kick') and (sub16 == 0 or (step == 10 and cfg['prog'] != 'open')):
            place(kick(), tt0, cfg['kick'] * (0.95 if sub16 == 0 else 0.55))
        if cfg.get('clap') and step in (4, 12):
            place(clap(), tt0, cfg['clap'] * 0.3, pan=0.05, rev=0.12)
        if cfg.get('hat'):
            g = [0.4, 0.15, 0.32, 0.15][sub16] * cfg['hat']
            place(hat(), tt0, g * 0.16, pan=0.25 - 0.1 * (step % 2))
        if cfg.get('hat16'):
            # 16 分の刻み。06 の迫りでは小節ごとに強くなる
            ramp = 1.0 if cfg['prog'] != 'tense' or tt0 >= HIT06 else 0.3 + 0.7 * (tt0 - DOLLY0) / (HIT06 - DOLLY0)
            place(hat(), tt0, (0.42 if sub16 == 0 else 0.26) * 0.16 * cfg['hat16'] * ramp, pan=0.25 - 0.12 * (step % 2))
        if cfg.get('ohat') and sub16 == 2:
            place(hat(True), tt0, 0.07 * cfg['ohat'], pan=-0.2, rev=0.05)
        if cfg.get('tom') and step in (12, 14) and bar % 2 == 1:
            place(tom(52 if step == 12 else 47), tt0, 0.22 * cfg['tom'], pan=-0.3)
        if cfg.get('shaker') and sub16 in (1, 3):
            place(shaker(), tt0, 0.05 * cfg['shaker'], pan=-0.4)
        if cfg.get('bass'):
            pat = BASS_DRIVE if cfg.get('drive') else BASS_BOUNCE
            for (pos, semi, ln) in pat:
                if pos == step:
                    place(bass(root + semi, ln * S16 * 0.8, cfg['bass'] * 0.9), tt0, 0.5 * cfg['bass'])
        if cfg.get('sub') and step == 0:
            place(bass(root, BAR * 0.98, 0.1), tt0, 0.3)
        if cfg.get('stab') and step in (2, 6, 10, 14) and (cfg['prog'] == 'tense' or step in (2, 10)):
            place(ep(chord, S16 * 1.4), tt0, 0.32 * cfg['stab'], pan=-0.2, rev=0.1, bus=CHORD_BUS)
        if cfg.get('ep') and step in (0, 6, 10):
            place(ep(chord + [chord[0] + 12], S16 * (4 if step == 0 else 2.5)), tt0, 0.4 * cfg['ep'], pan=-0.15, rev=0.3, bus=CHORD_BUS)
        if cfg.get('pad') and step == 0:
            place(pad(chord, BAR * 1.02), tt0, 0.24 * cfg['pad'], pan=0.1, rev=0.35, bus=CHORD_BUS)
        if cfg.get('pluck') and step in PLUCK_PAT:
            n = chord[(step // 3) % len(chord)] + 12
            place(pluck(n, 0.3), tt0, 0.2 * cfg['pluck'], pan=0.35, rev=0.2)
    sec = next((c for c in SECTIONS if c[0] <= t0 + 1e-6 < c[1]), None)
    if sec and sec[2].get('lead'):
        half = bar % 2
        for (pos, n, ln) in LEAD_MOTIF:
            if (pos // 16) == half:
                place(lead(n, ln * S16 * 0.9), t0 + (pos % 16) * S16, 0.12 * sec[2]['lead'], pan=-0.1, rev=0.3)

# ---------- キックに合わせた上物のポンプ ----------
pump = np.ones(N)
for k in np.arange(0, DUR, BEAT):
    i = int(k * SR)
    j = min(N, i + int(0.35 * SR))
    tk = np.arange(j - i) / SR
    pump[i:j] = np.minimum(pump[i:j], 1 - 0.4 * np.exp(-tk * 12))
L += CHORD_BUS[0] * pump
R += CHORD_BUS[1] * pump


# ---------- 効果音（映像の出来事に合わせる。秒はカットの頭＋声の頭からの位置） ----------
def at(cut, sec, voice=True):
    return STARTS[cut] + (VO if voice else 0) + sec


for c in TL['cuts']:
    b = STARTS[c['id']] + c['dur']
    if c['tr'] == 'cut':
        continue
    up = c['tr'] in ('up', 'diag', 'iris')
    place(swoosh(0.5, up), b - 0.5, 0.2, pan=0.3 if c['tr'] == 'left' else -0.3, rev=0.1)
# 01: Dolly out で収まる
place(swoosh(0.8, False), 0.05, 0.15, pan=0.3, rev=0.2)
# 02: 取り消し線、Roll、「頭を使っている。」の叩き込み
place(swoosh(0.45, True), STARTS['02'] - 0.7, 0.14, pan=-0.4)
place(swoosh(0.8, True), at('02', 2.55), 0.18, pan=0.4, rev=0.2)
place(thud(), at('02', 6.35), 0.42)
place(tick(1300), at('02', 6.35), 0.1)
# 03: 語が矢印に吸われるたびに
for x in (4.3, 7.0):
    place(swoosh(0.45, True), at('03', x), 0.12, pan=0.5, rev=0.15)
    place(tick(1500), at('03', x) + 0.55, 0.12, pan=0.4)
# 04: 窓が開く・5 つの仕事が札ごと叩き込まれる
place(swoosh(0.6, True), STARTS['04'] + 0.3, 0.14, pan=0.4, rev=0.2)
for i, x in enumerate((4.42, 5.3, 6.64, 7.58, 8.44)):
    place(thud(), at('04', x), 0.22, pan=(-0.4, 0.4, -0.3, 0.4, 0)[i])
    place(tick(1200 + 100 * i), at('04', x), 0.08, pan=(-0.4, 0.4, -0.3, 0.4, 0)[i])
# 05: Tilt down と札の着地
place(swoosh(0.7, False), at('05', 3.25), 0.15, rev=0.2)
place(thud(), at('05', 4.0), 0.25)
# 06: 迫り（上がる）→ 止まる → 「知らん。」（アクセント）
place(riser(HIT06 - DOLLY0), DOLLY0, 0.24)
place(boom(), HIT06, 0.42)
place(thud(), SHIRAN, 0.5)
place(tick(800), SHIRAN, 0.18)
# 07: 字の窓が吹き飛ぶ → 朱の 2 行
place(swoosh(0.6, False), at('07', 3.25, False), 0.2, pan=-0.5, rev=0.15)
place(boom(), at('07', 3.95), 0.4)
place(thud(), at('07', 5.4), 0.3)
# 08: 問いの札、線、「成長」
for x in (1.5, 3.02, 4.78):
    place(thud(), at('08', x), 0.22)
for i, x in enumerate((7.38, 8.64, 9.78)):
    place(tick(1400 + 150 * i), at('08', x), 0.1, pan=-0.4 + 0.3 * i, rev=0.2)
place(riser(1.0), at('08', 11.45) - 1.0, 0.18)
place(boom(), at('08', 11.45), 0.4)
# 09: 回り込み、「移った。」（アクセント）
place(swoosh(0.9, True), at('09', 2.5), 0.16, pan=0.3, rev=0.3)
place(boom(), at('09', 4.28), 0.48)
# 10: 結論の 2 行
place(thud(), at('10', 1.15), 0.2)
place(swoosh(0.5, True), at('10', 2.9), 0.12, rev=0.3)
# エンドロゴ: o の着地（0.22・0.46・0.62 × 2.6 秒）、スライド（2.6 秒）、.work（3.0 秒〜）
for i, p in enumerate((0.22, 0.46, 0.62)):
    place(tick(900 - 150 * i), LOGO + p * 2.6, 0.2 * (1 - 0.25 * i), rev=0.2)
place(swoosh(0.6, False), LOGO + 2.6, 0.15)
for i in range(5):
    place(tick(2000 + 180 * i), LOGO + 3.0 + 0.08 * i, 0.06, pan=-0.4 + 0.2 * i)

# ---------- 仕上げ ----------
ir_t = tt(1.4)
ir = rng.standard_normal((2, len(ir_t))) * np.exp(-ir_t * 4.5)
ir = np.array([lp(x, 5000) for x in ir])
wet_l = fftconvolve(REV[0], ir[0])[:N]
wet_r = fftconvolve(REV[1], ir[1])[:N]
L += wet_l * 0.12
R += wet_r * 0.12
mix = np.stack([L, R], axis=1)
# 最後の 1 秒で収める
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
