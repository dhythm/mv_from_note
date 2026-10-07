import {Easing, interpolate} from 'remotion';

// オーバーシュートを含むイージング（S16の跳ね）
export const outBack = Easing.bezier(0.34, 1.56, 0.64, 1);
export const outExpo = Easing.bezier(0.16, 1, 0.3, 1);
export const inOut = Easing.bezier(0.65, 0, 0.35, 1);

// 0..1 進行（start から dur フレーム）
export const prog = (frame: number, start: number, dur: number, easing = outExpo) =>
  interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });

// 登場ポップ（スケール+不透明度、オーバーシュート）
export const pop = (frame: number, start: number, dur = 16) => {
  const p = prog(frame, start, dur, outBack);
  const o = prog(frame, start, Math.min(dur, 10), outExpo);
  return {scale: p, opacity: o};
};

// 減衰振動ばね（P23）: フレームから直接評価。任意フレームで同一状態（決定論的）。
// 位置 = to + (from-to)*e^{-k*tt}*cos(omega*tt)。励起フレーム start 以降のみ。
export const damped = (
  frame: number,
  start: number,
  from: number,
  to: number,
  k = 6,
  omega = 22,
  fps = 30
) => {
  if (frame <= start) return from;
  const tt = (frame - start) / fps;
  const env = Math.exp(-k * tt);
  return to + (from - to) * env * Math.cos(omega * tt);
};

// ばね連結（隣接要素へ遅延位相で伝播）: 遅延 delayFrames を足して励起。
export const dampedChain = (
  frame: number,
  start: number,
  idx: number,
  from: number,
  to: number,
  opts: {delay?: number; k?: number; omega?: number} = {}
) => {
  const {delay = 3, k = 6, omega = 22} = opts;
  return damped(frame, start + idx * delay, from, to, k, omega);
};

// パララックス平行移動（S15）: 1フレームあたり pxPerFrame。
export const parallax = (frame: number, start: number, pxPerFrame: number, base = 0) =>
  base + (frame - start) * pxPerFrame;

// ズームブラー風アクセント（G16）: at で短時間のブラー＋スケール跳ね。
export const zoomAccent = (frame: number, at: number, dur = 10, maxBlur = 14, maxScale = 0.14) => {
  const d = frame - at;
  if (d < 0 || d > dur) return {blur: 0, scalePlus: 0};
  const u = d / dur;
  const shape = Math.sin(Math.PI * u); // 0->1->0
  return {blur: maxBlur * shape, scalePlus: maxScale * shape};
};

// 退場フェード（区間末尾）
export const outFade = (frame: number, end: number, dur = 14) =>
  interpolate(frame, [end - dur, end], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: inOut,
  });

// ゆるい連続ドリフト（読む間も周辺を動かす。微動に留めない用途外）
export const drift = (frame: number, amp: number, periodFrames: number, phase = 0) =>
  amp * Math.sin((2 * Math.PI * frame) / periodFrames + phase);
