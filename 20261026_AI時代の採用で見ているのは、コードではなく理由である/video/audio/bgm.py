"""BGM と効果音をローカルで合成する（追加課金なし・固定シード）。全編（エンドロゴの保持終了まで）。

音楽の方向（制作側で決めたもの。企画書では BGM は「試聴待ち・未設計」）:
  知的で歯切れのよいミニマルなテック・ポップ。120BPM・Aマイナー（Am–F–C–G）。
  タイトなキック、16 分のハイハット、FM の短いアルペジオ、キックでポンプするパッド、跳ねるベース。
  01 は音数を絞り、02 の「なぜ？」で開く。05 の説明例は上物を軽く、06 で手が止まる瞬間に音楽もテープストップで止まる。
  07 の柱が落ちる瞬間に低い衝撃、そこから組み直して 09・10 で最も厚く。10 の言い切りで押し込み、エンドロゴで収める。
  効果音: 切り替えのスウッシュ、主役の語の着地の打音（全部同じ音にしない）、02 の組み変わりの細かいグリッチ。
拍の格子は 0 秒起点の 120BPM（1 拍 0.5 秒、1 小節 2 秒）。カットの境目（src/timeline.json）は 1 秒単位なので拍の上にある。

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
BPM = 120
BEAT = 60 / BPM
BAR = BEAT * 4
S16 = BEAT / 4
N = int(SR * DUR)
rng = np.random.default_rng(20261026)

L = np.zeros(N)
R = np.zeros(N)
REV = np.zeros((2, N))
PAD_BUS = np.zeros((2, N))  # キックでポンプさせる上物
SFX = np.zeros((2, N))  # テープストップの影響を受けない効果音


def at(cut, sec):
    """カットの頭からの秒 → 全体の秒"""
    return STARTS[cut] + sec


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
    t = tt(0.4)
    f = 48 + 110 * np.exp(-t * 38)
    ph = 2 * np.pi * np.cumsum(f) / SR
    click = hp(rng.standard_normal(len(t)), 2000) * np.exp(-t * 400) * 0.25
    return (np.sin(ph) * np.exp(-t * 8) + click) * big


def snap():
    t = tt(0.22)
    n = rng.standard_normal(len(t))
    env = np.exp(-t * 28) + 0.5 * np.exp(-np.maximum(0, t - 0.01) * 34) * (t > 0.01)
    return bp(n, 1400, 7000) * env * 0.8 + 0.3 * np.sin(2 * np.pi * 230 * t) * np.exp(-t * 40)


def hat(open_=False):
    d = 0.2 if open_ else 0.045
    t = tt(d)
    return hp(rng.standard_normal(len(t)), 8000) * np.exp(-t * (16 if open_ else 90))


def bass(n, d, bright=1.0):
    t = tt(d)
    f = midi(n)
    saw = 2 * ((t * f) % 1) - 1
    x = 0.55 * lp(saw, 260 + 1100 * bright * np.exp(-0.0)) * (0.35 + 0.65 * np.exp(-t * 10)) + 0.5 * np.sin(2 * np.pi * f * t)
    env = np.minimum(1, t / 0.004) * np.exp(-t * 2.5) * np.clip((d - t) / 0.02, 0, 1)
    return x * env


def fm_pluck(n, d=0.28, idx=2.2):
    """短い FM のプラック（ガラスっぽい明るさ）"""
    t = tt(d)
    f = midi(n)
    mod = np.sin(2 * np.pi * f * 3 * t) * idx * np.exp(-t * 14)
    x = np.sin(2 * np.pi * f * t + mod)
    env = np.minimum(1, t / 0.003) * np.exp(-t * 11) * np.clip((d - t) / 0.02, 0, 1)
    return x * env


def pad(notes, d):
    t = tt(d)
    out = np.zeros(len(t))
    for j, n in enumerate(notes):
        f = midi(n)
        for det in (-0.12, 0.12):
            ff = f * 2 ** (det / 12)
            out += 2 * ((t * ff + j * 0.13) % 1) - 1
    out = lp(out / (len(notes) * 2), 1600)
    env = np.minimum(1, t / 0.25) * np.clip((d - t) / 0.3, 0, 1)
    return out * env


def lead(n, d):
    t = tt(d)
    f = midi(n) * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.minimum(1, t / 0.25))
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = 0.6 * np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.12 * np.sign(np.sin(ph))
    env = np.minimum(1, t / 0.012) * (0.7 + 0.3 * np.exp(-t * 5)) * np.clip((d - t) / 0.06, 0, 1)
    return lp(x, 3800) * env


def swoosh(d=0.5, up=True):
    t = tt(d)
    n = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    seg = 12
    for s in range(seg):
        a = int(len(t) * s / seg)
        b = int(len(t) * (s + 1) / seg)
        fc = 600 + 5200 * ((s + 0.5) / seg if up else 1 - (s + 0.5) / seg)
        out[a:b] = bp(n, fc * 0.6, min(fc * 1.6, 20000))[a:b]
    return out * np.sin(np.pi * t / d) ** 1.5


def tick(f=1800, d=0.12):
    t = tt(d)
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 45) + 0.35 * hp(rng.standard_normal(len(t)), 3000) * np.exp(-t * 120)


def thud(f0=72):
    t = tt(0.6)
    f = f0 + 70 * np.exp(-t * 20)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) + 0.2 * lp(rng.standard_normal(len(t)), 1500) * np.exp(-t * 30)


def boom():
    t = tt(1.8)
    f = 40 + 55 * np.exp(-t * 6)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.2) + 0.22 * lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 5)


def riser(d):
    t = tt(d)
    n = rng.standard_normal(len(t))
    out = np.zeros(len(t))
    seg = 16
    for s in range(seg):
        a = int(len(t) * s / seg)
        b = int(len(t) * (s + 1) / seg)
        fc = 400 + 7000 * ((s + 0.5) / seg) ** 2
        out[a:b] = bp(n, fc * 0.7, min(fc * 1.4, 20000))[a:b]
    return out * (t / d) ** 2


def glitch():
    t = tt(0.05)
    f = rng.uniform(900, 3200)
    return np.sign(np.sin(2 * np.pi * f * t)) * np.exp(-t * 60) * 0.6


# ---------- 和声 ----------
# Am–F–C–G（各 1 小節）。根音, 和音
PROG = [(45, [57, 60, 64, 69]), (41, [57, 60, 65, 69]), (48, [55, 60, 64, 67]), (43, [55, 59, 62, 67])]
ARP = [0, 2, 1, 3, 2, 1, 3, 2]  # 16 分 2 つおきのアルペジオの順

s = STARTS
STOP_A = at('06', 9.6)  # 手元の減速の開始（scenes2.tsx の RAMP_A）
STOP_D = 1.6
SECTIONS = [
    (0, s['02'], dict(kick=0.6, half=1, hat=0.4, arp=0.6, pad=0.6, filt=1)),
    (s['02'], at('02', 4.32), dict(kick=0.8, hat=0.6, bass=0.5, arp=0.7, pad=0.7)),
    (at('02', 4.32), s['03'], dict(kick=1, snap=1, hat=1, bass=1, arp=1, pad=0.8)),
    (s['03'], s['05'], dict(kick=1, snap=1, hat=1, bass=1, arp=1, pad=0.8)),
    (s['05'], at('05', 8.2), dict(kick=0.9, hat=0.7, bass=0.7, arp=0.6, pad=1)),
    (at('05', 8.2), at('05', 16.8), dict(kick=0.9, snap=0.6, hat=0.8, bass=0.8, arp=1.1, pad=0.7)),
    (at('05', 16.8), s['06'], dict(kick=1, snap=1, hat=1, bass=1, arp=1, pad=0.8)),
    (s['06'], STOP_A + STOP_D, dict(kick=1, snap=1, hat=1, bass=1, arp=1, pad=0.8)),
    (STOP_A + STOP_D, s['07'], dict(pad=0.5)),
    (s['07'], at('07', 4.0), dict(hat=0.5, arp=0.6, pad=0.6, filt=1)),
    (at('07', 4.0), s['08'], dict(kick=1, snap=0.9, hat=0.9, bass=1, arp=0.9, pad=0.8)),
    (s['08'], at('08', 9.5), dict(kick=1, snap=1, hat=1, bass=1, arp=1, pad=0.8)),
    (at('08', 9.5), at('08', 13.9), dict(kick=0.7, half=1, hat=0.5, bass=0.5, pad=0.9)),
    (at('08', 13.9), s['09'], dict(kick=1, snap=0.9, hat=1, bass=1, arp=0.9, pad=0.8)),
    (s['09'], s['10'], dict(kick=1, snap=1, hat=1, bass=1, arp=1, pad=0.9, lead=0.7)),
    (s['10'], LOGO, dict(kick=1, snap=1, hat=1, bass=1, arp=1, pad=1, lead=1)),
    (LOGO, DUR, dict(pad=0.9)),
]
BASS_PAT = [(0, 0, 3), (3, 0, 1), (6, 12, 1), (8, 0, 2), (11, 7, 1), (14, 12, 2)]
LEAD_MOTIF = [(0, 76, 4), (4, 74, 2), (6, 72, 2), (8, 69, 6), (16, 72, 3), (19, 74, 1), (20, 76, 4), (26, 79, 2), (28, 76, 4)]

nbars = int(np.ceil(DUR / BAR))
for bar in range(nbars):
    t0 = bar * BAR
    root, chord = PROG[bar % 4]
    for step in range(16):
        ts = t0 + step * S16
        sec = next((c for c in SECTIONS if c[0] <= ts + 1e-6 < c[1]), None)
        if sec is None:
            continue
        cfg = sec[2]
        sub16 = step % 4
        if cfg.get('kick'):
            if cfg.get('half'):
                if step in (0, 10):
                    place(kick(), ts, cfg['kick'] * 0.9)
            elif sub16 == 0:
                place(kick(), ts, cfg['kick'] * 0.95)
        if cfg.get('snap') and step in (4, 12):
            place(snap(), ts, cfg['snap'] * 0.38, pan=0.05, rev=0.22)
        if cfg.get('hat'):
            g = [0.42, 0.2, 0.34, 0.2][sub16] * cfg['hat']
            if step in (2, 10) and not cfg.get('half'):
                place(hat(True), ts, 0.06 * cfg['hat'], pan=0.3)
            else:
                place(hat(), ts, g * 0.15, pan=0.22 - 0.1 * (step % 2))
        if cfg.get('bass'):
            for (pos, semi, ln) in BASS_PAT:
                if pos == step:
                    place(bass(root - 12 + semi + 12, ln * S16 * 0.92, cfg['bass']), ts, 0.48 * cfg['bass'])
        if cfg.get('arp') and step % 2 == 0:
            n = chord[ARP[(step // 2) % 8]] + 12
            sig = fm_pluck(n, 0.26, 1.2 if cfg.get('filt') else 2.2)
            if cfg.get('filt'):
                sig = lp(sig, 1400)
            place(sig, ts, 0.13 * cfg['arp'], pan=-0.35 if step % 4 else 0.35, rev=0.3)
        if cfg.get('pad') and step == 0:
            place(pad(chord, BAR * 1.02), ts, 0.16 * cfg['pad'], rev=0.35, bus=PAD_BUS)
    sec = next((c for c in SECTIONS if c[0] <= t0 + 1e-6 < c[1]), None)
    if sec and sec[2].get('lead'):
        half = bar % 2
        for (pos, n, ln) in LEAD_MOTIF:
            if (pos // 16) == half:
                place(lead(n, ln * S16 * 0.92), t0 + (pos % 16) * S16, 0.12 * sec[2]['lead'], pan=-0.1, rev=0.4)

# ---------- キックに合わせた上物のポンプ ----------
pump = np.ones(N)
for k in np.arange(0, DUR, BEAT):
    i = int(k * SR)
    j = min(N, i + int(0.35 * SR))
    tk = np.arange(j - i) / SR
    pump[i:j] = np.minimum(pump[i:j], 1 - 0.5 * np.exp(-tk * 11))
L += PAD_BUS[0] * pump
R += PAD_BUS[1] * pump

# ---------- 残響 ----------
ir_t = tt(1.5)
ir = rng.standard_normal((2, len(ir_t))) * np.exp(-ir_t * 4.2)
ir = np.array([lp(x, 5200) for x in ir])
L += fftconvolve(REV[0], ir[0])[:N] * 0.11
R += fftconvolve(REV[1], ir[1])[:N] * 0.11

# ---------- 06: 手が止まる瞬間に音楽もテープストップ ----------
# 再生位置の速さを映像の減速（1 - smoothstep）と同じ曲線で 0 へ。止まったあとは無音（パッドだけが戻る）
a = int(STOP_A * SR)
b = int((STOP_A + STOP_D) * SR)
u = (np.arange(b - a) / SR) / STOP_D
pos = a + STOP_D * SR * (u - u ** 3 + u ** 4 / 2)
for ch in (L, R):
    seg = np.interp(pos, np.arange(N), ch)
    ch[a:b] = seg * (1 - u ** 3)
    # 止まった直後から次の区間の音（パッド）が始まるまでを消す
    pad_from = b
    ch[pad_from:pad_from + int(0.05 * SR)] *= np.linspace(0, 1, int(0.05 * SR))

# ---------- 効果音（映像の出来事に合わせる。秒は scenes の値） ----------
def sfx(sig, t, gain, pan=0.0, rev=0.0):
    place(sig, t, gain, pan, rev, bus=SFX)


for c in TL['cuts']:
    edge = STARTS[c['id']] + c['dur']
    if c['tr'] == 'cut':
        continue
    up = c['tr'] in ('up', 'diag')
    sfx(swoosh(0.55, up), edge - 0.52, 0.2 if c['tr'] != 'whip' else 0.3, pan=0.3 if c['tr'] in ('left', 'whip') else -0.3)
# 01: 帯の押し上げ、行への寄り（ライザー → 着地）
sfx(swoosh(0.7, True), at('01', 0.35), 0.12)
sfx(riser(1.4), at('01', 5.6), 0.26)
sfx(thud(60), s['02'], 0.4)
# 02: 下線、組み変わりのグリッチ、「なぜ？」の着地
sfx(tick(2400, 0.08), at('02', 0.95), 0.08, pan=-0.3)
for i in range(14):
    sfx(glitch(), at('02', 3.85 + i * 0.045), 0.06, pan=(i % 3 - 1) * 0.4)
sfx(boom(), at('02', 4.32), 0.5)
sfx(tick(1500), at('02', 6.15), 0.08, rev=0.3)
# 03: 「コード」の取り消し線、「理由」の横振り
sfx(tick(900, 0.1), at('03', 4.75), 0.1)
sfx(swoosh(0.35, False), at('03', 4.8), 0.2, pan=0.6)
sfx(thud(80), at('03', 5.2), 0.42)
# 04: 札の滑り込みと前に出る音、縦組みの言い切り
sfx(swoosh(0.4, True), at('04', 0.3), 0.1, pan=-0.5)
sfx(tick(1100), at('04', 0.6), 0.09, pan=-0.3)
sfx(swoosh(0.4, True), at('04', 3.15), 0.1, pan=0.5)
sfx(tick(1250), at('04', 3.5), 0.09, pan=0.3)
sfx(swoosh(0.6, False), at('04', 5.9), 0.12)
sfx(thud(66), at('04', 6.55), 0.35)
# 05: 「貼ってもいい。」の押し上げ、説明例の矢印、理由への寄り、終盤の留保
sfx(thud(90), at('05', 6.5), 0.32)
sfx(swoosh(0.6, True), at('05', 8.2), 0.12)
for x in (11.0, 13.4):
    sfx(tick(1700, 0.1), at('05', x), 0.08, pan=0.3)
sfx(riser(1.2), at('05', 14.9), 0.14)
sfx(tick(2000), at('05', 16.1), 0.1, rev=0.4)
sfx(swoosh(0.5, False), at('05', 16.8), 0.14)
# 06: 「書かない」の着地、窓の移動、止まった瞬間の小さな音
sfx(thud(84), at('06', 4.1), 0.4)
sfx(swoosh(0.8, False), at('06', 7.9), 0.12, pan=-0.3)
sfx(tick(700, 0.15), at('06', 11.15), 0.12)
# 07: 下駄が抜かれ、柱が落ちる
sfx(swoosh(0.6, False), at('07', 3.35), 0.12, pan=0.2)
sfx(boom(), at('07', 3.98), 0.55)
sfx(tick(1300), at('07', 9.0), 0.08, rev=0.3)
# 08: 「1週間」、アプリの図、問い
sfx(thud(76), at('08', 2.6), 0.36)
sfx(swoosh(0.5, False), at('08', 3.85), 0.1, pan=0.5)
for i in range(5):
    sfx(tick(1500 + 120 * i, 0.06), at('08', 6.9 + i * 0.32), 0.05, pan=0.4)
sfx(swoosh(0.7, True), at('08', 9.3), 0.1)
sfx(boom(), at('08', 10.15), 0.42)
sfx(tick(1000, 0.1), at('08', 13.9), 0.06)
# 09: 格子が 1 つにまとまり、「？」
sfx(swoosh(0.8, True), at('09', 2.35), 0.12)
sfx(thud(70), at('09', 3.1), 0.3)
sfx(tick(2200), at('09', 3.6), 0.08, rev=0.4)
# 10: 壁が割れる、最後の押し込み
sfx(swoosh(0.8, False), at('10', 3.5), 0.16)
sfx(riser(1.6), at('10', 4.7), 0.18)
sfx(boom(), at('10', 6.3), 0.5)
# エンドロゴ: o の着地（0.22・0.46・0.62 × 2.6 秒）、スライド（2.6 秒）、.work（3.0 秒〜）
for i, p in enumerate((0.22, 0.46, 0.62)):
    sfx(tick(900 - 150 * i), LOGO + p * 2.6, 0.2 * (1 - 0.25 * i), rev=0.2)
sfx(swoosh(0.6, False), LOGO + 2.6, 0.14)
for i in range(5):
    sfx(tick(2000 + 180 * i), LOGO + 3.0 + 0.08 * i, 0.06, pan=-0.4 + 0.2 * i)

L += SFX[0]
R += SFX[1]

# ---------- 仕上げ ----------
mix = np.stack([L, R], axis=1)
tail = np.clip((DUR - np.arange(N) / SR) / 1.2, 0, 1)
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
