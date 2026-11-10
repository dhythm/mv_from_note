// カット 08〜13。
// 08 答えは揺れる（同じカードから、毎回ちがう吹き出し）→ 一つに決まる（歯車の面）／09 歯車と吹き出しに分ける／10 関門と道具
// 11 急ぐのか・網羅するのか・どちらつかず／12 任せたいのは判断、漏れなく拾うなら負け戦／13 本人の結論
import React from 'react';
import {C, E_PUSH, E_SNAP, H, Lay, Line, Plate, Txt, W, clamp, hashR, in3, inOut, kv, lerp, out3, outBack, outExpo, prog, slam} from './kit';
import {Bubble, Card, Gear, Plug} from './figs';
import {PLATFORM} from './actC';
import {S} from './timeline';

const lin = (k: number) => k;
// 歯車の刻み: t0 から step 秒ごとに 45° ずつ、かちっと進む（毎回同じ動き＝答えが一つに決まる）
const tick = (t: number, t0: number, step = 0.8) => {
  if (t < t0) return 0;
  const n = Math.floor((t - t0) / step);
  return (n + E_SNAP(clamp((t - t0 - n * step) / 0.28))) * 45;
};
// しっぽの先の位置から、吹き出しの中心を求める
const fromTip = (tx: number, ty: number, w: number, h: number): [number, number] => [tx + w / 2 - Math.min(34, h * 0.28) + 6, ty - h / 2 - Math.min(54, h * 0.4)];

