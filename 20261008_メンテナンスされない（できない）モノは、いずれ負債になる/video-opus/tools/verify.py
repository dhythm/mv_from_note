"""全編の技術検証: 尺・ストリーム・フレーム数、音声のピーク／クリップ／無音ブロック、字幕ストリームの有無。
結果は out/verify.json。使い方: .venv/bin/python tools/verify.py out/maintenance-full.mp4
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

src = Path(sys.argv[1])
root = Path(__file__).resolve().parent.parent
tl = json.loads((root / 'src' / 'lib' / 'timeline.json').read_text())
probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-count_frames', '-of', 'json', str(src)]))
streams = [{k: s.get(k) for k in ('codec_type', 'codec_name', 'width', 'height', 'r_frame_rate', 'nb_read_frames', 'duration', 'sample_rate', 'channels')} for s in probe['streams']]
raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(src), '-f', 'f32le', '-ac', '2', '-ar', '44100', '-'])
a = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
blk = 44100
rms = [20 * np.log10(np.sqrt(np.mean(a[i:i + blk] ** 2)) + 1e-9) for i in range(0, len(a), blk)]
res = {
    'file': str(src.resolve()),
    'duration_format': float(probe['format']['duration']),
    'expected_frames': tl['frames'],
    'streams': streams,
    'subtitle_streams': sum(1 for s in probe['streams'] if s['codec_type'] == 'subtitle'),
    'audio_sec': round(len(a) / 44100, 3),
    'audio_peak_dbfs': round(float(20 * np.log10(np.max(np.abs(a)) + 1e-9)), 2),
    'audio_clipped_samples': int(np.sum(np.abs(a) >= 0.999)),
    'silent_1s_blocks_below_-50dB': [int(i) for i, r in enumerate(rms) if r < -50],
    'rms_1s_min_max': [round(float(min(rms)), 1), round(float(max(rms)), 1)],
}
(root / 'out' / 'verify.json').write_text(json.dumps(res, ensure_ascii=False, indent=1))
print(json.dumps(res, ensure_ascii=False, indent=1))
