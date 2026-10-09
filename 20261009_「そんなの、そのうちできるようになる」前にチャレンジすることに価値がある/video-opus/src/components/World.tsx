// 3D の世界: 地面・溝・×・舗装・人印・キー・柱・断面・字形の下の光・土の粒。
// 形は useMemo で一度だけ作り、時刻で変わる値は毎フレーム uniform / 位置として与える。
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {clamp, cut, ease, hash, lerp, prog, pulse, smooth, wobble} from '../lib/anim';
import {
  FOG,
  crossFrag,
  crossVert,
  glyphFrag,
  glyphVert,
  grooveGlowFrag,
  grooveTrenchFrag,
  grooveVert,
  groundFrag,
  groundVert,
  pillarFrag,
  roadFrag,
  roadVert,
  slabFrag,
} from '../lib/shaders';
import {
  KEYS,
  MAXD,
  P,
  ROAD_A,
  ROAD_B,
  ROOT,
  SLAB,
  SUCCESS,
  V2,
  WAITER,
  detourHead,
  detourProgress,
  followHead,
  growDepth,
  keysAmount,
  paveA,
  paveB,
  pillarRise,
  slabRise,
  surveyA,
} from '../lib/world';

void FOG;
export type Env = {t: number; camY: number; fogNear: number; fogFar: number; fogColor: THREE.Color; flood: number; glyphGlow: number; spot: [number, number]; light: number};

const fogU = (e: Env) => ({uFogColor: {value: e.fogColor}, uFogNear: {value: e.fogNear}, uFogFar: {value: e.fogFar}});
function setFog(m: THREE.ShaderMaterial, e: Env) {
  m.uniforms.uFogColor.value = e.fogColor;
  m.uniforms.uFogNear.value = e.fogNear;
  m.uniforms.uFogFar.value = e.fogFar;
}

// ---- 地面 ----
export const Ground: React.FC<{env: Env}> = ({env}) => {
  const mat = useMemo(
    () => new THREE.ShaderMaterial({vertexShader: groundVert, fragmentShader: groundFrag, uniforms: {...fogU(env), uGrid: {value: 1}, uLight: {value: 1}, uSpot: {value: new THREE.Vector3()}, uSpotR: {value: 30}}}),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  setFog(mat, env);
  mat.uniforms.uLight.value = env.light;
  mat.uniforms.uSpot.value.set(env.spot[0], 0, env.spot[1]);
  mat.uniforms.uSpotR.value = lerp(18, 90, clamp((env.camY - 4) / 60));
  mat.uniforms.uGrid.value = 1 - 0.6 * env.flood;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} material={mat} renderOrder={0}>
      <planeGeometry args={[700, 700, 1, 1]} />
    </mesh>
  );
};

// ---- 溝 ----
type Seg = {a: V2; b: V2; d0: number; d1: number; kind: number; ch: number};
function buildSegs(): Seg[] {
  const segs: Seg[] = [];
  for (const e of P.edges) segs.push({a: [e[0], e[1]], b: [e[2], e[3]], d0: e[4] - 1, d1: e[4], kind: e[5], ch: 0});
  for (const o of P.outs) {
    let prev = o.from;
    o.pts.forEach((p, i) => {
      segs.push({a: prev, b: p, d0: o.d0 + i, d1: o.d0 + i + 1, kind: 0, ch: 0});
      prev = p;
    });
  }
  for (let i = 0; i < P.detour.length - 1; i++) segs.push({a: P.detour[i], b: P.detour[i + 1], d0: i, d1: i + 1, kind: 0, ch: 1});
  return segs;
}
function segGeometry(segs: Seg[], y: number) {
  const base = new THREE.PlaneGeometry(1, 2, 1, 1);
  // position.x: 0..1, position.y: -1..1, position.z: 高さ
  const pos = base.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < pos.count; i++) {
    pos.setXYZ(i, pos.getX(i) + 0.5, pos.getY(i), y);
  }
  const g = new THREE.InstancedBufferGeometry();
  g.index = base.index;
  g.setAttribute('position', pos);
  const A = new Float32Array(segs.length * 2);
  const B = new Float32Array(segs.length * 2);
  const D = new Float32Array(segs.length * 2);
  const K = new Float32Array(segs.length * 2);
  segs.forEach((s, i) => {
    A.set(s.a, i * 2);
    B.set(s.b, i * 2);
    D.set([s.d0, s.d1], i * 2);
    K.set([s.kind, s.ch], i * 2);
  });
  g.setAttribute('iA', new THREE.InstancedBufferAttribute(A, 2));
  g.setAttribute('iB', new THREE.InstancedBufferAttribute(B, 2));
  g.setAttribute('iD', new THREE.InstancedBufferAttribute(D, 2));
  g.setAttribute('iK', new THREE.InstancedBufferAttribute(K, 2));
  g.instanceCount = segs.length;
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
  return g;
}

