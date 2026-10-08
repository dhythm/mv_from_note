import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

// 使い方:
//   node render.mjs stills [scale] [t1,t2,...]        -> 指定秒のスチル out/review/still_*.png
//   node render.mjs range S E name [scale] [audio]     -> 秒で区間指定（audio=1 で音声つき）
//   node render.mjs proto [scale]                      -> 試作3区間 (a)1〜3 (b)4 (c)9〜10（音声つき）
//   node render.mjs full                               -> 全編 out/maintenance-full.mp4
const mode = process.argv[2] || 'stills';
const FPS = 30;

const serveUrl = await bundle({
  entryPoint: path.resolve('src/index.ts'),
  outDir: path.resolve('.remotion/bundle'),
});
const chromiumOptions = {gl: 'angle'};
const pick = async (id) => selectComposition({serveUrl, id, chromiumOptions});
fs.mkdirSync('out/review', {recursive: true});
const log = (m) => console.log(`[render] ${m}`);

async function range(s, e, out, scale, withAudio) {
  const composition = await pick(withAudio ? 'Maintenance' : 'MaintenanceSilent');
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    chromiumOptions,
    timeoutInMilliseconds: 180000,
    codec: 'h264',
    crf: 18,
    scale,
    concurrency: Number(process.env.CONC || 4),
    outputLocation: out,
    frameRange: [Math.round(s * FPS), Math.min(composition.durationInFrames - 1, Math.round(e * FPS) - 1)],
    muted: !withAudio,
    onProgress: ({progress}) => {
      const p = Math.floor(progress * 10);
      if (p !== last) {
        last = p;
        log(`${path.basename(out)} ${p * 10}%`);
      }
    },
  });
  log(`done ${out}`);
}

if (mode === 'stills') {
  const composition = await pick('MaintenanceSilent');
  const scale = Number(process.argv[3] || '0.5');
  const times = (process.argv[4] || '1,3,5,7,9,12,15,18,19.5,21,22.5').split(',').map(Number);
  for (const t of times) {
    const name = `still_${String(t).replace('.', '_')}`;
    await renderStill({composition, serveUrl, chromiumOptions, scale, frame: Math.min(composition.durationInFrames - 1, Math.round(t * FPS)), output: `out/review/${name}.png`, timeoutInMilliseconds: 180000});
    log(`still ${name}`);
  }
} else if (mode === 'proto') {
  const scale = Number(process.argv[3] || '1');
  const tl = JSON.parse(fs.readFileSync('src/lib/timeline.json', 'utf8'));
  const c = (n) => tl.cuts[n - 1];
  await range(0, c(4).start + 1.5, 'out/review/proto-a-cut01-03.mp4', scale, true);
  await range(c(4).start - 1, c(5).start + 1, 'out/review/proto-b-cut04.mp4', scale, true);
  await range(c(9).start - 1, tl.total, 'out/review/proto-c-cut09-10.mp4', scale, true);
} else if (mode === 'range') {
  await range(Number(process.argv[3]), Number(process.argv[4]), `out/review/${process.argv[5]}.mp4`, Number(process.argv[6] || '0.5'), process.argv[7] === '1');
} else if (mode === 'full') {
  const tl = JSON.parse(fs.readFileSync('src/lib/timeline.json', 'utf8'));
  await range(0, tl.total + 1, 'out/maintenance-full.mp4', 1, true);
} else {
  throw new Error(`unknown mode ${mode}`);
}
