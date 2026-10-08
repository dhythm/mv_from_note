// 同フレーム再現の確認: 同じフレームを順序を変えて2回ずつ描画し、PNG のハッシュを比べる（シークしても状態が同じか）。
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), outDir: path.resolve('.remotion/bundle')});
const chromiumOptions = {gl: 'angle'};
const composition = await selectComposition({serveUrl, id: 'MaintenanceSilent', chromiumOptions});
const frames = [600, 1200, 3200, 4500];
const order = [...frames, ...[...frames].reverse()];
const hashes = {};
fs.mkdirSync('out/repro', {recursive: true});
for (const [k, f] of order.entries()) {
  const out = `out/repro/f${f}_${k}.png`;
  await renderStill({composition, serveUrl, chromiumOptions, frame: f, output: out, scale: 0.5, timeoutInMilliseconds: 180000});
  const h = crypto.createHash('sha256').update(fs.readFileSync(out)).digest('hex');
  (hashes[f] ??= []).push(h);
}
const result = Object.fromEntries(Object.entries(hashes).map(([f, hs]) => [f, {same: hs.every((h) => h === hs[0]), hashes: hs.map((h) => h.slice(0, 16))}]));
fs.writeFileSync('out/repro.json', JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
