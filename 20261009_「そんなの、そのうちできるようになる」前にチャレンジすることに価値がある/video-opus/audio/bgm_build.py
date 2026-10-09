"""今回専用の BGM（ローカル合成、外部音源・有料生成なし）。

120BPM・4/4（1小節＝2秒）。カット境界 8/20/32/42/56/66/80/96/106/118 秒は小節頭に一致。
music-brief.md の2方向:
  A: 前進する低音（8分の脈動）、乾いた打楽器、細いアルペジオ、「掘る」硬いアタック
  B: ブレイクビーツ（シンコペーションのキックとゴースト）、温かいコード（FM ピアノ）
  H: 場面ごとに A/B を組み合わせた採用候補（掘る区間は A、乗り換え・分岐・結論は B の和声を開く）

使い方: .venv/bin/python audio/bgm_build.py A|B|H  → audio/bgm_<v>.wav
音の要素はこのスクリプト内で一から作る（過去作の bgm_build.py の旋律・パターン・音色は使っていない）。
"""
import json
import sys
from pathlib import Path

import numpy as np
from scipy.signal import butter, fftconvolve, sosfilt

SR = 44100
BPM = 120
BEAT = 60 / BPM
BAR = BEAT * 4
S16 = BEAT / 4
ROOT = Path(__file__).resolve().parent.parent
TL = json.loads((ROOT / 'src' / 'lib' / 'timeline.json').read_text())
TOTAL = TL['duration']
LOGO = TL['logoStart']
N = int(TOTAL * SR) + SR  # 余白1秒（最後に切る）
rng = np.random.default_rng(20261009)

variant = sys.argv[1] if len(sys.argv) > 1 else 'H'


def bus():
    return np.zeros((N, 2), dtype=np.float64)


def place(buf, sig, t, pan=0.0, gain=1.0):
    i = int(round(t * SR))
    if i >= N or i + len(sig) <= 0:
        return
    if i < 0:
        sig = sig[-i:]
        i = 0
    j = min(N, i + len(sig))
    s = sig[: j - i] * gain
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    if s.ndim == 1:
        buf[i:j, 0] += s * l
        buf[i:j, 1] += s * r
    else:
        buf[i:j] += s


def lp(x, fc, order=2):
    return sosfilt(butter(order, min(fc, SR * 0.45) / (SR / 2), 'low', output='sos'), x, axis=0)


def hp(x, fc, order=2):
    return sosfilt(butter(order, fc / (SR / 2), 'high', output='sos'), x, axis=0)


def bp(x, lo, hi, order=2):
    return sosfilt(butter(order, [lo / (SR / 2), min(hi, SR * 0.45) / (SR / 2)], 'band', output='sos'), x, axis=0)


def env_ad(n, a, d, curve=4.0):
    t = np.arange(n) / SR
    e = np.where(t < a, t / max(a, 1e-4), np.exp(-(t - a) / max(d, 1e-4) * curve / 4))
    return e


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ---- 音色 -------------------------------------------------------------------
def kick(strength=1.0):
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    f = 46 + 120 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(ph) * np.exp(-t * 7.5)
    click = rng.standard_normal(n) * np.exp(-t * 260) * 0.35
    return np.tanh((body + lp(click, 4000)) * 1.6 * strength) * 0.9


def snare(bright=1.0):
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    noise = bp(rng.standard_normal(n), 1200, 7500) * np.exp(-t * 18)
    tone = np.sin(2 * np.pi * 195 * t) * np.exp(-t * 30) * 0.6
    return (noise * 0.8 * bright + tone) * 0.7


def clap():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for k, d in enumerate([0, 0.011, 0.023, 0.034]):
        i = int(d * SR)
        seg = rng.standard_normal(n - i) * np.exp(-np.arange(n - i) / SR * (60 if k < 3 else 14))
        out[i:] += seg
    return bp(out, 900, 5200) * 0.55


def hat(open_=False):
    n = int((0.32 if open_ else 0.06) * SR)
    t = np.arange(n) / SR
    x = hp(rng.standard_normal(n), 7000, 3) * np.exp(-t * (9 if open_ else 70))
    return x * 0.32


