// 全体の設計図: 各カットの世界原点・カメラキー・速い振り・Seedance 2.5 Flash 動画インサートの区間。
// すべて時刻 T から決まる純関数。
import type {CamKey} from './cam';
import {E_WHIP, H, W, clamp, inOut, out3, prog} from './kit';
import {at, D} from './timeline';

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
  '04': [88, -26],
  '05': [132, -26],
  '05b': [152, -26], // 95 と 98 が並ぶ面（ホイップパンの先）
  '06': [196, -26],
  '07': [196, 4],
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
};

const P = '247,244,238';
const FILTER = 'brightness(1.10) contrast(0.97) saturate(0.92)';

export const CLIPS: ClipDef[] = [
  {
    // 01: 突き返される資料。「100%じゃないと、使えない。」
    id: '01_report', file: 'cut01_report.mp4', start: at('01', 0), end: at('01', 5.0), from: 0.3,
    fadeIn: 0, fadeOut: 0.4, wipeIn: 'none', wipeOut: 'left',
    veil: `linear-gradient(165deg, rgba(${P},0.80) 0%, rgba(${P},0.55) 36%, rgba(${P},0.05) 66%)`,
    filter: FILTER, zoom: [1.0, 1.06],
  },
  {
    // 02: 黒いビー玉の中の、一つだけ透明な玉へ寄る。「100%には、ならない。」
    id: '02_marbles', file: 'cut02_marbles.mp4', start: at('02', 18.5), end: at('02', D['02']), from: 0,
    fadeIn: 0.4, fadeOut: 0.3, wipeIn: 'left', wipeOut: 'left',
    veil: `linear-gradient(20deg, rgba(${P},0.74) 0%, rgba(${P},0.42) 30%, rgba(${P},0.0) 52%)`,
    filter: FILTER, zoom: [1.0, 1.04],
  },
  {
    // 03: 四角い穴を通る同じ駒と、通れない形。下の窓に置き、語は上の紙に組む
    id: '03_sorter', file: 'cut03_sorter.mp4', start: at('03', 5.6), end: at('03', 11.3), from: 0.2,
    fadeIn: 0.4, fadeOut: 0.4, wipeIn: 'up', wipeOut: 'right',
    rect: [0, 420, 1920, 660], objPos: '50% 100%',
    filter: FILTER, zoom: [1.0, 1.03],
  },
  {
    // 04: 定まらない針。「なんとなくは、危険。」
    id: '04_needle', file: 'cut04_needle.mp4', start: at('04', 8.0), end: at('04', 12.5), from: 0.6,
    fadeIn: 0.4, fadeOut: 0.4, wipeIn: 'left', wipeOut: 'right',
    veil: `linear-gradient(90deg, rgba(${P},0.90) 0%, rgba(${P},0.74) 34%, rgba(${P},0.0) 56%)`,
    filter: FILTER, zoom: [1.02, 1.08],
  },
  {
    // 05: 二人が別の位置に印を置き、あいだが赤く光る
    id: '05_gap', file: 'cut05_gap.mp4', start: at('05', 4.3), end: at('05', 10.25), from: 0,
    fadeIn: 0.4, fadeOut: 0.4, wipeIn: 'left', wipeOut: 'left',
    veil: `linear-gradient(180deg, rgba(${P},0.62) 0%, rgba(${P},0.0) 30%, rgba(${P},0.0) 72%, rgba(${P},0.55) 100%)`,
    filter: 'brightness(1.06) contrast(0.98) saturate(1.0)', zoom: [1.0, 1.05],
  },
  {
    // 06: 線は円の手前で止まる。「100%は、約束しない。」
    id: '06_line', file: 'cut06_line.mp4', start: at('06', 0), end: at('06', 4.6), from: 1.4,
    fadeIn: 0, fadeOut: 0.4, wipeIn: 'none', wipeOut: 'left',
    veil: `linear-gradient(0deg, rgba(${P},0.86) 0%, rgba(${P},0.6) 20%, rgba(${P},0.0) 40%)`,
    filter: FILTER, zoom: [1.0, 1.04],
  },
  {
    // 07: 二人で一本の青い線を貼る。「一緒に、決める。」
    id: '07_together', file: 'cut07_together.mp4', start: at('07', 7.55), end: at('07', D['07']), from: 0,
    fadeIn: 0.4, fadeOut: 0, wipeIn: 'left', wipeOut: 'none',
    veil: `linear-gradient(0deg, rgba(${P},0.78) 0%, rgba(${P},0.5) 22%, rgba(${P},0.0) 40%)`,
    filter: FILTER, zoom: [1.0, 1.05],
  },
];

// 02 の空の点（1000個の面での位置。world.tsx と共有）
export const E3: [number, number] = [wx(220 + 33 * 30.2), wy(110 + 8 * 30)];

const c = (id: string, dx = 0, dy = 0, z = 16): [number, number, number] => [POS[id][0] + dx, POS[id][1] + dy, z];
const key = (t: number, id: string, dx = 0, dy = 0, z = 16, e?: (k: number) => number, roll = 0): CamKey => ({
  at: t, p: c(id, dx, dy, z), t: c(id, dx, dy, 0), fov: 34, roll, e,
});

