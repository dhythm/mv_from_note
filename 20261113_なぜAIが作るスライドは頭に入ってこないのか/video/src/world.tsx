// 図の層（three.js）。一つの空間に、文章面・手元の資料・実物の一覧・読む線と語りの経路・話題の面が並び、一台のカメラが渡っていく。
// 灰の横線＝文章量、墨の短い線＝画面に残す要点、青い経路＝自分の声で運ぶ語り。すべて全体の時刻 T から決まる。
import React from 'react';
import {useThree} from '@react-three/fiber';
import * as THREE from 'three';
import {CamS, V3, applyCam, camAt} from './cam';
import {C, E_SLAM, E_WHIP, clamp, hashR, in3, inOut, lerp, mix, out3, outBack, outExpo, prog, sstep, wobble} from './kit';
import {Bar, BarC, Bars, Frame, HTH, M, PITCH, Pic, Rect, Ribbon, Shadow, Sheet, TH, centered, layout, lerpBars, rounded, PLANE} from './parts';
import {CAM, O, PAGE, ROWS7, S, TILE, TRACE7, add, l3, pagePose} from './score';

export type Tex = {ovCP: THREE.Texture; ovGP: THREE.Texture; ovCD: THREE.Texture; ovGD: THREE.Texture; pagePres: THREE.Texture; pageDoc: THREE.Texture};
type P = {T: number; cam: CamS; tex: Tex};
const range = (n: number) => Array.from({length: n}, (_, i) => i);
const aspect = (t: THREE.Texture) => (t.image as HTMLImageElement).height / (t.image as HTMLImageElement).width;

// 中身を線で持つ紙面（中身が組み替わるもの）
const Paper: React.FC<{p: V3; w: number; h: number; r?: V3; s?: number; op?: number; bars: Bar[]; barOp?: number; shadow?: number; children?: React.ReactNode}> = ({p, w, h, r = [0, 0, 0], s = 1, op = 1, bars, barOp = 1, shadow = 1, children}) =>
  op <= 0.004 ? null : (
    <group position={p} rotation={r} scale={[s, s, s]}>
      <Shadow w={w} h={h} op={op * shadow} />
      <Rect p={[0, 0, 0]} w={w} h={h} c={C.sheet} op={op} />
      <Rect p={[0, 0, -0.004]} w={w + 0.05} h={h + 0.05} c={C.edge} op={op} />
      {barOp > 0.01 ? <Bars items={centered(bars, w, h).map((b) => ({...b, op: op * barOp}))} /> : null}
      {children}
    </group>
  );

// 詰まった紙面 A（wA×hA）→ 縦の紙面 B（wB×hB、詰まったまま）→ 同じ紙面で見出しごとに整理した C。線の本数は同じ
function docSet(wA: number, hA: number, wB: number, hB: number, seed: number, n: number) {
  const N = 3 * (n + 1);
  const fit = (src: Bar[]): Bar[] => range(N).map((i) => src[i] ?? {...src[src.length - 1], w: 0});
  const A = fit(layout('dense', wA, hA, seed));
  const B = fit(layout('dense', wB, hB, seed + 1));
  const iw = wB - M * 2;
  const gap = 0.32;
  const pitch = Math.min(PITCH, (hB - M * 2 - 3 * (HTH + 0.2) - 2 * gap) / (3 * n));
  const Cc: Bar[] = [];
  let y = M;
  for (let g = 0; g < 3; g++) {
    Cc.push({x: M, y, w: iw * hashR(seed + g * 5, 0.3, 0.5), h: HTH, c: C.ink});
    y += HTH + 0.2;
    for (let i = 0; i < n; i++) {
      const ind = [0, 0.1, 0.2][i % 3];
      Cc.push({x: M + ind, y, w: (iw - ind) * hashR(seed * 13 + g * 10 + i, 0.72, 1), h: TH, c: C.line});
      y += pitch;
    }
    y += gap;
  }
  return {A, B, C: Cc, nA: Math.min(N, layout('dense', wA, hA, seed).length)};
}
// A → B: もとからある線は移り、足りない分は B の位置で上から順に書かれていく
function grow(set: {A: Bar[]; B: Bar[]; nA: number}, k: number): Bar[] {
  const N = set.A.length;
  const moved = lerpBars(set.A, set.B, k);
  return moved.map((m, i) => {
    if (i < set.nA) return m;
    const f = clamp((k * (N - set.nA + 4) - (i - set.nA)) / 4);
    return {...set.B[i], w: set.B[i].w * out3(f)};
  });
}

