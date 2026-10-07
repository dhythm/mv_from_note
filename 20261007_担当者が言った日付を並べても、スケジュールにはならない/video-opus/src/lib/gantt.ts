import {COLORS, unitX, ZONE} from './theme';

// schedule-model.json（説明用の時間位置。実測値ではない）
export const MODEL = {
  now: 4,
  deadline: 7,
  completed: [0, 4] as const,
  originalRemaining: [4, 6] as const,
  additional: [4, 6] as const,
  replannedRemaining: [6, 8] as const,
  downstream: [8, 10] as const,
};

export const BAR_H = 46;
export const ROW_GAP = 70;

// 行Y（基準。場面で平行移動・回転する）
export const rowY = (i: number) => ZONE.y0 + 60 + i * ROW_GAP;

export type Rect = {x: number; y: number; w: number; h: number};
export const unitRect = (u0: number, u1: number, row: number): Rect => ({
  x: unitX(u0),
  y: rowY(row),
  w: unitX(u1) - unitX(u0),
  h: BAR_H,
});

export const C = COLORS;
