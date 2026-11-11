// 文字の層（DOM）。画面の語（Type）、床に描いた数字と札（Floor）、色の面（Under / Over）。
import React from 'react';
import {CamS, SX, project, quadMatrix} from './cam';
import {C, F, H, Line, LineP, Plate, Txt, TxtP, W, clamp, in3, inOut, kv, lerp, mix, out3, outBack, outExpo, prog, slam, sstep} from './kit';
import {GH, L, LANE_B, glassAt} from './score';
import {S} from './timeline';
import {TypeB, FloorB, UnderB, OverB} from './typeB';

// 語の塊の着地
type SlO = Parameters<typeof slam>[2];
export const Sl: React.FC<Omit<TxtP, 's' | 'r' | 'o' | 'mv'> & {t: number; t0: number; so?: SlO}> = ({t, t0, so, x, y, ...p}) => {
  const s = slam(t, t0, so);
  return <Txt {...p} x={x + s.dx} y={y + s.dy} s={s.s} r={s.r} o={s.o} mv={s.mv} />;
};
// 読む間、行ごと流す量（px）
export const drift = (t: number, t0: number, v: number) => Math.max(0, t - t0) * v;
const Ln: React.FC<LineP & {v?: number}> = ({v = 0, ...p}) => <Line {...p} dx={(p.dx ?? 0) + drift(p.t, p.t0, v)} />;
export {Ln};

// 床に描いた文字（目盛りの数字・帯の札）。DOM のまま、床の四角へ写す
export const FloorLabel: React.FC<{cam: CamS; text: string; x: number; z: number; h: number; color?: string; font?: 'g' | 'm'; o?: number; anchor?: 'l' | 'c' | 'r'; weight?: number; em?: number}> = ({cam, text, x, z, h, color = C.ink, font = 'g', o = 1, anchor = 'c', weight, em = 1}) => {
  if (o <= 0.01) return null;
  const n = Array.from(text).length * em;
  const fs = 200;
  const wp = n * fs;
  const ww = n * h;
  const x0 = anchor === 'c' ? x - ww / 2 : anchor === 'r' ? x - ww : x;
  const pts = [project(cam, x0, 0, z), project(cam, x0 + ww, 0, z), project(cam, x0 + ww, 0, z + h), project(cam, x0, 0, z + h)];
  if (pts.some((p) => p.w < 0.4)) return null;
  const m = quadMatrix(wp, fs, pts);
  if (!m) return null;
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: wp, height: fs, transformOrigin: '0 0', transform: m, fontSize: fs, lineHeight: 1, textAlign: anchor === 'c' ? 'center' : anchor === 'r' ? 'right' : 'left', color, opacity: o, fontFamily: F[font], fontWeight: weight ?? (font === 'g' ? 900 : 400), whiteSpace: 'nowrap', fontFeatureSettings: '"palt" 1'}}>{text}</div>
  );
};

// グラスの画面上の外接（検査用の見えない図）と、写真の四隅の印
export function glassRect(cam: CamS, T: number) {
  const g = glassAt(T);
  if (g.s < 0.3) return null;
  const a = project(cam, g.x - 1.05, g.y, g.z);
  const b = project(cam, g.x + 1.05, g.y + 3.7, g.z);
  if (a.w < 0.5) return null;
  return {x: a.x, y: b.y, w: b.x - a.x, h: a.y - b.y};
}
const Crop: React.FC<{r: {x: number; y: number; w: number; h: number}; k: number; pad?: number; color?: string}> = ({r, k, pad = 50, color = C.ink}) => {
  if (k <= 0.001) return null;
  const e = (1 - outBack(clamp(k))) * 130;
  const x0 = r.x - pad - e;
  const y0 = r.y - pad - e;
  const x1 = r.x + r.w + pad + e;
  const y1 = r.y + r.h + pad + e;
  const n = 70;
  const b = `7px solid ${color}`;
  const c: React.CSSProperties = {position: 'absolute', width: n, height: n, opacity: clamp(k * 4)};
  return (
    <>
      <div style={{...c, left: x0, top: y0, borderLeft: b, borderTop: b}} />
      <div style={{...c, left: x1 - n, top: y0, borderRight: b, borderTop: b}} />
      <div style={{...c, left: x0, top: y1 - n, borderLeft: b, borderBottom: b}} />
      <div style={{...c, left: x1 - n, top: y1 - n, borderRight: b, borderBottom: b}} />
    </>
  );
};
const Star: React.FC<{x: number; y: number; s: number; color?: string}> = ({x, y, s, color = C.gold}) =>
  s <= 0.01 ? null : (
    <svg width={120} height={120} viewBox="-60 -60 120 120" style={{position: 'absolute', left: x - 60, top: y - 60, transform: `scale(${s}) rotate(${s * 40}deg)`}}>
      <path d="M0,-56 C6,-14 14,-6 56,0 C14,6 6,14 0,56 C-6,14 -14,6 -56,0 C-14,-6 -6,-14 0,-56Z" fill={color} stroke={C.ink} strokeWidth={3.5} strokeLinejoin="round" />
    </svg>
  );

