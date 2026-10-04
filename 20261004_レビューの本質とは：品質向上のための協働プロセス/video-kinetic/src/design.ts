import { Easing, interpolate } from "remotion";

export const C = {
  paper: "#EFEBE3",
  ink: "#17171B",
  grey: "#9C978D",
  shu: "#C8432B",
  ai: "#24406B",
};

export const EASE = Easing.bezier(0.22, 0.9, 0.24, 1);
export const EASE_IN = Easing.bezier(0.55, 0, 0.9, 0.4);
export const EASE_INOUT = Easing.bezier(0.65, 0, 0.35, 1);

/** frame が [a, b] を進む割合（0..1, クランプ, イージング付き） */
export function prog(frame: number, a: number, b: number, easing: (t: number) => number = EASE): number {
  return interpolate(frame, [a, b], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing });
}

export function mix(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** 16進カラーの線形補間 */
export function mixColor(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(mix(v, pb[i], t)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
