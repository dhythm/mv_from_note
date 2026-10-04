// 全編の台本データ。画面に出す言葉・秒数・引用か要約かは、ここが唯一の情報源。
// plan.md の台本表はこのファイルと一致させる。秒で書き、フレームへは FPS を掛けて変換する。

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

/**
 * quote   … 原稿本文の文のまま（明朝）。原稿に部分一致することをテストで確認する。
 * summary … 原稿の要約・つなぎ（ゴシック）。引用扱いしない。
 * label   … 図のラベル（ゴシック）。
 */
export type Kind = "quote" | "summary" | "label";

export type Line = { text: string; kind: Kind };

/** 1つのビートの中で、文字が段階的に出そろう単位。at はその段の文字が静止する秒。 */
export type Step = { at: number; lines: Line[] };

export type Section = "問い" | "実態" | "転換" | "集中力" | "責任" | "上長" | "結論";

export type Beat = {
  id: string;
  section: Section;
  /** 画面に現れ始める秒 */
  start: number;
  /** 文字が消え始める秒 */
  out: number;
  /** 次のビートに引き渡す秒（= 次の start） */
  end: number;
  steps: Step[];
};

const q = (text: string): Line => ({ text, kind: "quote" });
const s = (text: string): Line => ({ text, kind: "summary" });
const l = (text: string): Line => ({ text, kind: "label" });

type BeatSpec = {
  id: string;
  section: Section;
  /** 長さ（秒） */
  dur: number;
  /** 各段が静止する、ビート先頭からの秒 */
  steps: [number, Line[]][];
  /** 消え始めてから次のビートまでの秒 */
  exit?: number;
};

const SPECS: BeatSpec[] = [
  // ── 冒頭（試作区間 0–23.5秒）：問い → 「通した」 → 目的化 → 品質を高める ──
  { id: "B01", section: "問い", dur: 5.0, exit: 0.2, steps: [[1.2, [s("レビューは、何のためにある？")]]] },
  {
    id: "B02", section: "実態", dur: 6.5, exit: 0.3,
    steps: [
      [0.6, [s("筆者がいたSIerでは、こう語られた。")]],
      [1.6, [q("〇〇さんのレビューを通した")]],
    ],
  },
  {
    // 正しい配置（目的＝品質を高める／手段＝レビューを通す）を約1.8秒止めて見せてから入れ替える。
    // 入れ替わった後の下段ラベルは「手段」ではなく、記事の言う「二の次」。
    id: "B03", section: "実態", dur: 7.6, exit: 0.2,
    steps: [
      [0.6, [l("目的"), l("品質を高める"), l("手段"), l("レビューを通す")]],
      [3.83, [l("二の次")]],
      [4.5, [s("通すことが、目的になる。")]],
    ],
  },
  { id: "B04", section: "転換", dur: 6.0, exit: 0.2, steps: [[1.65, [s("レビューの本質は、"), q("品質を高めるための行為")]]] },
  // ── 責任は移らない ───────────────────
  {
    id: "B05", section: "責任", dur: 6.8, exit: 0.2,
    steps: [[0.8, [l("作業者の責任"), l("成果物"), l("レビューアー"), q("責任の所在が変わるわけではありません")]]],
  },
  { id: "B06", section: "責任", dur: 5.2, exit: 0.2, steps: [[0.5, [l("承認"), s("承認を得ずに進めてよい、という意味ではない。")]]] },
  // ── 他者の視点と集中力 ─────────────────
  { id: "B07", section: "集中力", dur: 6.5, exit: 0.2, steps: [[0.6, [s("複数の視点で、"), q("一人では気づけない問題点や改善点を発見する機会")]]] },
  {
    id: "B08", section: "集中力", dur: 9.5, exit: 0.2,
    steps: [
      [0.7, [q("人の集中力には限りがある")]],
      [1.7, [s("例えば、指摘すべき点が30あっても、1回で見つかるのが10なら、20は残る。")]],
    ],
  },
  { id: "B09", section: "責任", dur: 7.0, exit: 0.2, steps: [[0.6, [s("だから作業者は、事前に品質を高め、"), s("レビューを重ねる時間を確保しておく。")]]] },
  {
    id: "B10", section: "集中力", dur: 7.0, exit: 0.2,
    steps: [
      [0.6, [l("指摘"), l("議論・修正"), l("再レビュー")]],
      [2.0, [s("直すことで、新たなバグが生まれることもある。")]],
    ],
  },
  {
    id: "B11", section: "責任", dur: 6.0, exit: 0.2,
    steps: [
      [0.7, [s("レビューアーは、第三者の視点で品質を高める")]],
      [1.7, [q("善意の人")]],
    ],
  },
  // ── 上長の責任とレビューを切り分ける ─────────
  {
    id: "B12", section: "上長", dur: 7.0, exit: 0.2,
    steps: [
      [0.7, [l("上長の責任"), l("レビュー"), l("承認")]],
      [1.1, [s("上長がレビューすると、承認と責任が混ざりやすい。")]],
    ],
  },
  {
    id: "B13", section: "上長", dur: 8.3, exit: 0.2,
    steps: [[1.0, [q("上長の責任は上長の責任として、"), q("レビューは品質を確保するためのものとして"), s("切り分ける。")]]],
  },
  // ── まとめ ─────────────────────────────
  // 最後のビート。結論を鮮明に保持し、終端フレームまでに紙色へ溶け切って終わる（元記事の表示はしない）。
  { id: "B14", section: "結論", dur: 8.5, exit: 1.2, steps: [[1.0, [q("承認を得るためのプロセスではなく、品質を高めるための協働作業です。")]]] },
];

