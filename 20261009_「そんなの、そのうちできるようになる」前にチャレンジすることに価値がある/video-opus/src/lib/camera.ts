// カメラ: 各カットの姿勢関数を時刻で選び、カットの境目では両方を混ぜて一続きに飛ぶ。
// 3D 描画と文字の投影（地面の点に文字を沿わせる）の両方がこの関数を使う。
import * as THREE from 'three';
import {DEG, H, W, clamp, cut, ease, lerp, prog, pulse, smooth, smoother, track, wobble, Key, damped} from './anim';
import {P, ROOT, ROAD_B, SLAB, KEYS, WAITER, V2, detourHead, followHead, growDepth, paveA, polyPoint, detourProgress} from './world';

export type V3 = [number, number, number];
export type CamPose = {pos: V3; tgt: V3; roll: number; fov: number};

const v3lerp = (a: V3, b: V3, k: number): V3 => [lerp(a[0], b[0], k), lerp(a[1], b[1], k), lerp(a[2], b[2], k)];
const mixPose = (a: CamPose, b: CamPose, k: number): CamPose => ({
  pos: v3lerp(a.pos, b.pos, k),
  tgt: v3lerp(a.tgt, b.tgt, k),
  roll: lerp(a.roll, b.roll, k),
  fov: lerp(a.fov, b.fov, k),
});

// 先端を後ろ上から追う。向きは lag 秒前の先端との差（格子の直角の曲がりをならす）
function chase(head: (t: number) => V2, t: number, o: {back: number; height: number; side?: number; lead?: number; lag?: number; tgtY?: number}): {pos: V3; tgt: V3; dir: V2} {
  const h = head(t);
  const lag = o.lag ?? 0.8;
  let dx = 0;
  let dz = 0;
  for (let i = 1; i <= 4; i++) {
    const q = head(t - (lag * i) / 4);
    dx += (h[0] - q[0]) * (1 / i);
    dz += (h[1] - q[1]) * (1 / i);
  }
  let L = Math.hypot(dx, dz);
  if (L < 1e-3) {
    dx = 0;
    dz = -1;
    L = 1;
  }
  const dir: V2 = [dx / L, dz / L];
  const nrm: V2 = [-dir[1], dir[0]];
  const side = o.side ?? 0;
  const lead = o.lead ?? 3;
  return {
    pos: [h[0] - dir[0] * o.back + nrm[0] * side, o.height, h[1] - dir[1] * o.back + nrm[1] * side],
    tgt: [h[0] + dir[0] * lead, o.tgtY ?? 0, h[1] + dir[1] * lead],
    dir,
  };
}

const dHead = (t: number): V2 => detourHead(t).p;
const fHead = (path: V2[]) => (t: number): V2 => followHead(path, growDepth(t)).p;

const S0 = P.detour[0];

