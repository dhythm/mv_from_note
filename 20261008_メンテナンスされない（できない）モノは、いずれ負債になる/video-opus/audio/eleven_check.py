"""モデル一覧・声の利用可否・残クレジットを確認する（生成なし・クレジット消費なし）。結果は秘密を含まない形で保存。"""
import json
from pathlib import Path

from eleven_common import load_key, request

VOICE = 'S9yQN3065fl76yl0gxsW'
out = Path(__file__).resolve().parent / 'narration' / 'api-check.json'
out.parent.mkdir(parents=True, exist_ok=True)
key = load_key()

models, _ = request('GET', '/v1/models', key)
models = json.loads(models)
v4 = [m for m in models if m.get('model_id') == 'eleven_v4']
summary = {
    'model_ids': [m.get('model_id') for m in models],
    'eleven_v4': [
        {k: m.get(k) for k in ('model_id', 'name', 'can_do_text_to_speech', 'languages', 'max_characters_request_subscribed_user', 'token_cost_factor')}
        for m in v4
    ],
}
for m in summary['eleven_v4']:
    m['languages'] = [l.get('language_id') for l in (m['languages'] or [])]

voice, _ = request('GET', f'/v1/voices/{VOICE}', key)
voice = json.loads(voice)
summary['voice'] = {k: voice.get(k) for k in ('voice_id', 'name', 'category', 'labels', 'description')}

try:
    sub, _ = request('GET', '/v1/user/subscription', key)
    sub = json.loads(sub)
    summary['subscription'] = {k: sub.get(k) for k in ('tier', 'character_count', 'character_limit', 'next_character_count_reset_unix')}
except SystemExit as e:
    summary['subscription'] = f'取得不可: {e}'

out.write_text(json.dumps(summary, ensure_ascii=False, indent=2))
print(json.dumps(summary, ensure_ascii=False, indent=2))
