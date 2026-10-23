// 04–06: すり減る → 能力ではなく熱量の差 → 他人の熱は変えられない、自分へ
// 時刻はカットの頭からの秒。声はカットの頭から VO 秒後に始まる（語の位置は audio/voice/words.json の実測）。
import React from 'react';
import {Bg, C, Dot, DrawLine, H, Lay, Line, Thermo, VLine, W, inOut, kv, lerp, mix, outExpo, out3, prog} from './kit';
import {hash} from './lib/anim';
import {VO} from './timeline';
import type {CutProps} from './Main';

const v = (s: number) => VO + s;

// ---- 04 軽く扱われると、すり減る。 ----
// 「やり取りを重ねるたびに」境界が階段状に欠け、欠けた面が小さなタイルになって落ちる。文字は崩さず、面と線だけが削れる
const CELL = 60;
const STEPS = [v(2.8), v(3.6), v(4.4), v(5.3)];
const B0 = 840; // 境界の初期位置
type Cell = {col: number; row: number; at: number};
const CELLS: Cell[] = (() => {
  const out: Cell[] = [];
  const rows = Math.ceil(H / CELL);
  STEPS.forEach((ts, i) => {
    const col = i; // 境界から左へ 1 列ずつ
    for (let r = 0; r < rows; r++) out.push({col, row: r, at: ts + hash(i * 97 + r) * 0.4});
    // 次の列の一部も先に欠ける（階段状）
    for (let r = 0; r < rows; r++) if (hash(i * 31 + r * 7 + 5) < 0.35) out.push({col: col + 1, row: r, at: ts + 0.25 + hash(r * 13 + i) * 0.35});
  });
  return out;
})();
export const Cut04: React.FC<CutProps> = ({t}) => {
  const worn = STEPS.reduce((a, ts) => a + outExpo(prog(t, ts, ts + 0.5)), 0) / STEPS.length;
  const merc = lerp(0.5, 0.1, worn);
  const drop = STEPS.reduce((a, ts) => a + outExpo(prog(t, ts, ts + 0.35)) * 12, 0); // 面が下へ崩れる（Tilt down）
  const push = outExpo(prog(t, v(6.4), v(7.4)));
  const g = 2600;
  return (
    <>
      <Bg color={C.bluePale} />
      <Lay y={drop} s={1 + push * 0.05} ox={W} oy={H / 2}>
        <div style={{position: 'absolute', left: -400, top: -100, width: B0 + 400, height: H + 300, background: mix(C.redPale, C.grayPale, worn)}} />
        {CELLS.map((c, i) => {
          if (t < c.at) return null;
          const x = B0 - (c.col + 1) * CELL;
          const y = c.row * CELL;
          const u = t - c.at;
          const fy = y + 0.5 * g * u * u;
          return (
            <React.Fragment key={i}>
              <div style={{position: 'absolute', left: x, top: y - 1, width: CELL + 1, height: CELL + 2, background: C.bluePale}} />
              {fy < H + 200 && hash(i * 3 + 1) < 0.55 && (
                <div style={{position: 'absolute', left: x + 10 + (hash(i) - 0.5) * 60 * u, top: fy + 8, width: 40, height: 40, background: C.grayPale, border: `3px solid ${C.gray}`, transform: `rotate(${(hash(i * 5) - 0.5) * 300 * u}deg)`}} />
              )}
            </React.Fragment>
          );
        })}
        <Line t={t} text="熱量" x={150} y={290} size={250} color={mix(C.red, C.redDim, worn)} t0={0.15} stagger={0.06} />
        <Line t={t} text="他人事" x={1000} y={230} size={124} color={C.blue} t0={v(0.6)} t1={v(6.1)} dir="left" />
        <Thermo x0={150} x1={1480} y={800} k={merc} color={mix(C.red, C.redDim, worn)} draw={outExpo(prog(t, 0.2, 1.2))} />
        <Line t={t} text="軽く扱われると" x={140} y={910} size={68} color={C.ink} t0={v(1.5)} />
      </Lay>
      <VLine t={t} text="すり減る。" x={1730} y={130} size={150} color={C.ink} t0={v(6.45)} dir="down" stagger={0.08} />
    </>
  );
};

