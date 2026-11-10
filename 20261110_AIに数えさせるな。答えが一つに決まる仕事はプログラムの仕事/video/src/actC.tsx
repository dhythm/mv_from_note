// カット 04〜07: 同じ 30 枚のカードが、一枚→面→長い列→三段→山→一枚ずつ→仕分け、と形を変える。
// 04 注意力の予算（円の面積×濃さは一定。広げるほど薄い）／05 長い入力の真ん中が抜ける／06 一つずつ／07 気になるものだけ
// 30 枚は絵の密度で、原稿の件数ではない。画面に数は書かない。
import React from 'react';
import {C, Cam, CamS, DBlur, E_PUSH, K, Line, Plate, Txt, clamp, during, hashR, in3, inOut, kv, lerp, out3, outBack, outExpo, prog, proj, slam} from './kit';
import {Card, CardS, Disc} from './figs';
import {S} from './timeline';

export const N = 30;
const lin = (k: number) => k;
const smooth = (a: number, b: number, v: number) => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};
type P = {x: number; y: number; s: number; r: number; z: number};
const bl = (p: P, q: P, k: number): P => (k <= 0 ? p : k >= 1 ? q : {x: lerp(p.x, q.x, k), y: lerp(p.y, q.y, k), s: lerp(p.s, q.s, k), r: lerp(p.r, q.r, k), z: k > 0.5 ? q.z : p.z});

// 残っていた変更（橙の帯）があるカードと、07 で残すカード
const BAR = [13, 16];
export const KEPT = [13, 16, 22];
// 06 で渡す順（帯のあるカードは、まだ一枚ずつが見える速さのうちに出す）
const ORDER = (() => {
  const rest = Array.from({length: N}, (_, i) => i).filter((i) => !BAR.includes(i));
  rest.splice(3, 0, 13);
  rest.splice(6, 0, 16);
  return rest;
})();
const POS = (() => {
  const p: number[] = [];
  ORDER.forEach((card, n) => (p[card] = n));
  return p;
})();
// 渡し始める時刻（06 の頭からの秒）。だんだん速くなる
const DEAL0 = 3.5;
const DEP = (() => {
  const d: number[] = [];
  let t = DEAL0;
  for (let n = 0; n < N; n++) {
    d.push(t);
    t += Math.max(0.17, 0.5 * Math.pow(0.9, n));
  }
  d.push(t + 0.35);
  return d;
})();
export const DEAL_END = DEP[N];

export const SPOT = {x: 960, y: 660};
// 08 で吹き出しの台になるカードの位置（actD と共有）
export const PLATFORM: P = {x: 360, y: 850, s: 1.5, r: -3, z: 5};

const fOne = (i: number): P => ({x: 1330, y: 580, s: i === 0 ? 2.6 : 0.5, r: i === 0 ? -2 : 0, z: i === 0 ? 40 : 0});
const fGrid = (i: number, ex: number): P => ({x: 1310 + ((i % 6) - 2.5) * 180 * ex, y: 550 + (Math.floor(i / 6) - 2) * 148 * ex, s: 0.78, r: hashR(i + 3, -1.6, 1.6), z: 1});
const fStrip = (i: number): P => ({x: 960 + 260 * i, y: 540, s: 1, r: 0, z: 1});
const fSnake = (i: number, drift: number): P => {
  const row = Math.floor(i / 10);
  const c = i % 10;
  const col = row === 1 ? 9 - c : c;
  return {x: 195 + col * 170 + (row === 1 ? -drift : drift), y: 540 + row * 135, s: 0.75, r: 0, z: 1};
};
const fDeck = (i: number): P => ({x: 300 + hashR(i + 20, -7, 7), y: 760 - (N - POS[i]) * 2.4, s: 0.95, r: hashR(i + 50, -5, 5), z: N - POS[i]});
const fSpot = (): P => ({x: SPOT.x, y: SPOT.y, s: 2.5, r: 0, z: 60});
const fDone = (i: number): P => ({x: 1620 + hashR(i + 70, -7, 7), y: 760 - POS[i] * 2.4, s: 0.95, r: hashR(i + 90, -5, 5), z: POS[i]});
const fGrid7 = (i: number): P => ({x: 650 + (i % 6) * 212, y: 250 + Math.floor(i / 6) * 150, s: 0.95, r: hashR(i + 7, -2, 2), z: 1});
const fKeep = (j: number): P => ({x: 1085 + j * 298, y: 610 + [0, -46, 30][j], s: 1.35, r: [-4, 3, -2][j], z: 10 + j});

