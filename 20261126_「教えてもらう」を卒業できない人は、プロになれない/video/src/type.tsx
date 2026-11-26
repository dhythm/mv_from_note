// 画面の語（DOM／CSS）と、札の面の文字。詰め組・行のマスク・塊の着地。字形は崩さない。
// 語の時刻は、ナレーションの文字ごとの時刻（audio/voice/words.json）から引く（timeline.ts の vt）。
import React from 'react';
import {project, quadMatrix, type CamS} from './cam';
import {C, F, G, Line, Txt, inOut, prog, slam} from './kit';
import {T01, T02, T03, T04, T05, T06, T07, T08, type Prim} from './figs';
import {POS, wx, wy} from './score';
import {at, D, vt} from './timeline';

// 札・ラベルの四隅（左上・右上・右下・左下）を画面へ投影する
function corners(cam: CamS, p: Prim, withFlip: boolean) {
  const [ox, oy] = POS[p.cut];
  const s = p.s ?? 1;
  const ry = withFlip ? (p.ry ?? 0) : 0;
  const flipped = Math.cos(ry) < 0;
  const rz = (-(p.rz ?? 0) * Math.PI) / 180;
  const lift = 0.35 * Math.sin(Math.min(Math.PI, Math.max(0, ry)));
  const hw = (p.w / 2) * s;
  const hh = (p.h / 2) * s;
  const loc: [number, number][] = [[-hw, hh], [hw, hh], [hw, -hh], [-hw, -hh]];
  return loc.map(([lx, ly]) => {
    const fx = flipped ? -lx : lx;
    // px → 世界単位は wx の傾き（PX）。wx(a)-wx(0) で長さに直す
    const X = (wx(fx) - wx(0)) * Math.cos(ry);
    const Z = -(wx(fx) - wx(0)) * Math.sin(ry) + lift;
    const Y = wy(0) - wy(ly);
    const xr = X * Math.cos(rz) - Y * Math.sin(rz);
    const yr = X * Math.sin(rz) + Y * Math.cos(rz);
    return project(cam, ox + wx(p.x) + xr, oy + wy(p.y) + yr, (p.z ?? 0) + Z);
  });
}

// 札の面の文字（図の層と同じカメラで投影する）。色の札（dom）は面ごとここで描き、ぼかしをその札と文字だけに掛ける
export const Faces: React.FC<{cam: CamS; items: Prim[]; show: number; whipping?: boolean}> = ({cam, items, show, whipping}) => {
  const order = items.map((p, i) => ({p, i})).sort((a, b) => (a.p.layer ?? 0) - (b.p.layer ?? 0) || a.i - b.i);
  return (
    <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080}}>
      {order.map(({p, i}) => {
        const flipped = Math.cos(p.ry ?? 0) < 0;
        const text = flipped ? p.back?.text : p.text;
        const o = (p.o ?? 1) * (p.over ? 1 : show);
        if ((!text && !p.dom) || o <= 0.02) return null;
        const edgeOn = Math.abs(Math.cos(p.ry ?? 0));
        if (edgeOn < 0.06) return null;
        const q = corners(cam, p, true);
        if (q.some((c) => c.w <= 0)) return null;
        const m = quadMatrix(p.w, p.h, q);
        if (!m) return null;
        const size = (flipped ? p.back?.size : p.size) ?? p.size ?? 48;
        const color = (flipped ? p.back?.color : p.color) ?? C.ink;
        const fill = flipped && p.back ? p.back.fill : p.fill;
        const blur = p.blur ?? 0;
        return (
          <div
            key={`${p.cut}-${i}`}
            data-mv={p.mv || whipping || edgeOn < 0.98 || blur > 0.5 ? '1' : undefined}
            style={{
              position: 'absolute', left: 0, top: 0, width: p.w, height: p.h, transformOrigin: '0 0', transform: m, opacity: o,
              display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', lineHeight: 1,
              fontFamily: F.g, fontFeatureSettings: '"palt" 1', fontSize: size, fontWeight: p.weight ?? 900, color,
              background: p.dom ? fill : undefined, borderRadius: p.dom ? (p.rad ?? 0) : undefined,
              boxShadow: p.dom ? '0 10px 22px rgba(58,50,38,0.22), 0 2px 5px rgba(58,50,38,0.18)' : undefined,
              filter: blur > 0.3 ? `blur(${blur.toFixed(2)}px)` : undefined,
            }}
          >
            {text && edgeOn > 0.12
              ? Array.from(text).map((ch, k) => (
                  <span key={k} data-ch="box" style={{display: 'inline-block'}}>
                    {ch}
                  </span>
                ))
              : null}
          </div>
        );
      })}
    </div>
  );
};