// ---- カット別 ----
function cam1(t: number): CamPose {
  const k = prog(t, 0, 8);
  // 人印のまわりを大きく回り込みながら寄る（人印は画面の下側、上に引用の文字）
  const az = lerp(-62, 12, ease.inOut(k)) * DEG;
  const r = lerp(13, 8.5, smooth(k)) - 1.2 * pulse(t, 7.0, 3);
  const h = lerp(2.6, 5.0, smooth(k)) + 0.8 * pulse(t, 7.0, 4);
  return {
    pos: [S0[0] + Math.sin(az) * r, h, S0[1] + Math.cos(az) * r],
    tgt: [S0[0] - Math.sin(az) * 6, 1.9, S0[1] - Math.cos(az) * 6],
    roll: lerp(12, -6, ease.inOut(k)),
    fov: lerp(48, 40, k),
  };
}
function cam2(t: number): CamPose {
  const k = prog(t, 8, 20);
  const midX = lerp(-77.5, -71, smooth(k));
  // 分割の両側を同じ大きさで保ったまま、横へ振れながら寄る
  const swing = 3.2 * Math.sin((t - 8) * 0.55);
  return {
    pos: [midX + lerp(-3, 3, k) + swing, lerp(8.5, 5.8, k) + 0.6 * Math.sin((t - 8) * 0.9), lerp(51, 46.5, smooth(k))],
    tgt: [midX + lerp(0, 2, k) + swing * 0.3, 0.6, 28.5],
    roll: lerp(-6, 5, ease.inOut(k)) + 2.5 * Math.sin((t - 8) * 0.7),
    fov: 42,
  };
}
function cam3(t: number): CamPose {
  const c = chase(dHead, t, {back: 7.5, height: lerp(3.2, 5.2, prog(t, 27, 32)), side: lerp(2.4, -2, prog(t, 20, 32)), lead: 4, lag: 1.1});
  return {...c, roll: 6 * Math.sin((t - 20) * 0.7) - 7 * pulse(t, 26.0, 2.5), fov: lerp(48, 44, prog(t, 20, 32))};
}
function cam4(t: number): CamPose {
  const fx = paveA(t);
  const k2 = smooth(prog(t, 38.4, 41.6));
  const follow: CamPose = {
    pos: [clamp(fx, -100, 40) - 9, 6.5, P.roadZ + 12],
    tgt: [clamp(fx, -100, 40) + 3, 0.3, P.roadZ - 1],
    roll: -6,
    fov: 44,
  };
  // 「それでいい」以降は道の東の延長を低く見通し、車線の破線をキーの列へつなぐ
  const along: CamPose = {
    pos: [KEYS.x0 - 16 + 6 * prog(t, 38, 42), 3.0, P.roadZ + 2.5],
    tgt: [KEYS.x1 + 6, 0.2, P.roadZ + 6.5],
    roll: 4,
    fov: 50,
  };
  return mixPose(follow, along, k2);
}
const KC: V3 = [(KEYS.x0 + KEYS.x1) / 2, 0, (KEYS.z0 + KEYS.z1) / 2];
function cam5(t: number): CamPose {
  const k = prog(t, 42, 56);
  const az = lerp(-58, 38, k) * DEG;
  const r = lerp(17, 12.5, k);
  const h = lerp(8.5, 5.0, smooth(k)) + 1.2 * Math.sin(k * Math.PI * 2);
  return {pos: [KC[0] + Math.sin(az) * r, h, KC[2] + Math.cos(az) * r], tgt: [KC[0], 0.4, KC[2] - 1], roll: lerp(-8, 10, ease.inOut(k)), fov: 44};
}
function cam6(t: number): CamPose {
  const k = prog(t, 56, 66);
  const az = lerp(200, 335, ease.inOut(k)) * DEG;
  const r = lerp(14, 10.5, k) + 3 * pulse(t, 61.5, 2.5);
  const h = lerp(2.5, 9.5, smooth(k));
  const ty = lerp(1.5, 3.2, smooth(prog(t, 58, 63)));
  return {pos: [ROOT[0] + Math.sin(az) * r, h, ROOT[1] + Math.cos(az) * r], tgt: [ROOT[0], ty, ROOT[1]], roll: lerp(8, -6, k), fov: 46};
}
function cam7(t: number): CamPose {
  const c = chase(fHead(P.follow.c7), t, {back: 6.5, height: 3.4, side: 1.6, lead: 3.5, lag: 1.2});
  const chaseP: CamPose = {...c, roll: 5 * Math.sin((t - 66) * 0.8), fov: 50};
  // 道Bが敷かれる間は少し上がって西側の道を一緒に見せる
  const head = fHead(P.follow.c7)(t);
  const side: CamPose = {pos: [head[0] + 5, 12, head[1] + 15], tgt: [ROAD_B.x + 6, 0, head[1] - 10], roll: -7, fov: 54};
  const k = smooth(prog(t, 70.2, 72.0)) * (1 - smooth(prog(t, 75.0, 76.4)));
  const base = mixPose(chaseP, side, k);
  // 「宝」で先端へ急接近
  const dive = smooth(prog(t, 77.8, 80));
  return {...base, pos: v3lerp(base.pos, [head[0], 1.2, head[1] + 1.5], dive * 0.7), fov: lerp(base.fov, 30, dive)};
}
const SL: V3 = [SLAB.x, 0, SLAB.z];
function cam8(t: number): CamPose {
  const k = prog(t, 80, 96);
  const az = (lerp(-30, 26, ease.inOut(k)) + 6 * Math.sin((t - 80) * 0.8)) * DEG;
  const push = smooth(prog(t, 88, 91.5)) * (1 - smooth(prog(t, 92, 95)));
  const r = lerp(26, 20, smooth(prog(t, 80, 88))) * (1 - push) + 15 * push + lerp(0, 5, prog(t, 92, 96)) + 1.5 * pulse(t, 85, 3);
  return {
    pos: [SL[0] + Math.sin(az) * r, lerp(6.5, 3.6, push), SL[2] + Math.cos(az) * r],
    tgt: [SL[0], lerp(3.6, 2.2, push), SL[2]],
    roll: lerp(-5, 5, k) + 3 * Math.sin(k * 7),
    fov: 42,
  };
}
function cam9(t: number): CamPose {
  // 前半: 成功の点線と、失敗を含む溝を横切って低く平行移動
  const k = prog(t, 96, 101);
  const cross: CamPose = {
    pos: [lerp(-26, -4, ease.inOut(k)), 2.8, 25.5],
    tgt: [lerp(-22, -1, ease.inOut(k)), 0, 12],
    roll: lerp(-6, 6, k),
    fov: 46,
  };
  const c = chase(fHead(P.follow.c9), t, {back: 6.5, height: 3.6, side: -1.4, lead: 3.5, lag: 1.0});
  const ch: CamPose = {...c, roll: 4 * Math.sin((t - 100) * 0.9), fov: 50};
  return mixPose(cross, ch, smoother(prog(t, 100.4, 102.2)));
}
// 俯瞰の最終構図: 字形を画面上側に、文字は下側の前景へ
export const TOP: CamPose = {pos: [0, 66, 28], tgt: [0, 0, 6.3], roll: 0, fov: 40};
function cam10(t: number): CamPose {
  const c = chase(fHead(P.follow.c10), t, {back: 6.0, height: 2.8, side: 1.2, lead: 4, lag: 0.9});
  const chaseP: CamPose = {...c, roll: 7 * Math.sin((t - 106) * 1.1), fov: 54};
  const k = prog(t, 111.6, 115.4);
  const e = ease.inOut(k);
  // 上昇しながら回り込み、真上手前で止まらずに旋回を続ける
  const orbit = lerp(-38, 0, e) * DEG + Math.max(0, t - 115.4) * 2.6 * DEG;
  const top: CamPose = {
    pos: [TOP.pos[0] + Math.sin(orbit) * TOP.pos[2] * 0.6, TOP.pos[1] - 2.5 * Math.sin((t - 112) * 0.5), TOP.tgt[2] + Math.cos(orbit) * (TOP.pos[2] - TOP.tgt[2])],
    tgt: TOP.tgt,
    roll: lerp(14, 0, e) + 1.5 * Math.sin((t - 112) * 0.8),
    fov: TOP.fov,
  };
  return mixPose(chaseP, top, e);
}

