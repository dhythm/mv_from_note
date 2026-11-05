// 08–11: 個別利用も残る → 点が線になる（見せ場）→ 留保（経験）→ 本人の結論
import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {CutProps} from './Main';
import {C, Cam, CamGrid, CamS, E_SINK, E_SLAM, Koma, Lay, Line, Particle, inOut, kv, lerp, mix, outExpo, prog, proj, slam} from './kit';
import {damped, pulse} from './lib/anim';
import {loopPos} from './scenes1';
import {CHAIN, CW, CY, chainPos} from './scenes2';

const lin = (k: number) => k;
const outBack = (k: number) => (k <= 0 ? 0 : k >= 1 ? 1 : 1 + 2.4 * Math.pow(k - 1, 3) + 1.4 * Math.pow(k - 1, 2));

// ---------------------------------------------------------------- 08 1つだけ使う日も、そのまま。
export const Cut08: React.FC<CutProps> = ({t, v}) => {
  const drop = E_SINK(prog(v, 4.5, 5.2));
  const flowO = 1 - prog(v, 4.4, 4.9);
  const cam: CamS = {
    cx: kv(t, [[0, 1080], [1.6, 960]]),
    cy: kv(v, [[4.4, 540], [5.6, 650], [7.4, 650], [9.2, 610]]),
    z: kv(v, [[4.4, 1], [5.6, 1.04], [7.4, 1.04], [9.2, 0.94]]),
  };
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <CamGrid c={cam} />
      <Cam cx={cam.cx} cy={cam.cy} z={cam.z}>
        {CHAIN.map((x, i) => (
          <Koma key={i} x={x} y={i === 1 ? lerp(CY, 750, drop) : CY} w={CW} frame={i === 1 ? prog(v, 5.3, 6.2) : 0} push={i === 1 ? pulse(v, 5.2, 6) : 0} />
        ))}
        <div style={{opacity: flowO}}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Particle key={i} t={t} pos={(tt) => chainPos(tt + 3, i, 6)} r={16} />
          ))}
        </div>
        {v > 5.6 && <Particle t={v} pos={(vv) => (vv < 5.6 ? null : loopPos(vv, CHAIN[1], 750, 0.2, 1.6, 300))} r={16} />}
      </Cam>
      <Line t={v} text="最初の入力を1つ渡せば、" x={160} y={700} size={64} weight={700} color={C.gray} t0={0.1} t1={4.3} />
      <Lay x={kv(v, [[2.6, 0], [4.3, 140, lin]])}>
        <Line t={v} text="次へ、次へ。" x={150} y={790} size={190} t0={2.6} t1={4.3} dir="right" />
      </Lay>
      <Lay x={kv(v, [[5.3, 0], [11, -40, lin]])}>
        <Line t={v} text="1つだけ使う日も、そのまま。" x={160} y={880} size={110} t0={5.3} />
      </Lay>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 09 点が、線になった。
