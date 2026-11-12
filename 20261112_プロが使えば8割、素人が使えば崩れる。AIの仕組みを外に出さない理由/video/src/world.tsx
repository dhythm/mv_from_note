// 図の層（three.js）。一続きの床の上に、仕組みの積み・素材の帯・カード・8 本のバー・枠・境界・文章の面・二つの塊が並ぶ。
// 一台のカメラがその上を飛ぶ。面はつや消しの立体、床に落ちる影は一つの光から。すべて全体の時刻 T から決まる。
import React, {useMemo} from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {CamS, applyCam} from './cam';
import {C, E_SLAM, clamp, hash, hashR, in3, inOut, kv, lerp, mix, out3, outBack, prog, sstep} from './kit';
import {S, TILE, X} from './score';
import {DOM, fallAngle} from './dominoes';

type V3 = [number, number, number];
const cache = new Map<string, THREE.BufferGeometry>();
function geo(w: number, h: number, d: number, r: number) {
  const key = `${w}|${h}|${d}|${r}`;
  let g = cache.get(key);
  if (!g) {
    g = new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
    cache.set(key, g);
  }
  return g;
}

// 角を丸めた箱。p は中心
export const B: React.FC<{w: number; h: number; d: number; p?: V3; r?: V3; s?: V3; c: string; rad?: number; op?: number; em?: number; shadow?: boolean}> = ({w, h, d, p = [0, 0, 0], r = [0, 0, 0], s = [1, 1, 1], c, rad = 0.06, op = 1, em = 0, shadow = true}) => {
  if (op <= 0.003 || s[0] <= 0.0005 || s[1] <= 0.0005 || s[2] <= 0.0005) return null;
  return (
    <mesh geometry={geo(w, h, d, rad)} position={p} rotation={r} scale={s} castShadow={shadow && op > 0.5} receiveShadow>
      <meshStandardMaterial color={c} roughness={0.72} metalness={0} emissive={c} emissiveIntensity={em} transparent={op < 1} opacity={op} depthWrite={op >= 1} />
    </mesh>
  );
};

// 影を落とす光は、いまいる場所の上に置く（場所ごとに固定。カメラの揺れには付いていかない）
const STATIONS: [number, number][] = [
  [-1e9, 0],
  [S['03'], 44.4],
  [S['04'], 80.5],
  [S['05'], 110.5],
  [S['07'], 140],
  [S['08'], 170.5],
  [S['09'], 200.6],
  [S['10'], 230],
];
const gridMat = new THREE.ShaderMaterial({
  transparent: true,
  depthWrite: false,
  vertexShader: 'varying vec3 wp; void main(){ vec4 p = modelMatrix * vec4(position, 1.0); wp = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }',
  fragmentShader: `varying vec3 wp;
    float line(float v, float step){ float c = v / step; float f = abs(fract(c - 0.5) - 0.5) / fwidth(c); return 1.0 - min(f, 1.0); }
    void main(){
      float a = max(line(wp.x, 2.0), line(wp.z, 2.0)) * 0.10 + max(line(wp.x, 10.0), line(wp.z, 10.0)) * 0.08;
      float d = distance(wp, cameraPosition);
      a *= 1.0 - smoothstep(18.0, 46.0, d);
      gl_FragColor = vec4(0.30, 0.24, 0.14, a);
    }`,
});
const stationX = (T: number) => STATIONS.reduce((x, [at, v]) => (T >= at ? v : x), 0);

const Rig: React.FC<{T: number; cam: CamS}> = ({T, cam}) => {
  const {camera} = useThree();
  applyCam(camera as THREE.PerspectiveCamera, cam);
  const tgt = useMemo(() => new THREE.Object3D(), []);
  const sx = stationX(T);
  return (
    <>
      <hemisphereLight args={['#ffffff', '#e6dccb', 1.75]} />
      <primitive object={tgt} position={[sx, 0, 0]} />
      <directionalLight position={[sx - 9, 20, 12]} target={tgt} intensity={2.5} castShadow shadow-mapSize={[4096, 4096]} shadow-camera-left={-24} shadow-camera-right={24} shadow-camera-top={18} shadow-camera-bottom={-18} shadow-camera-near={1} shadow-camera-far={60} shadow-bias={-0.0006} shadow-normalBias={0.02} />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[sx, 0, 0]} receiveShadow>
        <planeGeometry args={[140, 90]} />
        <shadowMaterial opacity={0.22} color="#3a2c16" />
      </mesh>
      {/* 床の罫（カメラが動くと流れて、速さと奥行きが見える） */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[sx, -0.002, 0]} material={gridMat}>
        <planeGeometry args={[200, 120]} />
      </mesh>
    </>
  );
};

