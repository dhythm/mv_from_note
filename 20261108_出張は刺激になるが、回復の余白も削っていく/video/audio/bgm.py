"""BGM をローカルで合成する（追加課金なし・固定シード）。エンドロゴの終わりまで覆う。

条件（plan.html「音」から）:
  - 声の邪魔をしない音量で、画面全体の運動を支える拍・アクセント・展開を持たせる。ゆっくりした曲に映像を合わせない。
  - 展開: 01〜04 は得られるものの推進、05〜07 は余白が詰まる密度、08 で立ち止まるアクセント、09 で留保、10 で結び、ロゴで収束。
  - 過去作の曲（20261031 の D 長調ポップ、20261102 の F 短調ミニマル、20261105 の G 長調マリンバ）は流用しない。
曲: E♭ 長調、120BPM（1 拍 0.5 秒。カットの境目は 0.5 秒単位なので拍の上にある）。
  主役の音色はエレピ風の和音の刻みと、ベルのような高い粒。進行 E♭–B♭–Cm–A♭（09 は Cm–A♭–E♭–B♭ で陰らせる）。
  01: パッドと粒だけ → 「失われる」で低いキック → 02–04: 4 つ打ち・裏のハイハット・ベース →
  05–06: 16 分の刻みとベースの 8 分で密度を上げ、06 の「翌日」で風切りと打音、閉じた瞬間に低い打音 →
  07: インサートの間（家の時間）は打楽器を抜き、パッドとベルだけ。戻りで再開 →
  08: 「遅い。」で打音、休息のインサートの間は打楽器なし（立ち止まり）、「予防が、先。」で叩き込み、以後ハーフタイム →
  09: 留保。ハーフタイムで和声を陰らせる → 10: 開いた和音と軽い 4 つ打ち、結びの二行で全編成 →
  ロゴの Whip pan で風切り、最後の和音を保持の終わりまで鳴らして収める。
Lyria（有料の音楽生成）と比べてローカル合成を選んだ理由: インサートの抜き・「翌日」「遅い。」「予防が、先。」などへ
フレーム単位で合わせる必要があり、ローカル合成が確実で速く、費用もかからないため。

  python audio/bgm.py   → audio/bgm.wav, public/bgm.m4a（numpy・scipy が要る）
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
S = {}
_s = 0.0
for c in TL['cuts']:
    S[c['id']] = _s
    _s += c['dur']
LOGO = _s
DUR = LOGO + TL['logoDur']
BEAT = 0.5
BAR = 2.0
N = int(SR * DUR)
rng = np.random.default_rng(20261108)
MUS = np.zeros((2, N))
DRY = np.zeros((2, N))  # 打楽器（残響を少なく）


def midi(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def tt(d):
    return np.arange(int(d * SR)) / SR


def place(sig, t, gain=1.0, pan=0.0, bus=MUS):
    i = int(round(t * SR))
    if i >= N or i + len(sig) <= 0:
        return
    j = max(0, -i)
    sig = sig[j:]
    i = max(0, i)
    n = min(len(sig), N - i)
    bus[0, i:i + n] += sig[:n] * gain * np.sqrt(0.5 * (1 - pan))
    bus[1, i:i + n] += sig[:n] * gain * np.sqrt(0.5 * (1 + pan))


def env(n, a=0.005, r=0.2, d=None):
    x = np.arange(n) / SR
    e = np.minimum(1, x / max(a, 1e-4))
    if d is not None:
        e *= np.exp(-x / d)
    rel = int(r * SR)
    if rel and rel < n:
        e[-rel:] *= np.linspace(1, 0, rel)
    return e


# ---- 音色 ----
def kick(g=1.0):
    t = tt(0.45)
    f = 48 + 90 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7) * g


def hat(open_=False):
    t = tt(0.25 if open_ else 0.06)
    n = rng.standard_normal(len(t))
    n = sosfilt(butter(4, 7000, 'hp', fs=SR, output='sos'), n)
    return n * np.exp(-t * (14 if open_ else 60)) * 0.35


def clap():
    t = tt(0.3)
    n = sosfilt(butter(2, [900, 4000], 'bp', fs=SR, output='sos'), rng.standard_normal(len(t)))
    e = sum(np.exp(-np.maximum(0, t - d) * 40) * (t >= d) for d in (0, 0.012, 0.024)) / 3
    return n * e * 0.8


def impact():
    t = tt(1.6)
    f = 40 + 60 * np.exp(-t * 10)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 2.5)
    n = sosfilt(butter(2, 2500, 'lp', fs=SR, output='sos'), rng.standard_normal(len(t))) * np.exp(-t * 6) * 0.4
    return body + n


def whoosh(d=0.6, up=True):
    t = tt(d)
    n = rng.standard_normal(len(t))
    out = np.zeros_like(n)
    seg = 960
    for i in range(0, len(n), seg):
        k = i / len(n)
        fc = 400 + (6000 if up else 2000) * (k if up else 1 - k)
        out[i:i + seg] = sosfilt(butter(2, [fc * 0.6, fc * 1.4], 'bp', fs=SR, output='sos'), n[i:i + seg])
    e = np.sin(np.pi * np.linspace(0, 1, len(t))) ** 2
    return out * e * 0.5


def epiano(notes, d, vel=0.5):
    t = tt(d)
    s = np.zeros_like(t)
    for m in notes:
        f = midi(m)
        s += (np.sin(2 * np.pi * f * t + 0.6 * np.sin(2 * np.pi * f * 2 * t) * np.exp(-t * 6)) * np.exp(-t * 3.2))
    return s / max(1, len(notes)) * env(len(t), 0.004, 0.05) * vel


def bell(m, d=1.2, vel=0.3):
    t = tt(d)
    f = midi(m)
    s = np.sin(2 * np.pi * f * t + 1.2 * np.sin(2 * np.pi * f * 3.5 * t) * np.exp(-t * 5)) * np.exp(-t * 3)
    return s * env(len(t), 0.002, 0.1) * vel


def pad(notes, d, vel=0.12):
    t = tt(d)
    s = np.zeros_like(t)
    for m in notes:
        for det in (-0.08, 0.0, 0.08):
            s += np.sin(2 * np.pi * midi(m + det) * t + rng.uniform(0, 6))
    s = sosfilt(butter(2, 2200, 'lp', fs=SR, output='sos'), s)
    return s / (len(notes) * 3) * env(len(t), 0.6, 0.8) * vel


def bass(m, d, vel=0.4):
    t = tt(d)
    f = midi(m)
    s = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * 2 * f * t)
    return np.tanh(s * 1.4) * env(len(t), 0.004, 0.04) * vel


# ---- 和声 ----
# E♭ 長調: E♭–B♭–Cm–A♭（根音の MIDI と和音）
MAJ = [(51, [63, 67, 70, 74]), (46, [62, 65, 70, 74]), (48, [63, 67, 70, 72]), (44, [63, 68, 72, 75])]
MIN = [(48, [63, 67, 70, 72]), (44, [63, 68, 72, 75]), (51, [63, 67, 70, 74]), (46, [62, 65, 70, 74])]


def chord_at(t, prog):
    return prog[int(t // BAR) % 4]


# 区間ごとの編成（全体の秒）
def sec(id_, a):
    return S[id_] + a


INS = [(sec('07', 3.5), sec('07', 6.9)), (sec('08', 3.3), sec('08', 6.5)), (sec('09', 1.5), sec('09', 4.3))]


def in_insert(t, pad_=0.0):
    return any(a - pad_ <= t < b + pad_ for a, b in INS)


def section(t):
    if t < S['02']:
        return 'intro'
    if t < S['05']:
        return 'drive'
    if t < S['08']:
        return 'dense'
    if t < sec('08', 7.0):
        return 'stop'
    if t < S['10']:
        return 'half'
    if t < LOGO:
        return 'close'
    return 'logo'


# パッド（全編）: 小節ごと
t = 0.0
while t < DUR:
    sc = section(t)
    prog_ = MIN if sc == 'half' else MAJ
    root, ch = chord_at(t, prog_)
    v = {'intro': 0.16, 'drive': 0.12, 'dense': 0.13, 'stop': 0.16, 'half': 0.14, 'close': 0.16, 'logo': 0.0}[sc]
    if sc != 'logo':
        place(pad([n - 12 for n in ch[:3]], BAR + 0.6, v), t)
    t += BAR

# 拍の格子
for i in range(int(DUR / (BEAT / 4))):
    t = i * BEAT / 4
    if t >= LOGO:
        break
    sc = section(t)
    q = i % 16  # 1 小節の 16 分の位置（1 小節 = 2 秒 = 16 個）… 16 分 = 0.125 秒
    beat_on = q % 4 == 0
    ins = in_insert(t, 0.05)
    prog_ = MIN if sc == 'half' else MAJ
    root, ch = chord_at(t, prog_)
    # キック
    if not ins:
        if sc == 'intro' and t >= sec('01', 4.6) and beat_on and q in (0, 8):
            place(kick(0.6), t, bus=DRY)
        elif sc in ('drive', 'dense', 'close') and beat_on:
            place(kick(0.85 if sc != 'close' else 0.6), t, bus=DRY)
        elif sc == 'half' and q in (0, 10):
            place(kick(0.75), t, bus=DRY)
        elif sc == 'stop' and t < sec('08', 3.3) and beat_on:
            place(kick(0.7), t, bus=DRY)
    # ハイハット
    if not ins and sc in ('drive', 'dense', 'close', 'half'):
        if sc == 'dense' and True:
            place(hat(q % 4 == 2), t, 0.55 if q % 2 == 0 else 0.35, pan=0.3, bus=DRY)
        elif q % 4 == 2:
            place(hat(sc == 'drive'), t, 0.5, pan=0.3, bus=DRY)
    # クラップ（2・4 拍）
    if not ins and sc in ('dense', 'half', 'close') and q in (4, 12) and not (sc == 'half' and q == 4):
        place(clap(), t, 0.45 if sc != 'close' else 0.35, pan=-0.1, bus=DRY)
    # ベース
    if not ins and sc in ('drive', 'dense', 'half', 'close'):
        if sc == 'dense' and q % 2 == 0:
            place(bass(root - 12 + (12 if q % 4 == 2 else 0), 0.12, 0.38), t)
        elif sc in ('drive', 'close') and q in (0, 3, 6, 8, 11, 14):
            place(bass(root - 12, 0.22, 0.4), t)
        elif sc == 'half' and q in (0, 6, 10):
            place(bass(root - 12, 0.4, 0.38), t)
    # エレピの刻み
    if sc in ('drive', 'dense', 'close', 'half', 'intro') and not ins:
        if sc == 'intro' and q in (0, 6, 12):
            place(epiano(ch, 0.9, 0.22), t, pan=-0.2)
        elif sc == 'drive' and q in (2, 6, 10, 14):
            place(epiano(ch, 0.4, 0.22), t, pan=-0.2)
        elif sc == 'dense' and q % 2 == 1:
            place(epiano(ch, 0.2, 0.16), t, pan=-0.2)
        elif sc in ('half', 'close') and q in (0, 6, 10):
            place(epiano(ch, 0.8, 0.22), t, pan=-0.2)
    # ベルの粒（アルペジオ）
    arp = ch + [ch[1] + 12]
    if sc in ('intro', 'close') and q % 2 == 0:
        place(bell(arp[(q // 2) % 5] + 12, 0.9, 0.12), t, pan=0.35)
    elif sc == 'drive' and q % 4 == 3:
        place(bell(arp[(i // 4) % 5] + 12, 0.7, 0.1), t, pan=0.35)
    elif ins and q % 4 == 0:
        # インサートの間は打楽器を抜き、ゆっくりした粒だけ
        place(bell(arp[(i // 4) % 5] + 12, 1.4, 0.13), t, pan=0.2)

# ---- アクセント（全体の秒） ----
place(whoosh(0.5), sec('06', 1.7) - 0.05, 0.5, pan=0.4, bus=DRY)       # 「翌日」の Whip pan
place(impact(), sec('06', 2.95), 0.5, bus=DRY)                          # 白が閉じる
for a, b in INS:
    place(whoosh(0.55), a - 0.1, 0.35, pan=-0.3, bus=DRY)              # インサートへ
    place(whoosh(0.55, False), b - 0.1, 0.3, pan=0.3, bus=DRY)         # 紙色の面が押し出す
place(impact(), sec('08', 2.6), 0.55, bus=DRY)                          # 「遅い。」
place(impact(), sec('08', 7.0), 0.75, bus=DRY)                          # 「予防が、先。」
place(epiano(MAJ[0][1], 2.0, 0.35), sec('08', 7.0), pan=-0.2)
place(impact(), sec('09', 4.85), 0.5, bus=DRY)                          # 「溜めない。」
place(impact(), sec('10', 7.5), 0.35, bus=DRY)                          # 結びの二行
place(whoosh(0.5), LOGO - 0.5, 0.5, pan=0.5, bus=DRY)                   # ロゴへの Whip pan
# ロゴ: 最後の和音を保持の終わりまで（E♭）
place(pad([51, 58, 63, 67, 70], TL['logoDur'], 0.22), LOGO)
place(epiano([63, 67, 70, 74], TL['logoDur'], 0.35), LOGO, pan=-0.1)
place(bass(39, 2.5, 0.4), LOGO)
place(kick(0.6), LOGO, bus=DRY)
for k, m in enumerate([75, 79, 82, 86]):
    place(bell(m, 2.5, 0.12), LOGO + 0.25 * k + 2.6, pan=0.3)

# 残響（音楽のみ）
ir_t = tt(1.8)
ir = rng.standard_normal((2, len(ir_t))) * np.exp(-ir_t * 3.2)
ir = np.stack([sosfilt(butter(2, 5000, 'lp', fs=SR, output='sos'), x) for x in ir]) * 0.02
wet = np.stack([fftconvolve(MUS[c], ir[c])[:N] for c in range(2)])
out = MUS + wet * 0.8 + DRY
# 最後の 1.2 秒で収める
fade = int(1.2 * SR)
out[:, -fade:] *= np.linspace(1, 0, fade) ** 1.5
out /= np.abs(out).max()
out *= 0.9
p = ROOT / 'audio' / 'bgm.wav'
with wave.open(str(p), 'wb') as w:
    w.setnchannels(2)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((out.T * 32767).astype(np.int16).tobytes())
(ROOT / 'public').mkdir(exist_ok=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(p), '-c:a', 'aac', '-b:a', '256k', str(ROOT / 'public' / 'bgm.m4a')], check=True)
print(f'bgm ok {DUR:.2f}s')
