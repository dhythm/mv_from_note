// 07–09: 試したいことを、いくつも持つ → 起点力 → 自分の熱量に、アクセルを踏もう
// 時刻はカットの頭からの秒。声はカットの頭から VO 秒後に始まる（語の位置は audio/voice/words.json の実測）。
import React from 'react';
import {Bg, C, CandleWindow, Dot, DrawLine, F, H, Lay, Line, Thermo, W, inOut, kv, lerp, mix, outExpo, prog} from './kit';
import {VO} from './timeline';
import type {CutProps} from './Main';

const v = (s: number) => VO + s;

// ---- 07 試したいことを、いくつも持つ。 ----
// 温度計の球（灰）が右の窓に重なって炎の実写へ切り替わり（Match cut）、窓から琥珀色が外へ広がる
const WIN = {x: 1245, y: 105, w: 543, h: 527};
const CHIPS: [string, number][] = [
  ['趣味', v(2.4)],
  ['ゲーム', v(2.85)],
  ['小さな開発', v(3.4)],
  ['検証', v(4.2)],
];
export const Cut07: React.FC<CutProps> = ({t, start}) => {
  const travel = inOut(prog(t, v(4.9), v(5.5)));
  const open = v(5.5); // 窓が開く＝実写の 0 秒（カットの終わりまでちょうど 5 秒）
  const R = kv(t, [[open, 60], [open + 0.6, 400, outExpo]]);
  const wave = kv(t, [[v(5.6), 0], [v(6.9), 2300, outExpo]]);
  const lit = prog(t, v(5.9), v(6.5));
  const far = inOut(prog(t, v(7.3), v(8.4))); // 温度差から距離を置ける: 引いて視野を開く
  const relay = outExpo(prog(t, v(1.6), v(2.1)));
  const bx = lerp(160, WIN.x + WIN.w / 2, travel);
  const by = lerp(860, WIN.y + WIN.h / 2, travel);
  let cx = 120;
  return (
    <>
      <Bg color={C.grayPale} />
      {wave > 0 && <div style={{position: 'absolute', inset: 0, background: C.amberPale, clipPath: `circle(${wave}px at ${WIN.x + WIN.w / 2}px ${WIN.y + WIN.h / 2}px)`}} />}
      <Lay s={1 - far * 0.06} ox={W / 2} oy={H / 2}>
        <Line t={t} text="試したいこと" x={W / 2} y={400} size={180} color={C.grayText} t0={0.2} t1={v(0.95)} anchor="c" stagger={0.03} />
        <Lay x={(1 - relay) * 60}>
          <Line t={t} text="試したい" x={120} y={170} size={200} color={mix(C.grayText, C.amber, lit)} t0={v(1.6)} stagger={0.05} />
          <Line t={t} text="こと" x={120} y={400} size={200} color={mix(C.grayText, C.amber, lit)} t0={v(1.75)} stagger={0.05} />
        </Lay>
        {CHIPS.map(([label, at], i) => {
          const w = Array.from(label).length * 48 + 64;
          const x = cx;
          cx += w + 22;
          const k = outExpo(prog(t, at, at + 0.5));
          if (k <= 0) return null;
          const col = mix(C.gray, C.amber, prog(t, v(6.0) + i * 0.08, v(6.5) + i * 0.08));
          return (
            <div key={label} style={{position: 'absolute', left: x - (1 - k) * 320, top: 660, width: w, height: 80, opacity: k, borderRadius: 40, border: `5px solid ${col}`, background: 'rgba(255,255,255,0.65)', boxSizing: 'border-box', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.noto, fontWeight: 800, fontSize: 48, color: col, fontFeatureSettings: '"palt" 1', lineHeight: 1}}>
              <span data-ch="1">{label}</span>
            </div>
          );
        })}
        <Thermo x0={160} x1={1100} y={860} k={0.14} color={C.gray} draw={outExpo(prog(t, 0.2, 1.2)) * (1 - inOut(prog(t, v(4.6), v(5.2))))} bulb={travel > 0 ? 0.01 : 34} marker={false} />
        {travel > 0 && t < open + 0.05 && <Dot x={bx} y={by} r={lerp(34, 60, travel)} color={C.gray} />}
        {t >= open && <CandleWindow vStart={start + open} x={WIN.x} y={WIN.y} w={WIN.w} h={WIN.h} clip={`circle(${R}px at ${WIN.w / 2}px ${WIN.h / 2}px)`} />}
        <Line t={t} text="いくつも、持つ。" x={WIN.x} y={668} size={58} color={C.ink} t0={v(6.6)} stagger={0.03} />
      </Lay>
    </>
  );
};

