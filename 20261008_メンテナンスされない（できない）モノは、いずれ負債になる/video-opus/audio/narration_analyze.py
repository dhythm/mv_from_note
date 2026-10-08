"""各カットの原音の音量・長い無音・先頭末尾の無音を測る（API利用なし）。"""
import json
import re
import subprocess
from pathlib import Path

here = Path(__file__).resolve().parent
rows = []
for mp3 in sorted((here / 'narration' / 'v4').glob('cut-*.mp3')):
    vol = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(mp3), '-af', 'volumedetect', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    sil = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(mp3), '-af', 'silencedetect=n=-42dB:d=0.45', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    mean = re.search(r'mean_volume: (-?[\d.]+)', vol).group(1)
    peak = re.search(r'max_volume: (-?[\d.]+)', vol).group(1)
    starts = [float(x) for x in re.findall(r'silence_start: (-?[\d.]+)', sil)]
    ends = [float(x) for x in re.findall(r'silence_end: ([\d.]+)', sil)]
    rec = json.loads(mp3.with_suffix('.json').read_text())
    rows.append({'cut': rec['cut'], 'duration': round(rec['duration'], 2), 'mean_db': float(mean), 'peak_db': float(peak),
                 'silences': [[round(s, 2), round(e, 2)] for s, e in zip(starts, ends)]})
for r in rows:
    print(r)
(here / 'narration' / 'analysis.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1))
