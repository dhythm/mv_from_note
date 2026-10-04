"""外側の机：手のない背景（複数の基準画から合成）と、手・道具の切り出し。

座標は全て基準画の 1600x900 の画素。K01〜K06 は同じ画角・同じ机から作られている（机の平均差は約5/255）。
"""
from __future__ import annotations

import numpy as np
from scipy import ndimage as ndi

from imgutil import GEN, feather, load, over, poly_mask, rect_poly, save_webp

KF = {
    "K01": "keyframes/01-worktable.webp",
    "K02": "keyframes/02-approved-cover.webp",
    "K03": "keyframes/03-open-again.webp",
    "K04": "keyframes/04-inspect-together.webp",
    "K05": "keyframes/05-draw-with-support.webp",
    "K06": "keyframes/06-shared-rest.webp",
}

# 手ごとの大まかな範囲（色の判定をこの中に限る）
HANDS = {
    "aL": ("K01", [(0, 600), (120, 420), (330, 320), (480, 318), (505, 480), (470, 600), (400, 760), (330, 900), (0, 900)], "skin|indigo"),
    "aLrest": ("K06", [(0, 620), (100, 420), (300, 345), (480, 350), (490, 520), (440, 700), (330, 900), (0, 900)], "skin|indigo"),
    "aR": ("K01", [(1040, 395), (1210, 395), (1480, 560), (1600, 700), (1600, 900), (1180, 900), (1060, 640)], "skin|indigo"),
    "aRcurl": ("K02", [(1060, 405), (1210, 405), (1480, 560), (1600, 700), (1600, 900), (1180, 900), (1070, 640)], "skin|indigo"),
    "aRpinch": ("K03", [(870, 425), (1060, 425), (1210, 520), (1240, 760), (1330, 900), (1060, 900), (960, 720), (870, 530)], "skin|indigo"),
    "aRwrite": ("K05", [(770, 290), (1000, 285), (1086, 330), (1102, 440), (1112, 560), (1150, 600), (1250, 660), (1450, 800), (1470, 900), (960, 900), (990, 660), (820, 540), (770, 400)], "skin|indigo|pencil|graphite"),
    "bRpoint": ("K04", [(890, 350), (1010, 350), (1260, 500), (1600, 600), (1600, 900), (1220, 900), (1150, 650), (940, 450)], "skin|green"),
    "bLsupport": ("K05", [(1100, 285), (1210, 285), (1380, 380), (1480, 520), (1600, 540), (1600, 900), (1440, 900), (1340, 700), (1150, 560), (1100, 420)], "skin|green"),
    "bRrest": ("K06", [(1040, 375), (1200, 375), (1450, 560), (1600, 640), (1600, 900), (1290, 900), (1090, 620)], "skin|green"),
}

# 袖の色を判定してよい範囲（手の影を袖と誤認しないため）
SLEEVES = {
    "aL": [(0, 680), (310, 680), (340, 900), (0, 900)],
    "aLrest": [(0, 680), (320, 680), (330, 900), (0, 900)],
    "aR": [(1270, 730), (1600, 690), (1600, 900), (1280, 900)],
    "aRcurl": [(1270, 730), (1600, 690), (1600, 900), (1280, 900)],
    "aRpinch": [(1040, 735), (1310, 735), (1345, 900), (1040, 900)],
    "aRwrite": [(975, 595), (1250, 600), (1475, 900), (955, 900)],
}
BOOK_RECT = rect_poly(440, 200, 1150, 575)

# 机に置かれた道具（全ての基準画で同じ位置）
PROPS = {
    "pencil": ("K01", rect_poly(525, 645, 1015, 690)),
    "eraser": ("K01", [(185, 95), (330, 75), (360, 140), (345, 200), (215, 210), (190, 170)]),
    "stamp": ("K01", [(1170, 12), (1280, 12), (1280, 178), (1170, 178)]),
}


def classes(im: np.ndarray) -> dict[str, np.ndarray]:
    R, G, B = im[..., 0], im[..., 1], im[..., 2]
    lum = 0.3 * R + 0.59 * G + 0.11 * B
    return {
        "skin": (R - G > 24) & (R > 90) & (R - B > 42),
        "indigo": (B > R + 4) & (lum < 80),
        "green": (G > B + 6) & (G > R - 6) & (lum < 165) & (lum > 45),
        "pencil": (R > 140) & (G > 95) & (B < 95) & (R - B > 70),
        # 鉛筆の芯の先（K05 の手の中の鉛筆の先端だけ）
        "graphite": (lum < 120) & poly_mask(im.shape[:2], rect_poly(774, 368, 800, 390)),
    }


