// メロンソーダフロートのグラス（メニュー写真のたとえ）。出るカットすべてで同じ部品。
// wob: 輪郭の波打ち（ゼロから生成した嘘）。lie: 氷までソーダと同じ緑。gloss: ゼリーのようなつや。glow: 足された光。cherry: 最後の人の手。
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {C, hashR, lerp, mix} from './kit';
import {GEO, Sh, grad, makeLathe, setLathe, useOutlineMat} from './prims';

export type GlassS = {x: number; y: number; z: number; ry: number; s: number; wob: number; lie: number; gloss: number; glow: number; cherry: number; sx?: number; sy?: number; tilt?: number};
const RINGS = 30;
const SEG = 56;
const R0 = (y: number) => 0.62 + 0.34 * Math.pow(Math.max(0, y) / 2.4, 1.15);
// 波の形（高さ y・角度 th・時刻 t）。グラスも中身も同じ波に乗せる
export const waveR = (y: number, th: number, t: number, a: number) => 1 + a * (0.2 * Math.sin(4.1 * y + 2.3 * t) + 0.1 * Math.sin(3 * th + 6.5 * y - 1.9 * t));
export const waveX = (y: number, t: number, a: number) => a * 0.17 * Math.sin(2.7 * y + 1.6 * t + 0.6);

