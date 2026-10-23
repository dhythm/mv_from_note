"""BGM と効果音をローカルで合成する（追加課金なし・固定シード）。全 98.5 秒（エンドロゴの保持終了まで）。

音楽ブリーフ（../plan.html「音楽・効果音のブリーフ」）:
  116〜124BPM の明瞭な 4 拍子。乾いた打楽器と短い低音のアクセントで、面の移動・行マスク・寄りを支える。
  前半は緊張を含む引き締まった音色、06 で低音の重心が変わり、07 で温かい鍵盤と軽いシンセを加えて視野が開く。
  03 の球の停止、06 の視線の転換、09 の結論を短いアクセントにする。完全な無音は設けず、06 の転換で一拍薄くする。
  悲壮なピアノ・過度な感動曲・炎を煽る効果音には寄せない。前作（20261021）の曲は流用しない。
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
rng = np.random.default_rng(20261023)

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
# 前半（01–05）: A マイナーの引き締まった進行 Am(add9)–Fmaj7–Dm7–Esus4。06 は低音を D へ移した Dm9–B♭maj7–Gm7–Asus4
# 07 以降: C 長調へ開く Cmaj9–G/B–Am7–Fmaj7。09 の結論は Fmaj7–G–Csus2–C
TENSE = [(45, [57, 59, 60, 64]), (41, [57, 60, 64, 65]), (38, [57, 60, 62, 65]), (40, [57, 59, 62, 64])]
TURN = [(38, [57, 60, 64, 65]), (46, [57, 58, 62, 65]), (43, [58, 62, 65, 67]), (45, [57, 62, 64, 69])]
OPEN = [(48, [59, 62, 64, 67]), (47, [59, 62, 67, 69]), (45, [60, 64, 67, 69]), (41, [60, 64, 65, 69])]
END = [(41, [60, 64, 65, 69]), (43, [59, 62, 67, 71]), (48, [60, 62, 67, 72]), (48, [60, 64, 67, 72])]

s = STARTS
TURN_AT = s['06'] + VO + 3.0  # 06 の視線の転換（ピント送りの頭）
SECTIONS = [
    (0, s['02'], dict(kick=0.8, rim=0.7, hat=0.6, bass=0.6, stab=0.6, prog='tense')),
    (s['02'], s['03'], dict(kick=1, rim=1, hat=1, bass=1, stab=0.9, prog='tense')),
    (s['03'], s['04'], dict(kick=1, rim=1, hat=1, bass=1, stab=0.7, tom=0.8, prog='tense')),
    (s['04'], s['05'], dict(kick=0.9, rim=0.8, hat=0.8, bass=0.9, stab=0.6, prog='tense')),
    (s['05'], s['06'], dict(kick=1, rim=1, hat=1, bass=1, stab=0.9, tom=0.6, prog='tense')),
    (s['06'], TURN_AT - 0.5, dict(kick=0.9, rim=0.8, hat=0.8, bass=0.8, stab=0.6, prog='turn')),
    (TURN_AT - 0.5, TURN_AT, dict(hat=0.3, prog='turn')),  # 一拍薄くする
    (TURN_AT, s['07'], dict(kick=1, rim=0.9, hat=0.9, bass=1, stab=0.6, pad=0.6, prog='turn')),
    (s['07'], s['08'], dict(kick=1, rim=0.9, hat=1, bass=1, ep=1, pad=1, pluck=0.7, shaker=0.6, prog='open')),
    (s['08'], s['09'], dict(kick=1, rim=1, hat=1, bass=1, ep=1, pad=0.8, pluck=1, shaker=0.8, lead=0.5, prog='open')),
    (s['09'], LOGO, dict(kick=1, rim=1, hat=1, bass=1, ep=1, pad=1, pluck=1, shaker=1, lead=0.9, prog='end')),
    (LOGO, DUR, dict(ep=0.8, pad=0.8, sub=1, prog='end')),
]
PROGS = {'tense': TENSE, 'turn': TURN, 'open': OPEN, 'end': END}

# 短く切るベース（拍内の位置, 半音, 長さ[16分]）: 前半は 8 分の刻みで押す
BASS_TIGHT = [(0, 0, 1), (2, 0, 1), (4, 0, 1), (7, 12, 1), (8, 0, 1), (10, 0, 1), (12, 0, 1), (14, 7, 1)]
BASS_OPEN = [(0, 0, 2), (3, 0, 1), (6, 7, 2), (8, 0, 2), (11, 12, 1), (14, 10, 2)]
PLUCK_PAT = [2, 6, 10, 13]
LEAD_MOTIF = [(0, 76, 2), (2, 74, 2), (4, 72, 4), (10, 74, 2), (12, 76, 4), (16, 79, 4), (22, 76, 2), (24, 74, 8)]


def rim():
    """乾いたリムショット（短い帯域ノイズ＋高い胴鳴り）"""
    t = tt(0.09)
    return bp(rng.standard_normal(len(t)), 1500, 6000) * np.exp(-t * 70) + 0.5 * np.sin(2 * np.pi * 820 * t) * np.exp(-t * 60)


def tom(n):
    t = tt(0.3)
    f = midi(n) * (1 + 0.5 * np.exp(-t * 25))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 11)


def pad(notes, d):
    """温かい鍵盤の持続（ゆっくり立ち上がる柔らかい和音）"""
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
        if cfg.get('kick') and (sub16 == 0 or (cfg['prog'] == 'tense' and step == 11)):
            place(kick(), tt0, cfg['kick'] * (0.95 if sub16 == 0 else 0.6))
        if cfg.get('rim') and step in (4, 12):
            place(rim(), tt0, cfg['rim'] * 0.34, pan=0.08, rev=0.05)
            if cfg['prog'] != 'tense':
                place(clap(), tt0, cfg['rim'] * 0.22, pan=0.05, rev=0.12)
        if cfg.get('hat'):
            g = [0.42, 0.18, 0.3, 0.18][sub16] * cfg['hat']
            place(hat(), tt0, g * 0.16, pan=0.25 - 0.1 * (step % 2))
        if cfg.get('tom') and step in (13, 15) and bar % 2 == 1:
            place(tom(50 if step == 13 else 45), tt0, 0.22 * cfg['tom'], pan=-0.3)
        if cfg.get('shaker') and sub16 in (1, 3):
            place(shaker(), tt0, 0.05 * cfg['shaker'], pan=-0.4)
        if cfg.get('bass'):
            pat = BASS_TIGHT if cfg['prog'] in ('tense', 'turn') else BASS_OPEN
            for (pos, semi, ln) in pat:
                if pos == step:
                    place(bass(root - 12 + semi + 12, ln * S16 * 0.8, cfg['bass'] * 0.8), tt0, 0.5 * cfg['bass'])
        if cfg.get('sub') and step == 0:
            place(bass(root - 12 + 12, BAR * 0.98, 0.1), tt0, 0.3)
        # 前半: 短い和音のスタブ（裏拍）。乾いた音色で残響は少なく
        if cfg.get('stab') and step in (3, 10):
            place(ep(chord, S16 * 1.5), tt0, 0.36 * cfg['stab'], pan=-0.2, rev=0.08, bus=CHORD_BUS)
        # 07 以降: 温かい鍵盤（エレピ）の刻みと持続
        if cfg.get('ep') and step in (0, 6, 10):
            place(ep(chord + [chord[0] + 12], S16 * (4 if step == 0 else 2.5)), tt0, 0.4 * cfg['ep'], pan=-0.15, rev=0.3, bus=CHORD_BUS)
        if cfg.get('pad') and step == 0:
            place(pad(chord, BAR * 1.02), tt0, 0.22 * cfg['pad'], pan=0.1, rev=0.35, bus=CHORD_BUS)
        if cfg.get('pluck') and step in PLUCK_PAT:
            n = chord[(step // 3) % len(chord)] + 12
            place(pluck(n, 0.3), tt0, 0.22 * cfg['pluck'], pan=0.35, rev=0.2)
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
    up = c['tr'] in ('up', 'diag')
    place(swoosh(0.5, up), b - 0.5, 0.2 if c['tr'] != 'diag' else 0.26, pan=0.3 if c['tr'] == 'left' else -0.3, rev=0.1)
# 01: 境界が掃く
place(swoosh(0.6, False), 0.0, 0.18, pan=0.5)
# 02: 「温度差」の叩き込み
place(thud(), at('02', 6.5), 0.45)
place(tick(1300), at('02', 6.5), 0.12)
# 03: 球の加速と停止（アクセント）
place(riser(1.9), at('03', 4.95) - 1.9, 0.18)
place(boom(), at('03', 4.95), 0.5)
place(tick(900), at('03', 4.95), 0.2)
# 04: 境界が欠けるたびに軽い打音
for i, x in enumerate((2.8, 3.6, 4.4, 5.3)):
    place(tick(1100 - 120 * i), at('04', x), 0.11, pan=-0.2, rev=0.1)
# 05: 「熱量」が立ち上がる
place(thud(), at('05', 3.75), 0.38)
# 06: 視線の転換（アクセント）
place(swoosh(0.9, True), at('06', 3.0) - 0.4, 0.16, pan=0.4, rev=0.3)
place(boom(), at('06', 3.0), 0.4)
# 07: 窓が開き、色が戻る
place(swoosh(0.5, True), at('07', 5.5), 0.13, pan=0.5, rev=0.3)
for i in range(4):
    place(tick(1500 + 200 * i), at('07', (2.4, 2.85, 3.4, 4.2)[i]), 0.07, pan=-0.4 + 0.25 * i, rev=0.2)
# 08: 起点力
place(riser(1.2), at('08', 9.2) - 1.2, 0.2)
place(boom(), at('08', 9.2), 0.42)
# 09: 水銀が走り、「踏もう。」で結ぶ（アクセント）
place(riser(1.0), at('09', 6.6) - 1.0, 0.2)
place(boom(), at('09', 7.2), 0.5)
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
