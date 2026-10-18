"""BGM をローカルで合成する（追加課金なし・固定シード）。全 153 秒（エンドロゴの保持終了まで）。

音楽ブリーフ（../plan.html「音楽・音声の方向」）:
  軽快だが、ふざけない。明快なドラムと動くベース、短い鍵盤・プラック系のアクセント。112–124BPM の拍感。
  0–22     01–03 問いを立てる（冒頭から拍。受け渡し・問いの着地にアクセント）
  22–57    04–07 対比と短い引っかかり。07 の「話が止まる」（52.6–53.0 秒、映像が一瞬止まる）で音を抜く
  57–86    08–10 軽く展開
  86–109   11–12 理由がつながる見せ場（101.3 秒の着地へ上げる）
  109–148  13–15 前進して結論へ
  148–153  エンドロゴ: o の着地・スライド・.work の出現に軽いアクセント、最後の 1 秒で収める
拍の格子は 0 秒起点の 120BPM（映像側 src/lib/anim.ts の BPM と同じ）。

  .venv/bin/python audio/bgm.py   → audio/bgm.wav, public/bgm.m4a
"""
import subprocess
import wave
from pathlib import Path

import numpy as np
from scipy.signal import fftconvolve

SR = 48000
DUR = 153.0
BPM = 120
BEAT = 60 / BPM
BAR = BEAT * 4
N = int(SR * DUR)
ROOT = Path(__file__).resolve().parents[1]
rng = np.random.default_rng(20261018)

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


# ---------------- 和声（D 長調。I–V–vi–IV と、問いの区間の vi–IV–I–V） ----------------
MAIN = [(50, [50, 54, 57, 62]), (45, [45, 49, 52, 57]), (47, [47, 50, 54, 59]), (43, [43, 47, 50, 55])]  # D A Bm G
ASK = [(47, [47, 50, 54, 59]), (43, [43, 47, 50, 55]), (50, [50, 54, 57, 62]), (45, [45, 49, 52, 57])]  # Bm G D A


def pluck(n, d=0.22, fc=4200):
    t = tt(d)
    s = saw(midi(n), d, 0.003) * 0.6 + np.sin(2 * np.pi * midi(n) * t) * 0.5
    return lp(s, fc) * np.exp(-t * 14) * (1 - np.exp(-t * 900))


def keys(notes, d):
    t = tt(d)
    s = sum(np.sin(2 * np.pi * midi(n) * t) + 0.3 * np.sin(4 * np.pi * midi(n) * t) for n in notes) / len(notes)
    return s * np.exp(-t * 2.2) * (1 - np.exp(-t * 400))


def sect(t):
    if t < 22:
        return 'open'
    if t < 47:
        return 'contrast'
    if t < 57:
        return 'stall'
    if t < 86:
        return 'develop'
    if t < 97:
        return 'ask'
    if t < 109:
        return 'peak'
    if t < 148:
        return 'drive'
    return 'logo'


GAP = (52.6, 53.02)  # 07「話が止まる」の短い抜き（映像の静止と同じ区間）


def in_gap(t):
    return GAP[0] - 0.02 <= t < GAP[1]


