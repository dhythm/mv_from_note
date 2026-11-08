// 箱（自分のキャパ）の状態。全編で一つの関数にし、カットの境目で状態が飛ばないようにする。
// a＝琥珀（得られたもの）、g＝灰（移動・予定などの負荷）、w＝白（回復に使える余白）。a + g + w = 1。
// 不変条件は tools/box.test.ts（琥珀は減らない、白は 06 で閉じる、08 で戻るのはごく細い白だけ）。
// キーの秒は「カットの頭からの秒」。声の語の時刻（audio/voice/words.json）＋vo に合わせた。

export type Starts = Record<string, number>;
export type BoxS = {a: number; g: number; w: number};

export function startsOf(cuts: {id: string; dur: number}[]): Starts {
  const s: Starts = {};
  let acc = 0;
  for (const c of cuts) {
    s[c.id] = acc;
    acc += c.dur;
  }
  return s;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const sm = (k: number) => k * k * (3 - 2 * k);
const outE = (k: number) => 1 - Math.pow(1 - k, 3);

// [カット, 開始秒, 終了秒, 値] の列を順に適用する（前の値から次の値へ）
type Step = [string, number, number, number, ((k: number) => number)?];
function run(T: number, S: Starts, v0: number, steps: Step[]) {
  let v = v0;
  for (const [id, a, b, to, e] of steps) {
    const t0 = S[id] + a;
    const t1 = S[id] + b;
    if (T <= t0) break;
    const k = clamp01((T - t0) / (t1 - t0));
    v = v + (to - v) * (e ?? sm)(k);
    if (T < t1) break;
  }
  return v;
}

// 琥珀: 01「刺激が得られます」で広がり、02 の学び・出会い、04 の縁で増える。減らない。
export const A_STEPS: Step[] = [
  ['01', 1.2, 2.6, 0.3, outE],
  ['02', 1.6, 2.4, 0.36, outE],
  ['02', 4.2, 5.0, 0.42, outE],
  ['04', 2.7, 3.4, 0.46, outE],
];
// 灰: 01「失われていきます」、03「体が重い」、05「予定は続き」、06「翌日」で白を押し狭める。
// 08 で墨の線を描き、ごく細い白を確保する（全回復ではない）。
export const G_STEPS: Step[] = [
  ['01', 4.6, 6.8, 0.22],
  ['03', 2.4, 4.4, 0.4],
  ['05', 0.6, 4.6, 0.48],
  ['06', 2.3, 3.0, 0.54, outE],
  ['08', 7.0, 7.9, 0.5],
];

export function boxAt(T: number, S: Starts): BoxS {
  const a = run(T, S, 0.12, A_STEPS);
  const g = Math.min(1 - a, run(T, S, 0.1, G_STEPS));
  return {a, g, w: Math.max(0, 1 - a - g)};
}
