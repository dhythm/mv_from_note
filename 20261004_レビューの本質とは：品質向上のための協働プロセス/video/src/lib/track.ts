// 秒単位の折れ線トラックと、折れ線上の位置。Remotion に依存しない純粋関数。

export type Ease = "inOut" | "in" | "out" | "linear" | "step";
/** [時刻(秒), 値, その区間へ入るときのイージング] */
export type Keys = [number, number, Ease?][];

const EASE: Record<Ease, (x: number) => number> = {
  inOut: (x) => 0.5 - 0.5 * Math.cos(Math.PI * x),
  in: (x) => x * x * x,
  out: (x) => 1 - Math.pow(1 - x, 3),
  linear: (x) => x,
  step: (x) => (x < 1 ? 0 : 1),
};

export function ease(name: Ease, x: number): number {
  return EASE[name](Math.min(1, Math.max(0, x)));
}

/** キーの間を補間する。範囲外は端の値 */
export function track(keys: Keys, t: number): number {
  if (keys.length === 0) return 0;
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1, e] = keys[i];
    if (t <= t1) {
      const [t0, v0] = keys[i - 1];
      if (t1 === t0) return v1;
      return v0 + (v1 - v0) * ease(e ?? "inOut", (t - t0) / (t1 - t0));
    }
  }
  return keys[keys.length - 1][1];
}

/** t が [t0, t1] のどこにいるか（0..1） */
export function at(t: number, t0: number, t1: number): number {
  if (t1 <= t0) return t >= t1 ? 1 : 0;
  return Math.min(1, Math.max(0, (t - t0) / (t1 - t0)));
}

export type Pt = [number, number];

export function polylineLength(pts: Pt[]): number {
  let L = 0;
  for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return L;
}

/** 折れ線の長さに対する割合 f（0..1）の位置 */
export function pointAlong(pts: Pt[], f: number): Pt {
  if (pts.length === 0) return [0, 0];
  const total = polylineLength(pts);
  let target = Math.min(1, Math.max(0, f)) * total;
  for (let i = 1; i < pts.length; i++) {
    const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    if (target <= seg && seg > 0) {
      const r = target / seg;
      return [pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * r, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * r];
    }
    target -= seg;
  }
  return pts[pts.length - 1];
}
