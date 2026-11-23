// Three.js の図の層。カメラは図の層だけに掛ける。すべて時刻 T から決まる純関数。
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {applyCam, type CamS} from './cam';
import {C, clamp, inOut, lerp, out3, outBack, prog} from './kit';
import {POS, PX, cover, wx, wy} from './score';
import {at, D} from './timeline';

const Ring: React.FC<{r: number; thick: number; color: string; opacity?: number; pos?: [number, number, number]; arc?: number}> = ({
  r, thick, color, opacity = 1, pos = [0, 0, 0], arc = 1,
}) => {
  if (opacity <= 0.001 || r <= 0.001 || arc <= 0.001) return null;
  return (
    <mesh position={pos}>
      <ringGeometry args={[Math.max(0.001, r - thick), r, 72, 1, Math.PI / 2, -Math.PI * 2 * Math.min(1, arc)]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

const Dot: React.FC<{r: number; color: string; opacity?: number; pos?: [number, number, number]}> = ({r, color, opacity = 1, pos = [0, 0, 0]}) => {
  if (opacity <= 0.001 || r <= 0.001) return null;
  return (
    <mesh position={pos}>
      <circleGeometry args={[r, 48]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
};

// 画面 px の矩形（左上 x,y・幅 w・高さ h）
const Box: React.FC<{x: number; y: number; w: number; h: number; color: string; opacity?: number; z?: number}> = ({x, y, w, h, color, opacity = 1, z = 0}) => {
  if (opacity <= 0.001 || w <= 0.01 || h <= 0.01) return null;
  return (
    <mesh position={[wx(x + w / 2), wy(y + h / 2), z]}>
      <planeGeometry args={[w * PX, h * PX]} />
      <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
};

// 01: まだ置いていない線＝空の円
const Cut01: React.FC<{T: number}> = ({T}) => {
  const t = T - at('01', 0);
  if (t < 7 || t > D['01'] + 0.3) return null;
  const out = inOut(prog(t, D['01'] - 0.4, D['01']));
  return (
    <group position={[POS['01'][0] - out * 6, POS['01'][1], 0]}>
      <Ring r={74 * PX} thick={7 * PX} color={C.ink} arc={inOut(prog(t, 7.9, 10.4))} pos={[wx(1560), wy(800), 0]} />
    </group>
  );
};

// 02: 10 個 → 100 個 → 1000 個。塗った点は選ばれた答え、輪郭の一つは残る
const N = 1000;
const E_IDX = 7;
const slot = (layout: 1 | 2 | 3, i: number): [number, number] => {
  if (layout === 1) return [420 + i * 120, 620];
  if (layout === 2) {
    const j = i === E_IDX ? 46 : i === 46 ? E_IDX : i;
    return [1010 + (j % 10) * 76, 170 + Math.floor(j / 10) * 76];
  }
  const j = i === E_IDX ? 433 : i === 433 ? E_IDX : i;
  return [220 + (j % 50) * 30.2, 110 + Math.floor(j / 50) * 30];
};
export const dotE3 = slot(3, E_IDX);

const Cut02: React.FC<{T: number}> = ({T}) => {
  const t = T - at('02', 0);
  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({color: C.ink}), N);
    m.frustumCulled = false;
    return m;
  }, []);
  const on = t > -0.2 && t < D['02'] + 0.2;
  const show = on ? 1 - cover(T) : 0;
  const k2 = inOut(prog(t, 7.7, 8.7));
  const k3 = inOut(prog(t, 12.4, 13.5));
  const r = lerp(lerp(34, 25, k2), 10.5, k3) * PX;
  const [ox, oy] = POS['02'];
  const pos = (i: number): [number, number] => {
    const a = i < 10 ? slot(1, i) : slot(2, Math.min(i, 99));
    const b = i < 100 ? slot(2, i) : slot(3, i);
    const c = slot(3, i);
    // 声の「もっともらしいものとして選びます」で、塗った 8 個だけが一段上がる（選ばれた答え）
    const pick = i < 10 && i !== 2 && i !== E_IDX ? 46 * outBack(prog(t, 3.2 + i * 0.1, 3.6 + i * 0.1)) * (1 - k2) : 0;
    const p = [lerp(a[0], b[0], k2), lerp(a[1], b[1], k2) - pick];
    return [lerp(p[0], c[0], k3), lerp(p[1], c[1], k3)];
  };
  const m4 = new THREE.Matrix4();
  for (let i = 0; i < N; i++) {
    let s = 0;
    if (show > 0.001 && i !== E_IDX) {
      if (i < 10) s = outBack(prog(t, 0.3 + i * 0.07, 0.65 + i * 0.07)) * (i === 2 ? k2 : 1);
      else if (i < 100) s = out3(prog(t, 7.75 + (i % 17) * 0.03, 8.25 + (i % 17) * 0.03));
      else s = out3(prog(t, 12.45 + (i % 23) * 0.03, 12.95 + (i % 23) * 0.03));
    }
    const [x, y] = pos(i);
    s *= r * show;
    m4.makeScale(Math.max(s, 1e-5), Math.max(s, 1e-5), 1);
    m4.setPosition(ox + wx(x), oy + wy(y), 0);
    mesh.setMatrixAt(i, m4);
  }
  mesh.instanceMatrix.needsUpdate = true;
  if (!on) return null;
  const pe = pos(E_IDX);
  const p2 = pos(2);
  const thick = lerp(6, 2.6, k3) * PX;
  return (
    <>
      <primitive object={mesh} />
      <group position={[ox, oy, 0]}>
        <Ring r={r * outBack(prog(t, 0.8, 1.15))} thick={thick} color={C.ink} opacity={show} pos={[wx(pe[0]), wy(pe[1]), 0.01]} />
        <Ring r={r * outBack(prog(t, 0.45, 0.8))} thick={thick} color={C.ink} opacity={show * (1 - k2)} pos={[wx(p2[0]), wy(p2[1]), 0.01]} />
      </group>
    </>
  );
};

// 03: 門は、同じ形だけを中へ入れる
const Cut03: React.FC<{T: number}> = ({T}) => {
  const t = T - at('03', 0);
  if (t < -0.3 || t > D['03'] + 0.3) return null;
  const show = 1 - cover(T);
  const draw = out3(prog(t, 0.3, 1.2));
  const close = out3(prog(t, 4.3, 4.8));
  const L = 300;
  const top = 330;
  const bot = 800;
  return (
    <group position={[POS['03'][0], POS['03'][1], 0]}>
      <Box x={L} y={top} w={8} h={(bot - top) * draw} color={C.blue} opacity={show} />
      <Box x={L} y={top} w={64 * draw} h={8} color={C.blue} opacity={show} />
      <Box x={L} y={bot - 8} w={64 * draw} h={8} color={C.blue} opacity={show * prog(t, 1.0, 1.2)} />
      <Box x={660} y={top} w={8} h={(bot - top) * close} color={C.blue} opacity={show} />
      {[0, 1, 2].map((i) => {
        const k = inOut(prog(t, 1.5 + i * 0.2, 2.3 + i * 0.2));
        const x = lerp(900 + i * 150, 352 + i * 100, k);
        const s = out3(prog(t, 0.5 + i * 0.12, 0.9 + i * 0.12));
        return <Box key={i} x={x + 42 * (1 - s)} y={523 + 42 * (1 - s)} w={84 * s} h={84 * s} color={C.ink} opacity={show} z={0.01} />;
      })}
    </group>
  );
};

// 目盛りの線（x0..x1 を k まで描く。major ごとに長い刻み）
const Scale: React.FC<{y: number; x0: number; x1: number; k: number; opacity: number; step?: number; shift?: number}> = ({y, x0, x1, k, opacity, step = 90, shift = 0}) => {
  const end = lerp(x0, x1, k);
  const ticks: React.ReactNode[] = [];
  for (let i = 0, x = x0 + step + (((shift % step) + step) % step); x < end - 4; x += step, i++) {
    const major = Math.round((x - shift - x0) / step) % 2 === 0;
    ticks.push(<Box key={i} x={x - 2} y={y - (major ? 26 : 14)} w={4} h={major ? 26 : 14} color={C.blue} opacity={opacity} />);
  }
  return (
    <>
      <Box x={x0} y={y} w={end - x0} h={6} color={C.blue} opacity={opacity} />
      {ticks}
    </>
  );
};

// 04: 針は目盛りに乗らない
export const needleX04 = (t: number) => 860 + 300 * Math.sin(t * 0.83 + 0.6) + 110 * Math.sin(t * 2.17);
const Cut04: React.FC<{T: number}> = ({T}) => {
  const t = T - at('04', 0);
  if (t < -0.3 || t > D['04'] + 0.3) return null;
  const show = 1 - cover(T);
  const nx = needleX04(t);
  const pop = outBack(prog(t, 1.2, 1.6));
  return (
    <group position={[POS['04'][0], POS['04'][1], 0]}>
      <Scale y={800} x0={-400} x1={2400} k={out3(prog(t, 0.2, 1.3))} opacity={show} shift={-t * 14} />
      <Dot r={17 * PX * pop} color={C.ink} opacity={show} pos={[wx(nx), wy(738), 0.02]} />
      <Box x={nx - 2} y={752} w={4} h={22 * pop} color={C.ink} opacity={show} z={0.02} />
    </group>
  );
};

// 05: 一つの目盛り（針が乗っている）→ 二つの印、あいだが赤い
const Cut05: React.FC<{T: number}> = ({T}) => {
  const t = T - at('05', 0);
  if (t < -0.3 || t > D['05'] + 0.3) return null;
  const show = 1 - cover(T);
  const band = out3(prog(t, 10.7, 11.4));
  const glow = inOut(prog(t, 11.2, 13.6));
  const shrink = inOut(prog(t, D['05'] - 0.4, D['05']));
  const A = 640;
  const B = 1180;
  const bw = (B - A) * band * (1 - shrink);
  return (
    <>
      <group position={[POS['05'][0], POS['05'][1], 0]} visible={t < 10.45}>
        <Scale y={780} x0={-300} x1={2300} k={out3(prog(t, 0.2, 1.2))} opacity={show} step={180} />
        <Box x={598} y={736} w={4} h={44} color={C.ink} opacity={show * prog(t, 0.9, 1.1)} z={0.02} />
        <Dot r={17 * PX * outBack(prog(t, 0.9, 1.3))} color={C.ink} opacity={show} pos={[wx(600), wy(722), 0.02]} />
      </group>
      <group position={[POS['05b'][0], POS['05b'][1], 0]} visible={t > 10.0}>
        <Box x={-300} y={640} w={2600} h={6} color={C.blue} opacity={show} />
        {/* 赤の暈と帯（帯は語へ広がらない） */}
        <Box x={A - 14} y={643 - 62 - glow * 14} w={bw + 28} h={124 + glow * 28} color={C.halo} opacity={show * band * (0.35 + 0.3 * glow)} z={0.01} />
        <Box x={A - 6} y={643 - 40} w={bw + 12} h={80} color={C.halo} opacity={show * band * (0.5 + 0.4 * glow)} z={0.015} />
        <Box x={A} y={643 - 17} w={bw} h={34} color={C.red} opacity={show * band} z={0.02} />
        <Box x={A - 4} y={590} w={8} h={106} color={C.ink} opacity={show} z={0.03} />
        <Box x={B - 4} y={590} w={8} h={106} color={C.ink} opacity={show} z={0.03} />
      </group>
    </>
  );
};

// 06: 線は、開いた円の手前で止まる。途中に印
const Cut06: React.FC<{T: number}> = ({T}) => {
  const t = T - at('06', 0);
  if (t < 4 || t > D['06'] + 0.3) return null;
  const show = 1 - cover(T);
  const drop = inOut(prog(t, D['06'] - 0.35, D['06']));
  const end = lerp(160, 1180, out3(prog(t, 4.5, 5.6))) + 150 * prog(t, 5.6, D['06']);
  return (
    <group position={[POS['06'][0], POS['06'][1] - drop * 3, 0]}>
      <Box x={160} y={776} w={end - 160} h={8} color={C.blue} opacity={show} />
      <Ring r={46 * PX} thick={6 * PX} color={C.blue} opacity={show} pos={[wx(1640), wy(780), 0]} arc={out3(prog(t, 4.6, 5.3))} />
      <Dot r={22 * PX * outBack(prog(t, 8.35, 8.75))} color={C.blue} opacity={show} pos={[wx(700), wy(780), 0.02]} />
    </group>
  );
};

export const World: React.FC<{T: number; cam: CamS}> = ({T, cam}) => {
  const {camera} = useThree();
  applyCam(camera as THREE.PerspectiveCamera, cam);
  return (
    <>
      <Cut01 T={T} />
      <Cut02 T={T} />
      <Cut03 T={T} />
      <Cut04 T={T} />
      <Cut05 T={T} />
      <Cut06 T={T} />
    </>
  );
};
