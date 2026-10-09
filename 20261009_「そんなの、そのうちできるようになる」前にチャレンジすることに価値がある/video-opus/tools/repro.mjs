// 同フレーム再現の確認: 複数のフレームを「順方向」「逆方向」「飛び飛び」の順で描画し、PNG のハッシュを比べる。
// シークの順序で状態が変わる（前フレーム依存・実時間依存）なら一致しない。結果は out/repro.json
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), outDir: path.resolve('.remotion/bundle')});
const chromiumOptions = {gl: 'angle'};
const composition = await selectComposition({serveUrl, id: 'ChallengeSilent', chromiumOptions});
// 各カットの代表（粒子・キー・柱・断面・俯瞰・ワイプ・ロゴを含む）
const frames = [215, 450, 700, 1050, 1420, 1850, 2150, 2700, 3000, 3330, 3500, 3525, 3600, 3690];
const orders = [frames, [...frames].reverse(), frames.filter((_, i) => i % 2 === 0).concat(frames.filter((_, i) => i % 2 === 1))];
const hashes = {};
fs.mkdirSync('out/repro', {recursive: true});
for (const [oi, order] of orders.entries()) {
  for (const f of order) {
    const out = `out/repro/f${f}_o${oi}.png`;
    await renderStill({composition, serveUrl, chromiumOptions, frame: f, output: out, scale: 0.5, timeoutInMilliseconds: 240000});
    const h = crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex');
    (hashes[f] ??= []).push(h.slice(0, 16));
  }
}
const result = Object.fromEntries(Object.entries(hashes).map(([f, hs]) => [f, {same: hs.every((h) => h === hs[0]), hashes: hs}]));
const allSame = Object.values(result).every((r) => r.same);
fs.writeFileSync('out/repro.json', JSON.stringify({allSame, frames: result}, null, 1));
console.log(JSON.stringify({allSame, mismatched: Object.entries(result).filter(([, r]) => !r.same).map(([f]) => f)}));
