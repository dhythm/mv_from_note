"""声を映像の設計位置へ置く: python audio/place.py → audio/voice/placed.wav, audio/voice/placed.json
カットごとに 1 区切りで生成した声（audio/voice/<id>.mp3）を使う。読みの流れを切らないことを優先する。
- 読点（、）で終わる文の後ろは切らない。次の文と元の音のまま続ける（読点の間は生成された読みのまま）。
- 句点（。）の後ろだけで切り、間は元の読みの間を PERIOD_MAX 秒まで残す（詰めすぎない）。
- カットごとにまとまりを前後へずらし、各文の始まりが narration.json の at（映像の設計）から最も離れない位置に置く。
  narration.json のカットに "anchor": n があれば、n 番目（0 始まり）の文の始まりを at に合わせる。
声そのものの速さ・音程は変えない。"""
import json
import re
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
HOP = int(0.005 * SR)
SIL_DB = -45  # これより小さい区間を無音とみなす
PERIOD_MAX = 0.55  # 句点の後ろに残す間の上限（聞こえる無音の秒）
PERIOD_MIN = 0.35
HEAD = 0.04  # 切り出しの前後に残す余白
TAIL = 0.12
ROOT = Path(__file__).resolve().parents[1]
strip = lambda s: re.sub(r'[\s、。「」？?！!,.]', '', s)


def load(p):
    try:
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    except (OSError, subprocess.CalledProcessError) as e:
        raise SystemExit(f'{p} を読めない: {e}')
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768


def loud(x):
    n = len(x) // HOP
    rms = np.sqrt(np.mean(x[: n * HOP].reshape(n, HOP) ** 2, axis=1) + 1e-12)
    return 20 * np.log10(rms) > SIL_DB


def pause(v, a, b):
    """語の時刻 a..b の近くで最も長い無音の区間（秒）を返す"""
    lo = max(0, int((a - 0.4) * SR / HOP))
    hi = min(len(v), int((b + 0.4) * SR / HOP))
    best = (0, lo, lo)
    i = lo
    while i < hi:
        if not v[i]:
            j = i
            while j < hi and not v[j]:
                j += 1
            if j - i > best[0]:
                best = (j - i, i, j)
            i = j
        else:
            i += 1
    return best[1] * HOP / SR, best[2] * HOP / SR


try:
    design = json.loads((ROOT / 'narration.json').read_text())
    words = json.loads((ROOT / 'audio' / 'voice' / 'words.json').read_text())
    tl = json.loads((ROOT / 'src' / 'timeline.json').read_text())
except (OSError, json.JSONDecodeError) as e:
    raise SystemExit(f'設定を読めない: {e}')
total = sum(c['dur'] for c in tl['cuts']) + tl['logoDur']
starts = {}
acc = 0.0
for c in tl['cuts']:
    starts[c['id']] = acc
    acc += c['dur']

out = np.zeros(int(total * SR))
log = []
prev_end = 0.0
warn = False
for cut in design['cuts']:
    cid = cut['cut']
    lines = cut['lines']
    x = load(ROOT / 'audio' / 'voice' / f'{cid}.mp3')
    v = loud(x)
    ws = words[cid]['words']
    idx = np.flatnonzero(v)
    first, last = idx[0] * HOP / SR, (idx[-1] + 1) * HOP / SR
    # 文の境目の無音（元の音の秒）: (無音の始まり, 無音の終わり)
    targets = np.cumsum([len(strip(l['text'])) for l in lines])
    bounds = []
    acc_c = 0
    k = 0
    for i, (w, a, b) in enumerate(ws):
        acc_c += len(strip(w))
        if k < len(targets) - 1 and acc_c >= targets[k]:
            bounds.append(pause(v, b, ws[i + 1][1] if i + 1 < len(ws) else b))
            k += 1
    if len(bounds) != len(lines) - 1:
        raise SystemExit(f'{cid}: 文の切れ目が見つからない {bounds}')
    src_on = [first] + [b[1] for b in bounds]  # 各文の声の出だし
    src_off = [b[0] for b in bounds] + [last]  # 各文の声の終わり
    # 読点の後ろは切らず、句点の後ろだけで切る
    rel = []  # 各文の始まり（カットの声の頭からの秒）
    segs = []  # (置く位置, 元の音の始まり, 終わり)
    t = 0.0
    g0 = 0
    for i in range(len(lines)):
        if i == len(lines) - 1 or not lines[i]['text'].rstrip().endswith('、'):
            for j in range(g0, i + 1):
                rel.append(t + src_on[j] - src_on[g0])
            segs.append((t, src_on[g0], src_off[i]))
            t += src_off[i] - src_on[g0]
            if i < len(lines) - 1:
                t += min(PERIOD_MAX, max(PERIOD_MIN, src_on[i + 1] - src_off[i]))
            g0 = i + 1
    at = [starts[cid] + l['at'] - cut['start'] for l in lines]
    d = [a - r for a, r in zip(at, rel)]
    off = d[cut['anchor']] if 'anchor' in cut else (min(d) + max(d)) / 2
    off = max(off, starts[cid] + 0.1, prev_end + 0.3)
    for t0, a, b in segs:
        s0 = max(0, int((a - HEAD) * SR))
        seg = x[s0:min(len(x), int((b + TAIL) * SR))].copy()
        fi, fo = int(0.02 * SR), int(0.08 * SR)
        seg[:fi] *= np.linspace(0, 1, fi)
        seg[-fo:] *= np.linspace(1, 0, fo)
        i0 = int((off + t0) * SR) - (int(a * SR) - s0)
        out[i0:i0 + len(seg)] += seg[: len(out) - i0]
    prev_end = off + segs[-1][0] + segs[-1][2] - segs[-1][1]
    for l, r, a, e in zip(lines, rel, at, src_off):
        log.append({'cut': cid, 'text': l['text'], 'design': round(a, 2), 'start': round(off + r, 2)})
    for n, (i, e) in enumerate(zip(range(len(lines)), src_off)):
        log[len(log) - len(lines) + n]['end'] = round(log[len(log) - len(lines) + n]['start'] + e - src_on[n], 2)
    cut_end = starts[cid] + next(c['dur'] for c in tl['cuts'] if c['id'] == cid)
    over = prev_end >= cut_end - 0.2
    warn = warn or over
    print(cid, f'声の終わり {prev_end:.2f} / カットの終わり {cut_end:.2f}', ' ← 食い込む' if over else '')
try:
    with wave.open(str(ROOT / 'audio' / 'voice' / 'placed.wav'), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
    (ROOT / 'audio' / 'voice' / 'placed.json').write_text(json.dumps(log, ensure_ascii=False, indent=1))
except OSError as e:
    raise SystemExit(f'書き出せない: {e}')
for i, l in enumerate(log):
    gap = '' if i == 0 else f" 間 {l['start'] - log[i - 1]['end']:.2f}"
    print(f"  {l['cut']} {l['start']:7.2f}–{l['end']:7.2f} (設計 {l['design']:.2f}, ずれ {l['start'] - l['design']:+.2f}){gap} {l['text']}")
if warn:
    print('カットの終わりに食い込む声がある', file=sys.stderr)
