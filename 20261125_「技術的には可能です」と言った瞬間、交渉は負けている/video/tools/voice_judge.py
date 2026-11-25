"""声の候補を Gemini に聞かせ、書き起こしと読みの評価を取る: .venv/bin/python tools/voice_judge.py [モデルID]
耳での試聴の代わりではない（機械による比較）。キーは GEMINI_API_KEY（環境変数かリポジトリ直下の .env）。値は表示しない。"""
import base64
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
AUD = ROOT / 'audio' / 'audition'


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


def call(url, body=None):
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body else None, headers={'x-goog-api-key': key(), 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {'_error': f'{e.code}: {e.read()[:300].decode("utf8", "ignore")}'}
    except Exception as e:
        return {'_error': str(e)}


BASE = 'https://generativelanguage.googleapis.com/v1beta'
if len(sys.argv) < 2:
    ms = call(f'{BASE}/models?pageSize=200')
    print(ms.get('_error') or '\n'.join(m['name'] for m in ms.get('models', []) if 'generateContent' in m.get('supportedGenerationMethods', [])))
    sys.exit()
model = sys.argv[1]
rep = json.loads((AUD / 'report.json').read_text())
PROMPT = f"""日本語のナレーション音声です。台本は次のとおりです。
「{rep['text']}」
次を JSON で答えてください。キー: transcript（聞こえたとおりの書き起こし）, misreadings（台本と違う読み・不自然なアクセントの語の配列）, pace（遅い/ふつう/速い）, pitch（低い/中/高い）, tone（声の印象を20字以内）, naturalness（1-10。抑揚と間の自然さ）, clarity（1-10。滑舌）, fit（1-10。ビジネスの解説動画の、落ち着いた大人の男性ナレーションとしての適性）, artifacts（ノイズ・機械的な歪み・不自然な息の有無を20字以内）"""
out = {}
for name in rep['voices']:
    f = AUD / f'{name}.mp3'
    if not f.exists():
        continue
    r = call(f'{BASE}/models/{model}:generateContent', {
        'contents': [{'parts': [{'inline_data': {'mime_type': 'audio/mp3', 'data': base64.b64encode(f.read_bytes()).decode()}}, {'text': PROMPT}]}],
        'generationConfig': {'responseMimeType': 'application/json', 'temperature': 0},
    })
    try:
        out[name] = json.loads(r['candidates'][0]['content']['parts'][0]['text'])
    except Exception:
        out[name] = {'error': r.get('_error') or str(r)[:300]}
(AUD / 'judge.json').write_text(json.dumps({'model': model, 'voices': out}, ensure_ascii=False, indent=1))
print(json.dumps(out, ensure_ascii=False, indent=1))