// ---------------- 01–02 文章面が迫り、左右に開く ----------------
const C0102: React.FC<P> = ({T}) => {
  const t2 = T - S['02'];
  if (t2 > 10.4) return null;
  const base = camAt(Math.min(T, S['02'] + 9.75), CAM, 0).p;
  const cardIn = outExpo(prog(t2, 4.3, 4.95));
  const cd: V3 = [base[0] - 5.2 - (1 - cardIn) * 9 + Math.max(0, t2 - 4.3) * 0.1, base[1] - 3.0, base[2] - 15];
  const rk = out3(prog(t2, 6.1, 7.7));
  const rpts: V3[] = (
    [
      [1.3, 0],
      [3.7, -0.5],
      [6.4, 0.3],
      [9.0, -0.4],
      [11.8, 0.4],
      [15, 0.1],
    ] as [number, number][]
  ).map(([x, y], i) => [cd[0] + x, cd[1] + y + (i > 0 ? 0.16 * wobble(T, i * 3, 2.6) : 0), cd[2]]);
  return (
    <>
      {t2 < 4
        ? range(6).map((i) => {
            const a = 0.3 + (5 - i) * 0.6;
            if (T < a) return null;
            const k = outExpo(prog(T, a, a + 0.9));
            const zf = -i * 1.6;
            const bottom = 0.55 + i * 0.45;
            const creep = Math.max(0, T - a - 0.9);
            const z = lerp(zf - 60 - i * 6, zf, k) + Math.min(1.3, creep * 0.2);
            const y = lerp(bottom + 4.6 + 7, bottom + 4.6, k) - Math.min(0.55, creep * 0.075);
            const open = inOut(prog(t2, -0.78 + i * 0.05, 1.15 + i * 0.08));
            const off = open * (8 + (5 - i) * 2.4);
            const rz = (1 - k) * hashR(i, -0.12, 0.12);
            return [-1, 1].map((sd) => <Sheet key={`${i}${sd}`} p={[sd * (4.15 + off), y, z]} w={8.2} h={9.2} kind={i % 2 ? 'dense' : 'wall'} seed={i * 2 + (sd > 0 ? 1 : 0) + 1} r={[0, -sd * open * 0.5, rz * sd]} />);
          })
        : null}
      {/* 開いた先に並ぶ紙面（近づくと現れ、両脇を流れていく） */}
      {t2 > -0.3
        ? range(15).map((j) => {
            const sd = j % 2 ? 1 : -1;
            const z = -17 - j * 6.2;
            const d = base[2] - z;
            if (d < -1) return null;
            const op = 1 - prog(d, 22, 34);
            return <Sheet key={j} p={[sd * (11 + hashR(j, 0, 2)), hashR(j + 50, -1.4, 3.4), z]} w={5} h={7} kind={(['dense', 'wall', 'doc'] as const)[j % 3]} seed={j + 20} r={[0, -sd * 0.7, hashR(j + 9, -0.05, 0.05)]} op={op} />;
          })
        : null}
      {/* 画面に残す要点（小さな面）と、自分の言葉（青い経路） */}
      {t2 > 4.3 ? <Sheet p={cd} w={2.5} h={1.6} kind="point" seed={3} /> : null}
      {t2 > 6.1 ? <Ribbon pts={rpts} k1={rk} width={0.13} /> : null}
    </>
  );
};

// ---------------- 03 足されていく文章面、残す一枚 ----------------
const PILE = (i: number): V3 => [-2.0 + i * 0.55, -0.6 - i * 0.18, i * 0.3];
const DROP3 = [0, 1.2, 1.7, 2.15, 2.55, 2.9, 3.2];
const KEEP = 3;
function pile3(t: number, i: number): {p: V3; rz: number} {
  const f = PILE(i);
  if (i === 0) {
    const k = E_WHIP(prog(t, -0.7, 0.42));
    return {p: [f[0] - (1 - k) * 46, f[1] + (1 - k) * 1.2, f[2]], rz: (1 - k) * -0.2};
  }
  const k = E_SLAM(prog(t, DROP3[i], DROP3[i] + 0.5));
  return {p: [f[0] + (1 - k) * hashR(i, -1.5, 1.5), f[1] + (1 - k) * 11, f[2]], rz: lerp(hashR(i + 3, -0.3, 0.3), hashR(i + 7, -0.035, 0.035), k)};
}
const C03: React.FC<P> = ({T}) => {
  const t = T - S['03'];
  if (t < -0.8 || t > 9.6) return null;
  return (
    <>
      {range(7).map((i) => {
        if (i === KEEP || (i > 0 && t < DROP3[i])) return null;
        const {p, rz} = pile3(t, i);
        const rank = i > KEEP ? i - 1 : i;
        const k = inOut(prog(t, 5.1 + rank * 0.06, 6.1 + rank * 0.06));
        const away: V3 = [4.4 + rank * 1.05, -1.3 + rank * 0.14, -3 - rank * 1.7];
        const x = in3(prog(t, 7.9 + rank * 0.03, 8.8));
        const q = l3(p, away, k);
        return <Sheet key={i} p={add(O.c3, q[0] + x * 30, q[1], q[2])} w={9} h={4.4} kind="dense" seed={i + 40} r={[0, -k * 0.25, rz]} op={lerp(1, 0.72, k)} />;
      })}
    </>
  );
};

