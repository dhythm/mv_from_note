"""共通キャラクター参照（企画側の採用画像）から10姿勢を切り出す。
座標は ../assets/source/build-plan.mjs の person() と同じ（絵コンテと同じ切り出し）。
出力: public/sprites/<role>-<pose>.png（足元を下端に揃えた透過PNG）と public/sprites/meta.json。Git 管理外。"""
import json
from pathlib import Path
from PIL import Image

src = Image.open('../assets/character/character-reference-imagegen-v1.webp').convert('RGBA')
poses = ['neutral', 'give', 'read', 'ask', 'think']
lefts = [132, 430, 795, 1086, 1491]
rights = [290, 738, 972, 1337, 1711]
heads = [210, 510, 884, 1257, 1550]
tops = {'staff': 18, 'boss': 454}
H = 412
out = Path('public/sprites')
out.mkdir(parents=True, exist_ok=True)
meta = {}
for role, top in tops.items():
    for i, pose in enumerate(poses):
        im = src.crop((lefts[i], top, rights[i], top + H))
        bb = im.split()[3].point(lambda a: 255 if a > 24 else 0).getbbox()
        # 余白を詰め、頭の中心 x と足元 y を記録（配置の基準）
        im = im.crop((0, bb[1], im.width, bb[3]))
        im.save(out / f'{role}-{pose}.png')
        meta[f'{role}-{pose}'] = {'w': im.width, 'h': im.height, 'headX': heads[i] - lefts[i]}
(out / 'meta.json').write_text(json.dumps(meta, indent=1))
print(json.dumps(meta))