/** Opening が一つの連続した舞台として担う冒頭（ビート B01〜B04） */
export const PROTOTYPE_BEATS = ["B01", "B02", "B03", "B04"];

const round = (x: number) => Math.round(x * 100) / 100;

function build(specs: BeatSpec[]): Beat[] {
  let cursor = 0;
  return specs.map((spec) => {
    const start = cursor;
    const end = round(start + spec.dur);
    cursor = end;
    return {
      id: spec.id,
      section: spec.section,
      start,
      out: round(end - (spec.exit ?? 0.3)),
      end,
      steps: spec.steps.map(([offset, lines]) => ({ at: round(start + offset), lines })),
    };
  });
}

export const BEATS: Beat[] = build(SPECS);

export const TOTAL_SECONDS = BEATS[BEATS.length - 1].end;
export const TOTAL_FRAMES = Math.round(TOTAL_SECONDS * FPS);

export const sec = (seconds: number): number => Math.round(seconds * FPS);

/** 1秒あたり7文字 + 1拍（前日企画と同じ基準）。空白は数えない。 */
export function readingSeconds(text: string): number {
  return [...text.replace(/\s/g, "")].length / 7 + 1;
}

export function charCount(lines: Line[]): number {
  return lines.reduce((n, line) => n + [...line.text.replace(/\s/g, "")].length, 0);
}

/**
 * 段 k が静止してから消え始めるまでに、段 k 以降に出る文字をすべて読めるか。
 * 足りない秒数を返す（0 以下なら足りている）。
 */
export function readingShortfall(beat: Beat): number {
  let worst = -Infinity;
  beat.steps.forEach((step, k) => {
    const rest = beat.steps.slice(k).flatMap((st) => st.lines);
    const need = charCount(rest) / 7 + 1;
    worst = Math.max(worst, need - (beat.out - step.at));
  });
  return worst;
}

export function beatById(id: string): Beat {
  const found = BEATS.find((b) => b.id === id);
  if (!found) throw new RangeError(`unknown beat ${id}`);
  return found;
}

/** ビート内の経過（フレーム）を、ビートの絶対秒に対する相対フレームに変換するための補助。 */
export function relFrames(beat: Beat, absoluteSeconds: number): number {
  return sec(absoluteSeconds) - sec(beat.start);
}