// ---------------- 03 → 04 → 05 残した一枚が、手元の資料になり、一覧の台紙になる ----------------
const DOC = docSet(9, 4.4, 5.8, 8.2, KEEP + 40, 8);
type DocKey = {at: number; p: V3; r: V3; w: number; h: number; e?: (k: number) => number};
const DOCK: DocKey[] = [
  {at: S['03'] + 5.1, p: add(O.c3, ...PILE(KEEP)), r: [0, 0, hashR(KEEP + 7, -0.035, 0.035)], w: 9, h: 4.4},
  {at: S['03'] + 6.3, p: add(O.c3, -2.4, -1.1, 2.0), r: [0, 0.1, 0], w: 9, h: 4.4},
  {at: S['03'] + 7.9, p: add(O.c3, -2.1, -1.05, 2.3), r: [0, 0.16, 0], w: 9, h: 4.4, e: (k) => k},
  {at: S['04'] + 0.9, p: add(O.c4, -4.7, -2.0, 1.2), r: [-0.55, 0.5, -0.14], w: 5.8, h: 8.2},
  {at: S['04'] + 5.1, p: add(O.c4, -4.4, -1.8, 1.5), r: [-0.5, 0.36, -0.1], w: 5.8, h: 8.2, e: (k) => k},
  {at: S['04'] + 6.5, p: add(O.c4, -4.9, -0.2, -1.6), r: [-0.16, 0.24, -0.03], w: 5.8, h: 8.2, e: out3},
  {at: S['04'] + 7.85, p: add(O.c4, -4.7, -0.15, -1.3), r: [-0.12, 0.16, -0.02], w: 5.8, h: 8.2, e: (k) => k},
  {at: S['05'] + 0.45, p: add(O.c5, 0, -0.35, -0.15), r: [0, 0, 0], w: 15.7, h: 9.7},
];
export function docPose(T: number) {
  if (T <= DOCK[0].at) {
    const {p, rz} = pile3(T - S['03'], KEEP);
    return {p: add(O.c3, ...p), r: [0, 0, rz] as V3, w: 9, h: 4.4};
  }
  for (let i = 0; i < DOCK.length - 1; i++) {
    const a = DOCK[i];
    const b = DOCK[i + 1];
    if (T <= b.at) {
      const k = (b.e ?? inOut)(prog(T, a.at, b.at));
      return {p: l3(a.p, b.p, k), r: l3(a.r, b.r, k), w: lerp(a.w, b.w, k), h: lerp(a.h, b.h, k)};
    }
  }
  const z = DOCK[DOCK.length - 1];
  return {p: z.p, r: z.r, w: z.w, h: z.h};
}
const Doc: React.FC<P> = ({T}) => {
  const t3 = T - S['03'];
  const t5 = T - S['05'];
  if (t3 < DROP3[KEEP] || t5 > 6.1) return null;
  const d = docPose(T);
  const ab = inOut(prog(T, S['03'] + 8.0, S['04'] + 0.9));
  const bc = inOut(prog(T, S['04'] + 5.2, S['04'] + 6.7));
  // 紙面の左上は動かさず、大きさだけ変える（中身は左上基準）
  const bars = bc > 0 ? lerpBars(DOC.B, DOC.C, bc) : grow(DOC, ab);
  const barOp = 1 - prog(T, S['04'] + 7.95, S['04'] + 8.5);
  const op = 1 - sstep(t5, 5.2, 5.9);
  return <Paper p={d.p} r={d.r} w={d.w} h={d.h} bars={bars} barOp={barOp} op={op} />;
};

