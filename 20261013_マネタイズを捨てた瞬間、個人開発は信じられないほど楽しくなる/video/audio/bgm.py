"""BGM をローカルで合成する（追加課金なし・固定シード）。全 50.5 秒。

構成（plan.md「音楽」）:
  0–11.0   重い反復: Dマイナーの低音オスティナート、重いキック、時計のような金属音、看板・札の衝撃
  11.0–11.3 無音
  11.3–45  軽快な打楽器と短いアクセント: Cメジャー、シェイカー・クラップ・軽いキック、マリンバ風の旋律
  45–50.5  エンドロゴ: o のバウンド・スライド・.work の逐字に合わせた音、ロゴ終了で収める
拍の格子は 0 秒起点の 120BPM（映像側 anim.ts の BEAT と同じ）。

  .venv/bin/python audio/bgm.py   → audio/bgm.wav, public/bgm.m4a
"""
import subprocess
from pathlib import Path

import numpy as np
from scipy.signal import fftconvolve

SR = 48000
DUR = 50.5
BEAT = 0.5
N = int(SR * DUR)
ROOT = Path(__file__).resolve().parents[1]
rng = np.random.default_rng(20261013)

L = np.zeros(N)
R = np.zeros(N)
REV_L = np.zeros(N)  # 残響へ送る
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


def onepole(x, fc):
    a = np.exp(-2 * np.pi * fc / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a) * x[i] + a * acc
        y[i] = acc
    return y


def lp(x, fc):
    # 1 次ローパスを 2 回（-12dB/oct）。長い信号は FFT で処理
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
    for k, dt in ((1, 0), (1, detune), (1, -detune)):
        ph = (t * f * (1 + dt)) % 1.0
        out += 2 * ph - 1
    return out / 3


# ---------------- 楽器 ----------------
def kick(heavy=True):
    d = 0.55 if heavy else 0.3
    t = tt(d)
    f0, f1 = (140, 42) if heavy else (170, 58)
    f = f1 + (f0 - f1) * np.exp(-t * (28 if heavy else 40))
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.exp(-t * (6 if heavy else 11))
    click = np.exp(-t * 400) * rng.standard_normal(len(t)) * 0.15
    return np.tanh((np.sin(ph) * env + click) * (1.8 if heavy else 1.2))


def snare(d=0.25, tone=190):
    t = tt(d)
    n = hp(rng.standard_normal(len(t)), 1200) * np.exp(-t * 18)
    b = np.sin(2 * np.pi * tone * t) * np.exp(-t * 25)
    return 0.6 * n + 0.5 * b


def clap():
    t = tt(0.3)
    n = hp(rng.standard_normal(len(t)), 900)
    env = np.zeros_like(t)
    for o in (0, 0.011, 0.022):
        env += np.where(t >= o, np.exp(-(t - o) * 60), 0)
    env += np.exp(-t * 14) * 0.5
    return n * env * 0.5


def hat(open_=False):
    d = 0.25 if open_ else 0.06
    t = tt(d)
    n = hp(rng.standard_normal(len(t)), 7000)
    return n * np.exp(-t * (14 if open_ else 70)) * 0.5


def shaker():
    t = tt(0.08)
    n = hp(rng.standard_normal(len(t)), 5000)
    env = np.sin(np.pi * np.clip(t / 0.08, 0, 1)) ** 2
    return n * env * 0.3


def tick():  # 時計のような金属音（前半の反復）
    t = tt(0.12)
    s = sum(np.sin(2 * np.pi * f * t) for f in (2400, 3610, 5130)) / 3
    return s * np.exp(-t * 45)


def tom(f=110):
    t = tt(0.45)
    fr = f * (1 + 0.6 * np.exp(-t * 30))
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 7)


