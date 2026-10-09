"""企画の reading-timeline.json（v2）から、制作用の src/lib/timeline.json を作る。
120BPM（1小節＝2秒）。v2のカット境界 8/20/32/42/56/66/80/96/106/118 秒はすべて小節頭に一致する。"""
import json
from pathlib import Path

root = Path(__file__).resolve().parent.parent
src = json.loads((root.parent / 'reading-timeline.json').read_text())
out = {
    'fps': 30,
    'bpm': 120,
    'duration': src['duration'],
    'logoStart': 118.0,
    'cuts': [{'cut': c['cut'], 'start': c['start'], 'end': c['end'], 'beats': c['beats']} for c in src['cuts']],
}
for c in out['cuts']:
    assert abs(c['start'] / 2 - round(c['start'] / 2)) < 1e-9, c
(root / 'src' / 'lib' / 'timeline.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(out['duration'], len(out['cuts']))
