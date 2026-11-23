// 画面の語（DOM／CSS）。詰め組・行のマスク・塊の着地。字形は崩さない。
// 語の時刻は、ナレーションの文字ごとの時刻（audio/voice/words.json）＋ 各カットの声の頭 0.35 秒に合わせた。
import React from 'react';
import {project, type CamS} from './cam';
import {C, F, G, Line, Txt, clamp, inOut, lerp, mix, out3, outExpo, prog, slam} from './kit';
import {POS, PX, wx, wy} from './score';
import {dotE3, needleX04} from './world';
import {at, D} from './timeline';

// 世界座標（カット原点＋画面 px）の矩形を投影して、検査用の見えない data-fig を出す
const Fig: React.FC<{cam: CamS; cut: string; x: number; y: number; w: number; h: number; on?: boolean}> = ({cam, cut, x, y, w, h, on = true}) => {
  if (!on) return null;
  const a = project(cam, POS[cut][0] + wx(x), POS[cut][1] + wy(y), 0);
  const b = project(cam, POS[cut][0] + wx(x + w), POS[cut][1] + wy(y + h), 0);
  if (a.w <= 0 || b.w <= 0) return null;
  return <div data-fig="1" style={{position: 'absolute', left: a.x, top: a.y, width: b.x - a.x, height: b.y - a.y, pointerEvents: 'none'}} />;
};

// 着地する語の塊
const Slam: React.FC<{t: number; t0: number; out?: number; text: string; x: number; y: number; size: number; color?: string; from?: 'l' | 'r' | 'u' | 'd'; outTo?: 'l' | 'r' | 'u' | 'd'; s0?: number; weight?: number}> = ({
  t, t0, out, text, x, y, size, color, from = 'r', outTo = 'l', s0 = 1.5, weight,
}) => {
  const v = {l: [-1, 0], r: [1, 0], u: [0, -1], d: [0, 1]};
  const s = slam(t, t0, {dur: 0.42, x: v[from][0] * 150, y: v[from][1] * 90, s: s0, r: 0, grow: 0.004, out, outX: v[outTo][0] * 260, outY: v[outTo][1] * 160});
  if (s.o <= 0.001) return null;
  return (
    <G dx={s.dx} dy={s.dy} s={s.s} ox={x} oy={y + size / 2} o={s.o} mv={s.mv}>
      <Txt text={text} x={x} y={y} size={size} color={color} weight={weight} />
    </G>
  );
};

// 99% → 99.9%: 足す桁の列だけを、下から定位置へ入れる
const Percent: React.FC<{t: number; x: number; y: number; size: number; kAdd: number}> = ({x, y, size, kAdd}) => {
  const ch = (c: string, i: number) => (
    <span key={i} data-ch="1" style={{display: 'inline-block'}}>
      {c}
    </span>
  );
  return (
    <div style={{position: 'absolute', left: x, top: y, whiteSpace: 'nowrap', lineHeight: 1, fontFamily: F.g, fontFeatureSettings: '"palt" 1', fontSize: size, fontWeight: 900, color: C.ink, display: 'flex'}}>
      {ch('9', 0)}
      {ch('9', 1)}
      <span style={{display: 'inline-block', overflow: 'hidden', maxWidth: kAdd * size * 0.95, height: size * 1.1, marginBottom: -size * 0.1}} data-mv={kAdd < 0.98 ? '1' : undefined}>
        <span style={{display: 'inline-block', transform: `translateY(${(1 - kAdd) * 110}%)`}}>
          {ch('.', 2)}
          {ch('9', 3)}
        </span>
      </span>
      {ch('%', 4)}
    </div>
  );
};

