import { describe, expect, it } from "vitest";
import { VERSIONS, pageKey, PAGES_PER_SEC } from "../story/pages";
import { CAM } from "../cuts/kit";
import { CUT, FB, SEG } from "./beats";
import { filmState } from "./film";

const FPS = 24;
const frames = (t0: number, t1: number) => {
  const out: number[] = [];
  for (let f = Math.ceil(t0 * FPS); f < t1 * FPS; f++) out.push(f / FPS);
  return out;
};
const versionOf = (keys: string[]) => {
  for (const v of ["Q3", "Q2", "Q1", "Q0"] as const) if (keys.every((k, i) => k === pageKey(VERSIONS[v][i]))) return v;
  return "mixed";
};

describe("全編の因果と連続性", () => {
  it("版は Q0 → Q1 → Q2 → Q3 の順にしか進まず、各修正の描き終わりより前には変わらない", () => {
    const order = { Q0: 0, Q1: 1, Q2: 2, Q3: 3, mixed: -1 } as const;
    let last = 0;
    for (const t of frames(0, CUT.END)) {
      const v = versionOf(filmState(t).book.keys);
      if (v === "mixed") continue;
      expect(order[v], `t=${t}`).toBeGreaterThanOrEqual(last);
      last = order[v];
    }
    expect(versionOf(filmState(FB.draw9[0]).book.keys)).not.toBe("Q1");
    expect(versionOf(filmState(SEG.draw12[0]).book.keys)).not.toBe("Q2");
    expect(versionOf(filmState(FB.draw16[0]).book.keys)).not.toBe("Q3");
    expect(versionOf(filmState(CUT.C14 + 1).book.keys)).toBe("Q3");
  });

  it("承認の印は押した瞬間より後にだけ表紙に現れる", () => {
    for (const t of frames(0, FB.press)) expect(filmState(t).book.seal, `t=${t}`).toBe(0);
    for (const t of frames(FB.press + 0.05, CUT.END)) expect(filmState(t).book.seal, `t=${t}`).toBe(1);
  });

  it("C07 は一続きのショット（カメラが変わらない）", () => {
    const cams = new Set(frames(CUT.C07, CUT.C08).map((t) => JSON.stringify(filmState(t).camera)));
    expect(cams.size).toBe(1);
  });

  it("C07 で B は上辺から去り、右下から入る（同じ側へ移る）", () => {
    const before = filmState(FB.bLeave[0]).hands.find((h) => h.id.startsWith("b"));
    const after = filmState(FB.hold7[0]).hands.find((h) => h.id.startsWith("b"));
    expect(before?.rot).toBeGreaterThan(150);
    expect(Math.abs(after?.rot ?? 999)).toBeLessThan(20);
  });

  it("B は鉛筆も消しゴムも持たない", () => {
    for (const t of frames(0, CUT.END)) {
      for (const h of filmState(t).hands) {
        if (h.id.startsWith("b")) expect(h.holding === "eraser", `t=${t}`).toBe(false);
      }
    }
  });

  it("鉛筆は C14 の前に机へ戻っている", () => {
    for (const t of frames(CUT.C14, CUT.END)) expect(filmState(t).desk.pencil, `t=${t}`).toBe(true);
  });

  it("ためらいのページは全ての版で残る（B の案で消さない）", () => {
    expect(PAGES_PER_SEC).toBe(12);
    expect(versionOf(filmState(CUT.C14).book.keys)).toBe("Q3");
  });

  it("通しの再生は内側の寄りで見せる（C02・C05・C11・C13）", () => {
    for (const t of [FB.replay2 + 1, FB.replay5 + 1, SEG.replay + 1, FB.replay13 + 1]) {
      expect(filmState(t).camera).toEqual(CAM.page);
    }
  });
});

import { handEvents } from "./handEvents";
import { PB, protoState } from "../cuts/proto";

describe("手の出入りと差し替え（ユーザー指摘：手の欠け・不自然な重複）", () => {
  for (const [name, fn, end] of [
    ["全編", filmState, CUT.END],
    ["試作", protoState, PB.end],
  ] as const) {
    const states = frames(0, end).map((t) => ({ t, s: fn(t) }));
    const { events, duplicates } = handEvents(states);
    it(`${name}：人物・左右ごとに手は同時に一つだけ`, () => {
      expect(duplicates).toEqual([]);
    });
    it(`${name}：同じショットの中で手は画面の外から入り、外へ出る（途中で湧かない・消えない）`, () => {
      const bad = events.filter((e) => e.kind !== "swap" && e.inside > 0);
      expect(bad).toEqual([]);
    });
    it(`${name}：手の形の差し替えでは指先の位置がほとんど飛ばない（25px 以下）`, () => {
      const bad = events.filter((e) => e.kind === "swap" && e.jump > 25);
      expect(bad).toEqual([]);
    });
  }
});

describe("道具は一つずつ（手の中と机の上に同時に出さず、消えもしない）", () => {
  for (const [name, fn, end] of [
    ["全編", filmState, CUT.END],
    ["試作", protoState, PB.end],
  ] as const) {
    it(`${name}：消しゴムは常にちょうど一つ`, () => {
      for (const t of frames(0, end)) {
        const s = fn(t);
        const n = (s.desk.eraser ? 1 : 0) + s.hands.filter((h) => h.holding === "eraser").length;
        expect(n, `t=${t}`).toBe(1);
      }
    });
    it(`${name}：鉛筆は机の上か A の鉛筆の手のどちらか一方`, () => {
      for (const t of frames(0, end)) {
        const s = fn(t);
        const n = (s.desk.pencil ? 1 : 0) + s.hands.filter((h) => h.id === "aRwrite").length;
        expect(n, `t=${t}`).toBe(1);
      }
    });
  }
});