// ---------------- 05 実物の一覧 → 同じ論点の二面 ----------------
const C05: React.FC<P> = ({T, tex}) => {
  const t = T - S['05'];
  if (t < 0.1 || t > 20.4) return null;
  const tiles: [THREE.Texture, number, number][] = [
    [tex.ovCP, -TILE.cx, TILE.yTop],
    [tex.ovGP, TILE.cx, TILE.yTop],
    [tex.ovCD, -TILE.cx, TILE.yBot],
    [tex.ovGD, TILE.cx, TILE.yBot],
  ];
  const cellK = prog(t, 5.45, 6.05);
  return (
    <>
      {t < 7.5
        ? tiles.map(([tx, x, y], i) => {
            const k = out3(prog(t, 0.25 + i * 0.11, 0.85 + i * 0.11));
            if (k <= 0) return null;
            const gpt = x > 0;
            const away = gpt ? inOut(prog(t, 6.3, 7.35)) : in3(prog(t, 5.2, 6.05));
            const fwd = gpt ? sstep(t, 5.2, 6.1) * 0.8 : 0;
            const p: V3 = gpt ? [x, y - away * 7, 0.05 + fwd - away * 14] : [x - away * 20, y, 0.05 - away * 6];
            return (
              <Pic key={i} tex={tx} p={add(O.c5, ...p)} w={TILE.w} h={TILE.w * aspect(tx)} r={[0, (1 - k) * -1.45, 0]} op={Math.min(1, k * 3) * (1 - sstep(away, 0.55, 1))} shadow={0.7}>
                {gpt ? <Frame p={[0.005, TILE.cellY, 0.03]} w={TILE.cellW + 0.06} h={TILE.cellW * (181 / 321) + 0.06} k={cellK} width={0.035} /> : null}
              </Pic>
            );
          })
        : null}
      {([0, 1] as const).map((side) => {
        const q = pagePose(T, side);
        if (q.op <= 0) return null;
        const fo = 1 - sstep(t, 14.2, 14.8);
        return (
          <Pic key={side} tex={side === 0 ? tex.pagePres : tex.pageDoc} p={add(O.c5, ...q.p)} w={PAGE.w} h={PAGE.h} s={q.s} op={q.op}>
            {side === 0 ? (
              <Frame p={[0, 0.02 * PAGE.h, 0.03]} w={PAGE.w * 0.93} h={PAGE.h * 0.36} k={out3(prog(t, 10.55, 11.35))} op={fo} width={0.075} />
            ) : (
              <>
                <Frame p={[-0.255 * PAGE.w, 0.4 * PAGE.h, 0.03]} w={PAGE.w * 0.44} h={PAGE.h * 0.15} k={out3(prog(t, 11.9, 12.5))} op={fo} color={C.ink} width={0.065} />
                <Frame p={[0, -0.06 * PAGE.h, 0.03]} w={PAGE.w * 0.95} h={PAGE.h * 0.7} k={out3(prog(t, 12.9, 13.9))} op={fo} color={C.ink} width={0.075} />
              </>
            )}
          </Pic>
        );
      })}
    </>
  );
};

