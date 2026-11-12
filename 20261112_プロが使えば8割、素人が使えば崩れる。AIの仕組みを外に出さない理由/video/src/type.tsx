// 画面の語（DOM／CSS）。字形は崩さない。行のマスクから入り、語の塊が着地し、読む間は行ごと流れる。
// 立体に付く語（札）は、カメラと同じ投影で位置を求める。時刻はすべて声の語の時刻に合わせてある。
import React from 'react';
import {CamS, project} from './cam';
import {C, E_SLAM, H, Line, LineP, Plate, Txt, W, clamp, in3, kv, lerp, prog, slam, sstep} from './kit';
import {S} from './score';
import {CARD, COMB, FRAME, cardX, combGap, frameAmber} from './world';
import {X} from './score';

type P = {T: number; cam: CamS};
// 読む間の流れ（行ごと、左右へゆっくり）
const drift = (T: number, t0: number, v: number) => Math.max(0, T - t0 - 0.3) * v;
const L: React.FC<Omit<LineP, 't'> & {T: number; v?: number}> = ({T, v = 0, ...p}) => <Line t={T} {...p} dx={(p.dx ?? 0) + drift(T, p.t0, v)} />;

// 着地する語の塊
const Slam: React.FC<{T: number; t0: number; out?: number; text: string; x: number; y: number; size: number; color?: string; anchor?: 'l' | 'c' | 'r'; from?: [number, number]; s0?: number; r0?: number; grow?: number; outX?: number; outY?: number; weight?: number; box?: boolean; colorAt?: (i: number) => string | undefined}> = ({T, t0, out, text, x, y, size, color = C.ink, anchor = 'l', from = [0, 0], s0 = 1.7, r0 = -4, grow = 0.012, outX = 0, outY = -H, weight = 900, box, colorAt}) => {
  const m = slam(T, t0, {x: from[0], y: from[1], s: s0, r: r0, grow, out, outX, outY});
  if (m.o <= 0) return null;
  return <Txt text={text} x={x + m.dx} y={y + m.dy} size={size} color={color} anchor={anchor} s={m.s} r={m.r} o={m.o} mv={m.mv} weight={weight} box={box} colorAt={colorAt} />;
};

const C01: React.FC<P> = ({T, cam}) => {
  if (T > S['02'] + 0.4) return null;
  const out = S['02'] - 0.55;
  const lab = project(cam, 0, 3.05, 0);
  return (
    <>
      <L T={T} text="仕組み" x={lab.x} y={lab.y - 80} size={64} color={C.blue} anchor="c" t0={0.95} t1={2.15} box />
      <L T={T} text="渡せば、" x={96} y={84} size={176} color={C.gray} t0={2.3} t1={out} v={21} />
      <L T={T} text="同じ成果。" x={96} y={282} size={176} color={C.gray} t0={3.2} t1={out + 0.06} v={8} />
      <Slam T={T} t0={4.78} out={out + 0.1} text="とは、限らない。" x={1010} y={318} size={104} from={[260, -40]} outX={W} outY={0} />
      <L T={T} text="2年間、そう見てきた。" x={1016} y={452} size={54} weight={500} color={C.gray} t0={6.2} t1={out} v={18} />
    </>
  );
};

const C02: React.FC<P> = ({T, cam}) => {
  const s = S['02'];
  if (T < s || T > S['03'] + 0.4) return null;
  const out = S['03'] - 0.6;
  const lab = project(cam, 3.2, 3.2, 0);
  const pk = E_SLAM(prog(T, s + 4.2, s + 4.75));
  const po = in3(prog(T, out, out + 0.3));
  return (
    <>
      <L T={T} text="成果を決めるのは、" x={100} y={92} size={68} weight={700} t0={s + 0.5} t1={out} v={15} />
      <L T={T} text="仕組みより、" x={lab.x} y={lab.y - 120} size={72} weight={700} color={C.gray} anchor="c" t0={s + 1.5} t1={out} box />
      <L T={T} text="使う人の" x={100} y={214} size={150} t0={s + 2.95} t1={out + 0.05} v={6} />
      <Plate x={100} y={772 - po * H} w={640} h={34} k={pk} color={C.amber} from="l" />
      <Slam T={T} t0={s + 4.1} out={out + 0.1} text="判断。" x={84} y={400} size={350} from={[-120, 60]} s0={1.5} />
      <L T={T} text="人の目と、経験で決まる。" x={102} y={862} size={66} weight={700} t0={s + 7.2} t1={out} v={18} />
    </>
  );
};