def marimba(n, d=0.5, bright=1.0):
    t = tt(d)
    f = midi(n)
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 7) + 0.35 * bright * np.sin(2 * np.pi * f * 4 * t) * np.exp(-t * 30) + 0.12 * np.sin(2 * np.pi * f * 10 * t) * np.exp(-t * 60)
    return s * (1 - np.exp(-t * 900))


def bell(n, d=1.6):
    t = tt(d)
    f = midi(n)
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * dc) for r, a, dc in ((1, 1, 2.2), (2.76, 0.5, 4), (5.4, 0.25, 7), (8.9, 0.12, 10)))
    return s * (1 - np.exp(-t * 600))


def pluck_bass(n, d=0.35):
    t = tt(d)
    s = saw(midi(n), d, 0.003)
    s = lp(s, 500) * np.exp(-t * 6)
    return s


def heavy_bass(n, d=0.24):
    t = tt(d)
    s = saw(midi(n), d, 0.006)
    s = lp(s, 260) * (1 - np.exp(-t * 200)) * np.exp(-t * 3)
    return np.tanh(s * 2.2) * 0.8


def pad(notes, d, fc=900, att=0.8, rel=1.0):
    t = tt(d)
    s = sum(saw(midi(n), d, 0.004) for n in notes) / len(notes)
    s = lp(s, fc)
    env = np.minimum(1, t / att) * np.minimum(1, (d - t) / rel)
    return s * np.clip(env, 0, 1)


def noise_sweep(d, f0, f1, up=True):
    t = tt(d)
    n = rng.standard_normal(len(t))
    # 帯域を時間で動かす（短い窓ごとに FFT で帯域通過）
    out = np.zeros_like(n)
    w = 2048
    hop = w // 2
    win = np.hanning(w)
    for i in range(0, len(n) - w, hop):
        k = i / max(1, len(n) - w)
        fc = f0 * (f1 / f0) ** k
        seg = n[i:i + w] * win
        F = np.fft.rfft(seg)
        fr = np.fft.rfftfreq(w, 1 / SR)
        F *= np.exp(-((np.log(fr + 1) - np.log(fc)) ** 2) / 0.5)
        out[i:i + w] += np.fft.irfft(F, w)
    env = (t / d) ** 2 if up else (1 - t / d) ** 2
    return out * env / (np.abs(out).max() + 1e-9)


def impact(low=45):
    t = tt(1.2)
    f = low * (1 + 1.5 * np.exp(-t * 18))
    b = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.5)
    n = lp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 9) * 0.5
    return np.tanh((b + n) * 1.6)


def whoosh(d=0.45, f0=300, f1=4000):
    s = noise_sweep(d, f0, f1, up=True)
    t = tt(d)
    return s * np.sin(np.pi * np.clip(t / d, 0, 1)) ** 0.7


# ---------------- 0–11.0 秒: 重い反復（Dマイナー） ----------------
A_END = 11.0
for b in range(int(A_END / BEAT)):
    t0 = b * BEAT
    place(kick(True), t0, 0.95)
    place(tick(), t0 + 0.25, 0.12 + 0.05 * (b % 2), pan=0.35)
    if b >= 10:
        place(hat(), t0 + 0.25, 0.25, pan=-0.3)
# 低音オスティナート（8 分）: D D F D | D D C A
osti = [38, 38, 41, 38, 38, 38, 36, 33]
for i in range(int(A_END / 0.25)):
    n = osti[i % 8]
    g = 0.42 if i % 2 == 0 else 0.3
    place(heavy_bass(n), i * 0.25, g)
# 持続音（Dm → Bb → Dm → A）
for t0, notes in ((0, [50, 53, 57]), (4.0, [46, 50, 53]), (6.0, [50, 53, 57]), (8.0, [45, 49, 52]), (9.0, [50, 53, 57])):
    d = {0: 4.0, 4.0: 2.0, 6.0: 2.0, 8.0: 1.0, 9.0: 2.0}[t0]
    place(pad(notes, d, fc=700, att=0.6 if t0 == 0 else 0.15, rel=0.3), t0, 0.22, rev=0.3)
