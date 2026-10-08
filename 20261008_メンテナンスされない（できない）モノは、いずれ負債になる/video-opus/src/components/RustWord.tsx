// 語全体を1枚で描き、縁から錆びて崩れる文字。粒子への組み替え（ParticleMorph）と組み合わせる。
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {wordTexture, samplePoints} from '../lib/glyphs';
import {pointsMaterial, rustTextMaterial} from '../lib/shaders';
import {clamp, ease, rnd, rndS} from '../lib/anim';

export const RustWord: React.FC<{
  text: string; height: number; rust: number; crumble?: number; tint?: string; opacity?: number; glow?: number;
  position?: [number, number, number]; rotation?: [number, number, number]; scale?: number; face?: boolean; seed?: number; weight?: number; renderOrder?: number;
}> = ({text, height, rust, crumble = 0, tint = '#ffffff', opacity = 1, glow = 0, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, face = false, seed = 0, weight = 900, renderOrder = 8}) => {
  const wt = wordTexture(text, weight);
  const mat = useMemo(() => rustTextMaterial(wt.tex, wt.w / wt.h), [wt]);
  const camera = useThree((s) => s.camera);
  const u = mat.uniforms;
  u.uRust.value = rust;
  u.uCrumble.value = crumble;
  u.uTint.value.set(tint);
  u.uOpacity.value = opacity;
  u.uGlow.value = glow;
  u.uSeed.value = seed;
  if (opacity <= 0.001 || crumble >= 1) return null;
  const q = new THREE.Quaternion();
  if (face) q.copy(camera.quaternion);
  q.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)));
  return (
    <mesh position={position} quaternion={q} scale={scale} material={mat} renderOrder={renderOrder}>
      <planeGeometry args={[(height * wt.w) / wt.h, height]} />
    </mesh>
  );
};

// 語Aの字形から粒子が剥がれ、渦を巻いて語Bの字形へ組み替わる
export const ParticleMorph: React.FC<{
  from: string; to: string; heightA: number; heightB: number; count?: number;
  burst: number; // 0..1 剥がれて散る
  gather: number; // 0..1 Bへ集まる
  opacity?: number; position?: [number, number, number]; face?: boolean; colorA?: string; colorB?: string; spin?: number;
}> = ({from, to, heightA, heightB, count = 2200, burst, gather, opacity = 1, position = [0, 0, 0], face = false, colorA = '#c9662a', colorB = '#ff8a3a', spin = 0}) => {
  const camera = useThree((s) => s.camera);
  const {geo, mat, A, B, dir} = useMemo(() => {
    const wa = wordTexture(from, 900);
    const wb = wordTexture(to, 900);
    const sa = samplePoints(wa, count, 1);
    const sb = samplePoints(wb, count, 2);
    const ka = heightA / wa.h, kb = heightB / wb.h;
    const A = new Float32Array(count * 3), B = new Float32Array(count * 3), dir = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      A[i * 3] = sa[i * 3] * ka; A[i * 3 + 1] = sa[i * 3 + 1] * ka;
      B[i * 3] = sb[i * 3] * kb; B[i * 3 + 1] = sb[i * 3 + 1] * kb;
      dir[i * 3] = rndS(i, 1) * 6; dir[i * 3 + 1] = rndS(i, 2) * 4 - 1.5; dir[i * 3 + 2] = rndS(i, 3) * 5 + 2;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array(count), 1));
    const ps = new Float32Array(count);
    for (let i = 0; i < count; i++) ps[i] = 0.5 + rnd(i, 4);
    geo.setAttribute('psize', new THREE.BufferAttribute(ps, 1));
    const mat = pointsMaterial(0.11);
    return {geo, mat, A, B, dir};
  }, [from, to, heightA, heightB, count]);
  if (opacity <= 0.001 || (burst <= 0 && gather <= 0)) return null;
  const pos = geo.attributes.position.array as Float32Array;
  const col = geo.attributes.color.array as Float32Array;
  const al = geo.attributes.alpha.array as Float32Array;
  const ca = new THREE.Color(colorA), cb = new THREE.Color(colorB);
  for (let i = 0; i < count; i++) {
    // 粒ごとに少しずらす（縁から先に剥がれ、遅れて集まる）
    const d = rnd(i, 5) * 0.35;
    const b = ease.out(clamp((burst - d) / (1 - d + 1e-6)));
    const g = ease.inOut(clamp((gather - d * 0.6) / (1 - d * 0.6 + 1e-6)));
    const sx = A[i * 3] + dir[i * 3] * b, sy = A[i * 3 + 1] + dir[i * 3 + 1] * b - b * b * 1.2, sz = dir[i * 3 + 2] * b;
    // 渦: 集まる途中で中心のまわりを回る
    const sw = Math.sin(g * Math.PI) * (1.5 + rnd(i, 6) * 2.5);
    const ang = g * Math.PI * (1.2 + spin) + rnd(i, 7) * 6.28;
    let x = sx + (B[i * 3] - sx) * g + Math.cos(ang) * sw;
    let y = sy + (B[i * 3 + 1] - sy) * g + Math.sin(ang) * sw * 0.6;
    let z = sz * (1 - g) + Math.sin(ang * 1.3) * sw * 0.5;
    pos[i * 3] = x; pos[i * 3 + 1] = y; pos[i * 3 + 2] = z;
    const c = ca.clone().lerp(cb, g);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    al[i] = clamp(burst * 4) * (1 - 0.0 * g);
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.color.needsUpdate = true;
  geo.attributes.alpha.needsUpdate = true;
  mat.uniforms.uOpacity.value = opacity;
  const q = face ? camera.quaternion.clone() : new THREE.Quaternion();
  return <points geometry={geo} material={mat} position={position} quaternion={q} frustumCulled={false} renderOrder={9} />;
};
