import { describe, expect, it } from "vitest";
import {
  HESITATION_PAGES,
  PAGE_COUNT,
  PAGES_PER_SEC,
  VERSIONS,
  cupCount,
  diffPages,
  pageKey,
  type PageSpec,
  type Version,
} from "./pages";

const all: Version[] = ["Q0", "Q1", "Q2", "Q3"];

describe("パラパラ漫画のページ表", () => {
  it("全ての版が同じページ数を持つ", () => {
    for (const v of all) expect(VERSIONS[v]).toHaveLength(PAGE_COUNT);
  });

  it("どのページにもカップはちょうど一つ", () => {
    for (const v of all) {
      VERSIONS[v].forEach((p, i) => expect(cupCount(p), `${v} p${i}`).toBe(1));
    }
  });

  it("ためらいのページは全ての版で同一（個性として残す）", () => {
    for (const i of HESITATION_PAGES) {
      const keys = all.map((v) => pageKey(VERSIONS[v][i]));
      expect(new Set(keys).size, `p${i}`).toBe(1);
    }
    // ためらい＝渡す人が一度手を引く
    const dx = HESITATION_PAGES.map((i) => VERSIONS.Q3[i].giver.dx);
    expect(Math.min(...dx)).toBeLessThan(-4);
  });

  it("Q0→Q1：作り手の事前修正はカップの形だけを変える", () => {
    const d = diffPages(VERSIONS.Q0, VERSIONS.Q1);
    expect(d.length).toBeGreaterThan(0);
    for (const i of d) {
      expect(VERSIONS.Q0[i].giver.pose).toBe("holdTall");
      expect(VERSIONS.Q1[i].giver.pose).toBe("hold");
      expect(VERSIONS.Q0[i].receiver).toEqual(VERSIONS.Q1[i].receiver);
    }
    expect(VERSIONS.Q1.some((p) => p.giver.pose === "holdTall")).toBe(false);
  });

  it("Q1：形は揃ったが、手から離れて浮くカップが短く一度だけある", () => {
    const floating = VERSIONS.Q1.map((p, i) => (p.cup === "float" ? i : -1)).filter((i) => i >= 0);
    expect(floating).toHaveLength(1);
  });

  it("Q1→Q2：受け手の絵は変えず、カップと渡す人だけを直す", () => {
    const d = diffPages(VERSIONS.Q1, VERSIONS.Q2);
    expect(d.length).toBeGreaterThan(0);
    for (let i = 0; i < PAGE_COUNT; i++) {
      expect(VERSIONS.Q2[i].receiver, `p${i}`).toEqual(VERSIONS.Q1[i].receiver);
    }
    expect(VERSIONS.Q2.some((p) => p.cup === "float")).toBe(false);
  });

  it("Q2：接続は直ったが、受け手が先に手を下げ、最後までカップは渡らない", () => {
    const last = VERSIONS.Q2[PAGE_COUNT - 1];
    expect(last.cup).toBe("giver");
    expect(last.receiver.pose).toBe("low");
    expect(VERSIONS.Q2.every((p) => p.cup === "giver")).toBe(true);
  });

  it("Q2→Q3：受け手が待つように直し、隣接する渡す人のページも直す", () => {
    const d = diffPages(VERSIONS.Q2, VERSIONS.Q3);
    expect(d.some((i) => pageKey(VERSIONS.Q2[i]) !== pageKey(VERSIONS.Q3[i]))).toBe(true);
    const receiverChanged = d.filter(
      (i) => JSON.stringify(VERSIONS.Q2[i].receiver) !== JSON.stringify(VERSIONS.Q3[i].receiver),
    );
    expect(receiverChanged.length).toBeGreaterThan(3);
    // 受け手は手を下げない
    expect(VERSIONS.Q3.some((p) => p.receiver.pose === "low")).toBe(false);
  });

  it("Q3：受け渡しが成立し、最後は受け手が胸元でカップを持つ", () => {
    const last = VERSIONS.Q3[PAGE_COUNT - 1];
    expect(last.cup).toBe("receiver");
    expect(last.receiver.pose).toBe("hold");
    expect(VERSIONS.Q3.some((p) => p.cup === "float")).toBe(false);
    // 渡す人→受け手の順で一度だけ持ち主が変わる
    const owners = VERSIONS.Q3.map((p) => p.cup);
    const changes = owners.filter((o, i) => i > 0 && o !== owners[i - 1]);
    expect(changes).toEqual(["receiver"]);
  });

  it("再生速度は一つの定数（後半だけのスローを作らない）", () => {
    expect(PAGES_PER_SEC).toBe(12);
  });

  it("ページのキーは同じ絵なら同じ", () => {
    const a: PageSpec = { giver: { pose: "hold", dx: 1 }, receiver: { pose: "open", dx: 0 }, cup: "giver" };
    expect(pageKey(a)).toBe(pageKey({ ...a }));
  });
});
