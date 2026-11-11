// 後半の場面の立体（街・部屋・客・額・人の手の帯）。どれも同じ質感（面＋墨の輪郭）。全体の時刻 T から決まる。
import React from 'react';
import {SX} from './cam';
import {C, clamp, hash, hashR, in3, inOut, kv, lerp, mix, out3, outBack, outExpo, prog, sstep} from './kit';
import {damped} from './lib/anim';
import {GEO, Sh} from './prims';
import {GH, L, LANE_Z} from './score';
import {S} from './timeline';

// ---- 06: 街（ゼロから作ると、並びがデタラメになる） ----
const NB = 13;
const bx = (slot: number) => -9.6 + slot * 1.32;
const City: React.FC<{T: number}> = ({T}) => {
  const t = L('06', T);
  if (t < 3.8 || t > 13.6) return null;
  const sink = 1 - in3(prog(t, 12.85, 13.2));
  const sh = Math.max(0, t - 10.2) / 0.8;
  const k0 = Math.floor(sh);
  const kf = inOut(clamp((sh - k0) * 1.6));
  const perm = (i: number, k: number) => (k <= 0 ? i : (i * 5 + k * 3 + (k % 2) * 4) % NB);
  const rows: React.ReactNode[] = [];
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < NB - row * 2; i++) {
      const id = row * 20 + i;
      const w = hashR(id * 3 + 1, 0.8, 1.15);
      const h = hashR(id * 3 + 2, 1.5, 3.5) * (row ? 1.2 : 1);
      const grow = outBack(prog(t, 4.3 + i * 0.13 + row * 0.25, 4.3 + i * 0.13 + row * 0.25 + 0.5)) * sink;
      if (grow <= 0.001) continue;
      const lieIdx = [1, 3, 4, 6, 8, 9, 11].indexOf(i);
      const lie = row === 0 && lieIdx >= 0;
      const m = lie ? outBack(prog(t, 5.7 + lieIdx * 0.22, 6.2 + lieIdx * 0.22)) : 0;
      const x = row === 0 ? lerp(bx(perm(i, k0)), bx(perm(i, k0 + 1)), kf) : bx(i) + 1.6 + 0.5 * Math.sin(sh * 0.9 + i);
      const hop = row === 0 && sh > 0 ? Math.sin(Math.PI * kf) * (0.5 + 0.9 * hash(i + k0 * 7)) : 0;
      const z = row === 0 ? -3 : -5.6;
      const kind = lieIdx % 4;
      // 嘘の建物: 浮く／逆さ／傾く／細長く伸びる
      const float = lie && kind === 0 ? m * (1.3 + 0.25 * Math.sin(t * 2.2 + i)) : 0;
      const rz = lie ? (kind === 1 ? Math.PI * m : kind === 2 ? 0.42 * m + 0.05 * m * Math.sin(t * 2 + i) : 0) : 0;
      const sx = lie && kind === 3 ? lerp(1, 0.45, m) : 1;
      const sy = lie && kind === 3 ? lerp(1, 1.4, m) : 1;
      const col = mix(C.cream, C.green, m * 0.92);
      const hh = h * grow * sy;
      const ww = w * sx;
      const nr = Math.max(2, Math.floor(h / 0.62));
      rows.push(
        <group key={id} position={[x, float + hop, z]}>
          <group position={[0, hh / 2, 0]} rotation={[0, 0, rz]}>
            <Sh s={[ww, hh, 0.85]} c={col} o={0.035} />
            {grow > 0.9
              ? Array.from({length: nr * 2}, (_, q) => {
                  const cxn = q % 2;
                  const r = Math.floor(q / 2);
                  return <Sh key={q} s={[ww * 0.22, 0.26 * sy, 0.02]} p={[(cxn - 0.5) * ww * 0.46, -hh / 2 + ((r + 0.7) / (nr + 0.4)) * hh, 0.43]} c={m > 0.5 ? '#0d5f31' : C.ink} o={0} flat />;
                })
              : null}
          </group>
        </group>,
      );
    }
  return <>{rows}</>;
};

