import './tools/prepare-public.mjs';
// 書き出し: node render.mjs <mode> ...
//   stills <scale> <t1,t2,...>             指定秒のスチル out/review/still_<t>.png
//   range <S> <E> <name> [scale]           区間の動画 out/review/<name>.mp4
//   check [step] [from] [to]               文字の検査 out/bounds.log（範囲指定時は out/bounds-<from>-<to>.log）
//   full [scale]                           全編（ナレーション＋BGM） out/final.mp4
//   silent [scale]                         全編（映像のみ） out/preview.mp4
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const mode = process.argv[2] || 'stills';
const FPS = 30;
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), outDir: path.resolve(process.env.BUNDLE_DIR || '.remotion/bundle')});
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
  // 文字の検査（安全域・図との重なり・文字どうし）: step 秒ごと＋カットの境目の前後
  const step = Number(process.argv[3] || '0.25');
  const composition = await pick('Check');
  const tl = JSON.parse(fs.readFileSync('src/timeline.json', 'utf8'));
  const times = new Set();
  let s = 0;
  for (const c of tl.cuts) {
    for (const d of [-0.2, -0.1, 0, 0.1, 0.2, 0.3, 0.4]) if (s + d >= 0) times.add(Math.round((s + d) * FPS));
    s += c.dur;
  }
  for (let t = 0; t < s; t += step) times.add(Math.round(t * FPS));
  // 範囲指定（秒）: node render.mjs check 0.1 58 66 → out/bounds-58-66.log
  const from = Number(process.argv[4] ?? 0);
  const to = Number(process.argv[5] ?? 1e9);
  const frames = [...times].sort((a, b) => a - b).filter((f) => f >= from * FPS && f <= to * FPS);
  const outLog = process.argv[4] ? `out/bounds-${from}-${to}.log` : 'out/bounds.log';
  const lines = [];
  for (const f of frames) {
    await renderStill({composition, serveUrl, chromiumOptions, scale: 0.25, frame: f, output: 'out/review/_check.png', timeoutInMilliseconds: 240000,
      onBrowserLog: (l) => { if (l.text.startsWith('BOUNDS') && l.text.trim().split(' ').length > 2) lines.push(`${(f / FPS).toFixed(2)}s ${l.text}`); }});
  }
  fs.writeFileSync(outLog, lines.join('\n') + '\n');
  const real = lines.filter((l) => / (edge|fig|text):/.test(l));
  log(`frames ${frames.length} / 欠陥の候補 ${real.length} / 移動中のみ ${lines.length - real.length} -> ${outLog}`);
} else if (mode === 'full' || mode === 'silent') {
  const composition = await pick('Silent');
  await range(0, composition.durationInFrames / FPS + 1, mode === 'full' ? 'out/final.mp4' : 'out/preview.mp4', Number(process.argv[3] || '1'), mode === 'full');
} else {
  throw new Error(`unknown mode ${mode}`);
}
