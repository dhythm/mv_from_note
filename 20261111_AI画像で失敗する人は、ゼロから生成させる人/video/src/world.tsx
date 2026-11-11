// 図の層（three.js）。一続きの空間に、0〜100 の目盛り・グラス・折れた線・帯が立つ。カメラがその上を飛ぶ。
import React from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {CamS, SX, applyCam} from './cam';
import {C, clamp, hash, lerp, mix, sstep} from './kit';
import {GEO, Seg, Sh} from './prims';
import {Glass} from './glass';
import {LANE_B, LANE_Z, barsAt, glassAt, jagAt, lightAt, ruler2K, rulerK} from './score';
import {SetsB} from './sets';

const Rig: React.FC<{cam: CamS}> = ({cam}) => {
  const {camera} = useThree();
  applyCam(camera as THREE.PerspectiveCamera, cam);
  return null;
};

// 目盛り: 1 ごとの刻み。k は 100 の側から立つ割合
const Ruler: React.FC<{k: number; z?: number}> = ({k, z = 0}) => {
  if (k <= 0.001) return null;
  const x0 = SX(100 - 100 * k);
  return (
    <group position={[0, 0, z]}>
      <Sh s={[SX(100) - x0 + 0.1, 0.05, 0.13]} p={[(SX(100) + x0) / 2, 0.025, 0]} c={C.ink} o={0} flat />
      {Array.from({length: 101}, (_, i) => {
        const kk = clamp((k * 100 - (100 - i)) / 6);
        if (kk <= 0) return null;
        const major = i % 10 === 0;
        const mid = i % 5 === 0;
        const len = (major ? 1.0 : mid ? 0.6 : 0.34) * kk;
        return <Sh key={i} s={[major ? 0.1 : mid ? 0.06 : 0.04, 0.04, len]} p={[SX(i), 0.016, -len / 2]} c={major || mid ? C.ink : '#8d867b'} o={0} flat />;
      })}
    </group>
  );
};

// 0 から走って折れる線
const Jag: React.FC<{T: number}> = ({T}) => {
  const j = jagAt(T);
  if (j.o <= 0.01 || j.head <= 0.2) return null;
  const N = 72;
  const col = mix(C.bend, '#a59d90', j.gray);
  const ph = T * 2.6;
  const f = Math.floor(ph);
  const fr = ph - f;
  const yAt = (i: number) => {
    const v = (i / N) * 100;
    const a = 2.3 * sstep(v, 5, 60) * j.amp;
    const h0 = hash(i * 13 + f * 7);
    const h1 = hash(i * 13 + (f + 1) * 7);
    const h = lerp(h0, h1, fr * fr * (3 - 2 * fr));
    return 0.07 + (i % 2 === 1 ? a * (0.35 + 0.65 * h) : a * 0.12 * h);
  };
  const pts: [number, number, number][] = [];
  const last = (j.head / 100) * N;
  for (let i = 0; i <= Math.floor(last); i++) pts.push([SX((i / N) * 100), yAt(i), LANE_Z]);
  const fi = Math.floor(last);
  if (last > fi && fi < N) {
    const k = last - fi;
    pts.push([SX((last / N) * 100), lerp(yAt(fi), yAt(fi + 1), k), LANE_Z]);
  }
  const tip = pts[pts.length - 1];
  return (
    <group>
      {pts.slice(1).map((p, i) => (
        <Seg key={i} a={pts[i]} b={p} w={0.085} c={col} />
      ))}
      {j.o > 0.9 ? <Sh g="cone" s={[0.2, 0.5, 0.2]} p={[tip[0] + 0.2, tip[1], tip[2]]} r={[0, 0, -Math.PI / 2]} c={col} o={0} flat /> : null}
    </group>
  );
};

const Bars: React.FC<{T: number}> = ({T}) => (
  <>
    {barsAt(T).map((b, i) => {
      const w = SX(b.b) - SX(b.a);
      if (w < 0.03) return null;
      const col = b.kind === 'ink' ? C.ink : C.blue;
      return (
        <group key={i}>
          <Sh s={[w, 0.2, 0.5]} p={[SX(b.a) + w / 2, 0.1 + (b.lift ?? 0), b.z]} c={col} o={0.022} oc={C.ink} />
          {b.kind === 'blue' && b.b < 99 ? <Sh g="cone" s={[0.36, 0.62, 0.36]} p={[SX(b.b) + 0.3, 0.12 + (b.lift ?? 0), b.z]} r={[0, 0, -Math.PI / 2]} c={col} o={0.022} /> : null}
        </group>
      );
    })}
  </>
);

// 70〜90 の床の光。流れる帯が往復する
const Light: React.FC<{T: number}> = ({T}) => {
  const k = lightAt(T);
  if (k <= 0.01) return null;
  const w = SX(90) - SX(70);
  const f = (T * 0.45) % 1;
  return (
    <group>
      <mesh geometry={GEO.plane} rotation={[-Math.PI / 2, 0, 0]} position={[SX(70) + (w * k) / 2, 0.006, -0.9]} scale={[w * k, 3.4, 1]}>
        <meshBasicMaterial color={C.gold} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <mesh geometry={GEO.plane} rotation={[-Math.PI / 2, 0, 0]} position={[SX(70) + w * k * f, 0.008, -0.9]} scale={[0.5, 3.4, 1]}>
        <meshBasicMaterial color={'#ffe9a8'} transparent opacity={0.55 * Math.sin(Math.PI * f) * k} depthWrite={false} />
      </mesh>
    </group>
  );
};

export const World: React.FC<{T: number; cam: CamS}> = ({T, cam}) => {
  const g = glassAt(T);
  return (
    <>
      <Rig cam={cam} />
      <ambientLight intensity={Math.PI * 0.42} />
      <directionalLight position={[4, 9, 6]} intensity={Math.PI * 0.72} />
      <Ruler k={rulerK(T)} />
      <Ruler k={ruler2K(T)} z={LANE_B} />
      <Light T={T} />
      <Bars T={T} />
      <Jag T={T} />
      <Glass g={g} t={T} />
      <SetsB T={T} />
    </>
  );
};