export const ActD: React.FC<{T: number}> = ({T}) => {
  const e = S['08'];
  const f = S['09'];
  const g = S['10'];
  const h = S['11'];
  if (T < e - 0.05 || T > h + 0.15) return null;

  // ---- 08: 揺れる答え ----
  const push8 = inOut(prog(T, e + 3.3, e + 4.05));
  const POPS = [e + 0.3, e + 1.2, e + 2.1];
  const SLOT = [
    {x: 0, y: 0, s: 1, r: -3},
    {x: 1370, y: 330, s: 0.62, r: 6},
    {x: 1610, y: 660, s: 0.5, r: -6},
  ];
  const DEF = [
    {text: '問題ありません', w: 620, h: 190, size: 74, stroke: C.gray, color: C.gray},
    {text: '別の答え', w: 520, h: 210, size: 96, stroke: C.ai, color: C.ai},
    {text: '問題ありません', w: 700, h: 170, size: 80, stroke: C.gray, color: C.gray},
  ];
  const bubbles = DEF.map((d, i) => {
    const [cx, cy] = fromTip(560, 790, d.w, d.h);
    let p = {x: cx, y: cy, s: 1, r: SLOT[0].r + i * 2};
    let mv = false;
    for (let n = i + 1; n < 3; n++) {
      const k = inOut(prog(T, POPS[n] - 0.05, POPS[n] + 0.5));
      const q = SLOT[n - i];
      p = {x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k), s: lerp(p.s, q.s, k), r: lerp(p.r, q.r, k)};
      mv = mv || (k > 0 && k < 1);
    }
    const fl = T - POPS[i];
    const pop = E_SNAP(prog(T, POPS[i], POPS[i] + 0.4));
    return {...d, ...p, y: p.y + 7 * Math.sin(fl * 1.1 + i * 2), pop, mv: mv || pop < 1};
  });
  const yure = slam(T, e + 1.7, 0.5, {x: -500, y: 0, s: 1.08, r: 0});
  const sway = 1.6 * Math.sin((T - e - 2.3) * 1.5) * prog(T, e + 2.3, e + 2.9);
  // ---- 歯車の面（08 後半は全面、09 で左半分、10 で左へ抜ける） ----
  const plateIn = inOut(prog(T, e + 3.3, e + 4.05));
  const ret = inOut(prog(T, f + 3.4, f + 4.1));
  const plateW = lerp(1, 0.5, ret);
  const out9 = E_PUSH(prog(T, g - 0.05, g + 0.45));
  const gx = kv(T, [
    [e + 3.3, 2500],
    [e + 4.15, 1400, out3],
    [f, 1400],
    [f + 0.8, 628],
    [f + 3.4, 628],
    [f + 4.1, 190],
  ]);
  const gy = kv(T, [
    [f, 560],
    [f + 0.8, 720],
    [f + 3.4, 720],
    [f + 4.1, 620],
  ]);
  const gs = kv(T, [
    [f, 1],
    [f + 0.8, 0.672],
    [f + 3.4, 0.672],
    [f + 4.1, 0.56],
  ]);
  const roll = ((gx - 1400) / 270) * (180 / Math.PI) * (T < f ? 1 : 0);
  const WORDS: [string, number, number][] = [
    ['差分', f + 0.35, 318],
    ['件数', f + 0.85, 506],
    ['文字数', f + 1.65, 694],
  ];
  const snaps = WORDS.reduce((acc, w) => acc + 45 * E_SNAP(prog(T, w[1] + 0.1, w[1] + 0.38)), 0);
  const rot = roll + tick(T, e + 4.4, 0.75) * (T < f ? 1 : 0) + (T >= f ? tick(f, e + 4.4, 0.75) + snaps + tick(T, f + 3.3, 0.9) : 0);

  // ---- 09 → 10: AI 側の吹き出し ----
  const bPop = E_SNAP(prog(T, f + 4.1, f + 4.55));
  const fl = T - f;
  const BX: [number, number, ((k: number) => number)?][] = [
    [g + 0.1, 1440],
    [g + 1.0, 620, inOut],
    [g + 1.6, 620],
    [g + 2.5, 1500, inOut],
  ];
  const kick = T > g + 4.72 ? 40 * Math.exp(-(T - g - 4.72) * 6) * Math.cos((T - g - 4.72) * 16) : 0;
  const bX = kv(T, BX) + kick;
  const bY = kv(T, [
    [g + 0.1, 640],
    [g + 1.0, 600],
  ]);
  const bS = kv(T, [
    [g + 0.1, 1],
    [g + 1.0, 0.5],
    [g + 1.6, 0.5],
    [g + 2.5, 0.8],
  ]);
  const bMv = (T > g + 0.1 && T < g + 1.0) || (T > g + 1.6 && T < g + 2.5);
  // 関門（枠）: 上から降り、吹き出しが通ったあと上へ戻る
  const gateY = kv(T, [
    [g + 0.6, -1100],
    [g + 1.05, 0, E_SNAP],
    [g + 3.6, 0],
    [g + 4.0, -1100, in3],
  ]);
  const kan = slam(T, g + 1.7, 0.5, {x: -500, y: 0, s: 1.2, r: 0});
  const kanOut = E_PUSH(prog(T, g + 3.7, g + 4.05));
  const plugX = kv(T, [
    [g + 4.2, -260],
    [g + 4.72, 1500 - 720 * 0.4, outExpo],
  ]);
  const dogu = slam(T, g + 4.9, 0.5, {x: 0, y: 200, s: 1.4, r: -4});
  const out10 = E_PUSH(prog(T, h - 0.3, h + 0.08));

  return (
    <>
      {/* 08 */}
      {T < e + 4.1 ? (
        <Lay x={-push8 * 900} mv={push8 > 0}>
          <Card c={{...PLATFORM, lit: 0.75}} />
          {bubbles.map((bb, i) => (
            <Bubble key={i} x={bb.x} y={bb.y} w={bb.w} h={bb.h} k={bb.pop} s={bb.s} r={bb.r} stroke={bb.stroke} sw={8} text={bb.text} size={bb.size} color={bb.color} mv={bb.mv} z={10 - i} />
          ))}
          <Line t={T} text="答えは、" x={120} y={104} size={88} color={C.ink} t0={e + 0.15} />
          <Txt text="揺れる。" x={112 + yure.dx} y={198} size={212} color={C.gray} s={yure.s} r={sway} o={yure.o} mv={yure.mv} />
        </Lay>
      ) : null}

      {/* 歯車の面 */}
      {T > e + 3.3 && T < g + 0.5 ? (
        <Lay x={-out9 * 1100} mv={out9 > 0}>
          <Plate x={0} y={0} w={W * plateW} h={H} color={C.cool} k={plateIn} from="r" />
          <Gear x={gx} y={gy} R={270} s={gs} rot={rot} mv={T < e + 4.15 || (T > f && T < f + 0.8) || (ret > 0 && ret < 1)} />
          <Line t={T} text="一つに" x={120} y={270} size={220} color={C.ink} t0={e + 3.95} t1={f - 0.12} dx={lerp(0, 40, prog(T, e + 3.95, f))} box />
          <Line t={T} text="決まる。" x={120} y={540} size={220} color={C.ink} t0={e + 4.15} t1={f - 0.05} dx={lerp(40, 0, prog(T, e + 4.15, f))} box />
          <Lay x={lerp(400, 0, ret)} s={lerp(1.2, 1, ret)} ox={0} oy={120} mv={ret > 0 && ret < 1}>
          {WORDS.map(([w, t0, y], i) => {
            const sl = slam(T, t0, 0.45, {x: 1100, y: (i - 1) * -120, s: 1.5, r: 0});
            return <Txt key={w} text={w} x={400 + sl.dx + lerp(0, i % 2 ? 14 : -14, prog(T, t0 + 0.5, g))} y={y + sl.dy} size={150} color={C.ink} s={sl.s} o={sl.o} mv={sl.mv} box />;
          })}
          <Line t={T} text="プログラム。" x={112} y={96} size={118} color={C.ink} t0={f + 2.75} dx={lerp(0, 30, prog(T, f + 2.75, g))} box />
          </Lay>
        </Lay>
      ) : null}

      {/* AI 側: 判断は、AI。 */}
      <Line t={T} text="判断は、AI。" x={1040} y={96} size={118} color={C.ai} t0={f + 5.5} t1={g - 0.15} dx={lerp(30, 0, prog(T, f + 5.5, g))} />
      {T >= f + 4.1 && T < h + 0.1 ? (
        <Lay y={-out10 * 1300} mv={out10 > 0}>
          {/* 関門 */}
          {T > g + 0.6 && T < g + 4.0 ? (
            <div data-fig="1" style={{position: 'absolute', left: 1080 - 250, top: 190 + gateY, width: 500, height: 760, boxSizing: 'border-box', border: `30px solid #a39c8f`, borderBottom: 'none', borderRadius: '26px 26px 0 0'}} />
          ) : null}
          <Bubble x={bX} y={bY + 9 * Math.sin(fl * 1.3)} w={720} h={470} k={bPop} s={bS} r={1.2 * Math.sin(fl * 0.9)} stroke={C.ai} sw={10} lines={['意味', '影響']} size={150} color={C.ai} mv={bPop < 1 || bMv} z={3} />
          {T < g + 4.1 ? <Txt text="関門は、別。" x={112 + kan.dx - kanOut * 1500} y={120} size={128} color={C.gray} s={kan.s} o={kan.o} mv={kan.mv || kanOut > 0} /> : null}
          {T > g + 4.2 ? <Plug x={plugX} y={600} mv={T < g + 4.72} /> : null}
          <Line t={T} text="苦手なところに、" x={120} y={104} size={72} color={C.ink} t0={g + 4.4} dx={lerp(0, 30, prog(T, g + 4.4, h))} />
          <Txt text="道具を。" x={112 + lerp(0, -16, prog(T, g + 5.4, h))} y={200 + dogu.dy} size={236} color={C.ai} s={dogu.s} r={dogu.r} o={dogu.o} mv={dogu.mv} />
          <Line t={T} text="関門は、別。" x={122} y={936} size={54} weight={700} color={C.gray} t0={g + 4.5} dir="down" />
        </Lay>
      ) : null}
    </>
  );
};

