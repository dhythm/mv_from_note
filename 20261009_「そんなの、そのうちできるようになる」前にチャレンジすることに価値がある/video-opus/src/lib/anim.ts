// 時刻から値を決める道具。すべて純関数（前フレームの状態・実時間・順序依存の乱数を使わない）。
import timeline from './timeline.json';

export const FPS = 30;
export const W = 1280;
export const H = 720;
export const TOTAL = timeline.duration;
export const TOTAL_FRAMES = Math.round(TOTAL * FPS);
export const BPM = timeline.bpm;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const DEG = Math.PI / 180;

export type Beat = {start: number; end: number; text: string};
export type Cut = {cut: number; start: number; end: number; beats: Beat[]};
export const CUTS: Cut[] = timeline.cuts as Cut[];
export const cut = (n: number) => CUTS[n - 1];
export const beat = (n: number, i: number) => CUTS[n - 1].beats[i];

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const prog = (t: number, a: number, b: number) => (b === a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a)));
export const smooth = (k: number) => k * k * (3 - 2 * k);
export const smoother = (k: number) => k * k * k * (k * (k * 6 - 15) + 10);

export const ease = {
  in: (k: number) => k * k * k,
  out: (k: number) => 1 - Math.pow(1 - k, 3),
  inOut: (k: number) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2),
  outQuint: (k: number) => 1 - Math.pow(1 - k, 5),
  inQuad: (k: number) => k * k,
  outBack: (k: number, s = 1.7) => 1 + (s + 1) * Math.pow(k - 1, 3) + s * Math.pow(k - 1, 2),
  outElastic: (k: number) => (k === 0 || k === 1 ? k : Math.pow(2, -10 * k) * Math.sin((k * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  outExpo: (k: number) => (k === 1 ? 1 : 1 - Math.pow(2, -10 * k)),
  inExpo: (k: number) => (k === 0 ? 0 : Math.pow(2, 10 * k - 10)),
};

// CSS の cubic-bezier(x1,y1,x2,y2) と同じ曲線（ロゴのキーフレームの翻訳に使う）
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sy = (u: number) => ((ay * u + by) * u + cy) * u;
  const dx = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let u = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(u) - x;
      if (Math.abs(e) < 1e-7) break;
      const d = dx(u);
      if (Math.abs(d) < 1e-6) break;
      u -= e / d;
    }
    // ニュートン法が収束しない場合の二分法
    let lo = 0;
    let hi = 1;
    if (Math.abs(sx(u) - x) > 1e-5) {
      u = x;
      for (let i = 0; i < 40; i++) {
        if (sx(u) < x) lo = u;
        else hi = u;
        u = (lo + hi) / 2;
      }
    }
    return sy(u);
  };
}

// 固定の擬似乱数（整数シードから決まる。呼び出し順に依存しない）
export function hash(n: number) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}
export const hashR = (n: number, a: number, b: number) => a + (b - a) * hash(n);

// 滑らかなゆらぎ（周期の異なる正弦の和、-1..1）
export function wobble(t: number, seed: number, period = 4) {
  const w = (2 * Math.PI) / period;
  return (
    0.55 * Math.sin(t * w + seed * 1.7) +
    0.3 * Math.sin(t * w * 1.73 + seed * 3.1) +
    0.15 * Math.sin(t * w * 2.91 + seed * 5.3)
  );
}

// 拍の包絡（拍の頭で 1、指数で減衰）
export function beatEnv(t: number, sharp = 6, offset = 0) {
  if (t < 0) return 0;
  const ph = ((t - offset) / BEAT) % 1;
  return Math.exp(-ph * sharp);
}
export function barPhase(t: number) {
  return (t / BAR) % 1;
}

// 打撃の減衰振動（時刻 h の打撃に対し）
export function damped(t: number, h: number, amp = 1, freq = 3, decay = 5) {
  if (t < h) return 0;
  const u = t - h;
  return amp * Math.exp(-u * decay) * Math.sin(u * freq * 2 * Math.PI);
}
export function pulse(t: number, h: number, decay = 6) {
  if (t < h) return 0;
  return Math.exp(-(t - h) * decay);
}

// 区分キー [時刻, 値] を非一様 Catmull-Rom（Hermite）で補間。キーで速度が 0 にならない
export type Key = [number, number];
export function track(t: number, keys: Key[]) {
  if (keys.length === 1) return keys[0][1];
  if (t <= keys[0][0]) return keys[0][1];
  const n = keys.length;
  if (t >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (i < n - 2 && t > keys[i + 1][0]) i++;
  const [t0, p0] = keys[i];
  const [t1, p1] = keys[i + 1];
  const tan = (k: number) => {
    if (k <= 0) return (keys[1][1] - keys[0][1]) / (keys[1][0] - keys[0][0]);
    if (k >= n - 1) return (keys[n - 1][1] - keys[n - 2][1]) / (keys[n - 1][0] - keys[n - 2][0]);
    return (keys[k + 1][1] - keys[k - 1][1]) / (keys[k + 1][0] - keys[k - 1][0]);
  };
  const h = t1 - t0;
  const u = (t - t0) / h;
  const m0 = tan(i) * h;
  const m1 = tan(i + 1) * h;
  const u2 = u * u;
  const u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0 + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1;
}

// 区分線形（イージング付き）
export function seg(t: number, keys: Key[], e: (k: number) => number = smooth) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, va] = keys[i];
    const [b, vb] = keys[i + 1];
    if (t <= b) return lerp(va, vb, e(prog(t, a, b)));
  }
  return keys[keys.length - 1][1];
}
