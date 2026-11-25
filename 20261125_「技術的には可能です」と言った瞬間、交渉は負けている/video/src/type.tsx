// 画面の語（DOM／CSS）と、札の面の文字。詰め組・行のマスク・塊の着地。字形は崩さない。
// 語の時刻は、ナレーションの文字ごとの時刻（audio/voice/words.json）から引く（timeline.ts の vt）。
import React from 'react';
import {project, quadMatrix, type CamS} from './cam';
import {C, F, G, Line, Txt, inOut, prog, slam} from './kit';
import {T02, T03, T04, T05, T06, T07, T08, type Prim} from './figs';
import {CLIP08, POS, wx, wy} from './score';
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

// 札の面の文字（図の層と同じカメラで投影する）
export const Faces: React.FC<{cam: CamS; items: Prim[]; show: number; whipping?: boolean}> = ({cam, items, show, whipping}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080}}>
    {items.map((p, i) => {
      const flipped = Math.cos(p.ry ?? 0) < 0;
      const text = flipped ? p.back?.text : p.text;
      const o = (p.o ?? 1) * (p.over ? 1 : show);
      if (!text || o <= 0.02) return null;
      const edgeOn = Math.abs(Math.cos(p.ry ?? 0));
      if (edgeOn < 0.12) return null;
      const q = corners(cam, p, true);
      if (q.some((c) => c.w <= 0)) return null;
      const m = quadMatrix(p.w, p.h, q);
      if (!m) return null;
      const size = (flipped ? p.back?.size : p.size) ?? p.size ?? 48;
      const color = (flipped ? p.back?.color : p.color) ?? C.ink;
      return (
        <div
          key={`${p.cut}-${i}`}
          data-mv={p.mv || whipping || edgeOn < 0.98 ? '1' : undefined}
          style={{position: 'absolute', left: 0, top: 0, width: p.w, height: p.h, transformOrigin: '0 0', transform: m, opacity: o, display: 'flex', alignItems: 'center', justifyContent: 'center', whiteSpace: 'nowrap', lineHeight: 1, fontFamily: F.g, fontFeatureSettings: '"palt" 1', fontSize: size, fontWeight: p.weight ?? 900, color}}
        >
          {Array.from(text).map((ch, k) => (
            <span key={k} data-ch="box" style={{display: 'inline-block'}}>
              {ch}
            </span>
          ))}
        </div>
      );
    })}
  </div>
);

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
const Slam: React.FC<{t: number; t0: number; out?: number; text: string; x: number; y: number; size: number; color?: string; from?: 'l' | 'r' | 'u' | 'd'; outTo?: 'l' | 'r' | 'u' | 'd'; s0?: number; weight?: number; grow?: number}> = ({
  t, t0, out, text, x, y, size, color, from = 'r', outTo = 'l', s0 = 1.5, weight, grow = 0.004,
}) => {
  const v = {l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1]};
  const s = slam(t, t0, {dur: 0.42, x: v[from][0] * 150, y: v[from][1] * 90, s: s0, r: 0, grow, out, outX: v[outTo][0] * 260, outY: v[outTo][1] * 160});
  if (s.o <= 0.001) return null;
  return (
    <G dx={s.dx} dy={s.dy} s={s.s} ox={x} oy={y + size / 2} o={s.o} mv={s.mv}>
      <Txt text={text} x={x} y={y} size={size} color={color} weight={weight} />
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

  // 01
  const a1 = vt('01', '交渉') - 0.3;
  const b1 = vt('01', '交渉');
  const c1 = vt('01', 'たいてい') - 0.2;
  const m1 = vt('01', 'その本当');
  const y1 = vt('01', '「やめた');
  // 08: 結びの寄り
  const end8 = (1 - 0.40 * inOut(prog(t8, CLIP08 - 0.35, CLIP08 + 0.35))) * (1 + 0.035 * inOut(prog(t8, T08.maybe, D['08'])));

  return (
    <G>
      <Figs cam={cam} items={items} />
      {on(t1, '01') ? (
        <>
          {/* 言ってしまう一言 */}
          <Line t={t1} text="「技術的には" x={96} y={260} size={168} t0={0.38} t1={a1} dir="left" />
          <Slam t={t1} t0={vt('01', '可能') - 0.05} out={a1} text="可能です」" x={96} y={460} size={200} from="l" outTo="u" />
          {/* その一言は、札になる */}
          <Line t={t1} text="その一言で、" x={100} y={150} size={72} weight={700} color={C.gray} t0={b1 + 0.05} t1={c1} />
          <Line t={t1} text="カードを" x={96} y={270} size={200} t0={b1} t1={c1} dir="left" />
          <Slam t={t1} t0={b1 + 0.7} out={c1} text="渡す。" x={96} y={500} size={300} from="l" outTo="l" />
          {/* 本当の意味 */}
          <Line t={t1} text="たいていの場合、" x={100} y={420} size={60} weight={700} color={C.gray} t0={c1 + 0.25} t1={X('01')} />
          <Line t={t1} text="本当の意味は、" x={96} y={520} size={110} t0={m1} t1={X('01')} dir="left" />
          <Slam t={t1} t0={y1 + 0.1} out={X('01')} text="やめた方が、いい。" x={96} y={690} size={176} from="r" outTo="l" />
        </>
      ) : null}

      {on(t2, '02') ? (
        <>
          <Line t={t2} text="手が届かないものを、並べると。" x={100} y={150} size={56} weight={700} color={C.gray} t0={0.4} t1={T02.e1} />
          <Line t={t2} text="見せたものは、" x={96} y={270} size={104} t0={T02.u1} t1={T02.e1} dir="left" />
          <Slam t={t2} t0={T02.u1 + 0.75} out={T02.e1} text="欲しくなる。" x={96} y={410} size={150} from="l" outTo="u" />
          <Line t={t2} text="欲しがる範囲は、ある程度決まる。" x={100} y={640} size={48} weight={700} color={C.gray} t0={T02.u1 + 1.5} t1={T02.e1} />
          {/* おとり効果 */}
          <Line t={t2} text="選ばれない選択肢でも、" x={96} y={250} size={76} weight={700} t0={T02.e1 + 0.25} t1={T02.e2} dir="left" />
          <Slam t={t2} t0={T02.d1 + 0.1} out={T02.e2} text="判断は、動く。" x={96} y={370} size={136} from="l" outTo="l" />
          <Slam t={t2} t0={vt('02', 'おとり')} out={T02.e2} text="おとり効果" x={96} y={590} size={110} color={C.blue} from="d" outTo="l" s0={1.3} />
          <Line t={t2} text="選ばれうるなら、なおさら。" x={100} y={800} size={56} weight={700} color={C.gray} t0={T02.n1} t1={T02.e2} />
          {/* 実現できないものは、出さない */}
          <Line t={t2} text="だまそう、ではない。" x={100} y={170} size={56} weight={700} color={C.gray} t0={T02.e2 + 0.2} t1={X('02')} />
          <Line t={t2} text="今の予算と期間で、" x={96} y={280} size={76} weight={700} t0={vt('02', '今の予算')} t1={X('02')} dir="left" />
          <Line t={t2} text="実現できないものは、" x={96} y={390} size={76} weight={700} t0={vt('02', '実現')} t1={X('02')} dir="left" />
          <Slam t={t2} t0={T02.out} out={X('02')} text="出さない。" x={96} y={510} size={180} from="l" outTo="l" />
          <Line t={t2} text="後から揉める種は、かなり減る。" x={100} y={900} size={48} weight={700} color={C.gray} t0={T02.out + 0.55} t1={X('02')} />
        </>
      ) : null}

      {on(t3, '03') ? (
        <>
          <Line t={t3} text="相手は、" x={96} y={110} size={96} weight={700} t0={0.4} t1={T03.r0 - 0.15} dir="left" />
          <Slam t={t3} t0={vt('03', 'そう受け')} out={T03.r0 - 0.15} text="そう受け取らない。" x={96} y={230} size={150} from="l" outTo="u" s0={1.35} />
          {/* 相手の返事（右から） */}
          <Line t={t3} text="お金も時間も、出すから。" x={1824} y={110} size={80} weight={700} anchor="r" t0={T03.r0 + 0.1} t1={T03.flip - 2.0} dir="right" />
          <Slam t={t3} t0={vt('03', 'やって')} out={T03.flip - 2.0} text="やって。" x={1180} y={220} size={210} from="r" outTo="r" />
          <Line t={t3} text="その案は、" x={100} y={110} size={76} weight={700} color={C.gray} t0={vt('03', 'その案')} t1={T03.flip - 0.1} />
          {/* ホイップパンの先 */}
          <Slam t={t3} t0={T03.flip + 0.3} out={X('03')} text="やる前提" x={96} y={150} size={300} color={C.red} from="l" outTo="u" s0={1.6} />
          <Slam t={t3} t0={T03.flip + 0.75} out={X('03')} text="に、載る。" x={96} y={500} size={150} from="l" outTo="l" s0={1.3} />
        </>
      ) : null}

      {on(t4, '04') ? (
        <>
          <Line t={t4} text="かといって、根拠のない" x={100} y={190} size={60} weight={700} color={C.gray} t0={0.4} t1={T04.b0} />
          <Line t={t4} text="法外な金額は、" x={96} y={290} size={116} t0={vt('04', '法外')} t1={T04.b0} dir="left" />
          <Slam t={t4} t0={T04.k0} out={T04.b0} text="出せない。" x={96} y={440} size={250} from="l" outTo="u" />
          {/* 数百万円 */}
          <Line t={t4} text="数百万円と、答えれば。" x={96} y={190} size={92} weight={700} t0={T04.b0 + 0.3} t1={T04.c0} dir="left" />
          <Line t={t4} text="やるべきではないことを、" x={100} y={350} size={60} weight={700} color={C.gray} t0={vt('04', 'やるべきではないことを')} t1={T04.c0} />
          <Line t={t4} text="その金額で、" x={96} y={450} size={110} t0={vt('04', 'その金額')} t1={T04.c0} dir="left" />
          <Slam t={t4} t0={T04.take} out={T04.c0} text="引き受ける。" x={96} y={590} size={200} from="l" outTo="l" />
          {/* 選ぶ権利を、渡す */}
          <Line t={t4} text="断るための婉曲が、" x={100} y={170} size={68} weight={700} color={C.gray} t0={T04.c0 + 0.3} t1={T04.d0} />
          <Line t={t4} text="選ぶ権利を、" x={96} y={290} size={150} t0={T04.right} t1={T04.d0} dir="left" />
          <Slam t={t4} t0={T04.give + 0.1} out={T04.d0} text="渡す。" x={96} y={480} size={340} from="l" outTo="l" />
          {/* 自分の意見として言う */}
          <Line t={t4} text="だから、" x={100} y={170} size={68} weight={700} color={C.gray} t0={T04.d0 + 0.25} t1={X('04')} />
          <Slam t={t4} t0={vt('04', '今は')} out={X('04')} text="今は、やるべきではない。" x={96} y={290} size={124} from="l" outTo="u" s0={1.3} />
          <Slam t={t4} t0={T04.why} out={X('04')} text="なぜなら、" x={96} y={500} size={260} color={C.blue} from="l" outTo="l" />
        </>
      ) : null}

      {on(t5, '05') ? (
        <>
          <Line t={t5} text="「費用がかかります」も、" x={96} y={120} size={80} weight={700} t0={0.4} t1={T05.b0} dir="left" />
          <Slam t={t5} t0={T05.same} out={T05.b0} text="同じ。" x={96} y={240} size={210} from="l" outTo="u" />
          <Slam t={t5} t0={T05.pay} out={T05.b0} text="「払うから。」" x={96} y={800} size={150} from="r" outTo="l" s0={1.35} />
          {/* 費用の話は、出さない */}
          <Line t={t5} text="やるべきではないなら、" x={100} y={160} size={68} weight={700} color={C.gray} t0={T05.b0 + 0.25} t1={T05.c0} />
          <Line t={t5} text="費用の話は、" x={96} y={270} size={124} t0={vt('05', '費用の話')} t1={T05.c0} dir="left" />
          <Slam t={t5} t0={T05.no} out={T05.c0} text="出さない。" x={96} y={430} size={250} from="l" outTo="l" />
          {/* 理由を、先に */}
          <Slam t={t5} t0={T05.c0 + 0.2} out={X('05')} text="理由を、先に。" x={96} y={130} size={150} from="u" outTo="u" />
          <Line t={t5} text="個人の好き嫌いは、" x={100} y={410} size={62} weight={700} color={C.gray} t0={T05.g0} t1={T05.s0} />
          <Line t={t5} text="載せない。" x={96} y={500} size={130} t0={T05.g1} t1={T05.s0} dir="left" />
          <Line t={t5} text="そのうえで、" x={100} y={400} size={62} weight={700} color={C.gray} t0={T05.s0 + 0.35} t1={X('05')} />
          <Line t={t5} text="それでも、" x={96} y={490} size={110} t0={T05.still} t1={X('05')} dir="left" />
          <Slam t={t5} t0={T05.still + 0.6} out={X('05')} text="やりますか。" x={96} y={630} size={190} from="l" outTo="l" />
          <Line t={t5} text="選ぶのは、相手。" x={100} y={890} size={56} weight={700} color={C.gray} t0={T05.choose} t1={X('05')} />
        </>
      ) : null}

      {on(t6, '06') ? (
        <>
          <Line t={t6} text="調整できるのは、" x={100} y={150} size={72} weight={700} color={C.gray} t0={0.4} t1={T06.b0} />
          <Line t={t6} text="品質" x={96} y={260} size={150} t0={T06.q0} t1={T06.q - 0.15} dir="left" />
          <Line t={t6} text="納期" x={96} y={440} size={150} t0={T06.n0} t1={T06.q - 0.15} dir="left" />
          <Line t={t6} text="費用" x={96} y={620} size={150} t0={T06.c0} t1={T06.q - 0.15} dir="left" />
          <Line t={t6} text="品質は、ほとんど通らない。" x={96} y={270} size={64} weight={700} t0={T06.q + 0.2} t1={T06.b0} dir="left" />
          <Line t={t6} text="納期も、抵抗が強い。" x={96} y={370} size={64} weight={700} t0={T06.n} t1={T06.b0} dir="left" />
          <Line t={t6} text="「お金で、" x={96} y={510} size={120} t0={T06.m} t1={T06.b0} dir="left" />
          <Slam t={t6} t0={T06.m + 0.45} out={T06.b0} text="何とかして。」" x={96} y={660} size={146} from="l" outTo="l" />
          {/* お金で、時間は買えない */}
          <Slam t={t6} t0={T06.b0 + 0.2} out={T06.e0} text="お金で、時間は買えない。" x={96} y={90} size={124} from="u" outTo="u" s0={1.3} />
          <Line t={t6} text="3倍払っても、" x={96} y={270} size={80} weight={700} t0={T06.x3} t1={T06.c1} dir="left" />
          <Slam t={t6} t0={T06.late} out={T06.c1} text="間に合わない" x={96} y={370} size={150} from="l" outTo="l" />
          <Line t={t6} text="ことがある。" x={1010} y={378} size={60} weight={700} color={C.gray} t0={T06.late + 0.7} t1={T06.c1} />
          <Line t={t6} text="人を足すと、" x={96} y={270} size={80} weight={700} t0={T06.c1 + 0.2} t1={T06.d0} dir="left" />
          <Slam t={t6} t0={T06.more} out={T06.d0} text="さらに遅れる。" x={96} y={370} size={150} from="l" outTo="l" />
          <Line t={t6} text="という経験則。" x={1160} y={290} size={56} weight={700} color={C.gray} t0={vt('06', 'という経験則')} t1={T06.d0} />
          <Line t={t6} text="お金で解決できる段階なら、" x={100} y={280} size={60} weight={700} color={C.gray} t0={T06.d0 + 0.2} t1={T06.e0} />
          <Slam t={t6} t0={T06.hand} out={T06.e0} text="それも、一つの手。" x={96} y={380} size={116} color={C.grayDark} from="l" outTo="l" s0={1.25} />
          {/* 一緒に選び直す */}
          <Line t={t6} text="できない段階なら、" x={100} y={150} size={64} weight={700} color={C.gray} t0={T06.e0 + 0.35} t1={X('06')} />
          <Line t={t6} text="何が足りないかを、伝える。" x={96} y={250} size={84} weight={700} t0={T06.tell} t1={X('06')} dir="left" />
          <Slam t={t6} t0={T06.together} out={X('06')} text="一緒に、選び直す。" x={96} y={400} size={136} from="l" outTo="l" />
        </>
      ) : null}

      {on(t7, '07') ? (
        <>
          <Line t={t7} text="ただ、" x={100} y={120} size={68} weight={700} color={C.gray} t0={0.4} t1={T07.b0} />
          <Slam t={t7} t0={T07.stop} out={T07.b0} text="「無理です。」" x={96} y={210} size={290} from="u" outTo="u" s0={1.7} />
          <Line t={t7} text="だけでは、交渉が止まる。" x={96} y={560} size={76} weight={700} t0={vt('07', 'だけでは')} t1={T07.b0} dir="left" />
          {/* 引き受けられるカードだけ */}
          <Line t={t7} text="何も出さない、とは違う。" x={100} y={120} size={60} weight={700} color={C.gray} t0={T07.b0 + 0.3} t1={T07.c0} />
          <Line t={t7} text="引き受けられる" x={96} y={230} size={124} t0={T07.only} t1={T07.c0} dir="left" />
          <Slam t={t7} t0={T07.cards} out={T07.c0} text="カードだけ。" x={96} y={390} size={250} from="l" outTo="l" />
          {/* 出した札は、選ばれうる */}
          <Line t={t7} text="出したカードは、" x={96} y={150} size={84} weight={700} t0={T07.c0 + 0.25} t1={X('07')} dir="left" />
          <Slam t={t7} t0={T07.sure} out={X('07')} text="必ず、選ばれうる。" x={96} y={260} size={112} from="l" outTo="u" />
          <Line t={t7} text="本当に言えるときだけ、" x={96} y={490} size={76} weight={700} t0={T07.real} t1={X('07')} dir="left" />
          <Slam t={t7} t0={T07.cut} out={X('07')} text="切る。" x={96} y={600} size={190} from="l" outTo="l" />
        </>
      ) : null}

      {on(t8, '08') ? (
        <>
          <Line t={t8} text="できる、と言って、" x={96} y={140} size={84} weight={700} t0={0.4} t1={T08.b0} dir="left" />
          <Line t={t8} text="できなかった方が、" x={96} y={250} size={84} weight={700} t0={T08.fail} t1={T08.b0} dir="left" />
          <Line t={t8} text="よほど多くの人に、" x={100} y={400} size={62} weight={700} color={C.gray} t0={T08.many} t1={T08.b0} />
          <Slam t={t8} t0={T08.trouble} out={T08.b0} text="迷惑がかかる。" x={96} y={490} size={170} from="l" outTo="l" />
          {/* 本人の結論（縦に積む） */}
          <G s={end8} ox={96} oy={130} mv={t8 > CLIP08 - 0.36 && t8 < CLIP08 + 0.36}>
            <Line t={t8} text="できないことは、" x={96} y={110} size={110} t0={T08.b0 + 0.2} dir="left" />
            <Line t={t8} text="できないと、" x={96} y={250} size={110} t0={T08.b1} dir="left" />
            <Slam t={t8} t0={T08.agree} text="納得してもらう。" x={96} y={400} size={226} from="l" s0={1.45} grow={0} />
            <Line t={t8} text="言いそうになったら、一度、飲み込む。" x={100} y={730} size={52} weight={700} color={C.gray} t0={T08.c0} t1={T08.d0 - 0.2} />
            <Line t={t8} text="本当に伝えたいのは、" x={100} y={720} size={56} weight={700} color={C.gray} t0={T08.d0} />
            <Slam t={t8} t0={T08.maybe} text="たぶん、別の言葉。" x={96} y={810} size={116} color={C.gray} from="l" s0={1.2} grow={0} />
          </G>
        </>
      ) : null}
    </G>
  );
};
