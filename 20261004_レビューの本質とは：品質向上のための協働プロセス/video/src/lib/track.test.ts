import { describe, expect, it } from "vitest";
import { at, pointAlong, polylineLength, track, type Keys } from "./track";

describe("track（秒→値の折れ線＋イージング）", () => {
  const k: Keys = [
    [0, 0],
    [1, 10],
    [3, 10],
    [4, 0, "linear"],
  ];
  it("両端の外は端の値", () => {
    expect(track(k, -1)).toBe(0);
    expect(track(k, 9)).toBe(0);
  });
  it("キーの時刻ではキーの値", () => {
    expect(track(k, 1)).toBe(10);
    expect(track(k, 3)).toBe(10);
  });
  it("区間の中は単調に補間（既定は inOut）", () => {
    expect(track(k, 0.5)).toBeCloseTo(5, 5);
    expect(track(k, 0.25)).toBeLessThan(2.5);
    expect(track(k, 3.5)).toBeCloseTo(5, 5);
  });
});

describe("at（区間内の進み具合 0..1）", () => {
  it("区間の前は0、後は1", () => {
    expect(at(0.5, 1, 2)).toBe(0);
    expect(at(1.5, 1, 2)).toBeCloseTo(0.5);
    expect(at(3, 1, 2)).toBe(1);
  });
});

describe("pointAlong（折れ線上の位置）", () => {
  const pts: [number, number][] = [
    [0, 0],
    [10, 0],
    [10, 10],
  ];
  it("長さ", () => expect(polylineLength(pts)).toBe(20));
  it("割合で位置が決まる", () => {
    expect(pointAlong(pts, 0)).toEqual([0, 0]);
    expect(pointAlong(pts, 0.25)).toEqual([5, 0]);
    expect(pointAlong(pts, 0.75)).toEqual([10, 5]);
    expect(pointAlong(pts, 1)).toEqual([10, 10]);
  });
  it("空の経路は原点", () => expect(pointAlong([], 0.5)).toEqual([0, 0]));
});