export const Grooves: React.FC<{env: Env}> = ({env}) => {
  const {trench, glow, gT, gG} = useMemo(() => {
    const segs = buildSegs();
    const common = {uGrow: {value: 0}, uDetour: {value: 0}, uHalf: {value: 0.6}, uWidth: {value: 1}};
    const trench = new THREE.ShaderMaterial({
      vertexShader: grooveVert,
      fragmentShader: grooveTrenchFrag,
      uniforms: {...fogU(env), ...THREE.UniformsUtils.clone(common)},
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glow = new THREE.ShaderMaterial({
      vertexShader: grooveVert,
      fragmentShader: grooveGlowFrag,
      uniforms: {...fogU(env), ...THREE.UniformsUtils.clone(common), uCore: {value: 0.1}, uPulse: {value: -999}, uFlood: {value: 0}, uIntensity: {value: 1}},
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    return {trench, glow, gT: segGeometry(segs, 0.012), gG: segGeometry(segs, 0.02)};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const grow = growDepth(env.t);
  const det = detourProgress(env.t);
  // 高いところから見るほど線を太く（俯瞰で字形が読めるように）
  const wb = 1 + 1.0 * clamp((env.camY - 6) / 55);
  for (const m of [trench, glow]) {
    setFog(m, env);
    m.uniforms.uGrow.value = grow;
    m.uniforms.uDetour.value = det;
    m.uniforms.uWidth.value = wb;
  }
  glow.uniforms.uPulse.value = env.t > 115.2 ? (env.t - 115.2) * 95 : -999;
  glow.uniforms.uFlood.value = env.flood;
  glow.uniforms.uCore.value = 0.1;
  return (
    <>
      <mesh geometry={gT} material={trench} frustumCulled={false} renderOrder={2} />
      <mesh geometry={gG} material={glow} frustumCulled={false} renderOrder={3} />
    </>
  );
};

// ---- × ----
export const Crosses: React.FC<{env: Env}> = ({env}) => {
  const {geo, mat} = useMemo(() => {
    const base = new THREE.PlaneGeometry(1, 1, 1, 1);
    base.rotateX(-Math.PI / 2);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute('position', base.attributes.position);
    const items: [number, number, number, number, number][] = [];
    for (const c of P.cross) items.push([c[0], c[1], c[2] + 0.6, 0, 1]);
    for (const o of P.outs) {
      const last = o.pts[o.pts.length - 1];
      items.push([last[0], last[1], o.d0 + o.pts.length + 0.3, 0, 1.15]);
    }
    const de = P.detour[P.detourDeadEnd];
    items.push([de[0], de[1], P.detourDeadEnd - 0.05, 1, 2.2]);
    const C = new Float32Array(items.length * 3);
    const K = new Float32Array(items.length * 2);
    items.forEach((it, i) => {
      C.set([it[0], it[1], it[2]], i * 3);
      K.set([it[3], it[4]], i * 2);
    });
    g.setAttribute('iC', new THREE.InstancedBufferAttribute(C, 3));
    g.setAttribute('iK', new THREE.InstancedBufferAttribute(K, 2));
    g.instanceCount = items.length;
    const mat = new THREE.ShaderMaterial({
      vertexShader: crossVert,
      fragmentShader: crossFrag,
      uniforms: {...fogU(env), uGrow: {value: 0}, uDetour: {value: 0}, uSize: {value: 1}, uIntensity: {value: 1}},
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return {geo: g, mat};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  setFog(mat, env);
  mat.uniforms.uGrow.value = growDepth(env.t);
  mat.uniforms.uDetour.value = detourProgress(env.t);
  mat.uniforms.uSize.value = 0.95 * (1 + 0.3 * clamp((env.camY - 6) / 60));
  mat.uniforms.uIntensity.value = 1 - env.flood * 0.5;
  return <mesh geometry={geo} material={mat} frustumCulled={false} renderOrder={4} />;
};

// ---- 字形の下の光 ----
export const GlyphGlow: React.FC<{env: Env; mask: THREE.Texture | null}> = ({env, mask}) => {
  const mat = useMemo(() => {
    const [gw, gh] = [Math.round(1600 / 14), Math.round(700 / 14)];
    const data = new Uint8Array(gw * gh * 4).fill(255);
    const cell = P.cell;
    for (const e of P.edges) {
      const i = Math.floor((e[2] / 0.05 + 800) / 14);
      const j = Math.floor((e[3] / 0.05 + 350) / 14);
      if (i < 0 || j < 0 || i >= gw || j >= gh) continue;
      const v = Math.round((e[4] / MAXD) * 254);
      const o = (j * gw + i) * 4;
      data[o] = Math.min(data[o], v);
    }
    // 根の格子
    const ri = Math.floor((ROOT[0] / 0.05 + 800) / 14);
    const rj = Math.floor((ROOT[1] / 0.05 + 350) / 14);
    data[(rj * gw + ri) * 4] = 0;
    void cell;
    const tex = new THREE.DataTexture(data, gw, gh, THREE.RGBAFormat);
    tex.flipY = true;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearFilter;
    tex.needsUpdate = true;
    return new THREE.ShaderMaterial({
      vertexShader: glyphVert,
      fragmentShader: glyphFrag,
      uniforms: {...fogU(env), uMask: {value: null}, uDepth: {value: tex}, uGrow: {value: 0}, uMaxD: {value: MAXD}, uGlow: {value: 0}, uFlood: {value: 0}},
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  if (!mask) return null;
  setFog(mat, env);
  mat.uniforms.uMask.value = mask;
  mat.uniforms.uGrow.value = growDepth(env.t);
  mat.uniforms.uGlow.value = env.glyphGlow;
  mat.uniforms.uFlood.value = env.flood;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]} material={mat} renderOrder={1}>
      <planeGeometry args={[80, 35]} />
    </mesh>
  );
};

// ---- 舗装 ----
function roadMaterial(env: Env, axis: number, center: number, halfW: number) {
  return new THREE.ShaderMaterial({
    vertexShader: roadVert,
    fragmentShader: roadFrag,
    uniforms: {...fogU(env), uFront: {value: -1e4}, uStart: {value: 0}, uAxis: {value: axis}, uCenter: {value: center}, uHalfW: {value: halfW}, uSheen: {value: 1}},
  });
}
export const Roads: React.FC<{env: Env}> = ({env}) => {
  const {mA, mB, rollMat} = useMemo(
    () => ({
      mA: roadMaterial(env, 0, ROAD_A.z, ROAD_A.w / 2),
      mB: roadMaterial(env, 1, ROAD_B.x, ROAD_B.w / 2),
      rollMat: new THREE.MeshStandardMaterial({color: '#6d6d68', roughness: 0.6, metalness: 0.1}),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const t = env.t;
  const fa = t >= cut(4).start ? paveA(t) : -1e4;
  const fb = t >= 70.4 ? -paveB(t) : -1e4; // 道Bは -z へ進む（along = -z）
  setFog(mA, env);
  setFog(mB, env);
  mA.uniforms.uFront.value = fa;
  mB.uniforms.uFront.value = fb;
  mA.uniforms.uSheen.value = 1 - prog(t, 41, 44);
  mB.uniforms.uSheen.value = 1 - prog(t, 77, 80);
  const lenA = ROAD_A.x1 - ROAD_A.x0;
  const lenB = ROAD_B.z0 - ROAD_B.z1;
  const rollingA = t >= cut(4).start && fa < ROAD_A.x1 - 0.5;
  const rollingB = t >= 70.4 && -fb > ROAD_B.z1 + 0.5;
  const sv = surveyA(t) * (1 - prog(t, cut(4).start + 2, cut(4).start + 6));
  return (
    <>
      <mesh position={[(ROAD_A.x0 + ROAD_A.x1) / 2, 0.06, ROAD_A.z]} material={mA} renderOrder={5}>
        <boxGeometry args={[lenA, 0.12, ROAD_A.w]} />
      </mesh>
      <mesh position={[ROAD_B.x, 0.061, (ROAD_B.z0 + ROAD_B.z1) / 2 - ROAD_A.w / 2]} material={mB} renderOrder={5}>
        <boxGeometry args={[ROAD_B.w, 0.122, lenB]} />
      </mesh>
      {rollingA ? (
        <mesh position={[fa, 0.75, ROAD_A.z]} rotation={[Math.PI / 2, 0, -fa / 0.75]} material={rollMat}>
          <cylinderGeometry args={[0.75, 0.75, ROAD_A.w + 0.3, 24]} />
        </mesh>
      ) : null}
      {rollingB ? (
        <mesh position={[ROAD_B.x, 0.7, -fb]} rotation={[0, 0, Math.PI / 2]} material={rollMat}>
          <cylinderGeometry args={[0.7, 0.7, ROAD_B.w + 0.3, 24]} />
        </mesh>
      ) : null}
      {sv > 0.01 ? <SurveyLines amount={sv} /> : null}
    </>
  );
};
// 舗装前の測量線（遠方の基準線）
const SurveyLines: React.FC<{amount: number}> = ({amount}) => {
  const geo = useMemo(() => {
    const pts: number[] = [];
    for (const dz of [-ROAD_A.w / 2, ROAD_A.w / 2]) {
      for (let x = ROAD_A.x0; x < ROAD_A.x1; x += 2) pts.push(x, 0.03, ROAD_A.z + dz, x + 1.1, 0.03, ROAD_A.z + dz);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return g;
  }, []);
  return (
    <lineSegments geometry={geo}>
      <lineBasicMaterial color="#e8e6dc" transparent opacity={0.55 * amount} />
    </lineSegments>
  );
};

// ---- 成功の点線（カット9以降）----
export const SuccessLine: React.FC<{env: Env}> = ({env}) => {
  const k = prog(env.t, cut(9).start - 0.6, cut(9).start + 1.4);
  if (k <= 0) return null;
  const n = 22;
  const items = [];
  for (let i = 0; i < n; i++) {
    const u = i / (n - 1);
    if (u > k) break;
    items.push(
      <mesh key={i} position={[SUCCESS.x, 0.04, lerp(SUCCESS.z0, SUCCESS.z1, u)]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.13, 10]} />
        <meshBasicMaterial color="#f2f0e8" />
      </mesh>,
    );
  }
  return <>{items}</>;
};

// ---- 人印 ----
const Person: React.FC<{x: number; z: number; scale?: number; lean?: number; color?: string}> = ({x, z, scale = 1, lean = 0, color = '#ebe8df'}) => (
  <group position={[x, 0, z]} scale={scale} rotation={[0, 0, lean]}>
    <mesh position={[0, 0.85, 0]}>
      <capsuleGeometry args={[0.32, 0.9, 6, 12]} />
      <meshStandardMaterial color={color} roughness={0.5} emissive={color} emissiveIntensity={0.25} />
    </mesh>
    <mesh position={[0, 1.95, 0]}>
      <sphereGeometry args={[0.3, 16, 12]} />
      <meshStandardMaterial color={color} roughness={0.5} emissive={color} emissiveIntensity={0.25} />
    </mesh>
  </group>
);
export const People: React.FC<{env: Env}> = ({env}) => {
  const t = env.t;
  if (t > cut(3).end + 0.5) return null;
  const head = detourHead(t).p;
  const dig = Math.sin(t * 9) * 0.12 * (t > 7 ? 1 : 0);
  return (
    <>
      {t < cut(3).start + 1 ? <Person x={WAITER[0]} z={WAITER[1]} /> : null}
      <Person x={head[0]} z={head[1]} lean={dig} />
    </>
  );
};

// ---- キー（カット5）----
export const Keys: React.FC<{env: Env}> = ({env}) => {
  const t = env.t;
  const amt = keysAmount(t);
  const {mesh, legend} = useMemo(() => {
    const geo = new THREE.BoxGeometry(1.5, 0.6, 1.5);
    const mat = new THREE.MeshStandardMaterial({color: '#2b2a27', roughness: 0.55, metalness: 0.15});
    const mesh = new THREE.InstancedMesh(geo, mat, 14 * 4);
    mesh.frustumCulled = false;
    const lg = new THREE.PlaneGeometry(0.7, 0.12);
    const lmat = new THREE.MeshBasicMaterial({color: '#d2ff1a'});
    const legend = new THREE.InstancedMesh(lg, lmat, 14 * 4);
    legend.frustumCulled = false;
    return {mesh, legend};
  }, []);
  if (amt <= 0.001) return null;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const e = new THREE.Euler();
  let i = 0;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 14; c++) {
      const x = KEYS.x0 + c * 1.75 + r * 0.45;
      const z = KEYS.z0 + r * 1.75;
      const h = hash(r * 31 + c);
      // 「打たなくなれば」で順に沈む（一部は残る＝落ちるかもしれない）
      const sinkStart = 45.6 + h * 3.6;
      const sinks = h < 0.82;
      const sk = sinks ? ease.in(prog(t, sinkStart, sinkStart + 1.4)) : 0;
      const press = Math.max(0, Math.sin(t * 7 + h * 30)) ** 8 * (1 - prog(t, 45, 46)) * 0.18;
      const rise = ease.outBack(clamp(amt * 1.2 - h * 0.2));
      const y = lerp(-1.2, 0.3, rise) - press - sk * 1.6;
      e.set(sk * (h - 0.5) * 0.8, 0, sk * (h - 0.5) * 0.6);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
      mesh.setMatrixAt(i, m);
      e.set(-Math.PI / 2 + sk * (h - 0.5) * 0.8, 0, 0);
      q.setFromEuler(e);
      m.compose(new THREE.Vector3(x, y + 0.31, z + 0.35), q, new THREE.Vector3(1, 1, 1));
      legend.setMatrixAt(i, m);
      i++;
    }
  }
  mesh.instanceMatrix.needsUpdate = true;
  legend.instanceMatrix.needsUpdate = true;
  return (
    <>
      <primitive object={mesh} />
      <primitive object={legend} />
      <Waveform env={env} />
    </>
  );
};
// 音声入力の波形（打たなくなる理由）
const Waveform: React.FC<{env: Env}> = ({env}) => {
  const t = env.t;
  const k = prog(t, 44.4, 45.6) * (1 - prog(t, 50.5, 52));
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(240 * 3), 3));
    return g;
  }, []);
  if (k <= 0) return null;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < 240; i++) {
    const u = i / 239;
    const x = lerp(KEYS.x0 - 2, KEYS.x1 + 2, u);
    const env2 = Math.sin(u * Math.PI);
    const y = 2.6 + k * env2 * (0.9 * Math.sin(u * 40 + t * 9) * Math.sin(u * 7 - t * 3) + 0.35 * Math.sin(u * 95 + t * 15));
    pos.setXYZ(i, x, y, KEYS.z0 + 2.5);
  }
  pos.needsUpdate = true;
  return (
    <line>
      <primitive object={geo} attach="geometry" />
      <lineBasicMaterial color="#d2ff1a" transparent opacity={0.9 * k} />
    </line>
  );
};

// ---- 柱（カット6）----
export const Pillar: React.FC<{env: Env}> = ({env}) => {
  const t = env.t;
  const r = pillarRise(t);
  const box: [number, number, number] = [2.0, 7.5, 2.0];
  const cx = ROOT[0];
  const cz = ROOT[1] + 2.6;
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: roadVert,
        fragmentShader: pillarFrag,
        uniforms: {...fogU(env), uBox: {value: new THREE.Vector3()}, uCenterW: {value: new THREE.Vector3()}, uHeat: {value: 0}},
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const ring = pulse(t, 61.5, 1.3);
  if (r <= 0.001 && ring < 0.01) return null;
  const y = lerp(-box[1] / 2 - 0.2, box[1] / 2, r);
  setFog(mat, env);
  mat.uniforms.uBox.value.set(...box);
  mat.uniforms.uCenterW.value.set(cx, y, cz);
  mat.uniforms.uHeat.value = 0.8 * pulse(t, 61.5, 2);
  const rr = lerp(1.2, 13, ease.outExpo(prog(t, 61.5, 63.4)));
  return (
    <>
      <mesh position={[cx, y, cz]} rotation={[0, 0.35, 0]} material={mat}>
        <boxGeometry args={box} />
      </mesh>
      {t > 61.5 && ring > 0.01 ? (
        <mesh position={[cx, 0.05, cz]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[rr - 0.25, rr, 96]} />
          <meshBasicMaterial color="#d2ff1a" transparent opacity={ring} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      ) : null}
    </>
  );
};

// ---- 断面（カット8）----
export const Slab: React.FC<{env: Env}> = ({env}) => {
  const t = env.t;
  const r = slabRise(t);
  const mats = useMemo(
    () =>
      [0, 1].map(
        () =>
          new THREE.ShaderMaterial({
            vertexShader: roadVert,
            fragmentShader: slabFrag,
            uniforms: {...fogU(env), uReveal: {value: 0}, uBox: {value: new THREE.Vector3()}, uCenterW: {value: new THREE.Vector3()}},
          }),
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  if (r <= 0.001) return null;
  const y = lerp(-SLAB.h / 2 - 0.3, SLAB.h / 2 + 0.25, r);
  // 「資料作成では、もう困っていない」で左右に開き、間に道が通る
  const open = ease.inOut(prog(t, 92.2, 94.6)) * 7.5;
  const half = SLAB.w / 2;
  return (
    <>
      {[-1, 1].map((s, i) => {
        const m = mats[i];
        const cx = SLAB.x + s * (half / 2 + open);
        setFog(m, env);
        m.uniforms.uReveal.value = prog(t, 86.5, 91.5) * 1.05 + 0.1;
        m.uniforms.uBox.value.set(half, SLAB.h, SLAB.d);
        m.uniforms.uCenterW.value.set(cx, y, SLAB.z);
        return (
          <mesh key={i} position={[cx, y, SLAB.z]} material={m}>
            <boxGeometry args={[half - 0.05, SLAB.h, SLAB.d]} />
          </mesh>
        );
      })}
    </>
  );
};

// ---- 土の粒（掘っている先端から跳ねる）----
function activeHeads(t: number): {p: V2; amt: number}[] {
  const out: {p: V2; amt: number}[] = [];
  const dk = detourProgress(t);
  if (t > 7 && t < 32) out.push({p: detourHead(t).p, amt: dk < 14.9 ? 1 : 0});
  const g = growDepth(t);
  if (t > 62 && t < 117) {
    for (const [path, a, b] of [
      [P.follow.c7, 62, 81],
      [P.follow.c9, 96, 107],
      [P.follow.c10, 105.5, 117],
    ] as [V2[], number, number][]) {
      if (t > a && t < b && g < path.length - 1) out.push({p: followHead(path, g).p, amt: 1});
    }
  }
  return out;
}
export const Dirt: React.FC<{env: Env}> = ({env}) => {
  const N = 140;
  const {geo, mat} = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 3 * 2), 3));
    g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 3 * 2), 3));
    const m = new THREE.PointsMaterial({size: 0.09, vertexColors: true, transparent: true, depthWrite: false});
    return {geo: g, mat: m};
  }, []);
  const t = env.t;
  const heads = activeHeads(t).slice(0, 2);
  if (heads.length === 0) return null;
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const col = geo.attributes.color as THREE.BufferAttribute;
  let k = 0;
  heads.forEach((h, hi) => {
    for (let i = 0; i < N; i++) {
      const life = 0.9;
      const age = (((t * 1.3 + i / N) % 1) + 1) % 1 * life;
      const seed = i * 7.13 + Math.floor(t * 1.3 + i / N) * 31.7 + hi * 99;
      const vx = (hash(seed) - 0.5) * 3.2;
      const vz = (hash(seed + 1) - 0.5) * 3.2;
      const vy = 2 + hash(seed + 2) * 3.5;
      const y = Math.max(0.02, vy * age - 4.9 * age * age);
      pos.setXYZ(k, h.p[0] + vx * age, y, h.p[1] + vz * age);
      const spark = hash(seed + 3) < 0.25;
      const f = 1 - age / life;
      if (spark) col.setXYZ(k, 0.82 * f * h.amt, 1.0 * f * h.amt, 0.1 * f * h.amt);
      else col.setXYZ(k, 0.35 * f * h.amt, 0.29 * f * h.amt, 0.22 * f * h.amt);
      k++;
    }
  });
  for (; k < N * 2; k++) pos.setXYZ(k, 0, -50, 0);
  pos.needsUpdate = true;
  col.needsUpdate = true;
  mat.size = 0.11 + 0.03 * wobble(t, 9, 1);
  return <points geometry={geo} material={mat} frustumCulled={false} renderOrder={6} />;
};

export {smooth};
