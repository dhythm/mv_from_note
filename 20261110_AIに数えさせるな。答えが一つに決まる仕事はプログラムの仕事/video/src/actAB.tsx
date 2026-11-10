// カット 01〜03。
// 01 まとめて渡す（カードの壁）→「問題ありません」が壁をおおう／02 吹き出しがどくと、下のカードは灰色で、変更が残っていた／03 手抜き？ → 渡し方？
import React from 'react';
import {C, Cam, CamS, E_PUSH, E_SNAP, Lay, Line, Plate, Txt, clamp, hash, hashR, in3, inOut, kv, lerp, out3, outExpo, prog, slam} from './kit';
import {Bubble, Card, CardS} from './figs';
import {S} from './timeline';

const lin = (k: number) => k;
const COLS = 8;
const ROWS = 6;
const BIG = [18, 29]; // 橙の帯が残っていたカード

export const ActA: React.FC<{T: number}> = ({T}) => {
  const b = S['02'];
  const c = S['03'];
  if (T > c + 0.15) return null;
  const cam: CamS = {
    cx: kv(T, [
      [0, 260],
      [2.9, 960, out3],
    ]),
    cy: kv(T, [
      [0, 330],
      [2.9, 540, out3],
    ]),
    z: kv(T, [
      [0, 2.0],
      [2.9, 0.95, out3],
      [3.08, 0.95],
      [3.3, 0.85, out3],
      [b, 1.02, lin],
      [b + 0.9, 1],
    ]),
    r: kv(T, [
      [0, -8],
      [2.9, 0, out3],
      [b, 2, lin],
      [b + 0.8, 0],
    ]),
  };
  const cards: CardS[] = [];
  for (let i = 0; i < COLS * ROWS; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    const t0 = 0.05 + col * 0.17 + hash(i) * 0.3;
    const kin = outExpo(prog(T, t0, t0 + 0.75));
    const drift = (row % 2 ? 1 : -1) * clamp(T - 2.6, 0, b - 2.6) * 10;
    let x = 960 + (col - 3.5) * 250 + drift + (1 - kin) * 2700;
    let y = 540 + (row - 2.5) * 160 + (1 - kin) * hashR(i + 5, -260, 260);
    let s = 1;
    let r = (1 - kin) * hashR(i + 9, -30, 30);
    let o = T >= t0 ? 1 : 0;
    let mv = kin < 0.999;
    const covered = col >= 1 && col <= 6 && row >= 2 && row <= 3;
    const g = covered ? prog(T, 3.25, 3.5) : 0;
    const bi = BIG.indexOf(i);
    if (bi >= 0) {
      const k = inOut(prog(T, b + 0.7, b + 1.7));
      const tgt = bi === 0 ? {x: 1440, y: 500, s: 3.3, r: -3} : {x: 1590, y: 872, s: 1.7, r: 4};
      const f = T - (b + 1.7);
      const kick = 1 + 0.07 * Math.exp(-Math.max(0, T - (b + 4.25)) * 7) * (T > b + 4.25 ? 1 : 0);
      x = lerp(x, tgt.x + (f > 0 ? f * (bi ? 12 : -9) : 0), k);
      y = lerp(y, tgt.y + (f > 0 ? f * (bi ? -9 : 6) : 0), k);
      s = lerp(1, tgt.s, k) * (bi === 0 ? kick : 1);
      r = lerp(r, tgt.r + (f > 0 ? f * (bi ? -1.1 : 0.9) : 0), k);
      mv = mv || (k > 0.001 && k < 0.999);
    } else {
      // 見ていたカードは外へ、灰色の残りは下へ抜ける
      const t1 = b + 0.5 + hash(i + 40) * 0.35;
      const k = in3(prog(T, t1, t1 + 0.6));
      if (k > 0) {
        if (covered) {
          y += k * 1300;
          r += k * hashR(i + 60, -20, 20);
        } else {
          x += k * (col < 4 ? -1900 : 1900);
          y += k * (row - 2.5) * 260;
        }
        mv = k < 1;
        if (k >= 1) o = 0;
      }
    }
    cards.push({x, y, s, r, g, o, mv, lit: 0.3, bar: bi >= 0 ? 1 : 0, z: bi >= 0 ? 5 + bi : 1});
  }
  // 吹き出し: しっぽの先から出て壁をおおう。02 では右上へ小さく退く
  const pop = E_SNAP(prog(T, 3.05, 3.5));
  const away = inOut(prog(T, b + 0.1, b + 0.95));
  const bx = lerp(960, 1560, away);
  const by = lerp(560, 150, away) + 6 * Math.sin((T - 3) * 0.9);
  const bs = lerp(1, 0.25, away);
  const br = lerp(-2 + 1.5 * Math.sin((T - 3) * 0.7), 5, away);
  const out = E_PUSH(prog(T, c - 0.32, c + 0.08));
  const hen = slam(T, b + 4.2, 0.5, {x: -500, y: 0, s: 1.25, r: 0});
  return (
    <Lay x={-out * 2300} mv={out > 0}>
      <Cam c={cam}>
        {cards.map((cd, i) => (
          <Card key={i} c={cd} />
        ))}
      </Cam>
      <Bubble x={bx} y={by} w={1500} h={430} k={pop} s={bs} r={br} stroke={C.gray} sw={11} text="問題ありません" size={186} color={C.gray} mv={pop < 1 || (away > 0 && away < 1)} z={20} />
      <Line t={T} text="見ていないところに、" x={118} y={196} size={72} color={C.ink} t0={b + 1.9} dx={lerp(0, 44, prog(T, b + 1.9, c))} />
      <Txt text="変更が" x={110 + hen.dx + lerp(0, -20, prog(T, b + 4.7, c))} y={306} size={262} color={C.ink} s={hen.s} o={hen.o} mv={hen.mv} />
      <Line t={T} text="残っていた。" x={116} y={606} size={140} color={C.ink} t0={b + 4.7} dx={lerp(40, 0, prog(T, b + 4.7, c))} />
    </Lay>
  );
};

export const ActB: React.FC<{T: number}> = ({T}) => {
  const c = S['03'];
  const a = S['04'];
  if (T < c - 0.1 || T > a + 0.2) return null;
  const te = slam(T, c + 0.05, 0.5, {x: 900, y: 0, s: 1.7, r: 4});
  // 「手抜き？」は小さく左上へ退き、「渡し方？」が大きく入る
  const k = inOut(prog(T, c + 4.3, c + 4.95));
  const wa = slam(T, c + 4.5, 0.55, {x: 1500, y: 0, s: 1.35, r: 0});
  const creep = prog(T, c + 5.0, a);
  const out = E_PUSH(prog(T, a - 0.3, a + 0.1));
  return (
    <Lay x={-out * 2300} mv={out > 0}>
      <Txt text="手抜き？" x={lerp(190, 120, k) + te.dx - creep * 20} y={lerp(330, -35, k)} size={380} color={C.gray} s={te.s * lerp(1 + 0.1 * prog(T, c + 0.5, c + 4.3), 0.29, k)} r={te.r + lerp(-4 + 4 * prog(T, c + 0.5, c + 4.3), 0, k)} o={te.o} mv={te.mv || (k > 0 && k < 1)} />
      {T >= c + 4.5 ? <Txt text="渡し方？" x={104 + wa.dx + creep * 26} y={410} size={400} color={C.ai} s={wa.s * (1 + 0.06 * creep)} mv={wa.mv} /> : null}
      <Plate x={112} y={880} w={1700} h={26} color={C.ai} k={outExpo(prog(T, c + 4.95, c + 5.6))} from="l" />
    </Lay>
  );
};