const C03: React.FC<P> = ({T}) => {
  const s = S['03'];
  if (T < s || T > S['04'] + 0.4) return null;
  const out = S['04'] - 0.6;
  return (
    <>
      <L T={T} text="素材" x={100} y={84} size={64} weight={700} color={C.gray} t0={s + 0.65} t1={out} />
      <L T={T} text="6時間" x={88} y={176} size={290} t0={s + 0.95} t1={s + 7.0} v={27} dir="up" />
      <L T={T} text="20分" x={88} y={176} size={290} t0={s + 7.25} t1={out} dir="down" v={9} />
      <L T={T} text="ほど" x={736} y={300} size={160} color={C.gray} t0={s + 7.5} t1={out} dir="down" v={9} />
      <L T={T} text="削るより、" x={1824} y={96} size={78} weight={700} color={C.gray} anchor="r" t0={s + 9.85} t1={out} dir="left" />
      <L T={T} text="拾って、" x={1824} y={206} size={140} anchor="r" t0={s + 10.3} t1={out} dir="up" />
      <Slam T={T} t0={s + 11.2} out={out + 0.05} text="並べる。" x={1824} y={372} size={140} anchor="r" from={[120, 0]} s0={1.5} outX={W} outY={0} />
    </>
  );
};

const C04: React.FC<P> = ({T, cam}) => {
  const s = S['04'];
  if (T < s || T > S['05'] + 0.4) return null;
  const out = S['05'] - 0.6;
  const names = ['構成', '収集', '執筆'];
  return (
    <>
      <L T={T} text="以前は、構成から。" x={100} y={92} size={76} weight={700} color={C.gray} t0={s + 0.45} t1={s + 3.7} v={18} />
      {names.map((n, i) => {
        const p = project(cam, cardX(i, T), CARD.h + 0.2 + (i === 0 ? in3(prog(T, s + 3.75, s + 4.4)) * 11 : 0), 0);
        const t1 = i === 0 ? s + 3.7 : out;
        return <L key={n} T={T} text={n} x={p.x} y={p.y - 104} size={70} anchor="c" t0={s + 0.5 + i * 0.12} t1={t1} box color={i > 0 && T > s + 4.6 ? C.blue : C.ink} />;
      })}
      <Slam T={T} t0={s + 4.45} out={out + 0.05} text="先に、集める。" x={88} y={72} size={184} from={[-200, 0]} s0={1.45} />
      <L T={T} text="書ける記事を、書かせる。" x={102} y={290} size={66} weight={700} t0={s + 5.8} t1={out} v={18} />
    </>
  );
};

const C05: React.FC<P> = ({T}) => {
  const s = S['05'];
  if (T < s || T > S['06'] + 0.4) return null;
  const out = S['06'] - 0.35;
  return (
    <>
      <L T={T} text="AIが、" x={100} y={72} size={84} color={C.blue} t0={s + 0.5} t1={out} />
      <L T={T} text="8割" x={92} y={180} size={190} color={C.blue} t0={s + 0.9} t1={out} v={6} />
      <L T={T} text="プロが、" x={470} y={72} size={84} color={C.amber} t0={s + 3.0} t1={out} />
      <Slam T={T} t0={s + 3.25} out={out} text="2割。" x={462} y={180} size={190} color={C.amber} from={[0, -260]} s0={1.2} r0={0} />
      <Slam T={T} t0={s + 5.0} out={out + 0.05} text="100%" x={1836} y={96} size={270} anchor="r" from={[200, 0]} s0={1.6} outX={W} outY={0} />
      <L T={T} text="判断と、責任は手放さない。" x={102} y={410} size={62} weight={700} color={C.amber} t0={s + 7.8} t1={out} v={15} />
      <L T={T} text="要件によっては、チェックなし。" x={1824} y={410} size={52} weight={500} color={C.gray} anchor="r" t0={s + 10.2} t1={out} dir="left" />
    </>
  );
};

const C06: React.FC<P> = ({T}) => {
  const s = S['06'];
  if (T < s || T > S['07'] + 0.4) return null;
  const pre = s + 9.15;
  const out = S['07'] - 0.55;
  return (
    <>
      <L T={T} text="同じ8割。" x={92} y={84} size={176} t0={s + 0.55} t1={s + 5.7} v={18} />
      <Slam T={T} t0={s + 1.45} out={s + 5.75} text="素人" x={1828} y={78} size={240} color={C.gray} anchor="r" from={[320, 0]} s0={1.3} outX={W} outY={0} grow={0.006} />
      <L T={T} text="経験のない人が、使うと。" x={1824} y={96} size={66} weight={700} color={C.gray} anchor="r" t0={s + 8.4} t1={pre} dir="left" />
      <Slam T={T} t0={s + 10.85} out={out} text="崩れる。" x={84} y={96} size={330} color={C.red} from={[-160, -30]} s0={1.7} r0={-6} outX={-W} outY={0} />
    </>
  );
};

