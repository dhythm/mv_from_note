// 05–07: 段2の弱点（手で渡す）→ 脇役の対比（がっちゃんこ）→ 段3「流れだけを、つなぐ。」
import React from 'react';
import {AbsoluteFill, Img, OffthreadVideo, Sequence, staticFile} from 'remotion';
import type {CutProps} from './Main';
import {C, Cam, CamGrid, CamS, DrawLine, E_PUSH, E_SINK, E_SLAM, F, Koma, Lay, Line, Particle, VBlur, clamp, inOut, kv, lerp, outExpo, prog, slam, typeBase} from './kit';
import {damped, pulse} from './lib/anim';
import {K04, Y04, cam04, loopPos} from './scenes1';

const lin = (k: number) => k;
const FPS = 30;
const bump = (t: number, t0: number, d: number) => (t < t0 || t > t0 + d ? 0 : Math.sin((Math.PI * (t - t0)) / d));
const outBack = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2));

// ---------------------------------------------------------------- 05 どれに、何を入れた？
// 04 の 3 つのコマを引き継ぎ、量が増える → 二つの窓が開いて手で渡す 4 秒 → 窓がコマへ戻り、手渡しの線が交差して「？」
const MORE: [number, number][] = [
  [-500, -100],
  [900, -100],
  [2300, -100],
  [-500, 1300],
  [900, 1300],
  [2300, 1300],
  [-1000, 600],
  [2800, 600],
];
const INS = 4.2; // 挿入の頭（カットの頭からの秒）。素材 0〜4 秒を等速で使う
const HUB: [number, number][] = [
  [430, 300],
  [960, 210],
  [1490, 300],
  [700, 600],
  [1220, 600],
];
const LINKS: [number, number][] = [
  [0, 4],
  [1, 3],
  [2, 3],
  [0, 2],
  [3, 1],
  [4, 0],
];
export const Cut05: React.FC<CutProps> = ({t, v, start}) => {
  const c0 = cam04(11);
  const cam: CamS = {cx: c0.cx, cy: c0.cy, z: kv(t, [[0, c0.z], [3.2, 0.48, lin]])};
  const open = E_SINK(prog(t, 3.3, 4.1));
  const close = E_SINK(prog(t, 8.2, 8.9));
  const figs = 1 - prog(t, 3.3, 3.8);
  const pan = kv(t, [[INS, 0], [INS + 4, 1, lin]]);
  // 窓（模擬画面）: コマの大きさから全体へ開き、閉じるときは中央へ縮む
  const ux = 60;
  const uy = 150;
  const uw = 1164;
  const uh = 660;
  const clip = (k: number) => {
    const cx = 0.5;
    const ins = (1 - k) * 42;
    return `inset(${ins}% ${(1 - k) * (cx * 100 - 12)}% ${ins}% ${(1 - k) * (cx * 100 - 12)}% round 12px)`;
  };
  const kq = outBack(prog(t, 9.0, 9.5));
  const zoomQ = inOut(prog(t, 10.6, 13));
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <CamGrid c={cam} />
      {figs > 0 && (
        <Cam cx={cam.cx} cy={cam.cy} z={cam.z}>
          <div style={{opacity: figs}}>
            {K04.map((x, i) => (
              <React.Fragment key={i}>
                <Koma x={x} y={Y04} w={480} frame={1} push={pulse(t, 1.2 + i * 0.5, 5) * 0.6} />
                <Particle t={t + 11} pos={(tt) => loopPos(tt, x, Y04, [0.3, 0.9, 0][i], 1.8 - prog(t, 0, 3) * 0.6, 380)} r={20} />
              </React.Fragment>
            ))}
            {MORE.map(([x, y], i) => {
              const t0 = 0.7 + i * 0.22;
              return (
                <React.Fragment key={`m${i}`}>
                  <Koma x={x} y={y} w={420} s={outBack(prog(t, t0, t0 + 0.4))} push={pulse(t, t0 + 0.9, 5) * 0.6} />
                  {t > t0 + 0.4 && <Particle t={t} pos={(tt) => (tt < t0 + 0.4 ? null : loopPos(tt, x, y, i * 0.37, 1.3, 330))} r={20} />}
                </React.Fragment>
              );
            })}
          </div>
        </Cam>
      )}
      {open > 0 && close < 1 && (
        <Lay x={-pan * 30 - close * 120} y={close * 40} s={(1 + pan * 0.03) * lerp(1, 0.3, close)} o={1 - close} ox={ux + uw / 2} oy={uy + uh / 2}>
          <div style={{position: 'absolute', left: ux, top: uy, width: uw, height: uh, clipPath: clip(open), background: C.white}}>
            {t < INS + 0.02 && <Img src={staticFile('ui-first.png')} style={{width: uw, height: uh}} />}
            {t >= INS + 4 && <Img src={staticFile('ui-last.png')} style={{width: uw, height: uh}} />}
            <Sequence from={Math.round((start + INS) * FPS)} durationInFrames={4 * FPS} layout="none">
              <OffthreadVideo src={staticFile('ui.mp4')} muted style={{position: 'absolute', left: 0, top: 0, width: uw, height: uh}} />
            </Sequence>
            <div style={{position: 'absolute', inset: 0, background: C.blue, opacity: 1 - prog(t, 3.6, 4.1)}} />
          </div>
        </Lay>
      )}
      {(() => {
        const kin = E_SLAM(prog(t, 3.7, 4.3));
        const kout = E_PUSH(prog(t, 8.1, 8.7));
        if (kin <= 0 || kout >= 1) return null;
        return (
          <Lay x={(1 - kin) * 760 + kout * 760 + pan * 24}>
            <div style={{position: 'absolute', left: 1270, top: 208, width: 620, height: 562, overflow: 'hidden', background: '#e9e4da'}}>
              {t >= INS + 4 && <Img src={staticFile('hand-last.png')} style={{position: 'absolute', left: -240, top: 0, width: 1000, height: 562}} />}
              <Sequence from={Math.round((start + INS) * FPS)} durationInFrames={4 * FPS} layout="none">
                <OffthreadVideo src={staticFile('hand.mp4')} muted style={{position: 'absolute', left: -240, top: 0, width: 1000, height: 562}} />
              </Sequence>
            </div>
            <div style={{...typeBase, left: 1270, top: 790, fontFamily: F.noto, fontWeight: 500, fontSize: 26, color: C.gray}}>
              <span data-ch="1">AI生成のイメージ / Created with Grok</span>
            </div>
          </Lay>
        );
      })()}
      {t > 8.4 && (
        <Cam cx={960 + zoomQ * 20} cy={420 + zoomQ * 10} z={1 + zoomQ * 0.55} r={zoomQ * 8}>
          <div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transform: 'translate(0, 0)'}}>
            {LINKS.map(([a, b], i) => {
              const k = E_SINK(prog(t, 8.9 + i * 0.25, 9.4 + i * 0.25));
              const [x1, y1] = HUB[a];
              const [x2, y2] = HUB[b];
              return <DrawLine key={i} x1={x1 + 150} y1={y1} x2={x2 - 150} y2={y2 + (i % 2 ? 30 : -30)} k={k} color={C.orange} w={6} head={0} />;
            })}
            {HUB.map(([x, y], i) => (
              <Koma key={i} x={x + Math.sin(t * 3 + i) * 8} y={y} w={230} s={outBack(prog(t, 8.5 + i * 0.08, 8.9 + i * 0.08))} r={Math.sin(t * 2 + i * 2) * 3} />
            ))}
            {kq > 0 && (
              <div style={{position: 'absolute', left: 960, top: 420, transform: `translate(-50%, -50%) scale(${kq}) rotate(${(1 - kq) * -30 + Math.sin(t * 3) * 4}deg)`, fontFamily: F.noto, fontWeight: 900, fontSize: 280, lineHeight: 1, color: C.orange}}>？</div>
            )}
          </div>
        </Cam>
      )}
      <Line t={v} text="量が増えると、" x={100} y={50} size={64} weight={700} color={C.gray} t0={0.5} t1={7.7} />
      <Lay x={kv(t, [[6.3, 0], [8.2, 40, lin]])}>
        <Line t={t} text="手で渡すのが重い。" x={110} y={845} size={130} t0={6.3} t1={8.15} />
      </Lay>
      <Lay y={kv(t, [[8.6, 0], [12.4, 30, lin]])} s={1 + zoomQ * 0.1} ox={960} oy={900}>
        <Line t={t} text="どれに、何を入れた？" x={960} y={850} size={120} anchor="c" t0={8.6} t1={10.9} />
      </Lay>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 06 がっちゃんこ？
