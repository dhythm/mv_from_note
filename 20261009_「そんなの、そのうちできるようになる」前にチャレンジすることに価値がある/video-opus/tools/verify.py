"""全編の技術検証: ストリーム・解像度・fps・フレーム数・尺、音声の終端・ピーク・クリップ・意図しない無音、
字幕ストリームの有無、ロゴ区間の背景色。結果は out/verify.json
使い方: .venv/bin/python tools/verify.py out/challenge-full.mp4"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np

src = Path(sys.argv[1])
root = Path(__file__).resolve().parent.parent
tl = json.loads((root / 'src' / 'lib' / 'timeline.json').read_text())
expected_frames = round(tl['duration'] * tl['fps'])
probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-count_frames', '-of', 'json', str(src)]))
streams = [{k: s.get(k) for k in ('codec_type', 'codec_name', 'profile', 'width', 'height', 'r_frame_rate', 'nb_read_frames', 'duration', 'sample_rate', 'channels', 'pix_fmt')} for s in probe['streams']]
raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(src), '-map', '0:a', '-f', 'f32le', '-ac', '2', '-ar', '48000', '-'])
a = np.frombuffer(raw, dtype=np.float32).reshape(-1, 2)
sr = 48000
mono = a.mean(axis=1)
blk = sr // 2
rms = [20 * np.log10(np.sqrt(np.mean(mono[i:i + blk] ** 2)) + 1e-9) for i in range(0, len(mono) - blk + 1, blk)]
# ロゴ区間の背景色（左上の画素）
frame_png = root / 'out' / '_logo_px.png'
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', '122.5', '-i', str(src), '-frames:v', '1', '-vf', 'crop=8:8:20:20', str(frame_png)], check=True)
from PIL import Image

px = Image.open(frame_png).convert('RGB').getpixel((4, 4))
v = next(s for s in probe['streams'] if s['codec_type'] == 'video')
res = {
    'file': str(src.resolve()),
    'duration_format': float(probe['format']['duration']),
    'expected_frames': expected_frames,
    'video_frames': int(v['nb_read_frames']),
    'frames_match': int(v['nb_read_frames']) == expected_frames,
    'streams': streams,
    'subtitle_streams': sum(1 for s in probe['streams'] if s['codec_type'] == 'subtitle'),
    'audio_sec': round(len(a) / sr, 3),
    'audio_peak_dbfs': round(float(20 * np.log10(np.max(np.abs(a)) + 1e-9)), 2),
    'audio_clipped_samples': int(np.sum(np.abs(a) >= 0.999)),
    'quiet_0.5s_blocks_below_-45dB_sec': [round(i * 0.5, 1) for i, r in enumerate(rms) if r < -45],
    'rms_0.5s_min_max': [round(float(min(rms)), 1), round(float(max(rms)), 1)],
    'audio_last_1s_rms_db': round(float(20 * np.log10(np.sqrt(np.mean(mono[-sr:] ** 2)) + 1e-9)), 1),
    'audio_last_0.1s_rms_db': round(float(20 * np.log10(np.sqrt(np.mean(mono[-sr // 10:] ** 2)) + 1e-9)), 1),
    'logo_bg_rgb_at_122.5s': px,
}
(root / 'out' / 'verify.json').write_text(json.dumps(res, ensure_ascii=False, indent=1))
print(json.dumps(res, ensure_ascii=False, indent=1))
