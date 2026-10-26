// 07 AI という下駄を外しても、高いまま。作品中で唯一の 3D（比較と因果）。
// three.js（@remotion/three）。カメラ・箱の位置はすべてカットの頭からの秒 t で決まる。
// 文字は DOM の層に置き、3D の点を同じカメラで画面へ投影して位置だけ合わせる（カメラの回転を文字に掛けない）。
import React, {useMemo} from 'react';
import {AbsoluteFill} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Bg, C, H, Line, W, inOut, kv, lerp, outExpo, prog} from './kit';
import {damped} from './lib/anim';
import type {CutProps} from './Main';

const FOV = 30;
const DEG = Math.PI / 180;
const GETA = {w: 2.3, h: 0.8, d: 1.7};
const PIL = {w: 1.1, h: 3.0, d: 1.1};
const XL = -1.9;
const XR = 1.9;

// カメラ: 斜め上から回り込み（Arc）、柱が落ちた瞬間に一度沈み、最後は左の柱を見上げる
function camAt(t: number) {
  const az = kv(t, [[0, -34], [3.4, -15], [6.6, -9], [10.6, 8]]);
  const el = kv(t, [[0, 22], [3.4, 16], [6.6, 13], [10.6, -9]]);
  const r = kv(t, [[0, 16], [3.4, 14.5], [6.6, 14], [10.6, 11.5]]);
  const tx = kv(t, [[0, 0], [6.6, 0], [10.6, 0.9]]);
  const ty = kv(t, [[0, 1.9], [6.6, 1.8], [10.6, 2.7]]) + damped(t, 4.0, -0.35, 2.2, 4.5);
  const target = new THREE.Vector3(tx, ty, 0);
  const pos = new THREE.Vector3(target.x + r * Math.cos(el * DEG) * Math.sin(az * DEG), target.y + r * Math.sin(el * DEG), target.z + r * Math.cos(el * DEG) * Math.cos(az * DEG));
  return {pos, target};
}

// 物の状態
function stateAt(t: number) {
  const pull = inOut(prog(t, 3.35, 4.0)); // 下駄が奥へ抜かれる
  const fall = prog(t, 3.65, 3.98); // 右の柱が落ちる
  const drop = fall * fall * GETA.h + damped(t, 3.98, 0.12, 3, 7) * (t > 3.98 ? 1 : 0);
  const grow = outExpo(prog(t, 3.65, 4.05)); // 左の柱は床まで伸び、天面の高さを保つ
  const shrink = inOut(prog(t, 4.85, 5.55)); // 右は素の力に戻る（低い灰色の箱）
  return {pull, drop, grow, shrink};
}

const Box: React.FC<{p: [number, number, number]; s: [number, number, number]; color: string; opacity?: number}> = ({p, s, color, opacity = 1}) => (
  <mesh position={p}>
    <boxGeometry args={s} />
    <meshLambertMaterial color={color} transparent={opacity < 1} opacity={opacity} />
  </mesh>
);

const Rig: React.FC<{t: number}> = ({t}) => {
  const {camera} = useThree();
  const {pos, target} = camAt(t);
  camera.position.copy(pos);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  return null;
};

const World: React.FC<{t: number}> = ({t}) => {
  const {pull, drop, grow, shrink} = stateAt(t);
  const gz = lerp(0, -3.2, pull);
  const go = lerp(1, 0.22, pull);
  // 左の柱: 下端を床へ伸ばす（上端 = 下駄の高さ + 柱の高さ のまま）
  const topL = GETA.h + PIL.h;
  const hL = lerp(PIL.h, topL, grow);
  // 右の柱: 下駄の上から床へ落ち、その後低く縮んで灰色に
  const baseR = GETA.h - drop;
  const hR = lerp(PIL.h, 1.15, shrink);
  const colR = new THREE.Color('#3d4553').lerp(new THREE.Color('#c4c8cf'), shrink);
  return (
    <>
      <ambientLight intensity={2.1} />
      <directionalLight position={[-5, 9, 7]} intensity={2.4} />
      <directionalLight position={[6, 3, -4]} intensity={0.5} />
      {/* 床の線 */}
      <Box p={[0, -0.01, 0]} s={[13, 0.02, 0.04]} color="#b9bec7" />
      {/* 下駄（AI） */}
      <Box p={[XL, GETA.h / 2, gz]} s={[GETA.w, GETA.h, GETA.d]} color={C.blue} opacity={go} />
      <Box p={[XR, GETA.h / 2, gz]} s={[GETA.w, GETA.h, GETA.d]} color={C.blue} opacity={go} />
      {/* 左: 考えを乗せる人（天面の朱） */}
      <Box p={[XL, topL - hL / 2, 0]} s={[PIL.w, hL, PIL.d]} color="#3d4553" />
      <Box p={[XL, topL + 0.06, 0]} s={[PIL.w, 0.12, PIL.d]} color={C.red} />
      {/* 右: 乗せない人 */}
      <Box p={[XR, baseR + hR / 2, 0]} s={[PIL.w, hR, PIL.d]} color={'#' + colR.getHexString()} />
      <Box p={[XR, baseR + hR + 0.06, 0]} s={[PIL.w, 0.12, PIL.d]} color={shrink > 0.5 ? '#aeb3bb' : '#8c93a0'} />
    </>
  );
};

// 3D の点 → 画面の px（ThreeCanvas と同じカメラ）
function useProjector(t: number) {
  const cam = useMemo(() => new THREE.PerspectiveCamera(FOV, W / H, 0.1, 200), []);
  const {pos, target} = camAt(t);
  cam.position.copy(pos);
  cam.lookAt(target);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return (x: number, y: number, z: number) => {
    const v = new THREE.Vector3(x, y, z).project(cam);
    return {x: (v.x + 1) * 0.5 * W, y: (1 - v.y) * 0.5 * H};
  };
}

export const Cut07: React.FC<CutProps> = ({t}) => {
  const P = useProjector(t);
  const {drop, shrink} = stateAt(t);
  const lab1 = P(XL, 0, 1.3);
  const lab2 = P(XR, 0, 1.3);
  const lab3 = P(XR, GETA.h - drop + lerp(PIL.h, 1.15, shrink) + 0.45, 0);
  return (
    <AbsoluteFill>
      <Bg />
      <AbsoluteFill>
        <ThreeCanvas width={W} height={H} gl={{antialias: true, preserveDrawingBuffer: true}} camera={{fov: FOV, near: 0.1, far: 200, position: [0, 3, 16]}}>
          <Rig t={t} />
          <World t={t} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Line t={t} text="AI という下駄" x={960} y={96} size={76} color={C.blue} anchor="c" t0={0.4} t1={3.3} />
      <Line t={t} text="考えを乗せる人" x={lab1.x} y={lab1.y + 20} size={42} weight={700} anchor="c" t0={1.0} t1={6.5} />
      <Line t={t} text="乗せない人" x={lab2.x} y={lab2.y + 20} size={42} weight={700} anchor="c" t0={1.2} t1={6.5} />
      <Line t={t} text="素の力に戻る" x={lab3.x} y={lab3.y - 52} size={44} weight={700} color={C.gray} anchor="c" t0={5.0} t1={7.0} />
      <Line t={t} text="外しても、" x={1150} y={150} size={96} t0={8.4} />
      <Line t={t} text="高いまま。" x={1150} y={280} size={124} color={C.red} t0={9.0} />
    </AbsoluteFill>
  );
};