// ---- 画面の下に敷く面 ----
export const Under: React.FC<{T: number}> = ({T}) => {
  const b = L('02', T);
  const c = L('03', T);
  return (
    <>
      {/* 02: 氷まで、画面まで、同じ緑 */}
      <Plate x={0} y={0} w={W} h={H} color={C.green} from="b" k={inOut(prog(b, 7.75, 8.5))} k2={in3(prog(c, 0.0, 0.7))} />
      <UnderB T={T} />
    </>
  );
};
export const greenK = (T: number) => inOut(prog(L('02', T), 7.75, 8.5)) * (1 - prog(L('03', T), 0, 0.5));

// ---- 床の文字（図の層の下） ----
export const Floor: React.FC<{T: number; cam: CamS}> = ({T, cam}) => {
  const c = L('03', T);
  const d = L('04', T);
  const e = L('05', T);
  const f = L('06', T);
  const on = T >= S['03'] && T < S['06'] + 1;
  const num = (v: number, o: number, col = C.ink, z = 1.25, h = 1.9) => <FloorLabel key={`${v}-${z}`} cam={cam} text={String(v)} x={SX(v) + (v === 100 ? 0.75 : v === 90 ? -0.15 : 0)} z={z} h={h} color={col} o={o} em={0.62} />;
  const out6 = 1 - sstep(f, 0, 0.7);
  return (
    <>
      {on ? (
        <>
          {num(0, sstep(c, 1.2, 1.8) * out6)}
          {num(100, sstep(c, 0.5, 1.1) * out6)}
          {num(70, sstep(d, 0.2, 0.7) * out6, C.ai)}
          {num(90, sstep(d, 4.6, 5.2) * out6, C.ai)}
          {num(80, sstep(e, 5.3, 5.6) * (1 - sstep(e, 12.3, 12.7)) * 0.9, C.ai, 1.25, 1.2)}
          <FloorLabel cam={cam} text="どこまで、任せる？" x={0} z={4.0} h={1.5} font="m" color={C.ai} o={sstep(c, 1.3, 2.0) * (1 - sstep(c, 3.3, 3.7))} />
          {/* 05: 帯の札 */}
          <FloorLabel cam={cam} text="実物" x={SX(35)} z={-1.9} h={1.1} color={C.ink} o={sstep(e, 3.3, 3.8) * out6} />
          <FloorLabel cam={cam} text="AI" x={SX(80)} z={-1.9} h={1.1} color={C.blue} o={sstep(e, 5.6, 6.0) * out6} em={0.7} />
          <FloorLabel cam={cam} text="AI" x={SX(35)} z={LANE_B - 1.9} h={1.1} color={C.blue} o={sstep(e, 9.9, 10.4) * out6} em={0.7} />
          <FloorLabel cam={cam} text="自分で" x={SX(85)} z={LANE_B - 1.9} h={1.1} color={C.ink} o={sstep(e, 11.5, 12.0) * out6} />
          {num(0, sstep(e, 9.2, 9.8) * (1 - sstep(e, 12.3, 12.7)), C.ink, LANE_B + 1.25, 1.6)}
          {num(70, sstep(e, 9.6, 10.2) * (1 - sstep(e, 12.3, 12.7)), C.ink, LANE_B + 1.25, 1.6)}
          {num(100, sstep(e, 11.4, 12.0) * (1 - sstep(e, 12.3, 12.7)), C.ink, LANE_B + 1.25, 1.6)}
        </>
      ) : null}
      <FloorB T={T} cam={cam} />
    </>
  );
};