// ---- 01–02 仕組みの積み ----
const SLAB = {w: 3.2, h: 0.7, d: 2.2, gap: 0.12};
const Stack: React.FC<{x: number; z?: number; drop?: number[]; sk?: number; shift?: number[]; c?: string; w?: number}> = ({x, z = 0, drop = [0, 0, 0], sk = 0, shift = [0, 0, 0], c = C.b3, w = SLAB.w}) => (
  <group position={[x, 0, z]}>
    {[0, 1, 2].map((i) => (
      <B key={i} w={w} h={SLAB.h} d={SLAB.d} rad={0.1} c={c} p={[sk * [0, 0.42, -0.3][i] + shift[i], SLAB.h / 2 + i * (SLAB.h + SLAB.gap) + drop[i], sk * [0, 0.22, -0.34][i]]} r={[0, sk * [0, -0.24, 0.33][i], sk * [0, 0.0, 0.05][i]]} />
    ))}
  </group>
);

const SceneStack: React.FC<{T: number}> = ({T}) => {
  if (T > S['03'] + 0.5) return null;
  const drop = [0, 1, 2].map((i) => (1 - E_SLAM(prog(T, 0.12 + i * 0.13, 0.62 + i * 0.13))) * 9);
  const s2 = S['02'];
  const xa = kv(T, [[2.3, 0], [2.85, -2.7, E_SLAM], [8.35, -2.7], [s2, -4.4, in3], [s2 + 0.6, 3.2, E_SLAM]]);
  const xb = kv(T, [[2.3, 0], [2.85, 2.7, E_SLAM], [8.35, 2.7], [s2, 4.4, in3], [s2 + 0.6, 3.2, E_SLAM]]);
  // 4.7 秒: 渡した先の積みが、同じ形ではなくなる
  const u = T - 4.7;
  const sk = u < 0 ? 0 : (E_SLAM(prog(u, 0, 0.4)) + 0.5 * Math.exp(-u * 5) * Math.sin(u * 17)) * (1 - prog(T, s2 - 0.2, s2 + 0.3));
  // 02: 「判断」で、琥珀のつまみが仕組みの上に乗り、回りはじめる
  const kn = s2 + 4.1;
  const kf = 1 - Math.pow(prog(T, kn - 0.35, kn), 2);
  const uk = T - kn;
  const ksq = uk > 0 ? 0.25 * Math.exp(-uk * 9) * Math.cos(uk * 28) : 0;
  const run = sstep(T, kn + 0.2, kn + 1.0);
  const shift = [0, 1, 2].map((i) => run * 0.26 * Math.sin((T - kn) * 4.6 + i * 2.1));
  const top = 3 * SLAB.h + 2 * SLAB.gap;
  return (
    <>
      <Stack x={xa} drop={drop} shift={shift} />
      {T > 2.3 && T < s2 + 0.6 ? <Stack x={xb} sk={sk} /> : null}
      {T > kn - 0.35 ? (
        <group position={[xa + shift[2], top + 0.2 * (1 - ksq) + kf * 9, 0]} rotation={[0, uk > 0 ? -uk * 1.4 : 0, 0]} scale={[1 + ksq * 0.4, 1 - ksq, 1 + ksq * 0.4]}>
          <mesh castShadow receiveShadow>
            <cylinderGeometry args={[0.78, 0.78, 0.4, 48]} />
            <meshStandardMaterial color={C.a3} roughness={0.6} emissive={C.a3} emissiveIntensity={0.08} />
          </mesh>
          <B w={0.16} h={0.1} d={0.6} c={C.ink} p={[0, 0.22, 0.42]} rad={0.03} shadow={false} />
        </group>
      ) : null}
    </>
  );
};

