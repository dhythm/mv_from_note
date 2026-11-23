"""ElevenLabs の使用文字数（生成前後の記録用）: python3 tools/el_usage.py
キーは audio/tts.py と同じ読み方。値は表示しない。"""
import json
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'audio'))
REPO = Path(__file__).resolve().parents[3]


def key():
    import os
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


req = urllib.request.Request('https://api.elevenlabs.io/v1/user/subscription', headers={'xi-api-key': key()})
try:
    with urllib.request.urlopen(req, timeout=30) as r:
        d = json.loads(r.read())
except Exception as e:  # 確認できなければ未確認として扱う
    sys.exit(f'取得失敗: {e}')
print(json.dumps({k: d.get(k) for k in ('tier', 'character_count', 'character_limit', 'next_character_count_reset_unix')}))
