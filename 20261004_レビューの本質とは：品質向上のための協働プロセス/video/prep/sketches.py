"""C12 の二案を薄紙に描いた下描き（鉛筆の線だけ）。

- rush：渡す人を急がせる案（腕を大きく前へ突き出す）。ためらいの間がなくなる。
- wait：受け手が待つ案（受け手の手を開いたまま上げておく）。
Q2 の最後のページ（受け手が先に手を下げた絵）との差の範囲だけを線画にする。
"""
from __future__ import annotations

import json

import numpy as np
from scipy import ndimage as ndi

import inner
from edits import zigzag
from imgutil import GEN, save_webp

SKETCHES = {
    "rush": {"giver": {"pose": "hold", "dx": 46}, "receiver": {"pose": "low", "dx": 0}, "cup": "giver"},
    "wait": {"giver": {"pose": "hold", "dx": 22}, "receiver": {"pose": "open", "dx": -7}, "cup": "giver"},
}
BASE = {"giver": {"pose": "hold", "dx": 22}, "receiver": {"pose": "low", "dx": 0}, "cup": "giver"}


def line_art(img: np.ndarray, region: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """色を落として、輪郭の濃い線と薄い陰だけを鉛筆の色で残す"""
    gray = img @ np.array([0.3, 0.59, 0.11], dtype=np.float32)
    edges = np.clip((205 - gray) / 110, 0, 1)
    shade = np.clip((250 - gray) / 255, 0, 1) * 0.14
    a = np.maximum(edges, shade) * region
    rgb = np.zeros_like(img) + np.array([62, 58, 54], dtype=np.float32)
    return rgb, np.clip(a * 0.9, 0, 1)


def build_sketches() -> dict:
    rig = inner.build_rig()
    base = inner.normalize(inner.compose(rig, BASE), rig.paper)
    out = {}
    for name, spec in SKETCHES.items():
        img = inner.normalize(inner.compose(rig, spec), rig.paper)
        diff = np.abs(img - base).max(axis=2) > 16
        region = ndi.binary_dilation(ndi.binary_opening(diff, iterations=2), iterations=4)
        # 新しく描く側（variant にだけある線）
        ink = (255 - img.min(axis=2)) > 30
        region &= ndi.binary_dilation(ink, iterations=2)
        if name == "wait":
            # 受け手の前腕と手だけ（袖や体の陰影まで描くと重くなる）
            region[:, 748:] = False
        rgb, a = line_art(img, ndi.gaussian_filter(region.astype(np.float32), 1.0))
        save_webp(rgb, GEN / "sketches" / f"{name}.webp", quality=88, alpha=a)
        out[name] = {"file": f"sketches/{name}.webp", "drawPath": zigzag(ndi.binary_dilation(region, iterations=2), 7)}
    (GEN / "sketches.json").write_text(json.dumps(out))
    return out


if __name__ == "__main__":
    print({k: len(v["drawPath"]) for k, v in build_sketches().items()})
