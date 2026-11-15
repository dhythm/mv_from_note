// 図の層（three.js）。輪・線・面・層。光源は使わず、色は指定どおりに出る。
// 配置は画面の px（1920×1080）で書き、score.ts の wx / wy で世界座標へ直す。どれも時刻 T から毎フレーム同じ形になる。
import React from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {CamS, V3, applyCam} from './cam';
import {C, E_PUSH, E_SLAM, clamp, hash, hashR, inOut, lerp, mix, out3, outBack, outExpo, prog} from './kit';
import {DUR, O, ROW3, S, U, lineY7, rows3, wx, wy} from './score';

type P = {T: number};
const PLANE = new THREE.PlaneGeometry(1, 1);
const BOX = new THREE.BoxGeometry(1, 1, 1);

// 平らな四角（px）。重なりは ro の順
const Rc: React.FC<{o: V3; x: number; y: number; w: number; h: number; c: string; op?: number; z?: number; ro?: number}> = ({o, x, y, w, h, c, op = 1, z = 0, ro = 1}) => {
  if (w <= 0.2 || h <= 0.2 || op <= 0.004) return null;
  return (
    <mesh geometry={PLANE} position={[o[0] + wx(x + w / 2), o[1] + wy(y + h / 2), o[2] + z]} scale={[w / U, h / U, 1]} renderOrder={ro}>
      <meshBasicMaterial color={c} transparent opacity={op} depthTest={false} toneMapped={false} />
    </mesh>
  );
};

// 輪（世界の単位）。len < 2π で、上から時計回りに描き終わる
const Ring: React.FC<{o: V3; r: number; th: number; c: string; op?: number; len?: number; z?: number; ro?: number}> = ({o, r, th, c, op = 1, len = Math.PI * 2, z = 0, ro = 1}) => {
  if (r <= th || op <= 0.004 || len <= 0.001) return null;
  return (
    <mesh position={[o[0], o[1], o[2] + z]} renderOrder={ro}>
      <ringGeometry args={[r - th / 2, r + th / 2, 160, 1, Math.PI / 2 - len, len]} />
      <meshBasicMaterial color={c} transparent opacity={op} depthTest={false} toneMapped={false} side={THREE.DoubleSide} />
    </mesh>
  );
};

