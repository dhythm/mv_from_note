#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
新規BGMの決定論的合成。
- 150 BPM（= 0.4s/拍 = 12frame/拍 @30fps、1.6s/小節 = 48frame/小節）。
  映像のフレームグリッドと完全一致させ、Y20/Y21をフレーム決定論的に同期させる。
- 既存BGM（assets/bgm.mp3 等）の波形・フレーズは一切使用せず、numpyで新規に合成する。
- 器楽のみ（効果音なし）。推進力のあるエレクトロ。場面に合わせ密度・強弱を変える。
- 出力: wav(一時) -> mp3(public/bgm.mp3)。各フレームの音量/低音エンベロープを src/lib/energy.json へ。
使い方: python3 bgm_build.py
"""
import json
import math
import os
import struct
import wave

import numpy as np

SEED = 20261007
rng = np.random.default_rng(SEED)

SR = 44100
FPS = 30
BPM = 150.0
SEC = 198.0
N = int(SR * SEC)
STEP = 60.0 / BPM / 4.0       # 16分音符 = 0.1s
N_STEPS = int(SEC / STEP)     # 1980
BAR_SEC = 60.0 / BPM * 4.0    # 1.6s

HERE = os.path.dirname(os.path.abspath(__file__))
PUBLIC = os.path.join(HERE, "..", "public")
LIB = os.path.join(HERE, "..", "src", "lib")
os.makedirs(PUBLIC, exist_ok=True)
os.makedirs(LIB, exist_ok=True)

# ---- バス（楽器ごと）。低音バス=kick+bassで低域エンベロープを作る ----
master = np.zeros(N, dtype=np.float64)
low_bus = np.zeros(N, dtype=np.float64)   # kick+bass（Y21の低音反応用）

def add(buf, start_sec, sig):
    s = int(start_sec * SR)
    e = min(s + len(sig), len(buf))
    if s >= len(buf) or e <= s:
        return
    buf[s:e] += sig[: e - s]

def midi_freq(m):
    return 440.0 * (2.0 ** ((m - 69) / 12.0))

def env_exp(n, decay):
    t = np.arange(n) / SR
    return np.exp(-t / decay)

def env_ar(n, attack, release):
    t = np.arange(n) / SR
    a = np.clip(t / max(attack, 1e-4), 0, 1)
    total = n / SR
    r = np.clip((total - t) / max(release, 1e-4), 0, 1)
    return a * r

def saw(freq, n, harmonics=8, detune=0.0):
    t = np.arange(n) / SR
    out = np.zeros(n)
    f = freq * (2.0 ** (detune / 1200.0))
    for k in range(1, harmonics + 1):
        out += np.sin(2 * np.pi * f * k * t) / k
    return out * (2.0 / np.pi)

def square(freq, n, harmonics=7):
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k in range(1, harmonics * 2, 2):
        out += np.sin(2 * np.pi * freq * k * t) / k
    return out * (4.0 / np.pi) * 0.5

# ---- 音色 ----
def kick(vel=1.0):
    dur = 0.28
    n = int(dur * SR)
    t = np.arange(n) / SR
    fsweep = 55 + (150 - 55) * np.exp(-t / 0.03)
    phase = 2 * np.pi * np.cumsum(fsweep) / SR
    body = np.sin(phase) * np.exp(-t / 0.16)
    click = (rng.standard_normal(n) * np.exp(-t / 0.004)) * 0.25
    return (body + click) * 0.95 * vel

def snare(vel=1.0):
    dur = 0.2
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n) * np.exp(-t / 0.09)
    tone = np.sin(2 * np.pi * 185 * t) * np.exp(-t / 0.06) * 0.5
    return (noise * 0.7 + tone) * 0.5 * vel

def hat(open_=False, vel=1.0):
    dur = 0.12 if open_ else 0.045
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    noise = np.diff(noise, prepend=noise[0])  # 疑似ハイパス
    return noise * np.exp(-t / (0.05 if open_ else 0.014)) * 0.22 * vel

def bass_note(freq, dur, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    o = np.sin(2 * np.pi * freq * t) + 0.5 * np.sin(2 * np.pi * freq * 2 * t)
    o += 0.18 * saw(freq, n, harmonics=5)
    e = env_ar(n, 0.006, dur * 0.9) * np.exp(-t / (dur * 1.5))
    return o * e * 0.5 * vel

def pluck(freq, dur, vel=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    o = 0.6 * saw(freq, n, harmonics=10, detune=-6) + 0.6 * saw(freq, n, harmonics=10, detune=6)
    o += 0.3 * square(freq, n, harmonics=5)
    e = np.exp(-t / (dur * 0.6)) * env_ar(n, 0.004, dur)
    return o * e * 0.3 * vel

def pad_chord(freqs, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    o = np.zeros(n)
    for f in freqs:
        o += np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2 * t)
    e = env_ar(n, 0.25, 0.4)
    return o / max(len(freqs), 1) * e * 0.16

def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    sweep = np.sin(2 * np.pi * (200 + 1800 * (t / dur) ** 2) * t)
    amp = (t / dur) ** 2
    return (noise * 0.4 + sweep * 0.6) * amp * 0.22

# ---- 和声進行 Am - F - C - G（i-VI-III-VII, 推進的）----
# 各要素 = (bass_root_midi, [chord tone midis(中音域)])
PROG = [
    (45, [57, 60, 64]),  # Am: A2 / A3 C4 E4
    (41, [57, 60, 65]),  # F : F2 / A3 C4 F4
    (48, [60, 64, 67]),  # C : C3 / C4 E4 G4
    (43, [59, 62, 67]),  # G : G2 / B3 D4 G4
]

def section_of(t):
    bounds = [18, 38, 64, 92, 124, 145, 178, 198]
    for i, b in enumerate(bounds):
        if t < b:
            return i
    return 7

# セクション別マスターゲインと楽器密度
# gain, arp16(16分でarp), hat16, ghostkick, pad
SECT = {
    0: dict(gain=0.92, arp16=False, hat16=True, ghost=False, pad=True),
    1: dict(gain=1.00, arp16=True, hat16=True, ghost=False, pad=True),
    2: dict(gain=0.84, arp16=False, hat16=False, ghost=False, pad=True),  # 読む場面: 遅くしない。密度だけ少し下げる
    3: dict(gain=0.96, arp16=True, hat16=True, ghost=False, pad=True),
    4: dict(gain=1.10, arp16=True, hat16=True, ghost=True, pad=True),     # 見せ場
    5: dict(gain=1.02, arp16=True, hat16=True, ghost=False, pad=True),
    6: dict(gain=1.14, arp16=True, hat16=True, ghost=True, pad=True),     # ピーク
    7: dict(gain=0.98, arp16=False, hat16=True, ghost=False, pad=True),   # 収束
}

# ---- ステップ列で打ち込み ----
for i in range(N_STEPS):
    t = i * STEP
    sec = section_of(t)
    cfg = SECT[sec]
    bar = int(t / BAR_SEC)
    chord = PROG[bar % 4]
    beat16 = i % 4          # 0..3 (16分の位置)
    beat = (i // 4) % 4     # 0..3 (拍)

    # kick: 4つ打ち + 見せ場のゴースト
    if beat16 == 0:
        master_add_vel = 1.0 if beat == 0 else 0.9
        k = kick(vel=master_add_vel)
        add(master, t, k); add(low_bus, t, k)
    if cfg["ghost"] and i % 8 == 6:
        k = kick(vel=0.55); add(master, t, k); add(low_bus, t, k)

    # snare: 2・4拍
    if beat16 == 0 and beat in (1, 3):
        add(master, t, snare(vel=1.0))

    # hat: 16分 or 8分、オフビートでオープン
    if cfg["hat16"] or i % 2 == 0:
        op = (i % 4 == 2)
        add(master, t, hat(open_=op, vel=0.9 if not op else 1.0))

    # bass: 8分、ルート中心にオクターブ跳躍
    if i % 2 == 0:
        root = chord[0]
        m = root + (12 if (i // 2) % 4 == 3 else 0)
        b = bass_note(midi_freq(m), STEP * 2 * 0.95, vel=1.0)
        add(master, t, b); add(low_bus, t, b)

    # arp: 和音構成音を上下
    play_arp = cfg["arp16"] or (i % 2 == 0)
    if play_arp:
        tones = chord[1]
        seq = tones + [tones[1] + 12, tones[2], tones[1], tones[0] + 12]
        note = seq[i % len(seq)]
        p = pluck(midi_freq(note), STEP * (1.2 if cfg["arp16"] else 1.8),
                  vel=0.9 if cfg["arp16"] else 0.7)
        add(master, t, p)

# pad: 小節頭ごと
n_bars = int(SEC / BAR_SEC) + 1
for bar in range(n_bars):
    t = bar * BAR_SEC
    sec = section_of(t)
    if not SECT[sec]["pad"]:
        continue
    chord = PROG[bar % 4]
    freqs = [midi_freq(m) for m in chord[1]]
    add(master, t, pad_chord(freqs, BAR_SEC * 1.02) * (0.8 if sec == 2 else 1.0))

# riser（S5前・S7前の build）
add(master, 92 - 1.6, riser(1.6))
add(master, 145 - 1.6, riser(1.6))

# セクションゲイン（サンプル単位の滑らかな包絡）
gain_env = np.ones(N)
bounds = [0, 18, 38, 64, 92, 124, 145, 178, 198]
for si in range(8):
    s0 = int(bounds[si] * SR); s1 = int(bounds[si + 1] * SR)
    gain_env[s0:s1] = SECT[si]["gain"]
# 境界を50msで平滑化
k = int(0.05 * SR)
kernel = np.ones(k) / k
gain_env = np.convolve(gain_env, kernel, mode="same")
master *= gain_env
low_bus *= gain_env

# フェードイン/アウト
fi = int(0.04 * SR)
master[:fi] *= np.linspace(0, 1, fi)
fo = int(2.0 * SR)
master[-fo:] *= np.linspace(1, 0, fo)
low_bus[-fo:] *= np.linspace(1, 0, fo)

# マスター: ソフトクリップ + ピーク正規化（約-1.5dBFS）
master = np.tanh(master * 0.8)
peak = np.max(np.abs(master)) + 1e-9
master *= (10 ** (-1.5 / 20)) / peak

# ---- 各フレームのエネルギー包絡（30fps, 5940フレーム）----
TOTAL_FRAMES = int(FPS * SEC)  # 5940
spf = SR / FPS
def frame_rms(sig):
    out = np.zeros(TOTAL_FRAMES)
    for f in range(TOTAL_FRAMES):
        a = int(f * spf); b = int((f + 1) * spf)
        seg = sig[a:b]
        out[f] = math.sqrt(float(np.mean(seg * seg))) if len(seg) else 0.0
    return out

overall = frame_rms(master)
low = frame_rms(low_bus * gain_env if len(low_bus) == len(gain_env) else low_bus)
def norm(a):
    m = float(np.max(a)) + 1e-9
    return (a / m)
overall_n = norm(overall)
low_n = norm(low)

# kickパルス（各拍頭=12フレームごとの減衰パルス、Y20のアクセント下地）
kick_pulse = np.zeros(TOTAL_FRAMES)
for f in range(0, TOTAL_FRAMES, 12):
    for d in range(0, 10):
        if f + d < TOTAL_FRAMES:
            kick_pulse[f + d] = max(kick_pulse[f + d], math.exp(-d / 3.0))

energy = {
    "fps": FPS,
    "bpm": BPM,
    "framesPerBeat": 12,
    "framesPerBar": 48,
    "totalFrames": TOTAL_FRAMES,
    "overall": [round(float(x), 4) for x in overall_n],
    "low": [round(float(x), 4) for x in low_n],
    "kickPulse": [round(float(x), 4) for x in kick_pulse],
}
with open(os.path.join(LIB, "energy.json"), "w") as f:
    json.dump(energy, f)
print("energy.json frames:", TOTAL_FRAMES)

# ---- WAV 書き出し（16bit ステレオ）----
stereo = np.stack([master, master], axis=1)
pcm = np.clip(stereo, -1, 1)
pcm16 = (pcm * 32767.0).astype("<i2")
wav_path = os.path.join(HERE, "bgm.wav")
with wave.open(wav_path, "wb") as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm16.tobytes())
print("wav written:", wav_path, "peak dBFS:", round(20 * math.log10(float(np.max(np.abs(master))) + 1e-9), 2))
