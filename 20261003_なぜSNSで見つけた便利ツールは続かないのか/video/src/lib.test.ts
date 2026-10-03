import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  BEATS,
  CARD_TEXTS,
  FPS,
  SCENES,
  TITLE,
  TOTAL_FRAMES,
  fall,
  layoutRow,
  readingSeconds,
  sceneAt,
  seeded,
  swap,
} from "./lib";

const refs = readFileSync(new URL("../../references.md", import.meta.url), "utf8");

describe("timeline", () => {
  it("is 90 seconds at 30fps", () => {
    expect(FPS).toBe(30);
    expect(TOTAL_FRAMES).toBe(2700);
  });

  it("splits into the five parts of the article without gaps", () => {
    expect(SCENES.map((s) => s.id)).toEqual(["question", "cause", "turn", "method", "end"]);
    expect(SCENES[0].from).toBe(0);
    for (let i = 1; i < SCENES.length; i++) {
      expect(SCENES[i].from).toBe(SCENES[i - 1].from + SCENES[i - 1].duration);
    }
    const last = SCENES[SCENES.length - 1];
    expect(last.from + last.duration).toBe(TOTAL_FRAMES);
  });

  it("finds the scene for a frame", () => {
    expect(sceneAt(0).id).toBe("question");
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

describe("beats (words on screen)", () => {
  it("each beat holds still long enough to be read", () => {
    for (const b of BEATS) {
      expect(b.holdFrames / FPS, b.text).toBeGreaterThanOrEqual(readingSeconds(b.text));
    }
  });

  it("never overlap: the next one starts after the previous one has gone", () => {
    for (let i = 1; i < BEATS.length; i++) {
      expect(BEATS[i].inAt, BEATS[i].id).toBeGreaterThanOrEqual(BEATS[i - 1].outAt + 0.3);
    }
  });

  it("fit inside the video", () => {
    expect(BEATS[0].inAt).toBeGreaterThanOrEqual(0);
    expect(BEATS[BEATS.length - 1].outAt).toBeLessThanOrEqual(90);
  });

  it("quote parts are verbatim from references.md and appear in the beat text", () => {
    for (const b of BEATS) {
      for (const part of b.quoted) {
        expect(refs, part).toContain(part);
        expect(b.text, part).toContain(part);
      }
    }
  });

  it("have unique ids", () => {
    expect(new Set(BEATS.map((b) => b.id)).size).toBe(BEATS.length);
  });
});

describe("other verbatim words", () => {
  it("card texts and the title come from the article", () => {
    for (const s of [...CARD_TEXTS, TITLE]) expect(refs, s).toContain(s);
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

describe("layoutRow", () => {
  it("places items of the given order side by side, centered", () => {
    const xs = layoutRow([100, 50, 30], [2, 0, 1], 10, 500);
    expect(xs[2]).toBe(400);
    expect(xs[0]).toBe(440);
    expect(xs[1]).toBe(550);
  });

  it("rejects an order that is not a permutation", () => {
    expect(() => layoutRow([1, 2], [0, 0], 0, 0)).toThrow();
  });
});
