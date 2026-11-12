// 8 本のバーが左から順に倒れる動き。前の 1 本の角が次の 1 本の面を押す、という接触の拘束から角度を決める。
// 実時間の物理ではない。固定の刻みで一度だけ表を作り、時刻から引く（シークしても同じ結果）。
export const DOM = {n: 8, h: 3, d: 0.4, p: 0.9};
const {n, h, d, p} = DOM;
const HALF = Math.PI / 2;

// 手前のバー（角度 th）と次のバー（角度 ph）が食い込んでいるか。角と面の位置から決める
function pen(th: number, ph: number) {
  // 手前の上の角が、次のバーの中にある
  const ax = h * Math.sin(th) - p;
  const ay = h * Math.cos(th);
  const upA = ax * Math.sin(ph) + ay * Math.cos(ph);
  const leftA = -ax * Math.cos(ph) + ay * Math.sin(ph);
  if (upA > 0 && upA < h && leftA < d - 1e-9) return true;
  // 次のバーの左上の角が、手前のバーの中にある
  const bx = p - d * Math.cos(ph) + h * Math.sin(ph);
  const by = d * Math.sin(ph) + h * Math.cos(ph);
  const upB = bx * Math.sin(th) + by * Math.cos(th);
  const leftB = -bx * Math.cos(th) + by * Math.sin(th);
  return upB > 0 && upB < h && leftB > 1e-9;
}
// 手前が th のとき、押された次のバーの最小の角度
function pushed(th: number) {
  if (!pen(th, 0)) return 0;
  let lo = 0;
  let hi = th;
  for (let i = 0; i < 36; i++) {
    const m = (lo + hi) / 2;
    if (pen(th, m)) lo = m;
    else hi = m;
  }
  return hi;
}
// 次のバーが ph のとき、手前のバーが寄りかかれる最大の角度
function rest(ph: number) {
  if (!pen(HALF, ph)) return HALF;
  let lo = 0;
  let hi = HALF;
  for (let i = 0; i < 36; i++) {
    const m = (lo + hi) / 2;
    if (pen(m, ph)) hi = m;
    else lo = m;
  }
  return lo;
}

const HZ = 240;
const DUR = 4;
const G = 15; // 倒れる速さ（見た目の調整値）
const table: number[][] = (() => {
  const th = new Array(n).fill(0);
  const om = new Array(n).fill(0);
  th[0] = 0.02;
  om[0] = 0.5;
  const out: number[][] = [];
  const dt = 1 / HZ;
  for (let s = 0; s <= DUR * HZ; s++) {
    out.push(th.slice());
    for (let i = 0; i < n; i++) {
      if (th[i] > 0.0001) om[i] += G * Math.sin(th[i]) * dt;
      th[i] += om[i] * dt;
    }
    // 押す（前から）
    for (let i = 0; i < n - 1; i++) {
      const need = pushed(th[i]);
      if (th[i + 1] < need) {
        om[i + 1] = Math.max(om[i + 1], ((need - th[i + 1]) / dt) * 0.5, om[i] * 0.8);
        th[i + 1] = need;
      }
    }
    // 床と、次のバーに寄りかかる（後ろから）
    if (th[n - 1] > HALF) {
      th[n - 1] = HALF;
      om[n - 1] = 0;
    }
    for (let i = n - 2; i >= 0; i--) {
      const mx = rest(th[i + 1]);
      if (th[i] > mx) {
        th[i] = mx;
        om[i] = Math.min(om[i], om[i + 1]);
      }
    }
  }
  return out;
})();

// u: 倒れ始めてからの秒。i 本目の角度（ラジアン、右へ）
export function fallAngle(i: number, u: number) {
  if (u <= 0) return 0;
  const f = Math.min(u, DUR) * HZ;
  const a = Math.floor(f);
  const b = Math.min(table.length - 1, a + 1);
  return table[a][i] + (table[b][i] - table[a][i]) * (f - a);
}
