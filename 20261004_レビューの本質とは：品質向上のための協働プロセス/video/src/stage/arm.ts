// 手の置き方：肩（画面外の遠く）を中心に腕ごと回し、前腕の向きにだけ伸び縮みさせる。
// 平行移動で手が紙の上を滑る（シールのように見える）のを避ける。
import type { Pt } from "../lib/track";
import type { HandId } from "./types";

export type Mat = [number, number, number, number, number, number];

/** 各手の部品の、袖が画面の外へ出ていく点（基準画での位置）と目印 */
export const ARM: Record<HandId, { tip: Pt; sleeve: Pt }> = {
  aL: { tip: [300, 500], sleeve: [100, 900] },
  aLrest: { tip: [300, 520], sleeve: [100, 900] },
  aR: { tip: [1118, 430], sleeve: [1480, 900] },
  aRcurl: { tip: [1118, 440], sleeve: [1480, 900] },
  aRpinch: { tip: [903, 458], sleeve: [1190, 900] },
  aRwrite: { tip: [781, 378], sleeve: [1210, 900] },
  bRpoint: { tip: [906, 371], sleeve: [1600, 760] },
  bLsupport: { tip: [1126, 312], sleeve: [1600, 760] },
  bRrest: { tip: [1112, 400], sleeve: [1600, 800] },
};

/** 目印から肩までの距離（机の座標）。遠いほど回転は小さく、伸びが主になる */
export const SHOULDER = 1100;

export function mul(a: Mat, b: Mat): Mat {
  // (a ∘ b)(p) = a(b(p))
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}
export const translate = (x: number, y: number): Mat => [1, 0, 0, 1, x, y];
export const rotate = (deg: number): Mat => {
  const r = (deg * Math.PI) / 180;
  return [Math.cos(r), Math.sin(r), -Math.sin(r), Math.cos(r), 0, 0];
};
export const rotateAbout = (deg: number, p: Pt): Mat => mul(translate(p[0], p[1]), mul(rotate(deg), translate(-p[0], -p[1])));
export const apply = (m: Mat, p: Pt): Pt => [m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5]];

/**
 * 目印 native（部品の中の点）を target へ。
 * base：部品をまず目印の周りに回す角度（向かい側の B は 180）
 * wrist：最後に target の周りで少しだけ回す（手首の返し）
 */
export function armMatrix(id: HandId, native: Pt, target: Pt, base = 0, wrist = 0): { m: Mat; swing: number } {
  const a = ARM[id];
  let ux = a.tip[0] - a.sleeve[0];
  let uy = a.tip[1] - a.sleeve[1];
  const len = Math.hypot(ux, uy) || 1;
  ux /= len;
  uy /= len;
  const B = rotateAbout(base, native);
  const [bx, by] = apply(rotate(base), [ux, uy]);
  const S: Pt = [native[0] - bx * SHOULDER, native[1] - by * SHOULDER];
  const wx = target[0] - S[0];
  const wy = target[1] - S[1];
  const wl = Math.hypot(wx, wy) || 1;
  const swing = ((Math.atan2(wy, wx) - Math.atan2(by, bx)) * 180) / Math.PI;
  const reach = wl - SHOULDER;
  const M2 = mul(translate((wx / wl) * reach, (wy / wl) * reach), rotateAbout(swing, S));
  const M3 = rotateAbout(wrist, target);
  return { m: mul(M3, mul(M2, B)), swing };
}
