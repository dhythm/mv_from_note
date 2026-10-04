"""描き直しの途中の絵：消した後（erased）と、消しゴム・鉛筆の走査経路。

before と after の差がある範囲だけを消し、after をなぞって描き足す。
Remotion 側は before → erased（消しゴムの経路でマスク）→ after（鉛筆の経路でマスク）と重ねる。
"""
from __future__ import annotations

import json

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

from imgutil import GEN, save_webp

# 描き直す版の組（ページ表の版名）
TRANSITIONS = [("Q0", "Q1"), ("Q1", "Q2"), ("Q2", "Q3")]


def load_page(key: str) -> np.ndarray:
    return np.asarray(Image.open(GEN / "pages" / f"{key}.webp").convert("RGB")).astype(np.float32)


def zigzag(mask: np.ndarray, spacing: int, margin: int = 4) -> list[list[float]]:
    """mask を横の往復線で覆う経路（鉛筆・消しゴムの動き）"""
    ys, xs = np.nonzero(mask)
    if len(ys) == 0:
        return []
    pts: list[list[float]] = []
    flip = False
    for y in range(int(ys.min()), int(ys.max()) + 1, spacing):
        row = np.nonzero(mask[y])[0]
        if len(row) == 0:
            continue
        x0, x1 = float(row.min() - margin), float(row.max() + margin)
        pts += [[x1, y], [x0, y]] if flip else [[x0, y], [x1, y]]
        flip = not flip
    return pts


def build_edits(meta: dict) -> dict:
    out = {}
    for a, b in TRANSITIONS:
        for i, (ka, kb) in enumerate(zip(meta["versions"][a], meta["versions"][b])):
            if ka == kb:
                continue
            name = f"{ka}__{kb}"
            if name in out:
                continue
            A, B = load_page(ka), load_page(kb)
            diff = np.abs(A - B).max(axis=2) > 18
            diff = ndi.binary_opening(diff, iterations=1)
            region = ndi.binary_dilation(diff, iterations=7)
            # 消した跡：わずかに灰色が残る
            erased = A.copy()
            smudge = np.full_like(A, 246.0)
            soft = ndi.gaussian_filter(region.astype(np.float32), 2)[..., None]
            erased = erased * (1 - soft) + smudge * soft
            save_webp(erased, GEN / "edits" / f"{name}.webp", quality=80)
            # 消す範囲：before にだけ描かれているもの／描く範囲：after にだけ描かれているもの
            ink_a = (255 - A.min(axis=2)) > 30
            ink_b = (255 - B.min(axis=2)) > 30
            erase_m = ndi.binary_dilation(region & ink_a, iterations=4)
            draw_m = ndi.binary_dilation(region & ink_b, iterations=3)
            ys, xs = np.nonzero(region)
            out[name] = {
                "before": ka,
                "after": kb,
                "erased": f"edits/{name}.webp",
                "box": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
                "erasePath": zigzag(erase_m, 12),
                "drawPath": zigzag(draw_m, 6),
            }
    (GEN / "edits.json").write_text(json.dumps(out))
    return out


if __name__ == "__main__":
    meta = json.loads((GEN / "pages.json").read_text())
    e = build_edits(meta)
    print(len(e), "edits")