def hand_mask(im: np.ndarray, poly, kinds: str, sleeve=None) -> np.ndarray:
    c = classes(im)
    shape = im.shape[:2]
    # 表紙（クラフト紙）は肌に近いので、本の上では肌の判定を厳しくする
    R, G = im[..., 0], im[..., 1]
    book = poly_mask(shape, BOOK_RECT)
    c["skin"] &= ~book | (R - G > 36)
    # 黄土色の鉛筆を肌と取り違えない
    c["skin"] &= ~c["pencil"]
    m = np.zeros(shape, dtype=bool)
    for k in kinds.split("|"):
        cls = c[k]
        if k == "indigo" and sleeve is not None:
            cls = cls & poly_mask(shape, sleeve)
        m |= cls
    m &= poly_mask(shape, poly)
    # 画面の端で形が削れないよう、端を複製してから整える
    P = 8
    m = np.pad(m, P, mode="edge")
    m = ndi.binary_opening(m, iterations=1)
    m = ndi.binary_closing(m, iterations=4)
    m = ndi.binary_fill_holes(m)[P:-P, P:-P]
    lab, n = ndi.label(m)
    if n > 1:
        sizes = ndi.sum(m, lab, range(1, n + 1))
        m = lab == (1 + int(np.argmax(sizes)))
    # 輪郭のギザギザをならす（端は複製してからぼかす）
    sm = ndi.gaussian_filter(np.pad(m, 8, mode="edge").astype(np.float32), 2.2)[8:-8, 8:-8]
    return sm > 0.5


# 全ての基準画にある左手（A が綴じ目を押さえる）
LEFT_POLY = [(0, 600), (120, 410), (330, 315), (490, 312), (510, 480), (480, 600), (400, 760), (340, 900), (0, 900)]


def shadow_grow(m: np.ndarray, grow: int = 10, offset: tuple[int, int] = (22, 16)) -> np.ndarray:
    """手の影（右下へ落ちる）も含めて広げる"""
    g = ndi.binary_dilation(m, iterations=grow)
    return g | (ndi.shift(g.astype(np.float32), offset, order=0) > 0.5)


def shifted(img: np.ndarray, dx: int, dy: int) -> np.ndarray:
    """out[y, x] = img[y + dy, x + dx]（画面外は端の画素。回り込みはしない）"""
    h, w = img.shape[:2]
    ys = np.clip(np.arange(h) + dy, 0, h - 1)
    xs = np.clip(np.arange(w) + dx, 0, w - 1)
    return img[ys][:, xs]


def harmonic(known: np.ndarray, value: np.ndarray, region: np.ndarray, scale: int = 4, iters: int = 400) -> np.ndarray:
    """region の中を、known の値から調和補間する（境界の色差を内側へなめらかに広げる）"""
    ys, xs = np.nonzero(region | known)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    k = known[y0:y1, x0:x1]
    v = value[y0:y1, x0:x1]
    h, w = k.shape
    hs, ws = (h + scale - 1) // scale, (w + scale - 1) // scale
    pad = np.zeros((hs * scale, ws * scale) + v.shape[2:], dtype=np.float32)
    kp = np.zeros((hs * scale, ws * scale), dtype=np.float32)
    pad[:h, :w] = v * k[..., None]
    kp[:h, :w] = k
    ks = kp.reshape(hs, scale, ws, scale).sum(axis=(1, 3))
    vs = pad.reshape(hs, scale, ws, scale, -1).sum(axis=(1, 3)) / np.maximum(ks, 1)[..., None]
    fixed = ks > (scale * scale) * 0.3
    cur = vs.copy()
    mean = vs[fixed].mean(axis=0) if fixed.any() else np.zeros(v.shape[2])
    cur[~fixed] = mean
    for _ in range(iters):
        p = np.pad(cur, ((1, 1), (1, 1), (0, 0)), mode="edge")
        avg = (p[:-2, 1:-1] + p[2:, 1:-1] + p[1:-1, :-2] + p[1:-1, 2:]) / 4
        cur = np.where(fixed[..., None], vs, avg)
    up = ndi.zoom(cur, (scale, scale, 1), order=1)[:h, :w]
    out = np.zeros_like(value)
    out[y0:y1, x0:x1] = ndi.gaussian_filter(up, (scale, scale, 0))
    return out


def patch_from(plate: np.ndarray, src_img: np.ndarray, poly, dx: int = 0, dy: int = 0, soft: float = 4,
               exclude: np.ndarray | None = None) -> np.ndarray:
    """poly の範囲を src_img の (dx, dy) ずらした画素で置き換える。
    周囲との色の差を内側へ調和補間して継ぎ目を消す（exclude の手や影は基準にしない）"""
    mask = poly_mask(plate.shape[:2], poly)
    src = shifted(src_img, dx, dy)
    ring = ndi.binary_dilation(mask, iterations=6) & ~ndi.binary_dilation(mask, iterations=2)
    if exclude is not None:
        ring &= ~exclude
    diff = ndi.gaussian_filter(plate - src, (2, 2, 0))
    d = harmonic(ring, diff, ndi.binary_dilation(mask, iterations=2))
    return over(plate, src + d, feather(mask, soft))


