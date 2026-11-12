"""ナレーションの文間の長い無音だけを詰める: python3 audio/tighten.py → audio/voice/<id>.tight.wav
声そのものの速さ・音程は変えない（eleven_v4 では speed の設定で尺が変わらなかったため）。
-40 dBFS 未満が MAX_GAP 秒より長く続く区間を、MAX_GAP 秒に縮める。区間の端は 20 ms のクロスフェードでつなぐ。
頭と末尾の無音は 0.05 秒だけ残す。結果の長さは audio/voice/tight.json。"""
import json
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 44100
MAX_GAP = 0.34
ROOT = Path(__file__).resolve().parents[1]
spec = json.loads((ROOT / 'audio' / 'narration.json').read_text())
vdir = ROOT / 'audio' / 'voice'


def load(p: Path) -> np.ndarray:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(p), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.int16).astype(np.float64) / 32768


def tighten(x: np.ndarray):
    hop = int(0.01 * SR)
    n = len(x) // hop
    rms = np.sqrt(np.mean(x[: n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
    loud = 20 * np.log10(rms) > -40
    idx = np.flatnonzero(loud)
    if len(idx) == 0:
        raise SystemExit('無音だけの音声')
    first, last = idx[0], idx[-1]
    keep_head = int(0.05 * SR)
    out = [np.zeros(keep_head)]
    gaps = []
    i = first
    seg_start = first * hop
    while i <= last:
        if not loud[i]:
            j = i
            while j <= last and not loud[j]:
                j += 1
            glen = (j - i) * hop / SR
            if glen > MAX_GAP:
                cut_a = i * hop + int(MAX_GAP / 2 * SR)
                cut_b = j * hop - int(MAX_GAP / 2 * SR)
                out.append(x[seg_start:cut_a])
                seg_start = cut_b
                gaps.append(round(glen - MAX_GAP, 2))
            i = j
        else:
            i += 1
    out.append(x[seg_start:(last + 1) * hop])
    out.append(np.zeros(keep_head))
    # つなぎ目は短いクロスフェード（無音どうしなので実質クリックを避けるだけ）
    y = out[0]
    f = int(0.02 * SR)
    for s in out[1:]:
        if len(y) > f and len(s) > f:
            ramp = np.linspace(0, 1, f)
            y = np.concatenate([y[:-f], y[-f:] * (1 - ramp) + s[:f] * ramp, s[f:]])
        else:
            y = np.concatenate([y, s])
    return y, gaps


info = {}
for seg in spec['segments']:
    x = load(vdir / f"{seg['id']}.mp3")
    y, gaps = tighten(x)
    with wave.open(str(vdir / f"{seg['id']}.tight.wav"), 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes((np.clip(y, -1, 1) * 32767).astype(np.int16).tobytes())
    info[seg['id']] = {'raw': round(len(x) / SR, 2), 'tight': round(len(y) / SR, 2), 'cut_gaps': gaps}
    print(seg['id'], info[seg['id']])
(vdir / 'tight.json').write_text(json.dumps(info, ensure_ascii=False, indent=1))
print('total raw', round(sum(v['raw'] for v in info.values()), 2), 'tight', round(sum(v['tight'] for v in info.values()), 2))
