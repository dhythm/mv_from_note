// 画面の語（DOM／CSS）。字形は崩さない。行のマスクから入り、語の塊が着地し、読む間は行ごと・塊ごと流れる。
// 時刻は声の語の時刻（audio/voice/words.json ＋ timeline.json の voice）に合わせてある。図に付く語は、カメラと同じ投影で位置を決める。
import React from 'react';
import {CamS, V3, project} from './cam';
import {C, E_PUSH, E_SLAM, F, G, Line, LineP, Plate, Txt, clamp, inOut, lerp, out3, outExpo, prog, slam} from './kit';
import {DUR, O, S, lineY7, shift, wx, wy} from './score';
import {BARS3, COL5, HARD3, LINE3, PL8, RING9, SCOPE, SEG6, STOP2, lift5, scopeR} from './world';
import {damped, pulse, wobble} from './lib/anim';

type P = {T: number; cam: CamS};
// 読む間の流れ（行ごと、左右へゆっくり）
const drift = (T: number, t0: number, v: number) => Math.max(0, T - t0 - 0.3) * v;
const L: React.FC<Omit<LineP, 't' | 't0' | 't1'> & {T: number; t0: number; t1?: number; v?: number; id: string}> = ({T, v = 0, id, t0, t1, ...p}) => (
  <Line t={T} t0={S[id] + t0} t1={t1 === undefined ? undefined : S[id] + t1} {...p} dx={(p.dx ?? 0) + drift(T, S[id] + t0, v)} />
);

// 着地する語の塊
type SlamP = {T: number; id: string; t0: number; out?: number; text: string; x: number; y: number; size: number; color?: string; anchor?: 'l' | 'c' | 'r'; from?: [number, number]; s0?: number; r0?: number; grow?: number; outX?: number; outY?: number; weight?: number; v?: number};
const Slam: React.FC<SlamP> = ({T, id, t0, out, text, x, y, size, color = C.ink, anchor = 'l', from = [0, 0], s0 = 1.5, r0 = -3, grow = 0.01, outX = 0, outY = 0, weight = 900, v = 0}) => {
  const m = slam(T, S[id] + t0, {x: from[0], y: from[1], s: s0, r: r0, grow, out: out === undefined ? undefined : S[id] + out, outX, outY});
  if (m.o <= 0) return null;
  return <Txt text={text} x={x + m.dx + drift(T, S[id] + t0, v)} y={y + m.dy} size={size} color={color} anchor={anchor} s={m.s} r={m.r} o={m.o} mv={m.mv} weight={weight} />;
};

// 図の外接（文字の検査用の見えない矩形）。px の矩形を、世界の点としてカメラで投影して囲む
const Fig: React.FC<{cam: CamS; o: V3; x: number; y: number; w: number; h: number; fly?: boolean}> = ({cam, o, x, y, w, h, fly}) => {
  if (w <= 1 || h <= 1) return null;
  const q = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ].map(([px, py]) => project(cam, o[0] + wx(px), o[1] + wy(py), o[2]));
  if (q.some((p) => p.w <= 0.2)) return null;
  const x0 = Math.min(...q.map((p) => p.x));
  const x1 = Math.max(...q.map((p) => p.x));
  const y0 = Math.min(...q.map((p) => p.y));
  const y1 = Math.max(...q.map((p) => p.y));
  return <div data-fig={fly ? 'fly' : '1'} style={{position: 'absolute', left: x0, top: y0, width: x1 - x0, height: y1 - y0, pointerEvents: 'none'}} />;
};