// ---- 08: 部屋（任せきりでは隅が残る。仕上げは人） ----
export const RZ = 30; // 部屋の中心の奥行き
const RW = 9;
const RD = 6;
const FURN: [number, number, number, number][] = [
  [-2.7, RZ - 2.1, 1.5, 0.75], // ソファ（x, z, 半幅, 半奥行き）
  [2.4, RZ + 0.9, 0.8, 0.8], // 丸テーブル
  [3.7, RZ - 2.3, 0.45, 0.45], // 鉢
];
type Dust = {x: number; z: number; tRobot: number; group: number};
const LANES = 5;
const R0 = 0.7;
const LD = 0.56;
const lz = (k: number) => RZ - RD / 2 + 0.75 + (k * (RD - 1.5)) / (LANES - 1);
export function robotAt(t: number): {x: number; z: number} {
  const u = clamp((t - R0) / LD, 0, LANES - 0.001);
  const k = Math.floor(u);
  const f = u - k;
  const turn = sstep(f, 0.86, 1);
  const xa = k % 2 === 0 ? lerp(-3.7, 3.7, clamp(f / 0.86)) : lerp(3.7, -3.7, clamp(f / 0.86));
  return {x: xa, z: lerp(lz(k), lz(Math.min(LANES - 1, k + 1)), turn)};
}
const DUST: Dust[] = (() => {
  const out: Dust[] = [];
  const add = (x: number, z: number, group: number) => {
    const nearF = FURN.some(([fx, fz, hw, hd]) => Math.abs(x - fx) < hw + 0.42 && Math.abs(z - fz) < hd + 0.42);
    const inF = FURN.some(([fx, fz, hw, hd]) => Math.abs(x - fx) < hw + 0.05 && Math.abs(z - fz) < hd + 0.05);
    if (inF) return;
    const corner = Math.abs(x) > RW / 2 - 0.62 && Math.abs(z - RZ) > RD / 2 - 0.62;
    const reach = !nearF && !corner && Math.abs(x) < RW / 2 - 0.22 && Math.abs(z - RZ) < RD / 2 - 0.22;
    let tRobot = 1e9;
    if (reach) {
      let k = 0;
      for (let q = 1; q < LANES; q++) if (Math.abs(z - lz(q)) < Math.abs(z - lz(k))) k = q;
      const f = k % 2 === 0 ? (x + 3.7) / 7.4 : (3.7 - x) / 7.4;
      tRobot = R0 + (k + clamp(f) * 0.86) * LD;
    }
    out.push({x, z, tRobot, group: reach ? -1 : group});
  };
  for (let i = 0; i < 130; i++) add(hashR(i * 2 + 5, -RW / 2 + 0.15, RW / 2 - 0.15), RZ + hashR(i * 2 + 6, -RD / 2 + 0.15, RD / 2 - 0.15), 4);
  // 四隅と家具のまわりに溜まる
  const corners: [number, number][] = [
    [RW / 2, RZ + RD / 2],
    [-RW / 2, RZ + RD / 2],
    [-RW / 2, RZ - RD / 2],
    [RW / 2, RZ - RD / 2],
  ];
  corners.forEach(([cx, cz], c) => {
    for (let i = 0; i < 16; i++) add(cx - Math.sign(cx) * hashR(c * 40 + i, 0.12, 0.6), cz - Math.sign(cz - RZ) * hashR(c * 40 + i + 20, 0.12, 0.6), c);
  });
  return out.map((d) => {
    if (d.group !== 4) return d;
    // 残った一般の埃は、近い隅の組に入れる（人の手が回る順）
    let g = 0;
    let best = 1e9;
    corners.forEach(([cx, cz], c) => {
      const dd = Math.hypot(d.x - cx, d.z - cz);
      if (dd < best) {
        best = dd;
        g = c;
      }
    });
    return {...d, group: g};
  });
})();
// 人の手（墨の布）が回る: 5.2 秒から、隅を順に
const HAND_T0 = 5.25;
const HAND_STEP = 0.72;
const HAND_PTS: [number, number][] = [
  [RW / 2 - 0.5, RZ + RD / 2 - 0.5],
  [-RW / 2 + 0.5, RZ + RD / 2 - 0.5],
  [-RW / 2 + 0.5, RZ - RD / 2 + 0.5],
  [RW / 2 - 0.5, RZ - RD / 2 + 0.5],
];
export function handAt(t: number): {x: number; z: number; on: number} {
  const u = (t - HAND_T0) / HAND_STEP;
  if (u < -0.6) return {x: 7, z: RZ + 5, on: 0};
  const pts: [number, number][] = [[6.5, RZ + 4.5], ...HAND_PTS, [6.5, RZ - 4.5]];
  const i = clamp(Math.floor(u + 1), 0, pts.length - 2);
  const f = inOut(clamp((u + 1 - i) / 0.55));
  const wig = u + 1 - i > 0.55 ? Math.sin((u + 1 - i - 0.55) * 42) * 0.22 : 0;
  return {x: lerp(pts[i][0], pts[i + 1][0], f) + wig, z: lerp(pts[i][1], pts[i + 1][1], f) + wig * 0.6, on: clamp((u + 0.6) * 3) * (1 - prog(u, 4.3, 4.8))};
}
const Room: React.FC<{T: number}> = ({T}) => {
  const t = L('08', T);
  if (t < -0.1 || t > 9.9) return null;
  const rb = robotAt(t);
  const hd = handAt(t);
  const red = sstep(t, 2.6, 3.4);
  return (
    <group>
      <mesh geometry={GEO.plane} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, RZ]} scale={[RW, RD, 1]}>
        <meshBasicMaterial color={'#fbf8f1'} />
      </mesh>
      {/* 壁（低い縁） */}
      <Sh s={[RW + 0.24, 0.5, 0.12]} p={[0, 0.25, RZ - RD / 2 - 0.06]} c={C.cream} o={0.03} />
      <Sh s={[RW + 0.24, 0.5, 0.12]} p={[0, 0.25, RZ + RD / 2 + 0.06]} c={C.cream} o={0.03} />
      <Sh s={[0.12, 0.5, RD]} p={[-RW / 2 - 0.06, 0.25, RZ]} c={C.cream} o={0.03} />
      <Sh s={[0.12, 0.5, RD]} p={[RW / 2 + 0.06, 0.25, RZ]} c={C.cream} o={0.03} />
      {/* 家具 */}
      <Sh s={[3.0, 0.7, 1.5]} p={[-2.7, 0.35, RZ - 2.1]} c={'#e8e2d4'} o={0.035} />
      <Sh s={[3.0, 0.75, 0.4]} p={[-2.7, 1.0, RZ - 2.65]} c={'#e8e2d4'} o={0.035} />
      <Sh g="cyl" s={[0.8, 0.12, 0.8]} p={[2.4, 0.85, RZ + 0.9]} c={C.cream} o={0.035} />
      <Sh g="cyl" s={[0.12, 0.8, 0.12]} p={[2.4, 0.4, RZ + 0.9]} c={C.cream} o={0.03} />
      <Sh g="cyl" s={[0.4, 0.6, 0.4]} p={[3.7, 0.3, RZ - 2.3]} c={'#e8e2d4'} o={0.03} />
      <Sh g="sph" s={[0.62, 0.8, 0.62]} p={[3.7, 1.25, RZ - 2.3]} c={C.soda} o={0.035} />
      {/* 埃 */}
      {DUST.map((d, i) => {
        const gone = t > d.tRobot ? 1 : 0;
        const handT = d.group >= 0 && d.group < 4 ? HAND_T0 + d.group * HAND_STEP - 0.25 + hash(i) * 0.5 : 1e9;
        const k = gone ? 0 : 1 - clamp((t - handT) * 6);
        if (k <= 0.01) return null;
        const left = d.tRobot > 1e8;
        return <Sh key={i} g="cyl" s={[(left ? 0.085 + 0.045 * red : 0.085) * k, 0.03, (left ? 0.085 + 0.045 * red : 0.085) * k]} p={[d.x, 0.02, d.z]} c={left ? mix('#8a8073', C.bend, red) : '#8a8073'} o={0} flat />;
      })}
      {/* 任せた道具（青＝AI の側） */}
      <group position={[rb.x, 0, rb.z]}>
        <Sh g="cyl" s={[0.52, 0.24, 0.52]} p={[0, 0.13, 0]} c={C.blue} o={0.035} />
        <Sh g="cyl" s={[0.16, 0.03, 0.16]} p={[0, 0.27, 0]} c={C.white} o={0} flat />
      </group>
      {/* 人の手（墨の布） */}
      {hd.on > 0.01 ? <Sh s={[1.05 * hd.on, 0.1, 0.8 * hd.on]} p={[hd.x, 0.07, hd.z]} r={[0, 0.3 + Math.sin(t * 9) * 0.25, 0]} c={C.ink} o={0} /> : null}
    </group>
  );
};

