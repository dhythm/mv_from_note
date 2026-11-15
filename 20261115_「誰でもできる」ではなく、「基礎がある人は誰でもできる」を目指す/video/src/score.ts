// 図の層の「楽譜」。場所、カメラのキー、速い振り、図と画面の語の両方が使う配置。すべて全体の時刻 T の純関数。
// 図は「画面の px（1920×1080）」で設計し、カメラが正面・距離 16 のときにその px へ写る世界座標へ直す。
import {CamKey, V3} from './cam';
import {CUTS, S} from './timeline';
import {E_WHIP, H, W, in3, inOut, lin, out3, prog} from './kit';

export {S};
export const U = 1080 / (2 * 16 * Math.tan((17 * Math.PI) / 180)); // 距離 16 での 1 単位あたりの px
export const wx = (px: number) => (px - W / 2) / U;
export const wy = (py: number) => (H / 2 - py) / U;
export const add = (o: V3, x: number, y: number, z = 0): V3 => [o[0] + x, o[1] + y, o[2] + z];
export const DUR: Record<string, number> = Object.fromEntries(CUTS.map((c) => [c.id, c.dur]));

// 場所（世界の原点）
const O1: V3 = [0, 0, 0];
const O3: V3 = [40, 0, 0];
const O4: V3 = [40, -25, 0];
const O5: V3 = [80, -25, 0];
const O6: V3 = [120, -25, 0];
const O8: V3 = [120, 0, 0];
export const O = {c2: O1, c3: O3, c4: O4, c5: O5, c6: O6, c8: O8};

// 速い振り（次のカットの頭を中心に ±WD 秒）。ax: 画面が流れる軸、v: 画面の中身が流れる向き（px）
export const WD = 0.3;
export const WH: {id: string; vx: number; vy: number}[] = [
  {id: '03', vx: -W, vy: 0},
  {id: '04', vx: 0, vy: -H},
  {id: '05', vx: -W, vy: 0},
  {id: '06', vx: -W, vy: 0},
  {id: '08', vx: 0, vy: H},
];
const IDS = CUTS.map((c) => c.id);
// カット id の語の層を、振りに合わせて流す量
export function shift(id: string, T: number) {
  let dx = 0;
  let dy = 0;
  let mv = false;
  for (const w of WH) {
    const p = prog(T, S[w.id] - WD, S[w.id] + WD);
    const k = E_WHIP(p);
    if (w.id === id) {
      dx -= w.vx * (1 - k);
      dy -= w.vy * (1 - k);
      if (p < 1) mv = true;
    } else if (IDS.indexOf(w.id) - 1 === IDS.indexOf(id)) {
      dx += w.vx * k;
      dy += w.vy * k;
      if (p > 0) mv = true;
    }
  }
  return {dx, dy, mv};
}
export function whip(T: number): {n: number; ax: 'x' | 'y'} {
  for (const w of WH) {
    const p = prog(T, S[w.id] - WD, S[w.id] + WD);
    if (p > 0 && p < 1) return {n: 46 * Math.sin(Math.PI * p), ax: w.vx ? 'x' : 'y'};
  }
  return {n: 0, ax: 'x'};
}

// 03: 細かくなり続ける手順の行（増える数）と、その行の位置
export const ROW3 = {y0: 612, pitch: 58, n: 64, a: 5.6, b: 8.3, back: 8.7};
export const rows3 = (t: number) => ROW3.n * in3(prog(t, ROW3.a, ROW3.b));
// 07: 基準線の高さ（px）。難しい課題で上がる
export const lineY7 = (t: number) => 760 - 200 * inOut(prog(t, 9.1, 10.3));

const K = (id: string, d: number, o: V3, p: V3, t: V3, x: Partial<CamKey> = {}): CamKey => ({at: S[id] + d, p: add(o, ...p), t: add(o, ...t), ...x});
const F = (id: string, d: number, o: V3, x = 0, y = 0, z = 16, e?: (k: number) => number): CamKey => K(id, d, o, [x, y, z], [x, y, 0], e ? {e} : {});
const follow3: CamKey[] = [0, 1, 2, 3, 4, 5, 6].map((i) => {
  const t = ROW3.a + ((ROW3.b - ROW3.a) * i) / 6;
  const y = Math.max(0, ROW3.y0 + rows3(t) * ROW3.pitch - 780);
  return F('03', t, O3, 0.3, -y / U, 16, lin);
});

export const CAM: CamKey[] = [
  F('01', 0, O1),
  // 02 広がる輪。寄り → 「中学生まで」で大きく引く → 止まる輪へ戻る
  F('02', 0, O1),
  F('02', 4.6, O1, 0, 0, 14.6, lin),
  F('02', 6.3, O1, 0, 0, 19.5, out3),
  F('02', 10.2, O1, 0, 0, 21, lin),
  F('02', 12.5, O1, 0, 0, 16),
  F('02', DUR['02'] - WD, O1, 0, 0, 14.9, lin),
  // 03 手順の行 → 増え続ける行を追う → 頭へ戻って基準線
  F('03', WD, O3, -0.3, 0, 16, E_WHIP),
  ...follow3,
  F('03', ROW3.back, O3, 0.2, 0, 16, E_WHIP),
  F('03', DUR['03'] - WD, O3, -0.5, 0, 15.3, lin),
  // 04 言葉だけ
  F('04', WD, O4, 0, 0, 16, E_WHIP),
  F('04', DUR['04'] - WD, O4, 0, 0, 16, lin),
  // 05 渡る手順と、経験の層。厚みが見えるよう少し上から回り込む
  K('05', WD, O5, [-2.2, 1.2, 16.2], [0, -0.2, 0], {e: E_WHIP}),
  K('05', 8.6, O5, [-0.8, 1.4, 16.2], [0, -0.2, 0], {e: lin}),
  K('05', DUR['05'] - WD, O5, [2.0, 2.0, 15.4], [0.1, -0.2, 0], {e: lin}),
  // 06 長い線の上を進む → 引いても端が見えない → 括った区間へ
  F('06', WD, O6, -15, 0, 16, E_WHIP),
  F('06', 5.2, O6, 0, 0, 16, out3),
  F('06', 7.3, O6, 0, 0, 21.5),
  F('06', 9.8, O6, 0, 0, 16),
  F('06', DUR['06'], O6, 0.3, 0, 15.5, lin),
  // 07 同じ線が基準線になる
  F('07', 9.0, O6, -0.3, 0, 16, lin),
  F('07', 10.4, O6, 0, 0.5, 16.8),
  F('07', DUR['07'] - WD, O6, 0.4, 0.4, 16, lin),
  // 08 二つの面
  F('08', WD, O8, 0, 0, 16, E_WHIP),
  F('08', 7.2, O8, 0.5, 0, 15.5, lin),
  F('08', 9.6, O8, -0.9, 0.2, 16.3),
  F('08', 10.9, O8, 0.15, 0, 16),
  F('08', DUR['08'], O8, 0.5, 0, 15.7, lin),
  // 09 結び
  F('09', DUR['09'], O8, 0, 0, 15.4, lin),
];
