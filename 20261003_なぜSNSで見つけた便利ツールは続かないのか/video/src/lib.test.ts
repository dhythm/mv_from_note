import { describe, expect, it } from "vitest";
import {
  FPS,
  QUOTES,
  SCENES,
  TOTAL_FRAMES,
  fall,
  readingSeconds,
  sceneAt,
  seeded,
  swap,
} from "./lib";

describe("timeline", () => {
  it("is 90 seconds at 30fps", () => {
    expect(FPS).toBe(30);
    expect(TOTAL_FRAMES).toBe(2700);
  });

  it("splits into the five scenes of the plan without gaps", () => {
    expect(SCENES.map((s) => [s.from / FPS, (s.from + s.duration) / FPS])).toEqual([
      [0, 18],
      [18, 40],
      [40, 60],
      [60, 80],
      [80, 90],
    ]);
  });

  it("finds the scene for a frame", () => {
    expect(sceneAt(0).id).toBe("morning");
    expect(sceneAt(18 * FPS).id).toBe("day");
    expect(sceneAt(59 * FPS).id).toBe("collapse");
    expect(sceneAt(TOTAL_FRAMES - 1).id).toBe("end");
  });

  it("throws outside the timeline", () => {
    expect(() => sceneAt(-1)).toThrow();
    expect(() => sceneAt(TOTAL_FRAMES)).toThrow();
  });
});

describe("readingSeconds", () => {
  it("gives about 7 chars/sec plus one beat", () => {
    expect(readingSeconds("あいうえおかきくけこさしすせ")).toBeCloseTo(3);
  });
});

describe("quotes", () => {
  it("each quote holds still long enough to be read", () => {
    for (const q of QUOTES) {
      expect(q.holdFrames / FPS, q.text).toBeGreaterThanOrEqual(readingSeconds(q.text));
    }
  });

  it("are verbatim lines from references.md", async () => {
    const { readFile } = await import("node:fs/promises");
    const refs = await readFile(new URL("../../references.md", import.meta.url), "utf8");
    for (const q of QUOTES) {
      expect(refs, q.text).toContain(q.text);
    }
  });
});

describe("seeded", () => {
  it("is deterministic and within [0,1)", () => {
    const a = seeded(42);
    const b = seeded(42);
    for (let i = 0; i < 100; i++) {
      const v = a();
      expect(v).toBe(b());
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("differs by seed", () => {
    expect(seeded(1)()).not.toBe(seeded(2)());
  });
});

describe("fall", () => {
  const p = { vx: 100, vy: -200, g: 2000, spin: 90 };

  it("stays put before release", () => {
    expect(fall(-0.5, p)).toEqual({ x: 0, y: 0, rotate: 0 });
  });

  it("follows a ballistic arc after release", () => {
    const r = fall(1, p);
    expect(r.x).toBeCloseTo(100);
    expect(r.y).toBeCloseTo(-200 + 1000);
    expect(r.rotate).toBeCloseTo(90);
  });
});

describe("swap", () => {
  it("returns a new array with two items exchanged", () => {
    const src = ["a", "b", "c"];
    expect(swap(src, 0, 2)).toEqual(["c", "b", "a"]);
    expect(src).toEqual(["a", "b", "c"]);
  });

  it("rejects out-of-range indices", () => {
    expect(() => swap(["a"], 0, 1)).toThrow(RangeError);
  });
});

import { layoutRow } from "./lib";

describe("layoutRow", () => {
  it("places items of the given order side by side, centered", () => {
    // widths by id: 0→100, 1→50, 2→30 ; gap 10 → total 200, centered at 500 → starts at 400
    const xs = layoutRow([100, 50, 30], [2, 0, 1], 10, 500);
    expect(xs[2]).toBe(400);
    expect(xs[0]).toBe(440);
    expect(xs[1]).toBe(550);
  });

  it("rejects an order that is not a permutation", () => {
    expect(() => layoutRow([1, 2], [0, 0], 0, 0)).toThrow();
  });
});
