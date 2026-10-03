// 映像全体のタイムラインと、アニメーション用の純粋関数。
// 秒で書き、フレームへは FPS を掛けて変換する。

export const FPS = 30;
export const WIDTH = 1280;
export const HEIGHT = 720;
export const TOTAL_FRAMES = 90 * FPS;

export type SceneId = "question" | "cause" | "turn" | "method" | "end";

export type Scene = { id: SceneId; from: number; duration: number };

const sec = (s: number) => Math.round(s * FPS);

const scene = (id: SceneId, startSec: number, endSec: number): Scene => ({
  id,
  from: sec(startSec),
  duration: sec(endSec) - sec(startSec),
});

// 記事の筋：問い → 原因 → 転換 → 方法 → 結論
export const SCENES: Scene[] = [
  scene("question", 0, 15),
  scene("cause", 15, 40),
  scene("turn", 40, 56.6),
  scene("method", 56.6, 77),
  scene("end", 77, 90),
];

export function sceneAt(frame: number): Scene {
  const found = SCENES.find((s) => frame >= s.from && frame < s.from + s.duration);
  if (!found) {
    throw new RangeError(`frame ${frame} is outside the timeline (0-${TOTAL_FRAMES - 1})`);
  }
  return found;
}

// 1秒あたり約7文字 + 1拍
export function readingSeconds(text: string): number {
  return [...text].length / 7 + 1;
}

export const TITLE = "なぜSNSで見つけた便利ツールは続かないのか";
// スマホから飛び出す投稿（記事の導入にある例）
export const CARD_TEXTS = ["これが便利！", "生産性が10倍になった！"];

export type BeatId =
  | "tried"
  | "few"
  | "why"
  | "others"
  | "morningType"
  | "deskWork"
  | "general"
  | "optimal"
  | "turn"
  | "observe"
  | "arrange"
  | "reorder"
  | "grow"
  | "final";

/** 画面に出す言葉のひとまとまり。全体の絶対秒で書く。 */
export type Beat = {
  id: BeatId;
  /** 画面に出る文字すべて（行の区切りなし） */
  text: string;
  /** そのうち記事の文のまま出す部分（references.md にあること） */
  quoted: string[];
  /** 出始める */
  inAt: number;
  /** 文字がすべて出そろって静止する */
  settleAt: number;
  /** 消え始める */
  outAt: number;
  holdFrames: number;
};

const beat = (id: BeatId, text: string, quoted: string[], inAt: number, settleAt: number, outAt: number): Beat => ({
  id,
  text,
  quoted,
  inAt,
  settleAt,
  outAt,
  holdFrames: sec(outAt) - sec(settleAt),
});

export const BEATS: Beat[] = [
  // 問い
  beat("tried", "つい試して、いくつも取り入れてきた。", [], 3.9, 4.35, 8.0),
  beat("few", "でも、今でも使い続けているものは、驚くほど少ない。", [], 8.35, 8.8, 13.4),
  beat("why", "なぜ、続かないのか。", [], 13.8, 14.2, 16.7),
  // 原因
  beat("others", "他人の便利さは、他人のために作られています。", ["他人の便利さは、他人のために作られています"], 17.1, 17.8, 22.0),
  beat("morningType", "朝型の人の早朝ルーティンは、夜型の人には、苦痛。", [], 22.4, 23.2, 27.7),
  beat("deskWork", "デスクワーク向けのツールは、外回りの人には、使いづらい。", [], 28.1, 28.9, 34.1),
  beat("general", "汎用的なほど、効力は薄い。特化するほど、効力は高い。", [], 34.5, 35.05, 39.8),
  // 転換
  beat(
    "optimal",
    "他人がシェアしてくれた『便利』は、あくまでその人にとっての最適解なのです。",
    ["他人がシェアしてくれた『便利』は、あくまでその人にとっての最適解なのです。"],
    40.2,
    41.0,
    47.3,
  ),
  beat("turn", "参考にするのはいい。でも、続いているものは、そのまま使っていない。", [], 49.9, 50.6, 56.4),
  // 方法
  beat("observe", "まず、自分を観察する。いつ不便かどこで集中できるか何が得意で苦手か", [], 56.8, 58.0, 63.9),
  beat("arrange", "次に、なぜ便利なのかを考えて、自分に合わせてアレンジする。", [], 64.3, 64.9, 70.1),
  beat("reorder", "自分の習慣に合わせて順番を入れ替えてみます。", ["自分の習慣に合わせて順番を入れ替えてみます。"], 70.5, 72.5, 76.7),
  // 結論
  beat("grow", "便利は、種のようなもの。便利さは、育てるもの", ["便利さは、育てるもの"], 77.1, 77.9, 82.1),
  beat(
    "final",
    "便利さは、与えられるものではなく、作り上げるものです。",
    ["便利さは、与えられるものではなく、作り上げるものです。"],
    82.5,
    85.0,
    89.9,
  ),
];

export function beatOf(id: BeatId): Beat {
  const b = BEATS.find((x) => x.id === id);
  if (!b) throw new Error(`unknown beat: ${id}`);
  return b;
}

/** 決定的な疑似乱数（mulberry32）。レンダリングごとに同じ値を返す。 */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type FallParams = { vx: number; vy: number; g: number; spin: number };

/** 解放からの経過秒 t における放物運動。t < 0 では動かない。 */
export function fall(t: number, p: FallParams): { x: number; y: number; rotate: number } {
  if (t <= 0) return { x: 0, y: 0, rotate: 0 };
  return {
    x: p.vx * t,
    y: p.vy * t + 0.5 * p.g * t * t,
    rotate: p.spin * t,
  };
}

export function swap<T>(items: readonly T[], i: number, j: number): T[] {
  if (i < 0 || j < 0 || i >= items.length || j >= items.length) {
    throw new RangeError(`swap index out of range: ${i}, ${j} (length ${items.length})`);
  }
  const next = [...items];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/**
 * 横一列に並べたときの各要素の左端 x（要素 id ごと）。order は id の並び順。
 * 全体を center を中心に置く。
 */
export function layoutRow(widths: readonly number[], order: readonly number[], gap: number, center: number): number[] {
  const seen = new Set(order);
  if (order.length !== widths.length || seen.size !== widths.length || order.some((i) => i < 0 || i >= widths.length)) {
    throw new RangeError(`order is not a permutation of 0..${widths.length - 1}: ${order.join(",")}`);
  }
  const total = widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1);
  const xs = new Array<number>(widths.length);
  let x = center - total / 2;
  for (const id of order) {
    xs[id] = x;
    x += widths[id] + gap;
  }
  return xs;
}