// ---- 03 素材の帯: 72 枚。使えるところだけが拾われ、短い列に並ぶ ----
const SceneStrip: React.FC<{T: number}> = ({T}) => {
  const s = S['03'];
  if (T < s - 0.5 || T > S['04'] + 0.5) return null;
  const xs = lerp(X.strip - 1, X.strip + 30, prog(T, s + 1.6, s + 4.5));
  return (
    <>
      {Array.from({length: TILE.n}, (_, i) => {
        const x0 = X.strip + i * TILE.pitch;
        const rise = E_SLAM(prog(T, s - 0.25 + i * 0.01, s + 0.3 + i * 0.01));
        const pulse = Math.exp(-Math.pow((x0 - xs) / 0.9, 2)) * (T < s + 4.6 ? 1 : 0);
        const j = TILE.sel.indexOf(i);
        if (j < 0) {
          const tc = s + 6.7 + hash(i * 3.1) * 0.9;
          const k = inOut(prog(T, tc, tc + 0.5));
          return <B key={i} w={0.34} h={0.5} d={1.3} rad={0.04} c={mix(C.b3, C.g3, k)} em={pulse * 0.35} p={[x0, 0.25 * rise * lerp(1, 0.1, k) + pulse * 0.22, 0]} s={[lerp(1, 1.2, k), rise * lerp(1, 0.1, k), lerp(1, 0.2, k)]} shadow={k < 0.9} />;
        }
        // 拾われる 4 枚
        const passed = sstep(T, s + 1.6 + ((x0 - X.strip + 1) / 31) * 2.9, s + 1.9 + ((x0 - X.strip + 1) / 31) * 2.9);
        const lift = E_SLAM(prog(T, s + 10.3 + j * 0.06, s + 10.8 + j * 0.06));
        const gather = inOut(prog(T, s + 11.15 + j * 0.05, s + 11.7 + j * 0.05));
        const land = in3(prog(T, s + 11.7 + j * 0.06, s + 11.95 + j * 0.06));
        const ul = T - (s + 11.95 + j * 0.06);
        const sq = ul > 0 ? 0.16 * Math.exp(-ul * 9) * Math.cos(ul * 28) : 0;
        const sc = lerp(1, 1.55, gather) + lift * (1 - gather) * 0.7;
        const y = 0.25 * sc + passed * 0.55 * (1 - land) + lift * 1.5 * (1 - land) + pulse * 0.22 * (1 - passed);
        return <B key={i} w={0.34} h={0.5} d={1.3} rad={0.04} c={C.b3} em={passed * 0.22 + pulse * 0.3} p={[lerp(x0, TILE.rowX + j * TILE.rowPitch, gather), y * (1 - sq * 0.5), 0]} r={[0, 0, lift * (1 - gather) * (j % 2 ? 0.22 : -0.18)]} s={[sc * rise, sc * rise * (1 - sq), sc]} />;
      })}
    </>
  );
};

// ---- 小さな成果物（04 の記事、08 で渡す列、10 の結び）----
const Tile: React.FC<{p: V3; s?: number; r?: V3}> = ({p, s = 1, r}) => <B w={0.5} h={0.72} d={1.2} rad={0.05} c={C.b3} p={p} r={r} s={[s, s, s]} />;

