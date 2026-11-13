// 画面の語（DOM／CSS）。字形は崩さない。行のマスクから入り、語の塊が着地し、読む間は行ごと流れる。
// 図に付く語（一覧の名称、二面の見出しと下の語、用途の名前）は、カメラと同じ投影で位置を決める。時刻は声の語の時刻に合わせてある。
import React from 'react';
import * as THREE from 'three';
import {CamS, V3, project} from './cam';
import {C, E_PUSH, E_SLAM, H, Line, LineP, Txt, W, clamp, lerp, prog, slam, sstep} from './kit';
import {O, PAGE, S, TILES, add, pagePose} from './score';
import {docPose, forms10} from './world';

type P = {T: number; cam: CamS};
// 読む間の流れ（行ごと、左右へゆっくり）
const drift = (T: number, t0: number, v: number) => Math.max(0, T - t0 - 0.3) * v;
const L: React.FC<Omit<LineP, 't'> & {T: number; v?: number}> = ({T, v = 0, ...p}) => <Line t={T} {...p} dx={(p.dx ?? 0) + drift(T, p.t0, v)} />;

// 着地する語の塊
const Slam: React.FC<{T: number; t0: number; out?: number; text: string; x: number; y: number; size: number; color?: string; anchor?: 'l' | 'c' | 'r'; from?: [number, number]; s0?: number; r0?: number; grow?: number; outX?: number; outY?: number; weight?: number; dy?: number}> = ({T, t0, out, text, x, y, size, color = C.ink, anchor = 'l', from = [0, 0], s0 = 1.6, r0 = -3, grow = 0.012, outX = 0, outY = 0, weight = 900, dy = 0}) => {
  const m = slam(T, t0, {x: from[0], y: from[1], s: s0, r: r0, grow, out, outX, outY});
  if (m.o <= 0) return null;
  return <Txt text={text} x={x + m.dx} y={y + m.dy + dy} size={size} color={color} anchor={anchor} s={m.s} r={m.r} o={m.o} mv={m.mv} weight={weight} />;
};

// 図の外接（文字の検査用の見えない矩形）。世界の点の列を画面へ投影して囲む
const Fig: React.FC<{cam: CamS; pts: V3[]; fly?: boolean}> = ({cam, pts, fly}) => {
  const q = pts.map((p) => project(cam, ...p));
  if (q.some((p) => p.w <= 0.2)) return null;
  const x0 = Math.min(...q.map((p) => p.x));
  const x1 = Math.max(...q.map((p) => p.x));
  const y0 = Math.min(...q.map((p) => p.y));
  const y1 = Math.max(...q.map((p) => p.y));
  return <div data-fig={fly ? 'fly' : '1'} style={{position: 'absolute', left: x0, top: y0, width: x1 - x0, height: y1 - y0, pointerEvents: 'none'}} />;
};
const eul = new THREE.Euler();
const vv = new THREE.Vector3();
const corners = (p: V3, w: number, h: number, r: V3 = [0, 0, 0], s = 1): V3[] =>
  (
    [
      [-1, 1],
      [1, 1],
      [1, -1],
      [-1, -1],
    ] as [number, number][]
  ).map(([sx, sy]) => {
    vv.set((sx * w * s) / 2, (sy * h * s) / 2, 0).applyEuler(eul.set(r[0], r[1], r[2]));
    return [p[0] + vv.x, p[1] + vv.y, p[2] + vv.z];
  });

const C01: React.FC<P> = ({T}) => {
  if (T > S['02'] + 0.5) return null;
  const out = S['02'] - 0.5;
  const press = 26 * sstep(T, 4.2, 7.2);
  return (
    <>
      <L T={T} text="頭に、" x={100} y={598} size={76} weight={700} color={C.gray} t0={2.5} t1={out} dy={press} />
      <Slam T={T} t0={3.4} out={out + 0.05} text="入らない。" x={86} y={694} size={250} from={[0, 70]} s0={1.5} outY={520} dy={press} grow={0.008} />
    </>
  );
};

const C02: React.FC<P> = ({T}) => {
  const s = S['02'];
  if (T < s || T > S['03'] + 0.5) return null;
  const out = S['03'] - 0.5;
  return (
    <>
      <L T={T} text="語りを、" x={352} y={262} size={124} color={C.blue} t0={s + 2.3} t1={out} dir="right" v={5} />
      <Slam T={T} t0={s + 3.0} out={out + 0.05} text="設計する。" x={340} y={410} size={230} from={[340, 0]} s0={1.4} r0={2} outX={-W} grow={0.016} />
    </>
  );
};

