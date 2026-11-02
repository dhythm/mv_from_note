// 01–03: 思い込み → 留保 → 反転（潜っただけ）。各カットはカットの頭からの秒 t（声の頭からは v）だけで決まる。
import React from 'react';
import {AbsoluteFill} from 'remotion';
import {Bg, C, DrawLine, E_PUSH, E_SINK, E_SLAM, F, Grid, H, Lay, Line, Prompt, Strata, VBlur, W, clamp, lerp, mix, prog, typeBase} from './kit';
import type {CutProps} from './Main';

// ---- 01 プロンプトの技術は、もう要らない。（他者の声） ----
export const Cut01: React.FC<CutProps> = ({t}) => {
  const slam = E_SLAM(prog(t, 0, 1.6));
  const drift = prog(t, 1.6, 7.6);
  const tilt = E_PUSH(prog(t, 6.6, 7.8));
  return (
    <AbsoluteFill>
      <Bg color={C.paper} />
      <Grid dx={drift * 40} />
      {/* Dolly out の途中から入り、読む間は文字群ごと寄りながら左へ流れ、最後に上へ Tilt */}
      <Lay y={-160 * tilt}>
        <Lay s={lerp(1, 1.1, drift)} x={lerp(0, -70, drift)} ox={150} oy={500}>
          <Line t={t} text="プロンプトの技術は、" x={156} y={290} size={64} weight={700} color={C.gray} t0={1.5} dir="down" />
          <Lay s={lerp(2.4, 1, slam)} x={lerp(180, 0, slam)} ox={880} oy={505}>
            <Line t={t} text="もう要らない。" x={150} y={400} size={210} t0={-1} />
          </Lay>
          <Line t={t} text="── テック系イベントで聞いた話" x={156} y={680} size={34} weight={400} color={C.gray} t0={3.6} stagger={0.02} />
        </Lay>
        <DrawLine x1={0} y1={985} x2={W} y2={985} k={E_SINK(prog(t, 5.2, 6.4))} w={2} />
      </Lay>
    </AbsoluteFill>
  );
};

// ---- 02 うなずける部分は、ある。（留保: 職種の消滅・筆者の使い方） ----
// 声の波形は最後に平らな 1 本の線になり、03 の表層の線（y=810）へそのままつながる
const LINE03 = 810;
function voiceWave(t: number) {
  const amp = 74 * Math.pow(1 - prog(t, 6.9, 9.4), 1.3) * prog(t, 6.3, 6.8);
  const cx = lerp(-200, W + 200, prog(t, 6.3, 9.6));
  return (x: number) => {
    if (amp <= 0.01) return LINE03;
    const env = Math.exp(-Math.pow((x - cx) / 420, 2));
    const irr = 0.55 + 0.45 * Math.sin(x / 41 + t * 5.3) * Math.sin(x / 97 - t * 2.1);
    return LINE03 + amp * env * irr * Math.sin((x / 64) * 2 * Math.PI - t * 16);
  };
}
export const Cut02: React.FC<CutProps> = ({t}) => {
  const enter = E_SLAM(prog(t, 0.9, 1.6));
  const shrink = E_SINK(prog(t, 3.9, 5.6));
  const gone = E_PUSH(prog(t, 9.2, 9.7));
  const strike = prog(t, 5.6, 5.9);
  const slide = E_SLAM(prog(t, 6.2, 6.8));
  const truck = prog(t, 6.5, 10);
  const wave = voiceWave(t);
  const draw = clamp(prog(t, 6.2, 6.6));
  const pts: string[] = [];
  for (let x = -20; x <= lerp(-20, W + 20, draw); x += 8) pts.push(`${x},${wave(x).toFixed(1)}`);
  return (
    <AbsoluteFill>
      <Bg color={C.paper} />
      <Grid dx={40 + t * 6} />
      <Lay x={-60 * truck - 50 * prog(t, 0, 6.2)} s={lerp(1, 1.06, prog(t, 0, 6.2)) * lerp(1, 0.97, truck)} ox={150} oy={300}>
        <Line t={t} text="うなずける部分は、ある。" x={150} y={150} size={96} t0={0.3} t1={9.2} color={mix(C.ink, C.gray, prog(t, 6.0, 6.6))} />
        {/* 求人の札: 右から入り、右上で点まで縮んで取り消される */}
        <div
          style={{
            position: 'absolute',
            left: 1050,
            top: 470,
            transform: `translate(${lerp(360, 0, enter) + 420 * shrink - 24 * prog(t, 1.6, 3.9)}px, ${-300 * shrink}px) translate(-50%, -50%) scale(${lerp(1, 0.18, shrink) * (1 - gone)})`,
            opacity: enter > 0 ? 1 : 0,
          }}
        >
          <div style={{position: 'relative', border: `5px solid ${C.gray}`, borderRadius: 999, padding: '22px 56px', background: C.paper}}>
            <div style={{...typeBase, position: 'relative', fontFamily: F.noto, fontWeight: 700, fontSize: 64, color: C.gray}}>
              {Array.from('プロンプトエンジニア 募集').map((ch, i) => (
                <span key={i} data-ch="1" style={{display: 'inline-block'}}>
                  {ch === ' ' ? ' ' : ch}
                </span>
              ))}
            </div>
            <div style={{position: 'absolute', left: -40, right: -40, top: '50%', height: 18, marginTop: -9, background: C.ink, transform: `scaleX(${strike})`, transformOrigin: '0 50%'}} />
          </div>
        </div>
        {/* 求人一覧の灰の棒: 1 本ずつ左へ抜ける */}
        {Array.from({length: 5}, (_, i) => {
          const out = E_PUSH(prog(t, 3.7 + i * 0.12, 4.3 + i * 0.12));
          const inn = E_SLAM(prog(t, 1.1 + i * 0.06, 1.7 + i * 0.06));
          return <div key={i} style={{position: 'absolute', left: 730 + i * 132 + lerp(400, 0, inn) - 1500 * out, top: 600, width: 104, height: 22, borderRadius: 11, background: '#D7D9DD', opacity: inn > 0 ? 1 : 0}} />;
        })}
        <Lay x={lerp(-600, 0, slide)}>
          <Line t={t} text="音声入力で、ざっと。" x={150} y={430} size={140} t0={6.2} t1={9.2} dir="right" stagger={0.025} />
        </Lay>
      </Lay>
      {/* 声の波形（1 本の線） */}
      {draw > 0 && (
        <svg data-fig="1" style={{position: 'absolute', left: 0, top: 0}} width={W} height={H}>
          <polyline points={pts.join(' ')} fill="none" stroke={C.ink} strokeWidth={3} strokeLinejoin="round" />
        </svg>
      )}
    </AbsoluteFill>
  );
};

