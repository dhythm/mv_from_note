// 時刻から状態を直接求めるための補助関数。実時間の積み上げや乱数の逐次生成は使わない。
import timeline from './timeline.json';

export const FPS = 30;
export const W = 1280;
export const H = 720;
export const TL = timeline;
export const TOTAL_FRAMES = timeline.frames;
export const TOTAL = timeline.total;
export const BEAT = 60 / timeline.bpm;
export const DEG = Math.PI / 180;

type Cut = (typeof timeline.cuts)[number];
export function cut(n: number): Cut {
  return timeline.cuts[n - 1];
}
// 要点の発話区間 [開始, 終了]（絶対秒）
export function ph(n: number, key: string): [number, number] {
  const p = (timeline.cuts[n - 1].p as unknown as Record<string, number[]>)[key];
  if (!p) throw new Error(`phrase ${n}.${key} not found`);
  return [p[0], p[1]];
}
export const pS = (n: number, key: string) => ph(n, key)[0];
export const pE = (n: number, key: string) => ph(n, key)[1];

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const prog = (t: number, a: number, b: number) => (b === a ? (t >= a ? 1 : 0) : clamp((t - a) / (b - a)));
export const smooth = (x: number) => {
  const k = clamp(x);
  return k * k * (3 - 2 * k);
};

export const ease = {
  linear: (x: number) => x,
  in: (x: number) => x * x * x,
  out: (x: number) => 1 - Math.pow(1 - x, 3),
  inOut: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  outQuint: (x: number) => 1 - Math.pow(1 - x, 5),
  expoOut: (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  expoIn: (x: number) => (x <= 0 ? 0 : Math.pow(2, 10 * x - 10)),
  outBack: (x: number) => {
    const c1 = 1.9;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
  },
  inBack: (x: number) => {
    const c1 = 1.7;
    return (c1 + 1) * x * x * x - c1 * x * x;
  },
  inOutBack: (x: number) => {
    const c2 = 1.7 * 1.525;
    return x < 0.5
      ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
      : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2;
  },
  outElastic: (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return Math.pow(2, -9 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
  },
};
export type EaseName = keyof typeof ease;

// キーフレーム: [時刻, 値, そこへ向かう区間のイージング]
export type Key = [number, number, EaseName?];
export function track(t: number, keys: Key[]): number {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      return lerp(v0, v1, ease[e ?? 'inOut'](prog(t, t0, t1)));
    }
  }
  return keys[keys.length - 1][1];
}
export function sortKeys(keys: Key[]): Key[] {
  return [...keys].sort((a, b) => a[0] - b[0]);
}

// 決定的な疑似乱数（同じ引数なら同じ値）
export function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
export const rnd = (i: number, salt = 0) => hash(i * 17.13 + salt * 101.7);
export const rndS = (i: number, salt = 0) => rnd(i, salt) * 2 - 1;

// 滑らかな揺らぎ（-1..1）。時刻だけで決まる
export function wobble(t: number, seed: number, period = 4): number {
  const w = (2 * Math.PI) / period;
  return (
    0.55 * Math.sin(t * w + seed * 1.7) +
    0.3 * Math.sin(t * w * 2.13 + seed * 3.1) +
    0.15 * Math.sin(t * w * 3.71 + seed * 5.3)
  );
}

// 拍の包絡（拍頭で1、減衰）
export function beatEnv(t: number, decay = 9): number {
  const ph = ((t % BEAT) + BEAT) % BEAT;
  return Math.exp(-ph * decay);
}
// 指定時刻のヒット（以降で減衰）
export function hit(t: number, at: number, decay = 6): number {
  return t < at ? 0 : Math.exp(-(t - at) * decay);
}
// 減衰振動（衝撃後の揺れ）
export function damped(t: number, at: number, amp = 1, decay = 3, freq = 5): number {
  if (t < at) return 0;
  const u = t - at;
  return amp * Math.exp(-u * decay) * Math.sin(u * freq * 2 * Math.PI);
}
// 区間 [a,b] の中だけ 1 に近づく窓（in/out の幅つき）
export function win(t: number, a: number, b: number, fin = 0.3, fout = 0.3): number {
  return smooth(prog(t, a - fin, a)) * (1 - smooth(prog(t, b, b + fout)));
}