const C07: React.FC<P> = ({T, cam}) => {
  const s = S['07'];
  if (T < s || T > S['08'] + 0.4) return null;
  const out = S['08'] - 0.55;
  const a = project(cam, X.frame - 1, FRAME.cy, 0);
  const b = project(cam, X.frame + 1, FRAME.cy, 0);
  const k = (b.x - a.x) / 160; // 枠の大きさに合わせて語も拡縮する
  const cx = (a.x + b.x) / 2;
  const cy = (a.y + b.y) / 2;
  const sw = T > frameAmber - 0.45;
  return (
    <>
      {!sw || T < frameAmber ? (
        <>
          <L T={T} text="誰が、" x={cx - 330 * k} y={cy - 132 * k} size={116 * k} t0={s + 0.55} t1={frameAmber - 0.5} box />
          <L T={T} text="使うか。" x={cx - 330 * k} y={cy + 6 * k} size={116 * k} t0={s + 0.85} t1={frameAmber - 0.45} box />
        </>
      ) : null}
      <L T={T} text="判断まで、" x={cx - 334 * k} y={cy - 122 * k} size={70 * k} t0={frameAmber + 0.1} t1={out} box />
      <Slam T={T} t0={s + 8.75} out={out} text="入れないと。" x={cx - 340 * k} y={cy - 28 * k} size={112 * k} from={[0, 40]} s0={1.25} r0={-2} box grow={0.003} />
      <L T={T} text="8割と100%の差は、ここ。" x={W / 2} y={950} size={58} weight={700} anchor="c" t0={s + 9.9} t1={out} />
    </>
  );
};

const C08: React.FC<P> = ({T}) => {
  const s = S['08'];
  if (T < s || T > S['09'] + 0.4) return null;
  const out = S['09'] - 0.6;
  return (
    <>
      <L T={T} text="仕組みは、" x={100} y={84} size={84} weight={700} t0={s + 0.7} t1={out} />
      <L T={T} text="出さない。" x={90} y={186} size={190} t0={s + 1.6} t1={out} v={5} />
      <L T={T} text="成果物を、" x={1150} y={84} size={84} weight={700} t0={s + 2.6} t1={out} />
      <Slam T={T} t0={s + 3.9} out={out + 0.05} text="渡す。" x={1140} y={176} size={250} from={[-260, 0]} s0={1.5} outX={W} outY={0} />
      <L T={T} text="止まっても、割り切れる。" x={102} y={404} size={54} weight={500} color={C.gray} t0={s + 7.4} t1={out} v={15} />
      <L T={T} text="差は、歴然。" x={1154} y={452} size={72} t0={s + 10.4} t1={out} />
    </>
  );
};

const C09: React.FC<P> = ({T}) => {
  const s = S['09'];
  if (T < s || T > S['10'] + 0.4) return null;
  const out = S['10'] - 0.6;
  return (
    <>
      <L T={T} text="私は、言葉のプロではない。" x={100} y={84} size={58} weight={500} color={C.gray} t0={s + 0.8} t1={s + 5.4} v={18} />
      <L T={T} text="プロにしか、見えない。" x={96} y={78} size={112} t0={s + 5.75} t1={out} v={9} colorAt={(i) => (i < 2 ? C.amber : undefined)} />
      <Slam T={T} t0={s + 8.72} out={out + 0.05} text="「そして」" x={76} y={230} size={250} from={[-80, 40]} s0={1.6} r0={-3} />
      <L T={T} text="20通り。" x={100} y={520} size={150} t0={s + 9.5} t1={out} color={C.amber} />
    </>
  );
};

const C10: React.FC<P> = ({T, cam}) => {
  const s = S['10'];
  if (T < s) return null;
  const g = combGap(T);
  const pa = project(cam, X.comb - g - 1.0, 3.15, 0);
  const pb = project(cam, X.comb + g + 1.0, 3.15, 0);
  const pk = E_SLAM(prog(T, s + 11.6, s + 12.1));
  return (
    <>
      <L T={T} text="プロ" x={pa.x} y={pa.y - 130} size={100} color={C.amber} anchor="c" t0={s + 0.5} t1={s + 8.5} box />
      <L T={T} text="エンジニア" x={pb.x} y={pb.y - 130} size={100} color={C.blue} anchor="c" t0={s + 1.3} t1={s + 8.55} box />
      <L T={T} text="発注と、受注では、" x={W / 2} y={84} size={64} weight={700} color={C.gray} anchor="c" t0={s + 5.1} t1={s + 8.3} />
      <L T={T} text="たいてい、うまくいかない。" x={W / 2} y={170} size={64} weight={700} color={C.gray} anchor="c" t0={s + 6.4} t1={s + 8.35} />
      <L T={T} text="一心同体で、組む。" x={96} y={78} size={120} t0={s + 10.45} v={9} />
      <Plate x={100} y={424} w={390} h={28} k={pk} color={C.amber} from="l" />
      <L T={T} text="判断は、" x={90} y={232} size={180} t0={s + 11.5} v={4} />
      <Slam T={T} t0={s + 12.2} text="手放さない。" x={84} y={470} size={180} from={[-140, 0]} s0={1.45} r0={-3} grow={0.006} />
      <L T={T} text="成果物で、渡す。" x={102} y={700} size={66} weight={700} t0={s + 12.9} v={12} />
    </>
  );
};