const DROP3 = [1.7, 2.15, 2.55, 2.9, 3.2];
const C03: React.FC<P> = ({T}) => {
  const s = S['03'];
  if (T < s || T > S['04'] + 0.5) return null;
  const out = S['04'] - 0.55;
  // 面が落ちるたびに、行が下へ押される
  const push = DROP3.reduce((a, d) => a + 11 * E_SLAM(prog(T, s + d, s + d + 0.3)), 0);
  return (
    <>
      <L T={T} text="足して、ばかり。" x={96} y={90} size={128} t0={s + 1.2} t1={s + 3.85} dy={push} />
      <L T={T} text="この言葉は、要る？" x={96} y={92} size={148} t0={s + 4.1} t1={out} v={9} />
    </>
  );
};

const C04: React.FC<P> = ({T, cam}) => {
  const s = S['04'];
  if (T < s || T > S['05'] + 0.5) return null;
  const out = S['05'] - 0.9;
  const d = docPose(T);
  return (
    <>
      <L T={T} text="手元で読むなら、" x={1824} y={148} size={84} weight={700} color={C.gray} anchor="r" t0={s + 0.6} t1={out} v={-9} />
      <Slam T={T} t0={s + 1.3} out={out + 0.05} text="必要な情報を。" x={1832} y={262} size={150} anchor="r" from={[220, 0]} s0={1.45} r0={2} outX={W} />
      {T > s + 1 && T < out ? <Fig cam={cam} pts={corners(d.p, d.w, d.h, d.r)} /> : null}
    </>
  );
};

const NAMES = ['Claude・発表', 'GPT・発表', 'Claude・調査', 'GPT・調査'];
const C05: React.FC<P> = ({T, cam}) => {
  const s = S['05'];
  if (T < s || T > S['06'] + 0.5) return null;
  const t = T - s;
  const pg = ([0, 1] as const).map((side) => {
    const q = pagePose(T, side);
    const c = add(O.c5, ...q.p);
    const hw = (PAGE.w * q.s) / 2;
    const hh = (PAGE.h * q.s) / 2;
    return {q, c, top: project(cam, c[0] - hw, c[1] + hh + 0.2, c[2]), bot: project(cam, c[0] - hw, c[1] - hh - 0.32, c[2]), box: corners(c, PAGE.w, PAGE.h, [0, 0, 0], q.s)};
  });
  return (
    <>
      {t < 5.6
        ? TILES.map((tl, i) => {
            const p = project(cam, ...add(O.c5, tl.x - 3.5, tl.y - tl.h / 2 - 0.13, 0.05));
            return <L key={i} T={T} text={NAMES[i]} x={p.x} y={p.y} size={46} weight={700} t0={s + (i < 2 ? 1.7 : 3.0) + (i % 2) * 0.15} t1={s + 5.1} box />;
          })
        : null}
      {t > 7.2 ? (
        <>
          <L T={T} text="発表用" x={pg[0].top.x} y={pg[0].top.y - 66} size={64} color={C.blue} t0={s + 7.5} t1={s + 19.15} box />
          <L T={T} text="読む資料" x={pg[1].top.x} y={pg[1].top.y - 66} size={64} color={C.gray} t0={s + 7.75} t1={s + 19.2} box />
          <L T={T} text="要点を見せる" x={pg[0].bot.x} y={pg[0].bot.y} size={104} color={C.blue} t0={s + 14.9} t1={s + 19.1} />
          <L T={T} text="説明まで残す" x={pg[1].bot.x} y={pg[1].bot.y} size={104} t0={s + 15.5} t1={s + 19.15} />
          {t > 7.6 && t < 19.2 ? pg.map((g, i) => <Fig key={i} cam={cam} pts={g.box} />) : null}
        </>
      ) : null}
    </>
  );
};

const C06: React.FC<P> = ({T}) => {
  const s = S['06'];
  if (T < s || T > S['07'] + 0.5) return null;
  const out = S['07'] - 0.5;
  return (
    <>
      <L T={T} text="読む" x={96} y={96} size={200} t0={s + 1.3} t1={s + 5.45} v={6} />
      <L T={T} text="聞く" x={1824} y={96} size={200} color={C.blue} anchor="r" t0={s + 2.3} t1={s + 5.55} dir="down" v={-6} />
      <L T={T} text="図のそばに、短い語句。" x={96} y={108} size={76} weight={700} color={C.gray} t0={s + 6.6} t1={s + 11.4} v={8} />
      <L T={T} text="要点を、" x={98} y={100} size={104} t0={s + 13.2} t1={out} />
      <Slam T={T} t0={s + 14.2} out={out + 0.05} text="残す。" x={86} y={222} size={240} from={[-60, 50]} s0={1.5} outX={-W} />
    </>
  );
};

