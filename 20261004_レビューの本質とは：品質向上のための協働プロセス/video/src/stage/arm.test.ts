import { describe, expect, it } from "vitest";
import { apply, armMatrix, ARM } from "./arm";

describe("腕の置き方", () => {
  it("目印は狙った位置へ来る", () => {
    const [x, y] = apply(armMatrix("aR", ARM.aR.tip, [900, 380]).m, ARM.aR.tip);
    expect(x).toBeCloseTo(900, 6);
    expect(y).toBeCloseTo(380, 6);
  });
  it("向かい側（180度）でも目印は狙った位置", () => {
    const [x, y] = apply(armMatrix("bRrest", ARM.bRrest.tip, [1100, 240], 180).m, ARM.bRrest.tip);
    expect(x).toBeCloseTo(1100, 6);
    expect(y).toBeCloseTo(240, 6);
  });
  it("同じ位置なら何もしない", () => {
    const { m } = armMatrix("bRpoint", ARM.bRpoint.tip, ARM.bRpoint.tip);
    m.forEach((v, i) => expect(v).toBeCloseTo([1, 0, 0, 1, 0, 0][i], 9));
  });
  it("横へ動かすと腕は回る（滑らない）：袖の点は前腕の線の上を動く", () => {
    const a = ARM.aR;
    const { m, swing } = armMatrix("aR", a.tip, [a.tip[0] - 200, a.tip[1]]);
    expect(Math.abs(swing)).toBeGreaterThan(5);
    // 袖の点も同じだけ平行移動していれば「滑り」。回転なら移動量が違う
    const s0 = apply(m, a.sleeve);
    const moved = Math.hypot(s0[0] - a.sleeve[0], s0[1] - a.sleeve[1]);
    expect(moved).toBeLessThan(200);
  });
});
