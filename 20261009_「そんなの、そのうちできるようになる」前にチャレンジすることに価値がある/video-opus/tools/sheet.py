"""確認用: 画像を時刻ラベル付きで並べる。 python tools/sheet.py out.png [--cols 3] img1 img2 ...
動画から等間隔のコマを並べる: python tools/sheet.py out.png --video in.mp4 --start S --end E --step D"""
import argparse
import subprocess
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw

ap = argparse.ArgumentParser()
ap.add_argument('out')
ap.add_argument('imgs', nargs='*')
ap.add_argument('--cols', type=int, default=3)
ap.add_argument('--w', type=int, default=640)
ap.add_argument('--video')
ap.add_argument('--start', type=float, default=0)
ap.add_argument('--end', type=float, default=0)
ap.add_argument('--step', type=float, default=1)
ap.add_argument('--offset', type=float, default=0, help='動画の0秒が本編の何秒か（ラベル用）')
a = ap.parse_args()

items = []
if a.video:
    tmp = Path(tempfile.mkdtemp())
    t = a.start
    i = 0
    while t < a.end - 1e-6:
        p = tmp / f'f{i:04d}.png'
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{t:.3f}', '-i', a.video, '-frames:v', '1', str(p)], check=True)
        items.append((p, f'{t + a.offset:.2f}s'))
        t += a.step
        i += 1
else:
    def key(f):
        try:
            return float(Path(f).stem.replace('still_', '').replace('_', '.'))
        except ValueError:
            return 0.0  # 時刻名でない画像は渡した順のまま

    for f in sorted(a.imgs, key=key):
        items.append((Path(f), Path(f).stem.replace('still_', '').replace('_', '.') + 's'))

w = a.w
h = w * 9 // 16
rows = (len(items) + a.cols - 1) // a.cols
sheet = Image.new('RGB', (w * a.cols, h * rows), (0, 0, 0))
d = ImageDraw.Draw(sheet)
for k, (p, label) in enumerate(items):
    im = Image.open(p).convert('RGB').resize((w, h))
    x = (k % a.cols) * w
    y = (k // a.cols) * h
    sheet.paste(im, (x, y))
    d.rectangle([x, y, x + 90, y + 22], fill=(0, 0, 0))
    d.text((x + 6, y + 5), label, fill=(255, 230, 0))
sheet.save(a.out)
print(a.out, len(items))