const C07: React.FC<P> = ({T}) => {
  const s = S['07'];
  if (T < s || T > S['08'] + 0.5) return null;
  const out = S['08'] - 0.6;
  return (
    <>
      <L T={T} text="なぞる、だけ。" x={96} y={90} size={128} t0={s + 2.2} t1={s + 4.7} />
      <L T={T} text="画面に要点。" x={96} y={96} size={104} t0={s + 5.5} t1={out} v={5} />
      <L T={T} text="語りに、" x={800} y={352} size={110} color={C.blue} t0={s + 7.0} t1={out} dir="right" />
      <Slam T={T} t0={s + 7.75} out={out + 0.05} text="文脈。" x={786} y={476} size={250} color={C.blue} from={[160, 40]} s0={1.5} outX={-W} />
    </>
  );
};

// 08: 画面の語は、縦の「削る。」だけ。小さく入り、塊のまま大きく引き寄せる
const C08: React.FC<P> = ({T}) => {
  const s = S['08'];
  if (T < s + 0.7 || T > S['09'] + 0.3) return null;
  const out = S['09'] - 0.5;
  const kin = E_SLAM(prog(T, s + 0.7, s + 1.15));
  const big = E_SLAM(prog(T, s + 2.95, s + 3.45));
  const ko = E_PUSH(prog(T, out, out + 0.3));
  const sc = lerp(lerp(0.3, 0.44, kin), 1, big) * (1 + 0.01 * Math.max(0, T - s - 3.45));
  const mv = T < s + 1.0 || (T > s + 2.94 && T < s + 3.25) || T > out;
  return <Txt text="削る。" x={1390 - ko * W} y={lerp(lerp(40, 150, kin), 104, big)} size={250} vertical s={sc} o={clamp(prog(T, s + 0.7, s + 0.78))} mv={mv} />;
};

const C09: React.FC<P> = ({T}) => {
  const s = S['09'];
  if (T < s || T > S['10'] + 0.5) return null;
  const out = S['10'] - 0.5;
  return (
    <>
      <L T={T} text="体裁は、AIに。" x={96} y={100} size={104} weight={700} color={C.gray} t0={s + 2.4} t1={s + 4.9} v={8} />
      <L T={T} text="何を、" x={100} y={84} size={90} weight={700} color={C.gray} t0={s + 5.9} t1={s + 9.85} />
      <Slam T={T} t0={s + 6.75} out={s + 9.9} text="伝えるか。" x={88} y={190} size={220} from={[0, 60]} s0={1.5} outX={-W} />
      <L T={T} text="順序を組み直す。" x={96} y={110} size={150} t0={s + 10.3} t1={s + 12.9} v={8} />
      <L T={T} text="声に出して、" x={100} y={84} size={100} color={C.blue} t0={s + 13.5} t1={out} />
      <Slam T={T} t0={s + 14.5} out={out + 0.05} text="確かめる。" x={88} y={190} size={210} from={[0, 60]} s0={1.5} outX={-W} />
    </>
  );
};

const C10: React.FC<P> = ({T, cam}) => {
  const s = S['10'];
  if (T < s) return null;
  const f = forms10(T);
  const d = add(O.c9, ...f.dp);
  const sl = add(O.c9, ...f.sp);
  const dTop = project(cam, d[0] - (f.dw * f.ds) / 2, d[1] + (f.dh * f.ds) / 2 + 0.22, d[2]);
  const sTop = project(cam, sl[0] - (f.sw * f.ss) / 2, sl[1] + (f.sh * f.ss) / 2 + 0.22, sl[2]);
  return (
    <>
      <L T={T} text="AIは、相棒。" x={96} y={88} size={120} t0={s + 1.0} t1={s + 2.75} />
      <L T={T} text="責任は、代わってくれない。" x={96} y={92} size={104} t0={s + 3.3} t1={s + 6.3} v={8} />
      <L T={T} text="読む資料" x={dTop.x} y={dTop.y - 66} size={64} t0={s + 7.5} t1={s + 11.0} box />
      <L T={T} text="聞くスライド" x={sTop.x} y={sTop.y - 66} size={64} color={C.blue} t0={s + 8.7} t1={s + 11.05} box />
      <L T={T} text="聞き手に、" x={100} y={92} size={110} t0={s + 12.4} />
      <Slam T={T} t0={s + 13.3} text="届ける。" x={84} y={226} size={260} color={C.blue} from={[0, 70]} s0={1.5} />
      {T > s + 2.6 ? (
        <>
          <Fig cam={cam} pts={corners(d, f.dw, f.dh, [0, 0, 0], f.ds)} />
          <Fig cam={cam} pts={corners(sl, f.sw, f.sh, [0, 0, 0], f.ss)} />
        </>
      ) : null}
    </>
  );
};

export const Type: React.FC<P> = (p) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden'}}>
    <C01 {...p} />
    <C02 {...p} />
    <C03 {...p} />
    <C04 {...p} />
    <C05 {...p} />
    <C06 {...p} />
    <C07 {...p} />
    <C08 {...p} />
    <C09 {...p} />
    <C10 {...p} />
  </div>
);
