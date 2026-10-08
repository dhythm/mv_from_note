// カット3★: 何もしないのは、現状維持じゃない。劣化への、カウントダウンだ。
// 世界が加速し、止まった「現状維持」だけが取り残される。縁から錆び、崩れた粒が「劣化へのカウントダウン」へ組み替わる。
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {cut, ease, pE, pS, prog, smooth} from '../../lib/anim';
import {CamKeys, stage} from '../../lib/rig';
import {KText} from '../KText';
import {Stage} from '../Stage';
import {ParticleMorph, RustWord} from '../RustWord';

const c = cut(3);
export const cam3: CamKeys = {
  dist: [[c.start + 0.35, 12.5], [pS(3, 'b'), 10.5], [pS(3, 'c') + 0.3, 17], [c.end - 0.05, 16]],
  az: [[c.start + 0.35, -62], [pS(3, 'b'), -76], [pS(3, 'c') + 0.2, -22], [pS(3, 'd') + 0.5, 0], [c.end - 0.05, 9]],
  el: [[c.start + 0.35, 5], [pS(3, 'c'), 7], [c.end - 0.05, 3]],
  roll: [[c.start + 0.35, -7], [pS(3, 'b'), 5], [pS(3, 'c') + 0.2, -11], [pS(3, 'd') + 0.5, 2], [c.end - 0.05, -3]],
  tx: [[c.start + 0.35, 0]],
  ty: [[c.start + 0.35, 0.9]],
  fov: [[c.start + 0.35, 46], [pS(3, 'b'), 46, 'in'], [pS(3, 'c') + 0.3, 38], [c.end - 0.05, 36]],
};
export const hits3 = [pS(3, 'b') + 0.05, pE(3, 'b') - 0.45, pS(3, 'c'), pS(3, 'd') + 0.5];

// 目盛り（カウントダウン）: 刻みが時計回りに消えていく
const Dial: React.FC<{t: number; opacity: number; left: number; spin: number}> = ({t, opacity, left, spin}) => {
  const ticks = 60;
  const mats = useMemo(() => new THREE.MeshBasicMaterial({color: '#ff8a3a', transparent: true, toneMapped: false, depthWrite: false}), []);
  const majorMat = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffd0a0', transparent: true, toneMapped: false, depthWrite: false}), []);
  mats.opacity = opacity * 0.9;
  majorMat.opacity = opacity;
  if (opacity <= 0.001) return null;
  return (
    <group rotation={[0, 0, spin]}>
      {Array.from({length: ticks}).map((_, i) => {
        if (i >= left) return null;
        const a = Math.PI / 2 - (i / ticks) * Math.PI * 2;
        const major = i % 5 === 0;
        const r = 7.4;
        return (
          <mesh key={i} position={[Math.cos(a) * r, Math.sin(a) * r, 0]} rotation={[0, 0, a]} material={major ? majorMat : mats}>
            <planeGeometry args={[major ? 0.75 : 0.4, major ? 0.11 : 0.06]} />
          </mesh>
        );
      })}
      <mesh rotation={[0, 0, -t * 0.0]} material={mats}>
        <ringGeometry args={[8.1, 8.16, 128]} />
      </mesh>
    </group>
  );
};

export const C03: React.FC<{t: number}> = ({t}) => {
  const s = stage(t, 3);
  const camera = useThree((st) => st.camera);
  if (!s.on) return null;
  const tb = pS(3, 'b');
  const slam = ease.expoOut(prog(t, tb - 0.15, tb + 0.2));
  const rust = ease.inOut(prog(t, tb + 0.45, pS(3, 'c') + 0.05)) * 0.95;
  const crumble = ease.in(prog(t, pS(3, 'c') - 0.05, pS(3, 'c') + 0.8));
  const burst = prog(t, pS(3, 'c') - 0.1, pS(3, 'c') + 0.7);
  const gather = prog(t, pS(3, 'c') + 0.3, pS(3, 'd') + 0.55);
  const bOn = smooth(prog(t, pS(3, 'd') + 0.15, pS(3, 'd') + 0.6));
  const out = 1 - smooth(prog(t, c.end - 0.25, c.end + 0.3));
  const dialOn = smooth(prog(t, pS(3, 'd') - 0.1, pS(3, 'd') + 0.5)) * out;
  const left = 60 - Math.floor(prog(t, pS(3, 'd') + 0.3, c.end + 0.4) * 42);
  const q = camera.quaternion.clone();
  return (
    <Stage x={s.x} y={0.9}>
      <KText text="何もしないのは、" t={t} at={[pS(3, 'a') - 0.1, pS(3, 'c') - 0.2]} size={0.95} pos={[0, 3.1, 0]} enter="fly" exit="scatter" face seed={21} />
      {t > tb - 0.2 ? (
        <RustWord text="現状維持" height={4.0} rust={rust} crumble={crumble} face scale={1 + 1.2 * (1 - slam)} opacity={slam} glow={rust * 0.6} seed={3} position={[0, 0, 0]} />
      ) : null}
      <KText text="じゃない" t={t} at={[pE(3, 'b') - 0.5, pS(3, 'c') + 0.25]} size={1.15} pos={[3.2, -2.1, 0.4]} enter="slam" exit="fall" color="#ff5a3c" face seed={22} />
      <ParticleMorph from="現状維持" to="劣化へのカウントダウン" heightA={4.0} heightB={2.3} burst={burst} gather={gather} opacity={(1 - smooth(prog(t, pS(3, 'd') + 0.5, pS(3, 'd') + 1.3))) * out} face />
      <RustWord text="劣化へのカウントダウン" height={2.3} rust={0.42 + 0.25 * prog(t, pS(3, 'd'), c.end)} tint="#ffc490" opacity={bOn * out} glow={0.5} face seed={7} scale={1 + 0.04 * Math.sin(t * 5)} />
      <group quaternion={q}>
        <Dial t={t} opacity={dialOn} left={left} spin={-prog(t, pS(3, 'd'), c.end + 0.5) * 1.2 + 0.4 * (1 - dialOn)} />
      </group>
    </Stage>
  );
};