const N09 = Array.from({length: 32}, (_, k) => k - 14);
const X09 = (i: number) => 960 + (i - 1.5) * 300;
const Y09 = 540;
const FREEZE = 12;
// 粒の進み（世界座標の px）。速さ 650 → 9 秒台で 4 倍へ。時刻から積分で決まる
function phase09(t: number) {
  const tt = Math.min(t, FREEZE);
  const a = 8.5;
  const b = 9.5;
  const v0 = 650;
  const v1 = 2600;
  if (tt <= a) return tt * v0;
  if (tt <= b) {
    const u = tt - a;
    return a * v0 + v0 * u + ((v1 - v0) * u * u) / (2 * (b - a));
  }
  return a * v0 + (v0 + v1) * 0.5 * (b - a) + (tt - b) * v1;
}
export function cam09(t: number): CamS {
  const tt = Math.min(t, FREEZE);
  return {cx: 960, cy: 540, z: kv(tt, [[0, 1.3], [2.6, 1.22, lin], [7.2, 0.2, (k) => inOut(k)]])};
}
export const Cut09: React.FC<CutProps> = ({t, v}) => {
  const cam = cam09(t);
  const tf = Math.min(t, FREEZE);
  const x0 = X09(-14) - 150;
  const L = X09(17) + 150 - x0;
  const np = 32;
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <CamGrid c={cam} />
      <Cam cx={cam.cx} cy={cam.cy} z={cam.z} r={kv(tf, [[2.6, 2], [7.2, 0]])}>
        {N09.map((i) => (
          <Koma key={i} x={X09(i)} y={Y09} w={CW} />
        ))}
      </Cam>
      {Array.from({length: np}, (_, i) => (
        <Particle
          key={i}
          t={tf}
          trail={0.12 + 0.15 * prog(tf, 8.5, 9.5)}
          pos={(tt) => {
            const u = phase09(tt) + (i * L) / np;
            const wx = x0 + (((u % L) + L) % L);
            return proj(cam09(tt), wx, Y09);
          }}
          r={Math.max(7, 16 * cam.z)}
        />
      ))}
      <Line t={v} text="つないだ瞬間、" x={140} y={100} size={80} weight={700} color={C.gray} t0={0} t1={5.2} />
      {(() => {
        const s = slam(v, 5.4, 0.5, {y: -40, s: 1.5, r: 5});
        return (
          <Lay s={s.s} r={s.r} o={s.o} y={s.y} ox={960} oy={320}>
            <Line t={v} text="点が、線になった。" x={960} y={230} size={170} anchor="c" t0={5.4} dur={0.2} stagger={0.01} />
          </Lay>
        );
      })()}
      <Line t={v} text="ひとまとまりの仕事が動く" x={960} y={720} size={64} weight={700} color={C.gray} anchor="c" t0={6.6} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 10 本当に化けたのは、経験かもしれない
const PAST = Array.from({length: 18}, (_, i) => i);
const PAST_STOP = [3, 9, 14];
const PILE: [number, number][] = [
  ...Array.from({length: 7}, (_, j) => [1110 + j * 96, 905] as [number, number]),
  ...Array.from({length: 5}, (_, j) => [1206 + j * 96, 850] as [number, number]),
  ...Array.from({length: 3}, (_, j) => [1302 + j * 96, 795] as [number, number]),
];
export const Cut10: React.FC<CutProps> = ({t, v}) => {
  const crane = E_SINK(prog(t, 0, 1.7));
  const lineY = lerp(540, -120, crane);
  const pastY = lerp(1260, 960, crane);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <CamGrid c={{cx: 960, cy: 540 + crane * 600 + t * 12, z: 1}} />
      {N09.map((i) => {
        const c = cam09(99);
        const [x] = proj(c, X09(i), Y09);
        return <Koma key={i} x={x} y={lineY} w={CW * c.z} />;
      })}
      {crane < 1 && Array.from({length: 32}, (_, i) => <Particle key={`p${i}`} t={0} trail={0} pos={() => [60 * i + 30, lineY]} r={7} />)}
      {PAST.map((i) => (
        <Koma key={i} x={140 + i * 96} y={pastY + Math.sin(t * 1.5 + i) * 3} w={80} color={PAST_STOP.includes(i) ? C.stop : C.blue} />
      ))}
      {PILE.map(([x, y], n) => {
        const t0 = 7.7 + n * 0.27;
        const k = E_SLAM(prog(v, t0, t0 + 0.35));
        return k > 0 ? <Koma key={`s${n}`} x={x} y={y - (1 - k) * 160} w={80} s={0.4 + 0.6 * outExpo(prog(v, t0, t0 + 0.2))} push={pulse(v, t0 + 0.35, 8)} /> : null;
      })}
      <Lay y={kv(v, [[0.6, 20], [4.9, -10, lin]])}>
        <Line t={v} text="一発で作っても、" x={160} y={170} size={64} weight={700} color={C.gray} t0={0.6} t1={4.9} />
        <Line t={v} text="同じ形にはならない。" x={150} y={260} size={140} t0={2.9} t1={4.95} />
      </Lay>
      <Lay y={kv(v, [[5.2, 20], [13.4, -60, lin]])}>
        <Line t={v} text="本当に化けたのは、" x={160} y={170} size={64} weight={700} color={C.gray} t0={5.2} />
        <Line t={v} text="積み重ねた経験" x={150} y={265} size={200} t0={7.7} />
        <Line t={v} text="だったのかもしれない。" x={160} y={500} size={84} weight={700} color={C.gray} t0={9.6} />
      </Lay>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 11 小さいまま、終わらない。
const IDX11 = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6];
const X11 = (i: number) => 885 + i * 150;
const Y11 = 900;
export const Cut11: React.FC<CutProps> = ({t, v}) => {
  const zk = inOut(prog(v, 3.5, 7.2));
  const late = prog(v, 7.2, 14.5);
  const cam: CamS = {cx: lerp(885, 960, zk) - late * 60, cy: lerp(Y11, 540, zk) + late * 20, z: lerp(1.6, 1, zk) * (1 + late * 0.08)};
  const mv = E_SINK(prog(v, 1.0, 1.7));
  const flow = prog(v, 6.4, 7.0);
  const shove = IDX11.reduce((a, i, n) => a + (n ? damped(v, 3.6 + n * 0.28 + 0.22, 10, 7, 7) * Math.sign(i) : 0), 0);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <CamGrid c={cam} />
      <Cam cx={cam.cx - shove} cy={cam.cy} z={cam.z}>
        {IDX11.map((i, n) => {
          const t0 = n === 0 ? -1 : 3.6 + n * 0.28;
          const k = E_SLAM(prog(v, t0, t0 + 0.22));
          const from = X11(i) + Math.sign(i) * 260;
          return <Koma key={i} x={n === 0 ? X11(0) : lerp(from, X11(i), k)} y={Y11} w={150} s={n === 0 ? 1 : outExpo(prog(v, t0 - 0.05, t0 + 0.1))} frame={n === 0 ? prog(v, 2.3, 3.2) : 0} push={pulse(v, t0 + 0.22, 7) * 0.8} />;
        })}
      </Cam>
      {flow > 0 && (
        <div style={{opacity: flow}}>
          {Array.from({length: 12}, (_, i) => (
            <Particle key={i} t={v} pos={(vv) => proj(cam, 80 + ((((vv - 6.4) * 560 + i * 150) % 1800) + 1800) % 1800, Y11)} r={10} />
          ))}
        </div>
      )}
      <Lay x={lerp(0, 140 - 630, mv)} y={lerp(0, 100 - 330, mv)} s={lerp(1, 0.55, mv)} ox={630} oy={330}>
        <Line t={v} text="小さく作る。" x={630} y={330} size={110} t0={0} color={mix(C.ink, C.gray, mv) as string} />
      </Lay>
      <Line t={v} text="ちゃんと動く。" x={220} y={200} size={120} color={C.green} t0={2.2} />
      {(() => {
        const s = slam(v, 9.25, 0.55, {y: 200, s: 1.35, r: -5});
        return (
          <Lay y={s.y} s={s.s} r={s.r} o={s.o} ox={300} oy={480} x={kv(v, [[9.6, 0], [14.5, 30, lin]])}>
            <Line t={v} text="つなぐと、化ける。" x={300} y={390} size={165} t0={9.25} dur={0.2} stagger={0.01} />
          </Lay>
        );
      })()}
    </AbsoluteFill>
  );
};