// ---- 図の上・文字の下 ----
export const Over: React.FC<{T: number; cam: CamS}> = ({T, cam}) => {
  const b = L('02', T);
  const d = L('04', T);
  const gr = glassRect(cam, T);
  const sweep = prog(b, 9.5, 10.6);
  const sw4 = prog(d, 2.5, 3.5);
  return (
    <>
      {gr ? <div data-fig="1" style={{position: 'absolute', left: gr.x + gr.w * 0.12, top: gr.y + gr.h * 0.05, width: gr.w * 0.76, height: gr.h * 0.92}} /> : null}
      {/* 02: 写真の四隅 */}
      {gr && T < S['03'] ? <Crop r={gr} k={prog(b, 0.75, 1.15) * (1 - prog(b, 6.2, 6.5))} /> : null}
      {/* 02: ゼリーのつや（画面ごと） */}
      {sweep > 0 && sweep < 1 ? <div style={{position: 'absolute', left: lerp(-700, W + 200, inOut(sweep)), top: -300, width: 380, height: H + 600, transform: 'rotate(18deg)', background: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.55) 45%, rgba(255,255,255,0.75) 55%, rgba(255,255,255,0) 100%)'}} /> : null}
      {/* 04: 実物を撮る（四隅）、光を足す */}
      {gr && T >= S['04'] && T < S['05'] ? <Crop r={gr} k={prog(d, 1.25, 1.6) * (1 - prog(d, 2.4, 2.7))} /> : null}
      {sw4 > 0 && sw4 < 1 && gr ? <div style={{position: 'absolute', left: lerp(gr.x - 500, gr.x + gr.w + 200, inOut(sw4)), top: gr.y - 200, width: 260, height: gr.h + 400, transform: 'rotate(16deg)', background: `linear-gradient(90deg, rgba(244,181,50,0) 0%, rgba(255,226,150,0.7) 50%, rgba(244,181,50,0) 100%)`}} /> : null}
      {gr && T >= S['04'] && T < S['05']
        ? [
            [0.02, 0.22, 2.9, 1.0],
            [0.98, 0.1, 3.15, 0.75],
            [1.06, 0.62, 3.4, 0.6],
            [-0.08, 0.7, 3.6, 0.5],
          ].map(([fx, fy, t0, sz], i) => {
            const life = d - t0;
            const tw = 0.75 + 0.25 * Math.sin(d * 5 + i * 2);
            const s = life < 0 ? 0 : outBack(clamp(life * 3.5)) * sz * tw;
            return <Star key={i} x={gr.x + gr.w * fx} y={gr.y + gr.h * fy} s={s} />;
          })
        : null}
      <OverB T={T} cam={cam} />
    </>
  );
};

// ---- 画面の語 ----
export const Type: React.FC<{T: number; cam: CamS}> = ({T, cam}) => {
  const a = L('01', T);
  const b = L('02', T);
  const c = L('03', T);
  const d = L('04', T);
  const e = L('05', T);
  const gk = greenK(T);
  const onG = (col: string) => mix(col, C.white, gk);
  return (
    <>
      {/* 01: なんか、気持ち悪い。 */}
      {T < S['02'] + 0.6 ? (
        <>
          <Ln t={a} text="なんか、" x={150} y={250} size={120} font="m" color={C.gray} t0={1.85} t1={6.45} v={14} />
          <Sl t={a} t0={2.75} text="気持ち悪い。" x={132} y={400} size={212} so={{s: 2.4, r: -7, x: -60, y: 60, out: 6.5, outX: -1800}} ls={-0.02} />
        </>
      ) : null}
      {/* 02: 氷まで、同じ緑。 */}
      {T >= S['02'] && T < S['03'] + 0.8 ? (
        <>
          <Ln t={b} text="一部店舗の、フロート。" x={150} y={742} size={58} font="m" color={C.gray} t0={0.95} t1={4.5} v={-8} />
          <Ln t={b} text="メニューの画像。" x={146} y={830} size={96} t0={1.2} t1={4.6} v={10} />
          <Ln t={b} text="生成AIで、作られた。" x={146} y={830} size={96} t0={5.0} t1={6.45} v={10} />
          <Sl t={b} t0={6.8} text="氷まで、" x={150} y={160} size={176} color={onG(C.ink)} so={{s: 1.7, r: 4, y: -80, out: 11.55, outY: -1200}} />
          <Sl t={b} t0={8.35} text="同じ緑。" x={130} y={370} size={300} color={C.white} so={{s: 2.6, r: -6, x: -80, y: 120, out: 11.5, outY: -1400}} ls={-0.02} />
          <Ln t={b} text="ゼリーのような、つや。" x={150} y={800} size={92} weight={700} color={C.white} t0={10.0} t1={11.4} v={16} />
        </>
      ) : null}
      {/* 03: 品質は上がった。それでも 0 から 100 は、崩れる。 */}
      {T >= S['03'] && T < S['04'] + 0.6 ? (
        <>
          <Ln t={c} text="品質は、上がった。" x={W / 2} y={120} size={104} font="m" color={C.gray} anchor="c" t0={0.7} t1={3.3} v={-12} />
          <Sl t={c} t0={5.55} text="ゼロから、" x={150} y={100} size={132} so={{s: 1.6, x: -500, r: 0, out: 7.9, outX: -1700}} />
          <Sl t={c} t0={6.45} text="すべてを、" x={150} y={250} size={132} so={{s: 1.6, x: -500, r: 0, out: 7.92, outX: -1700}} />
          <Sl t={c} t0={7.2} text="生成。" x={150} y={400} size={132} so={{s: 1.6, x: -500, r: 0, out: 7.94, outX: -1700}} />
          <Ln t={c} text="0から100は、" x={156} y={84} size={92} t0={8.2} t1={9.72} v={12} />
          <Sl t={c} t0={8.12} text="崩れる。" x={132} y={262} size={330} so={{s: 2.6, r: -9, r1: -3, y: 100, out: 9.75, outX: 2300}} ls={-0.03} />
        </>
      ) : null}
      {/* 04: 実物を撮る。光を足す。70 から、90 へ。 */}
      {T >= S['04'] && T < S['05'] + 0.6 ? (
        <>
          <Ln t={d} text="実物を、撮る。" x={150} y={250} size={128} t0={1.2} t1={4.25} v={10} />
          <Ln t={d} text="光を、足す。" x={150} y={430} size={128} t0={2.65} t1={4.35} v={-10} />
          <Ln t={d} text="70から、" x={156} y={150} size={112} color={C.ai} t0={5.0} t1={9.25} v={10} />
          <Sl t={d} t0={6.25} text="90へ。" x={132} y={292} size={330} color={C.ai} so={{s: 2.4, r: 6, r1: 0, x: 200, out: 9.32, outY: -1300}} ls={-0.02} />
          <Ln t={d} text="形は、崩れない。" x={156} y={690} size={76} weight={700} t0={7.1} t1={9.2} v={-8} />
        </>
      ) : null}
      {/* 05: 丸投げしない。濃淡。 */}
      {T >= S['05'] && T < S['06'] + 0.6 ? (
        <>
          <Ln t={e} text="丸投げ、" x={150} y={110} size={120} t0={1.3} t1={2.75} />
          <Sl t={e} t0={1.7} text="しない。" x={136} y={250} size={250} so={{s: 2.2, r: -5, y: 60, out: 2.85, outX: -1900}} />
          <Ln t={e} text="70を渡して、90へ。" x={150} y={104} size={112} color={C.ai} t0={5.3} t1={8.5} v={10} />
          <Ln t={e} text="残りは、自分で。" x={150} y={104} size={112} t0={11.0} t1={12.5} v={10} />
          <Ln t={e} text="この" x={160} y={76} size={84} color={C.ai} t0={12.85} t1={16.5} v={6} />
          <Sl t={e} t0={13.35} text="濃淡。" x={128} y={214} size={390} color={C.ai} so={{s: 2.2, r: -8, r1: -3, x: -100, y: 80, out: 16.55, outX: -2300}} ls={-0.02} />
          <Ln t={e} text="仕上がりを、左右する。" x={160} y={672} size={68} weight={700} t0={14.4} t1={16.4} v={-10} />
        </>
      ) : null}
      <TypeB T={T} cam={cam} />
    </>
  );
};
export const _u = [GH, kv, out3, outExpo];
