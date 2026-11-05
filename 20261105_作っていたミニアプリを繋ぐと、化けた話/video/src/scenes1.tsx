// 01–04: 導入 → 段1「小さく作る」 → 段2「一つひとつが、ちゃんと動く」
// 各カットは t（カットの頭からの秒）と v（声の頭からの秒）だけで決まる。語の時刻は audio/voice/words.json。
import React from 'react';
import {AbsoluteFill} from 'remotion';
import type {CutProps} from './Main';
import {C, Cam, CamGrid, CamS, DrawLine, E_SINK, E_SLAM, Koma, Lay, Line, Particle, clamp, inOut, kv, lerp, mix, outExpo, prog, proj, slam} from './kit';
import {damped, hashR, pulse, wobble} from './lib/anim';

const lin = (k: number) => k;

// ---------------------------------------------------------------- 01 「数珠つなぎで動かせたら」
// 引用の 2 行が下から入り、寄りながら行ごとに逆向きへ流れる → 左上へ縮んで退き、奥から散らばったコマが現れる（Dolly out）
const SCATTER: [number, number, number][] = [
  [1460, 170, 150],
  [1760, 420, 120],
  [1150, 330, 110],
  [1560, 690, 170],
  [1290, 930, 130],
  [860, 950, 110],
  [420, 930, 150],
  [1840, 860, 100],
  [980, 110, 120],
  [1360, 520, 100],
  [760, 330, 90],
  [110, 360, 110],
  [130, 990, 90],
];
export const Cut01: React.FC<CutProps> = ({t, v}) => {
  const qs = kv(t, [[0, 0.94], [3.6, 1.1, lin], [4.5, 0.36, E_SINK]]);
  const qx = kv(t, [[3.6, 0], [4.5, -560, E_SINK]]);
  const qy = kv(t, [[3.6, 0], [4.5, -270, E_SINK]]);
  const drift = kv(t, [[0.6, 0], [3.6, 1, lin]]);
  const cam: CamS = {cx: 960 + wobble(t, 1, 9) * 20, cy: 540, z: kv(t, [[4.4, 1.45], [9, 0.95, (k) => 1 - Math.pow(1 - k, 2)]])};
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <CamGrid c={{cx: 960 - t * 30, cy: 540, z: lerp(1.2, 1, prog(t, 0, 9))}} />
      <Cam cx={cam.cx} cy={cam.cy} z={cam.z} r={kv(t, [[4.4, 6], [9, 0]])}>
        {SCATTER.map(([x, y, w], i) => {
          const t0 = 4.5 + i * 0.13;
          const k = outExpo(prog(t, t0, t0 + 0.7));
          return <Koma key={i} x={x + wobble(t, i, 5) * 14} y={y + wobble(t, i + 7, 6) * 10} w={w} s={k} r={(1 - k) * hashR(i, -40, 40) + wobble(t, i, 7) * 3} />;
        })}
      </Cam>
      <Lay x={qx} y={qy} s={qs} ox={960} oy={430}>
        <Lay x={-drift * 70}>
          <Line t={v} text="「数珠つなぎで" x={940} y={300} size={124} anchor="c" t0={0} />
        </Lay>
        <Lay x={drift * 70}>
          <Line t={v} text="動かせたら、うれしいです」" x={980} y={470} size={124} anchor="c" t0={0.7} />
        </Lay>
      </Lay>
      <Lay x={kv(t, [[3.6, 0], [9, -40, lin]])}>
        <Line t={v} text="現場の、" x={180} y={520} size={64} weight={700} color={C.gray} t0={3.1} />
        <Line t={v} text="ひと言から。" x={170} y={610} size={150} t0={4.7} />
      </Lay>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 02 小さく作る
const JOBS = ['集計', '整形', '確認', '変換', '通知'];
export const Cut02: React.FC<CutProps> = ({t, v}) => {
  const sl = slam(t, 0.15, 0.6, {y: 520, s: 1.3, r: 9});
  const cx = kv(t, [[2, 960], [2.6, 760, E_SINK], [6.2, 1000, inOut], [10, 900, lin]]);
  const cam: CamS = {cx, cy: 540, z: kv(t, [[0, 1.12], [2.6, 1], [10, 0.96]])};
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <CamGrid c={cam} />
      <Cam cx={cam.cx} cy={cam.cy} z={cam.z}>
        {JOBS.map((job, i) => {
          // 1 つ目は中央の大きなコマから列の先頭へ移る。2 つ目以降は左から順にポンと置かれる
          const t0 = i === 0 ? 0.3 : 2.2 + i * 0.55;
          const k = (i === 0 ? E_SLAM : (x: number) => (x <= 0 ? 0 : 1 + 2.2 * Math.pow(x - 1, 3) + 1.2 * Math.pow(x - 1, 2)))(prog(t, t0, t0 + 0.45));
          const m = i === 0 ? E_SINK(prog(t, 1.9, 2.6)) : 1;
          const x = i === 0 ? lerp(960, 360, m) : 360 + i * 300;
          const y = i === 0 ? lerp(320, 290, m) : 290;
          const w = i === 0 ? lerp(260, 210, m) : 210;
          const press = pulse(t, t0 + 0.45 + 1.2 + i * 0.25, 5) * 0.8;
          return <Koma key={i} x={x} y={y + Math.sin(t * 2.4 + i) * 6} w={w} s={k} push={press} label={prog(t, 2.6 + i * 0.55, 2.9 + i * 0.55) > 0 ? job : undefined} labelSize={44} />;
        })}
      </Cam>
      <Lay y={sl.y} s={sl.s} r={sl.r} o={sl.o} ox={960} oy={640}>
        <Line t={t} text="小さく作る" x={960} y={560} size={220} anchor="c" t0={0.15} dur={0.3} stagger={0.01} t1={4.0} dir="up" />
      </Lay>
      <Lay x={kv(v, [[3.7, 0], [10, -70, lin]])}>
        <Line t={v} text="1つのアプリに、" x={150} y={610} size={64} weight={700} color={C.gray} t0={3.7} />
        <Line t={v} text="1つの仕事。" x={140} y={700} size={230} t0={6.25} />
      </Lay>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 03 使われないものは、止める。
const GRID03: [number, number][] = [
  [360, 250],
  [660, 250],
  [960, 250],
  [1260, 250],
  [1560, 250],
  [510, 440],
  [810, 440],
  [1110, 440],
  [1410, 440],
];
const STOPPED = [1, 4, 6, 7];
export const Cut03: React.FC<CutProps> = ({t, v}) => {
  const cam: CamS = {cx: 960, cy: kv(t, [[0, 760], [4, 540]]) + kv(t, [[6, 0], [11, -20, lin]]), z: kv(t, [[0, 1.25], [4, 1], [11, 1.07, lin]])};
  const r = kv(t, [[0, -4], [4, 0]]);
  const kStop = inOut(prog(v, 2.95, 4.0));
  const kRe = E_SINK(prog(v, 5.2, 6.4));
  const live = GRID03.map((_, i) => i).filter((i) => !STOPPED.includes(i));
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <CamGrid c={cam} />
      <Cam cx={cam.cx} cy={cam.cy} z={cam.z} r={r}>
        {GRID03.map(([x0, y0], i) => {
          const stop = STOPPED.includes(i);
          const li = live.indexOf(i);
          const x = stop ? x0 : lerp(x0, 960 + (li - 2) * 250, kRe);
          const y = stop ? y0 + kStop * 18 + kRe * 230 : lerp(y0, 300, kRe);
          const k = outExpo(prog(t, 0.05 * i, 0.05 * i + 0.5));
          // 使われている印: 一度ずつ軽く押される（止めるものも、止める前は押される）
          const press = (stop && v > 2.9 ? 0 : pulse(v, 0.15 + i * 0.25, 6)) + (stop ? 0 : pulse(v, 7.4 + li * 0.18, 6));
          return <Koma key={i} x={x} y={y} w={200} s={k} push={press} color={stop ? mix(C.blue, C.stop, kStop) : C.blue} z={stop ? kStop * (1 + kRe * 0.3) : 0} o={stop ? 1 - kRe * 0.6 : 1} />;
        })}
      </Cam>
      <Line t={v} text="使って、直して。" x={160} y={700} size={130} t0={0.15} t1={2.85} />
      <Lay x={kv(v, [[4.3, 0], [10.6, -50, lin]])}>
        <Line t={v} text="使われないものは、" x={160} y={640} size={64} weight={700} color={C.gray} t0={2.95} />
        {(() => {
          const s = slam(v, 4.3, 0.5, {y: 0, s: 1.6, r: -6});
          return (
            <Lay s={s.s} r={s.r} o={s.o} ox={160} oy={850}>
              <Line t={v} text="止める。" x={150} y={730} size={250} t0={4.3} dur={0.2} stagger={0.01} />
            </Lay>
          );
        })()}
      </Lay>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 04 一つひとつが、ちゃんと動く
// 1 つのコマに寄り、粒が入って出る → 緑の枠を一周描く → 引きながら 3 つ並ぶ（粒は次へ渡らない）
export const K04 = [-760, 0, 760].map((d) => 960 + d);
export const Y04 = 400;
export function cam04(t: number): CamS {
  return {cx: kv(t, [[0, 960], [4.6, 960], [6.6, 960], [11, 900, lin]]), cy: 540, z: kv(t, [[0, 0.82], [3, 1], [4.3, 1], [6.4, 0.55]])};
}
// コマ k の粒（入って出る）。周期 1.8 秒、コマごとに拍をずらす
export function loopPos(t: number, kx: number, ky: number, phase: number, period = 1.8, span = 380): [number, number] | null {
  const u = (t + phase) / period;
  const f = u - Math.floor(u);
  if (f > 0.85) return null;
  return [kx - span + (f / 0.85) * span * 2, ky];
}
export const Cut04: React.FC<CutProps> = ({t, v}) => {
  const cam = cam04(t);
  const kSide = outExpo(prog(t, 4.6, 5.3));
  const labels = 1 - prog(t, 4.2, 4.5);
  const pIn = prog(t, 0.6, 2.8);
  const [lx, ly] = proj(cam, 960 - 470, Y04 - 80);
  const [rx, ry] = proj(cam, 960 + 470, Y04 - 80);
  return (
    <AbsoluteFill style={{background: C.paper}}>
      <CamGrid c={cam} />
      <Cam cx={cam.cx} cy={cam.cy} z={cam.z}>
        {labels > 0 && (
          <>
            <DrawLine x1={960 - 620} y1={Y04} x2={960 - 300} y2={Y04} k={prog(t, 0.2, 0.7) * labels} color={C.orange} w={6} head={22} />
            <DrawLine x1={960 + 300} y1={Y04} x2={960 + 620} y2={Y04} k={prog(t, 0.4, 0.9) * labels} color={C.orange} w={6} head={22} />
          </>
        )}
        {K04.map((x, i) => (
          <Koma key={i} x={x} y={Y04} w={480} s={i === 1 ? outExpo(prog(t, 0, 0.5)) : kSide} frame={i === 1 ? prog(v, 2.7, 3.8) : prog(t, 5.2 + (i ? 0.25 : 0), 6.1 + (i ? 0.25 : 0))} push={damped(t, 2.0, 0.6, 2.5, 5) * (i === 1 ? 1 : 0)} />
        ))}
        {pIn > 0 && pIn < 1 && <Particle t={t} pos={(tt) => (tt < 0.6 ? null : [lerp(960 - 640, 960 + 640, clamp((tt - 0.6) / 2.2)), Y04])} r={20} />}
        {t > 5.6 && K04.map((x, i) => <Particle key={i} t={t} pos={(tt) => (tt < 5.6 ? null : loopPos(tt, x, Y04, [0.3, 0.9, 0][i], 1.8, 380))} r={20} />)}
      </Cam>
      {labels > 0 && (
        <div style={{opacity: labels * prog(t, 0.4, 0.8)}}>
          <Line t={t} text="入口" x={lx} y={ly - 40} size={56} weight={700} color={C.gray} anchor="c" t0={0.3} />
          <Line t={t} text="出口" x={rx} y={ry - 40} size={56} weight={700} color={C.gray} anchor="c" t0={0.5} />
        </div>
      )}
      <Lay x={kv(v, [[0, 30], [3.9, -30, lin]])}>
        <Line t={v} text="一つひとつが、ちゃんと動く" x={960} y={760} size={100} anchor="c" t0={0.0} t1={3.9} colorAt={(i) => (i >= 7 ? C.green : undefined)} />
      </Lay>
      <Lay x={kv(v, [[5.3, 0], [10.6, -50, lin]])}>
        <Line t={v} text="入力と出力を" x={160} y={680} size={64} weight={700} color={C.gray} t0={5.3} />
        <Line t={v} text="分けて作っていた。" x={150} y={770} size={150} t0={7.6} />
      </Lay>
    </AbsoluteFill>
  );
};
