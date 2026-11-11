"""声を置く: python3 audio/place.py → audio/voice/placed.wav, audio/voice/placed.json
カットごとに 1 区切りで生成した声（audio/voice/<id>.mp3）を、切らずにそのまま、
カットの頭 + voice 秒（src/timeline.json）に置く。読みの間・速さ・音程は生成されたまま。"""
import json
import subprocess
import wave
from pathlib import Path

import numpy as np

SR = 48000
ROOT = Path(__file__).resolve().parents[1]
tl = json.loads((ROOT / 'src' / 'timeline.json').read_text())
total = sum(c['dur'] for c in tl['cuts']) + tl['logoDur']
out = np.zeros(int(total * SR))
rec = []
s = 0.0
for c in tl['cuts']:
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(ROOT / 'audio' / 'voice' / f"{c['id']}.mp3"), '-ac', '1', '-ar', str(SR), '-f', 's16le', '-'], capture_output=True, check=True).stdout
    x = np.frombuffer(raw, np.int16).astype(np.float64) / 32768
    # 末尾の無音を落とす
    idx = np.flatnonzero(np.abs(x) > 0.004)
    x = x[: idx[-1] + int(0.08 * SR)] if len(idx) else x
    at = s + c['voice']
    end = at + len(x) / SR
    if end > s + c['dur'] - 0.05:
        print(f"!! {c['id']} の声がカットの終わりに食い込む: {end - (s + c['dur']):+.2f}s")
    i = int(at * SR)
    out[i : i + len(x)] += x[: len(out) - i]
    rec.append({'cut': c['id'], 'start': round(at, 2), 'end': round(end, 2), 'tail': round(s + c['dur'] - end, 2)})
    s += c['dur']
with wave.open(str(ROOT / 'audio' / 'voice' / 'placed.wav'), 'wb') as w:
    w.setnchannels(1)
    w.setsampwidth(2)
    w.setframerate(SR)
    w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
(ROOT / 'audio' / 'voice' / 'placed.json').write_text(json.dumps(rec, ensure_ascii=False, indent=1))
for r in rec:
    print(r)