def build_plate(K: dict[str, np.ndarray]) -> np.ndarray:
    """K01 を土台に、手が動き回る右下だけを領域ごとに別の基準画・別の場所から張り替える。
    A の左手は全ての基準画で綴じ目を押さえているので背景に残し、同じ位置に前景の手を重ねる"""
    plate = K["K01"].copy()
    hands = hand_mask(plate, HANDS["aR"][1], "skin|indigo") | hand_mask(plate, LEFT_POLY, "skin|indigo")
    ex = shadow_grow(hands, grow=14, offset=(30, 24))
    # 鉛筆・消しゴム・印を机から外す（影も含めて張り替える）
    plate = patch_from(plate, plate, rect_poly(520, 638, 1024, 702), dy=74, soft=3, exclude=ex)
    plate = patch_from(plate, plate, [(168, 48), (350, 40), (440, 120), (446, 212), (168, 212)], dx=252, soft=6)
    plate = patch_from(plate, plate, rect_poly(168, 206, 446, 246), dy=46, soft=4)
    plate = patch_from(plate, plate, [(1156, 2), (1300, 2), (1330, 200), (1156, 200)], dx=-170, soft=6)
    base = plate.copy()
    # 右下：下帯は K01 中央下の机、本の右の影の帯は K01 の上側、右上は K04（周りを先に整えてから）
    plate = patch_from(plate, base, rect_poly(1030, 600, 1600, 900), dx=-560, exclude=ex)
    plate = patch_from(plate, base, rect_poly(1136, 388, 1330, 576), dy=-176, soft=3, exclude=ex)
    plate = patch_from(plate, plate, rect_poly(1136, 570, 1330, 612), dy=56, soft=4)
    plate = patch_from(plate, base, rect_poly(1030, 556, 1140, 604), dx=-200, soft=3, exclude=ex)
    plate = patch_from(plate, K["K04"], rect_poly(1322, 385, 1600, 612), soft=8)
    # 本の右端と右下の角に残る K01 の親指・指先：右端は同じ縁の上側（指のない範囲）から、下辺は左側から張る
    plate = patch_from(plate, plate, rect_poly(1098, 378, 1174, 604), dy=-160, soft=2)
    plate = patch_from(plate, plate, rect_poly(1030, 553, 1139, 604), dx=-210, soft=2)
    return plate


# 袖が画面の外へ出ていく向き（手の目印 → 袖の出口）。src/stage/arm.ts の ARM と同じ値
ARM_DIR = {
    "aL": ((300, 500), (100, 900)),
    "aLrest": ((300, 520), (100, 900)),
    "aR": ((1118, 430), (1480, 900)),
    "aRcurl": ((1118, 440), (1480, 900)),
    "aRpinch": ((903, 458), (1190, 900)),
    "aRwrite": ((781, 378), (1210, 900)),
    "bRpoint": ((906, 371), (1600, 760)),
    "bLsupport": ((1126, 312), (1600, 760)),
    "bRrest": ((1112, 400), (1600, 800)),
}


def extend_along(rgb: np.ndarray, a: np.ndarray, down: int, right: int, d: tuple[float, float], band: int = 10, touch_right: bool = True) -> tuple[np.ndarray, np.ndarray]:
    """袖を前腕の向きに沿って画面の外まで延ばす。外側の各画素は、袖の向きに戻った先の、
    元の画像の縁の少し内側の色と形を使う（布目は腕の向きに伸びる）"""
    h0, w0 = a.shape
    H, W = h0 + down, w0 + right
    dx, dy = d
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    s = np.zeros((H, W), dtype=np.float32)
    if down and dy > 0.05:
        s = np.maximum(s, (yy - (h0 - band)) / dy)
    if right and dx > 0.05 and touch_right:
        s = np.maximum(s, (xx - (w0 - band)) / dx)
    outside = (yy >= h0) | (xx >= w0)
    s = np.where(outside, np.maximum(s, 0), 0)
    qy = yy - s * dy
    qx = xx - s * dx
    valid = (qx >= 0) & (qy >= 0) & (qx <= w0 - 1) & (qy <= h0 - 1)
    qx = np.clip(qx, 0, w0 - 1)
    qy = np.clip(qy, 0, h0 - 1)
    out_rgb = np.stack([ndi.map_coordinates(rgb[..., c], [qy, qx], order=1) for c in range(3)], axis=2)
    out_a = ndi.map_coordinates(a, [qy, qx], order=1) * valid
    out_rgb[:h0, :w0] = rgb
    out_a[:h0, :w0] = a
    return out_rgb, out_a


