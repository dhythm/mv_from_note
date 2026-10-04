// 難所試作の効果音。映像と同じ拍（PB）から作る。音楽はなし。
import { riffleCues, strokeBounds, type Cue } from "../audio/cues";
import { EDITS } from "../stage/edits";
import { PAGES_PER_SEC } from "../story/pages";
import { FLIP_DUR } from "../story/flip";
import { editName } from "./kit";
import { PB, type Beats } from "./proto";

const A = -0.35; // A の手（左寄り）
const B = 0.45; // B の手（右寄り）

export function protoCues(p: Beats = PB, withRoom = true): Cue[] {
  const e12 = EDITS[editName("Q1", "Q2", 12)];
  const e23 = EDITS[editName("Q1", "Q2", 23)];
  const k = (p.lift1[1] - p.lift1[0]) / (PB.lift1[1] - PB.lift1[0]);
  const cues: Cue[] = [
    // C08：B がゆっくり離す（間隔の長い、柔らかいめくり）
    ...riffleCues(p.slowStart, 9, 11, p.slowPps, p.slowDur, 0.22, B),
    { k: "rustle", t0: p.lift1[0], t1: p.lift1[1] + 0.1, amp: 0.09, pan: B },
    { k: "flip", t: p.lower1[0], dur: 0.45, amp: 0.12, pan: B },
    { k: "rustle", t0: p.lift2[0], t1: p.lift2[1] + 0.1, amp: 0.09, pan: B },
    { k: "breath", t: p.lift2[1], dur: 1.1 * k, amp: 0.035, inhale: true },
    // C09：紙を押さえる、指でなぞる（音を立てない）、A の手が止まる、A がめくって確かめる
    { k: "flip", t: p.pressFlat[0], dur: 0.6, amp: 0.1, pan: B },
    { k: "tap", t: p.pressFlat[1], amp: 0.05, pan: B },
    { k: "cloth", t0: p.aReach[0], t1: p.aReach[1], amp: 0.03, pan: A },
    { k: "breath", t: p.aStop[0], dur: 1.0, amp: 0.04, inhale: false },
    { k: "rustle", t0: p.aLift[0], t1: p.aLift[1], amp: 0.1, pan: A },
    { k: "flip", t: p.aLower[0], dur: 0.35, amp: 0.12, pan: A },
    { k: "flip", t: p.aTurn[0], dur: 0.6, amp: 0.16, pan: A },
    // C10：消しゴム → 置く → 鉛筆を取る → 描く
    { k: "cloth", t0: p.fetch[0], t1: p.fetch[1], amp: 0.03, pan: A },
    { k: "rubber", t: p.fetch[1] - 0.05, amp: 0.12, pan: -0.6 },
    { k: "tap", t: p.c10 + 0.45 * k, amp: 0.05, pan: B },
    { k: "erase", t0: p.erase12[0], t1: p.erase12[1], rubs: Math.max(3, Math.round(e12.erasePath.length / 2)), amp: 0.16, pan: A },
    { k: "rubber", t: p.putEraser[1] - 0.1, amp: 0.12, pan: -0.6 },
    { k: "wood", t: p.takePencil[1] - 0.05, amp: 0.1, pan: A },
    { k: "pencil", t0: p.draw12[0], t1: p.draw12[1], strokes: strokeBounds(e12.drawPath), amp: 0.13, pan: A },
    // 時間を飛ばした後：最後のページの描き終わり
    { k: "pencil", t0: p.draw23[0], t1: p.draw23[1], strokes: strokeBounds(e23.drawPath).filter((x) => x >= 0.55).map((x) => (x - 0.55) / 0.45), amp: 0.13, pan: A },
    // C11：鉛筆を置く、束を戻す、通して再生
    { k: "wood", t: p.putPencil[1] - 0.05, amp: 0.12, pan: A },
    { k: "rustle", t0: p.gather[0], t1: p.gather[1], amp: 0.14, pan: A },
    { k: "flip", t: p.gather[1] - 0.15, dur: 0.2, amp: 0.15, pan: A },
    ...riffleCues(p.replay, 0, 23, PAGES_PER_SEC, FLIP_DUR, 0.12, 0.1),
  ];
  return withRoom ? [{ k: "room", t0: 0, t1: p.end, amp: 0.006 }, ...cues] : cues;
}
