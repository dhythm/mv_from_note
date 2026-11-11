// 後半の文字の層（06〜12）
import React from 'react';
import {CamS, SX, project} from './cam';
import {C, E_SLAM, H, Line, Plate, Txt, W, clamp, in3, inOut, lerp, outBack, prog, slam, sstep} from './kit';
import {L, glassAt} from './score';
import {FZ} from './sets';
import {S} from './timeline';
import {FloorLabel, Ln, Sl, drift} from './type';

type P = {T: number; cam: CamS};

export const UnderB: React.FC<{T: number}> = () => null;

export const FloorB: React.FC<P> = ({T, cam}) => {
  const k = L('11', T);
  const l = L('12', T);
  return (
    <>
      {T >= S['06'] && T < S['07'] ? <FloorLabel cam={cam} text="0" x={SX(0)} z={1.25} h={2.1} em={0.62} o={sstep(L('06', T), 0.3, 0.8) * (1 - sstep(L('06', T), 12.6, 13.1))} /> : null}
      {T >= S['11'] && T < S['12'] ? (
        <>
        </>
      ) : null}
      {T >= S['12'] ? (
        <>
          <FloorLabel cam={cam} text="実物" x={SX(35)} z={1.15} h={0.7} o={sstep(l, 0.3, 0.8)} />
          <FloorLabel cam={cam} text="AI" x={SX(80)} z={1.15} h={0.7} em={0.7} color={C.blue} o={sstep(l, 0.3, 0.8)} />
          <FloorLabel cam={cam} text="人の手" x={SX(95)} z={1.15} h={0.64} o={sstep(l, 2.7, 3.0)} />
          {[0, 70, 90, 100].map((v) => (
            <FloorLabel key={v} cam={cam} text={String(v)} x={SX(v) + (v === 100 ? 0.12 : v === 90 ? -0.1 : 0)} z={2.15} h={v === 100 ? 1.08 : 1.25} em={0.62} color={v === 70 || v === 90 ? C.ai : C.ink} o={sstep(l, 0.3, 0.8)} />
          ))}
        </>
      ) : null}
    </>
  );
};

const Star: React.FC<{x: number; y: number; s: number}> = ({x, y, s}) =>
  s <= 0.01 ? null : (
    <svg width={120} height={120} viewBox="-60 -60 120 120" style={{position: 'absolute', left: x - 60, top: y - 60, transform: `scale(${s}) rotate(${s * 40}deg)`}}>
      <path d="M0,-56 C6,-14 14,-6 56,0 C14,6 6,14 0,56 C-6,14 -14,6 -56,0 C-14,-6 -6,-14 0,-56Z" fill={C.gold} stroke={C.ink} strokeWidth={3.5} strokeLinejoin="round" />
    </svg>
  );

