// 効果音の指示（秒）。映像のカットと同じ拍の表から作り、scripts/compose-sfx.ts が合成する。
// pan: -1 = 左（A の手）… +1 = 右（B の手）

export type Cue =
  | { k: "flip"; t: number; dur: number; amp: number; pan: number }
  | { k: "rustle"; t0: number; t1: number; amp: number; pan: number }
  | { k: "tap"; t: number; amp: number; pan: number }
  | { k: "pencil"; t0: number; t1: number; strokes: number[]; amp: number; pan: number }
  | { k: "erase"; t0: number; t1: number; rubs: number; amp: number; pan: number }
  | { k: "wood"; t: number; amp: number; pan: number }
  | { k: "rubber"; t: number; amp: number; pan: number }
  | { k: "breath"; t: number; dur: number; amp: number; inhale: boolean }
  | { k: "cloth"; t0: number; t1: number; amp: number; pan: number }
  | { k: "stamp"; t: number; amp: number }
  | { k: "creak"; t: number; dur: number; amp: number }
  | { k: "tick"; t: number; amp: number }
  | { k: "room"; t0: number; t1: number; amp: number };

/** 一定の速さでめくる音（映像の riffle と同じ式） */
export function riffleCues(start: number, from: number, to: number, pps: number, dur: number, amp: number, pan: number): Cue[] {
  const out: Cue[] = [];
  for (let i = from; i < to; i++) {
    const t = start + (i - from) / pps;
    out.push({ k: "flip", t, dur: Math.min(0.5, Math.max(0.05, dur * 0.6)), amp: amp * (0.85 + 0.3 * (((i * 7919) % 13) / 13)), pan });
  }
  return out;
}

/** 折れ線の各線分を一画として、その境目（0..1 の長さ比）を返す */
export function strokeBounds(path: [number, number][]): number[] {
  const lens: number[] = [];
  for (let i = 1; i < path.length; i++) lens.push(Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]));
  const total = lens.reduce((a, b) => a + b, 0) || 1;
  const out = [0];
  let acc = 0;
  for (const l of lens) {
    acc += l;
    out.push(acc / total);
  }
  return out;
}