// ---- 04 カード: 構成 → 収集 → 執筆。構成が抜け、収集が先になる ----
export const CARD = {w: 2.3, h: 3.0, x: [77, 80, 83], x2: [0, 78.9, 82.3]};
export function cardX(i: number, T: number) {
  const s = S['04'];
  return i === 0 ? CARD.x[0] : lerp(CARD.x[i], CARD.x2[i], E_SLAM(prog(T, s + 4.35 + (i - 1) * 0.1, s + 4.9 + (i - 1) * 0.1)));
}
const SceneCards: React.FC<{T: number}> = ({T}) => {
  const s = S['04'];
  if (T < s - 0.5 || T > S['05'] + 0.5) return null;
  const hop = (t0: number) => 0.5 * Math.sin(Math.PI * prog(T, t0, t0 + 0.36));
  return (
    <>
      {[0, 1, 2].map((i) => {
        const rise = E_SLAM(prog(T, s - 0.1 + i * 0.1, s + 0.45 + i * 0.1));
        const out = i === 0 ? in3(prog(T, s + 3.75, s + 4.4)) : 0;
        const blue = i === 0 ? 0 : sstep(T, s + 4.4, s + 4.9);
        const y = CARD.h / 2 + (i === 0 ? hop(s + 0.96) : i === 1 ? hop(s + 2.5) : 0) + out * 11;
        return <B key={i} w={CARD.w} h={CARD.h} d={0.3} rad={0.1} c={mix(C.b3l, C.b3, blue)} p={[cardX(i, T), y, 0]} r={[out * 2.6, 0, out * -0.9]} s={[1, rise, 1]} />;
      })}
      {/* 順番の矢印（墨の小さな楔） */}
      {[0, 1].map((i) => {
        const k = E_SLAM(prog(T, s + 1.0 + i * 1.3, s + 1.4 + i * 1.3)) * (1 - (i === 0 ? prog(T, s + 3.7, s + 3.95) : 0));
        const x = i === 0 ? 78.5 : (cardX(1, T) + cardX(2, T)) / 2;
        return (
          <mesh key={i} position={[x, 1.5, 0]} rotation={[0, 0, -Math.PI / 2]} scale={[k, k, k]} castShadow>
            <coneGeometry args={[0.24, 0.46, 3]} />
            <meshStandardMaterial color={C.ink} roughness={0.8} />
          </mesh>
        );
      })}
      {/* 書かせた記事が、執筆の右に並ぶ */}
      {[0, 1, 2].map((j) => {
        const k = E_SLAM(prog(T, s + 7.6 + j * 0.16, s + 8.1 + j * 0.16));
        return k > 0 ? <Tile key={j} p={[lerp(82.3, 84.3 + j * 0.66, k), 0.36, 0.2]} s={k} /> : null;
      })}
    </>
  );
};

// ---- 05–06 8 本のバー。2 本が足されて止まり、同じ 8 本だけが倒れる ----
export const BAR = {depth: 1.7, fall: S['06'] + 9.55, land: [S['05'] + 2.95, S['05'] + 3.25]};
const SceneBars: React.FC<{T: number}> = ({T}) => {
  const s5 = S['05'];
  const s6 = S['06'];
  if (T < s5 - 0.5 || T > S['07'] + 0.5) return null;
  const {h, d, p} = DOM;
  const tremble = sstep(T, s6 + 5.9, s6 + 9.5) * (T < BAR.fall ? 1 : 0);
  return (
    <>
      {Array.from({length: 8}, (_, i) => {
        const rise = E_SLAM(prog(T, s5 + 0.2 + i * 0.09, s5 + 0.72 + i * 0.09));
        const a = fallAngle(i, T - BAR.fall) + tremble * 0.028 * Math.sin(T * 33 + i * 1.9);
        return (
          <group key={i} position={[X.bars + i * p + d, 0, 0]} rotation={[0, 0, -a]}>
            <B w={d} h={h} d={BAR.depth} rad={0.07} c={mix(C.b3, C.r3, prog(a, 0.25, 1.05))} p={[-d / 2, (h / 2) * rise, 0]} s={[1, rise, 1]} />
          </group>
        );
      })}
      {[0, 1].map((j) => {
        const L = BAR.land[j];
        if (T < L - 0.5) return null;
        const fall = 1 - Math.pow(prog(T, L - 0.5, L), 2);
        const u = T - L;
        const sq = u > 0 ? 0.13 * Math.exp(-u * 8) * Math.cos(u * 30) : 0;
        const away = in3(prog(T, s6 + 0.1 + j * 0.12, s6 + 0.7 + j * 0.12));
        if (away >= 1) return null;
        return <B key={j} w={d} h={h} d={BAR.depth} rad={0.07} c={C.a3} em={0.06} p={[X.bars + (8 + j) * p + d / 2, (h / 2) * (1 - sq) + fall * 11 + away * 12, 0]} s={[1 + sq * 0.5, 1 - sq, 1]} r={[0, 0, away * (j ? -0.25 : 0.2)]} />;
      })}
    </>
  );
};

