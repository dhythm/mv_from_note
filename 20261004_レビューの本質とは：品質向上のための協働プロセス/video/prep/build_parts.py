"""部品を全て作り直す（npm run prep から呼ぶ）。出力は video/public/gen/（Git 管理外）。

1. 内側のページ（pages/）     … inner.py
2. 机の背景と手・道具（parts/） … outer.py
3. ページの紙（parts/page.webp）
4. 描き直しの途中（edits/）    … edits.py
5. 位置の台帳 parts.json
"""
from __future__ import annotations

import json
import shutil

import numpy as np

import edits
import inner
import outer
import sketches
from imgutil import GEN, save_webp

# 本の一番上のページ（綴じ目の右）。基準画 1600x900 の座標
PAGE_RECT = (483, 217, 1125, 555)


def build_page_texture(K: dict[str, np.ndarray]) -> int:
    """K01 のページを切り出し、右下の親指の範囲をページ内の別の場所で張り替える（切り出し後の座標で処理）"""
    x0, y0, x1, y1 = PAGE_RECT
    page = K["K01"][y0:y1, x0:x1].copy()
    page = outer.patch_from(page, page, outer.rect_poly(560, 168, 650, 345), dx=-170, soft=4)
    return save_webp(page, GEN / "parts" / "page.webp", quality=86)


def build_cover(K: dict[str, np.ndarray]) -> None:
    """表紙（K02）から右手の指先・左手の影・印を消した紙と、印だけの部品"""
    x0, y0, x1, y1 = PAGE_RECT
    k2 = K["K02"]
    cover = k2[y0:y1, x0:x1].copy()
    cover = outer.patch_from(cover, cover, outer.rect_poly(570, 175, 650, 345), dx=-160, soft=3)
    cover = outer.patch_from(cover, cover, outer.rect_poly(-5, 205, 62, 345), dx=80, soft=4)
    cover = outer.patch_from(cover, cover, outer.rect_poly(482, 208, 588, 314), dx=-180, soft=4)
    save_webp(cover, GEN / "parts" / "cover.webp", quality=86)
    sx0, sy0 = 975, 435
    crop = k2[sy0 : sy0 + 84, sx0 : sx0 + 84]
    red = crop[..., 0] - (crop[..., 1] + crop[..., 2]) / 2
    alpha = np.clip((red - 58) / 45, 0, 1)
    ink = np.zeros_like(crop) + np.array([196, 72, 52], dtype=np.float32)
    save_webp(ink, GEN / "parts" / "seal.webp", quality=90, alpha=alpha)


def main() -> None:
    for d in ("pages", "parts", "edits", "sketches"):
        shutil.rmtree(GEN / d, ignore_errors=True)
    sizes = inner.build_pages()
    print(f"pages: {len(sizes)} files, {sum(sizes.values()) // 1024} KiB")
    K = outer.load_keyframes()
    plate = outer.build_plate(K)
    save_webp(plate, GEN / "parts" / "plate.webp", quality=84)
    masks = {n: outer.hand_mask(K[kf], poly, kinds, outer.SLEEVES.get(n)) for n, (kf, poly, kinds) in outer.HANDS.items()}
    # 紙の上で影になる鉛筆の手だけは、手のない背景との差で取る（袖は色で取った形と合わせる）
    kf, poly, _ = outer.HANDS["aRwrite"]
    near = outer.ndi.binary_dilation(masks["aRwrite"], iterations=25)
    im = K[kf]
    lum = im @ np.array([0.3, 0.59, 0.11], dtype=np.float32)
    paperish = (lum > 175) & (im[..., 0] - im[..., 2] < 50)
    upper = outer.poly_mask(im.shape[:2], outer.rect_poly(1000, 280, 1130, 590))
    extra = outer.diff_mask(im, plate, poly, thresh=45) & near & upper & ~paperish
    m = np.pad(extra | masks["aRwrite"], 12, mode="edge")
    m = outer.ndi.binary_closing(m, iterations=4)
    # 段差や袖口の影の欠片をならす（開いてから、輪郭をぼかして閾値）
    m = outer.ndi.binary_opening(m, iterations=4)
    m = outer.ndi.gaussian_filter(m.astype(np.float32), 3.5) > 0.5
    masks["aRwrite"] = m[12:-12, 12:-12]
    sprites = outer.cut_sprites(K, masks)
    build_page_texture(K)
    build_cover(K)
    meta = json.loads((GEN / "pages.json").read_text())
    e = edits.build_edits(meta)
    print(f"edits: {len(e)}")
    sketches.build_sketches()
    (GEN / "parts.json").write_text(json.dumps({"page": PAGE_RECT, "sprites": sprites}, indent=1))
    total = sum(p.stat().st_size for p in GEN.rglob("*.webp"))
    print(f"total webp: {total // 1024} KiB")


if __name__ == "__main__":
    main()
