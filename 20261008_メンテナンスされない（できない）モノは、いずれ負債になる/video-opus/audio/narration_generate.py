"""eleven_v4 でカット別にナレーションを生成する。既存の原音は再生成しない（クレジット節約）。

使い方: python narration_generate.py [cut番号 ...]   省略時は全カット
with-timestamps エンドポイントで文字単位の時刻も保存し、映像の要点の同期に使う。
"""
import base64
import json
import subprocess
import sys
from pathlib import Path

from eleven_common import load_key, request

here = Path(__file__).resolve().parent
plan = json.loads((here / 'narration-plan.json').read_text())
folder = here / 'narration' / 'v4'
folder.mkdir(parents=True, exist_ok=True)
targets = [int(a) for a in sys.argv[1:]] or [c['cut'] for c in plan['cuts']]
key = load_key()

for c in plan['cuts']:
    if c['cut'] not in targets:
        continue
    dst = folder / f"cut-{c['cut']:02d}.mp3"
    if dst.exists():
        print('reuse', dst.name, flush=True)
        continue
    body = {
        'text': c['text'],
        'model_id': plan['model_id'],
        'language_code': plan['language_code'],
        'voice_settings': plan['voice_settings'],
        'seed': plan['seed'],
    }
    raw, headers = request(
        'POST',
        f"/v1/text-to-speech/{plan['voice_id']}/with-timestamps?output_format=mp3_44100_192",
        key,
        body,
    )
    res = json.loads(raw)
    dst.write_bytes(base64.b64decode(res['audio_base64']))
    dur = float(subprocess.check_output(
        ['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', str(dst)]))
    record = {
        'cut': c['cut'],
        'voice_id': plan['voice_id'],
        'body': body,
        'chars': len(c['text']),
        'response_headers': headers,
        'duration': dur,
        'alignment': res.get('alignment'),
        'normalized_alignment': res.get('normalized_alignment'),
    }
    dst.with_suffix('.json').write_text(json.dumps(record, ensure_ascii=False, indent=1))
    print(c['cut'], round(dur, 2), 's', headers, flush=True)
