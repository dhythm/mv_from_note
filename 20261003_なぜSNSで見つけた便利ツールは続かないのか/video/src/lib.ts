// 映像全体のタイムラインと、アニメーション用の純粋関数。
// 秒で書き、フレームへは FPS を掛けて変換する。

export const FPS = 30;
export const WIDTH = 1280;
export const HEIGHT = 720;
export const TOTAL_FRAMES = 90 * FPS;

export type SceneId = "morning" | "day" | "collapse" | "remain" | "end";

export type Scene = { id: SceneId; from: number; duration: number };

const sec = (s: number) => Math.round(s * FPS);

const scene = (id: SceneId, startSec: number, endSec: number): Scene => ({
  id,
  from: sec(startSec),
  duration: sec(endSec) - sec(startSec),
});

// 企画書のタイムラインそのまま
export const SCENES: Scene[] = [
  scene("morning", 0, 18),
  scene("day", 18, 40),
  scene("collapse", 40, 60),
  scene("remain", 60, 80),
  scene("end", 80, 90),
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

export type QuoteId = "optimal" | "morningType" | "deskWork" | "others" | "reorder" | "grow" | "final";

export type Quote = {
  id: QuoteId;
  text: string;
  /** 文字が出始める（シーン先頭からの秒数ではなく、全体の絶対秒） */
  inAt: number;
  /** 引用が元の文のまま静止する瞬間 */
  settleAt: number;
  /** 消え始める瞬間 */
  outAt: number;
  holdFrames: number;
};

const quote = (id: QuoteId, text: string, inAt: number, settleAt: number, outAt: number): Quote => ({
  id,
  text,
  inAt,
  settleAt,
  outAt,
  holdFrames: sec(outAt) - sec(settleAt),
});

// 記事の文は references.md のまま。演出で崩しても、必ずこの形で静止させる。
export const QUOTES: Quote[] = [
  quote("optimal", "他人がシェアしてくれた『便利』は、あくまでその人にとっての最適解なのです。", 9.4, 10.8, 17.4),
  quote("morningType", "朝型の人が作った早朝ルーティンは、夜型の人には苦痛でしかありません。", 25.0, 26.2, 32.2),
  quote("deskWork", "デスクワーク中心の人向けのツールは、外回りが多い人には使いづらいものです。", 32.4, 33.4, 39.8),
  quote("others", "他人の便利さは、他人のために作られています。", 40.6, 42.4, 46.6),
  quote("reorder", "自分の習慣に合わせて順番を入れ替えてみます。", 66.2, 68.6, 73.0),
  quote("grow", "便利さは、育てるもの", 73.6, 74.6, 79.4),
  quote("final", "便利さは、与えられるものではなく、作り上げるものです。", 80.6, 83.0, 89.2),
];

export function quoteOf(id: QuoteId): Quote {
  const q = QUOTES.find((x) => x.id === id);
  if (!q) throw new Error(`unknown quote: ${id}`);
  return q;
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