# 看板の突進（2.9 / 3.7 から、着地 3.24 / 4.04）
place(noise_sweep(0.36, 200, 3000), 2.88, 0.35)
place(impact(42), 3.24, 0.8, rev=0.4)
place(noise_sweep(0.36, 200, 3000), 3.68, 0.35)
place(impact(48), 4.04, 0.85, rev=0.4)
# 看板の縁が横切る（4.72–5.14）
place(whoosh(0.42, 400, 5000), 4.72, 0.45, pan=0.5)
# 札が落ちる 7.0 / 7.5 / 8.0（着地は +0.3）
for i, t0 in enumerate((7.0, 7.5, 8.0)):
    place(tom(95 - i * 10), t0 + 0.25, 0.55, pan=(-0.3, 0.3, 0)[i], rev=0.2)
# ハードルが跳ね上がる 9.62 / 10.12 / 10.62
for i, t0 in enumerate((9.62, 10.12, 10.62)):
    place(pad([62 + i * 3, 65 + i * 3, 69 + i * 3], 0.3, fc=2500, att=0.005, rel=0.2), t0 - 0.02, 0.32)
    place(impact(55 + i * 8), t0, 0.4)
# 10.0–11.0 スネアのロール（加速）
k = 0.0
tt0 = 10.0
while tt0 < A_END - 0.03:
    place(snare(0.12), tt0, 0.18 + 0.25 * (tt0 - 10.0))
    tt0 += 0.125 if tt0 < 10.5 else 0.0625

# 11.0 秒で前半の残響ごと切る（11.0–11.3 は完全な無音）
CUT = int(11.0 * SR)
fade = int(0.008 * SR)
for arr in (L, R, REV_L, REV_R):
    arr[CUT - fade:CUT] *= np.linspace(1, 0, fade)
    arr[CUT:] = 0

# ---------------- 11.3–45 秒: 軽快（Cメジャー） ----------------
B0 = 11.3
# 11.3 「自分が使う」の鐘
for n, dly in ((72, 0), (76, 0.02), (79, 0.04), (84, 0.06)):
    place(bell(n, 2.2), B0 + dly, 0.22, pan=(n - 78) / 12, rev=0.5)
place(kick(False), B0, 0.6)
# 進行（1 小節 2 秒）: C G Am F
prog_ = [(48, [60, 64, 67]), (43, [59, 62, 67]), (45, [60, 64, 69]), (41, [60, 65, 69])]
melody = [72, 76, 79, 76, 74, 79, 77, 74, 72, 76, 81, 79, 77, 76, 74, 72]
TEND = 45.0


def lane_on(t):
    # 32.6–33.2 は「静かに閉じる」間として打楽器を薄くする
    if 32.6 <= t < 33.2:
        return 0.25
    return 1.0


