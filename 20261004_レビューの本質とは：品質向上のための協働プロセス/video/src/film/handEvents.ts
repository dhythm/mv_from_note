// 手の出入りと差し替えの検査（人物・左右ごとに一つ、画面の途中に湧かない、差し替えで飛ばない）
import { ARM, apply } from "../stage/arm";
import { cameraTransform } from "../stage/Stage";
import type { HandId, HandState, StageState } from "../stage/types";
import type { Pt } from "../lib/track";

export type Side = "A-left" | "A-right" | "B-right" | "B-left";

export const SIDE: Record<HandId, Side> = {
  aL: "A-left",
  aLrest: "A-left",
  aR: "A-right",
  aRcurl: "A-right",
  aRpinch: "A-right",
  aRwrite: "A-right",
  bRrest: "B-right",
  bRpoint: "B-right",
  bLsupport: "B-left",
};

/** 手の目印の、いま画面に置かれている位置（机の座標） */
export function handPoint(h: HandState): Pt {
  const tip = ARM[h.id].tip;
  if (h.matrix) return apply(h.matrix, tip);
  return [tip[0] + h.dx, tip[1] + h.dy];
}

/** カメラに映る机の範囲 */
export function viewport(s: StageState): { x0: number; y0: number; x1: number; y1: number } {
  const { s: k, tx, ty } = cameraTransform(s.camera);
  return { x0: -tx / k, y0: -ty / k, x1: (1920 - tx) / k, y1: (1080 - ty) / k };
}

export type HandEvent =
  | { t: number; kind: "enter" | "exit"; side: Side; id: HandId; inside: number }
  | { t: number; kind: "swap"; side: Side; from: HandId; to: HandId; jump: number };

/** 目印が画面の内側にどれだけ入っているか（負なら外） */
function insideBy(p: Pt, v: ReturnType<typeof viewport>): number {
  return Math.min(p[0] - v.x0, v.x1 - p[0], p[1] - v.y0, v.y1 - p[1]);
}

export function handEvents(states: { t: number; s: StageState }[]): { events: HandEvent[]; duplicates: { t: number; side: Side }[] } {
  const events: HandEvent[] = [];
  const duplicates: { t: number; side: Side }[] = [];
  let prev: { s: StageState; bySide: Map<Side, HandState> } | null = null;
  for (const { t, s } of states) {
    const bySide = new Map<Side, HandState>();
    for (const h of s.hands) {
      const side = SIDE[h.id];
      if (bySide.has(side)) duplicates.push({ t, side });
      bySide.set(side, h);
    }
    const sameShot = prev && JSON.stringify(prev.s.camera) === JSON.stringify(s.camera);
    if (prev && sameShot) {
      const v = viewport(s);
      for (const [side, h] of bySide) {
        const before = prev.bySide.get(side);
        if (!before) events.push({ t, kind: "enter", side, id: h.id, inside: insideBy(handPoint(h), v) });
        else if (before.id !== h.id) {
          const a = handPoint(before);
          const b = handPoint(h);
          events.push({ t, kind: "swap", side, from: before.id, to: h.id, jump: Math.hypot(a[0] - b[0], a[1] - b[1]) });
        }
      }
      for (const [side, h] of prev.bySide) {
        if (!bySide.has(side)) events.push({ t, kind: "exit", side, id: h.id, inside: insideBy(handPoint(h), viewport(prev.s)) });
      }
    }
    prev = { s, bySide };
  }
  return { events, duplicates };
}