// ---- 07 枠: 誰が使うかを先に決める口。判断の面が入る ----
export const FRAME = {w: 9.8, h: 4.7, t: 0.42, cy: 2.35};
export const frameAmber = S['07'] + 7.2;
const SceneFrame: React.FC<{T: number}> = ({T}) => {
  const s = S['07'];
  if (T < s - 0.5 || T > S['08'] + 0.5) return null;
  const {w, h, t} = FRAME;
  const drop = (1 - E_SLAM(prog(T, s - 0.05, s + 0.5))) * 9;
  const ry = lerp(-0.2, 0.14, prog(T, s, s + 11.5));
  const fa = Math.pow(prog(T, frameAmber - 0.4, frameAmber), 2);
  const u = T - frameAmber;
  const sq = u > 0 ? 0.08 * Math.exp(-u * 8) * Math.cos(u * 26) : 0;
  return (
    <group position={[X.frame, drop, 0]} rotation={[0, ry, 0]}>
      <B w={w} h={t} d={0.9} c={C.ink} p={[0, t / 2, 0]} rad={0.05} />
      <B w={w} h={t} d={0.9} c={C.ink} p={[0, h - t / 2, 0]} rad={0.05} />
      <B w={t} h={h - 2 * t} d={0.9} c={C.ink} p={[-w / 2 + t / 2, h / 2, 0]} rad={0.05} />
      <B w={t} h={h - 2 * t} d={0.9} c={C.ink} p={[w / 2 - t / 2, h / 2, 0]} rad={0.05} />
      {T > frameAmber - 0.4 ? <B w={w - 2 * t - 0.1} h={h - 2 * t - 0.1} d={0.5} c={C.a3} em={0.08} p={[0, h / 2 + (1 - fa) * 8, 0]} s={[1 + sq, 1 - sq, 1]} rad={0.04} /> : null}
    </group>
  );
};

// ---- 08 境界: 左は仕組み（越えない）、右へ渡るのは成果物だけ ----
export const WALL = {stackX: 166.3, tiles: 6, tx0: 171.3, tp: 0.74, hop: S['08'] + 2.5};
const SceneWall: React.FC<{T: number}> = ({T}) => {
  const s = S['08'];
  if (T < s - 0.5 || T > S['09'] + 0.5) return null;
  const up = E_SLAM(prog(T, s - 0.1, s + 0.5));
  // 道具が回っている間の往復。88.4 秒あたりで一度止まり、また動く
  const a = s + 6.4;
  const b = s + 8.9;
  const ph = T < a ? T : T < b ? a : a + (T - b);
  const halt = T > a && T < b ? Math.exp(-(T - a) * 6) * Math.sin((T - a) * 40) * 0.05 : 0;
  const shift = [0, 1, 2].map((i) => 0.3 * Math.sin(ph * 5.2 + i * 2.1) + halt);
  const drop = [0, 1, 2].map((i) => (1 - E_SLAM(prog(T, s + 0.0 + i * 0.1, s + 0.5 + i * 0.1))) * 9);
  return (
    <>
      <B w={0.12} h={0.05} d={10} c={C.ink} p={[X.wall, 0.025, 0]} s={[1, 1, up]} rad={0.01} shadow={false} />
      <B w={0.1} h={1.5} d={8.6} c={C.ink} op={0.16} p={[X.wall, 0.75 * up, 0]} s={[1, up, 1]} rad={0.01} />
      <Stack x={WALL.stackX} drop={drop} shift={shift} w={3.0} />
      {Array.from({length: WALL.tiles * 2}, (_, jj) => {
        const row = jj < WALL.tiles ? 0 : 1;
        const j = jj % WALL.tiles;
        const t0 = (row ? s + 9.2 : WALL.hop) + j * 0.17;
        const k = prog(T, t0, t0 + 0.62);
        if (k <= 0) return null;
        const ke = inOut(k);
        const u = T - (t0 + 0.62);
        const sq = u > 0 ? 0.14 * Math.exp(-u * 9) * Math.cos(u * 28) : 0;
        return <Tile key={jj} p={[lerp(168.7, WALL.tx0 + j * WALL.tp, ke), 0.36 * (1 - sq) + 3.1 * Math.sin(Math.PI * k), row ? -1.5 : 0.4]} r={[0, 0, -Math.PI * 2 * ke]} s={clamp(k * 4)} />;
      })}
    </>
  );
};

