"""ナレーションの読み違いを機械で照合する: .venv/bin/python tools/transcribe.py [モデルID]
各区切り（audio/voice/<id>.mp3）を Gemini に聞かせ、台本と違う読みを挙げさせる。耳での試聴の代わりではない。
キーは GEMINI_API_KEY（環境変数かリポジトリ直下の .env）。値は表示しない。結果は audio/voice/transcript.json。"""
import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
model = sys.argv[1] if len(sys.argv) > 1 else 'gemini-3.8-flash'


def key() -> str:
    k = os.environ.get('GEMINI_API_KEY')
    if k:
        return k
    f = REPO / '.env'
    if f.exists():
        for line in f.read_text().splitlines():
            if line.startswith('GEMINI_API_KEY='):
                return line.split('=', 1)[1].strip().strip('"')
    sys.exit('GEMINI_API_KEY が見つかりません')


spec = json.loads((ROOT / 'audio' / 'narration.json').read_text())
out = {}
for seg in spec['segments']:
    f = ROOT / 'audio' / 'voice' / f"{seg['id']}.mp3"
    prompt = f"日本語のナレーション音声です。台本は「{seg['text']}」。JSON で答えてください。キー: transcript（聞こえたとおり。漢字かな交じり）, misreadings（台本と読みが違う語、抜けた語、不自然に聞こえるアクセントの語の配列。無ければ空配列）"
    body = {'contents': [{'parts': [{'inline_data': {'mime_type': 'audio/mp3', 'data': base64.b64encode(f.read_bytes()).decode()}}, {'text': prompt}]}], 'generationConfig': {'responseMimeType': 'application/json', 'temperature': 0}}
    req = urllib.request.Request(f'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent', data=json.dumps(body).encode(), headers={'x-goog-api-key': key(), 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            out[seg['id']] = json.loads(json.loads(r.read())['candidates'][0]['content']['parts'][0]['text'])
    except urllib.error.HTTPError as e:
        out[seg['id']] = {'error': f'{e.code}: {e.read()[:200].decode("utf8", "ignore")}'}
    except Exception as e:
        out[seg['id']] = {'error': str(e)}
(ROOT / 'audio' / 'voice' / 'transcript.json').write_text(json.dumps({'model': model, 'segments': out}, ensure_ascii=False, indent=1))
for k, v in out.items():
    print(k, v.get('misreadings', v.get('error')), '|', v.get('transcript', '')[:200])
