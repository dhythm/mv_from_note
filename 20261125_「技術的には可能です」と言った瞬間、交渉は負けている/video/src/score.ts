// 全体の設計図: 各カットの世界原点・カメラキー・速い振り・生成動画インサートの区間。
// すべて時刻 T から決まる純関数。
import type {CamKey} from './cam';
import {E_WHIP, H, W, clamp, inOut, out3, prog} from './kit';
import {T03, T05, T06, T07} from './figs';
import {at, D, vt} from './timeline';

// 画面 px → 世界座標（距離 16・fov 34° の平面。1080px = 9.79 単位）
export const WORLD_H = 2 * 16 * Math.tan((34 * Math.PI) / 360);
export const PX = WORLD_H / H;
export const wx = (px: number) => (px - W / 2) * PX;
export const wy = (py: number) => (H / 2 - py) * PX;

// 各カットの世界原点（離して置き、他のカットの図が映り込まないようにする）
const S03 = T03.shift * PX;
export const POS: Record<string, [number, number]> = {
  '01': [0, 0],
  '02': [44, 0],
  '03': [88, 0],
  '04': [88 + S03, -28],
  '05': [132 + S03, -28],
  '06': [132 + S03, -56],
  '07': [176 + S03, -56],
  '08': [176 + S03, -28],
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
};

// 生成動画インサート（Seedance 2.5 Flash・480p。机を真上から見た実写風の画。左半分は語のために空けてある）
const P = '247,244,238';
const FILTER = 'brightness(1.21) contrast(0.95) saturate(0.82)';
const VEIL = `linear-gradient(90deg, rgba(${P},0.86) 0%, rgba(${P},0.62) 34%, rgba(${P},0.0) 58%)`;
export const CLIP08 = D['08'] - 7.0;
export const CLIPS: ClipDef[] = [
  {
    // 01: 一枚の札を、相手の側へ滑らせる。「技術的には可能です」→「カードを渡す。」
    id: '01_slide', file: 'cut01_slide.mp4', start: at('01', 0), end: at('01', vt('01', 'たいてい') - 0.2), from: 0.35,
    fadeIn: 0, fadeOut: 0.4, wipeIn: 'none', wipeOut: 'left', veil: VEIL, filter: FILTER, zoom: [1.12, 1.16], shift: 100,
  },
  {
    // 05: 理由の札を、先に二枚置く。「理由を、先に。」
    id: '05_reasons', file: 'cut05_reasons.mp4', start: at('05', T05.c0 + 0.1), end: at('05', T05.s0 + 0.1), from: 0.2,
    fadeIn: 0.4, fadeOut: 0.4, wipeIn: 'left', wipeOut: 'right', veil: VEIL, filter: FILTER, zoom: [1.0, 1.04],
  },
  {
    // 07: 三枚のうち一枚を、半分だけ前へ出す。「必ず、選ばれうる。」
    id: '07_half', file: 'cut07_half.mp4', start: at('07', T07.c0 + 0.2), end: at('07', T07.c0 + 7.2), from: 0,
    fadeIn: 0.4, fadeOut: 0.35, wipeIn: 'left', wipeOut: 'left', veil: VEIL, filter: FILTER, zoom: [1.12, 1.16], shift: 100,
  },
  {
    // 08: 言いそうな札を引き、白い札とペンを置く。「たぶん、別の言葉。」
    id: '08_blank', file: 'cut08_blank.mp4', start: at('08', CLIP08), end: at('08', D['08']), from: 0,
    fadeIn: 0.4, fadeOut: 0, wipeIn: 'left', wipeOut: 'none', veil: VEIL, filter: FILTER, zoom: [1.0, 1.05],
  },
];

const c = (id: string, dx = 0, dy = 0, z = 16): [number, number, number] => [POS[id][0] + dx, POS[id][1] + dy, z];
// px でカメラの注視点を指定する（カットの枠の px）
const key = (t: number, id: string, px = 960, py = 540, z = 16, e?: (k: number) => number, roll = 0): CamKey => ({
  at: t, p: c(id, wx(px), wy(py), z), t: c(id, wx(px), wy(py), 0), fov: 34, roll, e,
});

