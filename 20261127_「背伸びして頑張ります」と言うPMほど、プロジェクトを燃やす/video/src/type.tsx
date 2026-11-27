// 画面の語（DOM／CSS）と、図に添えるラベル。詰め組・行のマスク・塊の着地。字形は崩さない。
// 語の時刻は、ナレーションの文字ごとの時刻（audio/voice/words.json）から引く（timeline.ts の vt）。
import React from 'react';
import {project, quadMatrix, type CamS} from './cam';
import {C, F, G, Line, Txt, inOut, prog, slam} from './kit';
import {H_YO, T01, T02, T03, T04, T05, T06, T07, T08, bars03, type Prim} from './figs';
import {POS, nightOn, wx, wy} from './score';
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

// 数字が棒の高さに合わせて寄り、原稿の平均で止まる（桁を回さない）
const Count: React.FC<{t: number; t0: number; out: number; v: number; color: string; y: number}> = ({t, t0, out, v, color, y}) => (
  <Line t={t} text={`平均${v.toFixed(1)}日`} x={96} y={y} size={84} color={color} t0={t0} t1={out} dir="left" stagger={0.012} />
);

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
  const night = nightOn(T);
  const NC = C.paper;

  // 01
  const a1 = T01.but - 0.25;
  const b1 = T01.co - 0.3;
  const c1 = T01.small - 0.3;
  // 03
  const b3 = T03.pf - 0.25;
  const c3 = T03.ins0 + 0.05;
  const d3 = T03.ins1 - 0.1;
  const {hYo, hJi} = bars03(t3);
  const vYo = (33.9 * (hYo - 24)) / (H_YO - 24);
  const vJi = (55.5 * (hJi - 24)) / (560 - 24);
  // 04
  const a4 = T04.pz - 0.25;
  const b4 = T04.first - 0.25;
  const c4 = T04.ins0 + 0.05;
  const d4 = T04.ins1 - 0.1;
  // 05
  const a5 = T05.dream - 0.25;
  const b5 = T05.talk - 0.25;
  const c5 = T05.hope - 0.25;
  // 06
  const a6 = T06.pm - 0.25;
  const b6 = T06.big - 0.25;
  const c6 = T06.order - 0.25;
  // 07
  const a7 = T07.all - 0.25;
  const b7 = T07.hol - 0.25;
  const c7 = T07.kata - 0.25;
  // 08: 結びの寄り
  const a8 = T08.pm - 0.25;
  const end8 = 1 + 0.06 * inOut(prog(t8, T08.view + 0.5, D['08']));

  return (
    <G>
      <Figs cam={cam} items={items} />
      {on(t1, '01') ? (
        <>
          <Line t={t1} text="「頑張ります」は" x={100} y={200} size={64} weight={700} color={C.gray} t0={0.4} t1={a1} />
          <G dx={dr(t1, T01.strong, 6)}>
            <Slam t={t1} t0={T01.strong} out={a1} text="頼もしい。" x={96} y={300} size={190} outTo="u" />
          </G>
          <Line t={t1} text="頑張りではなく、" x={100} y={200} size={64} weight={700} color={C.gray} t0={vt('01', '頑張りでは')} t1={b1} />
          <G dx={dr(t1, T01.view, 5)}>
            <Slam t={t1} t0={T01.view} out={b1} text="見通し。" x={96} y={290} size={230} s0={1.8} outTo="u" />
          </G>
          <Line t={t1} text="会社が潰れる賭けは、" x={100} y={180} size={60} weight={700} color={C.gray} t0={T01.co} t1={c1} />
          <Slam t={t1} t0={T01.gamble} out={c1} text="経営者の仕事。" x={96} y={260} size={130} outTo="l" />
          <Line t={t1} text="リスクを取らずに、着地させる人が、" x={100} y={480} size={56} weight={700} color={C.gray} t0={T01.risk} t1={c1} />
          <G dx={dr(t1, T01.best, -4)}>
            <Slam t={t1} t0={T01.best} out={c1} text="いちばん、優秀。" x={96} y={560} size={120} from="r" outTo="l" />
          </G>
          <G dx={dr(t1, T01.small, 4)}>
            <Slam t={t1} t0={T01.small - 0.1} out={X('01')} text="見通し。" x={96} y={250} size={230} s0={1.5} outTo="u" />
          </G>
          <Line t={t1} text="起きても、小さく抑える。" x={100} y={560} size={56} weight={700} color={C.gray} t0={vt('01', '起きても')} t1={X('01')} />
          <Slam t={t1} t0={T01.diff} out={X('01')} text="リスクの大きさは、違う。" x={96} y={640} size={76} s0={1.3} />
        </>
      ) : null}

      {on(t2, '02') ? (
        <>
          <Line t={t2} text="背伸びは、" x={100} y={200} size={64} weight={700} color={C.gray} t0={0.35} t1={T02.mgmt - 0.2} />
          <G dy={-dr(t2, T02.up, 8)}>
            <Line t={t2} text="頑張ります" x={96} y={300} size={220} t0={T02.up} t1={T02.mgmt - 0.2} dir="up" stagger={0.05} dur={0.6} />
          </G>
          <Slam t={t2} t0={T02.mgmt} out={X('02')} text="マネジメントではない。" x={96} y={170} size={110} from="d" outTo="u" />
          <Line t={t2} text="死に物狂いは、求めない。" x={100} y={330} size={50} weight={700} color={C.gray} t0={T02.mgmt + 0.9} t1={X('02')} />
          <Line t={t2} text="うまくいっても、" x={100} y={440} size={56} weight={700} color={C.gray} t0={T02.luck} t1={X('02')} />
          <Line t={t2} text="メンバーの頑張りか、運。" x={96} y={515} size={76} color={C.grayDark} t0={T02.member} t1={X('02')} dir="left" />
          <Line t={t2} text="コントロールは、していない。" x={100} y={640} size={50} weight={700} color={C.gray} t0={T02.ctrl} t1={X('02')} />
          <G dx={dr(t2, T02.calm, 5)}>
            <Slam t={t2} t0={T02.calm} out={X('02')} text="淡々と、着地。" x={96} y={740} size={140} />
          </G>
        </>
      ) : null}

      {on(t3, '03') ? (
        <>
          <Slam t={t3} t0={0.4} out={b3} text="効くのは、余白。" x={96} y={220} size={150} outTo="u" />
          <Line t={t3} text="私も含めて、読み違える。" x={100} y={440} size={64} weight={700} color={C.gray} t0={T03.me} t1={b3} />
          <G dx={dr(t3, T03.pf, 6)}>
            <Slam t={t3} t0={T03.pf} out={c3} text="計画錯誤" x={96} y={200} size={240} s0={1.8} outTo="u" />
          </G>
          <Line t={t3} text="過去を知っていても、" x={100} y={520} size={60} weight={700} color={C.gray} t0={T03.past} t1={c3} />
          <Line t={t3} text="次も、楽観的に見積もる。" x={96} y={600} size={80} t0={T03.next} t1={c3} dir="left" />
          {/* 動画の上 */}
          <Slam t={t3} t0={T03.ins0 + 0.3} out={d3} text="1994年" x={96} y={250} size={180} outTo="l" />
          <Line t={t3} text="卒業論文を書く、" x={100} y={500} size={64} weight={700} color={C.grayDark} t0={T03.thesis} t1={d3} />
          <Slam t={t3} t0={T03.n37} out={d3} text="学生37人。" x={96} y={580} size={120} outTo="l" />
          {/* 棒と数字 */}
          <Line t={t3} text="学生37人・1994年" x={100} y={130} size={44} weight={700} color={C.gray} t0={T03.ins1 + 0.1} t1={X('03')} />
          <Count t={t3} t0={T03.yo} out={X('03')} v={vYo} color={C.blue} y={560} />
          <Count t={t3} t0={T03.ji} out={X('03')} v={vJi} color={C.rust} y={670} />
          <Line t={t3} text="予想した日まで、" x={100} y={210} size={56} weight={700} color={C.gray} t0={T03.until} t1={X('03')} />
          <Slam t={t3} t0={T03.wari} out={X('03')} text="3割ほど。" x={96} y={285} size={150} s0={1.5} />
        </>
      ) : null}

      {on(t4, '04') ? (
        <>
          <Line t={t4} text="頼れるのは、" x={100} y={200} size={64} weight={700} color={C.gray} t0={0.35} t1={a4} />
          <Slam t={t4} t0={T04.buf} out={a4} text="バッファだけ。" x={96} y={290} size={140} outTo="u" />
          <Line t={t4} text="パツパツの計画は、" x={100} y={180} size={60} weight={700} color={C.gray} t0={T04.pz} t1={b4} />
          <Line t={t4} text="ほぼ、" x={100} y={270} size={72} weight={700} color={C.gray} t0={T04.hobo} t1={b4} />
          <Slam t={t4} t0={T04.lose} out={b4} text="負けが決まっている。" x={96} y={360} size={100} />
          <Line t={t4} text="一つ遅れれば、崩れる。" x={100} y={560} size={64} weight={700} color={C.grayDark} t0={T04.one} t1={b4} />
          <Line t={t4} text="現場が、埋める。" x={96} y={650} size={84} t0={T04.fill} t1={b4} dir="left" />
          <Line t={t4} text="最初に、" x={100} y={250} size={64} weight={700} color={C.gray} t0={T04.first} t1={c4} />
          <Slam t={t4} t0={T04.nego - 0.3} out={c4} text="余白を、交渉する。" x={96} y={340} size={104} />
          {/* 夜の動画の上 */}
          <Line t={t4} text="休日も、" x={96} y={250} size={110} color={NC} t0={T04.hol} t1={d4} dir="left" />
          <Line t={t4} text="無理なペースも、" x={96} y={390} size={110} color={NC} t0={T04.pace} t1={d4} dir="left" />
          <Slam t={t4} t0={T04.pay} out={d4} text="現場が、払う。" x={96} y={560} size={150} color={night ? NC : C.ink} s0={1.6} />
          <Line t={t4} text="毎回やれば、" x={100} y={250} size={64} weight={700} color={C.gray} t0={T04.every} t1={X('04')} />
          <Slam t={t4} t0={T04.some} out={X('04')} text="いつか、外れる。" x={96} y={340} size={130} />
        </>
      ) : null}

      {on(t5, '05') ? (
        <>
          <Slam t={t5} t0={T05.enemy - 0.1} out={a5} text="営業は、敵ではない。" x={96} y={260} size={120} outTo="u" />
          <Line t={t5} text="夢が、出発点。" x={100} y={150} size={64} weight={700} color={C.gray} t0={T05.dream} t1={b5} />
          <Slam t={t5} t0={T05.land} out={b5} text="着地。" x={96} y={250} size={220} s0={1.8} />
          <Line t={t5} text="できること" x={96} y={520} size={84} color={C.blue} t0={T05.can} t1={b5} dir="left" />
          <Line t={t5} text="できないこと" x={96} y={630} size={84} color={C.gray} t0={T05.cant} t1={b5} dir="right" />
          <Line t={t5} text="夢を語るのは、" x={100} y={170} size={64} weight={700} color={C.gray} t0={T05.talk} t1={c5} />
          <Slam t={t5} t0={T05.bad} out={c5} text="悪くない。" x={96} y={250} size={160} color={C.grayDark} />
          <Line t={t5} text="売上とコストを、見ないと。" x={96} y={480} size={72} t0={T05.sales} t1={c5} dir="left" />
          <Line t={t5} text="現実に、追いつかれる。" x={96} y={570} size={72} color={C.grayDark} t0={T05.real} t1={c5} dir="left" />
          <Line t={t5} text="大きいほど、重い。" x={100} y={690} size={60} weight={700} color={C.gray} t0={T05.real + 1.0} t1={c5} />
          <Line t={t5} text="思っていた通りなら、" x={100} y={170} size={64} weight={700} color={C.gray} t0={T05.hope} t1={X('05')} />
          <Slam t={t5} t0={T05.good} out={X('05')} text="優秀。" x={96} y={250} size={180} />
          <Line t={t5} text="三つも、四つも。" x={96} y={520} size={90} color={C.rust} t0={T05.three} t1={X('05')} dir="left" />
          <Line t={t5} text="次も同じとは、限らない。" x={100} y={650} size={64} weight={700} color={C.gray} t0={T05.next} t1={X('05')} />
        </>
      ) : null}

      {on(t6, '06') ? (
        <>
          <Line t={t6} text="野球なら、" x={100} y={150} size={64} weight={700} color={C.gray} t0={0.35} t1={a6} />
          <Slam t={t6} t0={T06.three} out={a6} text="3割で、一流。" x={96} y={230} size={140} outTo="u" />
          <Line t={t6} text="PMには、" x={100} y={150} size={64} weight={700} color={C.gray} t0={T06.pm} t1={b6} />
          <Line t={t6} text="10回のうち、" x={100} y={230} size={64} weight={700} color={C.gray} t0={vt('06', 'じっかいのうち')} t1={b6} />
          <Slam t={t6} t0={T06.nine} out={b6} text="9回か、10回。" x={96} y={310} size={130} />
          <Line t={t6} text="単打で、いい。" x={96} y={470} size={96} color={C.blue} t0={T06.single} t1={b6} dir="left" />
          <Line t={t6} text="3回の大成功と、" x={100} y={150} size={60} weight={700} color={C.gray} t0={T06.big} t1={c6} />
          <Line t={t6} text="7回の失敗では、" x={100} y={230} size={60} weight={700} color={C.gray} t0={T06.fail} t1={c6} />
          <Slam t={t6} t0={T06.bad} out={c6} text="困る。" x={96} y={290} size={140} />
          <Slam t={t6} t0={T06.order} out={X('06')} text="順番が、逆。" x={96} y={150} size={130} />
          <Line t={t6} text="ホームランは、あと。" x={100} y={310} size={60} weight={700} color={C.gray} t0={T06.rev + 0.2} t1={X('06')} />
          <G dx={dr(t6, T06.order + 2.2, 6)}>
            <Slam t={t6} t0={T06.order + 2.2} out={X('06')} text="単打で、いい。" x={96} y={390} size={110} color={C.blue} />
          </G>
        </>
      ) : null}

      {on(t7, '07') ? (
        <>
          <Line t={t7} text="楽に見えて、" x={100} y={200} size={64} weight={700} color={C.gray} t0={0.35} t1={a7} />
          <Slam t={t7} t0={T07.rev} out={a7} text="実際は逆。" x={96} y={290} size={190} s0={1.8} outTo="u" />
          <Line t={t7} text="全部受ければ、" x={100} y={170} size={60} weight={700} color={C.gray} t0={T07.all} t1={b7} />
          <Slam t={t7} t0={T07.round} out={b7} text="丸く収まる。" x={96} y={250} size={120} color={C.grayDark} />
          <Line t={t7} text="けれど、見通しが立たない。" x={100} y={440} size={64} weight={700} color={C.grayDark} t0={T07.but} t1={b7} />
          <Slam t={t7} t0={T07.view + 0.9} out={b7} text="全部は、受けない。" x={96} y={540} size={100} />
          <Line t={t7} text="休日に頼み、" x={100} y={170} size={60} weight={700} color={C.gray} t0={T07.hol} t1={c7} />
          <Line t={t7} text="言いにくいことを、言う。" x={96} y={250} size={80} t0={T07.hard} t1={c7} dir="left" />
          <G dx={dr(t7, T07.hate, 5)}>
            <Slam t={t7} t0={T07.hate} out={c7} text="嫌われ役。" x={96} y={380} size={190} s0={1.8} />
          </G>
          <Line t={t7} text="報酬が高いのは、難しいから。" x={100} y={640} size={56} weight={700} color={C.gray} t0={T07.pay} t1={c7} />
          <Line t={t7} text="型に、正解はない。" x={100} y={160} size={64} weight={700} color={C.gray} t0={T07.kata} t1={X('07')} />
          <Line t={t7} text="前に進めば、いい。" x={96} y={250} size={96} t0={T07.sei + 0.9} t1={X('07')} dir="left" />
          <Line t={t7} text="信頼される人の言葉で、" x={100} y={470} size={56} weight={700} color={C.gray} t0={T07.trust} t1={X('07')} />
          <Line t={t7} text="合わない相手とも、" x={96} y={550} size={80} color={C.grayDark} t0={T07.awa} t1={X('07')} dir="left" />
          <Slam t={t7} t0={T07.done} out={X('07')} text="やり切る。" x={96} y={660} size={170} />
        </>
      ) : null}

      {on(t8, '08') ? (
        <>
          <Slam t={t8} t0={T08.who} out={a8} text="誰の、リスクか。" x={96} y={260} size={120} outTo="u" />
          <Slam t={t8} t0={T08.whom} out={a8} text="誰が、背負うのか。" x={96} y={420} size={104} color={C.grayDark} from="r" outTo="u" />
          <G s={end8} ox={96} oy={560}>
            <Line t={t8} text="PMが背負うべきなのは、" x={100} y={210} size={56} weight={700} color={C.gray} t0={T08.pm} t1={1e9} />
            <Line t={t8} text="頑張りではなく、" x={96} y={300} size={90} color={C.grayDark} t0={T08.not} t1={1e9} dir="left" />
            <Slam t={t8} t0={T08.view} text="見通し。" x={96} y={420} size={280} s0={1.9} grow={0} />
          </G>
        </>
      ) : null}
    </G>
  );
};
