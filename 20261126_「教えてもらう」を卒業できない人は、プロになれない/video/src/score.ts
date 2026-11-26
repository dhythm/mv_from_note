// 全体の設計図: 各カットの世界原点・カメラキー・速い振り・生成動画インサートの区間。
// すべて時刻 T から決まる純関数。
import type {CamKey} from './cam';
import {E_WHIP, H, W, clamp, inOut, out3, prog} from './kit';
import {T01, T02, T03, T04, T05, T06, T07, T08} from './figs';
import {at, D, vt} from './timeline';

// 画面 px → 世界座標（距離 16・fov 34° の平面。1080px = 9.79 単位）
export const WORLD_H = 2 * 16 * Math.tan((34 * Math.PI) / 360);
export const PX = WORLD_H / H;
export const wx = (px: number) => (px - W / 2) * PX;
export const wy = (py: number) => (H / 2 - py) * PX;

// 各カットの世界原点（離して置き、他のカットの図が映り込まないようにする）
export const POS: Record<string, [number, number]> = {
  '01': [0, 0],
  '02': [44, 0],
  '03': [88, 0],
  '04': [88, -28],
  '05': [132, -28],
  '06': [132, -56],
  '07': [176, -56],
  '08': [176, -28],
};

export type ClipDef = {
  id: string;
  file: string;
  start: number;
  end: number;
  /** 素材の何秒目から使うか */
  from?: number;
  fadeIn: number;
  fadeOut: number;
  wipeIn?: 'none' | 'left' | 'up';
  wipeOut?: 'none' | 'left' | 'right';
  /** 画面内の窓（px）。省くと全面 */
  rect?: [number, number, number, number];
  objPos?: string;
  veil?: string;
  filter?: string;
  zoom?: [number, number];
  /** 画を右へ寄せる px（zoom で余白を作ったぶんだけ） */
  shift?: number;
  /** 再生の速さ（1 未満でゆっくり） */
  rate?: number;
  /** 左端を紙色へ溶かす範囲（px。ここから透明→ここで不透明） */
  mask?: [number, number];
  /** 上下の端を紙色へ溶かす範囲（px） */
  maskV?: [number, number];
};

// 生成動画インサート（Seedance 2.5 Flash・480p。机を真上から見た実写風の画。左半分は語のために空けてある）
const P = '244,241,234';
const FILTER = 'brightness(1.36) contrast(0.96) saturate(0.62)';
const VEIL = `linear-gradient(90deg, rgba(${P},0.92) 0%, rgba(${P},0.7) 34%, rgba(${P},0.0) 58%)`;
const C01 = T01.clipEnd + 0.1;
const C04 = T04.clipEnd + 0.1;
const C07 = T07.clipEnd + 0.1;
export const CLIPS: ClipDef[] = [
  {
    // 01: 同じ二冊のノート。片方だけを開いて書き始める手。「能力の差に、見える。」
    id: '01_notebooks', file: 'cut01_notebooks.mp4', start: at('01', 0), end: at('01', C01), from: 0, rate: Math.min(1, 5.85 / C01),
    fadeIn: 0, fadeOut: 0.4, wipeIn: 'none', wipeOut: 'left', veil: VEIL, filter: FILTER, zoom: [0.86, 0.89], shift: 230, mask: [364, 800], maskV: [70, 200],
  },
  {
    // 04: 札の山を、手で手前と奥へ分ける。「自分で、調理する。」
    id: '04_sort', file: 'cut04_sort.mp4', start: at('04', 0), end: at('04', C04), from: 0, rate: Math.min(1, 5.85 / C04),
    fadeIn: 0.4, fadeOut: 0.4, wipeIn: 'up', wipeOut: 'left', veil: VEIL, filter: FILTER, zoom: [1.04, 1.09], mask: [0, 500],
  },
  {
    // 07: 書き込んだノートをめくり、そのまま書き続ける手。「永遠に、学び続ける。」
    id: '07_pages', file: 'cut07_pages.mp4', start: at('07', 0), end: at('07', C07), from: Math.max(0, 5.9 - C07), rate: 1,
    fadeIn: 0.4, fadeOut: 0.4, wipeIn: 'left', wipeOut: 'left', veil: VEIL, filter: FILTER, zoom: [1.12, 1.16], shift: 110, mask: [0, 560],
  },
];

const c = (id: string, dx = 0, dy = 0, z = 16): [number, number, number] => [POS[id][0] + dx, POS[id][1] + dy, z];
// px でカメラの注視点を指定する（カットの枠の px）
const key = (t: number, id: string, px = 960, py = 540, z = 16, e?: (k: number) => number, roll = 0): CamKey => ({
  at: t, p: c(id, wx(px), wy(py), z), t: c(id, wx(px), wy(py), 0), fov: 34, roll, e,
});

