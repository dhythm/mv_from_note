"""エンドロゴの翻訳の点検: 原本 okady-work-logo.svg のパス・キーフレーム値・イージング・transform-origin が
src/components/Logo.tsx に同じ値で入っているかを文字列で照合する。結果は out/logo-check.json"""
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parent.parent
svg = (root.parent.parent / 'okady-work-logo.svg').read_text()
tsx = (root / 'src' / 'components' / 'Logo.tsx').read_text()
norm = lambda s: re.sub(r'\s+', ' ', s).strip()
res = {}
# パス
# 背景の矩形 (id=bg) は画面全体の #d2ff1a 塗りに置き換えるため照合から外す
paths = [p for p in re.findall(r'\sd="([^"]+)"', svg) if p != 'M 0,0 H 1250 V 400 H 0 Z']
res['paths'] = [{'head': p[:40], 'found': norm(p) in norm(tsx)} for p in paths]
# 数値（キーフレーム・イージング・origin・遅延・色）
needles = [
    '620', '240', '-8', '-798', '-309', '-260', '-70', '-22', '1.16, 0.84', '0.95, 1.05', '1.1, 0.9', '1.05, 0.95', '1.04, 0.96',
    '326.59 263.04', '326.59 218.5', '194', '0.2, 0.6, 0.35, 1', '0.55, 0, 1, 0.45', '0, 0.55, 0.45, 1', '0.7, 0, 0.2, 1', '0.2, 0.7, 0.3, 1',
    '0.42, 0, 0.58, 1', '3.0 + 0.08', '18', 'translate(110,127.64) scale(0.67)', '#0A0A0A', '755.4', '616.4', '673.34', '371',
]
res['values'] = {n: (n in tsx) for n in needles}
res['bg_color_same'] = ('#d2ff1a' in svg) and ("'#d2ff1a'" in tsx)
res['all_ok'] = all(p['found'] for p in res['paths']) and all(res['values'].values()) and res['bg_color_same']
(root / 'out' / 'logo-check.json').write_text(json.dumps(res, ensure_ascii=False, indent=1))
print(json.dumps({'all_ok': res['all_ok'], 'missing_paths': [p['head'] for p in res['paths'] if not p['found']], 'missing_values': [k for k, v in res['values'].items() if not v]}, ensure_ascii=False))
