"""BGM をローカルで合成する（追加課金なし・固定シード）。全 195 秒（エンドロゴの保持終了まで）。

音楽ブリーフ（../plan.html「音楽と、場面を渡す音」）:
  硬質で前へ進むエレクトロニックなリズム。乾いたドラム・短いベース・輪郭のあるシンセ。140BPM・4拍子。
  0–60     冒頭から拍。数字の入れ替え（3）、二つの領域への分割（4）にアクセント
  60–71    カット7「以前」: 音数を減らして余地を作る。レビューの拍（素材と同じ 1.5 秒周期）を金属音で刻む
  71–87    カット8「現在」: 細かなアクセントを増やして投入の密度。レビューの拍は同じ周期のまま
  87–113   物量の結論と比重の移動
  113–128  カット11の問い: 減音、116.95–117.25 秒に短い切れ目
  128–171  線がつながる推進力（12–14）
  171–189.5 判断が戻る解放感（長調寄りの和音、ファンファーレにはしない）
  189.5–195 エンドロゴ: o の着地・スライド・.work の出現に軽いアクセント、最後 1.5 秒で余韻を収める
拍の格子は 0 秒起点の 140BPM（映像側 src/lib/anim.ts の BPM と同じ）。

  .venv/bin/python audio/bgm.py   → audio/bgm.wav, public/bgm.m4a
"""
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy.signal import fftconvolve

SR = 48000
DUR = 195.0
BPM = 140
BEAT = 60 / BPM
BAR = BEAT * 4
N = int(SR * DUR)
ROOT = Path(__file__).resolve().parents[1]
rng = np.random.default_rng(20261015)

L = np.zeros(N)
R = np.zeros(N)
REV_L = np.zeros(N)
REV_R = np.zeros(N)


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def place(sig, t, gain=1.0, pan=0.0, rev=0.0):
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
    L[i:i + len(s)] += s * gl
    R[i:i + len(s)] += s * gr
    if rev:
        REV_L[i:i + len(s)] += s * gl * rev
        REV_R[i:i + len(s)] += s * gr * rev


def tt(d):
    return np.arange(int(d * SR)) / SR


def lp(x, fc):
    n = len(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    h = 1 / (1 + (f / fc) ** 4) ** 0.5
    return np.fft.irfft(np.fft.rfft(x) * h, n)


def hp(x, fc):
    n = len(x)
    f = np.fft.rfftfreq(n, 1 / SR)
    h = (f / fc) ** 2 / (1 + (f / fc) ** 4) ** 0.5
    return np.fft.irfft(np.fft.rfft(x) * h, n)


def saw(f, d, detune=0.0):
    t = tt(d)
    out = np.zeros_like(t)
    for dt in (0, detune, -detune):
        ph = (t * f * (1 + dt)) % 1.0
        out += 2 * ph - 1
    return out / 3


def square(f, d, pw=0.5):
    t = tt(d)
    return np.where((t * f) % 1.0 < pw, 1.0, -1.0)


# ---------------- 楽器（乾いた音色） ----------------
def kick(power=1.0):
    t = tt(0.32)
    f = 48 + 110 * np.exp(-t * 38)
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.exp(-t * 9)
    click = np.exp(-t * 500) * rng.standard_normal(len(t)) * 0.2
    return np.tanh((np.sin(ph) * env + click) * 1.6 * power)


def snare():
    t = tt(0.2)
    n = hp(rng.standard_normal(len(t)), 1500) * np.exp(-t * 26)
    b = np.sin(2 * np.pi * 200 * t) * np.exp(-t * 32)
    return 0.65 * n + 0.45 * b


def clap():
    t = tt(0.22)
    n = hp(rng.standard_normal(len(t)), 1000)
    env = np.zeros_like(t)
    for o in (0, 0.009, 0.019):
        env += np.where(t >= o, np.exp(-(t - o) * 70), 0)
    env += np.exp(-t * 20) * 0.4
    return n * env * 0.5


def hat(open_=False):
    d = 0.18 if open_ else 0.04
    t = tt(d)
    n = hp(rng.standard_normal(len(t)), 8000)
    return n * np.exp(-t * (18 if open_ else 110)) * 0.5


def metal():  # レビューの拍（乾いた金属音）
    t = tt(0.16)
    s = sum(np.sin(2 * np.pi * f * t) for f in (1870, 2930, 4410)) / 3
    return s * np.exp(-t * 30)


def bass(n, d):
    t = tt(d)
    s = saw(midi(n), d, 0.004) + 0.5 * square(midi(n - 12), d)
    s = lp(s, 420) * (1 - np.exp(-t * 300)) * np.exp(-t * 7)
    return np.tanh(s * 2.4) * 0.7


def stab(notes, d=0.16, fc=2600):
    t = tt(d)
    s = sum(saw(midi(n), d, 0.006) for n in notes) / len(notes)
    return lp(s, fc) * np.exp(-t * 16) * (1 - np.exp(-t * 800))


def arp(n, d=0.11, fc=3500):
    t = tt(d)
    s = square(midi(n), d, 0.3) * 0.6 + saw(midi(n), d) * 0.4
    return lp(s, fc) * np.exp(-t * 22) * (1 - np.exp(-t * 900))


def pad(notes, d, fc=1400, att=0.4, rel=0.8):
    t = tt(d)
    s = sum(saw(midi(n), d, 0.005) for n in notes) / len(notes)
    s = lp(s, fc)
    env = np.minimum(1, t / att) * np.minimum(1, (d - t) / rel)
    return s * np.clip(env, 0, 1)


def bell(n, d=1.2):
    t = tt(d)
    f = midi(n)
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dc) for r, a, dc in ((1, 1, 3), (2.76, 0.45, 5), (5.4, 0.2, 8)))
    return s * (1 - np.exp(-t * 600))