export const CAM: CamKey[] = [
  // 01: 問いの塊へ、図の層をゆっくり寄る
  key(at('01', 0), '01'),
  key(at('01', 5.0), '01'),
  key(at('01', D['01'] - 0.3), '01', 0.5, -0.3, 14.4),
  // 02: 10 → 100 → 1000。1000 になってから空の点へドリーイン
  key(at('02', 0.3), '02', 0, 0, 16, E_WHIP),
  key(at('02', 7.6), '02', 0.4, 0, 15.6),
  key(at('02', 8.6), '02', 0, 0, 16.4, out3),
  key(at('02', 12.4), '02', -0.3, 0, 16),
  key(at('02', 13.5), '02', 0, 0, 16.6, out3),
  key(at('02', 18.7), '02', E3[0] * 0.62, E3[1] * 0.62, 7.6, inOut),
  // 03: 門の中から、外に残る語の方へパン
  key(at('03', 0.3), '03', -0.6, 0, 16, E_WHIP),
  key(at('03', 5.6), '03', 0.3, 0, 15.4),
  key(at('03', 11.3), '03', 0.2, 0, 16.4),
  key(at('03', D['03'] - 0.3), '03', 1.0, 0, 15.6),
  // 04: 目盛りに沿って小さくパン
  key(at('04', 0.3), '04', -0.8, 0, 16, E_WHIP),
  key(at('04', 8.0), '04', 0.5, 0, 15.2),
  key(at('04', 12.5), '04', -0.4, 0, 16),
  key(at('04', D['04'] - 0.3), '04', 0.9, 0, 15.2),
  // 05: 一つの目盛り → ホイップパンで二つの印が並ぶ面へ
  key(at('05', 0.3), '05', 0, 0, 16, E_WHIP),
  key(at('05', 4.3), '05', 0.6, 0, 15.2),
  key(at('05', 9.95), '05', 0.6, 0, 15.2),
  key(at('05', 10.5), '05b', 0, 0, 16, E_WHIP),
  key(at('05', D['05'] - 0.3), '05b', 0, 0.1, 14.8),
  // 06: 線の切れた端から、開いた円の方へ少しパンして戻す
  key(at('06', 0.3), '06', 0, 0, 16, E_WHIP),
  key(at('06', 4.6), '06', -0.4, 0, 16),
  key(at('06', 8.0), '06', 1.0, 0, 15.2),
  key(at('06', D['06'] - 0.3), '06', 0.1, 0, 15.8),
  // 07: 三つの言い方から引き、結びへ寄る
  key(at('07', 0.3), '07', 0, 0, 15, E_WHIP),
  key(at('07', 3.4), '07', 0, 0, 17),
  key(at('07', 7.5), '07', 0, 0, 15.4),
  key(at('07', D['07']), '07', 0, 0, 15),
];

// 速い振り・ワイプの瞬間の短いぼかし（振った方向だけ）
const WHIPS: {t: number; dur: number; ax: 'x' | 'y'; amp: number}[] = [
  {t: at('01', 4.8), dur: 0.4, ax: 'x', amp: 16},
  {t: at('02', 0.05), dur: 0.5, ax: 'x', amp: 22},
  {t: at('02', 18.7), dur: 0.4, ax: 'x', amp: 14},
  {t: at('03', 0.0), dur: 0.5, ax: 'x', amp: 22},
  {t: at('03', 11.1), dur: 0.36, ax: 'x', amp: 12},
  {t: at('04', 0.05), dur: 0.5, ax: 'y', amp: 22},
  {t: at('04', 8.2), dur: 0.36, ax: 'x', amp: 12},
  {t: at('04', 12.3), dur: 0.36, ax: 'x', amp: 12},
  {t: at('05', 0.05), dur: 0.5, ax: 'x', amp: 22},
  {t: at('05', 4.5), dur: 0.36, ax: 'x', amp: 12},
  {t: at('05', 10.2), dur: 0.56, ax: 'x', amp: 26},
  {t: at('06', 0.0), dur: 0.5, ax: 'x', amp: 22},
  {t: at('06', 4.4), dur: 0.36, ax: 'x', amp: 12},
  {t: at('07', 0.05), dur: 0.5, ax: 'y', amp: 22},
  {t: at('07', 7.75), dur: 0.36, ax: 'x', amp: 12},
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

export function clipState(T: number, c: ClipDef) {
  if (T < c.start - 0.05 || T > c.end + 0.05) return null;
  const localT = clamp(T - c.start, 0, c.end - c.start);
  const kIn = c.fadeIn > 0 ? out3(prog(T, c.start, c.start + c.fadeIn)) : 1;
  const kOut = c.fadeOut > 0 ? inOut(prog(T, c.end - c.fadeOut, c.end)) : 0;
  return {localT, kIn, kOut, vis: clamp(kIn * (1 - kOut))};
}

// 動画が画面を覆っている度合い（0..1）。図の層はそのあいだ退く
export function cover(T: number) {
  let v = 0;
  for (const c of CLIPS) {
    const s = clipState(T, c);
    if (s) v = Math.max(v, s.vis);
  }
  return v;
}