nbeats = int(148 / BEAT)
for b in range(nbeats):
    t = b * BEAT
    if in_gap(t) or in_gap(t + BEAT * 0.5):
        continue
    s = sect(t)
    bar = int(t / BAR)
    bib = b % 4
    prog = ASK if s in ('ask', 'stall') else MAIN
    root, chord = prog[bar % 4]
    intro = t < 2.0
    full = s in ('develop', 'peak', 'drive') or (s == 'open' and t >= 8)
    # キック（4つ打ちを基本に、引っかかりの区間は間引く）
    if full or s == 'contrast' or (s == 'open' and bib in (0, 2)) or (s in ('stall', 'ask') and bib in (0, 2)):
        place(kick(0.95), t, 0.85)
    if s == 'peak' and bib == 3:
        place(kick(0.7), t + BEAT * 0.75, 0.5)
    # スネア／クラップ（2・4拍）
    if bib in (1, 3) and not intro:
        place(snare(), t, 0.38 if s not in ('stall', 'ask') else 0.26, pan=0.05)
        if full:
            place(clap(), t, 0.2, pan=-0.1, rev=0.15)
    # ハイハット
    place(hat(), t + BEAT / 2, 0.3 if s != 'stall' else 0.18, pan=0.35)
    if s in ('peak', 'drive') or (s == 'develop' and t >= 74):
        place(hat(), t + BEAT / 4, 0.13, pan=-0.35)
        place(hat(), t + 3 * BEAT / 4, 0.13, pan=-0.35)
    if bib == 3 and full:
        place(hat(True), t + BEAT / 2, 0.14, pan=0.3)
    # 動くベース（8分。ルート→5度→オクターブを行き来する）
    if not intro or bib >= 2:
        steps = [0, 7, 12, 7] if s in ('peak', 'drive') else [0, 0, 7, 0] if s in ('stall', 'ask') else [0, 12, 7, 12]
        for o in (0, 0.5):
            n = root - 12 + steps[(bib * 2 + int(o * 2)) % 4]
            place(bass(n, BEAT * 0.4), t + o * BEAT, 0.4)
    # 鍵盤（小節頭に和音、3拍目裏に短く）
    if bib == 0 and t >= 2:
        place(keys([n + 12 for n in chord], BAR), t, 0.07 if s != 'stall' else 0.05, pan=-0.15, rev=0.3)
    # プラックのアクセント（2・4拍の裏、展開とともに増える）
    if bib in (1, 3) and s not in ('stall',) and t >= 4:
        place(pluck(chord[(bar + bib) % 4] + 24), t + BEAT * 0.5, 0.07, pan=0.3, rev=0.25)
    if s in ('develop', 'peak', 'drive') and t >= 62:
        for jj in (0, 1):
            place(pluck(chord[(bib * 2 + jj) % 4] + 24, 0.16), t + jj * BEAT / 2, 0.045, pan=-0.35 + 0.7 * jj)
    # 問い（ask）は低いパッドで余地を残す
    if s in ('ask', 'stall') and bib == 0:
        place(pad([n + 12 for n in chord], BAR, fc=900, att=0.3, rel=0.6), t, 0.06, rev=0.4)
    # 結論へ（drive の後半）明るいパッド
    if s == 'drive' and bib == 0 and t >= 133:
        place(pad([n + 12 for n in chord], BAR, fc=2200, att=0.2, rel=0.5), t, 0.07, rev=0.5)