def dig(pitch=1.0):
    """掘る拍: 硬いアタックの金属（FM）と土の粒（低い帯域のノイズ）"""
    n = int(0.28 * SR)
    t = np.arange(n) / SR
    fc = 620 * pitch
    mod = np.sin(2 * np.pi * fc * 1.41 * t) * 3.2 * np.exp(-t * 40)
    metal = np.sin(2 * np.pi * fc * t + mod) * np.exp(-t * 26)
    dirt = lp(rng.standard_normal(n), 1800) * np.exp(-t * 34) * 0.9
    return (metal * 0.5 + dirt) * 0.6


def pluck(m, dur=0.35, bright=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = midi(m)
    out = np.zeros(n)
    for h in range(1, 10):
        if f * h > 12000:
            break
        out += np.sin(2 * np.pi * f * h * t + h * 0.7) / h ** (1.25 / bright) * np.exp(-t * (6 + h * 4.5))
    out *= np.minimum(1, t / 0.002)
    return out * 0.35


def bass(m, dur, cutoff=900, drive=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = midi(m)
    saw = 2 * ((t * f) % 1) - 1
    sub = np.sin(2 * np.pi * f * t)
    x = saw * 0.55 + sub * 0.8
    # フィルタの開き: 打鍵直後に明るく
    bright = lp(x, cutoff * 2.4)
    dark = lp(x, cutoff * 0.6)
    k = np.exp(-t * 14)
    y = bright * k + dark * (1 - k)
    e = np.minimum(1, t / 0.004) * np.exp(-t * 2.2) * np.minimum(1, (dur - t) / 0.01)
    return np.tanh(y * e * 1.4 * drive) * 0.55


def epiano(m, dur):
    """温かいコード用の FM ピアノ"""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = midi(m)
    idx = 1.6 * np.exp(-t * 3.5) + 0.25
    y = np.sin(2 * np.pi * f * t + idx * np.sin(2 * np.pi * f * t))
    y += 0.25 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 5)
    e = np.minimum(1, t / 0.006) * np.exp(-t * 0.9) * np.minimum(1, (dur - t) / 0.08)
    return y * e * 0.16


def pad(ms, dur, bright=1800, attack=0.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    out = np.zeros((n, 2))
    for m in ms:
        f = midi(m)
        for d, pan in [(-0.11, -0.7), (0.0, 0.0), (0.12, 0.7)]:
            ff = f * 2 ** (d / 12)
            ph = rng.random()
            saw = 2 * ((t * ff + ph) % 1) - 1
            l = np.cos((pan + 1) * np.pi / 4)
            r = np.sin((pan + 1) * np.pi / 4)
            out[:, 0] += saw * l
            out[:, 1] += saw * r
    out = lp(out, bright, 2)
    e = np.minimum(1, t / attack) * np.minimum(1, (dur - t) / 0.4)
    return out * e[:, None] * 0.05 / max(1, len(ms) ** 0.5)


def riser(dur, up=True):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = rng.standard_normal(n)
    out = np.zeros(n)
    blocks = 24
    for b in range(blocks):
        a = b * n // blocks
        z = (b + 1) * n // blocks
        k = b / (blocks - 1)
        fc = 400 + (7000 if up else 2000) * (k if up else 1 - k) ** 2
        out[a:z] = bp(x[a:z], fc * 0.7, fc * 1.3, 1)
    sweep = np.sin(2 * np.pi * np.cumsum(180 + 900 * (t / dur) ** 2) / SR) * 0.15
    e = (t / dur) ** 2 if up else (1 - t / dur) ** 2
    return (out * 0.9 + sweep) * e * 0.5


def crash(dur=2.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return hp(rng.standard_normal(n), 4500, 2) * np.exp(-t * 2.2) * 0.22


def impact():
    n = int(1.2 * SR)
    t = np.arange(n) / SR
    f = 38 + 80 * np.exp(-t * 12)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3.2)
    return np.tanh(boom * 1.8) * 0.8 + lp(rng.standard_normal(n), 900) * np.exp(-t * 9) * 0.3


def chime(m, dur=1.4):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = midi(m)
    y = np.sin(2 * np.pi * f * t + 1.2 * np.exp(-t * 6) * np.sin(2 * np.pi * f * 3.5 * t))
    return y * np.exp(-t * 3.0) * np.minimum(1, t / 0.003) * 0.18


# ---- 和声（1小節＝1和音。MIDI 番号） ------------------------------------------
A2, C3, D3, E3, F2, G2 = 45, 48, 50, 52, 41, 43
CH = {
    'Am': [57, 60, 64], 'Am7': [57, 60, 64, 67], 'F': [53, 57, 60], 'Fmaj7': [53, 57, 60, 64], 'G': [55, 59, 62], 'C': [60, 64, 67],
    'Cadd9': [60, 64, 67, 74], 'Dm7': [50, 53, 57, 60], 'E7sus': [52, 57, 59, 62], 'Em7': [52, 55, 59, 62], 'Cmaj7': [48, 52, 55, 59], 'G/B': [59, 62, 67],
}
BASS = {'Am': 45, 'Am7': 45, 'F': 41, 'Fmaj7': 41, 'G': 43, 'C': 48, 'Cadd9': 48, 'Dm7': 50, 'E7sus': 40, 'Em7': 40, 'Cmaj7': 48, 'G/B': 47}
PROG = (
    ['Am', 'Am', 'F', 'G']  # 0-3 カット1
    + ['Am', 'Am', 'F', 'G', 'Am', 'F']  # 4-9 カット2
    + ['Am', 'F', 'C', 'G', 'Am', 'G']  # 10-15 カット3
    + ['Fmaj7', 'C', 'G', 'Am7', 'Fmaj7']  # 16-20 カット4（開く）
    + ['Dm7', 'Am', 'Dm7', 'E7sus', 'Dm7', 'Am', 'E7sus']  # 21-27 カット5
    + ['F', 'G', 'Am', 'F', 'G']  # 28-32 カット6
    + ['Am', 'C', 'F', 'G', 'Am', 'C', 'G']  # 33-39 カット7
    + ['Fmaj7', 'Em7', 'Dm7', 'Cmaj7', 'Fmaj7', 'Em7', 'Dm7', 'G']  # 40-47 カット8
    + ['Am', 'F', 'C', 'G', 'G']  # 48-52 カット9
    + ['F', 'G', 'Em7', 'Am', 'C', 'G/B', 'Am7', 'Fmaj7']  # 53-58 カット10（106-118）… 56 で開く
)
PROG = PROG[:59]
assert len(PROG) == 59, len(PROG)


def cut_of_bar(b):
    t = b * BAR
    for c in TL['cuts']:
        if c['start'] <= t < c['end']:
            return c['cut']
    return 11


# 層の構成（カット → 層の強さ）。A/B/H で違う
def layers(c):
    if variant == 'A':
        base = dict(kick=1, four=1, clap=1, hats=1, bass=1, arp=1, dig=1, break_=0, ep=0, pad=0.6)
        if c == 1:
            base.update(hats=0.4, arp=0.5, clap=0)
        if c in (5, 8):
            base.update(hats=0.5, arp=0.6)
        return base
    if variant == 'B':
        base = dict(kick=1, four=0, clap=0, hats=0.8, bass=0.8, arp=0, dig=0, break_=1, ep=1, pad=0.9)
        if c == 1:
            base.update(hats=0.3, ep=0.6)
        if c in (5, 8):
            base.update(hats=0.5)
        return base
    # H: 採用候補
    table = {
        1: dict(kick=0.9, four=1, clap=0, hats=0.35, bass=1, arp=0.55, dig=1, break_=0, ep=0, pad=0.4),
        2: dict(kick=1, four=1, clap=1, hats=0.8, bass=1, arp=0.6, dig=1, break_=0, ep=0, pad=0.5),
        3: dict(kick=1, four=1, clap=1, hats=1, bass=1, arp=1, dig=1.2, break_=0, ep=0, pad=0.5),
        4: dict(kick=1, four=1, clap=1, hats=1, bass=0.9, arp=0.7, dig=0.4, break_=0, ep=1, pad=1),
        5: dict(kick=1, four=1, clap=1, hats=0.55, bass=0.9, arp=0.5, dig=0.6, break_=0, ep=0.6, pad=0.6),
        6: dict(kick=1, four=1, clap=1, hats=0.8, bass=1, arp=0.8, dig=0.5, break_=0, ep=0.7, pad=0.9),
        7: dict(kick=1, four=0, clap=0, hats=1, bass=1, arp=1, dig=1, break_=1, ep=0.6, pad=0.7),
        8: dict(kick=0.9, four=0, clap=0, hats=0.5, bass=0.8, arp=0.4, dig=0.3, break_=0.8, ep=1, pad=0.9),
        9: dict(kick=1, four=1, clap=1, hats=1, bass=1, arp=1, dig=1.1, break_=0, ep=0.5, pad=0.7),
        10: dict(kick=1, four=1, clap=1, hats=1, bass=1, arp=1, dig=0.9, break_=0.6, ep=1, pad=1.1),
    }
    return table.get(c, table[10])


drums = bus()
bassb = bus()
music = bus()
fx = bus()
kick_env = np.zeros(N)

# 打撃の時刻（映像の着地・切り返し）
HITS = [7.0, 8.0, 20.0, 26.0, 32.0, 38.0, 42.0, 56.0, 61.5, 66.0, 80.0, 85.0, 96.0, 106.0, 112.0]
STOPS = [(25.5, 26.0), (79.5, 80.0)]  # 行き止まり・「宝」直前の空白（ドラムを止める）


def stopped(t):
    return any(a <= t < b for a, b in STOPS)


for b in range(59):
    c = cut_of_bar(b)
    L = layers(c)
    t0 = b * BAR
    ch = PROG[b]
    root = BASS[ch]
    # ---- ドラム
    for s in range(16):
        t = t0 + s * S16
        if stopped(t):
            continue
        swing = S16 * 0.08 if (s % 2 == 1 and L['break_'] > 0) else 0
        if L['four'] and s % 4 == 0:
            place(drums, kick(L['kick']), t, gain=0.95)
            i = int(t * SR)
            kick_env[i:i + int(0.25 * SR)] = np.maximum(kick_env[i:i + int(0.25 * SR)], np.exp(-np.arange(min(int(0.25 * SR), N - i)) / SR * 14))
        if L['break_']:
            pat_k = [0, 6, 10] if b % 2 == 0 else [0, 7, 10, 14]
            if s in pat_k and not (L['four'] and s % 4 == 0):
                place(drums, kick(0.9), t + swing, gain=0.9 * L['break_'])
                i = int(t * SR)
                kick_env[i:i + int(0.2 * SR)] = np.maximum(kick_env[i:i + int(0.2 * SR)], np.exp(-np.arange(min(int(0.2 * SR), N - i)) / SR * 16))
            if s in (4, 12):
                place(drums, snare(), t, pan=0.05, gain=0.85 * L['break_'])
            if s in (7, 9, 15) and rng.random() < 0.7:
                place(drums, snare(0.5), t + swing, pan=0.15, gain=0.22 * L['break_'])
        if L['clap'] and s in (4, 12):
            place(drums, clap(), t, pan=-0.05, gain=0.8 * L['clap'])
        if L['hats']:
            if L['break_'] and not L['four']:
                if s % 2 == 0:
                    place(drums, hat(open_=(s == 14)), t + swing, pan=0.35, gain=L['hats'] * (0.9 if s % 4 == 2 else 0.6))
            else:
                acc = 1.0 if s % 4 == 2 else 0.55
                place(drums, hat(open_=(s % 8 == 6 and c >= 3)), t, pan=0.3, gain=L['hats'] * acc)
        # 掘る拍: 硬いアタック（4拍目の裏と、2小節ごとに変わる位置）
        if L['dig']:
            pos = [3, 11, 14] if b % 2 == 0 else [6, 11, 15]
            if s in pos:
                place(drums, dig(1.0 + 0.12 * ((b + s) % 3)), t, pan=-0.35 + 0.7 * ((s % 3) / 2), gain=0.55 * L['dig'])
    # ---- 低音（A: 8分の脈動 / B: 長めの音で間を空ける）
    if L['bass']:
        if L['break_'] and not L['four']:
            for s, d, o in [(0, 0.7, 0), (6, 0.3, 0), (10, 0.45, 12), (14, 0.25, 0)]:
                t = t0 + s * S16
                if not stopped(t):
                    place(bassb, bass(root - 12 + o if root > 44 else root + o, d, 700), t, gain=0.9 * L['bass'])
        else:
            for e in range(8):
                t = t0 + e * BEAT / 2
                if stopped(t):
                    continue
                o = 12 if e % 2 == 1 else 0
                place(bassb, bass(root - 12 + o if root > 44 else root + o, BEAT / 2 * 0.9, 650 + 300 * (c >= 9)), t, gain=0.85 * L['bass'])
    # ---- アルペジオ（16分。和音の構成音を2オクターブで）
    if L['arp']:
        tones = CH[ch]
        seq = [tones[i % len(tones)] + 12 * ((i // len(tones)) % 2) for i in range(8)]
        order = [0, 2, 1, 3, 2, 4, 3, 5, 4, 6, 5, 7, 6, 4, 3, 1] if c in (7, 10) else [0, 1, 2, 3, 4, 5, 6, 7, 6, 5, 4, 3, 2, 1, 2, 3]
        for s in range(16):
            t = t0 + s * S16
            if stopped(t):
                continue
            if c in (7,) and s % 3 == 2:
                continue  # 分岐の区間はシンコペーション
            m = seq[order[s] % 8] + 12
            place(music, pluck(m, 0.3, 1.0 + 0.4 * (c >= 9)), t, pan=-0.5 + (s % 4) / 3, gain=0.5 * L['arp'] * (1.1 if s % 4 == 0 else 0.8))
    # ---- 温かいコード（FM ピアノ: 2拍目裏・4拍目に刻む）
    if L['ep']:
        for s, d in [(0, 0.9), (6, 0.45), (10, 0.9)]:
            t = t0 + s * S16
            if stopped(t):
                continue
            for k, m in enumerate(CH[ch]):
                place(music, epiano(m, d), t + k * 0.004, pan=-0.3 + 0.2 * k, gain=0.9 * L['ep'])
    # ---- パッド
    if L['pad']:
        place(music, pad(CH[ch], BAR + 0.3, 1400 + 900 * (c in (4, 10)), 0.3), t0, gain=L['pad'])

# ---- 打撃・上昇・シンバル
for h in HITS:
    place(fx, impact(), h, gain=0.55)
    place(fx, crash(), h, pan=0.2, gain=0.7)
place(fx, riser(2.0), 6.0 - 1.0, gain=0.4)
place(fx, riser(2.0), 30.0, gain=0.5)  # 舗装へ
place(fx, riser(2.5), 59.0, gain=0.6)  # 柱の着地へ
place(fx, riser(1.6), 78.4, gain=0.6)  # 「宝」へ
place(fx, riser(3.0), 109.0, gain=0.55)  # 俯瞰へ
place(fx, riser(1.05), 116.95, gain=0.7)  # ワイプ
# キー（カット5）: 打鍵の粒（音程を持たせる）
for i in range(18):
    t = 42.0 + i * S16 * 2 + (0.0 if i % 3 else S16)
    if t < 45.4:
        place(fx, pluck(84 + [0, 3, 7, 10][i % 4], 0.12, 2.0), t, pan=-0.4 + 0.05 * i, gain=0.35)

# ---- エンドロゴ（118〜123.5秒）: 長い和音で覆い、o の着地・.work の出現に軽い音を合わせる
end_chord = [48, 55, 60, 64, 67, 74]
place(music, pad(end_chord, TOTAL - LOGO + 0.6, 2600, 0.05), LOGO, gain=1.6)
for k, m in enumerate([60, 64, 67, 72]):
    place(music, epiano(m, 4.8), LOGO + k * 0.01, pan=-0.3 + 0.2 * k, gain=1.1)
place(fx, impact(), LOGO, gain=0.5)
place(fx, crash(3.5), LOGO, gain=0.6)
place(bassb, bass(36, 4.5, 400, 0.8), LOGO, gain=0.9)
# o のバウンド（SVG の 22%/46%/62% = 0.572/1.196/1.612 秒）
for k, (dt, g) in enumerate([(0.572, 1.0), (1.196, 0.6), (1.612, 0.35)]):
    place(fx, chime(79 - k * 0, 1.0), LOGO + dt, pan=0.3, gain=0.8 * g)
    place(drums, kick(0.5), LOGO + dt, gain=0.35 * g)
# 左へのスライド（2.6〜3.2秒）
place(fx, riser(0.6, up=False), LOGO + 2.6, gain=0.25)
# .work の5文字（3.0 + 0.08i 秒）
for i, m in enumerate([84, 86, 88, 91, 93]):
    place(fx, chime(m, 1.6), LOGO + 3.0 + 0.08 * i, pan=-0.4 + 0.2 * i, gain=0.55)

# ---- ミックス
side = 1 - 0.55 * kick_env[:, None]
music *= side
bassb *= 1 - 0.65 * kick_env[:, None]


def reverb(x, sec=1.8, wet=0.22):
    n = int(sec * SR)
    t = np.arange(n) / SR
    ir = np.stack([rng.standard_normal(n), rng.standard_normal(n)], 1) * np.exp(-t * 6.9 / sec)[:, None]
    ir = lp(ir, 6000)
    ir /= np.sqrt(np.sum(ir ** 2, axis=0))
    y = np.stack([fftconvolve(x[:, k], ir[:, k])[: len(x)] for k in range(2)], 1)
    return x + y * wet


music = reverb(music, 2.0, 0.35)
fx = reverb(fx, 1.6, 0.25)
drums = reverb(drums, 0.8, 0.08)

# 区間の強弱（同じ音量が続かないように）。[時刻, リズム隊の量, 和声の量]
DYN = [
    (0.0, 0.62, 0.8), (6.8, 0.72, 0.9), (8.0, 0.86, 0.95), (20.0, 0.95, 1.0), (32.0, 0.9, 1.25), (42.0, 0.82, 1.0),
    (56.0, 0.85, 1.05), (61.5, 1.0, 1.15), (66.0, 1.0, 1.05), (80.0, 0.72, 1.15), (88.0, 0.8, 1.2), (96.0, 0.95, 1.05),
    (106.0, 1.0, 1.1), (112.0, 1.05, 1.4), (118.0, 1.0, 1.0),
]
tt_all = np.arange(N) / SR
kt = np.array([d[0] for d in DYN])
g_r = np.interp(tt_all, kt, [d[1] for d in DYN])[:, None]
g_h = np.interp(tt_all, kt, [d[2] for d in DYN])[:, None]
mix = drums * 0.78 * g_r + bassb * 0.52 * g_r + music * 1.45 * g_h + fx * 0.75
mix = hp(mix, 28)

# 終わり: 123.5 秒で自然に収まる（最後の 1.3 秒でフェード、末尾は無音に近づく）
n_end = int(TOTAL * SR)
mix = mix[:n_end]
tt = np.arange(n_end) / SR
fade = np.clip((TOTAL - tt) / 1.3, 0, 1) ** 1.6
mix *= fade[:, None]
# 頭の 5ms
mix[: int(0.005 * SR)] *= np.linspace(0, 1, int(0.005 * SR))[:, None]

# ソフトクリップと正規化（ピーク -1 dBFS）
mix = np.tanh(mix * 0.8) / np.tanh(0.8)
peak = np.max(np.abs(mix))
mix *= 10 ** (-1 / 20) / peak
out = ROOT / 'audio' / f'bgm_{variant}.wav'
pcm = (mix * 32767).astype(np.int16)
import wave

with wave.open(str(out), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes(pcm.tobytes())
rms = 20 * np.log10(np.sqrt(np.mean(mix ** 2)) + 1e-9)
print(out, f'{n_end / SR:.2f}s', f'rms {rms:.1f} dBFS')
