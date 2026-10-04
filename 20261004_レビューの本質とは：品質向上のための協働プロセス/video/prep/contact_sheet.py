"""検品用：版ごとに全ページを並べた一覧（output/ へ書き出す。Git 管理外）"""
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

from imgutil import GEN, ROOT

OUT = ROOT.parent / "output" / "opus-video" / "check"


def sheet(version: str, box=(400, 80, 900, 640), cols=8, scale=0.5) -> Path:
    meta = json.loads((GEN / "pages.json").read_text())
    keys = meta["versions"][version]
    w, h = int((box[2] - box[0]) * scale), int((box[3] - box[1]) * scale)
    rows = (len(keys) + cols - 1) // cols
    W = Image.new("RGB", (cols * w, rows * (h + 14)), "white")
    d = ImageDraw.Draw(W)
    for i, k in enumerate(keys):
        im = Image.open(GEN / "pages" / f"{k}.webp").convert("RGB").crop(box).resize((w, h), Image.LANCZOS)
        x, y = (i % cols) * w, (i // cols) * (h + 14)
        W.paste(im, (x, y + 14))
        d.text((x + 3, y + 1), f"{version} p{i}", fill=(200, 0, 0))
    OUT.mkdir(parents=True, exist_ok=True)
    p = OUT / f"inner_{version}.png"
    W.save(p)
    return p


if __name__ == "__main__":
    for v in sys.argv[1:] or ["Q0", "Q1", "Q2", "Q3"]:
        print(sheet(v))
