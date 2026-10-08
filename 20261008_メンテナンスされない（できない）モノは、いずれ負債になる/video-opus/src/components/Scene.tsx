// 全体の合成: カメラ（流れに乗る注視点のまわりを周回）、世界、各カットの舞台。
import React from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {useCurrentFrame} from 'remotion';
import {DEG, FPS, Key, TOTAL, beatEnv, cut, damped, pE, pS, sortKeys, track, wobble, prog, smooth} from '../lib/anim';
import {flowX} from '../lib/flow';
import {CamKeys} from '../lib/rig';
import {City, Grass, Ground, Numbers, Sky, Streaks} from './World';
import {CUTS} from './cuts';

const FIELDS = ['dist', 'az', 'el', 'roll', 'tx', 'ty', 'tz', 'fov'] as const;
const DEFAULTS: Record<(typeof FIELDS)[number], number> = {dist: 14, az: 0, el: 6, roll: 0, tx: 0, ty: 0.8, tz: 0, fov: 38};

// 各カットのキーを時刻順に結合（カットの境目は流れの加速の間に補間される）
const TRACKS = (() => {
  const out = {} as Record<(typeof FIELDS)[number], Key[]>;
  for (const f of FIELDS) {
    const keys: Key[] = [];
    for (const c of CUTS) keys.push(...((c.cam as CamKeys)[f] ?? []));
    if (keys.length === 0) keys.push([0, DEFAULTS[f]]);
    out[f] = sortKeys(keys);
  }
  return out;
})();
const HITS = CUTS.flatMap((c) => c.hits);

const tmp = new THREE.PerspectiveCamera();
function cameraPose(t: number) {
  let shake = 0;
  for (const h of HITS) shake += damped(t, h, 1, 3.4, 4.5);
  const b = beatEnv(t, 8);
  const dist = track(t, TRACKS.dist) * (1 - 0.012 * b);
  const az = (track(t, TRACKS.az) + 3.2 * wobble(t, 1, 7.1) + shake * 2.4) * DEG;
  const el = (track(t, TRACKS.el) + 2.0 * wobble(t, 2, 5.3) - shake * 1.3) * DEG;
  const roll = (track(t, TRACKS.roll) + 1.6 * wobble(t, 3, 4.1) + shake * 2.0) * DEG;
  const target = new THREE.Vector3(flowX(t) + track(t, TRACKS.tx), track(t, TRACKS.ty), track(t, TRACKS.tz));
  const pos = new THREE.Vector3(
    target.x + dist * Math.sin(az) * Math.cos(el),
    target.y + dist * Math.sin(el),
    target.z + dist * Math.cos(az) * Math.cos(el),
  );
  // 地面の下へ潜らない
  pos.y = Math.max(pos.y, -2.6);
  tmp.position.copy(pos);
  tmp.up.set(0, 1, 0);
  tmp.lookAt(target);
  tmp.rotateZ(roll);
  const fov = track(t, TRACKS.fov) * (1 + 0.02 * b);
  return {pos, quat: tmp.quaternion.clone(), fov};
}

// 流れの線の量と色
function streakAmount(t: number) {
  const k: Key[] = [
    [0, 0.0], [cut(2).start - 0.4, 0.05], [cut(2).start, 0.5], [cut(2).start + 1, 0.25], [cut(3).start, 0.35],
    [pS(3, 'b'), 0.9], [cut(3).end, 0.6], [cut(4).start + 1, 0.15], [pS(5, 'keep'), 0.2], [pS(5, 'broke'), 0.9],
    [cut(5).end, 0.3], [cut(6).start + 1, 0.08], [pS(9, 'tool'), 0.1], [pE(9, 'tool'), 0.6], [cut(10).start, 0.3],
    [cut(10).start + 1.5, 0.1], [TOTAL, 0.12],
  ];
  return track(t, k);
}

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const cam = cameraPose(t);
  // カメラはフレームから求めた姿勢をそのまま適用（積み上げなし）。子の描画より前に確定させる
  camera.position.copy(cam.pos);
  camera.quaternion.copy(cam.quat);
  camera.fov = cam.fov;
  camera.near = 0.1;
  camera.far = 700;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  const numbersOn = smooth(prog(t, cut(3).start - 0.3, cut(3).start + 0.5)) * (1 - smooth(prog(t, cut(5).start - 0.3, cut(5).start + 0.6)));
  const warm = t > cut(9).start;
  return (
    <>
      <ambientLight intensity={0.9} />
      <hemisphereLight args={['#dff3ff', '#20303a', 0.9]} />
      <directionalLight position={[6, 12, 9]} intensity={2.2} />
      <Sky t={t} />
      <Ground t={t} />
      <Grass t={t} />
      <City t={t} />
      <Numbers t={t} amount={numbersOn * (t < cut(4).start ? 0.75 : 0.95)} x0={flowX(cut(3).start) - 30} x1={flowX(cut(5).start) + 50} />
      <Streaks t={t} amount={streakAmount(t)} color={warm ? '#ffcf7a' : t < cut(3).start ? '#ffd9a8' : '#7fe6ff'} />
      {CUTS.map((c) => (
        <c.C key={c.n} t={t} />
      ))}
    </>
  );
};