# ---------------- 映像の出来事へのアクセント ----------------
EV = [
    # v2（タイポグラフィー中心）の出来事: 文字の着地・ワイプ・押し出し・素材の動作
    (0.15, 'impact', 0.26),  # その資料、
    (2.3, 'impact', 0.16),  # 「上司」に印（資料が渡る拍）
    (3.55, 'impact', 0.24),  # 通じますか？
    (7.35, 'riser', 0.22),  # 「？」から紫の円
    (8.15, 'impact', 0.24),  # レビュー
    (10.2, 'whoosh', 0.26),  # 紫 → 濃紺のワイプ
    (10.62, 'impact', 0.28),  # まず聞く。
    (12.0, 'impact', 0.34),  # 誰
    (12.6, 'whoosh', 0.16),  # 行き先の二人
    (14.45, 'riser', 0.24),  # 「誰」へ飛び込む
    (15.0, 'impact', 0.26),  # 誰が読むか。
    (17.5, 'whoosh', 0.2),  # 資料が読み手の側へ回り込む
    (19.35, 'impact', 0.14),  # 直す所に印
    (19.75, 'impact', 0.12),
    (20.1, 'impact', 0.12),
    (21.3, 'whoosh', 0.24),  # 濃紺のワイプ
    (22.3, 'impact', 0.24),  # 会議の場がせり出す
    (25.6, 'impact', 0.18),  # 経緯を知り、
    (29.45, 'whoosh', 0.26),  # 押し出し
    (30.0, 'impact', 0.18),
    (31.1, 'impact', 0.2),  # 限らない。
    (32.0, 'whoosh', 0.14),  # 受け渡し
    (34.6, 'impact', 0.22),  # 担当者から、その上司へ。
    (37.35, 'riser', 0.22),  # 上司の紙面へ寄る
    (38.0, 'impact', 0.2),
    (40.1, 'impact', 0.26),  # 「なぜ、このやり方？」
    (42.3, 'whoosh', 0.22),  # 人物が退き、紙面が入る
    (43.4, 'impact', 0.2),  # その理由、資料にありますか？
    (46.45, 'whoosh', 0.26),
    (47.0, 'impact', 0.2),
    (49.0, 'drop', 0.22),  # 矢印が折れて落ちる
    (50.2, 'impact', 0.18),  # 担当者も説明できない。
    (52.58, 'impact', 0.32),  # 話が止まる（直後に抜き）
    (53.05, 'impact', 0.24),  # 欠けが前面へ
    (56.35, 'riser', 0.22),  # 空白の中へ
    (57.0, 'impact', 0.2),
    (58.0, 'impact', 0.18),  # ？
    (61.3, 'drop', 0.18),  # ？が落ちる
    (61.7, 'whoosh', 0.2),  # 説明の札が連結
    (62.3, 'impact', 0.2),
    (66.45, 'whoosh', 0.24),
    (67.0, 'impact', 0.18),
    (68.4, 'riser', 0.14),  # 話す流れが頁を飛び越える
    (70.6, 'impact', 0.22),  # 必要なページまで、消さなくていい。
    (72.6, 'riser', 0.24),  # 残す頁が手前へ
    (74.0, 'impact', 0.2),
    (77.0, 'drop', 0.16),  # 口頭の言葉の塊が縮む
    (79.1, 'whoosh', 0.22),  # 読む場へ振る
    (80.2, 'impact', 0.2),  # 紙面が展開
    (83.0, 'whoosh', 0.14),  # 両方を並べる
    (85.4, 'riser', 0.22),  # 理由の欄へ
    (86.0, 'impact', 0.18),
    (88.6, 'whoosh', 0.18),  # B が紙面へ
    (90.4, 'impact', 0.2),  # でも、選んだ理由がない。
    (92.0, 'impact', 0.2),  # 他のやり方は？
    (93.8, 'impact', 0.22),
    (96.4, 'riser', 0.22),  # 問いの中へ
    (97.0, 'impact', 0.18),
    (99.3, 'riser', 0.35),  # 理由の札が横断
    (101.3, 'impact', 0.42),  # 着地（後半の見せ場）
    (104.5, 'impact', 0.2),  # 他の候補も、一言。
    (108.45, 'whoosh', 0.24),  # 濃紺のワイプ
    (109.4, 'impact', 0.2),  # 自分が初めて聞くなら？
    (113.3, 'impact', 0.2),  # 問いが出る
    (114.1, 'impact', 0.16),
    (117.3, 'whoosh', 0.18),  # 振り分け
    (118.4, 'impact', 0.26),  # 二つの面
    (121.5, 'whoosh', 0.24),
    (122.4, 'impact', 0.2),  # 違いをつけるなら、理由を。
    (126.2, 'impact', 0.22),  # 今回の範囲
    (129.5, 'drop', 0.15),  # 意味のない差がそろう
    (132.4, 'whoosh', 0.2),
    (133.3, 'impact', 0.24),  # 記録も、報告も。
    (136.2, 'whoosh', 0.24),  # めくる
    (137.6, 'impact', 0.24),  # 誰の手に渡り、
    (141.5, 'whoosh', 0.18),
    (143.0, 'impact', 0.26),  # 作る前に、決めておく。
    (146.9, 'riser', 0.28),  # ライムの円
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
# 12 の連結線が伸びる拍に短い鈴
for j, at in enumerate((101.9, 102.4, 102.9)):
    place(bell(74 + 4 * j, 0.7), at, 0.07, pan=-0.4 + 0.4 * j, rev=0.4)

# ---------------- 148–153 秒: エンドロゴ ----------------
LOGO = 148.0
place(kick(0.9), LOGO, 0.7)
place(pad([62, 66, 69, 74], 5.0, fc=1800, att=0.05, rel=2.0), LOGO, 0.1, rev=0.5)
for k_, (at, g) in enumerate(((0.22, 0.25), (0.46, 0.16), (0.62, 0.1))):  # o の接地（DUR 2.6 秒の割合）
    place(bell(81 - k_ * 2, 0.5), LOGO + at * 2.6, g, rev=0.3)
place(whoosh(0.6, 2500, 400), LOGO + 2.6, 0.16)  # 全体の左スライド
for j in range(5):
    place(bell((86, 88, 90, 93, 98)[j], 0.5), LOGO + 3.0 + 0.08 * j, 0.07, pan=-0.3 + 0.15 * j, rev=0.4)  # .work の逐字

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
# 終わり: ロゴの保持（152–153）で余韻を収める
tail0 = int(151.9 * SR)
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