// 検査用: 図の外接矩形（見えない）
const Figs: React.FC<{cam: CamS; items: Prim[]}> = ({cam, items}) => (
  <>
    {items.map((p, i) => {
      if (p.fig === false || p.k === 'label' || (p.o ?? 1) < 0.3) return null;
      const q = corners(cam, p, false);
      if (q.some((c) => c.w <= 0)) return null;
      const xs = q.map((c) => c.x);
      const ys = q.map((c) => c.y);
      const l = Math.min(...xs);
      const t = Math.min(...ys);
      return <div key={i} data-fig={p.mv ? 'fly' : '1'} style={{position: 'absolute', left: l, top: t, width: Math.max(...xs) - l, height: Math.max(...ys) - t, pointerEvents: 'none'}} />;
    })}
  </>
);

// 着地する語の塊
const Slam: React.FC<{t: number; t0: number; out?: number; text: string; x: number; y: number; size: number; color?: string; from?: 'l' | 'r' | 'u' | 'd'; outTo?: 'l' | 'r' | 'u' | 'd'; s0?: number; weight?: number; grow?: number; anchor?: 'l' | 'c' | 'r'}> = ({
  t, t0, out, text, x, y, size, color, from = 'l', outTo = 'l', s0 = 1.5, weight, grow = 0.004, anchor = 'l',
}) => {
  const v = {l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1]};
  const s = slam(t, t0, {dur: 0.42, x: v[from][0] * 150, y: v[from][1] * 90, s: s0, r: 0, grow, out, outX: v[outTo][0] * 260, outY: v[outTo][1] * 160});
  if (s.o <= 0.001) return null;
  return (
    <G dx={s.dx} dy={s.dy} s={s.s} ox={x} oy={y + size / 2} o={s.o} mv={s.mv}>
      <Txt text={text} x={x} y={y} size={size} color={color} weight={weight} anchor={anchor} />
    </G>
  );
};

