// 01–10 の文字の層。箱は Main が全編で一つの層として描き、ここでは文字と札だけを置く。
// 各カットは t（カットの頭からの秒）と v（声の頭からの秒）で決まる。語の時刻は audio/voice/words.json。
// 箱の中に入る語（02・04 の内訳、05 の札）は、箱の位置（stageAt）と配分（boxAt）から画面座標を計算して重ねる。
// 文字は行・語の塊で動かし、字形は崩さない（常時の揺れ・脈動なし）。
import React from 'react';
import type {CutProps} from './Main';
import {C, E_SINK, E_SLAM, F, Lay, Line, VBlur, kv, lerp, outExpo, prog, slam, typeBase} from './kit';
import {boxAt} from './box';
import {S, boxPoint, stageAt} from './stage';

const AMBER_AT = (i0: number, n: number) => (i: number) => (i >= i0 && i < i0 + n ? C.amber : undefined);

// ---------------------------------------------------------------- 01 刺激は、得られる。余白は、失われる。
export const Cut01: React.FC<CutProps> = ({t, v}) => {
  // 二行は逆向きのマスクから入り、二行目が入ると一行目が押し上げられる
  const x1 = kv(v, [[3.8, 0], [4.45, -60, E_SINK], [7.6, -110, (k) => k]]);
  const y1 = kv(v, [[3.8, 60], [4.45, 0, E_SINK]]);
  const x2 = kv(v, [[4.6, 0], [7.6, 70, (k) => k]]);
  return (
    <>
      <Lay x={x1} y={y1}>
        <Line t={t} text="刺激は、得られる。" x={150} y={120} size={128} t0={1.2} t1={6.9} dir="up" colorAt={AMBER_AT(4, 4)} />
      </Lay>
      <Lay x={x2}>
        <Line t={t} text="余白は、失われる。" x={1770} y={300} size={128} anchor="r" t0={4.9} t1={6.95} dir="down" colorAt={(i) => (i < 2 ? C.green : undefined)} />
      </Lay>
    </>
  );
};

// ---------------------------------------------------------------- 02 学び。新しい出会い。（琥珀の面の中）
export const Cut02: React.FC<CutProps> = ({t, v, start}) => {
  const T = start + t;
  const st = stageAt(T);
  const [lx, top] = boxPoint(st, 0, 0);
  const hz = st.h * st.z;
  const s1 = slam(v, 1.2, 0.55, {y: 160, s: 1.25, r: -5});
  const s2 = slam(v, 3.85, 0.55, {y: 160, s: 1.25, r: 4});
  return (
    <>
      <Lay y={s1.y} s={s1.s} r={s1.r} o={s1.o} ox={lx + 200} oy={top + hz * 0.3}>
        <Line t={v} text="学び。" x={lx + 48} y={top + hz * 0.2} size={104} t0={1.2} t1={7.0} dur={0.35} inBox />
      </Lay>
      <Lay y={s2.y} s={s2.s} r={s2.r} o={s2.o} ox={lx + 300} oy={top + hz * 0.6}>
        <Line t={v} text="新しい出会い。" x={lx + 48} y={top + hz * 0.5} size={84} t0={3.85} t1={7.05} dur={0.35} inBox />
      </Lay>
    </>
  );
};

// ---------------------------------------------------------------- 03 楽しいのに、体が重い。
export const Cut03: React.FC<CutProps> = ({t, v}) => {
  const drop = E_SLAM(prog(v, 2.0, 2.6));
  // 「体が重い。」は上から重く落ちて着地し、その後も箱に押されるように下・左へ一段ずつ寄る
  const y = lerp(-260, 0, drop) + kv(v, [[2.6, 0], [3.4, 26, E_SINK], [6.6, 26], [7.3, 44, E_SINK]]);
  const x = kv(v, [[3.2, 0], [4.2, -36, E_SINK], [6.6, -36], [7.4, -80, E_SINK]]);
  return (
    <>
      <Lay x={kv(v, [[0, 40], [2.0, 0, E_SINK], [6.6, 0], [7.4, -40, E_SINK]])}>
        <Line t={v} text="楽しいのに、" x={150} y={150} size={96} color={C.gray} t0={0} t1={7.5} />
      </Lay>
      <Lay x={x} y={y} o={prog(v, 2.0, 2.08)}>
        <Line t={v} text="体が重い。" x={140} y={340} size={236} t0={2.0} t1={7.55} dur={0.25} stagger={0.015} />
      </Lay>
    </>
  );
};