// ---- 09 文章の面。プロの目にだけ見える印、「そして」から 20 通りの読みが立つ ----
export const PAGE = {x0: 197.4, cx: 200.8, z0: -2.0, zp: 0.5, word: S['09'] + 8.72, fan: S['09'] + 9.3};
const MARKS: [number, number, number][] = [
  [1, 0.5, 0.8],
  [2, 0.15, 0.5],
  [4, 0.62, 0.9],
  [6, 0.3, 0.6],
  [7, 0.74, 0.5],
];
const lineLen = (i: number) => (i === 8 ? 3.1 : hashR(i * 7.3 + 1, 4.6, 6.6));
const Ribbons: React.FC<{T: number}> = ({T}) => {
  const tubes = useMemo(
    () =>
      Array.from({length: 20}, (_, j) => {
        const len = hashR(j * 5.7 + 2, 3.0, 6.3);
        const top = 0.9 + j * 0.2;
        const f = hashR(j * 3.3 + 9, 1.2, 3.4);
        const ph = hash(j * 9.1) * 6.28;
        const pts = Array.from({length: 40}, (_, n) => {
          const u = n / 39;
          const e = 1 - Math.pow(1 - u, 2.2);
          return new THREE.Vector3(PAGE.x0 + 0.7 + u * len, 0.5 + e * top + 0.24 * Math.sin(u * Math.PI * f + ph) * u, 0.5 - u * 0.8 + (j - 10) * 0.03);
        });
        return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 96, 0.034, 8, false);
      }),
    [],
  );
  return (
    <>
      {tubes.map((g, j) => {
        const k = out3(prog(T, PAGE.fan + j * 0.07, PAGE.fan + 0.75 + j * 0.07));
        if (k <= 0) return null;
        g.setDrawRange(0, Math.floor(96 * k) * 8 * 6);
        return (
          <mesh key={j} geometry={g} castShadow>
            <meshStandardMaterial color={C.a3} roughness={0.6} emissive={C.a3} emissiveIntensity={0.15} />
          </mesh>
        );
      })}
    </>
  );
};
const ScenePage: React.FC<{T: number}> = ({T}) => {
  const s = S['09'];
  if (T < s - 0.5 || T > S['10'] + 0.5) return null;
  const drop = (1 - E_SLAM(prog(T, s - 0.1, s + 0.45))) * 9;
  const wk = E_SLAM(prog(T, PAGE.word, PAGE.word + 0.45));
  return (
    <>
      <B w={8.2} h={0.14} d={5.6} c={C.white} p={[PAGE.cx, 0.07 + drop, 0]} rad={0.05} />
      {Array.from({length: 9}, (_, i) => {
        const k = out3(prog(T, s + 0.55 + i * 0.13, s + 1.1 + i * 0.13));
        const L = lineLen(i);
        const z = PAGE.z0 + i * PAGE.zp;
        if (i === 5) {
          // 「そして」のある行: 頭の一語だけが琥珀で立つ
          return (
            <React.Fragment key={i}>
              <B w={1.1} h={0.12} d={0.2} c={mix(C.ink, C.a3, wk)} p={[PAGE.x0 + 0.55 * k, 0.2 + wk * 0.2, z]} s={[k, 1 + wk * 3.4, 1 + wk * 0.6]} rad={0.03} />
              <B w={L - 1.4} h={0.12} d={0.2} c={C.ink} p={[PAGE.x0 + 1.4 + ((L - 1.4) / 2) * k, 0.2, z]} s={[k, 1, 1]} rad={0.03} />
            </React.Fragment>
          );
        }
        const rd = Math.sin(Math.PI * prog(T, s + 2.6 + i * 0.3, s + 3.2 + i * 0.3));
        return <B key={i} w={L} h={0.12} d={0.2} c={C.ink} p={[PAGE.x0 + (L / 2) * k, 0.2 + rd * 0.28, z]} s={[k, 1, 1]} rad={0.03} />;
      })}
      {MARKS.map(([li, u, w], n) => {
        const k = outBack(prog(T, s + 5.75 + n * 0.2, s + 6.1 + n * 0.2));
        return k > 0 ? <B key={n} w={w} h={0.2} d={0.34} c={C.a3} em={0.1} p={[PAGE.x0 + u * lineLen(li) + w / 2, 0.3, PAGE.z0 + li * PAGE.zp]} s={[k, k, k]} rad={0.04} /> : null;
      })}
      <Ribbons T={T} />
    </>
  );
};

