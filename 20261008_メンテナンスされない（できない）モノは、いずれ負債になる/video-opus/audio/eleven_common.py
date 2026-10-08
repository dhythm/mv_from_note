"""ElevenLabs API の共通処理。キーは環境変数か通常コピーの Git 対象外 .env から読み、表示・保存しない。"""
import json
import os
import urllib.error
import urllib.request
from pathlib import Path

# 通常コピーのルート（ワークツリーには .env を置かない）
MAIN_ROOT = Path('/Users/yuta.okada/local/dev/mv_from_note')
API = 'https://api.elevenlabs.io'


def load_key():
    for name in ('ELEVENLABS_API_KEY', 'ElevenLabsAPIKey'):
        if os.environ.get(name):
            return os.environ[name]
    env = MAIN_ROOT / '.env'
    if env.exists():
        for line in env.read_text().splitlines():
            name, sep, value = line.strip().partition('=')
            if sep and name.strip() in ('ELEVENLABS_API_KEY', 'ElevenLabsAPIKey'):
                return value.strip().strip('"\'')
    raise SystemExit('APIキーが見つかりません')


def request(method, path, key, body=None, timeout=180):
    data = json.dumps(body, ensure_ascii=False).encode() if body is not None else None
    req = urllib.request.Request(
        API + path,
        data=data,
        method=method,
        headers={'xi-api-key': key, 'Content-Type': 'application/json'},
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            headers = {k: r.headers.get(k) for k in ('request-id', 'character-cost', 'x-character-count', 'content-type')}
            return r.read(), headers
    except urllib.error.HTTPError as e:
        # エラー本文にキーが含まれていても出さない
        msg = e.read().decode(errors='replace').replace(key, '[REDACTED]')[:600]
        raise SystemExit(f'HTTP {e.code}: {msg}')