// 文字の検査用: 主な立体の外接を、カメラと同じ投影で画面の矩形にする（見えない）
type Box = [number, number, number, number, number, number]; // x0, x1, y0, y1, z0, z1
function figBoxes(T: number): Box[] {
  const b: Box[] = [];
  const s = (id: string) => S[id];
  if (T < s('02')) {
    const k = E_SLAM(prog(T, 2.3, 2.85));
    b.push([-2.7 * k - 1.6, -2.7 * k + 1.6, 0, 2.4, -1.1, 1.1]);
    if (T > 2.3) b.push([2.7 * k - 1.9, 2.7 * k + 1.9, 0, 2.4, -1.3, 1.3]);
  } else if (T < s('03') - 0.3) {
    if (T > s('02') + 0.7) b.push([1.4, 5.0, 0, 2.9, -1.1, 1.1]);
  } else if (T < s('04') - 0.3) {
    if (T > s('03') + 12.1) b.push([42.0, 44.5, 0, 0.8, -1, 1]);
  } else if (T < s('05') - 0.3) {
    if (T > s('04') + 0.5) [0, 1, 2].forEach((i) => (i === 0 && T > s('04') + 3.75 ? null : b.push([cardX(i, T) - 1.15, cardX(i, T) + 1.15, 0, 3, -0.15, 0.15])));
  } else if (T < s('07') - 0.3) {
    const fallen = T > s('06') + 10.9;
    const n = T > s('05') + 2.6 && T < s('06') + 0.4 ? 10 : 8;
    if (T > s('05') + 0.8) b.push(fallen ? [106, 116.6, 0, 1.7, -0.85, 0.85] : [106, 106 + n * 0.9 - 0.5, 0, 3, -0.85, 0.85]);
  } else if (T < s('08') - 0.3) {
    if (T > s('07') + 0.5) b.push([X.frame - FRAME.w / 2, X.frame + FRAME.w / 2, 0, FRAME.h, -0.45, 0.45]);
  } else if (T < s('09') - 0.3) {
    if (T > s('08') + 0.7) b.push([164.6, 168.0, 0, 2.4, -1.1, 1.1]);
    if (T > s('08') + 3.7) b.push([171.0, 175.3, 0, 0.75, -0.2, 1.0]);
  } else if (T < s('10') - 0.3) {
    if (T > s('09') + 0.5) b.push([196.7, 204.9, 0, 0.3, -2.8, 2.8]);
    if (T > s('09') + 10.2) b.push([198.1, 203.6, 0.5, 4.4, -0.4, 0.5]);
  } else {
    const g = combGap(T);
    if (T > s('10') + 0.6) b.push([X.comb - g - 2.1, X.comb - g + 0.5, 0, 3, -0.9, 0.9]);
    if (T > s('10') + 1.4) b.push([X.comb + g - 0.5, X.comb + g + 2.1, 0, 3, -0.9, 0.9]);
  }
  return b;
}
const Figs: React.FC<P> = ({T, cam}) => (
  <>
    {figBoxes(T).map((bx, n) => {
      const pts = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => project(cam, bx[i & 1], bx[2 + ((i >> 1) & 1)], bx[4 + ((i >> 2) & 1)]));
      if (pts.some((p) => p.w <= 0.1)) return null;
      const x0 = Math.min(...pts.map((p) => p.x));
      const x1 = Math.max(...pts.map((p) => p.x));
      const y0 = Math.min(...pts.map((p) => p.y));
      const y1 = Math.max(...pts.map((p) => p.y));
      return <div key={n} data-fig="1" style={{position: 'absolute', left: x0, top: y0, width: x1 - x0, height: y1 - y0, pointerEvents: 'none'}} />;
    })}
  </>
);

export const Type: React.FC<P> = (p) => (
  <>
    <Figs {...p} />
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
  </>
);
export const _unused = {clamp, kv, lerp, sstep, COMB};