// ---- 03 消えたんじゃない。潜っただけ。（反転） ----
const SPLASH = 10.8; // 「潜っただけ。」が表層の線（水面）に入る秒。直前の 0.4 秒は音を抜く
const DIVE = {x: 150, size: 240, w: 1440};
// 水面の形: 字の幅の所は押し下げられ、両端から波が左右へ伝わって減衰する（線より上の字は揺らさない）
function surfaceAt(t: number) {
  const r = t - SPLASH;
  return (x: number) => {
    if (r < 0) return LINE03;
    const a = DIVE.x;
    const b = DIVE.x + DIVE.w;
    const press = 14 * Math.exp(-r * 2.2) * (1 - Math.exp(-r * 30));
    if (x >= a && x <= b) {
      const edge = Math.min(x - a, b - x);
      return LINE03 + press * clamp(edge / 120) + 3 * Math.exp(-r * 2) * Math.sin((x / 150) * 2 * Math.PI - r * 9);
    }
    const dist = x < a ? a - x : x - b;
    const front = r * 620;
    if (dist > front) return LINE03;
    const amp = 11 * Math.exp(-r * 1.6) * Math.exp(-dist / 1100) * clamp((front - dist) / 60);
    return LINE03 + amp * Math.sin((dist / 140) * 2 * Math.PI - r * 2 * Math.PI * 3.2) + press * Math.exp(-dist / 60);
  };
}
function polyAbove(fn: (x: number) => number) {
  const p: string[] = ['-200px -400px', `${W + 200}px -400px`];
  for (let x = W + 200; x >= -200; x -= 20) p.push(`${x}px ${fn(x).toFixed(1)}px`);
  return `polygon(${p.join(',')})`;
}
function polyBelow(fn: (x: number) => number) {
  const p: string[] = [];
  for (let x = -200; x <= W + 200; x += 20) p.push(`${x}px ${fn(x).toFixed(1)}px`);
  p.push(`${W + 200}px ${H + 400}px`, `-200px ${H + 400}px`);
  return `polygon(${p.join(',')})`;
}
const DiveText: React.FC<{y: number; color: string; dx?: number; marks?: boolean}> = ({y, color, dx = 0, marks}) => (
  <div style={{...typeBase, left: DIVE.x + dx, top: y, fontFamily: F.noto, fontWeight: 900, fontSize: DIVE.size, letterSpacing: '-0.03em', color}}>
    {Array.from('潜っただけ。').map((ch, i) => (
      <span key={i} data-ch={marks ? '1' : undefined} style={{display: 'inline-block'}}>
        {ch}
      </span>
    ))}
  </div>
);
export const Cut03: React.FC<CutProps> = ({t}) => {
  const top = surfaceAt(t);
  const fall = prog(t, SPLASH - 0.32, SPLASH);
  const diveY = t < SPLASH ? lerp(-320, 670, fall * fall) : lerp(670, 740, E_SINK(prog(t, SPLASH, SPLASH + 2.2)));
  const flood = E_SINK(prog(t, SPLASH, SPLASH + 0.7));
  const big = E_SLAM(prog(t, 0.7, 1.5));
  const rowOut = E_PUSH(prog(t, 9.9, 10.4));
  const dolly = E_SINK(prog(t, SPLASH, 13.0));
  const crane = E_SINK(prog(t, 12.7, 14));
  const moveP = E_SLAM(prog(t, SPLASH, SPLASH + 0.5));
  const wob = t > SPLASH ? 3 * Math.sin(((t - SPLASH) / 1.4) * 2 * Math.PI) : 0;
  return (
    <AbsoluteFill>
      <Bg color={C.paper} />
      <Grid dx={80 + t * 6} />
      <VBlur id="c03" n={Math.sin(Math.PI * prog(t, 13.5, 14.4)) * 22}>
        <Lay y={-620 * crane}>
          <Lay s={lerp(1, 1.03, dolly) * lerp(1, 1.03, prog(t, 1.2, SPLASH))} x={lerp(0, -24, prog(t, 1.2, SPLASH))} ox={400} oy={640}>
            {/* 線より下: 着水と同時に地層が満ちる */}
            <div style={{position: 'absolute', inset: 0, clipPath: `inset(0 0 ${((H + 300 - (LINE03 + flood * 600)) / (H + 300)) * 100}% 0)`}}>
              <Strata id="s03" t={t} bounds={[LINE03, 905, 990, 1060]} top={top} surface={0} />
            </div>
            <Line t={t} text="消えたんじゃない。" x={150} y={110} size={170} t0={0.7} stagger={0.025} style={{transform: `scale(${lerp(1.5, 1, big)})`, transformOrigin: '50% 50%'}} />
            {/* 名前が消えた ≠ 技術が要らない */}
            <Lay x={lerp(-200, 0, E_SLAM(prog(t, 4.7, 5.2))) - 1400 * rowOut - 30 * prog(t, 5, 9.9)}>
              <Line t={t} text="名前が消えた" x={150} y={460} size={96} weight={900} color={C.gray} t0={4.7} t1={10.0} dir="right" />
            </Lay>
            <Lay x={lerp(220, 0, E_SLAM(prog(t, 6.6, 7.1))) + 1400 * rowOut - 30 * prog(t, 7, 9.9)}>
              <Line t={t} text="技術が要らない" x={930} y={460} size={96} weight={900} color={C.gray} t0={6.6} t1={10.0} dir="left" />
            </Lay>
            {t > 5.4 && rowOut < 1 && (
              <div style={{...typeBase, left: 840, top: 448, fontFamily: F.noto, fontWeight: 700, fontSize: 120, color: C.ink, transform: `translateX(-50%) rotate(${lerp(-30, 0, E_SLAM(prog(t, 5.4, 5.9)))}deg) scale(${E_SLAM(prog(t, 5.4, 5.9)) * (1 - rowOut)})`}}>
                <span data-ch="1">≠</span>
              </div>
            )}
            {/* 一行の入力（表）: 線の上に置かれ、着水で右上へ押しのけられる */}
            <Prompt t={t} x={lerp(150, 1380, moveP)} y={lerp(744, 600, moveP)} size={lerp(44, 40, moveP)} typed={prog(t, 0.2, 0.9)} blink={1} />
            {/* 潜っただけ。線より上は朱、線より下は淡い朱で水中のように揺れる */}
            {t > SPLASH - 0.35 && (
              <>
                <div style={{position: 'absolute', inset: 0, clipPath: polyAbove(top)}}>
                  <DiveText y={diveY} color={C.red} marks />
                </div>
                {t >= SPLASH && (
                  <div style={{position: 'absolute', inset: 0, clipPath: polyBelow(top)}}>
                    <DiveText y={diveY} color={C.redPale} dx={wob} />
                  </div>
                )}
              </>
            )}
            {/* 表層の線（水面） */}
            <svg data-fig="1" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={W} height={H}>
              <polyline points={Array.from({length: 108}, (_, i) => `${i * 20 - 60},${top(i * 20 - 60).toFixed(1)}`).join(' ')} fill="none" stroke={C.ink} strokeWidth={3} />
            </svg>
          </Lay>
        </Lay>
      </VBlur>
    </AbsoluteFill>
  );
};