export const ActC: React.FC<{T: number}> = ({T}) => {
  const a = S['04'];
  const b = S['05'];
  const c = S['06'];
  const d = S['07'];
  const e = S['08'];
  if (T < a - 0.3 || T > e + 0.05) return null;

  // ---- カメラ（図の層だけ） ----
  const CX: K[] = [
    [b, 960],
    [b + 1.0, 960 + 260 * 1.7],
    [b + 1.3, 960 + 260 * 2.0, lin],
    [b + 2.1, 960 + 260 * 12.4, inOut],
    [b + 2.9, 960 + 260 * 16.6, lin],
    [b + 3.5, 960 + 260 * 27.2, inOut],
    [b + 3.8, 960 + 260 * 27.5, lin],
    [b + 5.0, 960, inOut],
  ];
  const cam: CamS = {
    cx: kv(T, CX),
    cy: kv(T, [
      [b + 8.0, 540],
      [c - 0.05, 700, inOut],
      [c + 0.9, 540],
    ]),
    z: kv(T, [
      [a, 1],
      [a + 3.2, 1.12, lin],
      [a + 3.8, 0.95, out3],
      [b, 1, lin],
      [b + 1.0, 1.45],
      [b + 3.8, 1.45],
      [b + 5.0, 1],
      [b + 8.0, 1.03, lin],
      [c - 0.05, 1.7, inOut],
      [c + 0.9, 1],
      [c + 3.5, 1],
      [d - 0.6, 1.12, lin],
      [d + 0.5, 1],
    ]),
    r: kv(T, [
      [a, -3],
      [a + 3.2, 1, lin],
      [a + 4.0, 0, out3],
      [c + 3.5, 0],
      [d - 0.6, 1.8, lin],
      [d + 0.5, 0],
      [d + 4, 0],
      [e, -1.2, lin],
    ]),
  };
  const camSpeed = Math.abs(kv(T + 1 / 60, CX) - kv(T - 1 / 60, CX)) * 30 * cam.z;
  const blur = T > b + 1.2 && T < b + 3.9 ? Math.min(26, camSpeed / 30 / 5) : 0;

  // ---- 光（注意力の予算）: 04 は一つの円。半径が伸びるほど薄くなる ----
  const dR = kv(T, [
    [a + 0.1, 0],
    [a + 0.75, 330, outBack],
    [a + 3.2, 345, lin],
    [a + 4.6, 830, out3],
    [b + 0.3, 1000, lin],
  ]);
  const dA = Math.max(0.13, 0.88 * Math.pow(330 / Math.max(dR, 330), 2)) * (1 - prog(T, b + 0.1, b + 0.7));
  const dX = kv(T, [
    [a + 3.2, 1330],
    [a + 4.3, 1310],
  ]);
  const dY = kv(T, [
    [a + 3.2, 580],
    [a + 4.3, 550],
  ]);
  // 06: 一枚だけを照らす円
  const sK = outBack(prog(T, c + 2.95, c + 3.45)) * (1 - in3(prog(T, d - 0.6, d - 0.25)));
  // 07: 残した三枚を、もう一度一枚ずつ
  const lift = (j: number) => {
    const t0 = d + 5.0 + j * 1.5;
    return out3(prog(T, t0, t0 + 0.35)) * (1 - inOut(prog(T, t0 + 1.15, t0 + 1.5)));
  };

  const drift = (T - (b + 5.0)) * 9;

  // ---- カード ----
  const cards: CardS[] = [];
  for (let i = 0; i < N; i++) {
    const n = POS[i];
    const j = KEPT.indexOf(i);
    const k1 = inOut(prog(T, a + 3.2 + i * 0.012, a + 4.1 + i * 0.012));
    const k2 = inOut(prog(T, b + i * 0.012, b + 1.0 + i * 0.012));
    const k3 = inOut(prog(T, b + 3.8 + i * 0.01, b + 4.9 + i * 0.01));
    const k4 = inOut(prog(T, c + (N - 1 - n) * 0.012, c + 0.9 + (N - 1 - n) * 0.012));
    const k5 = outExpo(prog(T, c + DEP[n] + 0.05, c + DEP[n] + 0.25));
    const k6 = outExpo(prog(T, c + DEP[n + 1], c + DEP[n + 1] + 0.22));
    const k7 = inOut(prog(T, d - 0.55 + n * 0.015, d + 0.35 + n * 0.015));
    let p = bl(bl(bl(bl(bl(bl(bl(fOne(i), fGrid(i, 1 + 0.06 * prog(T, a + 4.2, b + 0.3)), k1), fStrip(i), k2), fSnake(i, drift), k3), fDeck(i), k4), fSpot(), k5), fDone(i), k6), fGrid7(i), k7);
    let o = i === 0 || k1 > 0 ? 1 : 0;
    let mv = [k1, k2, k3, k4, k5, k6, k7].some((k) => k > 0.001 && k < 0.999);
    let tag = 0;
    let liftK = 0;
    if (i === 0) p = {...p, s: p.s * outBack(prog(T, a + 0.2, a + 0.8))};
    if (j < 0) {
      // 問題なしの札が付き、下へ抜ける
      tag = outBack(prog(T, d + 0.55 + hashR(i + 11, 0, 0.55), d + 0.8 + hashR(i + 11, 0, 0.55)));
      const t0 = d + 1.45 + (i % 6) * 0.05 + Math.floor(i / 6) * 0.035;
      const kd = in3(prog(T, t0, t0 + 0.6));
      if (kd > 0) {
        p = {...p, y: p.y + kd * 1250, r: p.r + kd * hashR(i + 31, -24, 24)};
        mv = kd < 1;
        if (kd >= 1) o = 0;
      }
    } else {
      const k8 = inOut(prog(T, d + 1.65 + j * 0.1, d + 2.55 + j * 0.1));
      p = bl(p, fKeep(j), k8);
      liftK = lift(j);
      p = bl(p, {x: 1400, y: 590, s: 2.05, r: 0, z: 30}, liftK);
      // 最後の文で、三枚が位置を一つずつ送る
      const k9 = inOut(prog(T, d + 11.3 + j * 0.08, d + 12.1 + j * 0.08));
      p = bl(p, {...fKeep((j + 1) % 3), z: p.z}, k9);
      // 08 へ: 一枚が吹き出しの台になり、ほかは右へ抜ける
      // 台になる一枚は、先に下がってから左へ（文字の下をくぐる）
      const k10 = j === 2 ? inOut(prog(T, e - 1.4, e - 0.4)) : in3(prog(T, e - 1.6 + j * 0.08, e - 1.0 + j * 0.08));
      const k10y = out3(prog(T, e - 1.4, e - 0.95));
      p = j === 2 ? {...bl(p, PLATFORM, k10), y: lerp(p.y, PLATFORM.y, k10y)} : {...p, x: p.x + k10 * 1300, r: p.r + k10 * 14};
      mv = mv || [k8, k9, k10].some((k) => k > 0.001 && k < 0.999);
    }
    // 光と灰
    const dist = Math.hypot(p.x - dX, p.y - dY);
    const w4 = dA * (1 - smooth(0.8, 1.05, dist / Math.max(dR, 1))) * (T < b + 0.7 ? 1 : 0);
    const u = Math.abs(i - 14.5) / 14.5;
    const gate5 = prog(T, b + 0.5, b + 1.3) * (1 - prog(T, c + 0.05, c + 0.7));
    const g = (1 - smooth(0.42, 0.8, u)) * gate5;
    const w5 = smooth(0.55, 0.92, u) * 0.85 * gate5;
    const sp = k5 * (1 - k6);
    const seen = n >= 0 && T > c + DEP[n] ? 1 : 0;
    cards.push({...p, o, mv, tag, g, warm: clamp(w4 + w5 + 0.95 * sp + 0.9 * liftK), lit: clamp(0.3 + 0.7 * Math.max(sp, liftK) + 0.25 * seen * (1 - sp)), bar: BAR.includes(i) ? 1 : 0});
  }

  // ---- 文字 ----
  const yosan = slam(T, a + 1.7, 0.5, {x: -500, y: 0, s: 1.25, r: 0});
  const yosanOut = E_PUSH(prog(T, a + 3.05, a + 3.45));
  const mio = slam(T, b + 4.55, 0.5, {y: 240, s: 1.35, r: -4});
  const mioOut = E_PUSH(prog(T, b + 7.9, b + 8.25));
  // 「一つずつ。」: 画面いっぱいに着地してから、左上へ縮む
  const hK: K[] = [
    [c + 1.2, 3.4],
    [c + 1.7, 2.2, outExpo],
    [c + 3.0, 2.12, lin],
    [c + 3.5, 1, inOut],
  ];
  const hS = kv(T, hK);
  const hY = kv(T, [
    [c + 3.0, 300],
    [c + 3.5, 92],
  ]);
  const hOut = E_PUSH(prog(T, d - 0.6, d - 0.25));
  const erabu = slam(T, d + 13.3, 0.5, {x: -600, y: 0, s: 1.2, r: 0});
  const read5 = prog(T, b + 4.3, b + 8.0);
  const [l0x, l0y] = proj(cam, 960 + 260 * 0.5, 540 - 150);
  const [l1x, l1y] = proj(cam, 960 + 260 * 28.5, 540 - 150);
  const labelOn = T > b + 0.55 && T < b + 3.95;

  return (
    <>
      <DBlur id="c" n={blur} x>
        <Cam c={cam}>
          <Disc x={dX} y={dY} r={dR} a={dA} />
          {/* 05: 列の最初と最後に残る光 */}
          <Disc x={960 + 260 * 1.6} y={540} r={430} a={0.5 * prog(T, b + 0.5, b + 1.2) * (1 - prog(T, b + 4.0, b + 4.5))} sx={1.5} />
          <Disc x={960 + 260 * 27.4} y={540} r={430} a={0.5 * prog(T, b + 0.5, b + 1.2) * (1 - prog(T, b + 4.0, b + 4.5))} sx={1.5} />
          <Disc x={SPOT.x} y={SPOT.y} r={400 * sK} a={0.9} />
          {KEPT.map((i, j) => (lift(j) > 0.01 ? <Disc key={j} x={cards[i].x} y={cards[i].y} r={340 * lift(j)} a={0.85} /> : null))}
          {cards.map((cd, i) => (
            <Card key={i} c={cd} />
          ))}
        </Cam>
      </DBlur>

      {/* 04: 予算 → 薄くなる */}
      <Line t={T} text="注意力の、" x={128} y={290} size={92} color={C.ai} t0={a + 0.8} t1={a + 3.0} dx={lerp(0, 60, prog(T, a + 0.8, a + 3.2))} />
      {T < a + 3.5 ? <Txt text="予算。" x={118 + yosan.dx - yosanOut * 1400 + lerp(0, -30, prog(T, a + 2.2, a + 3.2))} y={420} size={330} color={C.ai} s={yosan.s} o={yosan.o} mv={yosan.mv || yosanOut > 0} /> : null}
      <Line t={T} text="注意力の、予算。" x={124} y={104} size={58} color={C.ai} t0={a + 3.6} t1={b - 0.15} dir="down" />
      <Line t={T} text="薄く" x={112} y={300} size={236} color={C.gray} t0={a + 3.95} t1={b - 0.2} dx={lerp(0, 60, prog(T, a + 3.95, b))} stagger={0.06} />
      <Line t={T} text="なる。" x={112} y={570} size={236} color={C.gray} t0={a + 4.15} t1={b - 0.12} dx={lerp(60, 0, prog(T, a + 4.15, b))} stagger={0.06} />

      {/* 05: 長い入力の最初と最後 → 真ん中ほど、見落とす */}
      {labelOn ? <Txt text="最初" x={l0x} y={l0y - 150} size={150} color={C.ink} anchor="c" mv /> : null}
      {labelOn ? <Txt text="最後" x={l1x} y={l1y - 150} size={150} color={C.ink} anchor="c" mv /> : null}
      <Line t={T} text="真ん中ほど、" x={150} y={84} size={112} color={C.ai} t0={b + 4.3} t1={b + 7.85} dx={lerp(0, 50, read5)} />
      {T < b + 8.3 ? <Txt text="見落とす。" x={140 + lerp(0, -30, read5) - mioOut * 2000} y={212 + mio.dy} size={262} color={C.ai} s={mio.s} r={mio.r} o={mio.o} mv={mio.mv || mioOut > 0} /> : null}
      {/* 留保: 紙色の帯の上の一行。カードは帯の下を通る */}
      <Plate x={0} y={872} w={1920} h={208} color={C.paper} k={outExpo(prog(T, b + 6.4, b + 6.9)) * (1 - prog(T, c - 0.1, c + 0.02))} />
      <Plate x={0} y={872} w={1920} h={5} color={C.gray} k={outExpo(prog(T, b + 6.4, b + 7.0)) * (1 - prog(T, c - 0.1, c + 0.02))} />
      <Line t={T} text="人でも、同じかもしれない。" x={150} y={916} size={66} weight={700} color={C.gray} t0={b + 6.6} t1={c - 0.25} dx={lerp(0, 40, prog(T, b + 6.6, c))} box />

      {/* 06: 一つずつ */}
      {T >= c + 1.2 && T < d - 0.2 ? <Txt text="一つずつ。" x={112 - hOut * 1500} y={hY} size={150} color={C.ai} s={hS} mv={during(T, c + 1.15, c + 1.65) || during(T, c + 3.0, c + 3.5) || hOut > 0} /> : null}
      <Line t={T} text="毎回、くっきり。" x={1806} y={122} size={88} color={C.ink} anchor="r" t0={c + 5.4} t1={d - 0.65} dx={lerp(30, -20, prog(T, c + 5.4, d))} />

      {/* 07: 気になるものだけ */}
      <Line t={T} text="気になる" x={112} y={150} size={150} color={C.ai} t0={d + 1.85} t1={d + 10.95} dx={lerp(0, 26, prog(T, d + 1.85, d + 11))} />
      <Line t={T} text="ものだけ。" x={112} y={322} size={150} color={C.ai} t0={d + 2.0} t1={d + 11.02} dx={lerp(26, 0, prog(T, d + 2.0, d + 11))} />
      <Line t={T} text="問題なしは、渡さない。" x={116} y={560} size={66} color={C.ink} t0={d + 3.4} t1={d + 10.9} dir="down" dx={lerp(0, 22, prog(T, d + 3.4, d + 11))} />
      <Line t={T} text="最初から、" x={120} y={300} size={92} color={C.ink} t0={d + 12.6} t1={e - 0.4} dx={lerp(0, 30, prog(T, d + 12.6, e))} />
      {T < e - 0.02 ? <Txt text="選ぶ。" x={112 + erabu.dx - E_PUSH(prog(T, e - 0.4, e - 0.05)) * 1500} y={430} size={290} color={C.ai} s={erabu.s} o={erabu.o} mv={erabu.mv || T > e - 0.4} /> : null}
    </>
  );
};
