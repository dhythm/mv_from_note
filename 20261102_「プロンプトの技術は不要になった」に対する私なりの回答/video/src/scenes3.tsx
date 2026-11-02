// 07–08: 筆者の仕事での比較（3D の円柱、Orbit）→ 留保と理由（届かない領域）。
// 07 は three.js（@remotion/three）。カメラと円柱の状態はすべてカットの頭からの秒 t で決まる。
// 文字は DOM の層に置き、3D の点を同じカメラで画面へ投影して位置だけ合わせる（カメラの回転を文字に掛けない）。
import React, {useEffect, useMemo, useState} from 'react';
import {AbsoluteFill, cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {Bg, C, E_PUSH, E_SINK, E_SLAM, Grid, H, Lay, Line, STRATA, W, kv, lerp, prog} from './kit';
import type {CutProps} from './Main';

// ---- 07 すべてで、明確な差。 ----
const FOV = 30;
const DEG = Math.PI / 180;
const R = 1.15; // 円柱の半径
const LH = 0.72; // 1 層の厚み
const XL = -1.7;
const XR = 1.7;
const SHIFT = -400; // 3D の層を左へずらし、右を文字の場所に空ける（px）
const INS07 = [6.4, 7.2, 8.0]; // 作り込みの円柱に層が下から 1 枚ずつ積み上がる秒

function camAt(t: number) {
  const az = kv(t, [[0, -16], [6.0, 0], [12.5, 22, E_SINK], [17, 30]]);
  const el = kv(t, [[0, 6], [6.0, 12], [12.5, 20, E_SINK], [17, 22]]);
  const r = kv(t, [[0, 16.5], [6.0, 13, E_SINK], [12.8, 12.6], [17, 14.3]]);
  const target = new THREE.Vector3(0, 1.45, 0);
  const pos = new THREE.Vector3(target.x + r * Math.cos(el * DEG) * Math.sin(az * DEG), target.y + r * Math.sin(el * DEG), target.z + r * Math.cos(el * DEG) * Math.cos(az * DEG));
  return {pos, target};
}
// 右の円柱の層の厚み（上から 0..3）。新しい層は底に差し込まれ、上の層を押し上げる
function layersAt(t: number) {
  return [LH, ...INS07.map((s) => LH * E_SLAM(prog(t, s, s + 0.6)))];
}
const rise = (t: number) => E_SLAM(prog(t, 0.4, 1.2));

function useTexture(file: string) {
  const [handle] = useState(() => delayRender(`texture ${file}`));
  const [tex, setTex] = useState<THREE.Texture | null>(null);
  useEffect(() => {
    new THREE.TextureLoader().load(
      staticFile(file),
      (tx) => {
        tx.wrapS = THREE.RepeatWrapping;
        tx.colorSpace = THREE.SRGBColorSpace;
        setTex(tx);
        continueRender(handle);
      },
      undefined,
      (err) => cancelRender(err),
    );
  }, [file, handle]);
  return tex;
}

const Rig: React.FC<{t: number}> = ({t}) => {
  const {camera} = useThree();
  const {pos, target} = camAt(t);
  camera.position.copy(pos);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  return null;
};

const lighter = (hex: string, k: number) => '#' + new THREE.Color(hex).lerp(new THREE.Color('#ffffff'), k).getHexString();

const Slab: React.FC<{x: number; y: number; h: number; color: string; tex: THREE.Texture | null; cap?: boolean}> = ({x, y, h, color, tex, cap}) =>
  h < 0.002 ? null : (
    <group position={[x, y + h / 2, 0]}>
      <mesh>
        <cylinderGeometry args={[R, R, h, 96, 1, true]} />
        <meshLambertMaterial color={color} map={tex ?? undefined} side={THREE.DoubleSide} />
      </mesh>
      {cap && (
        <mesh position={[0, h / 2 + 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[R, 96]} />
          <meshLambertMaterial color={lighter(color, 0.45)} />
        </mesh>
      )}
    </group>
  );

const World: React.FC<{t: number}> = ({t}) => {
  const tex = useTexture('sediment-3d.png');
  const k = rise(t);
  const hs = layersAt(t).map((h) => h * k);
  // 右: 上から層 0..3。層 i の底 = その下の層の厚みの和
  const bottoms = hs.map((_, i) => hs.slice(i + 1).reduce((a, b) => a + b, 0));
  return (
    <>
      <ambientLight intensity={2.2} />
      <directionalLight position={[-5, 9, 8]} intensity={2.0} />
      <directionalLight position={[6, 2, -5]} intensity={0.4} />
      {/* 左: ポン出し（薄い 1 層。変えない＝比較の基準） */}
      <Slab x={XL} y={0} h={LH * k} color={STRATA[0]} tex={tex} cap />
      {/* 右: 作り込み（下から積み上がる 4 層） */}
      {hs.map((h, i) => (
        <Slab key={i} x={XR} y={bottoms[i]} h={h} color={STRATA[i]} tex={tex} cap={i === 0} />
      ))}
    </>
  );
};

function useProjector(t: number) {
  const cam = useMemo(() => new THREE.PerspectiveCamera(FOV, W / H, 0.1, 200), []);
  const {pos, target} = camAt(t);
  cam.position.copy(pos);
  cam.lookAt(target);
  cam.updateMatrixWorld();
  cam.updateProjectionMatrix();
  return (x: number, y: number, z: number) => {
    const v = new THREE.Vector3(x, y, z).project(cam);
    return {x: (v.x + 1) * 0.5 * W + SHIFT, y: (1 - v.y) * 0.5 * H};
  };
}

export const Cut07: React.FC<CutProps> = ({t}) => {
  const P = useProjector(t);
  const labL = P(XL, 0, R + 0.15);
  const labR = P(XR, 0, R + 0.15);
  const slam = E_SLAM(prog(t, 13.6, 14.1));
  const pulse = 1 + 0.06 * Math.sin(Math.PI * prog(t, 9.6, 10.0));
  return (
    <AbsoluteFill>
      <Bg color={C.paper} />
      <Grid dx={t * 8} />
      <AbsoluteFill style={{transform: `translateX(${SHIFT}px)`}}>
        <ThreeCanvas width={W} height={H} gl={{antialias: true, preserveDrawingBuffer: true, alpha: true}} camera={{fov: FOV, near: 0.1, far: 200, position: [0, 3, 13]}}>
          <Rig t={t} />
          <World t={t} />
        </ThreeCanvas>
      </AbsoluteFill>
      <Line t={t} text="同じテーマ × 複数本ずつ" x={150} y={100} size={84} weight={800} t0={0.2} style={{transform: `scale(${pulse})`, transformOrigin: '0 50%'}} />
      <Line t={t} text="ポン出し" x={labL.x} y={labL.y + 26} size={58} weight={700} color={C.gray} anchor="c" t0={4.6} />
      <Line t={t} text="作り込み" x={labR.x} y={labR.y + 26} size={58} weight={800} anchor="c" t0={6.0} />
      <Line t={t} text="すべてで、" x={1064} y={300} size={68} weight={700} t0={13.2} />
      <Lay ox={1440} oy={460} r={lerp(4, 0, slam)} s={lerp(1.3, 1, slam)}>
        <Line t={t} text="明確な差。" x={1060} y={390} size={150} color={C.red} t0={13.6} stagger={0.02} />
      </Lay>
      <Line t={t} text="プロの目＋別環境の複数AIで評価" x={1064} y={590} size={38} weight={700} t0={11.9} stagger={0.015} />
      <Line t={t} text="筆者が仕事で書いた記事での比較" x={1824} y={985} size={32} weight={400} color={C.gray} anchor="r" t0={1.6} stagger={0.015} />
    </AbsoluteFill>
  );
};

// ---- 08 ポン出しでは、届かない領域がある。（留保と理由） ----
const FLOOR = 980;
const REACH = 250; // 到達線
const Cyl2D: React.FC<{cx: number; w: number; hs: number[]}> = ({cx, w, hs}) => {
  const total = hs.reduce((a, b) => a + b, 0);
  if (total < 1) return null;
  const ry = w * 0.16;
  const x0 = cx - w / 2;
  let y = FLOOR;
  const parts: React.ReactNode[] = [];
  // 下の層から描く（hs は上から）。各層の底は楕円で丸める
  for (let i = hs.length - 1; i >= 0; i--) {
    const h = hs[i];
    if (h < 0.5) continue;
    const top = y - h;
    parts.push(<path key={i} d={`M${x0},${top} L${x0},${y} A${w / 2},${ry} 0 0 0 ${x0 + w},${y} L${x0 + w},${top} Z`} fill={STRATA[i]} />);
    y = top;
  }
  const topColor = STRATA[hs.findIndex((h) => h >= 0.5)];
  parts.push(<ellipse key="cap" cx={cx} cy={y} rx={w / 2} ry={ry} fill={lighter(topColor, 0.45)} stroke={lighter(topColor, 0.1)} strokeWidth={2} />);
  return <>{parts}</>;
};
export const Cut08: React.FC<CutProps> = ({t}) => {
  const dolly = prog(t, 0, 3.2);
  const sink = E_PUSH(prog(t, 3.0, 3.8));
  const band = E_SINK(prog(t, 3.4, 4.2));
  const gl = E_SLAM(prog(t, 4.2, 5.6));
  const gr = E_SLAM(prog(t, 4.4, 6.6));
  const crane = E_SINK(prog(t, 10.6, 13));
  const by = lerp(-280, 0, band);
  return (
    <AbsoluteFill>
      <Bg color={C.paper} />
      <Grid dx={t * 8} />
      <Lay y={170 * crane} s={lerp(1, 1.05, prog(t, 4.0, 11.0))}>
        {/* 留保は叩き込まず、行のマスクで静かに入れる（画面全体はゆっくり寄る） */}
        <Lay s={lerp(1, 1.06, dolly)} y={1000 * sink}>
          <Line t={t} text="汎用エージェントも、" x={960} y={370} size={84} weight={800} color={C.gray} anchor="c" t0={0.5} t1={3.0} dur={0.6} stagger={0.035} />
          <Line t={t} text="悪くはない。" x={960} y={480} size={130} color={C.gray} anchor="c" t0={1.6} t1={3.0} dur={0.6} stagger={0.04} />
        </Lay>
        {/* 斜線の帯と到達線（破線） */}
        {band > 0 && (
          <svg data-fig="1" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={W} height={H}>
            <defs>
              <pattern id="hatch08" width={22} height={22} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1={0} y1={0} x2={0} y2={22} stroke="#C9CCD1" strokeWidth={3} />
              </pattern>
            </defs>
            <rect x={-50} y={130 + by} width={W + 100} height={REACH - 130} fill="url(#hatch08)" />
            <line x1={-50} y1={REACH + by} x2={W + 50} y2={REACH + by} stroke={C.ink} strokeWidth={3} strokeDasharray="16 12" />
          </svg>
        )}
        <Line t={t} text="ポン出しでは、届かない領域" x={150} y={160 + by} size={60} weight={800} t0={3.7} style={{background: C.paper}} />
        <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={W} height={H}>
          <Cyl2D cx={520} w={170} hs={[640 * gl]} />
          <Cyl2D cx={1560} w={170} hs={[0, 1, 2, 3].map(() => 200 * gr)} />
        </svg>
        <Line t={t} text="プロの価値観を、" x={800} y={560} size={60} weight={700} t0={7.6} />
        <Line t={t} text="細部まで。" x={800} y={645} size={120} t0={8.6} stagger={0.03} />
      </Lay>
    </AbsoluteFill>
  );
};