// ---------------------------------------------------------------- 04 得られたものは、残る。（内訳: 学び・新しい出会い・縁）
export const Cut04: React.FC<CutProps> = ({t, v, start}) => {
  const T = start + t;
  const st = stageAt(T);
  const [lx, top] = boxPoint(st, 0, 0);
  const hz = st.h * st.z;
  const en = slam(v, 2.35, 0.55, {y: 120, s: 1.5, r: -8});
  const rest = slam(v, 2.85, 0.5, {y: 0, s: 1.7, r: 6});
  const push = kv(v, [[3.9, 1], [4.6, 1.08, E_SINK], [7.5, 1.1, (k) => k]]);
  return (
    <>
      <Line t={v} text="学び" x={lx + 36} y={top + hz * 0.18} size={54} t0={-0.2} t1={7.6} inBox />
      <Line t={v} text="新しい出会い" x={lx + 36} y={top + hz * 0.32} size={54} t0={0.35} t1={7.65} inBox />
      <Lay y={en.y} s={en.s} r={en.r} o={en.o} ox={lx + 120} oy={top + hz * 0.56}>
        <Line t={v} text="縁。" x={lx + 32} y={top + hz * 0.46} size={130} t0={2.35} t1={7.7} dur={0.3} inBox />
      </Lay>
      <Lay x={kv(v, [[0.4, 80], [1.4, 0, E_SINK], [7.5, -30, (k) => k]])}>
        <Line t={v} text="得られたものは、" x={1060} y={300} size={92} color={C.gray} t0={0.6} t1={6.6} />
      </Lay>
      <Lay s={rest.s * push} r={rest.r} o={rest.o} ox={1080} oy={600}>
        <Line t={v} text="残る。" x={1050} y={450} size={250} t0={2.85} t1={6.8} dur={0.25} stagger={0.02} />
      </Lay>
    </>
  );
};

// ---------------------------------------------------------------- 05・06 の札「いつもの作業」（やれたはずのこと）
// 05 で白い領域に置かれ、灰に押されて箱の外へ押し出される。06 では左下へ退き、画面に残る。
const TAG_SIZE = 40;
const Tag: React.FC<{x: number; y: number; s: number; o?: number}> = ({x, y, s, o = 1}) =>
  o <= 0.01 ? null : (
    <div style={{position: 'absolute', left: x, top: y, transform: `translate(-50%, -50%) scale(${s})`, opacity: o, padding: '14px 26px', border: `4px solid ${C.green}`, background: C.paper, fontFamily: F.noto, fontWeight: 700, fontSize: TAG_SIZE, lineHeight: 1, color: C.ink, whiteSpace: 'nowrap', fontFeatureSettings: '"palt" 1'}}>
      <span data-ch="box">いつもの作業</span>
    </div>
  );
const TAG_OUT: [number, number] = [1500, 905];
export const Cut05: React.FC<CutProps> = ({t, v, start}) => {
  const T = start + t;
  const st = stageAt(T);
  const b = boxAt(T, S);
  // 白い領域の中心（箱の中）
  const [wx, wy] = boxPoint(st, b.a + b.g + b.w / 2, 0.5);
  // 白が札より狭くなる前（声「移動のあいだに」）に、まず下へ、続いて右へ押し出す
  const kOut = E_SINK(prog(v, 0.9, 2.1));
  const kDown = E_SINK(prog(v, 0.9, 1.6));
  const kSide = E_SINK(prog(v, 1.3, 2.1));
  const pop = outExpo(prog(v, 0.6, 1.0));
  const tx = lerp(wx, TAG_OUT[0], kSide);
  const ty = lerp(wy, TAG_OUT[1], kDown);
  // 上の行は灰が押すのと同じ間に右へ流れ続け、下の行は「止まります」で急に止まる
  const flow = kv(t, [[0.6, 0], [4.6, 230, (k) => k], [9.2, 330, (k) => k]]);
  const stop = kv(v, [[2.3, 300], [3.6, 0, (k) => 1 - Math.pow(1 - k, 4)]]);
  return (
    <>
      <Lay x={flow}>
        <Line t={v} text="予定は、続く。" x={140} y={110} size={120} t0={-0.2} t1={8.5} dir="left" />
      </Lay>
      <Lay x={stop}>
        <Line t={v} text="手元は、止まる。" x={520} y={280} size={120} t0={2.3} t1={8.55} dir="right" />
      </Lay>
      {t < 9.5 && <Tag x={tx} y={ty} s={lerp(0.5, 1, kOut) * pop} o={pop} />}
      <Line t={v} text="やれたはずのこと" x={1290} y={888} size={34} weight={400} color={C.gray} anchor="r" t0={5.3} t1={8.6} dir="right" />
    </>
  );
};