// ---- 01: 足りない 7 文字が、上から落ちてはまる ----
const X0 = 934; // 「誰でも」と「できる。」の継ぎ目
const WA = 588; // 「誰でも」の幅（210px）
const BIG = 210;
const c01 = (T: number) => {
  const gap = inOut(prog(T, 8.7, 9.15));
  const lineY = lerp(425, 560, gap) + 20 * damped(T, 9.27, 1, 2.6, 7);
  const tx = S['02'] - 0.5;
  const gs = (1.2 - 0.2 * out3(prog(T, 0.3, 5.6))) * (1 + 0.09 * prog(T, 9.4, tx));
  return {lineY, tx, gs, ex: E_PUSH(prog(T, tx, tx + 0.45))};
};
const C01: React.FC<P> = ({T}) => {
  if (T > S['02'] + 0.3) return null;
  const {lineY, gs, ex} = c01(T);
  const k = prog(T, 8.95, 9.27);
  const drop = -760 * (1 - k * k) - 16 * Math.abs(damped(T, 9.27, 1, 2.6, 7));
  return (
    <G s={gs} mv={ex > 0}>
      <Plate x={340} y={lineY + BIG + 34} w={1238} h={12} color={C.ink} k={outExpo(prog(T, 4.5, 5.2))} k2={inOut(prog(T, 8.45, 8.85))} from="l" />
      <Line t={T} text="できる。" x={X0} y={lineY} size={BIG} t0={0.3 + 0.1} dx={ex * 1700} colorAt={(i) => (i === 3 && T < 9.27 ? 'transparent' : undefined)} mv={ex > 0} />
      <L T={T} id="01" text="「誰でも」に足りない、" x={110} y={96} size={52} weight={700} color={C.gray} t0={5.85} t1={8.5} />
      <Slam T={T} id="01" text="たった7文字。" x={110} y={174} size={120} t0={6.72} out={8.5} outX={-1100} from={[-500, 0]} />
      {T >= 8.95 ? (
        <div data-mv={T < 9.27 || ex > 0 ? '1' : undefined} style={{position: 'absolute', left: 960 + 26 * prog(T, 9.5, c01(T).tx), top: 305 + drop - ex * 900, transform: 'translateX(-50%)', whiteSpace: 'nowrap', lineHeight: 1, fontFamily: F.g, fontFeatureSettings: '"palt" 1', fontWeight: 900, fontSize: 150, color: C.indigo}}>
          {Array.from('基礎がある人は、').map((ch, i) => (
            <span key={i} data-ch="1" style={{display: 'inline-block', position: 'relative'}}>
              {ch}
              {/* 足した 7 文字を、一字ずつ数える印（字は動かさない） */}
              {i < 7 ? <span style={{position: 'absolute', left: '10%', width: '80%', bottom: -20, height: 10, background: C.indigo, transformOrigin: '0 50%', transform: `scaleX(${outExpo(prog(T, 9.55 + i * 0.085, 9.8 + i * 0.085))})`}} /> : null}
            </span>
          ))}
        </div>
      ) : null}
    </G>
  );
};
// 「誰でも」は 01 の行から抜けて、02 の輪の中心の語になる
const Daredemo: React.FC<P> = ({T}) => {
  const end = S['02'] + 11.55;
  if (T > end + 0.6) return null;
  const {lineY, tx, gs} = c01(T);
  const m = inOut(prog(T, tx, tx + 0.7));
  const xa = X0 - WA / 2 + 19;
  // 行の中央（拡縮の中心）を、01 の行の位置から 02 の輪の中心へ運ぶ
  const cx = lerp(960 + (xa - 960) * gs, 960, m);
  const cy = lerp(540 + (lineY + BIG / 2 - 540) * gs, 540, m);
  const s = lerp(gs, 130 / BIG, m) * (1 + 0.012 * Math.max(0, T - S['02']));
  return <Line t={T} text="誰でも" x={cx} y={cy - BIG / 2} size={BIG} anchor="c" t0={0.3} t1={end} s={s} mv={m > 0 && m < 1} />;
};

