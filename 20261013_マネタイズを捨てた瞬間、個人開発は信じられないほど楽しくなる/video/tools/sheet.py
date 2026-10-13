"""スチルの一覧を作る: python tools/sheet.py out.png t1,t2,... （out/review/still_<t>.png を並べ、時刻を書き込む）"""
import sys
from PIL import Image, ImageDraw
out, ts = sys.argv[1], sys.argv[2].split(',')
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4
ims = [Image.open(f"out/review/still_{t.replace('.', '_')}.png").convert('RGB') for t in ts]
w, h = ims[0].size
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h), 'gray')
for i, (im, t) in enumerate(zip(ims, ts)):
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 60, 20], fill='black')
    d.text((4, 4), f"{t}s", fill='white')
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(out)
