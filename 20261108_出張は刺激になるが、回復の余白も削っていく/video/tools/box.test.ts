// 箱（自分のキャパ）の状態の不変条件: node tools/box.test.ts
// plan.html「記号と色」「完成条件」: 得たもの（琥珀）は減らない／白は 06 で閉じる／08 で戻るのはごく細い白だけ／
// 09・10 で白を広げない／三つの割合の合計は常に 1。
import fs from 'node:fs';
import {boxAt, startsOf} from '../src/box.ts';

const tl = JSON.parse(fs.readFileSync(new URL('../src/timeline.json', import.meta.url), 'utf8'));
const S = startsOf(tl.cuts);
const end = S['10'] + tl.cuts[tl.cuts.length - 1].dur;
const fails: string[] = [];
const ok = (c: boolean, m: string) => {
  if (!c) fails.push(m);
};

let prevA = -1;
for (let T = 0; T <= end; T += 1 / 30) {
  const b = boxAt(T, S);
  ok(Math.abs(b.a + b.g + b.w - 1) < 1e-9, `合計が 1 でない @${T.toFixed(2)}`);
  ok(b.a >= 0 && b.g >= 0 && b.w >= -1e-9, `負の割合 @${T.toFixed(2)}`);
  ok(b.a >= prevA - 1e-9, `琥珀が減った @${T.toFixed(2)}`);
  prevA = b.a;
  // 01 の終わりより後、白は 01 の終わりの幅を超えて回復しない
  if (T > S['02']) ok(b.w <= boxAt(S['02'], S).w + 1e-9, `白が回復した @${T.toFixed(2)}`);
  // 06 の終わりから 08 の線を描くまで、白は閉じている
  if (T >= S['07'] - 0.5 && T < S['08']) ok(b.w < 0.005, `07 で白が閉じていない @${T.toFixed(2)}`);
  // 08 以降の白はごく細い（6% 以下）
  if (T >= S['08']) ok(b.w <= 0.06, `08 以降の白が広い @${T.toFixed(2)}`);
}
// 08 で細い白を確保し、09・10 で広げない
const w08 = boxAt(S['09'], S).w;
ok(w08 > 0.02, '08 で細い白が確保されていない');
for (let T = S['09']; T <= end; T += 0.25) ok(Math.abs(boxAt(T, S).w - w08) < 1e-9, `09 以降で白の幅が変わった @${T.toFixed(2)}`);
// 01 の頭は白が広く、刺激は小さい
const b0 = boxAt(0, S);
ok(b0.w > 0.6 && b0.a < 0.2, '01 の頭の配分が絵コンテと違う');

if (fails.length) {
  console.error(`NG ${fails.length}件\n` + fails.slice(0, 20).join('\n'));
  process.exit(1);
}
console.log('box ok');
