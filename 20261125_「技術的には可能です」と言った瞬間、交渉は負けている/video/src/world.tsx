// Three.js の図の層。figs.ts の並び（札・棚・束・柱・線）をそのまま描く。カメラは図の層だけに掛ける。
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {applyCam, type CamS} from './cam';
import {C} from './kit';
import type {Prim} from './figs';
import {POS, PX, cover, wx, wy} from './score';

const cache = new Map<string, THREE.ShapeGeometry>();
function rounded(w: number, h: number, r: number) {
  // 世界単位は 1px ≈ 0.009。刻みを粗くすると、縁と塗り（数 px 差）が同じ形になる
  const key = `${w.toFixed(4)}_${h.toFixed(4)}_${r.toFixed(4)}`;
  let g = cache.get(key);
  if (!g) {
    if (cache.size > 1500) {
      cache.forEach((old) => old.dispose());
      cache.clear();
    }
    const rr = Math.max(0.01, Math.min(r, w / 2, h / 2));
    const s = new THREE.Shape();
    s.moveTo(-w / 2 + rr, -h / 2);
    s.lineTo(w / 2 - rr, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + rr);
    s.lineTo(w / 2, h / 2 - rr);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - rr, h / 2);
    s.lineTo(-w / 2 + rr, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - rr);
    s.lineTo(-w / 2, -h / 2 + rr);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + rr, -h / 2);
    g = new THREE.ShapeGeometry(s, 8);
    cache.set(key, g);
  }
  return g;
}
const triGeo = (() => {
  const s = new THREE.Shape();
  s.moveTo(-0.5, 0.5);
  s.lineTo(0.5, 0.5);
  s.lineTo(0, -0.5);
  s.closePath();
  return new THREE.ShapeGeometry(s);
})();

const Flat: React.FC<{geo: THREE.BufferGeometry; color: string; opacity: number; z?: number; scale?: [number, number, number]; pos?: [number, number, number]; ro?: number}> = ({geo, color, opacity, z = 0, scale, pos, ro = 0}) => (
  <mesh geometry={geo} position={pos ?? [0, 0, z]} scale={scale} renderOrder={ro}>
    <meshBasicMaterial color={color} transparent opacity={opacity} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
  </mesh>
);

const Item: React.FC<{p: Prim; show: number; order: number}> = ({p, show, order}) => {
  const o = (p.o ?? 1) * (p.over ? 1 : show);
  if (o <= 0.004 || p.k === 'label') return null;
  const [ox, oy] = POS[p.cut];
  const s = p.s ?? 1;
  const w = Math.max(0.5, p.w) * PX;
  const h = Math.max(0.5, p.h) * PX;
  const pos: [number, number, number] = [ox + wx(p.x), oy + wy(p.y), p.z ?? 0];
  const rz = (-(p.rz ?? 0) * Math.PI) / 180;
  if (p.k === 'tri') {
    return (
      <group position={pos} rotation={[0, 0, rz]} scale={[w * s, h * s, 1]} renderOrder={order}>
        <Flat geo={triGeo} color={p.fill ?? C.blue} opacity={o} />
      </group>
    );
  }
  if (p.k === 'rect') {
    return (
      <group position={pos} rotation={[0, 0, rz]} scale={[s, s, 1]} renderOrder={order}>
        <Flat geo={rounded(w, h, 0.01)} color={p.fill ?? C.ink} opacity={o} />
      </group>
    );
  }
  const ry = p.ry ?? 0;
  const flipped = Math.cos(ry) < 0;
  const fill = flipped && p.back ? p.back.fill : (p.fill ?? C.card);
  const edge = flipped && p.back ? p.back.edge : (p.edge ?? C.cardEdge);
  const ew = (p.ew ?? 0) * PX;
  const rad = (p.rad ?? 0) * PX;
  const lift = Math.sin(Math.min(Math.PI, Math.max(0, ry)));
  const sh = p.shadow ?? 0;
  return (
    <group position={pos} rotation={[0, 0, rz]} renderOrder={order}>
      {sh > 0
        ? [0, 1, 2].map((i) => (
            <Flat
              key={i}
              geo={rounded(w + (10 + i * 14) * PX, h + (10 + i * 14) * PX, rad + (6 + i * 7) * PX)}
              color="#3A3226"
              opacity={o * sh * 0.055}
              ro={-1}
              pos={[(7 + 26 * lift) * PX, -(11 + 30 * lift) * PX, -0.01]}
              scale={[s * Math.max(0.05, Math.abs(Math.cos(ry))), s, 1]}
            />
          ))
        : null}
      <group rotation={[0, ry, 0]} scale={[s, s, 1]} position={[0, 0, 0.35 * lift]} renderOrder={order}>
        {ew > 0 ? <Flat geo={rounded(w, h, rad)} color={edge} opacity={o} ro={1} /> : null}
        <Flat geo={rounded(Math.max(0.01, w - ew * 2), Math.max(0.01, h - ew * 2), Math.max(0.01, rad - ew))} color={fill} opacity={o} ro={2} />
      </group>
    </group>
  );
};

// 机の目（淡い点の格子）。カメラの寄り・振りが、白い紙の上でも見えるようにする
const Grid: React.FC<{show: number}> = ({show}) => {
  const mesh = useMemo(() => {
    const x0 = -16;
    const x1 = 236;
    const y0 = -72;
    const y1 = 14;
    const step = 1.15;
    const nx = Math.floor((x1 - x0) / step);
    const ny = Math.floor((y1 - y0) / step);
    const m = new THREE.InstancedMesh(new THREE.CircleGeometry(0.034, 10), new THREE.MeshBasicMaterial({color: C.dot, depthTest: false, depthWrite: false}), nx * ny);
    const m4 = new THREE.Matrix4();
    let i = 0;
    for (let a = 0; a < nx; a++) for (let b = 0; b < ny; b++) {
      m4.setPosition(x0 + a * step, y0 + b * step, -0.05);
      m.setMatrixAt(i++, m4);
    }
    m.frustumCulled = false;
    m.renderOrder = -1;
    return m;
  }, []);
  (mesh.material as THREE.MeshBasicMaterial).transparent = true;
  (mesh.material as THREE.MeshBasicMaterial).opacity = show;
  mesh.visible = show > 0.01;
  return <primitive object={mesh} />;
};

export const World: React.FC<{T: number; cam: CamS; items: Prim[]}> = ({T, cam, items}) => {
  const {camera} = useThree();
  applyCam(camera as THREE.PerspectiveCamera, cam);
  const show = 1 - cover(T);
  const sorted = items.map((p, i) => ({p, i})).sort((a, b) => (a.p.z ?? 0) - (b.p.z ?? 0) || (a.p.layer ?? 0) - (b.p.layer ?? 0) || a.i - b.i);
  return (
    <>
      <Grid show={show} />
      {sorted.map(({p, i}, n) => (
        <Item key={`${p.cut}-${i}`} p={p} show={show} order={n + 1} />
      ))}
    </>
  );
};