export const Glass: React.FC<{g: GlassS; t: number}> = ({g, t}) => {
  const shell = useMemo(() => makeLathe(RINGS, SEG, 'bottom'), []);
  const liquid = useMemo(() => makeLathe(RINGS, SEG, 'both'), []);
  const hull = useOutlineMat(0.04);
  const a = g.wob;
  setLathe(shell, RINGS, SEG, 0, 2.4, (y, th) => R0(y) * waveR(y, th, t, a), (y) => waveX(y, t, a));
  setLathe(liquid, RINGS, SEG, 0.1, 1.92, (y, th) => (R0(y) - 0.075) * waveR(y, th, t, a), (y) => waveX(y, t, a));
  if (g.s <= 0.002) return null;
  const soda = mix(C.soda, C.green, g.lie);
  const ice = mix(C.ice, C.green, g.lie);
  const cream = mix(C.cream, '#c9ecd2', g.lie * 0.55);
  const part = (y: number): {ox: number; k: number} => ({ox: waveX(y, t, a), k: waveR(y, 0.7, t, a)});
  const rim = part(2.4);
  const cubes: [number, number, number, number][] = [
    [0.42, 2.02, 0.3, 0.4],
    [-0.4, 2.06, 0.34, 1.3],
    [0.1, 2.0, -0.46, 2.2],
    [-0.12, 2.1, 0.05, 0.2],
    [0.5, 2.08, -0.2, 2.9],
  ];
  const inner: [number, number, number, number][] = [
    [-0.22, 1.25, 0.52, 0.5],
    [0.28, 0.82, 0.5, 1.4],
    [-0.05, 0.42, 0.52, 2.3],
    [0.36, 1.5, 0.5, 0.9],
  ];
  const swirl: [number, number, number][] = [
    [0.66, 0.3, 2.34],
    [0.52, 0.28, 2.66],
    [0.37, 0.26, 2.94],
    [0.22, 0.22, 3.17],
  ];
  return (
    <group position={[g.x, g.y, g.z]} rotation={[0, 0, g.tilt ?? 0]} scale={[g.s * (g.sx ?? 1), g.s * (g.sy ?? 1), g.s * (g.sx ?? 1)]}>
      {/* 接地の影 */}
      <mesh geometry={GEO.disc} rotation={[-Math.PI / 2, 0, 0]} position={[0.12, 0.008, 0.1]} scale={[0.95, 0.8, 1]}>
        <meshBasicMaterial color={C.ink} transparent opacity={0.13} depthWrite={false} />
      </mesh>
      {/* 足された光（床の円） */}
      {g.glow > 0.01 ? (
        <mesh geometry={GEO.disc} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} scale={1.2 + 0.9 * g.glow}>
          <meshBasicMaterial color={C.gold} transparent opacity={0.5 * g.glow} depthWrite={false} />
        </mesh>
      ) : null}
      <group rotation={[0, g.ry, 0]}>
        {/* グラス: 墨の殻と、奥の壁 */}
        <mesh geometry={shell} material={hull} />
        <mesh geometry={shell}>
          <meshToonMaterial color={mix('#e9f3f1', '#d3ecd9', g.lie)} gradientMap={grad} side={THREE.BackSide} />
        </mesh>
        <mesh geometry={GEO.tor} rotation={[Math.PI / 2, 0, 0]} position={[rim.ox, 2.4, 0]} scale={[0.96 * rim.k, 0.96 * rim.k, 1]}>
          <meshBasicMaterial color={C.ink} />
        </mesh>
        {/* 液 */}
        <mesh geometry={liquid}>
          <meshToonMaterial color={soda} gradientMap={grad} />
        </mesh>
        {/* 液の中の氷（手前の壁ごしに見える） */}
        {inner.map(([x, y, z, r], i) => {
          const w = part(y);
          return <Sh key={i} s={[0.3, 0.3, 0.02]} p={[x * w.k + w.ox, y, z * w.k]} r={[0, 0, r + a * 0.6 * Math.sin(t * 2 + i)]} c={ice} o={0.022} flat ro={2} />;
        })}
        {/* 上に出た氷 */}
        {cubes.map(([x, y, z, r], i) => {
          const w = part(y);
          return <Sh key={i} s={[0.36 * w.k, 0.36, 0.36 * w.k]} p={[x * w.k + w.ox, y, z * w.k]} r={[r * 0.4, r, r * 0.7 + a * 0.5 * Math.sin(t * 2.4 + i * 2)]} c={ice} o={0.028} />;
        })}
        {/* ソフトクリーム */}
        {swirl.map(([r, h, y], i) => {
          const w = part(y);
          return <Sh key={i} g="sph" s={[r * w.k, h, r * w.k]} p={[w.ox * 1.3, y, 0]} c={cream} o={0.035} />;
        })}
        {(() => {
          const w = part(3.4);
          return <Sh g="cone" s={[0.12 * (1 - g.cherry), 0.3 * (1 - g.cherry), 0.12 * (1 - g.cherry)]} p={[w.ox * 1.5 + 0.03, 3.42, 0]} r={[0, 0, -0.25 - a * 0.8 * Math.sin(t * 2.1)]} c={cream} o={0.03} />;
        })()}
        {/* ストロー */}
        <Sh g="cyl" s={[0.05, 2.5, 0.05]} p={[-0.52 + part(2.6).ox, 2.55, -0.25]} r={[0.12, 0, 0.3 + a * 0.25 * Math.sin(t * 1.7)]} c={C.white} o={0.028} />
        {/* つや（ゼリーのような反射） */}
        {[0, 1, 2].map((i) => {
          const y = 0.75 + i * 0.5;
          const w = part(y);
          const th = -0.75 + i * 0.12;
          const rr = (R0(y) + 0.012) * w.k;
          const big = 1 + 1.6 * g.gloss;
          return <Sh key={i} g="sph" s={[0.045 * big, (0.2 - i * 0.04) * big, 0.012]} p={[Math.sin(th) * rr + w.ox, y, Math.cos(th) * rr]} r={[0, th, 0.12]} c={C.white} o={0} flat op={0.55 + 0.4 * g.gloss} />;
        })}
        {g.gloss > 0.02
          ? cubes.slice(0, 4).map(([x, y, z], i) => {
              const w = part(y);
              return <Sh key={i} g="sph" s={[0.1 * g.gloss, 0.045 * g.gloss, 0.1 * g.gloss]} p={[x * w.k + w.ox + 0.05, y + 0.21, z * w.k + 0.08]} c={C.white} o={0} flat op={0.9} />;
            })
          : null}
        {/* さくらんぼ（最後に人が置く） */}
        {g.cherry > 0.01 ? (
          <group position={[0.04, 3.5 + (1 - g.cherry) * 2.4, 0.06]} scale={Math.min(1, g.cherry * 3)}>
            <Sh g="sph" s={[0.19, 0.19, 0.19]} c={C.cherry} o={0.03} />
            <Sh g="sph" s={[0.05, 0.035, 0.02]} p={[-0.07, 0.08, 0.16]} c={C.white} o={0} flat />
            <Sh g="cyl" s={[0.018, 0.42, 0.018]} p={[0.08, 0.34, 0]} r={[0, 0, -0.38]} c={C.ink} o={0} flat />
          </group>
        ) : null}
      </group>
    </group>
  );
};
// 画面上の外接を見積もるための高さ・半径
export const GLASS_H = 3.6;
export const GLASS_R = 1.0;
export const _unused = [hashR, lerp];
