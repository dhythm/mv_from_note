// フレーム時刻 t（秒）から状態を直接計算する関数群。状態の積み上げはしない。
import structure from './structure.json';

export const FPS = 30;
export const W = 1280;
export const H = 720;
export const TOTAL_SEC = structure.totalSec;
export const TOTAL_FRAMES = Math.round(TOTAL_SEC * FPS);
export const BEAT = 60 / structure.bpm;
export const BAR = BEAT * 4;
export const ACC = structure.accents;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const DEG = Math.PI / 180;

export type EaseName =
  | 'linear'
  | 'inOut'
  | 'out'
  | 'in'
  | 'expoOut'
  | 'backOut'
  | 'inOutBack'
  | 'outQuint';

export const ease: Record<EaseName, (k: number) => number> = {
  linear: (k) => k,
  inOut: (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  out: (k) => 1 - Math.pow(1 - k, 3),
  in: (k) => k * k * k,
  expoOut: (k) => (k >= 1 ? 1 : 1 - Math.pow(2, -10 * k)),
  outQuint: (k) => 1 - Math.pow(1 - k, 5),
  backOut: (k) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(k - 1, 3) + c1 * Math.pow(k - 1, 2);
  },
  inOutBack: (k) => {
    const c2 = 1.70158 * 1.525;
    return k < 0.5
      ? (Math.pow(2 * k, 2) * ((c2 + 1) * 2 * k - c2)) / 2
      : (Math.pow(2 * k - 2, 2) * ((c2 + 1) * (k * 2 - 2) + c2) + 2) / 2;
  },
};

// キーフレーム: [時刻, 値, そこへ向かう区間のイージング]
export type Key = [number, number, EaseName?];

export function track(t: number, keys: Key[]): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      const k = (t - t0) / Math.max(1e-6, t1 - t0);
      return lerp(v0, v1, ease[e ?? 'inOut'](k));
    }
  }
  return keys[keys.length - 1][1];
}

// 決定論的な疑似乱数
export function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
export const rnd = (i: number, salt: number, a = 0, b = 1) => lerp(a, b, hash(i * 17.31 + salt * 3.77));

// 区間ごとの拍の強さ（structure.json と BGM で共有）
export function beatIntensity(t: number): number {
  const tbl = structure.beatIntensity as [number, number][];
  let v = 0;
  for (const [t0, k] of tbl) if (t >= t0) v = k;
  return v;
}

// 直近の拍からの減衰（0..1）。ハーフタイム区間は2拍ごと。
export function beatEnv(t: number, sharp = 9): number {
  const half = t >= 22 && t < 34;
  const step = half ? BEAT * 2 : BEAT;
  const since = t - Math.floor(t / step) * step;
  return Math.exp(-since * sharp) * beatIntensity(t);
}

// 特定時刻のヒットからの減衰
export function hitEnv(t: number, at: number, decay = 6): number {
  if (t < at) return 0;
  return Math.exp(-(t - at) * decay);
}

// フレームから決まる減衰振動（P23 ばねの翻訳）
export function damped(t: number, at: number, amp: number, freq = 2.2, decay = 4): number {
  if (t < at) return 0;
  const d = t - at;
  return amp * Math.exp(-d * decay) * Math.sin(d * freq * Math.PI * 2);
}

// 低周波の揺れ（決定論的）
export function wobble(t: number, seed: number, period = 4): number {
  return (
    Math.sin((t / period) * Math.PI * 2 + seed * 1.7) * 0.6 +
    Math.sin((t / (period * 0.53)) * Math.PI * 2 + seed * 4.1) * 0.4
  );
}
