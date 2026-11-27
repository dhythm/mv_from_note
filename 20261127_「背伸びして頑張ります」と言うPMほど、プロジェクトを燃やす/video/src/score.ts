// 全体の設計図: 各カットの世界原点・カメラキー・速い振り・生成動画インサートの区間。
// すべて時刻 T から決まる純関数。カメラは図の層だけに掛ける（文字は正面のまま）。
import type {CamKey} from './cam';
import {E_WHIP, H, W, clamp, inOut, out3, prog} from './kit';
import {T01, T02, T03, T04, T05, T06, T07, T08} from './figs';
import {at, D} from './timeline';

// 画面 px → 世界座標（距離 16・fov 34° の平面。1080px = 9.79 単位）
export const WORLD_H = 2 * 16 * Math.tan((34 * Math.PI) / 360);
export const PX = WORLD_H / H;
export const wx = (px: number) => (px - W / 2) * PX;
export const wy = (py: number) => (H / 2 - py) * PX;

// 各カットの世界原点（離して置き、ほかのカットの図が映り込まないようにする）
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
  from?: number;
  fadeIn: number;
  fadeOut: number;
  wipeIn?: 'none' | 'left' | 'up';
  wipeOut?: 'none' | 'left' | 'right';
  rect?: [number, number, number, number];
  objPos?: string;
  veil?: string;
  filter?: string;
  zoom?: [number, number];
  shift?: number;
  rate?: number;
  mask?: [number, number];
  maskV?: [number, number];
};

// 生成動画インサート（Seedance 2.5 Flash・480p。机を真上から見た実写風の画。左半分は語のために空けてある）
const P = '247,244,238';
const VEIL = `linear-gradient(90deg, rgba(${P},0.93) 0%, rgba(${P},0.72) 36%, rgba(${P},0.0) 60%)`;
const VEIL_NIGHT = 'linear-gradient(90deg, rgba(20,18,16,0.80) 0%, rgba(20,18,16,0.55) 38%, rgba(20,18,16,0.0) 62%)';
const c03 = {s: at('03', T03.ins0), e: at('03', T03.ins1)};
const c04 = {s: at('04', T04.ins0), e: at('04', T04.ins1)};
export const CLIPS: ClipDef[] = [
  {
    // 03: 卒業論文を書く手。日めくりを一枚ちぎって、また書く。「1994年」「卒業論文を書く学生37人」
    id: '03_thesis', file: 'cut03_thesis.mp4', start: c03.s, end: c03.e, from: 0, rate: Math.min(1, 5.9 / (c03.e - c03.s)),
    fadeIn: 0.35, fadeOut: 0.35, wipeIn: 'left', wipeOut: 'left', veil: VEIL, filter: 'brightness(1.12) contrast(0.97) saturate(0.8)', zoom: [1.04, 1.1], shift: 120,
  },
  {
    // 04: 夜の机で打ち続ける手。「休日も、無理なペースも、払うのは現場。」
    id: '04_night', file: 'cut04_night.mp4', start: c04.s, end: c04.e, from: 0, rate: Math.min(1, 5.9 / (c04.e - c04.s)),
    fadeIn: 0.3, fadeOut: 0.4, wipeIn: 'up', wipeOut: 'left', veil: VEIL_NIGHT, filter: 'brightness(0.95) contrast(1.05) saturate(0.85)', zoom: [1.06, 1.14], shift: 160,
  },
];
// 夜のインサートの上では、語を明るい色で出す
export function nightOn(T: number) {
  const cl = CLIPS[1];
  return T > cl.start + 0.15 && T < cl.end - 0.2;
}

const c = (id: string, dx = 0, dy = 0, z = 16): [number, number, number] => [POS[id][0] + dx, POS[id][1] + dy, z];
const key = (t: number, id: string, px = 960, py = 540, z = 16, e?: (k: number) => number, roll = 0): CamKey => ({
  at: t, p: c(id, wx(px), wy(py), z), t: c(id, wx(px), wy(py), 0), fov: 34, roll, e,
});