// ---- 05 能力の差じゃない。熱量の差。 ----
export const Cut05: React.FC<CutProps> = ({t}) => {
  const dolly = out3(prog(t, v(2.0), v(3.2)));
  const crane = kv(t, [[v(3.7), 180], [v(4.4), 0, outExpo]]);
  const lineK = outExpo(prog(t, v(4.4), v(5.4)));
  // 「熱を持つ側ばかりが」で語の塊が上へ退き、測り線が前へ出る
  const turn = outExpo(prog(t, v(5.35), v(6.1)));
  // 負担を背負う: 赤い端が重くなって沈み、「いずれ力尽きる」で灰色にしぼむ
  const load = kv(t, [[v(6.9), 0], [v(7.4), 0.5, outExpo], [v(7.5), 0.5], [v(8.0), 1, outExpo]]);
  const spent = outExpo(prog(t, v(8.5), v(9.3)));
  const tilt = -4.5 * load;
  const lx = 180;
  const rx = 1740;
  return (
    <>
      <Bg color={C.paper} />
      <Lay s={1 + dolly * 0.08} ox={140} oy={520}>
        <Line t={t} text="能力の差" x={140} y={170} size={150} color={C.gray} t0={0.15} t1={v(3.2)} />
        <Line t={t} text="じゃない。" x={140} y={400} size={230} color={C.ink} t0={v(1.95)} t1={v(3.25)} dir="left" stagger={0.04} />
      </Lay>
      <Line t={t} text="能力の差じゃない。" x={1780} y={80} size={52} weight={700} color={C.gray} t0={v(3.6)} anchor="r" stagger={0.02} />
      <Lay y={crane - turn * 120} s={1 - turn * 0.12} ox={140} oy={450}>
        <Line t={t} text="熱量" x={140} y={450} size={340} color={C.red} t0={v(3.75)} stagger={0.07} />
        <Line t={t} text="の差。" x={850} y={590} size={200} color={C.ink} t0={v(4.3)} stagger={0.05} />
      </Lay>
      <Lay y={-turn * 110} s={1 + turn * 0.04 + spent * 0.04} r={tilt} ox={W / 2} oy={930}>
        <DrawLine x1={lx} y1={930} x2={lerp(lx, rx, lineK)} y2={930} k={lineK > 0 ? 1 : 0} color={C.ink} w={5} />
        <Dot x={lx} y={930} r={lerp(30 + load * 26, 20, spent)} color={mix(C.red, C.gray, spent)} s={outExpo(prog(t, v(4.3), v(4.6)))} />
        <Dot x={rx} y={930} r={30} color={C.blue} s={outExpo(prog(t, v(5.2), v(5.5)))} />
      </Lay>
    </>
  );
};

// ---- 06 他人の熱は変えられない。自分へ。 ----
// 同じ 2 語の大きさとピントを入れ替える（Rack focus）。文字は DOM のまま CSS の blur でぼかす
export const Cut06: React.FC<CutProps> = ({t}) => {
  const k = inOut(prog(t, v(3.0), v(4.4)));
  const away = inOut(prog(t, v(6.8), v(7.6)));
  const push = 1 + k * 0.05 + outExpo(prog(t, v(4.65), v(5.4))) * 0.03 + outExpo(prog(t, v(6.8), v(7.8))) * 0.06;
  return (
    <>
      <Bg color={C.paper} />
      <Lay s={push} ox={W / 2} oy={H / 2}>
        <Line t={t} text="他人の熱は、変えられない。" x={140} y={110} size={68} color={C.ink} t0={v(0.0)} t1={v(2.95)} stagger={0.02} />
        <Lay x={k * (1390 - 120) + away * 700} y={k * (70 - 260) - away * 200} s={1 - 0.58 * k} ox={120} oy={260} style={{filter: `blur(${k * 9}px)`}}>
          <Line t={t} text="他人事" x={120} y={260} size={300} color={C.blue} t0={v(0.25)} stagger={0.06} />
        </Lay>
        <Lay x={(1 - k) * (1210 - 520)} y={(1 - k) * (660 - 190)} s={lerp(0.3, 1, k)} ox={520} oy={190} style={{filter: `blur(${(1 - k) * 7}px)`}}>
          <Line t={t} text="自分" x={520} y={190} size={380} color={C.red} t0={v(0.9)} stagger={0.08} />
        </Lay>
        <Line t={t} text="関心を、自分で動かせることへ。" x={530} y={700} size={76} color={C.ink} t0={v(4.65)} stagger={0.025} colorAt={(i) => (i === 4 || i === 5 ? C.red : undefined)} />
      </Lay>
    </>
  );
};

