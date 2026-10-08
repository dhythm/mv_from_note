"""「メンテナンスされないモノは、いずれ負債になる」企画専用BGMのローカル合成。

外部音源・サンプル・過去企画の曲は使わず、numpy/scipy の発振器・ノイズ・フィルタだけで合成する。
構成は src/lib/timeline.json（124BPM、ナレーション実尺に合わせた全尺）に従い、カットの境目に
ライザーと衝撃音を置く。出力: public/bgm.wav（44.1kHz/16bit ステレオ、映像の全尺＋余韻）
"""
import json
from pathlib import Path

import numpy as np
from scipy import signal

here = Path(__file__).resolve().parent
root = here.parent
TL = json.loads((root / 'src' / 'lib' / 'timeline.json').read_text())
SR = 44100
BPM = TL['bpm']
BEAT = 60 / BPM
BAR = BEAT * 4
STEP = BEAT / 4
TOTAL = TL['total'] + 1.2
N = int(TOTAL * SR)
CUTS = TL['cuts']
rng = np.random.default_rng(20261008)

# バス（L/R）: drums, bass, harm（和声・アルペジオ）, lead, fx。リバーブ送り
bus = {k: np.zeros((2, N)) for k in ('drums', 'bass', 'harm', 'lead', 'fx', 'send')}


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def add(name, t, sig, gain=1.0, pan=0.0, send=0.0):
    i = int(t * SR)
    if i >= N or len(sig) == 0:
        return
    j = min(N, i + len(sig))
    s = sig[: j - i] * gain
    l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4)
    bus[name][0, i:j] += s * l * 1.414
    bus[name][1, i:j] += s * r * 1.414
    if send:
        bus['send'][0, i:j] += s * l * send
        bus['send'][1, i:j] += s * r * send


def tt(d):
    return np.arange(int(d * SR)) / SR


def lp(x, fc, order=2):
    b, a = signal.butter(order, min(fc, SR * 0.45) / (SR / 2), 'low')
    return signal.lfilter(b, a, x)


def hp(x, fc, order=2):
    b, a = signal.butter(order, fc / (SR / 2), 'high')
    return signal.lfilter(b, a, x)


def bp(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), min(hi, SR * 0.45) / (SR / 2)], 'band')
    return signal.lfilter(b, a, x)


def saw(f, d, detune=0.0):
    x = tt(d)
    ph = (f * (1 + detune) * x) % 1.0
    return 2 * ph - 1


# ---------------- 音色 ----------------
def kick(vel=1.0):
    x = tt(0.42)
    f = 46 + 110 * np.exp(-x * 32)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-x * 7.5)
    click = hp(rng.standard_normal(len(x)), 2500) * np.exp(-x * 220) * 0.3
    return np.tanh((body + click) * 1.6) * vel


def tick(vel=1.0, bright=1.0):
    # 時計の刻み: 高い金属的なクリック（硬い打楽器）
    x = tt(0.05)
    n = bp(rng.standard_normal(len(x)), 5200, 11000) * np.exp(-x * 160)
    ring = np.sin(2 * np.pi * 7300 * x) * np.exp(-x * 120) * 0.25 * bright
    return (n + ring) * vel


def tock(vel=1.0):
    # 木のような低い打音（拍の裏）
    x = tt(0.09)
    s = np.sin(2 * np.pi * 820 * x) * np.exp(-x * 60) + 0.4 * np.sin(2 * np.pi * 1310 * x) * np.exp(-x * 90)
    return s * vel


def snare(vel=1.0):
    x = tt(0.28)
    n = bp(rng.standard_normal(len(x)), 1800, 9000) * np.exp(-x * 17)
    tone = np.sin(2 * np.pi * 196 * x) * np.exp(-x * 28) * 0.6
    return np.tanh((n * 0.9 + tone) * 1.3) * vel


def hat(vel=1.0, open_=False):
    x = tt(0.22 if open_ else 0.06)
    n = hp(rng.standard_normal(len(x)), 8500) * np.exp(-x * (14 if open_ else 75))
    return n * vel


def metal(vel=1.0):
    # 硬い金属の一撃（拍2・4のアクセント）
    x = tt(0.35)
    fs = [540, 813, 1187, 1622, 2390]
    s = sum(np.sin(2 * np.pi * f * x + k) for k, f in enumerate(fs)) / len(fs)
    return s * np.exp(-x * 11) * vel


