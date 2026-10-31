"""ナレーションの読みの照合と語の時刻: .venv/bin/python tools/transcribe.py → audio/voice/words.json
ローカルの faster-whisper（large-v3、キャッシュ済みモデル）で書き起こす。外部へは送らない。"""
import json
import subprocess
from pathlib import Path

import numpy as np
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parents[1]
spec = json.loads((ROOT / 'audio' / 'narration.json').read_text())
model = WhisperModel('Systran/faster-whisper-large-v3', device='cpu', compute_type='int8', local_files_only=True)
out = {}
for seg in spec['segments']:
    # 音声は ffmpeg で 16kHz モノラルにして渡す（av の版の差を避ける）
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(ROOT / 'audio' / 'voice' / f"{seg['id']}.mp3"), '-ac', '1', '-ar', '16000', '-f', 's16le', '-'], capture_output=True, check=True).stdout
    pcm = np.frombuffer(raw, np.int16).astype(np.float32) / 32768
    segs, _ = model.transcribe(pcm, language='ja', word_timestamps=True, beam_size=5)
    words = [(w.word, round(w.start, 2), round(w.end, 2)) for s in segs for w in s.words]
    text = ''.join(w[0] for w in words)
    out[seg['id']] = {'script': seg['text'], 'heard': text, 'words': words}
    print(seg['id'], '原稿:', seg['text'])
    print('   書起:', text)
(ROOT / 'audio' / 'voice' / 'words.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
