// 全編の効果音。映像と同じ拍（FB / SEG）から作る。音楽はなし。
// 押印の一音は短く抑え、後半の紙・芯・息が残るように音量を決める（plan.md 第8節）。
import { riffleCues, strokeBounds, type Cue } from "../audio/cues";
import { editName } from "../cuts/kit";
import { protoCues } from "../cuts/protoCues";
import { EDITS } from "../stage/edits";
import { SKETCHES } from "../stage/sketches";
import { FLIP_DUR } from "../story/flip";
import { PAGES_PER_SEC } from "../story/pages";
import { CUT, FB, FILM_TOTAL, MAIN, SEG, TITLE } from "./beats";

export const FILM_SECONDS = FILM_TOTAL;

const A = -0.35;
const B = 0.4;
const BTOP = 0.15; // 向かい側の B（やや奥）

/** 通しの再生。受け渡しが成立する版だけ、カップが手に収まる小さな音を置く */
function replay(start: number, pan: number, amp: number, tick: number): Cue[] {
  const c = riffleCues(start, 0, 23, PAGES_PER_SEC, FLIP_DUR, amp, pan);
  if (tick > 0) c.push({ k: "tick", t: start + 15 / PAGES_PER_SEC + 0.03, amp: tick });
  return c;
}

function pencil(t0: number, t1: number, edit: string, from = 0): Cue {
  const st = strokeBounds(EDITS[edit].drawPath).filter((x) => x >= from).map((x) => (x - from) / (1 - from));
  return { k: "pencil", t0, t1, strokes: st.length > 1 ? st : [0, 1], amp: 0.13, pan: A };
}

