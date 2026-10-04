import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BEATS, readingSeconds, readingShortfall, TOTAL_SECONDS } from "./timeline";

// 原稿は読み取りのみ。太字記法 ** は本文の一部ではないので取り除いて照合する。
const MANUSCRIPT_PATH =
  "/Users/yuta.okada/local/private-note/Zettelkasten/PermanentNote/20250723_レビューの本質とは：品質向上のための協働プロセス.md";
const manuscript = readFileSync(MANUSCRIPT_PATH, "utf8").replace(/\*\*/g, "");

describe("timeline", () => {
  it("ビートは隙間も重なりもなく、0秒から順に続く", () => {
    expect(BEATS[0].start).toBe(0);
    BEATS.forEach((beat, i) => {
      expect(beat.start).toBeLessThan(beat.out);
      expect(beat.out).toBeLessThanOrEqual(beat.end);
      if (i > 0) expect(beat.start).toBe(BEATS[i - 1].end);
    });
  });

  it("各段の文字は静止後、消え始めるまでに読める（7文字/秒+1拍）", () => {
    const short = BEATS.map((b) => ({ id: b.id, shortfall: readingShortfall(b) })).filter((x) => x.shortfall > 1e-9);
    expect(short).toEqual([]);
  });

  it("段の静止時刻はビート内で単調に増える", () => {
    BEATS.forEach((beat) => {
      beat.steps.forEach((step, k) => {
        expect(step.at).toBeGreaterThan(beat.start);
        if (k > 0) expect(step.at).toBeGreaterThanOrEqual(beat.steps[k - 1].at);
      });
    });
  });

  it("引用は原稿本文と一字一句一致する", () => {
    const quotes = BEATS.flatMap((b) => b.steps.flatMap((st) => st.lines)).filter((line) => line.kind === "quote");
    expect(quotes.length).toBeGreaterThan(0);
    quotes.forEach((line) => expect(manuscript, line.text).toContain(line.text));
  });

  it("結論の引用で終わり、元記事の情報は画面に出さない", () => {
    const last = BEATS[BEATS.length - 1];
    expect(last.id).toBe("B14");
    expect(last.steps.flatMap((st) => st.lines).map((x) => x.text)).toEqual([
      "承認を得るためのプロセスではなく、品質を高めるための協働作業です。",
    ]);
    const all = BEATS.flatMap((b) => b.steps.flatMap((st) => st.lines.map((x) => x.text))).join("");
    expect(all).not.toContain("元記事");
    expect(all).not.toContain("協働プロセス");
  });

  it("readingSeconds は空白を数えない", () => {
    expect(readingSeconds("あいう えおかき")).toBeCloseTo(2);
  });

  it("全長を把握できる", () => {
    expect(TOTAL_SECONDS).toBeGreaterThan(90);
  });
});

describe("opening", () => {
  it("冒頭 B01〜B04 は 25.1 秒（753 フレーム、Opening と一致）で、主張に約20秒で到達する", async () => {
    const { beatById, sec } = await import("./timeline");
    const { OPENING_FRAMES } = await import("./scenes/Opening");
    expect(sec(beatById("B04").end)).toBe(OPENING_FRAMES);
    expect(beatById("B04").steps[0].at).toBeLessThanOrEqual(21);
  });
});

describe("main", () => {
  it("場面は冒頭の後から最後のビートまで、すべてのビートを隙間なく担う", async () => {
    const { SCENE_TABLE } = await import("./Main");
    const ids = BEATS.map((b) => b.id);
    const covered = ["B01", "B02", "B03", "B04"];
    for (const sc of SCENE_TABLE) {
      const a = ids.indexOf(sc.first);
      const z = ids.indexOf(sc.last);
      expect(a).toBe(covered.length);
      covered.push(...ids.slice(a, z + 1));
    }
    expect(covered).toEqual(ids);
  });
});