def impact(fc=80):
    t = tt(0.9)
    f = fc * (1 + 2 * np.exp(-t * 20))
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5)
    n = lp(rng.standard_normal(len(t)), 900) * np.exp(-t * 9) * 0.6
    return np.tanh((s + n) * 1.4)


def whoosh(d, f0, f1):
    t = tt(d)
    n = rng.standard_normal(len(t))
    out = np.zeros_like(t)
    seg_n = 8
    for k in range(seg_n):
        a = k * len(t) // seg_n
        b = (k + 1) * len(t) // seg_n
        fc = f0 * (f1 / f0) ** ((k + 0.5) / seg_n)
        out[a:b] = lp(n, fc)[a:b]
    env = np.sin(np.pi * np.clip(t / d, 0, 1)) ** 2
    return out * env


def riser(d, f0=300, f1=5000):
    return whoosh(d, f0, f1) * np.linspace(0.2, 1, int(d * SR))


# ---------------- 和声 ----------------
MINOR = [(57, [57, 60, 64]), (53, [53, 57, 60]), (48, [48, 52, 55, 60]), (55, [55, 59, 62])]  # Am F C G
RELEASE = [(53, [53, 57, 60, 64]), (55, [55, 59, 62, 67]), (57, [57, 60, 64, 67]), (48, [48, 52, 55, 64])]  # Fmaj7 G Am7 C

# 区間ごとの密度（0..1）。拍の格子は全体で 1 つ
def sect(t):
    if t < 60:
        return 'drive'
    if t < 71:
        return 'before'
    if t < 87:
        return 'now'
    if t < 113:
        return 'drive'
    if t < 128:
        return 'ask'
    if t < 171:
        return 'push'
    if t < 189.5:
        return 'release'
    return 'logo'


GAP = (116.95, 117.25)  # カット11の短い切れ目


def in_gap(t):
    return GAP[0] - 0.02 <= t < GAP[1]