// ---------------- 06 読む線と、聞く経路。図のそばの短い語句 ----------------
const L6 = {n: 11, x0: -7.8, y0: 0.6, pitch: 0.42, len: 8.6};
const DG = {cx: 3.6, cy: -0.25, sw: 2.1, sh: 1.65, gap: 0.5};
const TAGS = [1, 4, 6, 9]; // 短い語句になる線
const RA: [number, number][] = [
  [12, 1.2],
  [8, 1.6],
  [5, 0.3],
  [2.5, -0.8],
  [0.2, -0.2],
  [-2, -2.2],
  [-4.4, -3.0],
  [-6.5, -2.6],
];
const RB: [number, number][] = [
  [12, 1.2],
  [10.6, 1.0],
  [9.4, -0.6],
  [8.6, -2.6],
  [5.6, -3.5],
  [0.5, -3.6],
  [-3.6, -3.55],
  [-6.6, -3.55],
];
const C06: React.FC<P> = ({T}) => {
  const t = T - S['06'];
  if (t < -0.2 || t > 17.6) return null; // 入る前の待機位置が 05 の画面に掛かるので、動き出すまで出さない
  const o = O.c6;
  const dist = sstep(t, 2.9, 4.6) * (1 - sstep(t, 5.4, 6.1));
  const m = inOut(prog(t, 5.7, 7.0));
  const sq = (q: number): [number, number] => [DG.cx + (q % 2 ? 1 : -1) * (DG.sw + DG.gap) * 0.5, DG.cy + (q < 2 ? 1 : -1) * (DG.sh + DG.gap) * 0.5];
  const bars: BarC[] = range(L6.n).map((r) => {
    const len = L6.len * hashR(r + 60, 0.84, 1);
    const kin = outExpo(prog(t, -0.2 + r * 0.05, 1.0 + r * 0.05));
    let x = L6.x0 + len / 2 - (1 - kin) * 16 + clamp(t - 1.4, 0, 3.8) * 0.1 + dist * 0.4 * wobble(T, r * 2.3, 1.7);
    let y = L6.y0 - r * L6.pitch + dist * 0.12 * wobble(T, r * 4.1 + 2, 1.3);
    let w = len;
    let h = TH;
    let c = mix(C.line, '#aaa49b', dist * 0.7);
    const q = TAGS.indexOf(r);
    if (q >= 0) {
      const k = E_SLAM(prog(t, 7.55 + q * 0.3, 8.1 + q * 0.3));
      const [sx, sy] = sq(q);
      const tw = hashR(q + 5, 1.2, 1.7);
      x = lerp(x, sx + (q % 2 ? 1 : -1) * (DG.sw / 2 + 0.35 + tw / 2), k);
      y = lerp(y, sy + 0.4, k);
      w = lerp(w, tw, k);
      h = lerp(h, 0.2, k);
      c = mix(c, C.ink, k);
      // 語句になる前は、ほかの線が抜けたあとも左で待つ
      x -= (1 - k) * inOut(prog(t, 5.8, 6.7)) * 1.2;
    } else {
      x -= in3(prog(t, 5.7 + r * 0.05, 6.55 + r * 0.05)) * 24;
    }
    return {x, y, w, h, c};
  });
  const rpts: V3[] = RA.map((a, i) => {
    const b = RB[i];
    const wob = (1 - m) * 0.22 + 0.05;
    return add(o, lerp(a[0], b[0], m), lerp(a[1], b[1], m) + (i > 0 ? wob * wobble(T, i * 2.7, 2.2) : 0), 0.3);
  });
  const rk = out3(prog(t, 1.9, 4.4));
  const squares = range(4).map((q) => {
    const k = outBack(prog(t, 6.3 + q * 0.12, 6.75 + q * 0.12));
    const [sx, sy] = sq(q);
    return <Rect key={q} p={add(o, sx, sy, 0)} w={DG.sw * k} h={DG.sh * k} c={C.beige} />;
  });
  const tl = out3(prog(t, 6.7, 7.3));
  return (
    <>
      <group position={o}>
        <Bars items={bars} />
      </group>
      {squares}
      <Rect p={add(o, DG.cx - 2.35 + 2.35 * tl, DG.cy + DG.sh + DG.gap / 2 + 0.5, 0)} w={4.7 * tl} h={TH} c={C.line} />
      {t > 1.9 ? <Ribbon pts={rpts} k1={rk} width={0.17} /> : null}
    </>
  );
};

// 06 → 07 をつなぐ経路（07 の最初の段の頭へ届く）
const Link67: React.FC<P> = ({T}) => {
  if (T < S['06'] + 1.5 || T > S['07'] + 5.6) return null;
  const y = ROWS7.y0 + 0.15;
  const pts: V3[] = [add(O.c6, 12, 1.2, 0.3), add(O.c6, 22, 2.3, 0.3), add(O.c6, 38, 0.2, 0.2), add(O.c7, -14, 1.9, 0.1), add(O.c7, ROWS7.x0, y, 0.02)];
  const k0 = inOut(prog(T, S['07'] + 4.8, S['07'] + 5.4));
  return <Ribbon pts={pts} k0={k0} k1={1} width={lerp(0.17, 0.075, sstep(T, S['07'] - 0.2, S['07'] + 0.4))} />;
};

