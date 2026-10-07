"""「いつか使うかもしれない」はコストになる — 企画専用BGMのローカル合成スクリプト。

外部音源・サンプル・過去企画の曲は一切使わず、numpy/scipy の発振器・ノイズ・フィルタだけで
全パートを合成する。構成は映像と共有する src/lib/structure.json（120BPM, 78秒）に従う。

  圧迫（0–22s）: 4つ打ち＋8分のポンプするベース、裏拍スタブのフィルタが小節ごとに閉じる
  転換（22–34s）: 停止→インパクト→ハーフタイム、ベル主題、28sの裏返しでヒット
  解放（34–54s）: F–C–Dm–Bb へ明るく展開、シンコペーションのベース、リード
  留保（54–66s）: 58–62s は低音を抜いて疑問の間、62sで戻る
  結論（66–78s）: 全パート、76sの最終ヒット（Fadd9）を残響で着地

実行: audio/.venv/bin/python audio/bgm_build.py  → public/bgm.wav, public/bgm.mp3
"""

import json
import os
import subprocess
import sys

import numpy as np
from scipy import signal

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
STRUCT = json.load(open(os.path.join(ROOT, "src", "lib", "structure.json"), encoding="utf-8"))

SR = 44100
BPM = STRUCT["bpm"]
BEAT = 60.0 / BPM
BAR = BEAT * 4
S16 = BEAT / 4
TOTAL = float(STRUCT["totalSec"])
N = int(TOTAL * SR)
rng = np.random.default_rng(20261007)

# 1小節＝1コード。（ルートMIDI, 構成音の半音オフセット）
CH = {
    "Dm": (50, [0, 3, 7]),
    "Bb": (46, [0, 4, 7]),
    "Gm": (43, [0, 3, 7]),
    "A": (45, [0, 4, 7]),
    "F": (41, [0, 4, 7]),
    "C": (48, [0, 4, 7]),
    "Fadd9": (41, [0, 4, 7, 14]),
}
PROG = (
    ["Dm", "Dm", "Bb", "C", "A"]  # 0–10 雪崩れ
    + ["Dm", "Bb", "Gm", "A", "Dm", "A"]  # 10–22 圧縮
    + ["Bb", "F", "Gm", "Dm", "Bb", "C"]  # 22–34 裏返し
    + ["F", "C", "Dm", "Bb", "F"]  # 34–44 隙間
    + ["Dm", "Bb", "F", "C", "C"]  # 44–54 前進・整列
    + ["Bb", "F", "C", "Dm", "Bb", "C"]  # 54–66 RAGの留保
    + ["F", "C", "Dm", "Bb", "C", "Fadd9"]  # 66–78 結論
)
assert len(PROG) == int(TOTAL / BAR), len(PROG)