def bass_note(m, d, cutoff=900, vel=1.0):
    f = midi(m)
    x = tt(d)
    s = 0.6 * saw(f, d) + 0.4 * saw(f, d, 0.004) + 0.5 * np.sin(2 * np.pi * f * x)
    env = np.minimum(1, x / 0.004) * np.exp(-x * 3.0)
    # 立ち上がりだけ明るい音を混ぜ、弾く感じを出す
    s = lp(s, cutoff, 2) * (1 - 0.5 * np.exp(-x * 12)) + lp(s, cutoff * 2.5, 2) * 0.5 * np.exp(-x * 12)
    rel = np.minimum(1, (d - x) / 0.02)
    return np.tanh(s * env * rel * 1.4) * vel


def pad_chord(ms, d, cutoff=1300, vel=1.0):
    x = tt(d)
    s = np.zeros(len(x))
    for m in ms:
        f = midi(m)
        for dt in (-0.006, 0.0, 0.007):
            s += saw(f, d, dt)
    s = lp(s / (len(ms) * 3), cutoff, 2)
    env = np.minimum(1, x / 0.35) * np.minimum(1, (d - x) / 0.4)
    return s * env * vel


def pluck(m, d=0.22, vel=1.0, bright=3500):
    f = midi(m)
    x = tt(d)
    s = np.sign(np.sin(2 * np.pi * f * x)) * 0.5 + saw(f, d) * 0.5
    s = lp(s, bright, 2) * np.exp(-x * 13)
    return s * vel


def bell(m, d=1.2, vel=1.0):
    # FM のベル（主題のフレーズ）
    f = midi(m)
    x = tt(d)
    mod = np.sin(2 * np.pi * f * 3.5 * x) * 2.2 * np.exp(-x * 4)
    s = np.sin(2 * np.pi * f * x + mod) * np.exp(-x * 2.6)
    s += 0.3 * np.sin(2 * np.pi * f * 2 * x) * np.exp(-x * 5)
    return s * np.minimum(1, x / 0.003) * vel


def riser(d):
    x = tt(d)
    n = rng.standard_normal(len(x))
    out = np.zeros(len(x))
    seg = 2048
    for i in range(0, len(x), seg):
        k = i / len(x)
        out[i:i + seg] = bp(n[i:i + seg], 300 + 5000 * k ** 2, 900 + 9000 * k ** 2, 1)
    return out * (x / d) ** 2.2


def impact():
    x = tt(2.2)
    sub = np.sin(2 * np.pi * (38 + 60 * np.exp(-x * 9)) * x) * np.exp(-x * 2.4)
    n = lp(rng.standard_normal(len(x)), 3200) * np.exp(-x * 4.5) * 0.6
    crash = hp(rng.standard_normal(len(x)), 5000) * np.exp(-x * 2.2) * 0.35
    return np.tanh((sub + n + crash) * 1.2)


# ---------------- 構成 ----------------
E, G, A, B, C, D, Fs = 52, 55, 57, 59, 48, 50, 54
CH = {
    'Em': [52, 55, 59], 'C': [48, 52, 55], 'G': [55, 59, 62], 'D': [50, 54, 57], 'Am': [45, 48, 52],
    'Bm': [47, 50, 54], 'B7': [47, 51, 54, 57], 'D/F#': [54, 57, 62], 'Cmaj7': [48, 52, 55, 59], 'Em9': [52, 55, 59, 62, 66],
}
ROOT = {'Em': 40, 'C': 36, 'G': 43, 'D': 38, 'Am': 45, 'Bm': 47 - 12, 'B7': 35, 'D/F#': 42, 'Cmaj7': 36, 'Em9': 40}
# カットごとの進行・強さ・要素
SEC = {
    1: dict(prog=['Em', 'C', 'G', 'D'], inten=0.45, kick=True, snare=False, hats=False, arp=0.5, lead=False, cutoff=650),
    2: dict(prog=['Em', 'C', 'G', 'D'], inten=0.62, kick=True, snare=True, hats=True, arp=0.7, lead=False, cutoff=850),
    3: dict(prog=['Am', 'Em', 'B7', 'Em'], inten=0.95, kick=True, snare=True, hats=True, arp=1.0, lead=True, cutoff=1300),
    4: dict(prog=['Em', 'Cmaj7', 'Am', 'B7'], inten=0.72, kick=True, snare=True, hats=True, arp=0.8, lead=False, cutoff=950),
    5: dict(prog=['G', 'D', 'Em', 'C'], inten=0.85, kick=True, snare=True, hats=True, arp=1.0, lead=True, cutoff=1500),
    6: dict(prog=['Am', 'Em', 'C', 'D'], inten=0.58, kick=True, snare=True, hats=False, arp=0.6, lead=False, cutoff=800, half=True),
    7: dict(prog=['C', 'D', 'Bm', 'Em'], inten=0.72, kick=True, snare=True, hats=True, arp=0.8, lead=False, cutoff=1000),
    8: dict(prog=['Am', 'B7', 'Em', 'C'], inten=0.8, kick=True, snare=True, hats=True, arp=0.9, lead=False, cutoff=1100),
    9: dict(prog=['G', 'D/F#', 'Em', 'C'], inten=0.88, kick=True, snare=True, hats=True, arp=1.0, lead=True, cutoff=1600),
    10: dict(prog=['C', 'G', 'D', 'Em'], inten=0.75, kick=True, snare=True, hats=True, arp=0.8, lead=True, cutoff=1300),
}
# 主題（2小節）: 問いかけるように上がって、下りきらない
MOTIF = [(0, 71, 1.0), (1.5, 69, 0.5), (2, 67, 1.0), (3, 64, 1.0), (4, 74, 1.5), (5.5, 71, 0.5), (6, 69, 1.0), (7, 67, 1.0)]
MOTIF_END = [(0, 72, 1.0), (1, 71, 1.0), (2, 69, 2.0), (4, 67, 1.0), (5, 69, 1.0), (6, 71, 2.0)]