// ---------------- 07 なぞるだけ → 画面は小さく、語りは外へ ----------------
const CARD7 = {x: -4.5, y: -0.9, w: 4.6, h: 3.1};
const R7: [number, number][] = [
  [-2.1, -0.9],
  [0.0, -2.9],
  [3, -3.6],
  [6.6, -3.0],
  [8.9, -0.8],
  [7.7, 2.4],
  [10.6, 3.9],
  [13.2, 1.6],
  [14, -0.8],
];
const C07: React.FC<P> = ({T}) => {
  const t = T - S['07'];
  if (t < -1.2 || t > 12.2) return null;
  const o = O.c7;
  const tgt = centered(layout('point', CARD7.w, CARD7.h, 2), CARD7.w, CARD7.h);
  const bars: BarC[] = [];
  range(ROWS7.n).forEach((r) => {
    const len = ROWS7.len * hashR(r + 80, 0.9, 1);
    const y = ROWS7.y0 - r * ROWS7.pitch;
    if (r < 3) {
      const k = inOut(prog(t, 4.8 + r * 0.06, 5.65 + r * 0.06));
      const g = tgt[r];
      bars.push({x: lerp(ROWS7.x0 + len / 2, CARD7.x + g.x, k), y: lerp(y, CARD7.y + g.y, k), w: lerp(len, g.w, k), h: lerp(TH, g.h, k), c: mix(C.line, g.c, k)});
    } else {
      const x = in3(prog(t, 4.8 + r * 0.04, 5.6 + r * 0.04));
      bars.push({x: ROWS7.x0 + len / 2 - x * 26, y, w: len, h: TH, c: C.line});
    }
    // なぞる青い線（声が文章と同じ経路を進む）
    if (r < TRACE7.length) {
      const k = prog(t, TRACE7[r][0], TRACE7[r][1]) * (1 - out3(prog(t, 4.8, 5.25)));
      if (k > 0) bars.push({x: ROWS7.x0 + (len * k) / 2, y: y + 0.15, w: len * k, h: TH, c: C.blue, z: 0.01});
    }
  });
  const paper = sstep(t, 4.95, 5.6);
  const rk = lerp(0, 0.82, out3(prog(t, 4.95, 7.6))) + 0.18 * inOut(prog(t, 8.2, 10.0));
  const rpts: V3[] = R7.map(([x, y], i) => add(o, x, y + (i > 0 && i < R7.length - 1 ? 0.14 * wobble(T, i * 3.3, 2.4) : 0), 0.2));
  return (
    <>
      {paper > 0 ? (
        <group position={add(o, CARD7.x, CARD7.y, -0.02)} scale={[lerp(1.25, 1, paper), lerp(1.25, 1, paper), 1]}>
          <Shadow w={CARD7.w} h={CARD7.h} op={paper} />
          <Rect p={[0, 0, 0]} w={CARD7.w} h={CARD7.h} c={C.sheet} op={paper} />
          <Rect p={[0, 0, -0.004]} w={CARD7.w + 0.05} h={CARD7.h + 0.05} c={C.edge} op={paper} />
        </group>
      ) : null}
      <group position={o}>
        <Bars items={bars} />
      </group>
      {t > 4.95 ? <Ribbon pts={rpts} k1={rk} width={0.16} /> : null}
    </>
  );
};

// ---------------- 08 削る。抜いた跡を、語りが受け持つ ----------------
const L8 = {n: 12, x0: -8, y0: 3.2, pitch: 0.52, len: 8.4};
const CARD8 = {x: -5.9, y: 2.5, w: 4.2, h: 2.3};
const R8: [number, number][] = [
  [-12, -0.8],
  [-7.5, -0.5],
  [-3.5, -0.8],
  [-0.6, -2.2],
  [2.2, -3.75],
  [6.5, -3.95],
  [12, -3.6],
  [22, -2.8],
  [40, -3.7],
  [51.5, -3.95],
];
const C08: React.FC<P> = ({T}) => {
  const t = T - S['08'];
  if (t < -1.6 || t > 11.5) return null;
  const o = O.c8;
  const tgt = centered(layout('point', CARD8.w, CARD8.h, 4), CARD8.w, CARD8.h);
  const bars: BarC[] = range(L8.n).map((r) => {
    const len = L8.len * hashR(r + 100, 0.86, 1);
    const y = L8.y0 - r * L8.pitch;
    if (r < 3) {
      const k = inOut(prog(t, 4.9 + r * 0.06, 5.7 + r * 0.06));
      const g = tgt[r];
      return {x: lerp(L8.x0 + len / 2, CARD8.x + g.x, k), y: lerp(y, CARD8.y + g.y, k), w: lerp(len, g.w, k), h: lerp(TH, g.h, k), c: mix(C.line, g.c, k)};
    }
    const a = 1.7 + (L8.n - 1 - r) * 0.4; // 下から一行ずつ抜く
    const x = in3(prog(t, a, a + 0.34));
    return {x: L8.x0 + len / 2 - x * 30, y, w: len, h: TH, c: C.line};
  });
  const paper = sstep(t, 5.0, 5.7);
  // 経路は、行が抜けた分だけ進む。後半は画面の幅を使って先へ
  const rk = 0.045 * sstep(t, -0.4, 0.4) + 0.2 * inOut(prog(t, 3.3, 5.9)) + 0.755 * inOut(prog(t, 6.2, 9.2));
  const width = lerp(0.16, 0.5, sstep(t, 3.6, 7.6)) * (1 - 0.68 * sstep(t, 9.2, 10.2));
  const rpts: V3[] = R8.map(([x, y], i) => add(o, x, y + (i > 1 && i < 7 ? 0.12 * wobble(T, i * 3.1, 2.6) : 0), 0.2));
  return (
    <>
      {paper > 0 ? (
        <group position={add(o, CARD8.x, CARD8.y, -0.02)} scale={[lerp(1.25, 1, paper), lerp(1.25, 1, paper), 1]}>
          <Shadow w={CARD8.w} h={CARD8.h} op={paper} />
          <Rect p={[0, 0, 0]} w={CARD8.w} h={CARD8.h} c={C.sheet} op={paper} />
          <Rect p={[0, 0, -0.004]} w={CARD8.w + 0.05} h={CARD8.h + 0.05} c={C.edge} op={paper} />
        </group>
      ) : null}
      <group position={o}>
        <Bars items={bars} />
      </group>
      {T < S['10'] + 1.4 ? <Ribbon pts={rpts} k0={inOut(prog(T, S['10'] + 0.2, S['10'] + 1.3))} k1={rk} width={width} /> : null}
    </>
  );
};