// ---- 10: 客（点）。注文する人も多い。それでも、離れていく ----
export const COUNTER_H = 0.6;
const NC = 26;
export function ballAt(i: number, t: number): {x: number; y: number; z: number; s: number} {
  const r = 0.26;
  const gx = GH[0];
  // A: 遠くで跳ねる（厳しい反応）
  const ax = gx - 8.5 + hash(i * 3 + 1) * 4.6;
  const az = 1.4 + hash(i * 3 + 2) * 3.6;
  const hop = Math.abs(Math.sin(t * 7.5 + i * 1.7)) * 0.55 * (1 - sstep(t, 3.9, 4.5));
  // B: 列になって注文し、手前へ抜ける
  const j = i - Math.max(0, t - 5.6) * 1.7;
  const slot = (q: number): [number, number] => (q >= 0 ? [gx - 1.45 - q * 0.62, 1.75 + 0.5 * Math.sin(q * 0.55)] : [gx - 1.45 + q * 0.5, 1.75 - q * 0.95]);
  const [qx, qz] = slot(j);
  const kb = inOut(prog(t, 4.3 + i * 0.06, 5.2 + i * 0.06));
  let x = lerp(ax, qx, kb);
  let z = lerp(az, qz, kb);
  let y = r + hop + 0.06 * Math.abs(Math.sin(t * 5 + i)) * kb;
  // C: 離れていく（右へ転がり去る）
  const tl = 10.3 + ((i * 7) % NC) * 0.085;
  const kc = Math.max(0, t - tl);
  x += kc * kc * 9 + kc * 1.5;
  z += kc * kc * 1.6 * (hash(i) - 0.3);
  y += 0.25 * damped(t, tl, 1, 2.5, 4);
  const s = j < -4.5 && kc <= 0 ? clamp(1 - (-4.5 - j)) : 1;
  return {x, y, z, s: s * outBack(prog(t, 0.25 + i * 0.02, 0.6 + i * 0.02))};
}
const Crowd: React.FC<{T: number}> = ({T}) => {
  const t = L('10', T);
  if (t < -0.1 || t > 17.2) return null;
  const k = outExpo(prog(t, 0.1, 0.7));
  const maker = outBack(prog(t, 14.0, 14.5));
  return (
    <group>
      <Sh s={[2.8, COUNTER_H * k, 2.0]} p={[GH[0], (COUNTER_H * k) / 2, GH[2]]} c={C.cream} o={0.035} />
      {Array.from({length: NC}, (_, i) => {
        const b = ballAt(i, t);
        if (b.s <= 0.01 || b.x > GH[0] + 22) return null;
        return <Sh key={i} g="sph" s={[0.26 * b.s, 0.26 * b.s, 0.26 * b.s]} p={[b.x, b.y, b.z]} c={i % 5 === 2 ? '#8d867b' : C.ink} o={0} />;
      })}
      {/* 作り手（墨の四角＝人の側） */}
      {maker > 0.01 ? <Sh s={[0.62 * maker, 0.62 * maker, 0.62 * maker]} p={[GH[0] + 2.3, 0.31 * maker, GH[2] + 0.6]} r={[0, 0.5 + t * 0.4, 0]} c={C.ink} o={0} /> : null}
    </group>
  );
};