export const ActE: React.FC<{T: number}> = ({T}) => {
  const h = S['11'];
  const m = S['12'];
  if (T < h - 0.05 || T > m + 0.15) return null;
  const iso = slam(T, h - 0.12, 0.45, {x: -700, y: 0, s: 1.2, r: 0});
  const dochi = slam(T, h + 2.8, 0.5, {x: 0, y: 300, s: 1.4, r: 3});
  const sw = 150 * Math.sin((T - h - 3.3) * 2.3) * prog(T, h + 3.3, h + 4.0);
  const out = E_PUSH(prog(T, m - 0.3, m + 0.08));
  const BARS = [760, 700, 760, 620, 430, 730, 510];
  return (
    <Lay x={-out * 2300} mv={out > 0}>
      <Txt text="急ぐのか。" x={112 + iso.dx} y={136} size={170} color={C.ai} s={iso.s * (1 + 0.04 * clamp(-sw / 150))} o={iso.o} mv={iso.mv} />
      <Plate x={120} y={340} w={380} h={24} color={C.ai} k={outExpo(prog(T, h + 0.3, h + 0.55))} fig />
      <Line t={T} text="網羅するのか。" x={1030} y={150} size={108} color={C.ink} t0={h + 0.8} dx={lerp(0, 18, prog(T, h + 0.8, m))} />
      {BARS.map((w, i) => (
        <Plate key={i} x={1034} y={318 + i * 46} w={w} h={18} color="#b9b3a8" radius={9} k={outExpo(prog(T, h + 1.1 + i * 0.16, h + 1.7 + i * 0.16))} fig />
      ))}
      <Txt text="どちらつかず。" x={960 + sw} y={760 + dochi.dy} size={176} color={C.gray} anchor="c" s={dochi.s} r={dochi.r} o={dochi.o} mv={dochi.mv} />
    </Lay>
  );
};