// ---------------------------------------------------------------- 06 日常は、待ってくれない。（翌日）
const TAG_LEFT: [number, number] = [330, 950];
export const Cut06: React.FC<CutProps> = ({t, v}) => {
  const k = E_SINK(prog(t, 0.0, 1.0));
  // 「翌日」は横の Whip pan で右から入る（短いぶれだけ。フラッシュ・常時のぶれなし）
  const kw = outExpo(prog(v, 1.7, 2.25));
  const blur = Math.sin(Math.PI * Math.min(1, prog(v, 1.7, 2.1))) * 22;
  const wd = slam(v, 6.0, 0.5, {y: 0, s: 1.15, r: -3});
  return (
    <>
      {t > 0 && <Tag x={lerp(TAG_OUT[0], TAG_LEFT[0], k)} y={lerp(TAG_OUT[1], TAG_LEFT[1], k)} s={lerp(1, 0.86, k)} o={1 - prog(t, 8.6, 9.0)} />}
      {v > 1.65 && (
        <Lay x={(1 - kw) * 900 + kv(v, [[2.25, 0], [8.5, -60, (q) => q]])} o={1 - prog(t, 8.6, 9.0)}>
          <VBlur id="yokujitsu" n={blur} x>
            <div style={{...typeBase, left: 1440, top: 880, fontFamily: F.noto, fontWeight: 700, fontSize: 110, color: C.ink}}>
              {Array.from('翌日').map((c, i) => (
                <span key={i} data-ch="1" style={{display: 'inline-block'}}>
                  {c}
                </span>
              ))}
            </div>
          </VBlur>
        </Lay>
      )}
      <Lay x={kv(v, [[0.2, 0], [2.4, -30, (q) => q], [2.9, 40, E_SINK], [8.5, -20, (q) => q]])}>
        <Line t={v} text="日常は、" x={150} y={90} size={100} color={C.gray} t0={0.2} t1={8.5} />
      </Lay>
      <Lay s={wd.s * kv(v, [[7.0, 1], [7.6, 1.07, E_SINK], [8.6, 1.09, (q) => q]])} r={wd.r} o={wd.o} ox={130} oy={330} x={kv(v, [[6.5, 0], [8.5, 40, (q) => q]])}>
        <Line t={v} text="待ってくれない。" x={130} y={230} size={176} t0={6.0} t1={8.55} dur={0.3} stagger={0.02} dir="left" />
      </Lay>
    </>
  );
};

// ---------------------------------------------------------------- 07 使える時間は、自分だけのものではない。（全面インサート: 家の時間）
export const Cut07: React.FC<CutProps> = ({t}) => {
  const back = slam(t, 7.25, 0.55, {y: 0, s: 1.35, r: -5});
  return (
    <>
      <Lay s={kv(t, [[0.3, 0.92], [1.0, 1, E_SINK], [2.1, 1, (k) => k], [2.8, 1.14, E_SINK], [4.1, 1.18, (k) => k]])} x={kv(t, [[2.1, 0], [2.8, 60, E_SINK]])} ox={150} oy={260}>
        <Line t={t} text="使える時間は、" x={150} y={190} size={130} t0={0.3} t1={4.1} />
      </Lay>
      <Lay x={kv(t, [[7.0, 60], [7.8, 0, E_SINK], [11.0, -50, (k) => k]])}>
        <Line t={t} text="使える時間は、" x={160} y={110} size={84} color={C.gray} t0={7.0} t1={10.95} />
      </Lay>
      <Lay s={back.s * kv(t, [[7.8, 1], [8.9, 1], [9.5, 1.07, E_SINK], [11, 1.09, (k) => k]])} x={kv(t, [[8.9, 0], [9.5, 40, E_SINK]])} r={back.r} o={back.o} ox={150} oy={340}>
        <Line t={t} text="自分だけのものではない。" x={150} y={250} size={124} t0={7.25} t1={11.0} dur={0.3} stagger={0.015} />
      </Lay>
    </>
  );
};