def cut_at(t):
    for c in CUTS:
        if c['start'] <= t < c['end']:
            return c['cut']
    return 10 if t >= CUTS[-1]['start'] else 1


breakdown = (CUTS[7]['p']['fall'][0], CUTS[8]['start'])  # 事業者が倒れれば → 太鼓が抜ける
end_hit = TL['total'] - 3.0

nbars = int(np.ceil(TOTAL / BAR))
for b in range(nbars):
    t0 = b * BAR
    if t0 >= end_hit + BAR:
        break
    n = cut_at(t0 + BAR * 0.5)
    s = SEC[n]
    inten = s['inten']
    chord = s['prog'][b % 4]
    bd = breakdown[0] <= t0 + BAR * 0.5 < breakdown[1]
    ending = t0 >= end_hit - BAR * 0.5
    intro = t0 < BAR * 1.0
    half = s.get('half', False)
    # カット3: 声の核心に向けて小節ごとに密度が上がる
    # 和声
    padv = 0.32 if not bd else 0.42
    add('harm', t0, pad_chord(CH[chord], BAR + 0.3, cutoff=s['cutoff'] * (0.6 if bd else 1)), padv, 0.0, send=0.35)
    if ending:
        continue
    for st in range(16):
        ts = t0 + st * STEP
        beat_pos = st // 4
        # キック
        if s['kick'] and not bd and not intro:
            if half:
                if st in (0, 10):
                    add('drums', ts, kick(0.95))
            elif st % 4 == 0 or (inten > 0.8 and st in (14,)):
                add('drums', ts, kick(1.0 if st == 0 else 0.9))
        # 時計の刻み（全編の背骨）
        if not intro or st % 2 == 0:
            accent = 1.0 if st % 4 == 0 else (0.55 if st % 2 == 0 else 0.35)
            if bd:
                accent *= 0.6 if st % 4 == 0 else 0.0
            if accent > 0:
                add('drums', ts, tick(accent * 0.5, 1.0), 1.0, pan=0.35 if st % 2 else -0.25)
        if st % 4 == 2 and not bd:
            add('drums', ts, tock(0.4 + 0.2 * inten), 1.0, pan=-0.4)
        # スネアと金属の一撃（2・4拍）
        if s['snare'] and not bd and not intro:
            if (half and st == 8) or (not half and st in (4, 12)):
                add('drums', ts, snare(0.75), 1.0, send=0.15)
                add('drums', ts, metal(0.3 * inten), 1.0, pan=0.2, send=0.2)
        if s['hats'] and not bd and not intro and inten > 0.6:
            if st % 2 == 1:
                add('drums', ts, hat(0.35 * inten), 1.0, pan=0.5)
            if st == 14 and b % 2 == 1:
                add('drums', ts, hat(0.3, True), 1.0, pan=0.5)
    # ベース: 8分で前へ進む（強い区間は16分の跳ね）
    r = ROOT[chord]
    pat = [0, 0, 12, 0, 7, 0, 12, 7]
    if not bd:
        for k, iv in enumerate(pat):
            ts = t0 + k * BEAT / 2
            if half and k % 2 == 1:
                continue
            add('bass', ts, bass_note(r + iv, BEAT / 2 * 0.92, cutoff=s['cutoff'], vel=0.75 if k % 2 else 0.95), 1.0)
            if inten > 0.85 and k in (3, 7):
                add('bass', ts + BEAT / 4, bass_note(r + 12, BEAT / 4 * 0.9, cutoff=s['cutoff'], vel=0.6), 1.0)
    else:
        add('bass', t0, bass_note(r, BAR * 0.95, cutoff=300, vel=0.7), 1.0)
    # アルペジオ（声の帯域を避けて小さめ）
    tones = CH[chord]
    if s['arp'] > 0 and not intro:
        for st in range(16):
            if bd and st % 2:
                continue
            m = tones[(st * 2 + b) % len(tones)] + 24
            add('harm', t0 + st * STEP, pluck(m, 0.2, 0.16 * s['arp'], bright=2600 + 2000 * inten), 1.0, pan=0.6 if st % 2 else -0.6, send=0.3)
    # 主題
    if s['lead'] and not bd and b % 2 == 0:
        motif = MOTIF_END if n == 10 else MOTIF
        for (pos, m, dur) in motif:
            ts = t0 + pos * BEAT
            if ts < TL['total'] - 3:
                add('lead', ts, bell(m, dur * BEAT + 0.8, 0.22), 1.0, pan=-0.1, send=0.5)