const f3 = T03.flip;
export const CAM: CamKey[] = [
  // 01: 札が滑る方へ、図の層を少し右へ振る
  key(at('01', 0), '01', 900, 540, 16.6),
  key(at('01', 5.0), '01', 990, 540, 15.8),
  key(at('01', D['01'] - 0.3), '01', 1040, 520, 15.2),
  // 02: 棚に沿って横へ。奥の棚は遅れて見える
  key(at('02', 0.3), '02', 860, 540, 16.4, E_WHIP),
  key(at('02', 5.0), '02', 1010, 540, 15.6),
  key(at('02', 14.4), '02', 930, 550, 16.2),
  key(at('02', D['02'] - 0.3), '02', 1030, 530, 15.4),
  // 03: 札へ 2 秒のドリーイン → 0.4 秒のホイップパンで相手の側へ
  key(at('03', 0.3), '03', 960, 540, 16, E_WHIP),
  key(at('03', f3 - 2.0), '03', 990, 560, 15.6),
  key(at('03', f3), '03', 1100, 640, 10.4, (k) => k * k * (3 - 2 * k)),
  key(at('03', f3 + 0.4), '03', 960 + T03.shift, 540, 16, E_WHIP),
  key(at('03', D['03'] - 0.3), '03', 1010 + T03.shift, 550, 15.2),
  // 04: 崩れる束から、滑る札へ
  key(at('04', 0.3), '04', 1000, 560, 16.4, E_WHIP),
  key(at('04', 4.2), '04', 1040, 500, 15.8),
  key(at('04', 11.4), '04', 980, 560, 15.6),
  key(at('04', 15.9), '04', 1050, 520, 15.2),
  key(at('04', D['04'] - 0.3), '04', 1010, 540, 15.6),
  // 05: 手前に出た理由の札へ、少し寄る
  key(at('05', 0.3), '05', 940, 540, 16.2, E_WHIP),
  key(at('05', 9.5), '05', 1000, 540, 15.6),
  key(at('05', 14.4), '05', 1020, 560, 15.0),
  key(at('05', D['05'] - 0.3), '05', 1080, 550, 14.6),
  // 06: 届かない印へ寄ってから、戻りで引く
  key(at('06', 0.3), '06', 960, 540, 16.4, E_WHIP),
  key(at('06', T06.b0), '06', 1010, 540, 15.8),
  key(at('06', T06.b0 + 0.9), '06', 960, 540, 16.6),
  key(at('06', T06.late + 1.6), '06', 1070, 565, 14.8),
  key(at('06', T06.more + 1.6), '06', 1010, 565, 15.4),
  key(at('06', T06.hand + 1.2), '06', 1060, 565, 14.9),
  key(at('06', T06.e0 + 0.7), '06', 960, 540, 16.4),
  key(at('06', D['06'] - 0.3), '06', 1020, 560, 15.4),
  // 07: 半分出た札へパンし、手元の残りへ戻す
  key(at('07', 0.3), '07', 900, 540, 16.2, E_WHIP),
  key(at('07', 4.4), '07', 1000, 560, 15.6),
  key(at('07', 8.4), '07', 960, 560, 16.2),
  key(at('07', 11.2), '07', 1060, 520, 15.2),
  key(at('07', D['07'] - 0.3), '07', 1000, 550, 15.6),
  // 08: 結びの塊へ寄せる
  key(at('08', 0.3), '08', 1000, 540, 16.2, E_WHIP),
  key(at('08', 6.3), '08', 1060, 560, 15.4),
  key(at('08', 11.0), '08', 960, 540, 16.2),
  key(at('08', D['08']), '08', 1010, 600, 14.8),
];

// 速い振りの瞬間の短いぼかし（振った方向だけ。図の層にだけ掛ける。白い加算はしない）
const WHIPS: {t: number; dur: number; ax: 'x' | 'y'; amp: number}[] = [
  {t: at('02', 0.0), dur: 0.5, ax: 'x', amp: 22},
  {t: at('03', 0.0), dur: 0.5, ax: 'x', amp: 22},
  {t: at('03', f3 + 0.2), dur: 0.4, ax: 'x', amp: 30},
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