const SC6: [number, number][] = [
  [250, 220],
  [1670, 220],
  [310, 870],
  [1630, 880],
  [960, 110],
  [960, 980],
];
const CENTER: [number, number] = [960, 440];
const CRACKS: [number, number][][] = [
  [
    [1150, 330],
    [1080, 410],
    [1110, 480],
    [990, 560],
    [940, 650],
  ],
  [
    [1150, 330],
    [1250, 390],
    [1290, 470],
    [1335, 530],
  ],
  [
    [1150, 330],
    [1020, 300],
    [880, 330],
    [760, 280],
    [610, 310],
  ],
  [
    [1110, 480],
    [1210, 560],
    [1270, 650],
  ],
  [
    [880, 330],
    [820, 430],
    [700, 470],
    [600, 560],
  ],
];
function polyLen(p: [number, number][]) {
  let l = 0;
  for (let i = 1; i < p.length; i++) l += Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]);
  return l;
}
export const Cut06: React.FC<CutProps> = ({t}) => {
  const rw = E_SINK(prog(t, 10.4, 11.5)); // 巻き戻し
  const merge = E_PUSH(prog(t, 1.8, 2.6)) * (1 - rw);
  const block = t >= 2.6 && rw < 0.12;
  const crack = clamp(prog(t, 8.0, 9.0) - rw * 3);
  const shake = damped(t, 8.0, 14, 9, 4) + damped(t, 7.2, 6, 9, 6);
  const cam: CamS = {cx: 960 + shake + kv(t, [[2.6, 0], [7.2, -90, lin], [10, -40]]), cy: 540 + kv(t, [[2.6, 0], [7.2, 40, lin], [10, 0]]), z: kv(t, [[0, 1.25], [0.9, 1], [2.6, 1], [7.2, 1.18, lin], [10, 1.05], [11.5, 0.9]])};
  const r = kv(t, [[0, 9], [0.9, 0], [2.6, 0], [7.2, -3, lin], [8.2, 0]]);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <CamGrid c={{...cam, cx: cam.cx + rw * 500}} />
      <VBlur id="rw" n={bump(t, 10.4, 1.1) * 18} x>
        <Cam cx={cam.cx} cy={cam.cy} z={cam.z} r={r}>
          {SC6.map(([x, y], i) => {
            const k = 1 - prog(t, 0.9, 1.6);
            const [ex, ey] = [lerp(x, CENTER[0], 0.62), lerp(y, CENTER[1], 0.62)];
            return k > 0 && rw === 0 ? <DrawLine key={`a${i}`} x1={lerp(x, CENTER[0], 0.2)} y1={lerp(y, CENTER[1], 0.2)} x2={ex} y2={ey} k={prog(t, 0.15 + i * 0.05, 0.6 + i * 0.05) * k} color={C.stop} w={5} head={18} /> : null;
          })}
          {!block &&
            SC6.map(([x, y], i) => {
              const out = 1 + rw * 0.3;
              const px = lerp(CENTER[0] + (x - CENTER[0]) * (rw > 0 ? out : 1), CENTER[0], merge);
              const py = lerp(CENTER[1] + (y - CENTER[1]) * (rw > 0 ? out : 1), CENTER[1], merge);
              return <Koma key={i} x={px} y={py} w={230} s={outExpo(prog(t, 0, 0.4)) * (1 + merge * 0.8)} r={merge * (i % 2 ? 20 : -20) + Math.sin(t * 2 + i) * 3} />;
            })}
          {block && (
            <div
              style={{
                position: 'absolute',
                left: CENTER[0] - 380,
                top: CENTER[1] - 210,
                width: 760,
                height: 420,
                borderRadius: 14,
                background: C.blue,
                transform: `scale(${1 + damped(t, 2.6, 0.18, 3, 6)}, ${1 - damped(t, 2.6, 0.22, 3, 6)})`,
              }}
            >
              <svg style={{position: 'absolute', left: -(CENTER[0] - 380), top: -(CENTER[1] - 210), overflow: 'visible'}} width={1} height={1}>
                {t > 7.2 && <rect x={1150 - 36 * outBack(prog(t, 7.2, 7.5))} y={330 - 26 * outBack(prog(t, 7.2, 7.5))} width={72 * outBack(prog(t, 7.2, 7.5))} height={52 * outBack(prog(t, 7.2, 7.5))} fill={C.red} />}
                {crack > 0 &&
                  CRACKS.map((p, i) => {
                    const L = polyLen(p);
                    const k = clamp(crack * 1.6 - i * 0.15);
                    return <polyline key={i} points={p.map((q) => q.join(',')).join(' ')} fill="none" stroke={C.red} strokeWidth={7} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={L} strokeDashoffset={L * (1 - k)} />;
                  })}
              </svg>
            </div>
          )}
        </Cam>
      </VBlur>
      {(() => {
        const s = slam(t, 0.6, 0.45, {y: 0, s: 1.8, r: 8});
        return (
          <Lay s={s.s} r={s.r} o={s.o} ox={960} oy={480}>
            <Line t={t} text="がっちゃんこ？" x={960} y={400} size={150} anchor="c" t0={0.6} dur={0.25} stagger={0.01} t1={1.75} outDur={0.25} />
          </Lay>
        );
      })()}
      {(() => {
        const s2 = slam(t, 2.75, 0.45, {y: -260, s: 0.7, r: 0});
        return (
          <Lay y={s2.y} s={s2.s} o={s2.o} ox={960} oy={850} x={kv(t, [[2.75, 0], [7.9, -50, lin]])}>
            <Line t={t} text="がっちゃんこ？" x={960} y={790} size={110} anchor="c" t0={2.75} dur={0.2} stagger={0.01} t1={7.9} />
          </Lay>
        );
      })()}
      <Lay x={kv(t, [[8.3, -20], [10.4, 20, lin]])}>
        <Line t={t} text="一か所が、全体に響く。" x={960} y={790} size={110} anchor="c" t0={8.3} t1={10.2} />
      </Lay>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 07 流れだけを、つなぐ。
export const CW = 300;
export const CY = 440;
export const CHAIN = [0, 1, 2, 3].map((i) => 510 + i * CW);
const SEP = [330, 750, 1170, 1590];
// 鎖の粒: A は粒が流れ始めてからの秒（07 の 9 秒目が 0）
export function chainPos(A: number, i: number, n = 4): [number, number] | null {
  if (A < 0) return null;
  const L = 1620;
  const u = A * 620 + i * (L / n);
  const x = 140 + (u % L);
  return [x, CY];
}
export function cam07end(): CamS {
  return {cx: 1080, cy: 540, z: 1};
}
export const Cut07: React.FC<CutProps> = ({t, v}) => {
  const clicks = [0, 1, 2, 3].map((k) => 7.15 + k * 0.32);
  const push = clicks.reduce((a, c) => a + damped(t, c + 0.2, 18, 7, 7), 0);
  const cam: CamS = {cx: kv(t, [[0, 880], [7, 980, lin], [9, 960], [12, 1080, inOut]]) - push, cy: kv(t, [[0, 600], [7, 540]]), z: kv(t, [[0, 1.25], [7, 1], [9, 1]])};
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <CamGrid c={cam} />
      <Cam cx={cam.cx} cy={cam.cy} z={cam.z} r={kv(t, [[0, -3], [7, 0]])}>
        <DrawLine x1={140} y1={CY} x2={350} y2={CY} k={E_SLAM(prog(t, clicks[0] - 0.1, clicks[0] + 0.15))} color={C.orange} w={6} head={22} />
        {CHAIN.map((fx, i) => {
          const fromX = i < 2 ? -500 - (1 - i) * 300 : 2400 + (i - 2) * 300;
          const kin = E_SLAM(prog(t, 0.1 + i * 0.12, 0.8 + i * 0.12));
          const kc = E_SLAM(prog(t, clicks[i], clicks[i] + 0.22));
          const x = lerp(lerp(fromX, SEP[i], kin), fx, kc);
          const y = CY - bump(v, 4.4 + i * 0.3, 0.45) * 40;
          return <Koma key={i} x={x} y={y} w={CW} push={pulse(t, clicks[i] + 0.2, 7) * 0.9} />;
        })}
        {[0, 1, 2, 3].map((i) => (
          <Particle key={i} t={t} pos={(tt) => chainPos(tt - 9, i)} r={16} />
        ))}
      </Cam>
      <Line t={v} text="合体ではなく、" x={160} y={110} size={84} weight={700} color={C.gray} t0={0.6} t1={6.3} />
      <Line t={v} text="流れだけを、" x={160} y={110} size={84} weight={700} color={C.gray} t0={7.0} />
      {(() => {
        const s = slam(v, 8.5, 0.5, {y: 260, s: 1.3, r: -6});
        return (
          <Lay y={s.y} s={s.s} r={s.r} o={s.o} ox={150} oy={800} x={kv(v, [[8.9, 0], [11.5, -40, lin]])}>
            <Line t={v} text="つなぐ。" x={150} y={660} size={280} t0={8.5} dur={0.2} stagger={0.01} />
          </Lay>
        );
      })()}
    </AbsoluteFill>
  );
};