def chord_at(t):
    return CH[PROG[min(int(t // BAR), len(PROG) - 1)]]


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12.0)


def in_range(t, a, b):
    return a <= t < b


# ---------------------------------------------------------------- 発振器
def polyblep_saw(freq, n, phase0=0.0):
    dt = np.full(n, freq / SR) if np.isscalar(freq) else freq / SR
    p = (phase0 + np.cumsum(dt)) % 1.0
    y = 2 * p - 1
    m1 = p < dt
    t1 = p[m1] / dt[m1]
    y[m1] -= t1 + t1 - t1 * t1 - 1
    m2 = p > 1 - dt
    t2 = (p[m2] - 1) / dt[m2]
    y[m2] -= t2 * t2 + t2 + t2 + 1
    return y


def sine(freq, n, phase0=0.0):
    dt = np.full(n, freq / SR) if np.isscalar(freq) else freq / SR
    return np.sin(2 * np.pi * (phase0 + np.cumsum(dt)))


def adsr(n, a, d, s, r, hold=None):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    h_n = n - r_n if hold is None else int(hold * SR)
    env = np.zeros(n)
    idx = np.arange(n)
    att = idx < a_n
    env[att] = idx[att] / max(a_n, 1)
    dec = (idx >= a_n) & (idx < a_n + d_n)
    env[dec] = 1 - (1 - s) * (idx[dec] - a_n) / max(d_n, 1)
    sus = (idx >= a_n + d_n) & (idx < h_n)
    env[sus] = s
    rel = idx >= h_n
    if rel.any():
        start = env[h_n - 1] if h_n > 0 else s
        env[rel] = start * np.maximum(0, 1 - (idx[rel] - h_n) / max(r_n, 1))
    return env


def lp(x, cutoff, order=2):
    cutoff = min(max(cutoff, 20), SR * 0.45)
    sos = signal.butter(order, cutoff, "low", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def hp(x, cutoff, order=2):
    sos = signal.butter(order, cutoff, "high", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], "band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lp_auto(x, cut_fn, block=0.05):
    """時間とともに変わるカットオフ。ブロックごとに状態を引き継いで滑らかに。"""
    out = np.zeros_like(x)
    bn = int(block * SR)
    zi = None
    for s0 in range(0, len(x), bn):
        c = min(max(cut_fn(s0 / SR), 40), SR * 0.45)
        sos = signal.butter(2, c, "low", fs=SR, output="sos")
        if zi is None:
            zi = signal.sosfilt_zi(sos) * 0
        seg, zi = signal.sosfilt(sos, x[s0 : s0 + bn], zi=zi)
        out[s0 : s0 + bn] = seg
    return out


class Bus:
    def __init__(self):
        self.L = np.zeros(N + SR * 4)
        self.R = np.zeros(N + SR * 4)

    def add(self, t, sig, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if i >= N:
            return
        if sig.ndim == 1:
            l = sig * np.sqrt((1 - pan) / 2) * np.sqrt(2)
            r = sig * np.sqrt((1 + pan) / 2) * np.sqrt(2)
        else:
            l, r = sig[0], sig[1]
        j = min(i + len(l), len(self.L))
        self.L[i:j] += gain * l[: j - i]
        self.R[i:j] += gain * r[: j - i]

    def st(self):
        return np.stack([self.L[:N], self.R[:N]])


drums = Bus()
bass = Bus()
music = Bus()  # パッド・スタブ・アルペジオ・リード（サイドチェイン対象）
fx = Bus()
verb_send = Bus()

# ---------------------------------------------------------------- ドラム
def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 46 + 110 * np.exp(-t * 28)
    body = sine(f, n) * np.exp(-t * 7.5)
    click = hp(rng.standard_normal(n), 2500) * np.exp(-t * 300) * 0.25
    return np.tanh((body + click) * 1.6) * 0.9


def snare(bright=1.0):
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    noise = bp(rng.standard_normal(n), 1500, 9000) * np.exp(-t * 16) * 0.75 * bright
    tone = sine(185 * (1 + 0.3 * np.exp(-t * 40)), n) * np.exp(-t * 22) * 0.55
    return noise + tone


def clap():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    env = np.zeros(n)
    for k, off in enumerate([0, 0.011, 0.022]):
        i = int(off * SR)
        env[i:] += np.exp(-(t[: n - i]) * (90 if k < 2 else 18))
    return bp(rng.standard_normal(n), 900, 6000) * env * 0.5


def hat(open_=False):
    n = int((0.28 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 7000) * np.exp(-t * (14 if open_ else 60)) * 0.7


def crash(length=2.6):
    n = int(length * SR)
    t = np.arange(n) / SR
    x = hp(rng.standard_normal((2, n)), 5000) * np.exp(-t * 1.9) * 0.32
    return x


def impact():
    n = int(2.4 * SR)
    t = np.arange(n) / SR
    boom = sine(30 + 55 * np.exp(-t * 6), n) * np.exp(-t * 2.2)
    burst = lp(rng.standard_normal(n), 900) * np.exp(-t * 9) * 0.6
    return np.tanh((boom + burst) * 1.3) * 0.85


def riser(length, peak_cut=9000):
    n = int(length * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    y = lp_auto(x, lambda s: 300 + (peak_cut - 300) * (s / length) ** 2, block=0.02)
    env = (t / length) ** 2.2
    return y * env * 0.5


KT = []  # キックの時刻（サイドチェイン用）
k_sig, s_sig, c_sig = kick(), snare(), clap()
for b in range(int(TOTAL / BEAT)):
    t = b * BEAT
    beat_in_bar = b % 4
    # ---- キック
    play_kick = False
    if 2.0 <= t < 21.5:
        play_kick = True
    elif 22.0 <= t < 34.0:  # ハーフタイム: 1拍目と3拍裏
        play_kick = beat_in_bar == 0
    elif 34.0 <= t < 58.0 or 62.0 <= t < 76.0:
        play_kick = True
    elif 58.0 <= t < 62.0:
        play_kick = beat_in_bar == 0
    if play_kick:
        drums.add(t, k_sig, 1.0)
        KT.append(t)
    if 22.0 <= t < 34.0 and beat_in_bar == 2:
        drums.add(t + BEAT * 0.5, k_sig, 0.8)
        KT.append(t + BEAT * 0.5)
    # ---- スネア／クラップ
    if (10.0 <= t < 21.5 or 34.0 <= t < 58.0 or 62.0 <= t < 76.0) and beat_in_bar in (1, 3):
        drums.add(t, s_sig, 0.55)
        drums.add(t, c_sig, 0.5, pan=0.1)
        verb_send.add(t, s_sig, 0.18)
    if 22.0 <= t < 34.0 and beat_in_bar == 2:
        drums.add(t, s_sig, 0.7)
        drums.add(t, c_sig, 0.6)
        verb_send.add(t, s_sig, 0.35)
    if 58.0 <= t < 62.0 and beat_in_bar == 2:
        drums.add(t, c_sig, 0.35)
        verb_send.add(t, c_sig, 0.4)

# ハット（16分／8分裏のオープン）
ch_sig, oh_sig = hat(False), hat(True)
for i in range(int(TOTAL / S16)):
    t = i * S16
    pos = i % 4
    vel = [0.7, 0.35, 0.55, 0.4][pos]
    if 1.5 <= t < 10.0:
        drums.add(t, ch_sig, vel * min(1, (t - 1.5) / 6) * 0.8, pan=0.25)
    elif 10.0 <= t < 21.5 or 34.0 <= t < 58.0 or 62.0 <= t < 76.0:
        drums.add(t, ch_sig, vel * 0.85, pan=0.25)
        if pos == 2 and t >= 34.0:
            drums.add(t, oh_sig, 0.45, pan=-0.2)
    elif 22.0 <= t < 34.0 and pos in (0, 2):
        drums.add(t, ch_sig, vel * 0.7, pan=0.25)
    elif 58.0 <= t < 62.0 and pos == 2:
        drums.add(t, ch_sig, 0.4, pan=0.25)

# フィル：46–48 のスネアロール、65–66 と 33–34 の短いフィル
for i in range(int(2.0 / S16)):
    t = 46.0 + i * S16
    drums.add(t, s_sig, 0.18 + 0.5 * (i / 16) ** 1.5, pan=(-0.3 if i % 2 else 0.3))
for start in (33.0, 65.0, 43.5):
    for i in range(int((44.0 - 43.5 if start == 43.5 else 1.0) / S16)):
        t = start + i * S16
        drums.add(t, s_sig, 0.3 + 0.3 * i / 8, pan=(-0.25 if i % 2 else 0.25))

# 圧縮の段（小節頭の低い衝撃）
for t in STRUCT["accents"]["compressSteps"]:
    n = int(0.9 * SR)
    tt = np.arange(n) / SR
    thud = np.tanh(sine(42 + 30 * np.exp(-tt * 12), n) * np.exp(-tt * 5) * 1.6) * 0.55
    fx.add(t, thud)

# インパクト／クラッシュ
A = STRUCT["accents"]
imp = impact()
for t, g in ((A["impact"], 1.0), (A["flipHit"], 0.8), (A["gapHit"], 0.9), (A["shelfHit"], 0.75),
             (A["pullBack"], 0.9), (A["finalHit"], 1.0), (A["deleteHit"], 0.55)):
    fx.add(t, imp, g)
for t, g in ((A["impact"], 1.0), (A["gapHit"], 0.9), (A["shelfCrash"], 0.85), (A["pullBack"], 1.0),
             (A["finalHit"], 1.0), (A["flipHit"], 0.6)):
    c = crash(3.2 if t == A["finalHit"] else 2.6)
    fx.add(t, c, g)
    verb_send.add(t, c, 0.3 * g)

# ライザー（雪崩れ終わり／裏返し／隙間／整列／結論への引き）
for end, length, g in ((10.0, 3.5, 0.55), (28.0, 1.6, 0.5), (34.0, 2.0, 0.6), (48.0, 2.0, 0.55),
                       (66.0, 2.5, 0.65), (76.0, 2.0, 0.5)):
    r = riser(length)
    fx.add(end - length, r, g, pan=-0.2)
    fx.add(end - length, riser(length), g, pan=0.2)
# 21.0–22.0 の逆再生スウェル（停止の間に吸い込む）
sw = crash(1.0)[:, ::-1] * 1.2
fx.add(21.0, sw, 0.8)

# ---------------------------------------------------------------- ベース
def bass_note(m, length, cutoff=700, sub=0.8, drive=1.4):
    n = int(length * SR)
    f = mtof(m)
    env = adsr(n, 0.004, 0.08, 0.8, 0.04)
    saw = polyblep_saw(f, n)
    s = sine(f, n)
    y = lp(saw * 0.6, cutoff) + sub * s
    return np.tanh(y * drive) * env * 0.55


for bar in range(len(PROG)):
    t0 = bar * BAR
    root = chord_at(t0)[0]
    br = root - 12 if root >= 46 else root  # ベース音域へ
    while br > 45:
        br -= 12
    while br < 33:
        br += 12
    if 2.0 <= t0 < 10.0:  # 雪崩れ: 長いドローン
        bass.add(t0, bass_note(br, BAR, cutoff=260 + 60 * bar, sub=0.7, drive=1.1), 0.35 + 0.08 * bar)
    elif 10.0 <= t0 < 22.0:  # 圧縮: 8分のポンプ＋オクターブ
        for k in range(8):
            t = t0 + k * BEAT / 2
            if t >= 21.5:
                break
            m = br + (12 if k % 2 else 0)
            cut = 900 - 45 * (t - 10)  # 圧縮で閉じていく
            bass.add(t, bass_note(m, BEAT / 2 * 0.9, cutoff=cut), 0.85)
    elif 22.0 <= t0 < 34.0:  # 転換: 長い音
        bass.add(t0, bass_note(br, BAR * 0.95, cutoff=420, sub=1.1), 0.9)
    elif 58.0 <= t0 < 62.0:  # 留保: 低音を抜く（サブのみ極小）
        bass.add(t0, bass_note(br, BAR, cutoff=120, sub=0.6, drive=1.0), 0.25)
    elif t0 < 76.0:  # 解放: シンコペーション
        pat = [(0, 3, 0), (3, 2, 0), (6, 2, 12), (8, 2, 0), (10, 2, 7), (12, 2, 0), (14, 2, 12)]
        for st, ln, iv in pat:
            t = t0 + st * S16
            bass.add(t, bass_note(br + iv, ln * S16 * 0.92, cutoff=1100 if t0 >= 66 else 850), 0.85)
    else:  # 最終: 長いFの響き
        bass.add(t0, bass_note(br, 2.2, cutoff=500, sub=1.2), 0.9)

# ---------------------------------------------------------------- パッド
def pad_voice(m, length, detune=0.12):
    n = int(length * SR)
    out = np.zeros((2, n))
    for k, d in enumerate([-detune, -detune / 3, detune / 3, detune]):
        f = mtof(m + d)
        s = polyblep_saw(f, n, phase0=rng.random())
        out[k % 2] += s
    return out * 0.18


pad = np.zeros((2, N))
for bar in range(len(PROG)):
    t0 = bar * BAR
    root, iv = chord_at(t0)
    if 58.0 <= t0 < 62.0:
        pass
    length = BAR + 0.6 if t0 < 76 else 2.0
    i = int(t0 * SR)
    for v in iv:
        m = root + v
        while m < 55:
            m += 12
        sig = pad_voice(m, length)
        env = adsr(sig.shape[1], 0.25, 0.3, 0.85, 0.6)
        j = min(i + sig.shape[1], N)
        pad[:, i:j] += (sig * env)[:, : j - i]


def pad_cut(t):
    if t < 10:
        return 350 + 900 * (t / 10)
    if t < 22:
        return 1500 - 85 * (t - 10)  # 圧縮で閉じる
    if t < 34:
        return 900 + 60 * (t - 22)
    if t < 54:
        return 2600
    if t < 58:
        return 2200
    if t < 62:
        return 1100
    if t < 66:
        return 2400
    return 3600


padL = lp_auto(pad[0], pad_cut)
padR = lp_auto(pad[1], pad_cut)
pad_gain = np.interp(np.arange(N) / SR, [0, 1.5, 10, 21.5, 22, 34, 58, 62, 66, 78],
                     [0.35, 0.6, 0.7, 0.55, 0.9, 0.75, 0.9, 0.75, 0.9, 0.9])
music.L[:N] += padL * pad_gain
music.R[:N] += padR * pad_gain
verb_send.L[:N] += padL * pad_gain * 0.35
verb_send.R[:N] += padR * pad_gain * 0.35

# ---------------------------------------------------------------- 裏拍スタブ（圧縮）
for bar in range(5, 11):
    t0 = bar * BAR
    root, iv = chord_at(t0)
    for k in range(4):
        t = t0 + k * BEAT + BEAT / 2
        if t >= 21.5:
            break
        n = int(0.16 * SR)
        sig = np.zeros(n)
        for v in iv:
            m = root + v + 12
            sig += polyblep_saw(mtof(m), n) + polyblep_saw(mtof(m + 0.1), n)
        cut = 3200 - 190 * (t - 10)
        sig = lp(sig * 0.12, cut) * adsr(n, 0.003, 0.05, 0.4, 0.05)
        music.add(t, sig, 0.9, pan=(-0.35 if k % 2 else 0.35))
        verb_send.add(t, sig, 0.25)

# ---------------------------------------------------------------- アルペジオ（プラック）
def pluck(m, length=0.22, cutoff=2600):
    n = int(length * SR)
    f = mtof(m)
    s = polyblep_saw(f, n) * 0.6 + np.sign(sine(f * 1.002, n)) * 0.25
    t = np.arange(n) / SR
    y = lp(s, cutoff) * np.exp(-t * 14)
    return y * 0.35


for i in range(int(TOTAL / S16)):
    t = i * S16
    root, iv = chord_at(t)
    seq = [0, 1, 2, 3, 2, 1, 2, 3]
    tones = [root + v for v in iv] + [root + iv[0] + 12]
    m = tones[seq[i % 8] % len(tones)] + 12
    if 1.0 <= t < 10.0 and i % 2 == 0:
        g = 0.25 + 0.5 * (t / 10)
        music.add(t, pluck(m, cutoff=700 + 1800 * t / 10), g, pan=(-0.4 if i % 4 else 0.4))
    elif 22.0 <= t < 34.0 and i % 4 == 0:
        music.add(t, pluck(m, cutoff=1600), 0.55, pan=(-0.5 if i % 8 else 0.5))
    elif 44.0 <= t < 54.0 or 66.0 <= t < 76.0:
        music.add(t, pluck(m + (12 if t >= 70 and i % 8 == 7 else 0), cutoff=3200), 0.55,
                  pan=(-0.45 if i % 2 else 0.45))
    elif 54.0 <= t < 58.0 and i % 2 == 0:
        music.add(t, pluck(m, cutoff=2200), 0.45, pan=(-0.45 if i % 4 else 0.45))
    elif 62.0 <= t < 66.0 and i % 2 == 0:
        music.add(t, pluck(m, cutoff=2600), 0.5, pan=(-0.45 if i % 4 else 0.45))
    if t >= 76:
        break

# ---------------------------------------------------------------- ベル／リード（FM）
def bell(m, length=0.9, ratio=3.5, index=2.2):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = mtof(m)
    mod = np.sin(2 * np.pi * f * ratio * t) * index * np.exp(-t * 5)
    car = np.sin(2 * np.pi * f * t + mod)
    return car * np.exp(-t * 3.2) * 0.3


def lead(m, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = mtof(m) * (1 + 0.004 * np.sin(2 * np.pi * 5.5 * t) * np.clip(t * 3, 0, 1))
    s = polyblep_saw(f, n) * 0.5 + polyblep_saw(f * 1.004, n) * 0.5
    s = lp(s, 3400) * adsr(n, 0.01, 0.12, 0.7, 0.08)
    b = bell(m + 12, length, 2.0, 1.2) * 0.6
    return (s * 0.22 + b[:n])


# 転換のベル主題（D–F–A–G…の短い問い）
motif = [(22.0, 74), (22.75, 77), (23.5, 81), (24.5, 79), (26.0, 77), (26.75, 74), (27.5, 76),
         (28.0, 81), (30.0, 79), (30.75, 77), (31.5, 74), (32.0, 72), (32.75, 74)]
for t, m in motif:
    b = bell(m, 1.4)
    music.add(t, b, 0.8, pan=0.15)
    verb_send.add(t, b, 0.5)

# 解放と結論のリード（2小節フレーズ×反復、結論で1オクターブ上を重ねる）
phrase = [(0, 3, 0), (3, 3, 2), (6, 2, 4), (8, 4, 7), (12, 2, 4), (14, 2, 2),
          (16, 6, 4), (22, 2, 2), (24, 4, 0), (28, 4, -3)]
scale_f = {0: 65, 2: 67, 4: 69, 7: 72, -3: 62}  # F メジャー上の度数→MIDI
for start, end, octave_up in ((36.0, 44.0, False), (48.0, 54.0, False), (62.0, 66.0, False),
                               (66.0, 76.0, True)):
    t0 = start
    while t0 < end - 0.01:
        for st, ln, deg in phrase:
            t = t0 + st * S16
            if t >= end:
                break
            m = scale_f[deg]
            l = lead(m, ln * S16 * 0.95)
            music.add(t, l, 0.75, pan=-0.1)
            verb_send.add(t, l, 0.35)
            if octave_up:
                l2 = lead(m + 12, ln * S16 * 0.95)
                music.add(t, l2, 0.35, pan=0.25)
        t0 += 2 * BAR

# 最終コードのベル（Fadd9 を散らして響かせる）
for k, m in enumerate([65, 69, 72, 76, 79]):
    b = bell(m + 12, 2.6)
    music.add(76.0 + k * 0.06, b, 0.7, pan=-0.4 + 0.2 * k)
    verb_send.add(76.0 + k * 0.06, b, 0.6)

# ---------------------------------------------------------------- ミックス
t_all = np.arange(N) / SR
pump = np.ones(N)
for tk in KT:
    i = int(tk * SR)
    n = min(int(0.35 * SR), N - i)
    if n <= 0:
        continue
    tt = np.arange(n) / SR
    pump[i : i + n] = np.minimum(pump[i : i + n], 1 - 0.55 * np.exp(-tt / 0.09))

D = drums.st()
B = bass.st() * pump
M = music.st() * (0.55 + 0.45 * pump)
F = fx.st()

# リバーブ（合成IR）
ir_n = int(2.4 * SR)
ir_t = np.arange(ir_n) / SR
ir = np.stack([lp(rng.standard_normal(ir_n), 5000), lp(rng.standard_normal(ir_n), 5000)])
ir *= np.exp(-ir_t * 2.6)
ir /= np.sqrt((ir ** 2).sum(axis=1, keepdims=True))
V = verb_send.st()
Vw = np.stack([signal.fftconvolve(V[0], ir[0])[:N], signal.fftconvolve(V[1], ir[1])[:N]]) * 0.5

mix = D * 0.75 + B * 0.55 + M * 1.0 + F * 0.7 + Vw * 1.2
# 雪崩れ区間は控えめに始めて押し上げる（0s:-7dB → 10s:0dB）
mix *= np.interp(t_all, [0, 2, 10, 78], [0.45, 0.55, 1.0, 1.0])
mix = hp(mix, 28)

# 頭と尾
fade_in = np.clip(t_all / 0.03, 0, 1)
fade_out = np.clip((TOTAL - t_all) / 1.4, 0, 1) ** 1.5
mix *= fade_in * fade_out

# ソフトクリップ＋ノーマライズ（ピーク -1.0 dBFS）
mix = np.tanh(mix * 1.1) / np.tanh(1.1)
peak = np.abs(mix).max()
mix *= (10 ** (-1.0 / 20)) / peak

out_wav = os.path.join(ROOT, "public", "bgm.wav")
pcm = (np.clip(mix.T, -1, 1) * 32767).astype("<i2")
import wave

with wave.open(out_wav, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())

# フレームごとのエネルギー（映像の同期確認用に書き出す。描画は structure.json の拍で決める）
fps = 30
hop = SR // fps
rms = [float(np.sqrt(np.mean(mix[:, i * hop : (i + 1) * hop] ** 2))) for i in range(int(TOTAL * fps))]
json.dump({"fps": fps, "rms": [round(x, 4) for x in rms]},
          open(os.path.join(HERE, "energy.json"), "w"))

subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", out_wav, "-b:a", "256k",
                os.path.join(ROOT, "public", "bgm.mp3")], check=True)
print("wrote", out_wav, "peak", peak, "seconds", N / SR)