// ---- 08 何を始めたいか。起点力。 ----
export const Cut08: React.FC<CutProps> = ({t}) => {
  // 「大事なのは」で前提の文が上へ退いて小さな札になり、「何を始めたいか」が主役になる
  const lab = outExpo(prog(t, v(2.85), v(3.5)));
  const lineX = kv(t, [[v(6.2), 1100], [v(7.2), 1780, outExpo]]);
  const push = outExpo(prog(t, v(6.1), v(6.9)));
  const zoom = prog(t, v(8.6), v(9.2));
  const z = 1 + 1.6 * zoom * zoom * zoom;
  const jump = outExpo(prog(t, v(9.15), v(9.5)));
  const smash = kv(t, [[v(9.2), 1.35], [v(9.55), 1.0, outExpo]]);
  return (
    <>
      <Bg color={C.paper} />
      <Lay s={jump > 0 ? 1 : z} ox={160} oy={640}>
        {jump <= 0 && <DrawLine x1={200} y1={640} x2={lerp(200, lineX, outExpo(prog(t, v(0.2), v(1.2))))} y2={640} k={1} color={C.line} w={8} />}
        <Dot x={lerp(160, 178, jump)} y={lerp(640, 236, jump)} r={lerp(34, 26, jump)} color={C.red} s={outExpo(prog(t, 0, 0.35))} />
      </Lay>
      <Lay s={1 - lab * 0.55} y={-lab * 210} ox={140} oy={300} o={1 - prog(t, v(8.6), v(9.0))}>
        <Line t={t} text="作業は、AIに任せられる時代。" x={140} y={300} size={110} color={C.ink} t0={v(0.0)} stagger={0.025} />
      </Lay>
      <Lay s={1 + push * 0.06} ox={140} oy={470}>
        <Line t={t} text="何を始めたいか" x={140} y={330} size={190} color={C.ink} t0={v(3.85)} t1={v(8.5)} stagger={0.04} />
      </Lay>
      <Line t={t} text="DeNA 南場さんの言葉" x={150} y={860} size={60} weight={800} color={C.ink} t0={v(6.15)} stagger={0.02} />
      <Lay s={smash} ox={160} oy={520}>
        <Line t={t} text="起点力" x={130} y={300} size={430} color={C.red} t0={v(9.2)} stagger={0.04} dur={0.35} />
      </Lay>
      <Line t={t} text="何を始めたいか" x={1780} y={870} size={50} weight={700} color={C.gray} t0={v(9.4)} anchor="r" stagger={0.02} />
    </>
  );
};

// ---- 09 自分の熱量に、アクセルを踏もう。 ----
export const Cut09: React.FC<CutProps> = ({t}) => {
  // 淡い赤の面＝自分の熱量。水銀の位置まで面が満ち、最後は右端まで走って画面を満たす（Speed ramp）
  const run = kv(t, [[v(5.9), 0], [v(6.6), 1, (k) => k * k * k]]);
  const base = kv(t, [[0, 0.22], [v(3.0), 0.22], [v(3.7), 0.42, outExpo]]);
  const merc = base * (1 - run) + run;
  const pw = lerp(150, 1760, merc) * outExpo(prog(t, 0, 0.7)) + run * 200;
  const relay = outExpo(prog(t, v(4.6), v(5.2))); // 否定の 2 行は上へ退き、肯定の言葉に場所を渡す
  const dolly = outExpo(prog(t, v(6.4), v(7.6)));
  const exit = kv(t, [[9.0, 0], [9.6, 2400, (k) => k * k * k]]);
  return (
    <>
      <Bg color={C.paper} />
      <div style={{position: 'absolute', left: 0, top: 0, width: pw, height: H, background: C.redPale}} />
      <Lay y={-relay * 120} s={1 - relay * 0.3} ox={140} oy={200} o={1 - relay}>
        <Line t={t} text="他人の温度に、" x={140} y={220} size={124} color={C.ink} t0={v(0.0)} />
        <Line t={t} text="合わせなくていい。" x={140} y={390} size={124} color={C.ink} t0={v(0.9)} />
      </Lay>
      <Lay x={exit}>
        <Thermo x0={150} x1={1760} y={920} k={merc} draw={outExpo(prog(t, 0.2, 1.1))} />
      </Lay>
      <Lay s={1 + dolly * 0.05} ox={140} oy={520}>
        <Line t={t} text="自分の熱量に、" x={140} y={150} size={86} color={C.ink} t0={v(4.9)} colorAt={(i) => (i === 3 || i === 4 ? C.red : undefined)} />
        <Line t={t} text="アクセルを" x={140} y={290} size={240} color={C.red} t0={v(6.4)} stagger={0.045} />
        <Line t={t} text="踏もう。" x={140} y={560} size={240} color={C.red} t0={v(7.2)} stagger={0.05} />
      </Lay>
    </>
  );
};
