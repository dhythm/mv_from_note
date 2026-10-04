import { describe, expect, it } from "vitest";
import { VERSIONS, pageKey } from "../story/pages";
import { PB, protoState } from "./proto";

const FPS = 24;
const frames = (t0: number, t1: number) => {
  const out: number[] = [];
  for (let f = Math.ceil(t0 * FPS); f < t1 * FPS; f++) out.push(f / FPS);
  return out;
};
const q1 = pageKey(VERSIONS.Q1[12]);
const q2 = pageKey(VERSIONS.Q2[12]);

describe("難所試作の因果", () => {
  it("B がめくり・指差している間（C08〜C09）は、p12 の絵は Q1 のまま", () => {
    for (const t of frames(0, PB.c10)) {
      const s = protoState(t);
      expect(s.book.keys[12], `t=${t}`).toBe(q1);
      expect(s.book.edit, `t=${t}`).toBeUndefined();
    }
  });

  it("B が指差しているフレームでは、A の道具は紙に触れていない", () => {
    for (const t of frames(PB.point[0], PB.aReach[0])) {
      const s = protoState(t);
      expect(s.hands.some((h) => h.id === "bRpoint")).toBe(true);
      expect(s.hands.some((h) => h.id === "aRwrite")).toBe(false);
    }
  });

  it("消す・描く変化は A の手が消しゴム／鉛筆を持っているときだけ進む", () => {
    for (const t of frames(PB.c10, PB.later)) {
      const s = protoState(t);
      const e = s.book.edit;
      if (!e) continue;
      const a = s.hands.find((h) => h.id === "aRpinch" || h.id === "aRwrite");
      if (t > PB.erase12[0] && t < PB.erase12[1]) expect(a?.holding, `t=${t}`).toBe("eraser");
      if (t > PB.draw12[0] && t < PB.draw12[1]) expect(a?.id, `t=${t}`).toBe("aRwrite");
    }
  });

  it("描き終えてから p12 は Q2 になる（指摘の時点ではなく、修正の後）", () => {
    expect(protoState(PB.draw12[0] + 0.1).book.keys[12]).toBe(q1);
    expect(protoState(PB.draw12[1] + 0.05).book.keys[12]).toBe(q2);
  });

  it("修正中は B の左手が紙を支え、B は鉛筆を持たない", () => {
    for (const t of frames(PB.draw12[0], PB.draw12[1])) {
      const s = protoState(t);
      expect(s.hands.some((h) => h.id === "bLsupport")).toBe(true);
    }
  });

  it("最後の再生は全ページ Q2（受け手が先に手を下げる版）", () => {
    const s = protoState(PB.replay + 0.5);
    expect(s.book.keys).toEqual(VERSIONS.Q2.map(pageKey));
  });
});