const f3 = T03.flip;
export const CAM: CamKey[] = [
  // 01: 前へ出た列に合わせて、机を左へ振る
  key(at('01', 0), '01', 960, 540, 16.4),
  key(at('01', T01.clipEnd), '01', 960, 540, 16),
  key(at('01', T01.act + 0.8), '01', 930, 520, 15.5),
  key(at('01', D['01'] - 0.3), '01', 900, 505, 15.1),
  // 02: 退く句から、着地した「学ぶ。」と三枚の札へ寄る
  key(at('02', 0.3), '02', 960, 540, 16.2, E_WHIP),
  key(at('02', T02.use), '02', 1000, 560, 15.8),
  key(at('02', T02.learn + 1.4), '02', 1060, 600, 15.0),
  key(at('02', D['02'] - 0.3), '02', 1100, 620, 14.4),
  // 03: 「私」の札へ 2 秒のドリーイン → 組み替わる 0.5 秒で引く（先生の札だけがぼける）
  key(at('03', 0.3), '03', 960, 540, 16, E_WHIP),
  key(at('03', f3 - 2.0), '03', 960, 545, 15.7),
  key(at('03', f3), '03', 960, 560, 9.6, (k) => k * k * (3 - 2 * k)),
  key(at('03', f3 + 0.5), '03', 940, 540, 16, E_WHIP),
  key(at('03', D['03'] - 0.3), '03', 900, 535, 15.0),
  // 04: 手前の「使う。」へ寄せ、奥は遅く流す
  key(at('04', 0.3), '04', 960, 540, 16.2, E_WHIP),
  key(at('04', T04.clipEnd), '04', 960, 540, 16),
  key(at('04', T04.not + 1.2), '04', 900, 580, 15.2),
  key(at('04', D['04'] - 0.3), '04', 860, 600, 14.8),
  // 05: 短い塊から、伸びる列の上へ昇り、橙の一節まで戻る
  key(at('05', 0.3), '05', 960, 540, 16.2, E_WHIP),
  key(at('05', T05.level + 0.8), '05', 900, 580, 15.6),
  key(at('05', T05.esc), '05', 960, 560, 16),
  key(at('05', T05.pro + 0.7), '05', 1040, 470, 15.2),
  key(at('05', T05.part + 0.5), '05', 1020, 560, 15.0),
  key(at('05', D['05'] - 0.3), '05', 1040, 580, 14.6),
  // 06: 出ていく札を右へ追い、残った「絶対に、無理。」へ戻す
  key(at('06', 0.3), '06', 960, 540, 16.2, E_WHIP),
  key(at('06', T06.none + 1.2), '06', 1040, 560, 15.6),
  key(at('06', T06.out + 0.5), '06', 940, 540, 15.8),
  key(at('06', T06.never + 0.5), '06', 900, 540, 15.0),
  key(at('06', D['06'] - 0.3), '06', 880, 540, 14.7),
  // 07: 開いた輪の周りを、少し回り込む
  key(at('07', 0.3), '07', 960, 540, 16.2, E_WHIP),
  key(at('07', T07.clipEnd), '07', 960, 540, 16, undefined, 0),
  key(at('07', T07.eat), '07', 1010, 560, 15.3, undefined, -2.5),
  key(at('07', D['07'] - 0.3), '07', 1040, 570, 14.7, undefined, -4.5),
  // 08: 回り込む二枚を追い、結びの塊へ寄せる
  key(at('08', 0.3), '08', 960, 540, 16.2, E_WHIP),
  key(at('08', T08.side), '08', 1000, 560, 15.6),
  key(at('08', T08.all), '08', 1040, 500, 15.4),
  key(at('08', T08.view), '08', 960, 540, 16),
  key(at('08', D['08']), '08', 960, 540, 14.6),
];

// 速い振りの瞬間の短いぼかし（振った方向だけ。図の層にだけ掛ける。白い加算はしない）
const WHIPS: {t: number; dur: number; ax: 'x' | 'y'; amp: number}[] = [
  {t: at('02', 0.0), dur: 0.5, ax: 'x', amp: 22},
  {t: at('03', 0.0), dur: 0.5, ax: 'x', amp: 22},
  {t: at('04', 0.0), dur: 0.5, ax: 'y', amp: 22},
  {t: at('05', 0.0), dur: 0.5, ax: 'x', amp: 22},
  {t: at('06', 0.0), dur: 0.5, ax: 'y', amp: 22},
  {t: at('07', 0.0), dur: 0.5, ax: 'x', amp: 22},
  {t: at('08', 0.0), dur: 0.5, ax: 'y', amp: 22},
];

export function whip(T: number): {n: number; ax: 'x' | 'y'} {
  let n = 0;
  let ax: 'x' | 'y' = 'x';
  for (const w of WHIPS) {
    const k = prog(T, w.t - w.dur / 2, w.t + w.dur / 2);
    if (k > 0 && k < 1) {
      const v = Math.sin(Math.PI * k) * w.amp;
      if (v > n) {
        n = v;
        ax = w.ax;
      }
    }
  }
  return {n, ax};
}

export function clipState(T: number, cl: ClipDef) {
  if (T < cl.start - 0.05 || T > cl.end + 0.05) return null;
  const localT = clamp(T - cl.start, 0, cl.end - cl.start);
  const kIn = cl.fadeIn > 0 ? out3(prog(T, cl.start, cl.start + cl.fadeIn)) : 1;
  const kOut = cl.fadeOut > 0 ? inOut(prog(T, cl.end - cl.fadeOut, cl.end)) : 0;
  return {localT, kIn, kOut, vis: clamp(kIn * (1 - kOut))};
}

// 動画が画面を覆っている度合い（0..1）。図の層はそのあいだ退く
export function cover(T: number) {
  let v = 0;
  for (const cl of CLIPS) {
    const s = clipState(T, cl);
    if (s && !cl.rect) v = Math.max(v, s.vis);
  }
  return v;
}
