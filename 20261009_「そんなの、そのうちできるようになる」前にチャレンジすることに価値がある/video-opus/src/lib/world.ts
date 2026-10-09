// 世界の配置と「時刻 → 掘った量・舗装の進み」。映像の全要素（3D・文字の投影・カメラ）が同じ関数を参照する。
import paths from './paths.json';
import {Key, cut, seg, track, clamp, prog, ease, lerp} from './anim';

export type V2 = [number, number];
export const P = paths as unknown as {
  cell: number;
  root: V2;
  maxDepth: number;
  edges: [number, number, number, number, number, number][];
  cross: [number, number, number][];
  outs: {from: V2; pts: V2[]; d0: number}[];
  follow: {c7: V2[]; c9: V2[]; c10: V2[]};
  detour: V2[];
  detourDeadEnd: number;
  roadZ: number;
};

export const ROOT: V2 = P.root;
export const MAXD = P.maxDepth;
export const ROAD_A = {z: P.roadZ, w: 4.6, x0: -118, x1: 118};
export const ROAD_B = {x: -35.5, w: 4.2, z0: P.roadZ, z1: -110};
export const SUCCESS_X = -1.2; // カット9「成功の筋道だけ」の点線
export const SUCCESS = {x: SUCCESS_X, z0: P.roadZ - 2.6, z1: 14.4};
export const WAITER: V2 = [-87.5, 30.5]; // カット2「待つ」側の人印（終盤の俯瞰には入らない）
export const KEYS = {x0: -9, x1: 15, z0: 30.5, z1: 37.5};
export const SLAB = {x: 0, z: -36, w: 26, h: 9, d: 6};

// ---- 掘った量 -------------------------------------------------------------
// 回り道（カット1〜3）: 区間番号での進み。整数 k は detour[k] に到達した時刻
const DETOUR_KEYS: Key[] = [
  [0, 0],
  [cut(1).end - 1.1, 0],
  [cut(2).start + 0.2, 0.55],
  [cut(2).end, 3.3],
  [cut(3).start + 3.4, 5.2],
  [26.0, 7.0], // 行き止まり（×）に着く＝「誰も」の切り返し
  [26.9, 7.0],
  [27.6, 8.0], // 引き返す
  [cut(3).end - 0.6, 15.0],
];
export function detourProgress(t: number) {
  return seg(t, DETOUR_KEYS, (k) => k);
}
export function polyPoint(pts: V2[], s: number): {p: V2; dir: V2} {
  const n = pts.length;
  const k = clamp(s, 0, n - 1);
  const i = Math.min(n - 2, Math.floor(k));
  const u = k - i;
  const a = pts[i];
  const b = pts[i + 1];
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const L = Math.hypot(dx, dz) || 1;
  return {p: [lerp(a[0], b[0], u), lerp(a[1], b[1], u)], dir: [dx / L, dz / L]};
}
export const detourHead = (t: number) => polyPoint(P.detour, detourProgress(t));

// 木の成長（根からの深さ）。カット6の柱の着地で始まり、カット10で字形が満ちる
const GROW_KEYS: Key[] = [
  [0, -2],
  [61.5, -2],
  [62.1, 1.5],
  [cut(7).start, 14],
  [cut(7).end, 76],
  [cut(8).end, 104],
  [cut(9).end, 156],
  [cut(10).start + 6, 226],
  [cut(10).start + 9.6, MAXD + 4],
  [140, MAXD + 4],
];
export function growDepth(t: number) {
  return seg(t, GROW_KEYS, (k) => k);
}
// 光の走行（字形の完成後も、根から先端へ光が流れ続ける）
export function runPulse(t: number) {
  return (t - (cut(10).start + 9.6)) * 95;
}

// 経路上の先端（follow は根から葉までの格子列。i 番目の深さは i）
export function followHead(pts: V2[], depth: number) {
  return polyPoint(pts, clamp(depth, 0, pts.length - 1));
}

// ---- 舗装 ----------------------------------------------------------------
// 道Aの先端の x（カット4で西から東へ敷かれる）。測量線はカット3の終盤から見える
export function paveA(t: number) {
  // 回り道の上は見えるように速度を抑え、その先は一気に東へ
  return track(t, [
    [cut(4).start + 0.2, ROAD_A.x0 + 20],
    [cut(4).start + 0.9, -84],
    [cut(4).start + 3.6, -42],
    [cut(4).start + 5.6, -6],
    [cut(4).start + 7.4, ROAD_A.x1],
    [cut(4).start + 8, ROAD_A.x1],
  ]);
}
export function surveyA(t: number) {
  return prog(t, cut(3).start + 6.5, cut(3).end - 1);
}
// 道Bの先端の z（カット7「あとで奪われてもいい」で南から北へ）
export function paveB(t: number) {
  const k = prog(t, 70.6, 76.5);
  return lerp(ROAD_B.z0, ROAD_B.z1, ease.inOut(k));
}

// ---- カット別の素材の出入り ---------------------------------------------------
export function keysAmount(t: number) {
  return track(t, [
    [cut(4).end - 2.2, 0],
    [cut(4).end - 0.4, 1],
    [cut(5).end - 0.6, 1],
    [cut(6).start + 1.6, 0],
  ]);
}
export function slabRise(t: number) {
  return seg(t, [
    [cut(8).start - 0.4, 0],
    [cut(8).start + 1.4, 0.35],
    [87.6, 0.35],
    [89.4, 1],
    [cut(8).end - 0.5, 1],
    [cut(9).start + 0.8, 0],
  ]);
}
export function pillarRise(t: number) {
  return seg(t, [
    [59.7, 0],
    [61.5, 1],
    [cut(7).start - 0.7, 1],
    [cut(7).start + 0.5, 0],
  ], ease.outBack as (k: number) => number);
}
