// カメラの位置・回転・画角を時刻から直接計算する（画面全体の「グワン」の主成分）。
import * as THREE from 'three';
import {ACC, DEG, beatEnv, hitEnv, damped, track, wobble, Key} from './anim';

const DIST: Key[] = [
  [0, 17.5], [1.2, 17], [9.8, 12.8, 'inOut'],
  [21.0, 10.6, 'inOut'], [22.25, 19.5, 'expoOut'], [26.4, 14.2], [28.2, 11.2], [33.8, 15],
  [34.6, 12.6, 'expoOut'], [43.6, 12.2], [47.8, 5.0, 'inOut'], [50.5, 18.5, 'expoOut'],
  [54, 16], [58, 13.2], [62, 15.5], [65.6, 14.2], [72, 22, 'inOut'], [76.4, 27.5, 'inOut'], [78, 28, 'out'],
];
const AZ: Key[] = [
  [0, -16], [9.8, 9, 'inOut'], [21.0, -6], [22.25, 26, 'expoOut'], [26.4, -10], [28.2, 32, 'inOutBack'],
  [33.8, 6], [36, -20, 'expoOut'], [43.6, -6], [47.8, 6], [50.5, -24, 'expoOut'], [54, -8],
  [58, 30], [62, -24], [65.6, 4], [72, -20, 'inOut'], [76.4, -40, 'inOut'], [78, -42, 'out'],
];
const EL: Key[] = [
  [0, 12], [9.8, -5], [21, 4], [22.25, -8, 'expoOut'], [26.4, 8], [28.2, 28], [33.8, 8], [43.6, 2],
  [47.8, 0], [50.5, 12, 'expoOut'], [54, 6], [58, 15], [62, 3], [65.6, 10], [78, 16, 'out'],
];
const ROLL: Key[] = [
  [0, -6], [9.8, 5], [15, -5], [21, 6], [22.25, -10, 'expoOut'], [26.4, 3], [28.2, -5], [33.8, 3],
  [36, -7, 'expoOut'], [43.6, 2], [47.8, 9], [50.5, -7, 'expoOut'], [54, 2], [58, -6], [62, 6],
  [65.6, -2], [72, 5], [78, 0, 'out'],
];
const TX: Key[] = [[0, 0], [43.6, 0], [46, -1.4], [47.8, 0.8], [50.5, 0, 'expoOut'], [54, 0.4], [58, -0.6], [62, 1.2], [65.6, 1.4], [72, 5.2], [78, 5.8, 'out']];
const TY: Key[] = [[0, 0], [21, 0], [22.25, 0.15, 'expoOut'], [33.8, 0.15], [35, 0], [50.5, 0], [78, 0.2]];
const TZ: Key[] = [[0, 0.4], [21, 0.8], [22.25, 1.4, 'expoOut'], [33.8, 1.4], [43.6, 0.6], [47.8, 0.3], [50.5, 0.4], [78, 0.4]];
const FOV: Key[] = [[0, 34], [43.6, 34], [47.8, 50, 'in'], [50.5, 36, 'expoOut'], [54, 34], [78, 32]];

export type CamPose = {pos: THREE.Vector3; quat: THREE.Quaternion; fov: number};

// カメラ型の lookAt（-z を注視点へ向ける）を使う
const tmp = new THREE.PerspectiveCamera();

export function cameraPose(t: number): CamPose {
  const b = beatEnv(t, 10);
  // 雪崩れ着地・圧縮の段・各ヒットでの揺れ（減衰振動）
  let shake = 0;
  for (const s of ACC.compressSteps) shake += damped(t, s, 0.5, 3.1, 5);
  for (const h of [ACC.impact, ACC.gapHit, ACC.shelfHit, ACC.pullBack, ACC.flipHit]) shake += damped(t, h, 0.8, 2.6, 4);

  const dist = track(t, DIST) * (1 - 0.018 * b) * (1 - 0.06 * hitEnv(t, ACC.impact, 5));
  const az = (track(t, AZ) + 2.6 * wobble(t, 1, 7.3) + shake * 2.2) * DEG;
  const el = (track(t, EL) + 1.6 * wobble(t, 2, 5.1) - shake * 1.2) * DEG;
  const roll = (track(t, ROLL) + 1.3 * wobble(t, 3, 4.3) + shake * 1.6) * DEG;
  const target = new THREE.Vector3(track(t, TX), track(t, TY), track(t, TZ));
  const pos = new THREE.Vector3(
    target.x + dist * Math.sin(az) * Math.cos(el),
    target.y + dist * Math.sin(el),
    target.z + dist * Math.cos(az) * Math.cos(el),
  );
  tmp.position.copy(pos);
  tmp.up.set(0, 1, 0);
  tmp.lookAt(target);
  tmp.rotateZ(roll);
  const fov = track(t, FOV) * (1 + 0.025 * b);
  return {pos, quat: tmp.quaternion.clone(), fov};
}