# カットの境目: ライザー → 衝撃
for c in CUTS[1:]:
    tb = c['start']
    d = 1.6 if c['cut'] in (3, 5, 9) else 0.9
    add('fx', tb - d, riser(d), 0.22 if c['cut'] in (3, 9) else 0.13, 0.0, send=0.3)
    add('fx', tb, impact(), 0.45 if c['cut'] in (3, 9) else 0.28, 0.0, send=0.4)
# 核心の一語（現状維持じゃない）と崩落
for key in ('b', 'c'):
    add('fx', CUTS[2]['p'][key][0], impact(), 0.3, 0.0, send=0.4)
# 終わりの和音と余韻
add('harm', end_hit, pad_chord(CH['Em9'], 4.2, cutoff=1800), 0.5, 0.0, send=0.8)
for k, m in enumerate([64, 67, 71, 74, 78]):
    add('lead', end_hit + k * 0.09, bell(m, 4.0, 0.2), 1.0, pan=-0.5 + k * 0.25, send=0.9)
add('fx', end_hit, impact(), 0.35, 0.0, send=0.6)

# ---------------- ミックス ----------------
# キックでパッド・アルペジオを少しポンプさせる
pump = np.ones(N)
for b in range(nbars):
    for q in range(4):
        i = int((b * BAR + q * BEAT) * SR)
        L = int(BEAT * SR)
        if i >= N:
            break
        x = np.arange(min(L, N - i)) / SR
        pump[i:i + len(x)] = np.minimum(pump[i:i + len(x)], 0.55 + 0.45 * (1 - np.exp(-x * 9)))
bus['harm'] *= pump
bus['bass'] *= 0.5 + 0.5 * pump

# リバーブ（指数減衰ノイズの畳み込み、ステレオ）
ir_t = np.arange(int(2.4 * SR)) / SR
irs = [lp(rng.standard_normal(len(ir_t)), 6000) * np.exp(-ir_t * 2.6) for _ in range(2)]
wet = np.stack([signal.fftconvolve(bus['send'][ch], irs[ch])[:N] for ch in range(2)]) * 0.06

mix = bus['drums'] * 0.85 + bus['bass'] * 0.72 + bus['harm'] * 0.9 + bus['lead'] * 0.85 + bus['fx'] * 0.9 + wet
# 声の帯域（2.5kHz付近）を少し空ける
b_, a_ = signal.iirpeak(2600 / (SR / 2), 1.2)
mix = mix - 0.35 * np.stack([signal.lfilter(b_, a_, mix[0]), signal.lfilter(b_, a_, mix[1])])
mix = hp(mix, 30)
# 尾の余韻をフェード
fade_n = int(1.5 * SR)
mix[:, -fade_n:] *= np.linspace(1, 0, fade_n) ** 1.5
mix[:, : int(0.02 * SR)] *= np.linspace(0, 1, int(0.02 * SR))
peak = np.max(np.abs(mix))
mix = np.tanh(mix / peak * 1.25) / np.tanh(1.25) * 0.89  # 約 -1 dBFS

out = root / 'public' / 'bgm.wav'
from scipy.io import wavfile

wavfile.write(out, SR, (mix.T * 32767).astype(np.int16))
rms = 20 * np.log10(np.sqrt(np.mean(mix ** 2)))
print('bgm', out, f'{TOTAL:.2f}s', f'rms {rms:.1f} dBFS')