// ---- 10 二つの塊: プロ（琥珀）とエンジニア（青）。歯が当たって離れ、組み直して一つになる ----
export const COMB = {join: S['10'] + 10.35, bump: S['10'] + 5.95};
export function combGap(T: number) {
  const s = S['10'];
  return kv(T, [
    [s + 5.1, 2.5],
    [COMB.bump, 0.5, in3],
    [s + 6.5, 2.3, out3],
    [s + 9.0, 2.5],
    [s + 9.94, 2.2, inOut],
    [COMB.join, 0, in3],
  ]);
}
const SceneComb: React.FC<{T: number}> = ({T}) => {
  const s = S['10'];
  if (T < s - 0.5) return null;
  const g = combGap(T);
  const inA = (1 - E_SLAM(prog(T, s - 0.05, s + 0.5))) * -12;
  const inB = (1 - E_SLAM(prog(T, s + 0.75, s + 1.3))) * 12;
  const ub = T - COMB.bump;
  const shake = ub > 0 ? Math.exp(-ub * 7) * Math.sin(ub * 38) * 0.06 : 0;
  const uj = T - COMB.join;
  const sq = uj > 0 ? 0.07 * Math.exp(-uj * 8) * Math.cos(uj * 26) : 0;
  const ry = uj > 0 ? -0.22 * (1 - Math.exp(-uj * 0.5)) : 0;
  const RH = 0.375;
  const rows = (r: number) => RH / 2 + r * RH;
  return (
    <group position={[X.comb, 0, 0]} rotation={[0, ry, 0]} scale={[1 + sq, 1 - sq, 1]}>
      <group position={[-g + inA, 0, 0]} rotation={[0, 0, shake]}>
        <B w={1.0} h={3.0} d={1.8} c={C.a3} em={0.05} p={[-1.6, 1.5, 0]} rad={0.08} />
        {[0, 2, 4, 6].map((r) => (
          <B key={r} w={1.7} h={RH} d={1.8} c={C.a3} em={0.05} p={[-0.35, rows(r), 0]} rad={0.05} />
        ))}
      </group>
      <group position={[g + inB, 0, 0]} rotation={[0, 0, -shake]}>
        <B w={1.0} h={3.0} d={1.8} c={C.b3} p={[1.6, 1.5, 0]} rad={0.08} />
        {[0, 2, 4, 6].map((r, n) => (
          <B key={r} w={1.7} h={RH} d={1.8} c={C.b3} p={[0.35, rows(r + inOut(prog(T, s + 8.7 + n * 0.09, s + 9.2 + n * 0.09))), 0]} rad={0.05} />
        ))}
      </group>
      {/* 結び: 一つになった塊から、成果物が並んで出る */}
      {[0, 1, 2].map((j) => {
        const k = E_SLAM(prog(T, s + 12.9 + j * 0.13, s + 13.45 + j * 0.13));
        return k > 0 ? <Tile key={j} p={[lerp(1.6, 2.9 + j * 0.64, k), 0.36, 0.3]} s={k} /> : null;
      })}
    </group>
  );
};

export const World: React.FC<{T: number; cam: CamS}> = ({T, cam}) => (
  <>
    <Rig T={T} cam={cam} />
    <SceneStack T={T} />
    <SceneStrip T={T} />
    <SceneCards T={T} />
    <SceneBars T={T} />
    <SceneFrame T={T} />
    <SceneWall T={T} />
    <ScenePage T={T} />
    <SceneComb T={T} />
  </>
);