// ---- 11: 額（そこに行って切った一枚と、置き換えた一枚） ----
export const FZ = -30;
const Frames: React.FC<{T: number}> = ({T}) => {
  const t = L('11', T);
  if (t < -0.1 || t > 8.2) return null;
  const up = (d: number) => outBack(prog(t, 0.15 + d, 0.7 + d));
  const fall = in3(prog(t, 3.3, 4.0));
  const wob = 1 + 0.05 * Math.sin(t * 6);
  const tip = inOut(prog(t, 7.15, 7.6));
  const frame = (x: number, k: number, real: boolean) => (
    <group position={[x, 0, FZ]} rotation={[real ? -tip * 1.45 : -fall * 1.52, real ? 0.12 : -0.12, 0]} scale={[k, k * (real ? 1 : 1 - fall * 0.2), k]}>
      <group position={[0, 1.55, 0]}>
        <Sh s={[3.5, 2.6, 0.16]} c={C.ink} o={0} flat />
        <Sh s={[3.1 * (real ? 1 : wob), 2.2 * (real ? 1 : 2 - wob), 0.04]} p={[0, 0, 0.09]} c={real ? '#fdfbf5' : C.green} o={0} flat={!real} />
        {real ? (
          <>
            <Sh s={[3.1, 0.035, 0.02]} p={[0, -0.35, 0.12]} c={C.ink} o={0} flat />
            <Sh g="cyl" s={[0.34, 0.02, 0.34]} p={[0.7, 0.32, 0.12]} r={[Math.PI / 2, 0, 0]} c={C.gold} o={0.03} flat />
            <Sh s={[1.5, 0.03, 0.02]} p={[-0.7, -0.62, 0.12]} c={'#8d867b'} o={0} flat />
            <Sh s={[0.9, 0.03, 0.02]} p={[0.4, -0.8, 0.12]} c={'#8d867b'} o={0} flat />
          </>
        ) : (
          <>
            <Sh g="sph" s={[0.5, 0.16, 0.02]} p={[-0.6, 0.55, 0.12]} r={[0, 0, 0.3]} c={C.white} o={0} flat op={0.8} />
            <Sh g="sph" s={[0.22, 0.08, 0.02]} p={[0.5, 0.2, 0.12]} r={[0, 0, 0.3]} c={C.white} o={0} flat op={0.8} />
            <Sh s={[3.1, 0.035, 0.02]} p={[0, -0.3 + 0.12 * Math.sin(t * 5), 0.12]} r={[0, 0, 0.06 * Math.sin(t * 4)]} c={'#0d5f31'} o={0} flat />
          </>
        )}
      </group>
    </group>
  );
  return (
    <>
      {frame(-2.4, up(0), true)}
      {fall < 1 ? frame(2.4, up(0.12), false) : null}
    </>
  );
};

