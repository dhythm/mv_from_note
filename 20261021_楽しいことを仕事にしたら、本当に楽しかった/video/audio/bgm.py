"""BGM と効果音をローカルで合成する（追加課金なし・固定シード）。全 151.5 秒（エンドロゴの保持終了まで）。

音楽ブリーフ（../plan.html「ナレーションと音楽」）:
  明るいエレクトロ／インディー・ファンク系のインスト。120BPM。細かいハイハット、弾むベース、短い鍵盤・ギターのアクセント。
  01 は音数を絞るが拍を保ち、02 で開く。05–08 と 14 に大きな展開、09 前半と 13 は上物を引く。感傷的なピアノに寄せない。
  効果音: 色面のスライド・窓の展開・引用の着地に短いスウッシュと軽い打音。全カット同じ衝撃音にしない。
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
rng = np.random.default_rng(20261021)

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
# 明るい進行 Fmaj7–Dm7–Gm7–C7（各 1 小節）。抑える区間は Dm7–B♭maj7–Gm7–Csus4
BRIGHT = [(53, [57, 60, 64, 65]), (50, [57, 60, 62, 65]), (55, [58, 62, 65, 67]), (48, [58, 60, 64, 67])]
MUTED = [(50, [57, 60, 62, 65]), (46, [57, 58, 62, 65]), (55, [58, 62, 65, 67]), (48, [55, 60, 65, 67])]

# 区間ごとの編成: (開始, 終了, {要素: 強さ})
s = STARTS
SECTIONS = [
    (0, s['02'], dict(kick=0.7, half=1, hat=0.5, bass=0.0, sub=1, muted=1)),
    (s['02'], s['03'], dict(kick=1, clap=1, hat=1, bass=1, ep=1, pluck=0.6)),
    (s['03'], s['04'], dict(kick=0.9, hat=0.7, bass=0.6, ep=0.5, muted=1)),
    (s['04'], s['05'], dict(kick=1, clap=0.8, hat=0.9, bass=0.9, ep=0.8, pluck=1)),
    (s['05'], s['06'], dict(kick=1, clap=1, hat=1, bass=1, ep=1, pluck=0.8)),
    (s['06'], s['08'], dict(kick=1, clap=1, hat=1, bass=1, ep=1, pluck=1, shaker=0.6)),
    (s['08'], s['09'], dict(kick=1, clap=1, hat=1, bass=1, ep=1, pluck=1, shaker=0.8, lead=0.6)),
    (s['09'], s['09'] + VO + 5.5, dict(kick=0.8, hat=0.6, bass=0.5, muted=1)),
    (s['09'] + VO + 5.5, s['10'], dict(kick=1, clap=1, hat=1, bass=1, ep=0.9, pluck=0.7)),
    (s['10'], s['11'], dict(kick=1, clap=1, hat=1, bass=1, ep=0.9, pluck=0.8, conga=1, shaker=0.8)),
    (s['11'], s['12'], dict(kick=1, clap=1, hat=1, bass=1, ep=0.6, blip=1)),
    (s['12'], s['13'], dict(kick=1, clap=1, hat=1, bass=1, ep=1, pluck=1, shaker=0.7, conga=0.6)),
    (s['13'], s['14'], dict(kick=0.9, clap=0.7, hat=0.8, bass=0.7, muted=1)),
    (s['14'], LOGO, dict(kick=1, clap=1, hat=1, bass=1, ep=1, pluck=1, shaker=1, conga=0.7, lead=1)),
    (LOGO, DUR, dict(ep=0.8, sub=1)),
]

# ベースの 16 分の型（拍内の位置, 半音, 長さ[16分]）: 弾むシンコペーション
BASS_PAT = [(0, 0, 2), (3, 0, 1), (4, 12, 1), (6, 0, 2), (10, 7, 1), (11, 10, 1), (12, 0, 2), (15, 12, 1)]
PLUCK_PAT = [2, 7, 10, 14]
LEAD_MOTIF = [(0, 72, 3), (3, 74, 1), (4, 77, 4), (10, 76, 2), (12, 74, 2), (16, 72, 4), (22, 69, 2), (24, 72, 6)]

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
        prog_ = MUTED if cfg.get('muted') else BRIGHT
        root, chord = prog_[bar % 4]
        beat = step // 4
        sub16 = step % 4
        # ドラム
        if cfg.get('kick'):
            if cfg.get('half'):
                if step in (0, 8) or step == 11:
                    place(kick(), tt0, cfg['kick'] * 0.9)
            elif sub16 == 0:
                place(kick(), tt0, cfg['kick'] * 0.95)
        if cfg.get('clap') and step in (4, 12):
            place(clap(), tt0, cfg['clap'] * 0.42, pan=0.05, rev=0.25)
        if cfg.get('hat'):
            g = [0.45, 0.22, 0.32, 0.22][sub16] * cfg['hat']
            if sub16 == 2 and step in (6, 14) and not cfg.get('half'):
                place(hat(True), tt0, 0.07 * cfg['hat'], pan=0.3)
            else:
                place(hat(), tt0, g * 0.16, pan=0.25 - 0.1 * (step % 2))
        if cfg.get('shaker') and sub16 in (1, 3):
            place(shaker(), tt0, 0.05 * cfg['shaker'], pan=-0.4)
        if cfg.get('conga') and step in (3, 6, 10, 11, 14):
            place(conga(62 if step in (3, 11) else 57), tt0, 0.2 * cfg['conga'], pan=-0.25)
        if cfg.get('blip') and step in (0, 3, 6, 9, 12):
            place(tick(1200 + 300 * (step % 3)), tt0, 0.08, pan=0.5 if step % 2 else -0.5, rev=0.2)
        # ベース
        if cfg.get('bass'):
            for (pos, semi, ln) in BASS_PAT:
                if pos == step:
                    place(bass(root - 12 + semi, ln * S16 * 0.95, cfg['bass']), tt0, 0.5 * cfg['bass'])
        if cfg.get('sub') and step == 0:
            place(bass(root - 12, BAR * 0.98, 0.1), tt0, 0.35)
        # エレピ: 2 拍目と 4 拍目の裏に短いスタブ
        if cfg.get('ep') and step in (6, 14):
            place(ep(chord, S16 * 3), tt0, 0.45 * cfg['ep'], pan=-0.2, rev=0.3, bus=CHORD_BUS)
        if cfg.get('ep') and step == 0 and sec[0] >= LOGO:
            place(ep(chord, BAR * 0.9), tt0, 0.3 * cfg['ep'], rev=0.5, bus=CHORD_BUS)
        if cfg.get('muted') and step == 0:
            place(ep(chord, BAR * 0.95), tt0, 0.13, pan=0.1, rev=0.4, bus=CHORD_BUS)
        # ギター風プラック
        if cfg.get('pluck') and step in PLUCK_PAT:
            n = chord[(step // 3) % len(chord)] + 12
            place(pluck(n, 0.3), tt0, 0.26 * cfg['pluck'], pan=0.35, rev=0.2)
    # リード（2 小節で一巡するモチーフ）
    sec = next((c for c in SECTIONS if c[0] <= t0 + 1e-6 < c[1]), None)
    if sec and sec[2].get('lead'):
        half = bar % 2
        for (pos, n, ln) in LEAD_MOTIF:
            if (pos // 16) == half:
                place(lead(n, ln * S16 * 0.9), t0 + (pos % 16) * S16, 0.14 * sec[2]['lead'], pan=-0.1, rev=0.35)

# ---------- キックに合わせた上物のポンプ ----------
pump = np.ones(N)
kt = np.arange(0, DUR, BEAT)
for k in kt:
    i = int(k * SR)
    j = min(N, i + int(0.35 * SR))
    tk = np.arange(j - i) / SR
    pump[i:j] = np.minimum(pump[i:j], 1 - 0.45 * np.exp(-tk * 12))
L += CHORD_BUS[0] * pump
R += CHORD_BUS[1] * pump

# ---------- 展開・効果音（映像の出来事に合わせる。秒はカットの頭＋声の頭からの位置） ----------
def at(cut, sec, voice=True):
    return STARTS[cut] + (VO if voice else 0) + sec


# カットの切り替え（次の面が押し入る 0.5 秒）にスウッシュ。上下・斜めで向きを変える
for c in TL['cuts']:
    b = STARTS[c['id']] + c['dur']
    up = c['tr'] in ('up', 'diag')
    place(swoosh(0.55, up), b - 0.52, 0.22 if c['tr'] != 'diag' else 0.28, pan=0.3 if c['tr'] == 'left' else -0.3, rev=0.2)
# 01: 縦の列の着地に低い打音、「対価？」に軽い打音
place(thud(), at('01', 0.15), 0.5)
place(thud(), at('01', 1.15), 0.42)
place(tick(1500), at('01', 4.75), 0.18, rev=0.3)
# 02: 開く瞬間にブーム
place(boom(), STARTS['02'], 0.45)
# 04・06: 窓の展開
place(swoosh(0.4, True), at('04', 1.15), 0.14, pan=0.5)
place(tick(2200), at('04', 1.6), 0.1, pan=0.5)
place(swoosh(0.45, False), at('06', 2.3), 0.16, pan=-0.4)
# 05: 字のマスクが開く前のライザーと、転機の着地
place(riser(2.0), at('05', 3.45) - 2.0, 0.3)
place(boom(), at('05', 3.45), 0.5)
# 07: 引用の着地（6ヶ月・閉じ括弧）
place(tick(1300), at('07', 4.2), 0.16, rev=0.3)
place(thud(), at('07', 5.65), 0.35)
# 08: 小さな頂点
place(boom(), STARTS['08'], 0.35)
place(swoosh(0.6, True), at('08', 4.3), 0.16)
# 09: 明るい面が抜ける
place(riser(1.5), at('09', 5.25) - 1.2, 0.22)
place(boom(), at('09', 5.65), 0.35)
# 11: コードの行を送る
place(swoosh(0.5, True), at('11', 2.3), 0.14, pan=0.5)
# 12: 循環の線が描かれるたびに軽い打音
for i, x in enumerate((0.8, 2.5, 3.8)):
    place(tick(1400 + 250 * i), at('12', x), 0.13, pan=(-0.4, 0.4, 0)[i], rev=0.3)
# 14: 最大の見せ場
place(riser(2.0), at('14', 4.0) - 2.0, 0.28)
place(boom(), at('14', 4.0), 0.55)
place(swoosh(0.5, False), at('14', 5.7), 0.16)
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
