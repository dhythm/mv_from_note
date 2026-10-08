// 「世界の流れ」: 時間とともに進み続ける座標 F(t)（x方向）。画面全体はこの流れに乗って動き続ける。
// 速度をフレームより細かく数値積分した表を一度だけ作り、どの時刻でも同じ値を返す（シークしても不変）。
import {TL, TOTAL, cut, hit, pS, track, Key} from './anim';

function baseSpeed(t: number): number {
  const c3 = cut(3);
  const keys: Key[] = [
    [0, 4.5],
    [cut(2).start + 0.6, 5.5],
    // カット2: 歯車が止まると、背景の街は流れ続ける
    [c3.start, 7],
    // カット3: 世界が加速し、止まった「現状維持」だけが取り残される
    [pS(3, 'b'), 22, 'in'],
    [pS(3, 'c'), 30, 'inOut'],
    [c3.end - 0.3, 12, 'inOut'],
    [cut(4).start + 1, 6],
    [cut(5).start, 6],
    // カット5後半: 完成したツールを置いて、流れだけが先へ進む
    [pS(5, 'keep'), 7],
    [pS(5, 'broke'), 26, 'in'],
    [cut(5).end, 9, 'out'],
    [cut(6).start + 1, 5],
    [cut(8).start, 6],
    [cut(9).start, 5],
    // カット9: 手入れが回り始め、流れに乗り直す
    [pS(9, 'tool'), 9],
    [cut(10).start + 1.5, 8],
    [TOTAL, 8],
  ];
  let v = track(t, keys);
  // カットの境目で前へ勢いよく流れて、次の画面へ引き渡す
  for (const c of TL.cuts) {
    if (c.cut === 1) continue;
    const b = c.start;
    const rise = Math.exp(-Math.pow((t - (b - 0.12)) / 0.32, 2));
    v += 26 * rise + 10 * hit(t, b, 3) * (t >= b ? 1 : 0);
  }
  return v;
}

const STEP = 1 / 240;
const N = Math.ceil((TOTAL + 2) / STEP) + 2;
const TABLE = new Float64Array(N);
{
  let acc = 0;
  TABLE[0] = 0;
  for (let i = 1; i < N; i++) {
    const t = (i - 0.5) * STEP;
    acc += baseSpeed(t) * STEP;
    TABLE[i] = acc;
  }
}

export function flowX(t: number): number {
  const u = Math.max(0, t) / STEP;
  const i = Math.min(N - 2, Math.floor(u));
  const k = u - i;
  return TABLE[i] * (1 - k) + TABLE[i + 1] * k;
}
export const flowSpeed = baseSpeed;

// 区間 [a,b] の間だけ流れに乗る（その外では世界に置かれ、流れから取り残される/流れの先で待つ）
export function ride(t: number, a: number, b: number): number {
  return flowX(Math.min(b, Math.max(a, t)));
}
