// エンドロゴの翻訳の照合: 原本 SVG の CSS アニメーションを各時刻で止めた画（LogoOrig）と、
// フレームから計算した Logo.tsx（LogoMine）を 0.1 秒ごとに描き、画素の差を測る。
// 結果は out/logo-compare.json と、差の大きい時刻の比較画像 out/review/logo-cmp-*.png
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), outDir: path.resolve('.remotion/bundle')});
const chromiumOptions = {gl: 'angle'};
const orig = await selectComposition({serveUrl, id: 'LogoOrig', chromiumOptions});
const mine = await selectComposition({serveUrl, id: 'LogoMine', chromiumOptions});
fs.mkdirSync('out/logo', {recursive: true});
const rows = [];
for (let f = 0; f < 165; f += 3) {
  const a = `out/logo/orig_${f}.png`;
  const b = `out/logo/mine_${f}.png`;
  await renderStill({composition: orig, serveUrl, chromiumOptions, frame: f, output: a, scale: 0.5});
  await renderStill({composition: mine, serveUrl, chromiumOptions, frame: f, output: b, scale: 0.5});
  const out = execFileSync('.venv/bin/python', ['tools/imgdiff.py', a, b]).toString().trim();
  rows.push({frame: f, tau: +(f / 30).toFixed(3), ...JSON.parse(out)});
}
const worst = [...rows].sort((x, y) => y.diff_ratio - x.diff_ratio).slice(0, 5);
fs.writeFileSync('out/logo-compare.json', JSON.stringify({max_diff_ratio: worst[0].diff_ratio, worst, rows}, null, 1));
console.log(JSON.stringify({max_diff_ratio: worst[0].diff_ratio, worst: worst.map((w) => [w.tau, w.diff_ratio])}));
