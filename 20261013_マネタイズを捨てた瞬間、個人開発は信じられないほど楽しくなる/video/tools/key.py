"""採用3本の緑背景を除き、30fps の編集用連番（RGBA WebP）と手先の追跡データを作る。

原本は変更しない。区間は plan.md「使用素材」のとおり。
  .venv/bin/python tools/key.py            # 全クリップ
  .venv/bin/python tools/key.py m2         # 指定クリップのみ
出力: public/mascot/<id>/NNNN.webp, public/mascot/<id>.json, .work/key/<id>_check.jpg
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
VIDEOS = ROOT.parent / "assets" / "videos"
CLIPS = {
    # id: (原本, 開始秒, 終了秒)
    "m1": ("Mascot_showing_hesitation_animat…_20261013164946_2.mp4", 1.0, 7.0),
    "m2": ("Mascot_discovering_useful_thing_…_20261013164946.mp4", 0.5, 6.2),
    "m3a": ("Mascot_animating_on_green_screen_20261013164946_2.mp4", 0.5, 5.5),
    "m3b": ("Mascot_animating_on_green_screen_20261013164946_2.mp4", 5.5, 9.5),
}
FPS = 30
MARGIN = 10


def extract(cid):
    src, s, e = CLIPS[cid]
    raw = ROOT / ".work" / "raw" / cid
    raw.mkdir(parents=True, exist_ok=True)
    for p in raw.glob("*.png"):
        p.unlink()
    n = round((e - s) * FPS)
    # 24fps → 30fps は fps フィルタ（最近傍のコマを複製）。音声は使わない
    cmd = [
        "ffmpeg", "-v", "error", "-y", "-ss", f"{s}", "-i", str(VIDEOS / src),
        "-an", "-vf", f"fps={FPS}", "-frames:v", str(n), str(raw / "%04d.png"),
    ]
    subprocess.run(cmd, check=True)
    files = sorted(raw.glob("*.png"))
    if len(files) != n:
        raise RuntimeError(f"{cid}: expected {n} frames, got {len(files)}")
    return files


def key_frame(rgb):
    """rgb: float32 HxWx3 (0..1) → (rgb_despilled, alpha)"""
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    d = g - np.maximum(r, b)  # 緑の強さ
    # 背景の緑は g-r が大きい（0.37〜0.41）。肌の陰の緑かぶりは 0.1 前後なので g-r で分ける
    d1 = g - r
    soft = np.minimum(1.0 - np.clip((d1 - 0.13) / (0.27 - 0.13), 0, 1), 1.0 - np.clip((d - 0.12) / (0.24 - 0.12), 0, 1))
    hard = soft > 0.5
    # 最大の連結成分＝キャラクター。内部の緑かぶり（あご下・腹部・手の陰）は穴埋めで不透明に戻す
    lab, n = ndimage.label(hard)
    if n == 0:
        raise RuntimeError("no foreground")
    sizes = ndimage.sum(hard, lab, range(1, n + 1))
    body = lab == (int(np.argmax(sizes)) + 1)
    filled = ndimage.binary_fill_holes(body)
    # 穴埋めは緑かぶり程度（d<0.08）の内部だけ。脚の間などの強い緑は背景として抜く
    body = body | (filled & (d1 < 0.2))
    # 足元の接地影（暗いオリーブ色）を除く。接地影は編集で作る
    rows = np.where(body.any(1))[0]
    top, bottom = rows.min(), rows.max()
    foot = np.zeros_like(body)
    foot[bottom - int((bottom - top) * 0.08):] = True
    body &= ~(foot & (rgb.max(-1) < 0.62))
    body = ndimage.binary_opening(body, iterations=1)
    # 開いた後に残った小片（足元の影のかけら）は最大の連結成分以外を捨てる
    lab2, n2 = ndimage.label(body)
    if n2 > 1:
        sz = ndimage.sum(body, lab2, range(1, n2 + 1))
        body = lab2 == (int(np.argmax(sz)) + 1)
    core = ndimage.binary_erosion(body, iterations=2)
    outer = ndimage.binary_dilation(body, iterations=2)
    alpha = np.where(core, 1.0, np.where(outer, soft, 0.0))
    alpha = ndimage.gaussian_filter(alpha, 0.6)
    alpha[~outer] = 0
    # 緑かぶりの除去: g を r・b の大きい方まで下げ、縁の半透明部は輝度を少し保つ
    limit = np.maximum(r, b) * 1.0
    spill = np.clip(g - limit, 0, None)
    g2 = g - spill
    out = np.stack([r + spill * 0.15, g2, b + spill * 0.1], -1)
    return np.clip(out, 0, 1), np.clip(alpha, 0, 1)


def run(cid):
    files = extract(cid)
    frames = []
    alphas = []
    for f in files:
        rgb = np.asarray(Image.open(f).convert("RGB"), dtype=np.float32) / 255.0
        c, a = key_frame(rgb)
        frames.append(c)
        alphas.append(a)
    H, W = alphas[0].shape
    union = np.zeros((H, W), bool)
    for a in alphas:
        union |= a > 0.02
    ys, xs = np.where(union)
    x0, x1 = max(0, xs.min() - MARGIN), min(W, xs.max() + 1 + MARGIN)
    y0, y1 = max(0, ys.min() - MARGIN), min(H, ys.max() + 1 + MARGIN)
    out = ROOT / "public" / "mascot" / cid
    out.mkdir(parents=True, exist_ok=True)
    for p in out.glob("*.webp"):
        p.unlink()
    track = []
    for i, (c, a) in enumerate(zip(frames, alphas)):
        rgba = np.concatenate([c, a[..., None]], -1)[y0:y1, x0:x1]
        Image.fromarray((rgba * 255 + 0.5).astype(np.uint8), "RGBA").save(out / f"{i:04d}.webp", quality=92, method=4)
        m = a > 0.5
        rows = np.where(m.any(1))[0]
        top, bottom = int(rows.min()), int(rows.max())
        hgt = bottom - top
        # 腕の帯（頭の下〜腰）で左右の端＝手先
        band = m[top + int(hgt * 0.40): top + int(hgt * 0.75)]
        by = np.where(band.any(1))[0] + top + int(hgt * 0.40)
        bx = np.where(band.any(0))[0]
        lx, rx = int(bx.min()), int(bx.max())
        ly = float(np.mean(np.where(m[:, lx])[0]))
        ry = float(np.mean(np.where(m[:, rx])[0]))
        cols = np.where(m.any(0))[0]
        track.append({
            "top": int(top - y0), "bottom": int(bottom - y0),
            "cx": float(np.mean(cols) - x0),
            "lx": int(lx - x0), "ly": float(ly - y0), "rx": int(rx - x0), "ry": float(ry - y0),
        })
    meta = {"id": cid, "frames": len(frames), "crop": [int(x0), int(y0), int(x1 - x0), int(y1 - y0)],
            "src": CLIPS[cid][0], "range": CLIPS[cid][1:], "track": track}
    (ROOT / "public" / "mascot" / f"{cid}.json").write_text(json.dumps(meta))
    # 確認用: 墨色と生成りの上に合成した一覧（8コマ）
    chk = ROOT / ".work" / "key"
    chk.mkdir(parents=True, exist_ok=True)
    picks = np.linspace(0, len(frames) - 1, 8).astype(int)
    tiles = []
    for bg in ([0x15, 0x1C, 0x23], [0xF6, 0xF1, 0xE7]):
        row = []
        for i in picks:
            c, a = frames[i][y0:y1, x0:x1], alphas[i][y0:y1, x0:x1, None]
            comp = c * a + np.array(bg, np.float32) / 255 * (1 - a)
            row.append(comp)
        tiles.append(np.concatenate(row, 1))
    sheet = np.concatenate(tiles, 0)
    Image.fromarray((sheet * 255).astype(np.uint8)).save(chk / f"{cid}_check.jpg", quality=90)
    print(cid, "frames", len(frames), "crop", meta["crop"])


if __name__ == "__main__":
    ids = sys.argv[1:] or list(CLIPS)
    for cid in ids:
        run(cid)
