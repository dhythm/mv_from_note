"""内側のパラパラ漫画：P01 の体に、腕・手・カップを差し替えてページを合成する。

座標は全て状態見本の 1280x720 の画素。ページ表は scripts/export-timeline.ts が書き出す pages.json。
"""
from __future__ import annotations

import json
from dataclasses import dataclass

import numpy as np
from scipy import ndimage as ndi

from imgutil import GEN, decontaminate, feather, load, over, paper_map, poly_mask, rect_poly, save_webp, seam_box, seam_mask, silhouette

# 渡す人：袖口（腕の付け根）と手首の x。袖口〜手首を伸縮し、手首から先を平行移動する
GIVER_CUFF, GIVER_WRIST = 524, 560
# 受け手：袖口と手首の x（手は左向き）
RECV_CUFF, RECV_WRIST = 744, 706

# P01 から消す（紙に戻す）範囲：二人の前腕・手・カップ
CLEAR_POLY = [(528, 224), (736, 224), (736, 330), (528, 330)]
# 紙の地合いを取る、何も描かれていない範囲
GRAIN_BOX = (60, 230, 340, 340)


@dataclass
class Sprite:
    rgb: np.ndarray  # 画像全体と同じ大きさ
    alpha: np.ndarray


@dataclass
class Rig:
    base: np.ndarray
    paper: np.ndarray
    giver: dict[str, Sprite]
    recv_open: Sprite
    recv_patch: dict[str, Sprite]
    cup: Sprite