export const OverB: React.FC<P> = ({T, cam}) => {
  const k = L('11', T);
  const l = L('12', T);
  const out: React.ReactNode[] = [];
  if (T >= S['11'] && T < S['12']) {
    // 11: シャッターを切った一枚（四隅の印）
    const a = project(cam, -2.4 - 1.8, 0.2, FZ);
    const b = project(cam, -2.4 + 1.8, 2.9, FZ);
    const kk = prog(k, 1.0, 1.35) * (1 - prog(k, 2.6, 2.9));
    if (kk > 0 && a.w > 0.5) {
      const e = (1 - outBack(clamp(kk))) * 120;
      const n = 60;
      const bd = `7px solid ${C.ink}`;
      const x0 = a.x - 30 - e;
      const x1 = b.x + 30 + e;
      const y0 = b.y - 30 - e;
      const y1 = a.y + 30 + e;
      out.push(
        <React.Fragment key="crop">
          <div style={{position: 'absolute', left: x0, top: y0, width: n, height: n, borderLeft: bd, borderTop: bd}} />
          <div style={{position: 'absolute', left: x1 - n, top: y0, width: n, height: n, borderRight: bd, borderTop: bd}} />
          <div style={{position: 'absolute', left: x0, top: y1 - n, width: n, height: n, borderLeft: bd, borderBottom: bd}} />
          <div style={{position: 'absolute', left: x1 - n, top: y1 - n, width: n, height: n, borderRight: bd, borderBottom: bd}} />
        </React.Fragment>,
      );
    }
    // 検査用: 残る額の外接
    if (a.w > 0.5 && k > 0.8) out.push(<div key="ff" data-fig="1" style={{position: 'absolute', left: a.x, top: b.y, width: b.x - a.x, height: a.y - b.y}} />);
  }
  if (T >= S['12']) {
    const g = glassAt(T);
    const a = project(cam, g.x - 1.05, 0, g.z);
    const b = project(cam, g.x + 1.05, 3.7, g.z);
    if (a.w > 0.5 && l > 4.8 && l < 9.8)
      [
        [-0.1, 0.2, 4.95, 1.0],
        [1.08, 0.08, 5.2, 0.8],
        [1.12, 0.6, 5.5, 0.6],
        [-0.12, 0.66, 5.8, 0.55],
      ].forEach(([fx, fy, t0, sz], i) => {
        const life = l - t0;
        const s = life < 0 ? 0 : outBack(clamp(life * 3.5)) * sz * (0.75 + 0.25 * Math.sin(l * 5 + i * 2)) * (1 - prog(l, 9.4, 9.7));
        out.push(<Star key={`s${i}`} x={a.x + (b.x - a.x) * fx} y={b.y + (a.y - b.y) * fy} s={s} />);
      });
  }
  return <>{out}</>;
};

