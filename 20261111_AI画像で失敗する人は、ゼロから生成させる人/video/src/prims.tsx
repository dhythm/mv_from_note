// 3D の部品（three.js / R3F）。面はトゥーンの段階色、輪郭は裏面を膨らませた墨の殻。全カットで同じ質感にする。
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {C} from './kit';

export const grad = (() => {
  const d = new Uint8Array([176, 176, 176, 255, 226, 226, 226, 255, 255, 255, 255, 255]);
  const t = new THREE.DataTexture(d, 3, 1, THREE.RGBAFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
})();

export const GEO = {
  box: new THREE.BoxGeometry(1, 1, 1),
  sph: new THREE.SphereGeometry(1, 40, 24),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 48),
  cone: new THREE.ConeGeometry(1, 1, 40),
  tor: new THREE.TorusGeometry(1, 0.03, 10, 72),
  disc: new THREE.CircleGeometry(1, 48),
  plane: new THREE.PlaneGeometry(1, 1),
};
const HULL: Record<string, [number, number, number]> = {box: [2, 2, 2], sph: [1, 1, 1], cyl: [1, 2, 1], cone: [1.4, 2.4, 1.4]};

type V3 = [number, number, number];
export type ShP = {g?: 'box' | 'sph' | 'cyl' | 'cone'; s: V3; p?: V3; r?: V3; c: string; o?: number; oc?: string; op?: number; flat?: boolean; ro?: number; noDepth?: boolean};
// 形ひとつ（面＋輪郭）。s は拡縮（box は辺の長さ、sph/cyl/cone は半径と高さ）
export const Sh: React.FC<ShP> = ({g = 'box', s, p = [0, 0, 0], r = [0, 0, 0], c, o = 0.03, oc = C.ink, op = 1, flat, ro = 0, noDepth}) => {
  if (op <= 0.003 || s[0] <= 0.0005 || s[1] <= 0.0005 || s[2] <= 0.0005) return null;
  const h = HULL[g];
  return (
    <group position={p} rotation={r}>
      <mesh geometry={GEO[g]} scale={s} renderOrder={ro}>
        {flat ? <meshBasicMaterial color={c} transparent={op < 1 || noDepth} opacity={op} depthTest={!noDepth} depthWrite={op >= 1 && !noDepth} /> : <meshToonMaterial color={c} gradientMap={grad} transparent={op < 1 || noDepth} opacity={op} depthTest={!noDepth} depthWrite={op >= 1 && !noDepth} />}
      </mesh>
      {o > 0 && op > 0.6 ? (
        <mesh geometry={GEO[g]} scale={[s[0] + o * h[0], s[1] + o * h[1], s[2] + o * h[2]]} renderOrder={ro}>
          <meshBasicMaterial color={oc} side={THREE.BackSide} depthTest={!noDepth} transparent={!!noDepth} />
        </mesh>
      ) : null}
    </group>
  );
};

// 2 点を結ぶ棒（折れた線の一区間など）
export const Seg: React.FC<{a: V3; b: V3; w: number; c: string}> = ({a, b, w, c}) => {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const dz = b[2] - a[2];
  const len = Math.hypot(dx, dy, dz);
  if (len < 1e-4) return null;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
  return (
    <mesh geometry={GEO.box} position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]} quaternion={q} scale={[len + w * 0.9, w, w]}>
      <meshBasicMaterial color={c} />
    </mesh>
  );
};

// 回転体（グラスと液）。輪郭を波打たせるため、頂点を毎フレーム書き換える
export function makeLathe(rings: number, seg: number, cap: 'none' | 'top' | 'bottom' | 'both') {
  const n = rings * (seg + 1) + 2;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  const idx: number[] = [];
  for (let i = 0; i < rings - 1; i++)
    for (let j = 0; j < seg; j++) {
      const a = i * (seg + 1) + j;
      const b = a + seg + 1;
      idx.push(a, a + 1, b, a + 1, b + 1, b);
    }
  const cb = rings * (seg + 1);
  const ct = cb + 1;
  if (cap === 'bottom' || cap === 'both') for (let j = 0; j < seg; j++) idx.push(cb, j + 1, j);
  if (cap === 'top' || cap === 'both') for (let j = 0; j < seg; j++) idx.push(ct, (rings - 1) * (seg + 1) + j, (rings - 1) * (seg + 1) + j + 1);
  g.setIndex(idx);
  return g;
}
export function setLathe(g: THREE.BufferGeometry, rings: number, seg: number, y0: number, y1: number, rad: (y: number, th: number) => number, cx: (y: number) => number) {
  const pos = g.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i < rings; i++) {
    const y = y0 + ((y1 - y0) * i) / (rings - 1);
    const ox = cx(y);
    for (let j = 0; j <= seg; j++) {
      const th = (j / seg) * Math.PI * 2;
      const r = rad(y, th);
      pos.setXYZ(i * (seg + 1) + j, ox + Math.sin(th) * r, y, Math.cos(th) * r);
    }
  }
  const cb = rings * (seg + 1);
  pos.setXYZ(cb, cx(y0), y0, 0);
  pos.setXYZ(cb + 1, cx(y1), y1, 0);
  pos.needsUpdate = true;
  g.computeVertexNormals();
  g.computeBoundingSphere();
}
export const useOutlineMat = (w: number, color = C.ink) =>
  useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {w: {value: w}, c: {value: new THREE.Color(color)}},
        vertexShader: 'uniform float w; void main(){ vec3 p = position + normalize(normal) * w; gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0); }',
        fragmentShader: 'uniform vec3 c; void main(){ gl_FragColor = vec4(c, 1.0); }',
      }),
    [w, color],
  );
