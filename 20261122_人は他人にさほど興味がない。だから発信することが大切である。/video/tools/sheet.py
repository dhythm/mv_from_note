"""スチルの一覧: python tools/sheet.py <t1,t2,...> [列数] → out/review/sheet_<n>.jpg（20 枚ごと）"""
import sys
from PIL import Image
ts = sys.argv[1].split(',')
cols = int(sys.argv[2]) if len(sys.argv) > 2 else 4
ims = [Image.open(f"out/review/still_{str(float(t)).rstrip('0').rstrip('.').replace('.', '_') if '.' in t else t}.png") for t in ts]
w, h = ims[0].size
per = cols * 5
for n in range(0, len(ims), per):
    sub = ims[n:n + per]
    rows = (len(sub) + cols - 1) // cols
    sh = Image.new('RGB', (w * cols + 5 * (cols - 1), (h + 5) * rows), 'black')
    for i, im in enumerate(sub):
        sh.paste(im, ((i % cols) * (w + 5), (i // cols) * (h + 5)))
    sh.save(f"out/review/sheet_{n}.jpg", quality=85)
print(w, h, len(ims))
