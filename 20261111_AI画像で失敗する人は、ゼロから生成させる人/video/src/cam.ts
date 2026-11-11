// カメラ（図の層）。全体の時刻 T から位置・注視点・画角・ロールが決まる。three.js の描画と、DOM の文字の投影で同じ関数を使う。
import * as THREE from 'three';
import {lerp, prog, wobble} from './lib/anim';

export const W = 1920;
export const H = 1080;
export type V3 = [number, number, number];
export type CamS = {p: V3; t: V3; fov: number; roll: number};
export type CamKey = {at: number; p: V3; t: V3; fov?: number; roll?: number; e?: (k: number) => number};

const inOut = (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const l3 = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];

// キー列の補間（キーの e は、そのキーへ向かう区間のイージング）。読む間も止めないよう、小さなゆらぎを足す
export function camAt(T: number, keys: CamKey[], breathe = 1): CamS {
  let s: CamS;
  const st = (k: CamKey): CamS => ({p: k.p, t: k.t, fov: k.fov ?? 34, roll: k.roll ?? 0});
  if (T <= keys[0].at) s = st(keys[0]);
  else if (T >= keys[keys.length - 1].at) s = st(keys[keys.length - 1]);
  else {
    let i = 0;
    while (T > keys[i + 1].at) i++;
    const a = st(keys[i]);
    const b = st(keys[i + 1]);
    const k = (keys[i + 1].e ?? inOut)(prog(T, keys[i].at, keys[i + 1].at));
    s = {p: l3(a.p, b.p, k), t: l3(a.t, b.t, k), fov: lerp(a.fov, b.fov, k), roll: lerp(a.roll, b.roll, k)};
  }
  const d = Math.hypot(s.p[0] - s.t[0], s.p[1] - s.t[1], s.p[2] - s.t[2]);
  const a = 0.012 * d * breathe;
  return {
    p: [s.p[0] + a * wobble(T, 1, 5.3), s.p[1] + a * 0.6 * wobble(T, 2, 4.1), s.p[2] + a * wobble(T, 3, 6.7)],
    t: s.t,
    fov: s.fov,
    roll: s.roll + 0.25 * breathe * wobble(T, 4, 7.9),
  };
}

export function applyCam(c: THREE.PerspectiveCamera, s: CamS) {
  c.fov = s.fov;
  c.aspect = W / H;
  c.near = 0.1;
  c.far = 400;
  c.position.set(...s.p);
  c.up.set(0, 1, 0);
  c.lookAt(...s.t);
  c.rotateZ((s.roll * Math.PI) / 180);
  c.updateProjectionMatrix();
  c.updateMatrixWorld(true);
}

const scratch = new THREE.PerspectiveCamera();
const v = new THREE.Vector3();
// 世界の点 → 画面の px。w は奥行き（<=0 はカメラの後ろ）
export function project(s: CamS, x: number, y: number, z: number): {x: number; y: number; w: number} {
  applyCam(scratch, s);
  v.set(x, y, z).applyMatrix4(scratch.matrixWorldInverse);
  const w = -v.z;
  v.applyMatrix4(scratch.projectionMatrix);
  return {x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, w};
}

// 幅 w・高さ h の DOM 要素を、画面上の四角形 q（左上・右上・右下・左下）へ写す matrix3d
export function quadMatrix(w: number, h: number, q: {x: number; y: number}[]): string | null {
  const src = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  const A: number[][] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i];
    const {x: X, y: Y} = q[i];
    A.push([x, y, 1, 0, 0, 0, -x * X, -y * X, X]);
    A.push([0, 0, 0, x, y, 1, -x * Y, -y * Y, Y]);
  }
  for (let c = 0; c < 8; c++) {
    let piv = c;
    for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
    if (Math.abs(A[piv][c]) < 1e-10) return null;
    [A[c], A[piv]] = [A[piv], A[c]];
    for (let r = 0; r < 8; r++) {
      if (r === c) continue;
      const f = A[r][c] / A[c][c];
      for (let k = c; k < 9; k++) A[r][k] -= f * A[c][k];
    }
  }
  const m = A.map((r, i) => r[8] / r[i]);
  const [a, b, c, d, e, f, g, hh] = m;
  return `matrix3d(${a},${d},0,${g},${b},${e},0,${hh},0,0,1,0,${c},${f},0,1)`;
}

// 目盛りの値 0..100 → 世界の x
export const SX = (val: number) => (val - 50) * 0.2;
