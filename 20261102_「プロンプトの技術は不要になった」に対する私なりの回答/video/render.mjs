import './tools/prepare-public.mjs';
// 書き出し: node render.mjs <mode> ...
//   stills <scale> <t1,t2,...>             指定秒のスチル out/review/still_<t>.png
//   range <S> <E> <name> [scale] [audio]   区間の動画 out/review/<name>.mp4（audio=1 で音声つき）
//   full                                   全編 out/final.mp4
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const mode = process.argv[2] || 'stills';
const FPS = 30;
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), outDir: path.resolve('.remotion/bundle')});
const chromiumOptions = {gl: 'angle'};
const pick = (id) => selectComposition({serveUrl, id, chromiumOptions});
fs.mkdirSync('out/review', {recursive: true});
const log = (m) => console.log(`[render] ${m}`);

async function range(s, e, out, scale, withAudio) {
  const composition = await pick(withAudio ? 'Main' : 'Silent');
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    chromiumOptions,
    timeoutInMilliseconds: 240000,
    codec: 'h264',
    crf: 17,
    audioCodec: 'aac',
    audioBitrate: '256k',
    scale,
    concurrency: Number(process.env.CONC || 6),
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
  const composition = await pick('Silent');
  const scale = Number(process.argv[3] || '0.5');
  const times = (process.argv[4] || '1').split(',').map(Number);
  for (const t of times) {
    const name = `still_${String(t).replace('.', '_')}`;
    await renderStill({composition, serveUrl, chromiumOptions, scale, frame: Math.min(composition.durationInFrames - 1, Math.round(t * FPS)), output: `out/review/${name}.png`, timeoutInMilliseconds: 240000});
  }
  log(`stills ${times.length}`);
} else if (mode === 'range') {
  await range(Number(process.argv[3]), Number(process.argv[4]), `out/review/${process.argv[5]}.mp4`, Number(process.argv[6] || '0.5'), process.argv[7] === '1');
} else if (mode === 'check') {
  // 文字の画面外検査: カットの切り替え（境目の前 0.5 秒）を除き、step 秒ごとに見る
  const step = Number(process.argv[3] || '0.25');
  const composition = await pick('Check');
  const tl = JSON.parse(fs.readFileSync('src/timeline.json', 'utf8'));
  const bounds = [];
  let s = 0;
  for (const c of tl.cuts) bounds.push((s += c.dur));
  const lines = [];
  for (let t = 0; t < bounds[bounds.length - 1]; t += step) {
    if (bounds.some((b) => t > b - 0.55 && t < b + 0.02)) continue;
    await renderStill({composition, serveUrl, chromiumOptions, scale: 0.25, frame: Math.round(t * FPS), output: 'out/review/_check.png', timeoutInMilliseconds: 240000,
      onBrowserLog: (l) => { if (l.text.startsWith('BOUNDS') && l.text.trim().split(' ').length > 2) lines.push(`${t.toFixed(2)}s ${l.text}`); }});
  }
  fs.writeFileSync('out/bounds.log', lines.join('\n') + '\n');
  log(`issues ${lines.length} -> out/bounds.log`);
} else if (mode === 'full') {
  const composition = await pick('Main');
  await range(0, composition.durationInFrames / FPS + 1, 'out/final.mp4', 1, true);
} else {
  throw new Error(`unknown mode ${mode}`);
}