nbeats = int(189.5 / BEAT)
for b in range(nbeats):
    t = b * BEAT
    if in_gap(t) or in_gap(t + BEAT * 0.5):
        continue
    s = sect(t)
    bar = int(t / BAR)
    beat_in_bar = b % 4
    prog = RELEASE if s == 'release' else MINOR
    root, chord = prog[bar % 4]
    intro = t < 1.7  # 冒頭の 1 小節目はキックとベースだけ
    # キック
    if s in ('drive', 'now', 'push', 'release') or (s == 'before' and beat_in_bar in (0, 2)) or (s == 'ask' and beat_in_bar == 0):
        place(kick(1.0 if s != 'release' else 0.85), t, 0.9)
    # スネア／クラップ（2・4拍）
    if beat_in_bar in (1, 3) and not intro and s != 'ask':
        if s == 'before':
            place(snare(), t, 0.25, pan=0.05)
        else:
            place(snare(), t, 0.42, pan=0.05)
            place(clap(), t, 0.22 if s != 'release' else 0.3, pan=-0.1, rev=0.15)
    # ハイハット
    if s != 'before' or beat_in_bar in (1, 3):
        place(hat(), t + BEAT / 2, 0.32 if s != 'ask' else 0.15, pan=0.35)
    if s in ('now', 'push'):
        place(hat(), t + BEAT / 4, 0.16, pan=-0.35)
        place(hat(), t + 3 * BEAT / 4, 0.16, pan=-0.35)
    if s == 'drive' and beat_in_bar == 3:
        place(hat(True), t + BEAT / 2, 0.16, pan=0.3)
    # 短いベース（8分の裏を中心に）
    if s != 'ask' or beat_in_bar == 0:
        bpat = (0, 0.5) if s in ('before',) else (0, 0.5, 0.75) if s == 'now' else (0.5,) if s == 'release' else (0, 0.5)
        if s == 'before' and beat_in_bar in (1, 3):
            bpat = ()
        for o in bpat:
            n = root - 12 + (12 if (s == 'now' and o == 0.75) else 0)
            place(bass(n, BEAT * 0.42), t + o * BEAT, 0.42 if s != 'release' else 0.34)
    # シンセのスタブ（2拍目の裏、輪郭）
    if s in ('drive', 'push') and beat_in_bar in (1, 3) and not intro:
        place(stab([n + 12 for n in chord[:3]]), t + BEAT * 0.5, 0.13, pan=-0.25, rev=0.2)
    # 16分のアルペジオ（投入の密度）
    if s == 'now' or (s == 'push' and t >= 141):
        for j in range(4):
            n = chord[(beat_in_bar * 4 + j) % len(chord)] + 24
            place(arp(n), t + j * BEAT / 4, 0.07 if s == 'now' else 0.05, pan=-0.4 + 0.25 * j)
    if s == 'drive' and t >= 15 and t < 60:
        for j in (0, 2):
            n = chord[(beat_in_bar + j) % len(chord)] + 24
            place(arp(n, 0.13), t + j * BEAT / 2, 0.05, pan=0.4 - 0.4 * j)
    # 問いの区間: 低いパッドとまばらな鈴
    if s == 'ask' and beat_in_bar == 0:
        place(pad([n + 12 for n in chord], BAR, fc=900, att=0.3, rel=0.6), t, 0.08, rev=0.4)
    # 解放の区間: 明るいパッドと鈴
    if s == 'release' and beat_in_bar == 0:
        place(pad([n + 12 for n in chord], BAR, fc=2200, att=0.2, rel=0.5), t, 0.1, rev=0.5)
        place(bell(chord[-1] + 24, 1.0), t, 0.05, pan=0.3, rev=0.4)
    if s == 'push' and beat_in_bar == 0 and t >= 128:
        place(pad([n + 12 for n in chord], BAR, fc=1600, att=0.1, rel=0.4), t, 0.05, rev=0.3)

# ---------------- レビューの拍（素材と同じ 1.5 秒周期、カット7・8で同じ間隔） ----------------
for t0, dur in ((60.0, 11.0), (71.0, 16.0)):
    k = 0
    while t0 + 0.2 + 1.5 * k < t0 + dur:
        place(metal(), t0 + 0.2 + 1.5 * k, 0.2, pan=0.45, rev=0.15)
        k += 1

# ---------------- 映像の出来事へのアクセント ----------------
EV = [
    (4.3, 'impact', 0.3),  # 「見る」が手前へ
    (7.3, 'whoosh', 0.3),  # 大きな球が横切る
    (8.0, 'impact', 0.25),
    (11.0, 'drop', 0.25),  # 根拠が抜ける
    (12.3, 'impact', 0.3),  # ワークスロップ
    (14.4, 'riser', 0.25),
    (15.35, 'impact', 0.3),  # 数字の入れ替え
    (19.4, 'impact', 0.3),
    (23.4, 'impact', 0.3),
    (27.5, 'drop', 0.2),  # 検証は重い
    (30.0, 'whoosh', 0.25),  # 一歩引く
    (37.0, 'impact', 0.3),  # 二つの領域
    (41.2, 'riser', 0.2),
    (49.2, 'whoosh', 0.25),  # 引き戻す
    (50.4, 'impact', 0.25),  # 制作側
    (57.35, 'impact', 0.25),  # 誰か
    (59.3, 'riser', 0.2),
    (70.55, 'whoosh', 0.3),  # ゲートへ寄る → 現在
    (71.0, 'impact', 0.32),
    (87.05, 'whoosh', 0.25),  # 映像窓へ縮む
    (89.95, 'impact', 0.35),  # 「球持ち」だ
    (96.6, 'impact', 0.3),  # 物量
    (99.3, 'whoosh', 0.22),
    (105.0, 'whoosh', 0.18),  # カードが移る
    (112.2, 'riser', 0.2),
    (113.95, 'impact', 0.32),  # なぜ？が押し入る
    (117.25, 'impact', 0.25),  # 切れ目の後
    (120.6, 'whoosh', 0.3),  # 枠が崩れる
    (121.15, 'impact', 0.32),  # 目的
    (128.4, 'impact', 0.28),  # 品質を保証して出すこと
    (140.3, 'riser', 0.22),
    (141.3, 'impact', 0.3),  # 先に、見なくても回る環境を
    (148.65, 'impact', 0.22),
    (156.1, 'whoosh', 0.28),  # 出口の線
    (163.85, 'impact', 0.3),  # こんな場合は？
    (170.3, 'whoosh', 0.25),  # 改善ルートへ
    (171.0, 'impact', 0.22),
    (183.45, 'impact', 0.25),  # 組織と自分の成長
    (188.85, 'riser', 0.25),  # ライムへ払う
]
for at, kind, g in EV:
    if kind == 'impact':
        place(impact(), at, g, rev=0.25)
    elif kind == 'whoosh':
        place(whoosh(0.5, 400, 6000), at - 0.1, g, pan=0.2)
    elif kind == 'riser':
        place(riser(0.7), at - 0.1, g)
    elif kind == 'drop':
        place(whoosh(0.6, 5000, 200), at, g, pan=-0.2)