export const Type: React.FC<{T: number; cam: CamS; items: Prim[]}> = ({T, cam, items}) => {
  const t1 = T - at('01', 0);
  const t2 = T - at('02', 0);
  const t3 = T - at('03', 0);
  const t4 = T - at('04', 0);
  const t5 = T - at('05', 0);
  const t6 = T - at('06', 0);
  const t7 = T - at('07', 0);
  const t8 = T - at('08', 0);
  const on = (t: number, id: string) => t > -0.3 && t < D[id] + 0.4;
  const X = (id: string) => D[id] - 0.32; // カットの終わりの退場
  const dr = (t: number, t0: number, v: number) => v * Math.max(0, t - t0); // 読むあいだの流れ（塊ごと）

  const e1 = T01.clipEnd - 0.1;
  const s1 = T01.see - 0.32;
  const x8 = T08.side - 0.25;
  const e4 = T04.clipEnd - 0.1;
  const e7 = T07.clipEnd - 0.1;
  const k7 = T07.keep - 0.32;
  const p6 = T06.self - 0.38;
  // 08: 結びの寄り
  const sh8 = 1 - 0.45 * inOut(prog(t8, T08.grad - 0.3, T08.grad + 0.2));
  const end8 = 1 + 0.05 * inOut(prog(t8, T08.view + 0.5, D['08']));

  return (
    <G>
      <Figs cam={cam} items={items} />
      {on(t1, '01') ? (
        <>
          {/* 同じように教わっても（動画の上・左半分） */}
          <Line t={t1} text="同じように、教わっても。" x={100} y={170} size={60} weight={700} color={C.grayDark} t0={0.42} t1={s1} />
          <Line t={t1} text="伸びる人と、" x={96} y={270} size={112} t0={vt('01', '伸びる')} t1={s1} dir="left" />
          <Slam t={t1} t0={vt('01', 'とまる')} out={s1} text="止まる人。" x={96} y={410} size={112} color={C.grayDark} outTo="u" />
          <Line t={t1} text="能力の差に、" x={96} y={250} size={112} t0={T01.see + 0.1} t1={e1} dir="left" />
          <Slam t={t1} t0={vt('01', '見える')} out={e1} text="見える。" x={96} y={390} size={170} />
          <Line t={t1} text="かもしれない。" x={100} y={600} size={56} weight={700} color={C.grayDark} t0={vt('01', 'かもしれ')} t1={e1} />
          {/* 主体的か、受動的か */}
          <Line t={t1} text="実際は、" x={100} y={140} size={60} weight={700} color={C.gray} t0={T01.clipEnd + 0.25} t1={X('01')} />
          <G dx={dr(t1, T01.act, 5)}>
            <Slam t={t1} t0={T01.act} out={X('01')} text="主体的か、" x={96} y={240} size={150} outTo="u" />
          </G>
          <G dx={dr(t1, T01.pas, -2.5)}>
            <Slam t={t1} t0={T01.pas} out={X('01')} text="受動的か。" x={104} y={420} size={150} from="r" />
          </G>
          <Line t={t1} text="動くか、待つかの差。" x={100} y={650} size={60} weight={700} color={C.gray} t0={T01.diff} t1={X('01')} />
        </>
      ) : null}

      {on(t2, '02') ? (
        <>
          <Line t={t2} text="教えてもらう、" x={96} y={220} size={150} t0={0.42} t1={T02.bad} dir="left" />
          <Slam t={t2} t0={vt('02', 'だけでは')} out={T02.bad} text="だけでは。" x={96} y={400} size={150} outTo="u" />
          <Line t={t2} text="そこまで、身につかない。" x={100} y={650} size={64} weight={700} t0={T02.not} t1={T02.bad} />
          {/* 留保（声に合わせて大きく読ませ、そのあと右の灰の二行として残す） */}
          <Line t={t2} text="教えてもらうこと自体が、" x={100} y={170} size={56} weight={700} color={C.gray} t0={T02.bad + 0.25} t1={T02.use} />
          <Slam t={t2} t0={T02.bad2} out={T02.use} text="悪いわけでは、ない。" x={96} y={260} size={120} color={C.grayDark} s0={1.3} outTo="r" />
          <Line t={t2} text="教えてくれる人が、いるから。" x={100} y={490} size={60} weight={700} color={C.gray} t0={T02.who} t1={T02.use} />
          <Slam t={t2} t0={T02.can} out={T02.use} text="できている。" x={96} y={570} size={104} s0={1.3} outTo="r" />
          <Slam t={t2} t0={vt('02', '感謝')} out={T02.use} text="感謝は、忘れない。" x={96} y={730} size={120} color={C.grayDark} s0={1.3} outTo="r" />
          <Line t={t2} text="悪いわけでは、ない。" x={1250} y={170} size={50} weight={700} color={C.gray} t0={T02.use + 0.35} t1={X('02')} dir="right" />
          <Line t={t2} text="感謝は、忘れない。" x={1250} y={250} size={50} weight={700} color={C.gray} t0={T02.use + 0.45} t1={X('02')} dir="right" />
          {/* 学ぶ、身につける */}
          <Line t={t2} text="自分に、どう活かすか。" x={96} y={130} size={92} weight={700} dir="left" t0={T02.use + 0.3} t1={X('02')} />
          <G dx={dr(t2, T02.learn, 6)}>
            <Slam t={t2} t0={T02.learn} out={X('02')} text="学ぶ。" x={96} y={270} size={330} s0={1.7} outTo="u" />
          </G>
          <G dx={dr(t2, T02.wear, -4)}>
            <Slam t={t2} t0={T02.wear} out={X('02')} text="身につける。" x={116} y={650} size={150} from="r" />
          </G>
          <Line t={t2} text="に、寄せた方がいい。" x={100} y={870} size={54} weight={700} color={C.gray} t0={T02.lean} t1={X('02')} />
        </>
      ) : null}

      {on(t3, '03') ? (
        <>
          <Slam t={t3} t0={0.42} out={T03.say - 0.25} text="自分を、主体に。" x={96} y={110} size={120} outTo="u" s0={1.35} />
          <Line t={t3} text="受動態ではなく、" x={100} y={290} size={60} weight={700} color={C.gray} t0={T03.pas} t1={T03.say - 0.25} />
          <Slam t={t3} t0={T03.act} out={X('03')} text="能動態。" x={1824} y={810} size={120} anchor="r" from="r" outTo="r" />
          <Line t={t3} text="ではなく、" x={100} y={830} size={72} weight={700} color={C.gray} t0={vt('03', 'ではなく', 1)} t1={T03.flip - 0.1} />
          {/* 組み替わったあと */}
          <Slam t={t3} t0={T03.flip + 0.6} out={X('03')} text="主語は、自分。" x={96} y={770} size={104} s0={1.35} />
          <Line t={t3} text="かなり、変わる。" x={100} y={910} size={64} weight={700} color={C.gray} t0={T03.much} t1={X('03')} />
        </>
      ) : null}

      {on(t4, '04') ? (
        <>
          <Line t={t4} text="触れた情報は、" x={100} y={190} size={60} weight={700} color={C.grayDark} t0={0.45} t1={e4} />
          <Line t={t4} text="自分で、" x={96} y={290} size={150} t0={T04.cook} t1={e4} dir="left" />
          <Slam t={t4} t0={T04.cook + 0.45} out={e4} text="調理する。" x={96} y={470} size={150} outTo="u" />
          <Line t={t4} text="全部は、使えない。" x={100} y={730} size={72} weight={700} color={C.grayDark} t0={T04.all} t1={e4} />
          {/* 使う／使わない */}
          <Slam t={t4} t0={T04.use} out={X('04')} text="使う。" x={96} y={330} size={230} s0={1.7} />
          <Slam t={t4} t0={T04.not} out={X('04')} text="使わない。" x={1250} y={290} size={96} color={C.gray} from="r" outTo="r" s0={1.2} />
          <Line t={t4} text="全部は、使えない。" x={100} y={245} size={48} weight={700} color={C.gray} t0={T04.clipEnd + 0.3} t1={X('04')} />
          <Slam t={t4} t0={T04.judge} out={X('04')} text="自分で、判断する。" x={96} y={100} size={110} from="u" outTo="u" s0={1.3} />
        </>
      ) : null}

      {on(t5, '05') ? (
        <>
          <Line t={t5} text="教えてもらうことが、" x={100} y={120} size={60} weight={700} color={C.gray} t0={0.45} t1={T05.first - 0.15} />
          <Slam t={t5} t0={vt('05', '悪いとは')} out={T05.first - 0.15} text="悪いとは、言わない。" x={96} y={220} size={120} color={C.grayDark} s0={1.3} outTo="u" />
          <Line t={t5} text="まず教えてもらうのは、" x={96} y={220} size={88} weight={700} t0={T05.first} t1={T05.but} dir="left" />
          <Slam t={t5} t0={T05.ok} out={T05.but} text="いい。" x={96} y={350} size={210} color={C.grayDark} outTo="u" />
          {/* レベルは低い。基礎まで */}
          <Line t={t5} text="まず教えてもらうのは、いい。" x={100} y={100} size={48} weight={700} color={C.gray} t0={T05.but + 0.3} t1={T05.esc} />
          <Line t={t5} text="教えてもらえる" x={100} y={190} size={56} weight={700} color={C.gray} t0={T05.level - 0.6} t1={T05.esc} />
          <Slam t={t5} t0={T05.level} out={T05.esc} text="レベルは、低い。" x={96} y={270} size={110} s0={1.3} outTo="u" />
          <Slam t={t5} t0={T05.base} out={T05.esc} text="基礎まで。" x={96} y={440} size={250} s0={1.6} />
          {/* プロにはなれない。一部分だけ、手伝う */}
          <Line t={t5} text="脱出できないと、" x={96} y={130} size={76} weight={700} t0={T05.esc + 0.3} t1={X('05')} dir="left" />
          <Slam t={t5} t0={T05.pro} out={X('05')} text="プロにはなれない。" x={96} y={240} size={124} s0={1.35} outTo="u" />
          <Line t={t5} text="詰まったところを、聞くのは。" x={100} y={480} size={54} weight={700} color={C.gray} t0={T05.stuck} t1={X('05')} />
          <Slam t={t5} t0={T05.part} out={X('05')} text="一部分だけ、手伝う。" x={96} y={570} size={100} s0={1.3} />
          <Line t={t5} text="この違いは、" x={100} y={740} size={60} weight={700} color={C.gray} t0={T05.diff} t1={X('05')} />
          <Slam t={t5} t0={T05.big} out={X('05')} text="かなり、大きい。" x={96} y={830} size={104} color={C.grayDark} s0={1.3} />
        </>
      ) : null}

      {on(t6, '06') ? (
        <>
          <Line t={t6} text="お金をもらう、立場では。" x={100} y={130} size={60} weight={700} color={C.gray} t0={0.45} t1={p6} />
          <Line t={t6} text="誰も、" x={96} y={230} size={140} t0={T06.none} t1={p6} dir="left" />
          <Slam t={t6} t0={T06.none + 0.45} out={p6} text="教えてくれない。" x={96} y={400} size={140} outTo="u" />
          {/* 自分で学ぶ。学ぶだけでは、だめ */}
          <Line t={t6} text="誰も、教えてくれない。" x={100} y={100} size={52} weight={700} t0={T06.self + 0.15} t1={X('06')} />
          <Slam t={t6} t0={T06.self} out={T06.taught} text="自分で、学ぶ。" x={96} y={200} size={170} s0={1.5} outTo="u" />
          <Line t={t6} text="学ぶだけでは、だめ。" x={96} y={450} size={84} weight={700} color={C.grayDark} t0={T06.only} t1={T06.taught} dir="left" />
          <Slam t={t6} t0={T06.out} out={T06.taught} text="アウトプットを、出す。" x={96} y={590} size={116} s0={2.0} from="d" />
          <Line t={t6} text="出していかなければ、いけない。" x={100} y={760} size={56} weight={700} color={C.gray} t0={T06.must + 0.5} t1={T06.taught} />
          {/* 絶対に、無理 */}
          <Line t={t6} text="「教えられていないから、" x={96} y={190} size={80} weight={700} color={C.grayDark} t0={T06.taught + 0.25} t1={X('06')} dir="left" />
          <Line t={t6} text="できません。」" x={96} y={290} size={80} weight={700} color={C.grayDark} t0={T06.cant} t1={X('06')} dir="left" />
          <Line t={t6} text="では、お金は取れない。" x={96} y={420} size={92} weight={700} t0={T06.then} t1={X('06')} dir="left" />
          <Slam t={t6} t0={T06.never} out={X('06')} text="絶対に、無理。" x={96} y={560} size={240} s0={1.6} />
        </>
      ) : null}

      {on(t7, '07') ? (
        <>
          <Line t={t7} text="今プロの人だって、" x={100} y={200} size={64} weight={700} color={C.grayDark} t0={0.45} t1={e7} />
          <Line t={t7} text="永遠に、" x={96} y={300} size={140} t0={T07.ever} t1={e7} dir="left" />
          <Slam t={t7} t0={T07.keep0} out={e7} text="学び続ける。" x={96} y={470} size={140} outTo="u" />
          {/* 完成している人は、いない */}
          <Line t={t7} text="完成している人は、" x={96} y={200} size={84} weight={700} t0={T07.done} t1={k7} dir="left" />
          <Slam t={t7} t0={T07.none} out={k7} text="いない。" x={96} y={320} size={260} s0={1.6} outTo="u" />
          <Line t={t7} text="完成して、いなくても。" x={100} y={690} size={60} weight={700} color={C.gray} t0={T07.even} t1={k7} />
          {/* 飯が食える。仕事ができる */}
          <Line t={t7} text="完成していなくても、" x={100} y={110} size={48} weight={700} color={C.gray} t0={T07.keep} t1={X('07')} />
          <Line t={t7} text="学び続けて、" x={96} y={190} size={96} t0={T07.keep + 0.1} t1={X('07')} dir="left" />
          <Slam t={t7} t0={T07.eat} out={X('07')} text="飯が食える。" x={96} y={320} size={180} s0={1.5} />
          <Line t={t7} text="仕事ができる。" x={96} y={570} size={110} weight={700} t0={T07.work} t1={X('07')} dir="left" />
        </>
      ) : null}

      {on(t8, '08') ? (
        <>
          <Line t={t8} text="主語を、自分にすると。" x={100} y={140} size={60} weight={700} color={C.gray} t0={0.45} t1={x8} />
          <Line t={t8} text="絶対に、" x={96} y={240} size={160} t0={T08.grow} t1={x8} dir="left" />
          <Slam t={t8} t0={T08.nobi} out={x8} text="伸びる。" x={96} y={420} size={300} s0={1.7} outTo="u" />
          <Line t={t8} text="歩みを止めたら、" x={100} y={810} size={72} weight={700} color={C.grayDark} t0={T08.stop} t1={x8} />
          <Slam t={t8} t0={T08.end} out={x8} text="終わり。" x={700} y={786} size={112} color={C.grayDark} s0={1.3} outTo="u" />
          {/* 本人の結論（縦に積む） */}
          <G s={end8} ox={96} oy={300} mv={t8 > T08.view + 0.5}>
            <G s={sh8} ox={96} oy={110} mv={sh8 < 1 && sh8 > 0.551}>
              <Line t={t8} text="主語は、自分。" x={96} y={110} size={84} weight={700} t0={T08.side + 0.4} dir="left" />
              <Line t={t8} text="学ぶ側に、" x={96} y={230} size={170} t0={T08.side + 0.25} dir="left" />
              <Slam t={t8} t0={T08.turn} text="回る。" x={96} y={420} size={260} s0={1.6} grow={0} />
            </G>
            <Line t={t8} text="「教えてもらう」を、" x={100} y={470} size={60} weight={700} color={C.gray} t0={T08.grad + 0.2} />
            <Line t={t8} text="卒業した人から。" x={616} y={470} size={60} weight={700} color={C.gray} t0={T08.from} />
            <Slam t={t8} t0={T08.view} text="景色は、変わる。" x={96} y={580} size={216} s0={1.6} grow={0} />
          </G>
        </>
      ) : null}
    </G>
  );
};
