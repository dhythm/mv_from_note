import { describe, expect, it } from "vitest";
import { FAN, FLIP_DUR, riffle, topPage } from "./flip";
import { PAGE_COUNT, PAGES_PER_SEC } from "./pages";

describe("riffle（親指でめくる）", () => {
  const start = 2;
  it("開始前は from 以降が平ら、from より前は左の束", () => {
    const a = riffle(1, { start, from: 3, to: 20 });
    expect(a).toHaveLength(PAGE_COUNT);
    expect(a.slice(0, 3).every((x, i) => x === FAN(i))).toBe(true);
    expect(a.slice(3).every((x) => x === 0)).toBe(true);
    expect(topPage(a)).toBe(3);
  });

  it("一番上の平らなページは 1/12 秒ごとに進む（全ての場面で同じ速さ）", () => {
    for (let k = 0; k < 10; k++) {
      const t = start + (k + 0.5) / PAGES_PER_SEC;
      expect(topPage(riffle(t, { start, from: 0, to: 20 }))).toBe(k + 1);
    }
  });

  it("めくり終えたページは左の束の角度で止まる", () => {
    const a = riffle(start + 1 / PAGES_PER_SEC + FLIP_DUR + 0.01, { start, from: 0, to: 20 });
    expect(a[0]).toBe(FAN(0));
    expect(a[1]).toBe(FAN(1));
  });

  it("to のページは平らなまま残る（そこで止める）", () => {
    const a = riffle(100, { start, from: 0, to: 12 });
    expect(topPage(a)).toBe(12);
    expect(a[12]).toBe(0);
  });

  it("めくっている途中の角度は 0 と束の間", () => {
    const a = riffle(start + 0.05, { start, from: 0, to: 20 });
    expect(a[0]).toBeGreaterThan(0);
    expect(a[0]).toBeLessThan(FAN(0));
  });
});