// ---------------- 09 話題を並べ、順序を組み直し、声に出して確かめる ----------------
const CW = 4.2;
const CH = 2.9;
export const SLOT = (s: number) => -5.2 + 5.2 * s;
export const CY9 = -2.1;
const arc = (t: number, a: number, b: number, from: number, to: number, dz: number): [number, number] => {
  const k = inOut(prog(t, a, b));
  return [lerp(SLOT(from), SLOT(to), k), Math.sin(Math.PI * k) * dz];
};
// 話題の面 A（要点）・B（図）・C（詰まった文章）の位置。並びは A B C → C B A → C A B
function card9(t: number, id: 0 | 1 | 2): {p: V3; rz: number} {
  const start = [0, 1, 2][id];
  const sc = [
    [0.8, 1.6, 0.22],
    [-0.5, -0.7, -0.16],
    [0.3, 1.0, 0.3],
  ][id];
  const kin = outExpo(prog(t, 0.15 + id * 0.15, 0.95 + id * 0.15));
  const snap = E_SLAM(prog(t, 2.4 + id * 0.35, 2.75 + id * 0.35));
  let x = SLOT(start) + sc[0] * (1 - snap) + (1 - kin) * 22;
  let y = CY9 + sc[1] * (1 - snap);
  let z = 0;
  // 重要度: 図の面（B）が手前へ、ほかは奥へ
  const imp = sstep(t, 6.9, 7.6) - sstep(t, 9.4, 10.1);
  z += imp * (id === 1 ? 3.2 : -3.0);
  if (id === 1) y += imp * 0.25;
  if (t > 10.2) {
    if (id === 0) {
      const [ax, az] = arc(t, 10.3, 11.0, 0, 2, 2.6);
      const [bx, bz] = arc(t, 11.1, 11.8, 2, 1, 2.6);
      x = t < 11.05 ? ax : bx;
      z = t < 11.05 ? az : bz;
    } else if (id === 2) {
      [x, z] = arc(t, 10.3, 11.0, 2, 0, -2.6);
    } else {
      [x, z] = arc(t, 11.1, 11.8, 1, 2, -2.6);
    }
  }
  // 通して話してみて、つながりを整える（中央の面を少し上げる）
  if (id === 0) y += 0.25 * sstep(t, 14.3, 15.0);
  return {p: [x, y, z], rz: sc[2] * (1 - snap)};
}
// 10: 読む資料（C が育つ）と、聞くスライド（A が育ち、B は後ろへ重なる）。O.c9 からの相対
export function forms10(T: number) {
  const t = T - S['09'];
  const u = T - S['10'];
  const g = inOut(prog(u, 0.5, 2.4));
  const dn = inOut(prog(u, 11.2, 12.3));
  const drift = Math.max(0, u - 12.3);
  const a = card9(t, 0);
  const b = card9(t, 1);
  const cc = card9(t, 2);
  const dp = l3(l3(cc.p, [-4.7, -0.9, 0], g), [-5.0, -2.75, -1 + drift * 0.42], dn);
  const ds = lerp(1, 0.48, dn);
  const dw = lerp(CW, 5.2, g);
  const dh = lerp(CH, 6.6, g);
  const g2 = inOut(prog(u, 0.7, 2.2));
  const sp = l3(l3(a.p, [3.9, 0.45, 0], g2), [3.4, -1.9, 0.6 - drift * 0.4], dn);
  const ss = lerp(1, 0.6, dn);
  const sw = lerp(CW, 6.4, g2);
  const sh = lerp(CH, 3.9, g2);
  return {u, a, b, cc, g2, dp, ds, dw, dh, sp, ss, sw, sh};
}
const routeTop = (t: number) => 0.15 + 0.25 * sstep(t, 14.3, 15.0);
const C0910: React.FC<P> = ({T}) => {
  const t = T - S['09'];
  const u = T - S['10'];
  if (t < -0.2) return null;
  const o = O.c9;
  const top = routeTop(t);
  const route = rounded(
    [
      [-8.5, -3.95],
      [-2.6, -3.95],
      [-2.6, top],
      [2.6, top],
      [2.6, -3.95],
      [8.8, -3.95],
      [13, -3.95],
    ],
    0.9,
    0.1,
  ).map((p) => add(o, ...p));
  const rk = 0.62 * inOut(prog(t, 12.0, 14.2)) - 0.24 * inOut(prog(t, 14.3, 14.95)) + 0.62 * inOut(prog(t, 15.1, 16.4));
  const f = forms10(T);
  const {u: _u, a, b, cc, g2, dp, ds, dw, dh, sp, ss, sw, sh} = f;
  void _u;
  const dset = DOC10;
  const dbars = u < 7.3 ? grow(dset, inOut(prog(u, 0.6, 2.6))) : lerpBars(dset.B, dset.C, inOut(prog(u, 7.5, 8.6)));
  const sbars = lerpBars(layout('point', CW, CH, 11), layout('point', 6.4, 3.9, 11), g2);
  const hair = rounded(
    [
      [-3.1, -2.65],
      [3.4, -2.65],
      [3.4, -3.45],
      [-2.5, -3.45],
      [-2.5, -4.25],
      [2.6, -4.25],
      [4.0, -4.25],
    ],
    0.4,
    0.05,
  );
  // 結び: 経路が面の下から立ち上がり、画面の外（聞き手のほう）へ伸びる
  const reach: V3[] = (
    [
      [4.0, -4.25],
      [8.0, -2.9],
      [8.4, 1.1],
      [4.4, 4.1],
      [3.7, 7.5],
      [7.6, 9.9],
      [13.5, 11],
    ] as [number, number][]
  ).map(([x, y], i) => [x, y + (i > 0 && i < 6 ? 0.25 * wobble(T, i * 2.9, 2.8) : 0), 0.05]);
  const reachK = inOut(prog(u, 13.3, 15.4));
  const hk = 0.5 * out3(prog(u, 1.7, 2.8)) + 0.5 * inOut(prog(u, 8.7, 10.6));
  const bo = 1 - sstep(u, 0.5, 1.5);
  return (
    <>
      <Paper p={add(o, ...dp)} w={dw} h={dh} s={ds} r={[0, 0, cc.rz]} bars={dbars} />
      <group position={add(o, ...sp)} scale={[ss, ss, ss]} rotation={[0, 0, a.rz]}>
        <Paper p={[0, 0, 0]} w={sw} h={sh} bars={sbars} />
        {u > 1.7 ? <Ribbon pts={hair} k1={hk} width={0.16} /> : null}
        {u > 13.3 ? <Ribbon pts={reach} k1={reachK} width={0.16 / ss} /> : null}
      </group>
      {bo > 0 ? <Sheet p={add(o, ...l3(b.p, [4.4, 0.2, -1.6], inOut(prog(u, 0.4, 1.5))))} w={CW} h={CH} kind="figure" seed={7} r={[0, 0, b.rz]} op={bo} /> : null}
      {t > 12 && u < 1.4 ? <Ribbon pts={route} k0={inOut(prog(u, 0.15, 1.25))} k1={rk} width={0.16} /> : null}
    </>
  );
};
const DOC10 = docSet(CW, CH, 5.2, 6.6, 13, 6);

const Rig: React.FC<{cam: CamS}> = ({cam}) => {
  const {camera} = useThree();
  applyCam(camera as THREE.PerspectiveCamera, cam);
  return <fog attach="fog" args={[C.paper, 30, 105]} />;
};

export const World: React.FC<P> = (p) => {
  const {T} = p;
  return (
    <>
      <Rig cam={p.cam} />
      {T < S['03'] + 0.6 ? <C0102 {...p} /> : null}
      {T > S['03'] - 1 && T < S['05'] + 1 ? <C03 {...p} /> : null}
      {T > S['03'] && T < S['05'] + 6.2 ? <Doc {...p} /> : null}
      {T > S['05'] && T < S['06'] + 0.5 ? <C05 {...p} /> : null}
      {T > S['06'] - 1 && T < S['07'] + 1 ? <C06 {...p} /> : null}
      <Link67 {...p} />
      {T > S['07'] - 1.5 && T < S['08'] + 1.5 ? <C07 {...p} /> : null}
      {T > S['08'] - 2 && T < S['10'] + 1.5 ? <C08 {...p} /> : null}
      {T > S['09'] - 0.5 ? <C0910 {...p} /> : null}
    </>
  );
};
export {PLANE};
