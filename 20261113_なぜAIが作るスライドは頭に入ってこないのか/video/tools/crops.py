"""採用ページの切り出し: python3 tools/crops.py → public/page-pres.png, public/page-doc.png
企画書の座標（x=800, y=40, 幅=321, 高さ=181）で原本から切り、拡大表示用に 4 倍へ再標本化する（Lanczos）。
文字・色・数字は書き換えない。原本（../assets/source/）は変更しない。"""
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT.parent / 'assets' / 'source'
BOX = (800, 40, 800 + 321, 40 + 181)
(ROOT / 'public').mkdir(exist_ok=True)
for src, dst in (('2026-11-07_14-54-08.webp', 'page-pres.png'), ('2026-11-07_14-52-40.webp', 'page-doc.png')):
    try:
        im = Image.open(SRC / src).convert('RGB').crop(BOX)
    except OSError as e:
        raise SystemExit(f'原本を開けません: {src}: {e}')
    im.resize((im.width * 4, im.height * 4), Image.LANCZOS).save(ROOT / 'public' / dst)
    print(dst, im.size)