def build_rig() -> Rig:
    P = {k: load(f"inner/{f}.webp") for k, f in {
        "P00": "page-00-shape-error", "P01": "page-01-offer", "P02": "page-02-contact-gap",
        "P03": "page-03-too-early", "P04": "page-04-received"}.items()}
    paper = paper_map(P["P01"])
    shape = P["P01"].shape[:2]

    # 体だけの下地：前腕の範囲を、紙の色＋紙の地合い（何もない範囲から敷き詰め）で置き換える
    base = P["P01"].copy()
    clear = poly_mask(shape, CLEAR_POLY)
    x0, y0, x1, y1 = GRAIN_BOX
    patch = P["P01"][y0:y1, x0:x1]
    grain = patch - ndi.gaussian_filter(patch, (6, 6, 0))
    reps = (shape[0] // grain.shape[0] + 1, shape[1] // grain.shape[1] + 1, 1)
    fill = paper + np.tile(grain, reps)[: shape[0], : shape[1]]
    base = over(base, fill, feather(clear, 1.0))

    def sil(key: str, poly) -> Sprite:
        img = P[key]
        pm = paper_map(img)
        a = silhouette(img, pm, poly_mask(shape, poly))
        return Sprite(decontaminate(img, pm, a), a)

    giver = {
        "hold": sil("P01", rect_poly(GIVER_CUFF - 8, 226, 616, 304)),
        "holdTall": sil("P00", rect_poly(GIVER_CUFF - 8, 196, 616, 304)),
        "open": sil("P02", rect_poly(GIVER_CUFF - 8, 226, 612, 304)),
    }
    # 下ろした手（P04）は袖の向きも違うので、袖ごと継ぎ目で差し替える
    rel = seam_box(P["P01"], P["P04"], (455, 505), 610, (212, 240), (345, 372))
    giver["rel"] = Sprite(P["P04"], feather(rel, 1.5))
    recv_open = sil("P01", rect_poly(630, 252, RECV_CUFF + 8, 332))

    def patch(key: str) -> Sprite:
        m = seam_mask(P["P01"], P[key], 680, 890, (212, 252), (425, 470))
        return Sprite(P[key], feather(m, 2.0))

    recv_patch = {"low": patch("P03"), "hold": patch("P04")}
    cup = sil("P02", rect_poly(618, 238, 668, 276))
    return Rig(base, paper, giver, recv_open, recv_patch, cup)


def _warp_columns(sp: Sprite, src_x: np.ndarray, dy: np.ndarray) -> Sprite:
    """出力の各列 X を、元画像の列 src_x[X]・縦ずれ dy[X] から取る（双線形）"""
    h, w = sp.alpha.shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    sx = np.broadcast_to(src_x[None, :], (h, w))
    sy = yy - dy[None, :]
    pre = sp.rgb * sp.alpha[..., None]
    out_a = ndi.map_coordinates(sp.alpha, [sy, sx], order=1, mode="constant")
    out = np.stack([ndi.map_coordinates(pre[..., c], [sy, sx], order=1, mode="constant") for c in range(3)], axis=2)
    rgb = np.where(out_a[..., None] > 1e-4, out / np.maximum(out_a[..., None], 1e-4), 0)
    return Sprite(rgb, out_a)


def reach(sp: Sprite, cuff: int, wrist: int, dx: float, rise: float) -> Sprite:
    """袖口を固定し、手首から先を dx 動かす（前腕は伸縮）。rise は手首の上下"""
    if dx == 0 and rise == 0:
        return sp
    w = sp.alpha.shape[1]
    X = np.arange(w, dtype=np.float32)
    src = X.copy()
    dy = np.zeros(w, dtype=np.float32)
    nw = wrist + dx
    if wrist > cuff:  # 手が右側（渡す人）
        fore = (X > cuff) & (X <= nw)
        src[fore] = cuff + (X[fore] - cuff) * (wrist - cuff) / (nw - cuff)
        hand = X > nw
        src[hand] = X[hand] - dx
        dy[fore] = rise * (X[fore] - cuff) / (nw - cuff)
        dy[hand] = rise
    else:  # 手が左側（受け手）
        fore = (X < cuff) & (X >= nw)
        src[fore] = cuff - (cuff - X[fore]) * (cuff - wrist) / (cuff - nw)
        hand = X < nw
        src[hand] = X[hand] - dx
        dy[fore] = rise * (cuff - X[fore]) / (cuff - nw)
        dy[hand] = rise
    return _warp_columns(sp, src, dy)


def shift(sp: Sprite, dx: float, dy: float) -> Sprite:
    return Sprite(ndi.shift(sp.rgb, (dy, dx, 0), order=1), ndi.shift(sp.alpha, (dy, dx), order=1))


# カップの置き場所（P02 の浮いたカップからのずれ）
CUP_FLOAT = (14, -8)  # 渡す人の手より先、受け手の指より上
CUP_PALM = (26, 16)  # 受け手の手のひら（受け手の dx を加える）
CUP_LOW = (103, 94)  # 腰へ下げた受け手の両手の間


def compose(rig: Rig, spec: dict) -> np.ndarray:
    img = rig.base.copy()
    g, r, cup = spec["giver"], spec["receiver"], spec["cup"]
    if r["pose"] == "open":
        sp = reach(rig.recv_open, RECV_CUFF, RECV_WRIST, r["dx"], rise=-0.15 * max(-r["dx"], 0))
        img = over(img, sp.rgb, sp.alpha)
    else:
        sp = rig.recv_patch[r["pose"]]
        img = over(img, sp.rgb, sp.alpha)
    gs = rig.giver[g["pose"]]
    if g["pose"] in ("hold", "holdTall", "open"):
        gs = reach(gs, GIVER_CUFF, GIVER_WRIST, g["dx"], rise=-0.2 * g["dx"])
    img = over(img, gs.rgb, gs.alpha)
    loose = None
    if cup == "float":
        loose = shift(rig.cup, *CUP_FLOAT)
    elif cup == "receiver" and r["pose"] == "open":
        loose = shift(rig.cup, CUP_PALM[0] + r["dx"], CUP_PALM[1] + (-0.15 * max(-r["dx"], 0)))
    elif cup == "receiver" and r["pose"] == "low":
        loose = shift(rig.cup, *CUP_LOW)
    if loose is not None:
        img = over(img, loose.rgb, loose.alpha)
    return img


def normalize(img: np.ndarray, paper: np.ndarray) -> np.ndarray:
    """紙色で割って地を白にする（本のページへ乗算で合成するため）"""
    return np.clip(img / np.maximum(paper, 1) * 255, 0, 255)


def build_pages() -> dict[str, int]:
    meta = json.loads((GEN / "pages.json").read_text())
    rig = build_rig()
    sizes = {}
    for key, spec in meta["pages"].items():
        img = compose(rig, spec)
        sizes[key] = save_webp(normalize(img, rig.paper), GEN / "pages" / f"{key}.webp", quality=80)
    return sizes


if __name__ == "__main__":
    s = build_pages()
    print(len(s), "pages", sum(s.values()) // 1024, "KiB")