export const Type: React.FC<{T: number; cam: CamS}> = ({T, cam}) => {
  const t1 = T - at('01', 0);
  const t2 = T - at('02', 0);
  const t3 = T - at('03', 0);
  const t4 = T - at('04', 0);
  const t5 = T - at('05', 0);
  const t6 = T - at('06', 0);
  const t7 = T - at('07', 0);
  const on = (t: number, id: string) => t > -0.3 && t < D[id] + 0.4;

  // 02: ラベルの移動（左の特大 → 下の段）
  const k3 = inOut(prog(t2, 12.4, 13.4));
  const kAdd = outExpo(prog(t2, 16.2, 16.9));
  // 04: 問いが小さい灰の一行へ退く
  const q4 = inOut(prog(t4, 6.45, 6.95));
  // 07: 結びの寄り
  const end7 = 1 + 0.04 * inOut(prog(t7, 11.7, D['07']));

  return (
    <G>
      {on(t1, '01') ? (
        <>
          {/* 動画の上: 言われたこと */}
          <Line t={t1} text="100%じゃないと、" x={100} y={130} size={88} weight={700} color={C.grayDark} t0={0.5} t1={4.55} dir="left" />
          <Slam t={t1} t0={2.1} out={4.55} text="使えない。" x={96} y={250} size={250} from="l" outTo="u" />
          {/* 紙の上: 問い */}
          <Line t={t1} text="100%じゃないと、使えない。" x={100} y={96} size={46} weight={500} color={C.gray} t0={5.2} t1={11.6} />
          <Line t={t1} text="何%なら、" x={96} y={250} size={160} t0={5.45} t1={11.6} dir="left" />
          <Slam t={t1} t0={6.55} out={11.62} text="使うのか。" x={96} y={440} size={270} from="r" outTo="l" />
          <Fig cam={cam} cut="01" x={1480} y={720} w={160} h={160} on={t1 > 8} />
        </>
      ) : null}

      {on(t2, '02') ? (
        <>
          <Slam t={t2} t0={1.6} out={7.5} text="10回のうち、8回。" x={96} y={120} size={124} from="l" outTo="u" s0={1.35} />
          <Line t={t2} text="多数決に、近い。" x={100} y={850} size={66} weight={700} color={C.gray} t0={5.9} t1={7.3} />
          <Line t={t2} text="100回のうち、99回。" x={100} y={330} size={58} weight={700} color={C.gray} t0={8.9} t1={12.2} />
          {/* 下の段の紙（1000個の点は文字の段に入れない） */}
          {t2 > 12.3 && t2 < 18.9 ? (
            <div style={{position: 'absolute', left: 0, top: 700, width: 1920, height: 380, opacity: k3 * (1 - prog(t2, 18.5, 18.9)), background: `linear-gradient(180deg, rgba(247,244,238,0) 0%, ${C.paper} 14%)`}} />
          ) : null}
          {t2 > 10.3 && t2 < 18.8 ? (
            <G
              dx={0}
              dy={lerp(0, 370, k3)}
              s={slam(t2, 10.3, {s: 1.4, grow: 0}).s * lerp(1, 0.62, k3)}
              ox={96}
              oy={560}
              o={slam(t2, 10.3, {out: 18.4, outX: -260}).o}
              mv={(t2 < 10.6) || (k3 > 0.01 && k3 < 0.99) || t2 > 18.38}
            >
              <Percent t={t2} x={96} y={410} size={300} kAdd={kAdd} />
            </G>
          ) : null}
          <Line t={t2} text="1000回のうち、999回。" x={900} y={868} size={58} weight={700} color={C.gray} t0={13.7} t1={18.3} />
          {/* 動画の上 */}
          <Line t={t2} text="100%には、" x={100} y={590} size={112} t0={19.0} t1={D['02'] - 0.32} dir="left" />
          <Slam t={t2} t0={19.95} out={D['02'] - 0.32} text="ならない。" x={96} y={730} size={156} from="l" outTo="l" />
          <Line t={t2} text="雑だから、ではない。" x={1290} y={900} size={56} weight={700} color={C.grayDark} t0={21.4} t1={D['02'] - 0.32} />
          <Fig cam={cam} cut="02" x={380} y={530} w={1160} h={130} on={t2 > 1 && t2 < 7.7} />
          <Fig cam={cam} cut="02" x={980} y={140} w={745} h={745} on={t2 > 8.7 && t2 < 12.4} />
          <Fig cam={cam} cut="02" x={dotE3[0] - 12} y={dotE3[1] - 12} w={24} h={24} on={t2 > 13.5 && t2 < 18.4} />
        </>
      ) : null}

      {on(t3, '03') ? (
        <>
          <Line t={t3} text="100%が、必要なら。" x={764} y={250} size={60} weight={700} color={C.gray} t0={0.6} t1={5.3} />
          <Slam t={t3} t0={2.8} out={5.35} text="完全に、一致。" x={760} y={370} size={150} from="r" outTo="u" />
          <Line t={t3} text="毎回、同じ。" x={764} y={580} size={84} weight={700} t0={4.5} t1={5.35} />
          {/* 動画の窓の上の紙 */}
          <Line t={t3} text="表記の揺れ" x={100} y={110} size={72} weight={700} t0={5.95} t1={11.0} dir="left" />
          <Line t={t3} text="想定外の書き方" x={100} y={230} size={72} weight={700} t0={7.2} t1={11.0} dir="left" />
          <Slam t={t3} t0={8.9} out={11.0} text="拾えない。" x={800} y={110} size={220} from="r" outTo="r" />
          {/* 門の右 */}
          <Slam t={t3} t0={12.2} out={D['03'] - 0.32} text="プログラムの仕事。" x={760} y={300} size={96} from="r" outTo="u" s0={1.3} />
          <Line t={t3} text="AIと、100%は、" x={764} y={480} size={64} weight={700} color={C.gray} t0={14.1} t1={D['03'] - 0.32} />
          <Slam t={t3} t0={15.9} out={D['03'] - 0.32} text="同時には、満たせない。" x={760} y={580} size={100} from="r" outTo="u" s0={1.35} />
          <Fig cam={cam} cut="03" x={300} y={330} w={368} h={470} on={t3 < 5.5 || t3 > 11.4} />
        </>
      ) : null}

      {on(t4, '04') ? (
        <>
          <Slam t={t4} t0={0.9} out={4.15} text="95%以上なら、いい。" x={96} y={260} size={124} color={C.gray} from="l" outTo="u" s0={1.3} />
          {t4 > 4.4 && t4 < 7.95 ? (
            <G dx={0} dy={lerp(0, -196, q4)} s={slam(t4, 4.5, {s: 1.5, grow: 0}).s * lerp(1, 0.31, q4)} ox={96} oy={340} o={slam(t4, 4.5, {out: 7.6, outX: -200}).o} mv={t4 < 4.8 || (q4 > 0.01 && q4 < 0.99) || t4 > 7.58}>
              <Txt text="なぜ、95%なのか。" x={96} y={250} size={180} color={mix(C.ink, C.gray, q4)} />
            </G>
          ) : null}
          <Slam t={t4} t0={6.8} out={7.62} text="根拠が、要る。" x={96} y={330} size={210} from="l" outTo="l" />
          {/* 動画の上 */}
          <Line t={t4} text="なんとなくは、" x={100} y={330} size={112} t0={8.9} t1={12.15} dir="left" />
          <Slam t={t4} t0={9.75} out={12.15} text="危険。" x={96} y={480} size={260} from="l" outTo="l" />
          {/* 戻り */}
          <Line t={t4} text="なぜ、95%なのか。" x={96} y={116} size={56} weight={700} color={C.gray} t0={12.55} t1={D['04'] - 0.32} />
          <Line t={t4} text="根拠が、要る。" x={96} y={330} size={210} t0={12.6} t1={D['04'] - 0.32} dir="left" />
          <Line t={t4} text="理由を示せば、納得の道もある。" x={100} y={590} size={60} weight={700} color={C.gray} t0={13.3} t1={D['04'] - 0.32} />
          <Fig cam={cam} cut="04" x={needleX04(t4) - 20} y={718} w={40} h={90} on={t4 < 7.9 || t4 > 12.6} />
        </>
      ) : null}

      {on(t5, '05') ? (
        <>
          <Slam t={t5} t0={0.9} out={4.0} text="95%で、成功。" x={96} y={290} size={210} from="l" outTo="l" />
          <Line t={t5} text="目標を、達成しました。" x={100} y={540} size={64} weight={700} color={C.gray} t0={2.5} t1={4.0} />
          {/* 動画の上 */}
          <Slam t={t5} t0={5.6} out={9.9} text="98%の、つもり。" x={96} y={84} size={150} from="r" outTo="l" s0={1.35} />
          <Line t={t5} text="嘘ではない。" x={100} y={880} size={92} weight={700} color={C.ink} t0={8.5} t1={9.9} />
          {/* 二つの印の面 */}
          <Line t={t5} text="95%で、成功。" x={640} y={500} size={50} weight={700} color={C.gray} anchor="c" t0={10.7} t1={D['05'] - 0.32} />
          <Line t={t5} text="98%の、つもり。" x={1180} y={500} size={50} weight={700} anchor="c" t0={10.85} t1={D['05'] - 0.32} />
          <Line t={t5} text="目標が、ずれていた。" x={100} y={810} size={84} weight={700} t0={11.1} t1={D['05'] - 0.32} dir="left" />
          <Slam t={t5} t0={13.45} out={D['05'] - 0.32} text="結論が、覆る。" x={96} y={150} size={230} from="u" outTo="l" />
          <Line t={t5} text="書き方では、戻せない。" x={1040} y={828} size={58} weight={700} color={C.gray} t0={14.4} t1={D['05'] - 0.32} />
          <Fig cam={cam} cut="05" x={580} y={700} w={40} h={90} on={t5 < 4.2} />
          <Fig cam={cam} cut="05b" x={620} y={580} w={580} h={126} on={t5 > 10.6} />
        </>
      ) : null}

      {on(t6, '06') ? (
        <>
          {/* 動画の上 */}
          <Slam t={t6} t0={1.5} out={4.25} text="100%は、約束しない。" x={96} y={830} size={136} from="l" outTo="l" s0={1.35} />
          {/* 紙の上 */}
          <Line t={t6} text="100%は、約束しない。" x={100} y={104} size={56} weight={700} color={C.gray} t0={4.75} t1={D['06'] - 0.32} />
          <Line t={t6} text="人がやるより、" x={100} y={230} size={110} t0={4.85} t1={D['06'] - 0.32} dir="left" />
          <Slam t={t6} t0={5.5} out={D['06'] - 0.32} text="ミスを減らす。" x={96} y={370} size={210} from="r" outTo="l" />
          <Line t={t6} text="途中で、確かめる。" x={100} y={880} size={100} t0={8.4} t1={D['06'] - 0.32} dir="left" />
          <Fig cam={cam} cut="06" x={160} y={730} w={1530} h={100} on={t6 > 4.8} />
        </>
      ) : null}

      {on(t7, '07') ? (
        <>
          <Slam t={t7} t0={0.45} out={3.35} text="人がやるより、高ければ。" x={130} y={150} size={84} from="l" outTo="l" s0={1.3} />
          <Slam t={t7} t0={0.95} out={3.4} text="99%にしたい。" x={1040} y={400} size={120} from="r" outTo="r" s0={1.3} />
          <Slam t={t7} t0={1.45} out={3.45} text="試したのか。" x={200} y={690} size={104} from="d" outTo="d" s0={1.3} />
          <Line t={t7} text="先には、潰せない。" x={1220} y={880} size={56} weight={700} color={C.gray} t0={2.2} t1={3.4} />
          <Line t={t7} text="精度は、" x={96} y={200} size={170} t0={3.75} t1={7.3} dir="left" />
          <Line t={t7} text="技術ではなく、" x={800} y={282} size={76} weight={700} color={C.gray} t0={4.65} t1={7.3} />
          <Slam t={t7} t0={6.0} out={7.3} text="合意だ。" x={96} y={420} size={330} from="r" outTo="l" />
          {/* 動画の上: 結び */}
          <Line t={t7} text="何%かを。" x={100} y={690} size={86} weight={700} t0={8.1} t1={1e9} dir="left" />
          <Line t={t7} text="なぜかを。" x={520} y={690} size={86} weight={700} t0={9.1} t1={1e9} dir="left" />
          <G s={end7} ox={96} oy={900}>
            <Slam t={t7} t0={10.2} text="一緒に、決める。" x={96} y={820} size={170} from="l" />
          </G>
          <G s={end7} ox={96} oy={200}>
            <Slam t={t7} t0={11.6} text="精度は、合意だ。" x={96} y={100} size={190} from="r" s0={1.4} />
          </G>
        </>
      ) : null}
    </G>
  );
};