const CAMS: [number, (t: number) => CamPose][] = [
  [1, cam1], [2, cam2], [3, cam3], [4, cam4], [5, cam5], [6, cam6], [7, cam7], [8, cam8], [9, cam9], [10, cam10], [11, cam10],
];
// 境目の混ぜる幅（秒）: [前, 後]
const BLEND: Record<number, [number, number]> = {2: [0.35, 0.55], 3: [0.5, 0.9], 4: [0.5, 0.8], 5: [0.4, 0.9], 6: [0.6, 0.9], 7: [0.5, 1.0], 8: [0.3, 0.7], 9: [0.4, 0.9], 10: [0.4, 0.8]};

export function cameraPose(t: number): CamPose {
  let n = 1;
  for (let i = 2; i <= 10; i++) if (t >= cut(i).start - BLEND[i][0]) n = i;
  let pose = CAMS[n - 1][1](t);
  if (n >= 2) {
    const [a, b] = BLEND[n];
    const T = cut(n).start;
    const k = prog(t, T - a, T + b);
    if (k < 1) pose = mixPose(CAMS[n - 2][1](t), pose, smoother(k));
  }
  // 全編のうねり（ロール・視野）と、拍・境目の打撃
  let hit = 0;
  for (let i = 2; i <= 10; i++) hit += pulse(t, cut(i).start, 4.5);
  const roll = pose.roll + 2.2 * wobble(t, 1, 6.7);
  const fov = pose.fov - 7 * hit + 1.2 * wobble(t, 4, 3.3);
  const sway: V3 = [0.25 * wobble(t, 2, 5.1), 0.18 * wobble(t, 3, 4.3), 0.25 * wobble(t, 5, 5.9)];
  return {pos: [pose.pos[0] + sway[0], Math.max(0.6, pose.pos[1] + sway[1]), pose.pos[2] + sway[2]], tgt: pose.tgt, roll, fov};
}

const tmp = new THREE.PerspectiveCamera(40, W / H, 0.1, 900);
export function applyPose(cam: THREE.PerspectiveCamera, p: CamPose) {
  cam.position.set(...p.pos);
  cam.up.set(0, 1, 0);
  cam.lookAt(p.tgt[0], p.tgt[1], p.tgt[2]);
  cam.rotateZ(p.roll * DEG);
  cam.fov = p.fov;
  cam.aspect = W / H;
  cam.near = 0.1;
  cam.far = 900;
  cam.updateProjectionMatrix();
  cam.updateMatrixWorld(true);
}
// 世界の点を画面座標(px)へ。z>1 は背面
export function project(t: number, p: V3) {
  applyPose(tmp, cameraPose(t));
  const v = new THREE.Vector3(...p).project(tmp);
  return {x: (v.x * 0.5 + 0.5) * W, y: (-v.y * 0.5 + 0.5) * H, behind: v.z > 1};
}
// 地面上の向き（角度、度）を画面上の角度へ
export function projectAngle(t: number, p: V3, dir: V2) {
  const a = project(t, p);
  const b = project(t, [p[0] + dir[0] * 2, p[1], p[2] + dir[1] * 2]);
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}

export {detourProgress, polyPoint, damped, track};
export type {Key};
