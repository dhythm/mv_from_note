import { Easing, interpolate } from "remotion";

// 文字が画面を支配するキネティックタイポグラフィ用の設計定数。
// 太い黒・朱・藍の少数色。紙地は維持。
export const K = {
  paper: "#EFE8DA",
  paperEdge: "#E4DAC6",
  ink: "#17171B",
  grey: "#9C978D",
  shu: "#C8432B", // 朱
  ai: "#24406B", // 藍
  knock: "#F3EEE4", // 面上のヌキ文字
} as const;

// スナップの効いたイージング（バシバシ動かす）。
export const SNAP = Easing.bezier(0.2, 0.95, 0.2, 1); // 速く入って鋭く止まる
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN = Easing.bezier(0.5, 0, 0.9, 0.35); // 加速して抜ける
export const EASE_INOUT = Easing.bezier(0.65, 0, 0.35, 1);
export const OVERSHOOT = Easing.bezier(0.3, 1.5, 0.55, 1); // 少し行き過ぎて戻る

export function prog(
  frame: number,
  a: number,
  b: number,
  easing: (t: number) => number = SNAP,
): number {
  return interpolate(frame, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
}

export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function mixColor(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(mix(v, pb[i], t)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

// 全角1文字＝1emの前提で、i字目の左端x。
export const at = (x0: number, size: number, i: number) => x0 + i * size;

// n字の語を centerX に中央寄せしたときの左端x。
export const wordLeft = (n: number, size: number, centerX: number) =>
  centerX - (n * size) / 2;