# 枝分かれ（14）と線の経路（13・15）に短い鈴
for j, at in enumerate((165.6, 165.9, 166.2, 167.1)):
    place(bell(81 + 3 * j, 0.8), at, 0.08, pan=-0.5 + 0.33 * j, rev=0.4)
for j in range(4):
    place(bell(76 + 2 * j, 0.6), 142.3 + 0.6 * j, 0.06, pan=0.5, rev=0.3)

# ---------------- 189.5–195 秒: エンドロゴ ----------------
LOGO = 189.5
place(kick(0.9), LOGO, 0.7)
place(pad([60, 64, 67, 72], 5.0, fc=1800, att=0.05, rel=2.0), LOGO, 0.1, rev=0.5)
for k_, (at, g) in enumerate(((0.22, 0.25), (0.46, 0.16), (0.62, 0.1))):  # o の接地（DUR 2.6 秒の割合）
    place(bell(79 - k_ * 2, 0.5), LOGO + at * 2.6, g, rev=0.3)
place(whoosh(0.6, 2500, 400), LOGO + 2.6, 0.16)  # 全体の左スライド
for j in range(5):
    place(bell((84, 86, 88, 91, 96)[j], 0.5), LOGO + 3.0 + 0.08 * j, 0.07, pan=-0.3 + 0.15 * j, rev=0.4)  # .work の逐字

# ---------------- 残響・仕上げ ----------------
irn = int(1.4 * SR)
ir_t = np.arange(irn) / SR
ir_l = lp(rng.standard_normal(irn) * np.exp(-ir_t * 3.6), 5000)
ir_r = lp(rng.standard_normal(irn) * np.exp(-ir_t * 3.6), 5000)
L += fftconvolve(REV_L, ir_l)[:N] * 0.05
R += fftconvolve(REV_R, ir_r)[:N] * 0.05
g0, g1 = int(GAP[0] * SR), int(GAP[1] * SR)
L[g0:g1] = 0
R[g0:g1] = 0
mix = np.stack([L, R], 1)
mix = np.tanh(mix * 1.2) / np.tanh(1.2)
# 打楽器の頂点だけを柔らかく抑える（音量を稼ぐための圧縮ではなく、符号化後の真のピーク対策）
pk = np.abs(mix).max()
mix = mix / pk
mix = np.tanh(mix * 1.8) / np.tanh(1.8)
# 終わり: ロゴの保持（193.5–195）で余韻を収める
tail0 = int(193.4 * SR)
mix[tail0:] *= np.linspace(1, 0, N - tail0)[:, None] ** 1.6
peak = np.abs(mix).max()
mix = mix / peak * 10 ** (-1.0 / 20)
out = ROOT / 'audio' / 'bgm.wav'
pcm = (mix * 32767).astype(np.int16)
with wave.open(str(out), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
(ROOT / 'public').mkdir(exist_ok=True)
# 統合ラウドネス -14 LUFS へ一定の利得で合わせる（無音区間・フェードの形を保つ）
import re

meas = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(out), '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
integrated = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', meas)[-1])
gain_db = min(-14.0 - integrated, 0.0)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out), '-af', f'volume={gain_db:.2f}dB,alimiter=limit=0.63:level=false:attack=1:release=40', '-ar', '48000', '-c:a', 'aac', '-b:a', '256k', str(ROOT / 'public' / 'bgm.m4a')], check=True)
print('wrote', out, f'{N / SR:.2f}s', f'gain {gain_db:+.2f} dB')