b = int(np.ceil(11.5 / BEAT))
while b * BEAT < TEND:
    t0 = b * BEAT
    bar_i = int((t0 - 11.5) // 2.0)
    intro = t0 < 14.3  # カット3: 軽い予告のみ
    g = lane_on(t0)
    beat_in_bar = b % 4
    if not intro:
        if beat_in_bar in (0, 2):
            place(kick(False), t0, 0.55 * g)
        if beat_in_bar in (1, 3):
            place(clap(), t0, 0.32 * g, pan=0.05, rev=0.15)
        for s16 in range(4):
            place(shaker(), t0 + s16 * 0.125, (0.22 if s16 % 2 else 0.12) * g, pan=0.4)
        place(hat(open_=(beat_in_bar == 3)), t0 + 0.25, 0.18 * g, pan=-0.35)
        # ベース（8 分の弾み）
        root = prog_[(bar_i) % 4][0]
        for e in range(2):
            place(pluck_bass(root + (12 if e else 0)), t0 + e * 0.25, 0.32 * g)
    else:
        place(shaker(), t0, 0.14, pan=0.4)
        place(shaker(), t0 + 0.25, 0.2, pan=0.4)
    b += 1

# 和音の下地とマリンバ旋律（カット4 以降）
t0 = 14.0
i = 0
while t0 < TEND:
    root, notes = prog_[int((t0 - 11.5) // 2.0) % 4]
    d = 2.0
    place(pad(notes, min(d, TEND - t0), fc=1600, att=0.05, rel=0.4), t0, 0.1, rev=0.3)
    t0 += d
t0 = 14.5
i = 0
while t0 < TEND - 0.25:
    if lane_on(t0) == 1.0 and not (43.0 <= t0 < 43.3):
        n = melody[i % len(melody)]
        if i % 4 != 3:
            place(marimba(n, 0.45), t0, 0.2, pan=-0.2 + 0.1 * (i % 3), rev=0.25)
        if i % 8 == 6:
            place(marimba(n + 12, 0.3, 0.6), t0 + 0.25, 0.1, pan=0.3, rev=0.25)
    t0 += 0.5
    i += 1

# ---- アクセント（映像の出来事に合わせる） ----
REACT = 14.70  # カット4: つまみが押されて道具が反応（cuts.tsx の CUT4.reactT と同じ計算）
place(bell(88, 1.0), REACT, 0.16, pan=-0.2, rev=0.4)
place(marimba(84, 0.4), REACT, 0.25, pan=-0.2)
place(marimba(91, 0.4), REACT + 0.55, 0.22, pan=-0.5, rev=0.3)  # 輪が「自分」へ届く
place(marimba(79, 0.3), 17.0, 0.18, pan=0.5)  # 時計
place(marimba(83, 0.3), 17.12, 0.15, pan=0.5)
place(marimba(76, 0.3), 18.3, 0.18, pan=0.6)  # 雲
place(whoosh(0.5, 300, 6000), 19.45, 0.4, pan=0.6)  # 道具が右へ加速・帯
place(whoosh(0.6, 6000, 400), 20.0, 0.35, pan=-0.6)  # ホイップパン
place(kick(False), 20.7, 0.6)
place(bell(84, 1.2), 20.7, 0.14, rev=0.4)  # URL カード着地
for j, n in enumerate((79, 84, 88)):
    place(marimba(n, 0.3), 21.7 + j * 0.15, 0.18, pan=0.4 + 0.2 * j)  # 送る
for j in range(9):
    place(marimba((72, 74, 76, 77, 79, 81, 83, 84, 86)[j], 0.3), 22.8 + j * 0.05 + 0.1, 0.12, pan=-0.4 + 0.1 * j, rev=0.2)  # マスの展開
for at in (24.3, 24.8, 25.3):
    place(bell(91, 0.8), at, 0.1, pan=0.4, rev=0.3)  # ○ の記入
for j in range(6):
    place(marimba(84 - j * 2, 0.25), 26.25 + j * 0.06, 0.1, pan=0.3)  # マスが落ちる
place(marimba(72, 0.4), 27.0, 0.22)  # 道具の着地
place(whoosh(0.45, 400, 5000), 31.85, 0.35, pan=0.4)  # 帯
place(tick(), 32.55, 0.25, pan=0.3)  # 閉じるを押す
place(pad([72, 76, 79], 0.6, fc=1200, att=0.01, rel=0.55), 32.7, 0.12, rev=0.5)  # 静かに閉じる
for n, dly in ((72, 0), (76, 0.03), (79, 0.06), (84, 0.09), (88, 0.12)):
    place(bell(n, 1.8), 33.2 + dly, 0.15, pan=(n - 80) / 14, rev=0.5)  # 楽しさ
place(impact(70), 33.2, 0.3)
place(whoosh(0.6, 5000, 300), 34.4, 0.3, pan=-0.3)  # 奥へ抜く
place(whoosh(0.4, 300, 4000), 35.0, 0.3, pan=-0.6)  # M3 の再登場
place(whoosh(0.45, 400, 5000), 38.85, 0.32, pan=0.0)  # 帯
place(kick(False), 39.1, 0.5)
place(bell(86, 1.2), 39.1, 0.12, rev=0.4)
for j, n in enumerate((84, 88, 91, 96)):
    place(bell(n, 0.8), 41.4 + j * 0.07, 0.08, pan=0.2 * j - 0.3, rev=0.4)  # 道具が育つ
place(impact(50), 43.0, 0.45, rev=0.4)  # 墨色のワイプ
place(pad([48, 55, 60, 64], 2.0, fc=1100, att=0.1, rel=0.3), 43.0, 0.2, rev=0.4)
place(noise_sweep(0.2, 500, 8000), 44.8, 0.3)  # ライムへ

# ---------------- 45–50.5 秒: エンドロゴ ----------------
LOGO = 45.0
place(kick(False), LOGO, 0.6)
place(impact(60), LOGO, 0.35, rev=0.3)
for n, dly in ((60, 0), (64, 0), (67, 0), (72, 0)):
    place(bell(n, 3.5), LOGO + dly, 0.1, rev=0.6)
# o の落下・バウンド（DUR 2.6 秒のうち 0.22 / 0.46 / 0.62 で接地）
for k_, (at, g) in enumerate(((0.22, 0.32), (0.46, 0.2), (0.62, 0.12))):
    place(marimba(79 - k_ * 2, 0.35), LOGO + at * 2.6, g, rev=0.3)
place(whoosh(0.6, 2500, 400), LOGO + 2.6, 0.18)  # 全体の左スライド
for j in range(5):
    place(marimba((84, 86, 88, 91, 96)[j], 0.3, 0.7), LOGO + 3.0 + 0.08 * j, 0.12, pan=-0.3 + 0.15 * j, rev=0.4)  # .work の逐字
place(pad([60, 64, 67, 72], 2.4, fc=1500, att=0.05, rel=1.4), LOGO + 3.0, 0.16, rev=0.5)
place(bell(84, 2.4), LOGO + 3.4, 0.08, rev=0.6)

# ---------------- 残響・仕上げ ----------------
irn = int(1.6 * SR)
ir_t = np.arange(irn) / SR
ir_l = rng.standard_normal(irn) * np.exp(-ir_t * 3.2)
ir_r = rng.standard_normal(irn) * np.exp(-ir_t * 3.2)
ir_l = lp(ir_l, 5000)
ir_r = lp(ir_r, 5000)
wet_l = fftconvolve(REV_L, ir_l)[:N] * 0.06
wet_r = fftconvolve(REV_R, ir_r)[:N] * 0.06
L += wet_l
R += wet_r
# 無音区間は残響も含めて 0
L[CUT:int(11.3 * SR)] = 0
R[CUT:int(11.3 * SR)] = 0
mix = np.stack([L, R], 1)
# 前半の重さと後半の軽快さで音量差が開きすぎないよう、後半を持ち上げる（勢いは弱めない）
mix[:CUT] *= 0.8
mix[int(11.3 * SR):] *= 1.9
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
# 終わり: ロゴの保持（49.0–50.5）でフェードし、50.5 秒で収める
tail0 = int(49.2 * SR)
mix[tail0:] *= np.linspace(1, 0, N - tail0)[:, None] ** 1.5
peak = np.abs(mix).max()
mix = mix / peak * 10 ** (-4.4 / 20)  # 統合ラウドネス約 -14 LUFS
out = ROOT / 'audio' / 'bgm.wav'
pcm = (mix * 32767).astype(np.int16)
import wave

with wave.open(str(out), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(out), '-c:a', 'aac', '-b:a', '256k', str(ROOT / 'public' / 'bgm.m4a')], check=True)
print('wrote', out, f'{N / SR:.2f}s')
