import {bundle} from '@remotion/bundler';
import {getCompositions, renderMedia, renderStill} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

// Usage:
//   node render.mjs proto            -> 3 review segments (scenes 1-2, 5-6, 7-8) at scale 0.5
//   node render.mjs stills           -> one still per scene (scale 0.5)
//   node render.mjs range S E name [scale]
//   node render.mjs still F name [scale]
//   node render.mjs full [scale]     -> whole video
const mode = process.argv[2] || 'proto';

const serveUrl = await bundle({
  entryPoint: path.resolve('src/index.ts'),
  outDir: path.resolve('.remotion/bundle'),
});
const composition = (await getCompositions(serveUrl)).find((c) => c.id === 'Schedule');
if (!composition) throw new Error('composition Schedule not found');
const common = {composition, serveUrl, concurrency: 4};
fs.mkdirSync('out/review', {recursive: true});

const log = (m) => console.log(`[render] ${m}`);

if (mode === 'proto') {
  const segs = [
    ['opening', [0, 1140]],   // 場面1→2 冒頭〜右ずらし
    ['split', [2760, 3900]],  // 場面5→6 分割〜期限の問い
    ['ending', [4350, 5939]], // 場面7→8 比較〜結論
  ];
  for (const [name, frameRange] of segs) {
    log(`segment ${name} ${frameRange}`);
    await renderMedia({
      ...common,
      codec: 'h264',
      crf: 20,
      scale: 0.5,
      outputLocation: `out/review/${name}.mp4`,
      frameRange,
    });
    log(`done ${name}`);
  }
} else if (mode === 'stills') {
  const frames = [
    ['s1', 270], ['s2', 840], ['s3', 1500], ['s4', 2340],
    ['s5', 3240], ['s6', 4035], ['s7', 4845], ['s8', 5640],
  ];
  for (const [name, frame] of frames) {
    await renderStill({...common, scale: 0.5, frame, output: `out/review/${name}.png`});
    log(`still ${name}@${frame}`);
  }
} else if (mode === 'range') {
  const s = Number(process.argv[3]);
  const e = Number(process.argv[4]);
  const name = process.argv[5] || `range_${s}_${e}`;
  const scale = Number(process.argv[6] || '0.5');
  log(`range ${s}-${e} scale ${scale}`);
  await renderMedia({
    ...common, codec: 'h264', crf: 20, scale,
    outputLocation: `out/review/${name}.mp4`, frameRange: [s, e],
  });
  log(`done ${name}`);
} else if (mode === 'still') {
  const f = Number(process.argv[3]);
  const name = process.argv[4] || `still_${f}`;
  const scale = Number(process.argv[5] || '0.5');
  await renderStill({...common, scale, frame: f, output: `out/review/${name}.png`});
  log(`still ${name}@${f}`);
} else if (mode === 'full') {
  const scale = Number(process.argv[3] || '1');
  let last = -1;
  await renderMedia({
    ...common, codec: 'h264', crf: 18, scale,
    outputLocation: 'out/schedule-full.mp4',
    onProgress: ({progress}) => {
      const p = Math.floor(progress * 20);
      if (p !== last) {last = p; log(`full ${p * 5}%`);}
    },
  });
  log('done full');
} else {
  throw new Error(`unknown mode ${mode}`);
}