function mainCues(): Cue[] {
  const b = FB;
  const e9 = editName("Q0", "Q1", 9);
  const e11 = editName("Q0", "Q1", 11);
  const e16 = editName("Q2", "Q3", 16);
  const e14 = editName("Q2", "Q3", 14);
  return [
    // C01 内側：止まった絵、親指の下で紙が鳴る → めくる → 止まる → もう一度
    { k: "rustle", t0: 1.2, t1: 2.8, amp: 0.035, pan: A },
    ...riffleCues(b.riffleA, 0, 9, PAGES_PER_SEC, FLIP_DUR, 0.12, -0.1),
    { k: "rustle", t0: b.gatherA[0], t1: b.gatherA[1], amp: 0.1, pan: A },
    ...riffleCues(b.riffleB, 0, 9, PAGES_PER_SEC, FLIP_DUR, 0.12, -0.1),
    // C02 自分で見つけて直す（消す・描く・通して確かめる）
    { k: "cloth", t0: b.fetch2[0], t1: b.fetch2[1], amp: 0.03, pan: A },
    { k: "rubber", t: b.fetch2[1] - 0.05, amp: 0.1, pan: -0.6 },
    { k: "erase", t0: b.erase9[0], t1: b.erase9[1], rubs: Math.max(3, Math.round(EDITS[e9].erasePath.length / 2)), amp: 0.15, pan: A },
    { k: "rubber", t: b.putBack2[1] - 0.08, amp: 0.1, pan: -0.6 },
    { k: "wood", t: b.take2[1] - 0.05, amp: 0.1, pan: A },
    pencil(b.draw9[0], b.draw9[1], e9),
    pencil(b.draw11[0], b.draw11[1], e11, 0.5),
    { k: "wood", t: (b.putPencil2[0] + b.putPencil2[1]) / 2, amp: 0.1, pan: A },
    { k: "rustle", t0: b.gather2[0], t1: b.gather2[1], amp: 0.12, pan: A },
    ...replay(b.replay2, -0.1, 0.12, 0),
    { k: "breath", t: b.rest2[0], dur: 1.2, amp: 0.03, inhale: false },
    // C03 B に見せる。B も確かめる（向かい側）
    { k: "rustle", t0: CUT.C03, t1: CUT.C03 + 0.7, amp: 0.1, pan: A },
    { k: "cloth", t0: b.bEnter[0], t1: b.bEnter[1], amp: 0.025, pan: BTOP },
    { k: "tap", t: b.aRelease[0] + 0.2, amp: 0.04, pan: A },
    ...riffleCues(b.bRiffle, 0, 23, PAGES_PER_SEC, FLIP_DUR, 0.1, BTOP),
    { k: "rustle", t0: b.bGather[0], t1: b.bGather[1], amp: 0.1, pan: BTOP },
    ...riffleCues(b.bSlow, 0, 5, b.bSlowPps, 0.6, 0.15, BTOP),
    // C04 表紙を閉じて、一度だけ小さく押印（乾いた一音）
    { k: "rustle", t0: b.bGatherAll[0], t1: b.bGatherAll[1], amp: 0.08, pan: BTOP },
    { k: "flip", t: b.coverClose[0] + 0.1, dur: 0.8, amp: 0.13, pan: BTOP },
    { k: "tap", t: b.coverClose[1], amp: 0.06, pan: BTOP },
    { k: "wood", t: b.toStamp[1], amp: 0.08, pan: 0.5 },
    { k: "tap", t: b.dab[0] + 0.25, amp: 0.07, pan: 0.6 },
    { k: "stamp", t: b.press, amp: 0.11 },
    { k: "wood", t: b.returnStamp[1] - 0.05, amp: 0.08, pan: 0.5 },
    // C05 安堵の息 → もう一度開いて、同じ速さで → 気づいて止まる
    { k: "breath", t: b.relief[0] + 0.3, dur: 1.6, amp: 0.04, inhale: false },
    { k: "flip", t: b.coverOpen[0] + 0.1, dur: 0.9, amp: 0.13, pan: A },
    ...replay(b.replay5, -0.1, 0.12, 0),
    { k: "rustle", t0: b.gather5[0], t1: b.gather5[1], amp: 0.1, pan: A },
    ...riffleCues(b.riffle5, 0, 12, PAGES_PER_SEC, FLIP_DUR, 0.12, -0.1),
    { k: "breath", t: b.riffle5 + 1.3, dur: 0.9, amp: 0.035, inhale: true },
    { k: "flip", t: b.riffle5 + 1.6, dur: 0.6, amp: 0.1, pan: A },
    { k: "flip", t: b.riffle5 + 3.2, dur: 0.6, amp: 0.1, pan: A },
    // C06 閉じかけて止まる（息だけ）、開き直す、自分から見せる
    { k: "rustle", t0: b.gather6[0], t1: b.gather6[1], amp: 0.1, pan: A },
    { k: "rustle", t0: b.coverBack[0], t1: b.coverBack[1], amp: 0.07, pan: A },
    { k: "breath", t: b.hold6[0] + 0.4, dur: 1.3, amp: 0.035, inhale: true },
    { k: "breath", t: b.hold6[1] - 1.1, dur: 1.4, amp: 0.03, inhale: false },
    { k: "flip", t: b.coverReopen[0], dur: 0.8, amp: 0.12, pan: A },
    ...riffleCues(b.riffle6, 0, 12, PAGES_PER_SEC, FLIP_DUR, 0.12, -0.1),
    { k: "cloth", t0: b.tapDesk[0], t1: b.tapDesk[0] + 1.0, amp: 0.03, pan: A },
    { k: "tap", t: b.tapDesk[0] + 1.1, amp: 0.05, pan: 0.2 },
    { k: "cloth", t0: b.bPoint6[0], t1: b.bPoint6[1], amp: 0.025, pan: BTOP },
    // C07 A が見せる → B が立ち、回り込み、隣に座る（椅子、足音の代わりの衣ずれ）
    { k: "rustle", t0: b.aShow7[0], t1: b.aShow7[0] + 0.8, amp: 0.1, pan: A },
    { k: "flip", t: b.aShow7[0] + 1.75, dur: 0.3, amp: 0.1, pan: A },
    { k: "flip", t: b.aShow7[0] + 2.2, dur: 0.3, amp: 0.1, pan: A },
    { k: "cloth", t0: b.bLeave[0], t1: b.bLeave[1], amp: 0.03, pan: BTOP },
    { k: "creak", t: b.walk[0] - 0.1, dur: 0.7, amp: 0.05 },
    { k: "cloth", t0: b.walk[0] + 0.6, t1: b.walk[1] - 0.6, amp: 0.02, pan: 0.6 },
    { k: "cloth", t0: b.aMakeRoom[0], t1: b.aMakeRoom[1], amp: 0.025, pan: A },
    { k: "creak", t: b.bArrive[0] - 0.4, dur: 0.8, amp: 0.05 },
    { k: "cloth", t0: b.bArrive[0], t1: b.bArrive[1], amp: 0.03, pan: B },
    { k: "rustle", t0: b.aBack7[0], t1: b.aBack7[1], amp: 0.05, pan: A },
    { k: "breath", t: b.hold7[0] + 1.5, dur: 1.2, amp: 0.03, inhale: true },
    // C08〜C11（試作と同じ指示を伸ばした拍で）
    ...protoCues(SEG, false),
    // C12 B の案（払う手）→ A が薄紙に描いてみる → 外す → 待つ案 → B が支える → A が描き直す
    { k: "breath", t: b.sigh[0] + 0.3, dur: 1.5, amp: 0.035, inhale: false },
    { k: "cloth", t0: b.bPropose[0], t1: b.bPropose[0] + 0.8, amp: 0.03, pan: B },
    { k: "cloth", t0: b.bPropose[0] + 1.1, t1: b.bPropose[0] + 1.4, amp: 0.04, pan: B },
    { k: "cloth", t0: b.bPropose[0] + 1.6, t1: b.bPropose[0] + 1.9, amp: 0.04, pan: B },
    { k: "rustle", t0: b.sheet1In[0], t1: b.sheet1In[1], amp: 0.06, pan: A },
    { k: "wood", t: b.takeP12[1] - 0.05, amp: 0.1, pan: A },
    { k: "pencil", t0: b.sketch1[0], t1: b.sketch1[1], strokes: strokeBounds(SKETCHES.rush.drawPath), amp: 0.11, pan: A },
    { k: "breath", t: b.ponder[0] + 0.2, dur: 1.0, amp: 0.03, inhale: true },
    { k: "rustle", t0: b.sheet1Out[0], t1: b.sheet1Out[1], amp: 0.06, pan: A },
    { k: "rustle", t0: b.sheet2In[0], t1: b.sheet2In[1], amp: 0.06, pan: A },
    { k: "pencil", t0: b.sketch2[0], t1: b.sketch2[1], strokes: strokeBounds(SKETCHES.wait.drawPath), amp: 0.11, pan: A },
    { k: "tap", t: b.bAgree[0] + 1.1, amp: 0.05, pan: B },
    { k: "rustle", t0: b.sheet2Out[0], t1: b.sheet2Out[1], amp: 0.06, pan: A },
    { k: "wood", t: (b.putP12[0] + b.putP12[1]) / 2, amp: 0.1, pan: A },
    { k: "rustle", t0: b.back16[0], t1: b.back16[1], amp: 0.1, pan: A },
    { k: "rubber", t: b.fetch12[1] - 0.05, amp: 0.1, pan: -0.5 },
    { k: "erase", t0: b.erase16[0], t1: b.erase16[1], rubs: Math.max(3, Math.round(EDITS[e16].erasePath.length / 2)), amp: 0.15, pan: A },
    { k: "rubber", t: b.putE12[1] - 0.08, amp: 0.1, pan: -0.5 },
    { k: "wood", t: b.take12[1] - 0.05, amp: 0.1, pan: A },
    pencil(b.draw16[0], b.draw16[1], e16),
    pencil(b.draw14[0], b.draw14[1], e14, 0.45),
    // C13 置いて、戻して、同じ速さで通す。B も確かめる
    { k: "wood", t: (b.putP13[0] + b.putP13[1]) / 2, amp: 0.1, pan: A },
    { k: "rustle", t0: b.gather13[0], t1: b.gather13[1], amp: 0.1, pan: A },
    { k: "breath", t: b.replay13 - 0.9, dur: 0.8, amp: 0.03, inhale: true },
    ...replay(b.replay13, -0.1, 0.12, 0.11),
    { k: "breath", t: b.replay13 + 2.4, dur: 1.5, amp: 0.035, inhale: false },
    { k: "rustle", t0: b.gather13b[0], t1: b.gather13b[1], amp: 0.1, pan: A },
    ...replay(b.replay13b, -0.1, 0.1, 0.08),
    { k: "rustle", t0: b.bGather13[0], t1: b.bGather13[1], amp: 0.1, pan: B },
    ...replay(b.bRiffle13, B, 0.1, 0.08),
    // C14 紙が静まる
    { k: "breath", t: b.relax[0] + 0.5, dur: 1.8, amp: 0.035, inhale: false },
    { k: "cloth", t0: b.relax[0] + 0.6, t1: b.relax[1] - 1.0, amp: 0.02, pan: A },
  ];
}

export function filmCues(): Cue[] {
  const shift = (c: Cue): Cue => {
    const o = { ...c } as Record<string, unknown>;
    for (const key of ["t", "t0", "t1"]) if (typeof o[key] === "number") o[key] = (o[key] as number) + TITLE;
    return o as Cue;
  };
  return [{ k: "room", t0: TITLE - 0.8, t1: TITLE + MAIN + 1.5, amp: 0.006 }, ...mainCues().map(shift)];
}
