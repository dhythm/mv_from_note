import { Easing, interpolate } from "remotion";

type EasingFn = (t: number) => number;

/** 秒単位・両端クランプの interpolate */
export function ip(t: number, input: number[], output: number[], easing?: EasingFn): number {
  return interpolate(t, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
}

export const outExpo = Easing.out(Easing.exp);
export const outCubic = Easing.out(Easing.cubic);
export const inOutCubic = Easing.inOut(Easing.cubic);
export const inCubic = Easing.in(Easing.cubic);
export const outBack = Easing.out(Easing.back(1.8));

/** 0→1→0 のフェード（in と out の長さは秒） */
export function window(t: number, inAt: number, outAt: number, fadeIn = 0.4, fadeOut = 0.4): number {
  return Math.min(ip(t, [inAt, inAt + fadeIn], [0, 1]), ip(t, [outAt, outAt + fadeOut], [1, 0]));
}
