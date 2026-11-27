"""YouTube サムネイル（1280x720）。左に題名、右に夜の机で打ち続ける手（cut04_night のコマ）。

使い方: .venv/bin/python tools/thumbnail.py <背景コマ.png> <出力.jpg>
"""
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1280, 720
PAPER = (247, 244, 238)
INK = (26, 25, 22)
RUST = (184, 84, 32)
FONT = Path(__file__).resolve().parents[2] / 'assets/fonts/NotoSansJP-wght.ttf'


def font(size: int, weight: int) -> ImageFont.FreeTypeFont:
    f = ImageFont.truetype(str(FONT), size)
    try:
        f.set_variation_by_axes([weight])
    except (OSError, AttributeError) as e:
        print(f'太さの指定に失敗: {e}', file=sys.stderr)
    return f


def main(src: str, dst: str) -> None:
    if not FONT.exists():
        sys.exit(f'フォントがない: {FONT}')
    bg = Image.open(src).convert('RGB')
    # 縦を 720 に合わせ、ノート PC と手が右寄りに来るよう切る
    s = H / bg.height
    bg = bg.resize((round(bg.width * s), H), Image.LANCZOS).filter(ImageFilter.UnsharpMask(2, 60, 2))
    canvas = Image.new('RGB', (W, H), PAPER)
    x0 = W - bg.width + 150
    canvas.paste(bg, (x0, 0))

    # 左から紙色へ溶かす
    grad = Image.new('L', (W, 1))
    for x in range(W):
        k = min(1.0, max(0.0, (x - 560) / 300))
        grad.putpixel((x, 0), round(255 * (1 - k)))
    canvas.paste(Image.new('RGB', (W, H), PAPER), (0, 0), grad.resize((W, H)))

    d = ImageDraw.Draw(canvas)
    lines = [
        # 「 は字の左半分が空白なので、半角ぶん左へ出して行頭をそろえる
        ('「背伸びして', 96, 900, INK, 70 - 48, 48),
        ('頑張ります」', 96, 900, INK, 70, 158),
        ('と言うPMほど、', 54, 700, INK, 74, 300),
        ('プロジェクトを', 78, 900, INK, 70, 390),
        ('燃やす', 140, 900, RUST, 62, 478),
    ]
    for text, size, weight, color, x, y in lines:
        d.text((x, y), text, font=font(size, weight), fill=color)
    canvas.save(dst, quality=92)
    print(dst)


if __name__ == '__main__':
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
