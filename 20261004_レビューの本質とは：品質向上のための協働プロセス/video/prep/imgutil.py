"""部品生成の共通処理（numpy / Pillow / scipy）。"""
from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as ndi

ROOT = Path(__file__).resolve().parents[2]  # 企画ディレクトリ
ASSETS = ROOT / "assets"
GEN = ROOT / "video" / "public" / "gen"


def load(rel: str) -> np.ndarray:
    """assets/ 以下の画像を float32 RGB (0..255) で読む"""
    path = ASSETS / rel
    if not path.exists():
        raise FileNotFoundError(path)
    return np.asarray(Image.open(path).convert("RGB")).astype(np.float32)


def poly_mask(shape: tuple[int, int], poly: list[tuple[float, float]]) -> np.ndarray:
    m = Image.new("L", (shape[1], shape[0]), 0)
    ImageDraw.Draw(m).polygon(poly, fill=255)
    return np.asarray(m) > 127


def rect_poly(x0: float, y0: float, x1: float, y1: float) -> list[tuple[float, float]]:
    return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]


def paper_map(img: np.ndarray, thresh: float = 14, sigma: float = 30) -> np.ndarray:
    """絵の部分を除いた紙の色を、ぼかして画面全体に広げる"""
    med = np.median(img.reshape(-1, 3), axis=0)
    fg = np.abs(img - med).max(axis=2) > thresh
    fg = ndi.binary_dilation(fg, iterations=8)
    valid = (~fg).astype(np.float32)
    out = np.empty_like(img)
    w = ndi.gaussian_filter(valid, sigma) + 1e-6
    for c in range(3):
        out[..., c] = ndi.gaussian_filter(img[..., c] * valid, sigma) / w
    return out


def silhouette(img: np.ndarray, paper: np.ndarray, region: np.ndarray, thresh: float = 16) -> np.ndarray:
    """紙との差から、線で閉じた形（手・腕・カップ）を塗りつぶしたアルファ 0..1 を作る。
    内側は 1、輪郭の外側の淡い部分だけ紙との差に応じて透かす"""
    diff = np.sqrt(((img - paper) ** 2).sum(axis=2))
    m = (diff > thresh) & region
    m = ndi.binary_closing(m, iterations=2)
    m = ndi.binary_fill_holes(m)
    lab, n = ndi.label(m)
    if n > 1:
        sizes = ndi.sum(m, lab, range(1, n + 1))
        m = np.isin(lab, 1 + np.flatnonzero(sizes > 40))
    core = ndi.binary_erosion(m, iterations=1)
    edge = ndi.binary_dilation(m, iterations=1) & ~core
    a = core.astype(np.float32) + edge * np.clip((diff - 6) / 30, 0, 1)
    return np.clip(a, 0, 1) * region


def decontaminate(img: np.ndarray, paper: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    """半透明の輪郭に混ざった紙色を取り除く（白いふち対策）"""
    a = np.maximum(alpha, 0.05)[..., None]
    fg = (img - (1 - a) * paper) / a
    return np.where(alpha[..., None] < 0.999, np.clip(fg, 0, 255), img)


def seam_mask(a: np.ndarray, b: np.ndarray, x0: int, x1: int, top: tuple[int, int], bottom: tuple[int, int]) -> np.ndarray:
    """a と b の差が最小になる上下の継ぎ目（DP）で区切った領域のマスク"""
    h, w = a.shape[:2]
    cost = np.abs(a - b).sum(axis=2)

    def seam(y0: int, y1: int) -> np.ndarray:
        c = cost[y0:y1, x0:x1].T.copy()  # 列ごとに行を選ぶ
        acc = c.copy()
        back = np.zeros_like(c, dtype=np.int64)
        for i in range(1, c.shape[0]):
            prev = acc[i - 1]
            cand = np.stack([np.roll(prev, 1), prev, np.roll(prev, -1)])
            cand[0, 0] = np.inf
            cand[2, -1] = np.inf
            k = cand.argmin(axis=0)
            back[i] = k - 1
            acc[i] = c[i] + cand.min(axis=0)
        rows = np.zeros(c.shape[0], dtype=np.int64)
        rows[-1] = int(acc[-1].argmin())
        for i in range(c.shape[0] - 1, 0, -1):
            rows[i - 1] = rows[i] + back[i, rows[i]]
        return rows + y0

    t = seam(*top)
    btm = seam(*bottom)
    m = np.zeros((h, w), dtype=bool)
    for j, x in enumerate(range(x0, x1)):
        m[t[j] : btm[j], x] = True
    return m


def vertical_seam(a: np.ndarray, b: np.ndarray, x_band: tuple[int, int], y0: int, y1: int) -> np.ndarray:
    """a と b の差が最小になる縦の継ぎ目（各行の x）"""
    ta = np.transpose(a, (1, 0, 2))
    tb = np.transpose(b, (1, 0, 2))
    m = seam_mask(ta, tb, y0, y1, x_band, (x_band[1] + 1, x_band[1] + 2))
    # m[x, y] が True になる最初の x が継ぎ目
    xs = np.argmax(m[:, y0:y1], axis=0)
    return xs


def seam_box(a: np.ndarray, b: np.ndarray, x_band: tuple[int, int], x1: int, top: tuple[int, int], bottom: tuple[int, int]) -> np.ndarray:
    """左は縦の継ぎ目、上下は横の継ぎ目、右は x1 で区切ったマスク"""
    m = seam_mask(a, b, x_band[0], x1, top, bottom)
    xs = vertical_seam(a, b, x_band, top[0], bottom[1])
    for j, y in enumerate(range(top[0], bottom[1])):
        m[y, : xs[j]] = False
    return m


def feather(mask: np.ndarray, sigma: float) -> np.ndarray:
    return np.clip(ndi.gaussian_filter(mask.astype(np.float32), sigma), 0, 1)


def over(dst: np.ndarray, src: np.ndarray, alpha: np.ndarray) -> np.ndarray:
    return dst * (1 - alpha[..., None]) + src * alpha[..., None]


def save_webp(arr: np.ndarray, path: Path, quality: int = 82, alpha: np.ndarray | None = None) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    rgb = np.clip(arr, 0, 255).astype(np.uint8)
    if alpha is not None:
        a = np.clip(alpha * 255, 0, 255).astype(np.uint8)
        im = Image.fromarray(np.dstack([rgb, a]), "RGBA")
    else:
        im = Image.fromarray(rgb, "RGB")
    im.save(path, "WEBP", quality=quality, method=6)
    return path.stat().st_size
