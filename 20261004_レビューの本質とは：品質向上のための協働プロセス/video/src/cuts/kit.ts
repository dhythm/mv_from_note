// カットを書くための道具：カメラの構図、手の置き方、版の組み立て。
import { EDITS } from "../stage/edits";
import { HAND_POINTS, PAGE, SPRITES, innerToPlate } from "../stage/geometry";
import { armMatrix } from "../stage/arm";
import type { Camera, EditState, HandId, HandState } from "../stage/types";
import { pointAlong, type Pt } from "../lib/track";
import { PAGE_COUNT, VERSIONS, pageKey, type Version } from "../story/pages";

export const CAM = {
  wide: { cx: 800, cy: 450, zoom: 1 } as Camera,
  book: { cx: 820, cy: 430, zoom: 1.42 } as Camera,
  desk: { cx: 760, cy: 420, zoom: 1.3 } as Camera,
  // 左端が x≈565 になる構図（A の左手の指先だけが画面の縁に切れて残らないように）
  draw: { cx: 975, cy: 395, zoom: 1.95 } as Camera,
  // 左端を綴じ目の右（x≈492）に置き、左手の指先の断片を映さない
  page: { cx: PAGE.x + PAGE.w / 2 + 18, cy: PAGE.y + PAGE.h / 2, zoom: 2.42, blur: 1.2 } as Camera,
};

/** 手の部品の既定の回転中心（袖の奥、画面外） */
export function pivotOf(id: HandId): Pt {
  const sp = SPRITES[id];
  return [sp.x + sp.w * 0.45, Math.min(sp.y + sp.h, 940)];
}

/**
 * 手の目印（基準画での位置 native）が target に来るように置く。
 * 腕は肩（画面外の遠く）を中心に回り、前腕の向きにだけ伸び縮みする（手が紙の上を滑らない）。
 * rot：150 度以上は「向かい側（180 度回した部品）」で、残りを手首の返しに使う。それ以外は手首の返し（半分だけ効かせる）
 */
export function place(id: HandId, native: Pt, target: Pt, lift: number, rot = 0, extra: Partial<HandState> = {}): HandState {
  const base = rot >= 150 ? 180 : 0;
  const wrist = base ? rot - 180 : rot * 0.5;
  const { m, swing } = armMatrix(id, native, target, base, wrist);
  return { id, dx: 0, dy: 0, rot: base + swing + wrist, lift, matrix: m, ...extra };
}

export const native = (id: HandId, lift = 0): HandState => ({ id, dx: 0, dy: 0, lift });

/** めくっているページの右端（真上から見た x）。角度は度 */
export function edgeX(angle: number): number {
  return PAGE.x + PAGE.w * Math.cos((angle * Math.PI) / 180);
}

/** 内側の絵の座標で指す位置 → 机の座標 */
export const innerPt = (ix: number, iy: number): Pt => innerToPlate(ix, iy);

/** 鉛筆の先・消しゴムの中心を、編集の経路の f の位置へ */
export function toolOnPath(edit: string, kind: "erase" | "draw", f: number): Pt {
  const e = EDITS[edit];
  const path = kind === "erase" ? e.erasePath : e.drawPath;
  const [ix, iy] = pointAlong(path, f);
  return innerToPlate(ix, iy);
}

/** つまむ指先から見た、消しゴムの紙に当たる角の位置 */
export const PINCH_ERASER_OFFSET: Pt = [-70, -60];
export const TIP = HAND_POINTS;

/** ページごとの版の指定から、24 ページの絵のキーを作る */
export function keysOf(perPage: (i: number) => Version): string[] {
  return Array.from({ length: PAGE_COUNT }, (_, i) => pageKey(VERSIONS[perPage(i)][i]));
}

/** 版 a → b の i ページ目の編集名 */
export function editName(a: Version, b: Version, i: number): string {
  return `${pageKey(VERSIONS[a][i])}__${pageKey(VERSIONS[b][i])}`;
}

export function edit(a: Version, b: Version, page: number, erase: number, draw: number): EditState {
  return { name: editName(a, b, page), page, erase, draw };
}