export const CAM: CamKey[] = [
  // 寄るときは注視点を中央より左に置き、右の図が左の語へ近づかないようにする
  // 01: 傾いた柱に合わせて、机を少し左へ振る（パン）
  key(at('01', 0), '01', 1000, 540, 16.6),
  key(at('01', T01.view), '01', 960, 540, 16),
  key(at('01', T01.gamble + 1.2), '01', 930, 470, 15.2, undefined, -1.5),
  key(at('01', T01.small), '01', 900, 520, 15.6, undefined, -0.5),
  key(at('01', D['01'] - 0.3), '01', 880, 540, 15.1, undefined, 0.8),
  // 02: 伸びた柱から、着地した高さへ寄る
  key(at('02', 0.3), '02', 960, 540, 16.4, E_WHIP),
  key(at('02', T02.up + 0.8), '02', 940, 420, 15.4, undefined, 1.5),
  key(at('02', T02.mgmt + 0.8), '02', 920, 600, 14.9),
  key(at('02', D['02'] - 0.3), '02', 900, 640, 14.4),
  // 03: 計画錯誤 → インサート → 二本の差へ寄る（ドリーイン、約 2 秒）
  key(at('03', 0.3), '03', 960, 540, 16.4, E_WHIP),
  key(at('03', T03.ins0), '03', 960, 540, 16),
  key(at('03', T03.ji), '03', 1000, 560, 15.6),
  key(at('03', T03.jiNum + 1.2), '03', 1340, 600, 12.2),
  key(at('03', T03.until), '03', 1170, 570, 14.4),
  key(at('03', D['03'] - 0.3), '03', 1130, 560, 15.0),
  // 04: 倒れていく列に沿って図の層を送る（トラッキング）
  key(at('04', 0.3), '04', 960, 540, 16.4, E_WHIP),
  key(at('04', T04.one), '04', 960, 560, 15.6),
  key(at('04', T04.one + 2.2), '04', 1080, 520, 14.6),
  key(at('04', T04.ins0), '04', 960, 560, 15.4),
  key(at('04', T04.ins1), '04', 940, 580, 15.8),
  key(at('04', D['04'] - 0.3), '04', 930, 600, 15.0),
  // 05: 大きな夢から、着地の列へ
  key(at('05', 0.3), '05', 960, 540, 16.4, E_WHIP),
  key(at('05', T05.dream + 1.0), '05', 1080, 520, 14.6),
  key(at('05', T05.land + 0.8), '05', 940, 600, 15.6),
  key(at('05', T05.talk + 1.2), '05', 960, 560, 15.0, undefined, -1),
  key(at('05', T05.three + 0.6), '05', 1000, 640, 14.6),
  key(at('05', D['05'] - 0.3), '05', 960, 620, 14.2, undefined, 1),
  // 06: 列に沿って右へ送る
  key(at('06', 0.3), '06', 900, 560, 16.4, E_WHIP),
  key(at('06', T06.three + 0.6), '06', 860, 600, 15.6),
  key(at('06', T06.nine + 0.6), '06', 1000, 640, 15.0),
  key(at('06', T06.big + 0.6), '06', 940, 520, 16.2),
  key(at('06', T06.order + 1.6), '06', 1100, 640, 14.8),
  key(at('06', D['06'] - 0.3), '06', 1160, 650, 14.4),
  // 07: 割れた二つの面を、図の層だけ左右へ開く
  key(at('07', 0.3), '07', 960, 540, 16.4, E_WHIP),
  key(at('07', T07.rev + 0.8), '07', 940, 600, 15.2),
  key(at('07', T07.round + 0.6), '07', 960, 660, 14.6),
  key(at('07', T07.view + 1.2), '07', 920, 600, 15.4, undefined, -1.2),
  key(at('07', T07.kata), '07', 900, 580, 15.8, undefined, 1.2),
  key(at('07', D['07'] - 0.3), '07', 900, 600, 15.0),
  // 08: 結びは文字の塊へ寄せてから、ロゴへ横振り
  key(at('08', 0.3), '08', 960, 540, 16.4, E_WHIP),
  key(at('08', T08.whom + 0.8), '08', 920, 600, 15.4, undefined, -1),
  key(at('08', T08.view + 0.6), '08', 900, 620, 15.2),
  key(at('08', D['08']), '08', 880, 630, 14.6),
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
