import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

// 使い方:
//   node render.mjs stills [scale] [t1,t2,...]   -> 指定秒のスチル（既定は各カットの代表）
//   node render.mjs proto [scale]                -> 試作3区間 (a)雪崩れ〜圧縮 (b)裏返し (c)隙間〜結論
//   node render.mjs range S E name [scale]       -> 秒で区間指定
//   node render.mjs full                         -> 全編 out/itsuka-cost-full.mp4
const mode = process.argv[2] || 'stills';
const FPS = 30;

const serveUrl = await bundle({
  entryPoint: path.resolve('src/index.ts'),
  outDir: path.resolve('.remotion/bundle'),
});
const chromiumOptions = {gl: 'angle'};
const composition = await selectComposition({serveUrl, id: 'ItsukaCost', chromiumOptions});
const common = {composition, serveUrl, chromiumOptions, timeoutInMilliseconds: 120000};
fs.mkdirSync('out/review', {recursive: true});
const log = (m) => console.log(`[render] ${m}`);

async function range(s, e, out, scale, extra = {}) {
  let last = -1;
  await renderMedia({
    ...common,
    codec: 'h264',
    crf: 18,
    scale,
    concurrency: 4,
    outputLocation: out,
    frameRange: [Math.round(s * FPS), Math.min(composition.durationInFrames - 1, Math.round(e * FPS) - 1)],
    onProgress: ({progress}) => {
      const p = Math.floor(progress * 10);
      if (p !== last) {
        last = p;
        log(`${path.basename(out)} ${p * 10}%`);
      }
    },
    ...extra,
  });
  log(`done ${out}`);
}

if (mode === 'stills') {
  const scale = Number(process.argv[3] || '0.5');
  const times = (process.argv[4] || '0.6,5,9.5,15,21,24,27.4,30,38,42,46.5,50,52,56,60,64,68,74,77.5')
    .split(',')
    .map(Number);
  for (const t of times) {
    const name = `still_${String(t).replace('.', '_')}`;
    await renderStill({...common, scale, frame: Math.round(t * FPS), output: `out/review/${name}.png`});
    log(`still ${name}`);
  }
} else if (mode === 'proto') {
  const scale = Number(process.argv[3] || '1');
  await range(0, 22.5, 'out/review/a-avalanche-compress.mp4', scale);
  await range(21, 34.5, 'out/review/b-flip.mp4', scale);
  await range(33.5, 78, 'out/review/c-gap-conclusion.mp4', scale);
} else if (mode === 'range') {
  await range(Number(process.argv[3]), Number(process.argv[4]), `out/review/${process.argv[5]}.mp4`, Number(process.argv[6] || '0.5'));
} else if (mode === 'full') {
  await range(0, 78, 'out/itsuka-cost-full.mp4', 1);
} else {
  throw new Error(`unknown mode ${mode}`);
}
