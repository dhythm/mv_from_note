"""声の候補を同じ文で生成して比べる: .venv/bin/python tools/voice_audition.py
共有ライブラリの声を自分のライブラリへ追加し（未追加のときだけ）、audio/audition/<名前>.mp3 に保存する。
キーは環境変数 ELEVENLABS_API_KEY か、リポジトリ直下の .env から読む。値は表示・保存しない。"""
import base64
import json
import os
import subprocess
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
OUT = ROOT / 'audio' / 'audition'
OUT.mkdir(parents=True, exist_ok=True)
MODEL = os.environ.get('MODEL', 'eleven_v4')
TEXT = '「技術的には可能です」と言った瞬間、交渉は負けています。断るためのえんきょくが、選ぶ権利を渡してしまいます。いっかげつ後なら、さんばいでも間に合わないことがあります。'
CANDIDATES = {
    'otani': '3JDquces8E8bkmvbh6Bc',
    'hatake_kohei': 'sRYzP8TwEiiqAWebdYPJ',
    'koichi_deep_calm': 'H8ZPDxbrPcks5hEsi2fq',
    'toshi': 'TzUI53GPXnGDRdeLAWZ4',
    'kozy': 'GxxMAMfQkDlnqjpzjLHH',
    'yuma_uchida': 'EHMH9cyd1z3rXm4z0Jja',
}


def api_key() -> str:
    k = os.environ.get('ELEVENLABS_API_KEY')
    if k:
        return k
    for name in ('.env', '.env.local'):
        f = REPO / name
        if f.exists():
            for line in f.read_text().splitlines():
                if line.startswith('ELEVENLABS_API_KEY='):
                    return line.split('=', 1)[1].strip().strip('"')
    sys.exit('ELEVENLABS_API_KEY が見つかりません')


def call(method: str, url: str, body=None):
    req = urllib.request.Request(url, method=method, data=json.dumps(body).encode() if body is not None else None,
                                 headers={'xi-api-key': api_key(), 'Content-Type': 'application/json', 'Accept': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        return {'_error': f'{e.code}: {e.read()[:300].decode("utf8", "ignore")}'}
    except Exception as e:  # 通信の失敗は候補ごとに記録して続ける
        return {'_error': str(e)}


mine = {v['voice_id'] for v in call('GET', 'https://api.elevenlabs.io/v2/voices?page_size=100').get('voices', [])}
report = {}
for name, vid in CANDIDATES.items():
    if vid not in mine:
        sh = call('GET', 'https://api.elevenlabs.io/v1/shared-voices?' + urllib.parse.urlencode({'search': vid, 'page_size': 5}))
        hit = next((v for v in sh.get('voices', []) if v.get('voice_id') == vid), None)
        if not hit:
            report[name] = {'error': f"共有ライブラリで見つからない {sh.get('_error', '')}"}
            continue
        add = call('POST', f"https://api.elevenlabs.io/v1/voices/add/{hit['public_owner_id']}/{vid}", {'new_name': hit['name']})
        if '_error' in add:
            print(f'{name}: ライブラリへ追加できない（{add["_error"][:60]}）。id を直接指定して試す')
    f = OUT / f'{name}.mp3'
    if not f.exists():
        j = call('POST', f'https://api.elevenlabs.io/v1/text-to-speech/{vid}/with-timestamps?output_format=mp3_44100_128',
                 {'text': TEXT, 'model_id': MODEL, 'language_code': 'ja', 'seed': 20261125,
                  'voice_settings': {'stability': 0.5, 'similarity_boost': 0.8, 'style': 0.35, 'use_speaker_boost': True, 'speed': 1.1}})
        if '_error' in j:
            report[name] = {'error': 'TTS 失敗 ' + j['_error']}
            continue
        f.write_bytes(base64.b64decode(j['audio_base64']))
    d = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(f)], capture_output=True, text=True, check=True).stdout)
    report[name] = {'voice_id': vid, 'duration': round(d, 2), 'chars_per_sec': round(len(TEXT) / d, 2)}
(OUT / 'report.json').write_text(json.dumps({'model': MODEL, 'text': TEXT, 'voices': report}, ensure_ascii=False, indent=1))
print(json.dumps(report, ensure_ascii=False, indent=1))