export const TypeB: React.FC<P> = ({T, cam}) => {
  const f = L('06', T);
  const g = L('07', T);
  const h = L('08', T);
  const i = L('09', T);
  const j = L('10', T);
  const k = L('11', T);
  const l = L('12', T);
  return (
    <>
      {/* 06: 元がなければ生成するしかない。ゼロからだと、嘘が混ざる。 */}
      {T >= S['06'] && T < S['07'] + 0.6 ? (
        <>
          <Ln t={f} text="元がなければ、" x={150} y={120} size={100} font="m" color={C.gray} t0={0.6} t1={3.75} v={10} />
          <Ln t={f} text="生成するしかない。" x={150} y={256} size={100} font="m" color={C.gray} t0={1.7} t1={3.85} v={-8} />
          <Ln t={f} text="ゼロからだと、" x={152} y={80} size={80} t0={4.5} t1={9.9} v={8} />
          <Sl t={f} t0={6.3} text="嘘が混ざる。" x={130} y={216} size={224} so={{s: 2.3, r: 5, r1: -2, x: -80, y: 60, out: 10.0, outX: -2100, grow: 0.018}} ls={-0.02} />
          <Sl t={f} t0={10.6} text="並びが、デタラメ。" x={136} y={120} size={150} so={{s: 1.9, r: -5, r1: 2, y: -60, out: 12.85, outY: -700}} />
        </>
      ) : null}
      {/* 07: 楽を、するため。／質を、突き詰める。 */}
      {T >= S['07'] && T < S['08'] + 0.4 ? (
        <>
          <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '150px 1010px', transform: `scale(${lerp(1, 0.4, E_SLAM(prog(g, 4.0, 4.6)))})`}}>
            <Ln t={g} text="楽を、" x={146} y={200} size={270} font="m" color={C.gray} t0={0.75} t1={8.0} v={9} />
            <Ln t={g} text="するため。" x={150} y={520} size={180} font="m" color={C.gray} t0={1.4} t1={8.05} v={-7} />
          </div>
          <Plate x={640} y={0} w={W - 640} h={H} color={C.ai} from="r" k={E_SLAM(prog(g, 4.0, 4.55))} k2={in3(prog(g, 8.05, 8.4))} />
          <Line t={g} text="質を、" x={1470} y={106} size={262} color={C.white} vertical dir="down" t0={4.7} t1={7.95} dy={drift(g, 4.7, 9)} box />
          <Line t={g} text="突き詰める。" x={1010} y={100} size={146} color={C.white} vertical dir="up" t0={5.75} t1={8.0} dy={-drift(g, 5.75, 6) + 12} box />
        </>
      ) : null}
      {/* 08: 隅は、残る。仕上げは、人。 */}
      {T >= S['08'] && T < S['09'] + 0.6 ? (
        <>
          <Ln t={h} text="任せきりでは、" x={150} y={112} size={88} font="m" color={C.gray} t0={0.8} t1={2.75} v={10} />
          <Sl t={h} t0={2.95} text="隅は、残る。" x={132} y={150} size={230} so={{s: 2.2, r: -6, r1: -2, x: -60, y: 60, out: 4.75, outX: -2000}} ls={-0.02} />
          <Sl t={h} t0={6.05} text="仕上げは、人。" x={132} y={120} size={210} color={C.ai} so={{s: 2.2, r: 5, r1: 0, y: -60, out: 9.3, outX: -2200}} ls={-0.02} />
        </>
      ) : null}
      {/* 09: もうこれでいいや。短縮は悪くない。AIのせい、ではない。出した人の、問題。 */}
      {T >= S['09'] && T < S['10'] + 0.6 ? (
        <>
          {(() => {
            const st = slam(i, 1.3, {s: 3.4, r: -22, r1: -7, dur: 0.32, grow: 0.02});
            if (st.o <= 0 || i > 3.6) return null;
            const ex = in3(prog(i, 2.9, 3.45)) * 2300;
            return (
              <div data-fig="fly" style={{position: 'absolute', left: W / 2 - 540 + ex, top: 400, width: 1080, height: 250, transform: `rotate(${st.r}deg) scale(${st.s})`, border: `12px solid ${C.ink}`, borderRadius: 40, background: C.paper, boxSizing: 'border-box'}}>
                <Txt text="もうこれでいいや" x={516} y={56} size={114} anchor="c" box mv />
              </div>
            );
          })()}
          <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '1770px 1004px', transform: `scale(${lerp(1, 0.3, E_SLAM(prog(i, 5.6, 6.2)))})`}}>
            <Ln t={i} text="時間の短縮は、" x={150} y={330} size={112} font="m" color={C.gray} t0={3.15} t1={12.9} v={i < 5.6 ? 10 : 0} dx={i < 5.6 ? 0 : 24.5} />
            <Ln t={i} text="悪くない。" x={146} y={490} size={250} font="m" color={C.gray} t0={4.25} t1={12.95} v={i < 5.6 ? -8 : 0} dx={i < 5.6 ? 0 : -10.8} />
          </div>
          <Ln t={i} text="品質が低いのは、" x={152} y={150} size={100} weight={700} t0={6.3} t1={7.5} v={10} />
          <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '150px 96px', transform: `scale(${lerp(1, 0.4, E_SLAM(prog(i, 9.45, 10.0)))})`}}>
            <Ln t={i} text="AIのせい、" x={150} y={130} size={150} t0={7.7} t1={12.9} v={i < 9.45 ? 8 : 0} dx={i < 9.45 ? 0 : 14} />
            <Sl t={i} t0={8.6} text="ではない。" x={126} y={330} size={350} so={{s: 2.5, r: -7, r1: -2, y: 80, out: 12.92, outX: -5000, grow: i < 9.45 ? 0.035 : 0}} ls={-0.02} />
          </div>
          <Ln t={i} text="出した人の、" x={150} y={350} size={170} color={C.ai} t0={9.9} t1={12.9} v={8} />
          <Sl t={i} t0={11.3} text="問題。" x={126} y={540} size={380} color={C.ai} so={{s: 2.4, r: 6, r1: 0, y: 80, out: 12.95, outX: 2400}} />
        </>
      ) : null}
      {/* 10: 厳しすぎる面もある。注文する人も多い。それでも、離れていく。見極めは、作り手。 */}
      {T >= S['10'] && T < S['11'] + 0.6 ? (
        <>
          <Ln t={j} text="厳しすぎる面も、ある。" x={150} y={116} size={108} font="m" color={C.gray} t0={2.2} t1={4.1} v={10} />
          <Ln t={j} text="少しAIくさくても、" x={150} y={104} size={80} font="m" color={C.gray} t0={4.5} t1={9.05} v={8} />
          <Ln t={j} text="気にせず注文する人も、多い。" x={150} y={206} size={92} font="m" color={C.gray} t0={6.15} t1={9.15} v={-8} />
          <Ln t={j} text="手抜きと、受け取られれば、" x={152} y={104} size={80} weight={700} t0={9.95} t1={13.55} v={8} />
          {(() => {
            const s = slam(j, 11.85, {s: 2.2, r: -4, r1: 0, x: -120, out: 13.6, outX: 2500});
            return <Txt text="離れていく。" x={132 + s.dx + drift(j, 12.3, 20)} y={210 + s.dy} size={236} s={s.s} r={s.r} o={s.o} mv={s.mv} ls={-0.02} />;
          })()}
          <Sl t={j} t0={14.75} text="見極めは、作り手。" x={132} y={120} size={172} color={C.ai} so={{s: 2.0, r: 5, r1: 0, y: -60, out: 16.65, outX: -2300}} />
        </>
      ) : null}
      {/* 11: そこに、行った価値。 */}
      {T >= S['11'] && T < S['12'] + 0.6 ? (
        <>
          {(() => {
            const a = project(cam, -2.4, 0, FZ + 0.4);
            const b = project(cam, 2.4, 0, FZ + 0.4);
            return (
              <>
                <Line t={k} text="シャッターを切った。" x={a.x} y={a.y + 26} size={60} weight={700} anchor="c" t0={1.0} t1={3.3} mv />
                <Line t={k} text="置き換えた。" x={b.x} y={b.y + 26} size={60} font="m" color={C.gray} anchor="c" t0={1.6} t1={3.3} mv />
              </>
            );
          })()}
          <Line t={k} text="そこに、" x={1640} y={96} size={150} vertical dir="down" t0={4.35} t1={7.15} dy={drift(k, 4.35, 8)} />
          <Line t={k} text="行った価値。" x={1380} y={96} size={150} vertical dir="down" t0={4.8} t1={7.2} dy={drift(k, 4.8, 5)} />
        </>
      ) : null}
      {/* 12: 人の手。丁寧に使えば、高く返す。70を、90へ。相棒として。責任は、人が持つ。 */}
      {T >= S['12'] ? (
        <>
          <Ln t={l} text="最後は、必ず" x={150} y={84} size={92} t0={1.0} t1={4.45} v={8} />
          <Sl t={l} t0={2.45} text="人の手。" x={130} y={252} size={240} so={{s: 2.3, r: -6, r1: -2, y: -90, out: 4.5, outX: -2100}} />
          <Ln t={l} text="丁寧に使えば、" x={150} y={110} size={104} color={C.ai} t0={4.95} t1={9.55} v={8} />
          <Sl t={l} t0={7.9} text="高く返す。" x={130} y={240} size={232} color={C.ai} so={{s: 2.2, r: 5, r1: 0, y: 70, out: 9.6, outX: -2200}} ls={-0.02} />
          <Sl t={l} t0={10.3} text="70を、" x={150} y={100} size={190} color={C.ai} so={{s: 1.5, r: 0, x: 600, out: 12.72, outX: -1600}} />
          <Sl t={l} t0={11.5} text="90へ。" x={150} y={310} size={190} color={C.ai} so={{s: 1.5, r: 0, x: 600, out: 12.76, outX: -1600}} />
          <Sl t={l} t0={12.95} text="相棒として。" x={126} y={124} size={220} color={C.ai} so={{s: 2.4, r: -6, r1: 0, y: 90, grow: 0.012}} ls={-0.02} />
          <Ln t={l} text="責任は、人が持つ。" x={140} y={400} size={120} t0={14.1} v={5} />
        </>
      ) : null}
    </>
  );
};
export const _t = [inOut];
