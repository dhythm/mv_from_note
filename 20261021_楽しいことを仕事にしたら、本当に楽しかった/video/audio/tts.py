"""ナレーションを ElevenLabs で生成する（ユーザーの明示依頼に基づく。AGENTS.md「APIによるナレーション生成」）。
  .venv/bin/python audio/tts.py            → audio/voice/<id>.mp3（原稿が変わった区切りだけ再生成）
キーは環境変数 ELEVENLABS_API_KEY か、リポジトリ直下の .env.local から読む。値は表示・保存しない。
生成の記録（区切り・文字数・回数・長さ）は audio/voice/log.json。"""
import hashlib
import json
import os
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
spec = json.loads((ROOT / 'audio' / 'narration.json').read_text())
out = ROOT / 'audio' / 'voice'
out.mkdir(exist_ok=True)
logp = out / 'log.json'
log = json.loads(logp.read_text()) if logp.exists() else {'requests': 0, 'characters': 0, 'segments': {}}


def api_key():
    k = os.environ.get('ELEVENLABS_API_KEY') or os.environ.get('ElevenLabsAPIKey')
    if k:
        return k
    for name in ('.env', '.env.local'):
        f = REPO / name
        if f.exists():
            for line in f.read_text().splitlines():
                if line.startswith('ELEVENLABS_API_KEY='):
                    return line.split('=', 1)[1].strip().strip('"')
    sys.exit('ELEVENLABS_API_KEY が見つかりません')


SETTINGS = {'stability': 0.45, 'similarity_boost': 0.8, 'style': 0.3, 'use_speaker_boost': True, 'speed': float(os.environ.get('SPEED', '1.0'))}


def tts(text: str, speed: float) -> bytes:
    body = {'text': text, 'model_id': spec['model_id'], 'language_code': 'ja', 'seed': int(os.environ.get('SEED', '20261021')), 'voice_settings': {**SETTINGS, 'speed': speed}}
    req = urllib.request.Request(
        f"https://api.elevenlabs.io/v1/text-to-speech/{spec['voice']['id']}?output_format=mp3_44100_128",
        data=json.dumps(body).encode(),
        headers={'xi-api-key': api_key(), 'Content-Type': 'application/json', 'Accept': 'audio/mpeg'},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        sys.exit(f'TTS 失敗 {e.code}: {e.read()[:300]!r}')


def dur(p: Path) -> float:
    return float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(p)], capture_output=True, text=True, check=True).stdout)


only = set(sys.argv[1:])  # 区切りの id を渡すと、その区切りだけを（原稿が同じでも）生成し直す
for seg in spec['segments']:
    if only and seg['id'] not in only:
        continue
    speed = float(seg.get('speed', SETTINGS['speed']))
    h = hashlib.sha1(f"{spec['model_id']}|{spec['voice']['id']}|{seg['text']}|{speed}".encode()).hexdigest()[:12]
    f = out / f"{seg['id']}.mp3"
    prev = log['segments'].get(seg['id'], {})
    if f.exists() and prev.get('hash') == h and not only:
        continue
    f.write_bytes(tts(seg['text'], speed))
    log['requests'] += 1
    log['characters'] += len(seg['text'])
    d = dur(f)
    log['segments'][seg['id']] = {'hash': h, 'text': seg['text'], 'speed': speed, 'duration': round(d, 2)}
    print(f"{seg['id']}: {d:.2f}s")
logp.write_text(json.dumps(log, ensure_ascii=False, indent=1))
print('requests', log['requests'], 'characters', log['characters'])