// ---------------------------------------------------------------- 08 疲れてからでは、遅い。→ 休息 → 予防が、先。
export const Cut08: React.FC<CutProps> = ({t}) => {
  const p = slam(t, 7.0, 0.55, {y: 160, s: 1.4, r: 6});
  return (
    <>
      <Lay x={kv(t, [[0.0, 80], [0.9, 0, E_SINK], [2.6, -30, (k) => k], [3.1, -110, E_SINK]])} s={kv(t, [[2.6, 1], [3.1, 1.08, E_SINK]])} ox={150} oy={300}>
        <Line t={t} text="疲れてからでは、" x={150} y={150} size={124} t0={0.05} t1={4.0} />
        <Line t={t} text="遅い。" x={1190} y={110} size={190} t0={2.6} t1={4.0} dur={0.3} />
      </Lay>
      <Lay y={p.y} s={p.s * kv(t, [[7.6, 1], [8.1, 1.06, E_SINK], [9.4, 1.09, (k) => k]])} r={p.r} o={p.o} ox={150} oy={300}>
        <Line t={t} text="予防が、先。" x={150} y={150} size={270} t0={7.0} t1={9.0} dur={0.3} stagger={0.02} />
      </Lay>
    </>
  );
};

// ---------------------------------------------------------------- 09 飲みすぎない。→ 酒器と水 → 溜めない。それでも、無理はする。
export const Cut09: React.FC<CutProps> = ({t}) => {
  const d = slam(t, 4.85, 0.55, {y: 200, s: 1.45, r: -6});
  return (
    <>
      <Line t={t} text="飲みすぎない。" x={150} y={230} size={150} t0={0.2} t1={2.1} />
      <Lay y={d.y + kv(t, [[5.8, 0], [6.4, -30, E_SINK]])} s={d.s * kv(t, [[5.8, 1], [6.4, 0.94, E_SINK], [9.0, 0.96, (k) => k]])} r={d.r} o={d.o} ox={150} oy={260} x={kv(t, [[5.4, 0], [9.0, -50, (k) => k]])}>
        <Line t={t} text="溜めない。" x={150} y={100} size={290} t0={4.85} t1={8.3} dur={0.3} stagger={0.02} />
      </Lay>
      <Lay x={kv(t, [[5.9, 60], [6.7, 0, E_SINK], [9.0, -40, (k) => k]])}>
        <Line t={t} text="それでも、無理はする。" x={1790} y={520} size={80} anchor="r" t0={5.9} t1={8.25} dir="left" />
      </Lay>
    </>
  );
};

// ---------------------------------------------------------------- 10 結び（五行の階段）
const STEPS10: [number, number][] = [
  [2.1, 150],
  [5.4, 90],
  [7.0, 40],
  [8.4, 0],
];
export const Cut10: React.FC<CutProps> = ({v}) => {
  // 行が入るたびに、行の塊を一段ずつ押し上げる（常時の漂いではなく、声の区切りで一段）
  let y = 210;
  let prev = 210;
  for (const [at, to] of STEPS10) {
    y = lerp(prev, to, E_SINK(prog(v, at - 0.1, at + 0.55)));
    if (v < at + 0.55) break;
    prev = to;
  }
  const big = kv(v, [[8.4, 1], [9.2, 1.03, E_SINK], [13.5, 1.06, (k) => k]]);
  return (
    <Lay y={y}>
      <Line t={v} text="刺激は、ありがたい。" x={150} y={250} size={84} t0={0.0} colorAt={AMBER_AT(0, 2)} />
      <Line t={v} text="余白を、前提にする。" x={230} y={380} size={84} t0={2.1} colorAt={(i) => (i < 2 ? C.green : undefined)} />
      <Line t={v} text="立ち止まることを、" x={310} y={510} size={84} t0={5.4} />
      <Lay s={big} ox={150} oy={760}>
        <Line t={v} text="自分に許してみても" x={150} y={660} size={128} t0={7.0} />
        <Line t={v} text="いいのではないでしょうか。" x={150} y={826} size={128} t0={8.4} />
      </Lay>
    </Lay>
  );
};

export const SCENES: Record<string, React.FC<CutProps>> = {
  '01': Cut01,
  '02': Cut02,
  '03': Cut03,
  '04': Cut04,
  '05': Cut05,
  '06': Cut06,
  '07': Cut07,
  '08': Cut08,
  '09': Cut09,
  '10': Cut10,
};