def diff_mask(im: np.ndarray, plate: np.ndarray, poly, thresh: float = 34) -> np.ndarray:
    """手のない背景との差で形を取る（紙の上で影になった肌や金具も拾える）"""
    d = np.sqrt(((ndi.gaussian_filter(im, (1, 1, 0)) - ndi.gaussian_filter(plate, (1, 1, 0))) ** 2).sum(axis=2))
    m = (d > thresh) & poly_mask(im.shape[:2], poly)
    P = 8
    m = np.pad(m, P, mode="edge")
    m = ndi.binary_opening(m, iterations=2)
    m = ndi.binary_closing(m, iterations=5)
    m = ndi.binary_fill_holes(m)[P:-P, P:-P]
    lab, n = ndi.label(m)
    if n > 1:
        m = lab == (1 + int(np.argmax(ndi.sum(m, lab, range(1, n + 1)))))
    sm = ndi.gaussian_filter(np.pad(m, 8, mode="edge").astype(np.float32), 2.2)[8:-8, 8:-8]
    return sm > 0.5


def cut_sprites(K: dict[str, np.ndarray], masks: dict[str, np.ndarray]) -> dict[str, dict]:
    out = {}
    for name, (kf, _, _) in HANDS.items():
        m = masks[name]
        # 画面の端は外側も手が続くものとして収縮する（端が透けないように）
        a = feather(ndi.binary_erosion(np.pad(m, 3, mode="edge"), iterations=1)[3:-3, 3:-3], 0.9)
        ys, xs = np.nonzero(m)
        x0, x1, y0, y1 = max(xs.min() - 4, 0), min(xs.max() + 5, 1600), max(ys.min() - 4, 0), min(ys.max() + 5, 900)
        rgb, al = K[kf][y0:y1, x0:x1], a[y0:y1, x0:x1]
        (tx, ty), (sx, sy) = ARM_DIR[name]
        n = float(np.hypot(sx - tx, sy - ty))
        d = ((sx - tx) / n, (sy - ty) / n)
        # 斜め右下へ出ていく袖は、下だけでなく右にも余白を取る（部品の右端で袖が切れないように）
        right = 900 if x1 >= 1599 or (y1 >= 899 and d[0] > 0.2) else 0
        rgb, al = extend_along(rgb, al, 820 if y1 >= 899 else 0, right, d, touch_right=x1 >= 1599)
        size = save_webp(rgb, GEN / "parts" / f"hand-{name}.webp", quality=84, alpha=al)
        out[name] = {"file": f"parts/hand-{name}.webp", "x": int(x0), "y": int(y0), "w": int(rgb.shape[1]), "h": int(rgb.shape[0]), "bytes": size}
    for name, (kf, poly) in PROPS.items():
        img = K[kf]
        region = poly_mask(img.shape[:2], poly)
        c = classes(img)
        if name == "pencil":
            m = (c["pencil"] | (img.sum(axis=2) < 330) | ((img[..., 0] > 150) & (img[..., 2] > 120))) & region
            m = ndi.binary_closing(m, iterations=2)
            m = ndi.binary_fill_holes(m)
            lab, n = ndi.label(m)
            m = lab == (1 + int(np.argmax(ndi.sum(m, lab, range(1, n + 1)))))
        else:
            m = region
        a = feather(m, 0.8) if name == "pencil" else feather(ndi.binary_erosion(m, iterations=2), 1.5)
        ys, xs = np.nonzero(m)
        x0, x1, y0, y1 = xs.min() - 3, xs.max() + 4, ys.min() - 3, ys.max() + 4
        size = save_webp(img[y0:y1, x0:x1], GEN / "parts" / f"prop-{name}.webp", quality=86, alpha=a[y0:y1, x0:x1])
        out[name] = {"file": f"parts/prop-{name}.webp", "x": int(x0), "y": int(y0), "w": int(x1 - x0), "h": int(y1 - y0), "bytes": size}
    return out


def load_keyframes() -> dict[str, np.ndarray]:
    return {k: load(v) for k, v in KF.items()}


if __name__ == "__main__":
    K = load_keyframes()
    plate = build_plate(K)
    print("plate", save_webp(plate, GEN / "parts" / "plate.webp", quality=84) // 1024, "KiB")
    masks = {name: hand_mask(K[kf], poly, kinds, SLEEVES.get(name)) for name, (kf, poly, kinds) in HANDS.items()}
    print(cut_sprites(K, masks))