// ---- 02: 広がる範囲と、止める輪 ----
const Tag: React.FC<{text: string; x: number; y: number; k: number; mv?: boolean}> = ({text, x, y, k, mv}) =>
  k <= 0.001 ? null : (
    <div data-mv={mv ? '1' : undefined} style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${lerp(1.4, 1, k)})`, opacity: clamp(k * 3), background: C.paper, padding: '8px 20px', whiteSpace: 'nowrap', lineHeight: 1, fontFamily: F.g, fontFeatureSettings: '"palt" 1', fontWeight: 700, fontSize: 52, color: C.gray}}>
      {Array.from(text).map((ch, i) => (
        <span key={i} data-ch="box" style={{display: 'inline-block'}}>
          {ch}
        </span>
      ))}
    </div>
  );
const C02: React.FC<P> = ({T, cam}) => {
  const t = T - S['02'];
  if (t < -0.5 || t > DUR['02'] + 0.4) return null;
  const sh = shift('02', T);
  return (
    <G dx={sh.dx} dy={sh.dy} mv={sh.mv}>
      {SCOPE.map((s, i) => {
        const r = scopeR(i, t);
        const a = (s.ang * Math.PI) / 180;
        const p = project(cam, O.c2[0] + r * Math.cos(a), O.c2[1] + r * Math.sin(a), 0);
        return <Tag key={i} text={s.label} x={p.x} y={p.y} k={E_SLAM(prog(t, s.t0 + 0.1, s.t0 + 0.55))} mv={t > 6.6} />;
      })}
      <G s={1 + 0.02 * Math.max(0, t - STOP2.b)}>
        <Slam T={T} id="02" text="基礎は、要る。" x={960} y={540 - 50} size={100} color={C.indigo} anchor="c" t0={STOP2.b + 0.02} s0={1.22} r0={0} grow={0} />
      </G>
    </G>
  );
};

// ---- 03: 簡単にするのはよい。前提を決める ----
const C03: React.FC<P> = ({T, cam}) => {
  const t = T - S['03'];
  if (t < -0.4 || t > DUR['03'] + 0.4) return null;
  const sh = shift('03', T);
  const o = O.c3;
  return (
    <G dx={sh.dx} dy={sh.dy} mv={sh.mv}>
      <Fig cam={cam} o={o} x={BARS3.x} y={BARS3.y} w={t < 2 ? BARS3.w0 : BARS3.w[0]} h={BARS3.pitch * 3 + BARS3.h} fly={t > 5.4 && t < 8.8} />
      {t > LINE3.t0 + 0.3 ? <Fig cam={cam} o={o} x={LINE3.x} y={LINE3.y} w={LINE3.w} h={LINE3.h} /> : null}
      {t > HARD3.t0 + 0.4 ? <Fig cam={cam} o={o} x={HARD3.x} y={HARD3.y} w={HARD3.w} h={HARD3.h} /> : null}
      <Slam T={T} id="03" text="簡単に、する。" x={1000} y={345} size={120} t0={2.3} out={5.4} outY={-1000} from={[500, 0]} v={-5} />
      <Slam T={T} id="03" text="前提を、決める。" x={950} y={440} size={120} color={C.indigo} t0={8.78} from={[0, -420]} r0={0} v={3} grow={0.006} />
      <L T={T} id="03" text="まだ、簡単に解けない問題も。" x={945} y={150} size={44} weight={700} color={C.gray} t0={10.9} dir="right" />
    </G>
  );
};

// ---- 04: 言葉だけの依頼と、答え ----
const C04: React.FC<P> = ({T}) => {
  const t = T - S['04'];
  if (t < -0.4 || t > DUR['04'] + 0.4) return null;
  const sh = shift('04', T);
  const k = inOut(prog(t, 6.9, 7.5));
  const QS = 130;
  return (
    <G dx={sh.dx} dy={sh.dy} mv={sh.mv}>
      <G ox={140} oy={300} s={lerp(1, 0.4, k)} dx={drift(T, S['04'] + 1, 7) * (1 - k)} dy={-196 * k} mv={k > 0 && k < 1}>
        {/* 写しは、写すたびに薄く小さくなる（形だけが増える） */}
        {[0, 1, 2, 3, 4, 5].map((i) => {
          const x = 1050 + (i % 2) * 372;
          const y = 250 + Math.floor(i / 2) * 170 + (i % 2) * 40;
          const sz = 54 - i * 3;
          const t0 = 3.25 + i * 0.5;
          return (
            <React.Fragment key={i}>
              <L T={T} id="04" text="お前のコピーを" x={x} y={y} size={sz} weight={700} color={C.gray2} o={0.8 - i * 0.12} t0={t0} t1={6.5 + i * 0.04} dir="right" stagger={0.015} box />
              <L T={T} id="04" text="作れないか。" x={x} y={y + sz * 1.25} size={sz} weight={700} color={C.gray2} o={0.8 - i * 0.12} t0={t0 + 0.08} t1={6.5 + i * 0.04} dir="right" stagger={0.015} box />
            </React.Fragment>
          );
        })}
        <L T={T} id="04" text="お前のコピーを" x={140} y={300} size={QS} color={C.gray} t0={1.0} dir="right" />
        <L T={T} id="04" text="作れないか。" x={140} y={462} size={QS} color={C.gray} t0={2.3} dir="right" />
      </G>
      <G ox={140} oy={640} s={1 + 0.012 * Math.max(0, t - 9.6)}>
        <Slam T={T} id="04" text="同じ力は、" x={140} y={440} size={170} t0={8.1} from={[1100, 0]} r0={0} s0={1.25} grow={0} v={-6} />
        <Slam T={T} id="04" text="すぐ渡らない。" x={140} y={645} size={170} t0={9.2} from={[1100, 0]} r0={0} s0={1.25} grow={0} v={-6} />
      </G>
    </G>
  );
};

// ---- 05: 隠さない。責務は引き受ける。時間を含めて考える ----
const C05: React.FC<P> = ({T, cam}) => {
  const t = T - S['05'];
  if (t < -0.4 || t > DUR['05'] + 0.4) return null;
  const sh = shift('05', T);
  const top = COL5.base - 106 - lift5(2, t) * COL5.pitch - 20;
  return (
    <G dx={sh.dx} dy={sh.dy} mv={sh.mv}>
      {t > COL5.arrive + 1.1 ? <Fig cam={cam} o={O.c5} x={COL5.x[0]} y={top} w={COL5.x[2] + COL5.w - COL5.x[0]} h={COL5.base - top} /> : null}
      <L T={T} id="05" text="隠すわけでは、ない。" x={140} y={190} size={124} t0={0.75} t1={8.35} v={6} />
      <L T={T} id="05" text="責務は、引き受ける。" x={140} y={365} size={84} weight={700} t0={6.2} t1={8.4} v={-4} dir="right" />
      <L T={T} id="05" text="時間" x={1548} y={110} size={260} t0={8.72} vertical dir="up" stagger={0.12} dur={0.6} dy={-drift(T, S['05'] + 8.72, 3)} />
      <Slam T={T} id="05" text="含めて、考える。" x={140} y={200} size={124} t0={11.1} from={[-900, 0]} r0={0} s0={1.2} v={5} grow={0.004} />
    </G>
  );
};

// ---- 06: 人を丸ごとか、この領域か ----
const C06: React.FC<P> = ({T, cam}) => {
  const t = T - S['06'];
  if (t < -0.4 || t > DUR['06'] + 0.5) return null;
  const sh = shift('06', T);
  const out = DUR['06'] - 0.5;
  return (
    <G dx={sh.dx} dy={sh.dy} mv={sh.mv}>
      {t < SEG6.shrink[1] ? <Fig cam={cam} o={O.c6} x={-400} y={SEG6.y - 34} w={2700} h={40} /> : <Fig cam={cam} o={O.c6} x={SEG6.a - 6} y={SEG6.y - 140} w={SEG6.b - SEG6.a + 12} h={186} />}
      <L T={T} id="06" text="どの領域で、" x={140} y={170} size={110} t0={1.15} t1={5.0} v={5} />
      <L T={T} id="06" text="何が、できるか。" x={140} y={318} size={110} t0={2.55} t1={5.05} v={-4} dir="right" />
      <Slam T={T} id="06" text="人を、丸ごと？" x={140} y={215} size={150} t0={5.4} out={9.3} outX={-1400} from={[0, -400]} v={6} />
      <Slam T={T} id="06" text="この領域なら、" x={140} y={180} size={120} color={C.indigo} t0={9.88} out={out} outY={-600} from={[-700, 0]} r0={0} v={4} />
      <Slam T={T} id="06" text="一部で、よい。" x={140} y={800} size={110} t0={10.95} out={out} outY={500} from={[-700, 0]} r0={0} v={-4} />
    </G>
  );
};

// ---- 07: 同じ基準線の上で、採用し、育てる ----
const C07: React.FC<P> = ({T, cam}) => {
  const t = T - S['07'];
  if (t < 0 || t > DUR['07'] + 0.4) return null;
  const sh = shift('07', T);
  const o = O.c6;
  const ly = project(cam, o[0], o[1] + wy(lineY7(t)), 0).y;
  return (
    <G dx={sh.dx} dy={sh.dy} mv={sh.mv}>
      <Fig cam={cam} o={o} x={130} y={lineY7(t) - 6} w={1660} h={12} />
      <L T={T} id="07" text="基準を満たした人なら" x={140} y={235} size={96} color={C.indigo} t0={0.5} t1={4.1} v={5} />
      <L T={T} id="07" text="誰でもできる。" x={140} y={372} size={170} t0={1.72} t1={4.15} v={-4} />
      <Slam T={T} id="07" text="採用する。" x={140} y={ly - 150 - 40} size={150} t0={4.5} from={[0, -460]} r0={0} s0={1.2} grow={0} />
      {/* 基準の中身（声の「知識や技能」）。線の上に置き、線と一緒に上がる */}
      <Slam T={T} id="07" text="知識" x={1180} y={ly - 84 - 34} size={84} color={C.indigo} weight={700} t0={6.3} out={12.6} outY={-700} from={[0, -300]} r0={0} s0={1.2} grow={0} />
      <Slam T={T} id="07" text="技能" x={1440} y={ly - 84 - 34} size={84} color={C.indigo} weight={700} t0={6.88} out={12.7} outY={-700} from={[0, -300]} r0={0} s0={1.2} grow={0} />
      <L T={T} id="07" text="力も、変わる。" x={1150} y={ly + 78} size={64} weight={700} color={C.gray} t0={10.95} dir="down" />
      <Slam T={T} id="07" text="育てる。" x={1780} y={ly - 150 - 40} size={150} color={C.indigo} anchor="r" t0={15.28} from={[0, -460]} r0={0} s0={1.2} grow={0} />
    </G>
  );
};

// ---- 08: 基礎の共有も、属人化をなくす ----
const C08: React.FC<P> = ({T, cam}) => {
  const t = T - S['08'];
  if (t < -0.4 || t > DUR['08'] + 0.5) return null;
  const sh = shift('08', T);
  const o = O.c8;
  const out = DUR['08'] - 0.4;
  const e = PL8.one;
  return (
    <G dx={sh.dx} dy={sh.dy} mv={sh.mv}>
      {t < PL8.merge[0] ? (
        <>
          <Fig cam={cam} o={o} {...PL8.gray} />
          {t > 3 ? <Fig cam={cam} o={o} {...PL8.ind} /> : null}
        </>
      ) : (
        <Fig cam={cam} o={o} x={e.x - 80} y={e.y - 80} w={e.w + 80 + (t > PL8.line ? 190 : 0)} h={e.h + 80} fly={t < PL8.merge[1]} />
      )}
      <L T={T} id="08" text="技術だけでは、" x={680} y={280} size={80} weight={700} color={C.gray} t0={0.9} t1={6.9} v={4} />
      <Slam T={T} id="08" text="業務の知識。" x={840} y={625} size={130} t0={2.9} out={6.9} outX={1400} from={[0, 500]} r0={0} v={-4} />
      <L T={T} id="08" text="すぐできる、だけが方法ではない。" x={860} y={500} size={58} weight={700} color={C.gray} t0={7.5} t1={10.4} v={5} dir="right" />
      <Slam T={T} id="08" text="基礎の共有も、" x={945} y={385} size={100} color={C.indigo} t0={10.9} out={out} outX={1300} from={[500, 0]} r0={0} v={3} />
      <Slam T={T} id="08" text="属人化をなくす。" x={945} y={560} size={110} t0={13.85} out={out} outX={1300} from={[500, 0]} r0={0} v={3} />
    </G>
  );
};

// ---- 09: 尊重と引き継ぎは両立する。基礎がある人なら、誰でもできる。機会を用意する ----
const C09: React.FC<P> = ({T, cam}) => {
  const t = T - S['09'];
  if (t < -0.2) return null;
  const tt = S['09'];
  const near = 40 * inOut(prog(t, 5.2, 5.9));
  const k = prog(t, 7.38, 7.7);
  const drop = -700 * (1 - k * k) - 14 * Math.abs(damped(t, 7.7, 1, 2.6, 7));
  const bigY = lerp(330, 455, inOut(prog(t, 7.4, 7.7))) + 18 * damped(t, 7.7, 1, 2.6, 7);
  const gs = 1 + 0.05 * pulse(t, 9.14, 5) + 0.006 * Math.max(0, t - 9.5) + 0.07 * inOut(prog(t, 15.2, 17.6));
  const ring = project(cam, O.c8[0] + wx(RING9.x), O.c8[1] + wy(RING9.y), 0);
  return (
    <G>
      {t > 11.4 ? <div data-fig="1" style={{position: 'absolute', left: ring.x - 34, top: ring.y - 34, width: 68, height: 68}} /> : null}
      <Line t={T} text="努力を、尊重する。" x={140} y={480} size={100} t0={tt + 0.9} t1={tt + 6.3} dir="right" dx={near + 10 * Math.max(0, t - 1.2)} />
      <Line t={T} text="引き継ぐ。" x={1780} y={470} size={120} anchor="r" t0={tt + 3.9} t1={tt + 6.35} dir="left" dx={-near - 10 * Math.max(0, t - 4.2)} />
      <G s={gs} oy={400}>
        <Line t={T} text="誰でもできる。" x={960} y={bigY} size={200} anchor="c" t0={tt + 6.75} dur={0.45} />
        {t >= 7.38 ? <Txt text="基礎がある人なら、" x={960} y={262 + drop} size={130} color={C.indigo} anchor="c" mv={t < 7.7} /> : null}
      </G>
      <L T={T} id="09" text="努力を、尊重する。" x={140} y={848} size={60} weight={700} color={C.gray} t0={10.3} v={7} dir="right" />
      <Slam T={T} id="09" text="機会を、用意する。" x={1780} y={830} size={92} anchor="r" t0={12.58} from={[600, 0]} r0={0} s0={1.3} grow={0.003} v={-7} />
    </G>
  );
};

// 語の層全体にも、図のカメラと同じゆっくりした揺り戻しを掛ける（読む間も画面を止めない。字形は変えない）
export const Type: React.FC<P> = (p) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '960px 540px', transform: `translate(${9 * wobble(p.T, 11, 6.1)}px, ${6 * wobble(p.T, 12, 4.7)}px) rotate(${0.3 * wobble(p.T, 13, 7.3)}deg) scale(${1.014 + 0.012 * wobble(p.T, 14, 8.9)})`}}>
    <C01 {...p} />
    <Daredemo {...p} />
    <C02 {...p} />
    <C03 {...p} />
    <C04 {...p} />
    <C05 {...p} />
    <C06 {...p} />
    <C07 {...p} />
    <C08 {...p} />
    <C09 {...p} />
  </div>
);