// ---- 12: 人の手の帯（90〜100）と、できあがった 0〜100 ----
export function handBlockAt(T: number): {y: number; k: number} {
  const t = L('12', T);
  if (t < 2.3) return {y: 9, k: 0};
  const f = prog(t, 2.3, 2.75);
  return {y: (1 - f * f) * 7 + 0.14 * Math.abs(damped(t, 2.75, 1, 3.4, 5)), k: 1};
}
const Final: React.FC<{T: number}> = ({T}) => {
  const t = L('12', T);
  if (t < -0.2) return null;
  const hb = handBlockAt(T);
  const k = outExpo(prog(t, 0.0, 0.5));
  const bar = (a: number, b: number, col: string, lift = 0) => {
    const w = SX(b) - SX(a);
    return <Sh s={[w * k, 0.2, 0.5]} p={[SX(a) + (w * k) / 2, 0.1 + lift, LANE_Z]} c={col} o={0.022} />;
  };
  const w = SX(90) - SX(70);
  const f = (T * 0.4) % 1;
  return (
    <group>
      {bar(0, 70, C.ink)}
      {bar(70, 90, C.blue)}
      {hb.k > 0 ? <Sh s={[SX(100) - SX(90), 0.2, 0.5]} p={[SX(95), 0.1 + hb.y, LANE_Z]} c={C.ink} o={0.022} /> : null}
      <mesh geometry={GEO.plane} rotation={[-Math.PI / 2, 0, 0]} position={[SX(80), 0.006, -0.9]} scale={[w * k, 3.4, 1]}>
        <meshBasicMaterial color={C.gold} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <mesh geometry={GEO.plane} rotation={[-Math.PI / 2, 0, 0]} position={[SX(70) + w * f, 0.008, -0.9]} scale={[0.5, 3.4, 1]}>
        <meshBasicMaterial color={'#ffe9a8'} transparent opacity={0.55 * Math.sin(Math.PI * f) * k} depthWrite={false} />
      </mesh>
    </group>
  );
};

export const SetsB: React.FC<{T: number}> = ({T}) => (
  <>
    {T >= S['06'] && T < S['07'] + 0.5 ? <City T={T} /> : null}
    {T >= S['08'] - 0.1 && T < S['09'] + 0.3 ? <Room T={T} /> : null}
    {T >= S['10'] - 0.1 && T < S['11'] + 0.3 ? <Crowd T={T} /> : null}
    {T >= S['11'] - 0.1 && T < S['12'] + 0.6 ? <Frames T={T} /> : null}
    {T >= S['12'] - 0.2 ? <Final T={T} /> : null}
  </>
);
export const _s = [kv, out3];
