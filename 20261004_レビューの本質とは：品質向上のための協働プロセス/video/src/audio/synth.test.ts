import { describe, expect, it } from "vitest";
import { SR, encodeWav, mix } from "./synth";
import { riffleCues, strokeBounds, type Cue } from "./cues";

describe("効果音の合成", () => {
  const cues: Cue[] = [
    { k: "room", t0: 0, t1: 1, amp: 0.01 },
    { k: "flip", t: 0.1, dur: 0.2, amp: 0.3, pan: 0 },
    { k: "pencil", t0: 0.3, t1: 0.8, strokes: [0, 0.5, 1], amp: 0.2, pan: -0.3 },
    { k: "stamp", t: 0.5, amp: 0.8 },
  ];
  it("毎回同じ音になる（決定的）", () => {
    const a = mix(cues, 1);
    const b = mix(cues, 1);
    expect(a.l).toEqual(b.l);
  });
  it("NaN がなく、ピークは -1dB 程度に収まる", () => {
    const a = mix(cues, 1);
    let peak = 0;
    for (const v of a.l) {
      expect(Number.isFinite(v)).toBe(true);
      peak = Math.max(peak, Math.abs(v));
    }
    expect(peak).toBeLessThanOrEqual(0.8901);
    expect(peak).toBeGreaterThan(0.01);
  });
  it("WAV の大きさ＝44 + サンプル数×4", () => {
    const w = encodeWav(mix(cues, 1));
    expect(w.length).toBe(44 + SR * 4);
  });
});

describe("指示の補助", () => {
  it("めくる音は映像と同じ間隔で並ぶ", () => {
    const c = riffleCues(2, 0, 3, 12, 0.2, 0.3, 0) as { t: number }[];
    expect(c.map((x) => x.t)).toEqual([2, 2 + 1 / 12, 2 + 2 / 12]);
  });
  it("画の境目", () => {
    expect(strokeBounds([[0, 0], [10, 0], [10, 30]])).toEqual([0, 0.25, 1]);
  });
});