export const ActF: React.FC<{T: number}> = ({T}) => {
  const m = S['12'];
  const n = S['13'];
  const end = S.logo;
  if (T < m - 0.05) return null;
  // ---- 12 ----
  const hanPop = E_SNAP(prog(T, m + 0.9, m + 1.35));
  const small = inOut(prog(T, m + 7.2, m + 7.9));
  const adv = E_SNAP(prog(T, m + 5.5, m + 5.9)) + E_SNAP(prog(T, m + 6.3, m + 6.7));
  const make = slam(T, m + 10.3, 0.5, {x: -600, y: 0, s: 1.2, r: 0});
  const out12 = E_PUSH(prog(T, n - 0.32, n + 0.08));
  const wall = Array.from({length: 15}, (_, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const t0 = m + 7.5 + (4 - row) * 0.13 + col * 0.05;
    const k = prog(T, t0, t0 + 0.5);
    return {x: 1190 + col * 218 + hashR(i + 3, -8, 8) + (row % 2 ? 1 : -1) * clamp(T - m - 9, 0, 9) * 5, y: 250 + row * 152 - (1 - E_SNAP(k)) * 1300, s: 1, r: hashR(i + 13, -4, 4) * (0.4 + 0.6 * (1 - k)), g: 1, o: T >= t0 ? 1 : 0, mv: k < 1, lit: 0.3};
  });
  // 漏れ: 壁の前を、拾われないカードが落ち続ける
  const leaks = Array.from({length: 8}, (_, i) => {
    const t0 = m + 9.0 + i * 0.62;
    const k = prog(T, t0, t0 + 1.15);
    return {x: 1250 + ((i * 2) % 3) * 218 + hashR(i + 40, -30, 30), y: -120 + (0.35 * k + 0.65 * k * k) * 1350, s: 0.72, r: hashR(i + 50, -30, 30) + k * hashR(i + 60, -60, 60), g: 1, o: k > 0 && k < 1 ? 1 : 0, mv: true, lit: 0.3, z: 8};
  });
  const callback = E_SNAP(prog(T, m + 12.4, m + 12.8));
  // ---- 13 ----
  const l1 = slam(T, n - 0.08, 0.55, {x: 900, y: 0, s: 1.35, r: 0});
  const up = inOut(prog(T, n + 3.3, n + 3.9));
  const l3 = slam(T, n + 5.0, 0.5, {x: -700, y: 0, s: 1.25, r: 0});
  const rd = prog(T, n + 0.4, end);
  return (
    <>
      {T < n + 0.1 ? (
        <Lay y={out12 * 1400} mv={out12 > 0}>
          <Line t={T} text="任せたいのは、" x={120} y={96} size={84} color={C.ink} t0={m + 0.12} dx={lerp(0, 40, prog(T, m, m + 7.2)) * (1 - small)} />
          <Bubble x={lerp(900 + adv * 60, 330, small)} y={lerp(580, 330, small) + 8 * Math.sin((T - m) * 1.1) * (1 - small)} w={1520} h={560} k={hanPop} s={lerp(1 + 0.03 * prog(T, m + 2, m + 7.2), 0.27, small)} r={lerp(-2 + 1.2 * Math.sin((T - m) * 0.8), -2, small)} stroke={C.ai} sw={12} text="判断。" size={400} color={C.ai} mv={hanPop < 1 || (small > 0 && small < 1)} z={2} />
          {wall.map((cd, i) => (
            <Card key={i} c={cd} />
          ))}
          {leaks.map((cd, i) => (
            <Card key={`l${i}`} c={cd} />
          ))}
          <Line t={T} text="漏れなく拾うなら、" x={120} y={520} size={68} weight={700} color={C.gray} t0={m + 8.0} dx={lerp(0, 30, prog(T, m + 8.0, n))} />
          <Txt text="負け戦。" x={112 + make.dx + lerp(0, -16, prog(T, m + 10.8, n))} y={626} size={226} color={C.gray} s={make.s} o={make.o} mv={make.mv} />
          <Bubble x={1408} y={540 + 6 * Math.sin((T - m) * 1.1)} w={600} h={170} k={callback} r={-3} stroke={C.gray} sw={8} text="問題ありません" size={68} color={C.gray} mv={callback < 1} z={20} />
        </Lay>
      ) : null}
      {T >= n - 0.1 ? (
        <>
          <Txt text="渡し方を、先に。" x={104 + l1.dx + lerp(0, 34, rd)} y={lerp(420, 104, up)} size={212} color={C.ai} s={l1.s * lerp(1.12 + 0.02 * prog(T, n + 0.5, n + 3.3), 1, up)} o={l1.o} mv={l1.mv || (up > 0 && up < 1)} />
          <Plate x={112} y={346} w={1560} h={24} color={C.ai} k={outExpo(prog(T, n + 7.4, n + 8.1))} from="l" />
          <Line t={T} text="差分は、プログラム。" x={112} y={452} size={146} color={C.ink} t0={n + 3.9} dx={lerp(60, 0, prog(T, n + 3.9, end))} />
          <Gear x={1650 + lerp(60, 0, prog(T, n + 3.3, end))} y={528} R={104} s={outBack(prog(T, n + 4.3, n + 4.7))} rot={tick(T, n + 4.8, 0.8)} mv={T < n + 4.7} />
          <Txt text="判断は、AI。" x={106 + l3.dx + lerp(0, 30, prog(T, n + 5.5, end))} y={690} size={212} color={C.ai} s={l3.s} o={l3.o} mv={l3.mv} />
          <Bubble x={1560} y={782 + 8 * Math.sin((T - n) * 1.2)} w={420} h={220} k={E_SNAP(prog(T, n + 5.5, n + 5.9))} r={1.5 * Math.sin((T - n) * 0.8)} stroke={C.ai} sw={9} mv={T < n + 5.9} />
        </>
      ) : null}
    </>
  );
};