// 厚みのある層（px。奥行き d は世界の単位）。上の面は少し明るい
const Slab: React.FC<{o: V3; x: number; y: number; w: number; h: number; d?: number; c: string}> = ({o, x, y, w, h, d = 1.1, c}) => {
  if (w <= 0.5 || h <= 0.5) return null;
  const p: V3 = [o[0] + wx(x + w / 2), o[1] + wy(y + h / 2), o[2]];
  return (
    <group position={p}>
      <mesh geometry={BOX} scale={[w / U, h / U, d]}>
        <meshBasicMaterial color={c} toneMapped={false} />
      </mesh>
      <mesh geometry={PLANE} position={[0, h / U / 2 + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={[w / U, d, 1]}>
        <meshBasicMaterial color={mix(c, '#ffffff', 0.28)} toneMapped={false} />
      </mesh>
    </group>
  );
};

// ---- 02: 「誰でも」の範囲が広がり続け、基礎の輪で止まる ----
export const SCOPE = [
  {t0: 0.5, r: 1.75, ang: 90, label: '経験者？'},
  {t0: 1.5, r: 3.0, ang: -25, label: '来たばかりの人？'},
  {t0: 4.7, r: 4.55, ang: 200, label: '中学生まで？'},
];
export const STOP2 = {a: 11.9, b: 12.5, r: 3.0};
// 範囲の輪の半径（声の語で出て、ゆっくり広がり、「前提が変われば」から外へ逃げる）
export function scopeR(i: number, t: number) {
  const s = SCOPE[i];
  const born = outExpo(prog(t, s.t0, s.t0 + 0.7));
  const slow = 1 + 0.035 * Math.max(0, t - s.t0);
  const k = prog(t, 6.6, 10.4);
  return s.r * born * slow * (1 + 3.6 * k * k);
}
const W02: React.FC<P> = ({T}) => {
  const t = T - S['02'];
  const o = O.c2;
  // 奥から手前へ流れる輪（近いほど大きく、速く動く）。止まる輪が描かれると消える
  const N = 12;
  const span = 52;
  const flow = Math.min(t, STOP2.a) * 7.5 + 7.5 * 0.4 * (1 - Math.pow(1 - prog(t, STOP2.a, STOP2.a + 0.8), 2));
  const gate = prog(t, -0.35, 0.4) * (1 - prog(t, STOP2.a, STOP2.a + 0.5));
  const depth = [];
  for (let j = 0; j < N; j++) {
    const u = (((flow + (j * span) / N) % span) + span) % span; // 0（奥）→ span（手前）
    const z = -span + u;
    const op = gate * clamp(u / 9) * clamp((span - u) / 4) * 0.55;
    depth.push(<Ring key={j} o={o} r={7.6} th={0.05} c={C.gray2} op={op} z={z} />);
  }
  const stop = inOut(prog(t, STOP2.a, STOP2.b));
  return (
    <>
      {depth}
      {SCOPE.map((s, i) => (
        <Ring key={`s${i}`} o={o} r={scopeR(i, t)} th={0.075} c={C.gray} op={t < s.t0 ? 0 : 0.95} ro={2} />
      ))}
      {/* 止まった範囲のすぐ内側に残る灰の輪と、基礎の輪 */}
      <Ring o={o} r={STOP2.r - 0.2} th={0.05} c={C.gray2} op={prog(t, STOP2.b - 0.1, STOP2.b + 0.3)} ro={2} />
      <Ring o={o} r={STOP2.r} th={0.17} c={C.indigo} len={Math.PI * 2 * stop} ro={3} />
    </>
  );
};

// ---- 03: 手順を短くする → 前提がないと細かくなり続ける → 基準線で止まる ----
export const BARS3 = {x: 130, y: 250, pitch: 90, h: 44, w0: 700, w: [560, 440, 340, 250]};
export const LINE3 = {x: 130, y: 640, w: 1660, h: 10, t0: 8.55};
export const HARD3 = {x: 130, y: 150, h: 44, w: 760, t0: 9.3};
const W03: React.FC<P> = ({T}) => {
  const t = T - S['03'];
  const o = O.c3;
  const n = rows3(t);
  const gone = prog(t, ROW3.b + 0.05, ROW3.back);
  const rows = [];
  for (let j = 0; j < ROW3.n && j < n; j++) {
    const y = ROW3.y0 + j * ROW3.pitch + gone * 500;
    const cnt = 2 + Math.floor(hash(j * 3.1) * 4);
    const kin = outExpo(clamp((n - j) / 2.5));
    let x = BARS3.x;
    for (let d = 0; d < cnt; d++) {
      const w = hashR(j * 17 + d * 5, 70, 260);
      rows.push(<Rc key={`${j}-${d}`} o={o} x={x} y={y} w={w * kin} h={20} c={C.green} op={(1 - gone) * 0.9} />);
      x += w + 22;
    }
  }
  const hk = outExpo(prog(t, HARD3.t0, HARD3.t0 + 0.6));
  const hardW = HARD3.w * hk - 70 * (inOut(prog(t, 10.1, 10.5)) - inOut(prog(t, 10.6, 11.0)));
  return (
    <>
      {BARS3.w.map((w, i) => {
        const draw = outExpo(prog(t, 0.35 + i * 0.12, 0.95 + i * 0.12));
        const sh = inOut(prog(t, 1.5 + i * 0.16, 2.2 + i * 0.16));
        return <Rc key={i} o={o} x={BARS3.x} y={BARS3.y + i * BARS3.pitch} w={lerp(BARS3.w0, w, sh) * draw} h={BARS3.h} c={C.green} ro={2} />;
      })}
      {rows}
      <Rc o={o} x={LINE3.x} y={LINE3.y} w={LINE3.w * outExpo(prog(t, LINE3.t0, LINE3.t0 + 0.5))} h={LINE3.h} c={C.indigo} ro={3} />
      {/* まだ簡単に解けない問題: 短くしようとしても、長いまま */}
      <Rc o={o} x={HARD3.x} y={HARD3.y} w={hardW} h={HARD3.h} c={C.gray2} ro={2} />
    </>
  );
};

// ---- 05: 手順はすぐ渡る。経験の層は、人によって違う速さで厚くなる ----
export const COL5 = {x: [300, 700, 1100], w: 300, base: 940, n: [3, 6, 9], pitch: 38, h: 30, a: 8.8, b: 14.2, arrive: 3.9};
export function lift5(k: number, t: number) {
  let s = 0;
  for (let m = 0; m < COL5.n[k]; m++) {
    const tm = COL5.a + ((COL5.b - COL5.a) * (m + 0.3)) / COL5.n[k];
    s += out3(prog(t, tm, tm + 0.3));
  }
  return s;
}
const W05: React.FC<P> = ({T}) => {
  const t = T - S['05'];
  const o = O.c5;
  const out: React.ReactNode[] = [];
  COL5.x.forEach((x, k) => {
    const ta = COL5.arrive + (2 - k) * 0.22;
    const slide = -2300 * (1 - E_SLAM(prog(t, ta, ta + 0.8)));
    const lift = lift5(k, t) * COL5.pitch;
    if (t >= ta)
      [300, 240, 180].forEach((w, i) => {
        out.push(<Slab key={`g${k}-${i}`} o={o} x={x + slide} y={COL5.base - 106 + i * 40 - lift} w={w} h={26} c={C.green} />);
      });
    for (let m = 0; m < COL5.n[k]; m++) {
      const tm = COL5.a + ((COL5.b - COL5.a) * (m + 0.3)) / COL5.n[k];
      const g = outExpo(prog(t, tm, tm + 0.35));
      const w = COL5.w * g;
      out.push(<Slab key={`c${k}-${m}`} o={o} x={x + (COL5.w - w) / 2} y={COL5.base - COL5.h - m * COL5.pitch} w={w} h={COL5.h} c={m % 2 ? C.clay2 : C.clay} />);
    }
  });
  return <>{out}</>;
};

// ---- 06 → 07: 端の見えない線 → 括った区間 → 同じ線が基準線になる ----
export const SEG6 = {y: 620, a: 620, b: 1300, shrink: [7.5, 9.6], mark: 9.84};
export const BASE7 = {a: 130, b: 1790};
const W0607: React.FC<P> = ({T}) => {
  const t = T - S['06'];
  const t7 = T - S['07'];
  const o = O.c6;
  const sh = inOut(prog(t, SEG6.shrink[0], SEG6.shrink[1]));
  const to7 = inOut(prog(t7, -0.2, 0.45));
  const a = lerp(lerp(-5200, SEG6.a, sh), BASE7.a, to7);
  const b = lerp(lerp(6400, SEG6.b, sh), BASE7.b, to7);
  const y = t7 < 0 ? SEG6.y : lerp(SEG6.y, lineY7(t7), inOut(prog(t7, 0, 0.5)));
  const mk = outExpo(prog(t, SEG6.mark, SEG6.mark + 0.35)) * (1 - prog(t7, -0.35, -0.05));
  const col = mix(C.gray2, C.indigo, prog(t, SEG6.mark, SEG6.mark + 0.3));
  const ticks = [];
  for (let x = -4950; x < 6400; x += 150) {
    if (x < a + 20 || x > b - 20 || (x > SEG6.a && x < SEG6.b)) continue;
    ticks.push(<Rc key={x} o={o} x={x - 3} y={SEG6.y - 34} w={6} h={28} c={C.gray2} op={0.8 * (1 - sh)} />);
  }
  const fill = 1 - prog(t7, -0.45, -0.15);
  const g = outBack(prog(t, 11.0, 11.4)) * fill;
  const ghost = prog(t7, 9.1, 9.6);
  const dash = [];
  if (ghost > 0) for (let x = BASE7.a; x < BASE7.b; x += 84) dash.push(<Rc key={x} o={o} x={x} y={757} w={42} h={6} c={C.gray2} op={0.55 * ghost} />);
  return (
    <>
      {ticks}
      {dash}
      <Rc o={o} x={a} y={y - 7} w={b - a} h={14} c={col} ro={2} />
      {[SEG6.a, SEG6.b].map((x) => (
        <Rc key={x} o={o} x={x - 6} y={SEG6.y - 46 * mk} w={12} h={92 * mk} c={C.indigo} ro={3} />
      ))}
      {/* 範囲が決まると、中身（手順）も時間（層）も具体的になる */}
      {[200, 160, 120].map((w, i) => (
        <Rc key={`g${i}`} o={o} x={700} y={488 + i * 32} w={w * g} h={20} c={C.green} />
      ))}
      {[0, 1, 2].map((m) => {
        const gk = outBack(prog(t, 11.6 + m * 0.22, 11.95 + m * 0.22)) * fill;
        return <Rc key={`c${m}`} o={o} x={1020 + 100 * (1 - gk)} y={552 - m * 32} w={200 * gk} h={24} c={m % 2 ? C.clay2 : C.clay} />;
      })}
    </>
  );
};

// ---- 08: 技術の面と、業務の知識の面が、一つの基礎になる ----
export const PL8 = {gray: {x: 150, y: 200, w: 450, h: 240}, ind: {x: 150, y: 520, w: 610, h: 340}, one: {x: 150, y: 300, w: 560, h: 460}, merge: [5.1, 6.8], line: 10.9};
const W08: React.FC<P> = ({T}) => {
  const t = T - S['08'];
  const t9 = T - S['09'];
  const o = O.c8;
  const m = inOut(prog(t, PL8.merge[0], PL8.merge[1]));
  const gin = outExpo(prog(t, 0.45, 1.1));
  const iin = E_SLAM(prog(t, 2.55, 3.05));
  const sp = E_PUSH(prog(t9, -0.3, 0.4));
  const g = PL8.gray;
  const d = PL8.ind;
  const e = PL8.one;
  const share = out3(prog(t, PL8.line, PL8.line + 0.7)) * (1 - prog(t9, -0.3, 0));
  const lk = outExpo(prog(t, PL8.line, PL8.line + 0.5)) * (1 - prog(t9, -0.3, -0.05));
  if (m >= 1) {
    // 一つになった面。共有される写しが後ろに開き、最後は左右に割れて 09 へ
    return (
      <>
        {[2, 1].map((i) => (
          <Rc key={i} o={o} x={e.x - 38 * i * share} y={e.y - 38 * i * share} w={e.w} h={e.h} c={mix(C.indigo, C.paper, 0.4 + i * 0.17)} op={share > 0 ? 1 : 0} ro={1} />
        ))}
        <Rc o={o} x={e.x - 1500 * sp} y={e.y} w={e.w / 2 + 1} h={e.h} c={C.indigo} ro={2} />
        <Rc o={o} x={e.x + e.w / 2 + 2100 * sp} y={e.y} w={e.w / 2} h={e.h} c={C.indigo} ro={2} />
        <Rc o={o} x={e.x + e.w} y={536} w={(900 - e.x - e.w) * lk} h={8} c={C.indigo} ro={2} />
      </>
    );
  }
  return (
    <>
      <Rc o={o} x={lerp(g.x - 900 * (1 - gin), e.x, m)} y={lerp(g.y, e.y, m)} w={lerp(g.w, e.w, m)} h={lerp(g.h, e.h * 0.5, m)} c={mix(C.gray2, C.indigo, m)} ro={1} />
      <Rc o={o} x={lerp(d.x, e.x, m)} y={lerp(d.y + 800 * (1 - iin), e.y, m)} w={lerp(d.w, e.w, m)} h={lerp(d.h, e.h, m)} c={C.indigo} op={t < 2.55 ? 0 : 1} ro={2} />
    </>
  );
};

// ---- 09: 両立の線と、02 で止まった範囲の小さな輪 ----
export const RING9 = {x: 850, y: 878, r: 30};
const W09: React.FC<P> = ({T}) => {
  const t = T - S['09'];
  const o = O.c8;
  const k = outExpo(prog(t, 5.3, 5.9)) * (1 - inOut(prog(t, 6.3, 6.9)));
  const w = 1640 * k;
  return (
    <>
      <Rc o={o} x={960 - w / 2} y={640} w={w} h={10} c={C.indigo} />
      <Ring o={[o[0] + wx(RING9.x), o[1] + wy(RING9.y), o[2]]} r={RING9.r / U} th={7 / U} c={C.indigo} len={Math.PI * 2 * inOut(prog(t, 11.1, 11.8))} />
    </>
  );
};

const Rig: React.FC<{cam: CamS}> = ({cam}) => {
  const {camera} = useThree();
  applyCam(camera as THREE.PerspectiveCamera, cam);
  return null;
};

export const World: React.FC<{T: number; cam: CamS}> = ({T, cam}) => {
  const on = (a: string, b: string, pre = 0.5, post = 0.5) => T > S[a] - pre && T < S[b] + DUR[b] + post;
  return (
    <>
      <Rig cam={cam} />
      {on('02', '02') ? <W02 T={T} /> : null}
      {on('03', '03') ? <W03 T={T} /> : null}
      {on('05', '05') ? <W05 T={T} /> : null}
      {on('06', '07') ? <W0607 T={T} /> : null}
      {on('08', '08', 0.5, 0.6) ? <W08 T={T} /> : null}
      {on('09', '09', 0, 0.6) ? <W09 T={T} /> : null}
    </>
  );
};
