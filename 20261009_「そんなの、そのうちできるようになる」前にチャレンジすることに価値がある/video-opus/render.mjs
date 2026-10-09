// 書き出し: node render.mjs <mode> ...
//   stills <scale> <t1,t2,...>             指定秒のスチル out/review/still_<t>.png
//   range <S> <E> <name> [scale] [audio]   区間の動画 out/review/<name>.mp4（audio=1 で BGM つき）
//   check <S> <E> <step>                   文字の画面外・重なり検査（ログを out/bounds-<S>-<E>.log）
//   full                                   全編 out/challenge-full.mp4
import {bundle} from '@remotion/bundler';
import {renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import fs from 'node:fs';

const mode = process.argv[2] || 'stills';
const FPS = 30;
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts'), outDir: path.resolve('.remotion/bundle')});
const chromiumOptions = {gl: 'angle'};
const pick = (id, inputProps = {}) => selectComposition({serveUrl, id, chromiumOptions, inputProps});
fs.mkdirSync('out/review', {recursive: true});
const log = (m) => console.log(`[render] ${m}`);

async function range(s, e, out, scale, withAudio) {
  const composition = await pick(withAudio ? 'Challenge' : 'ChallengeSilent');
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
  const composition = await pick('ChallengeSilent');
  const scale = Number(process.argv[3] || '0.5');
  const times = (process.argv[4] || '1').split(',').map(Number);
  for (const t of times) {
    const name = `still_${String(t).replace('.', '_')}`;
    await renderStill({composition, serveUrl, chromiumOptions, scale, frame: Math.min(composition.durationInFrames - 1, Math.round(t * FPS)), output: `out/review/${name}.png`, timeoutInMilliseconds: 240000});
    log(`still ${name}`);
  }
} else if (mode === 'range') {
  await range(Number(process.argv[3]), Number(process.argv[4]), `out/review/${process.argv[5]}.mp4`, Number(process.argv[6] || '0.5'), process.argv[7] === '1');
} else if (mode === 'check') {
  const s = Number(process.argv[3]);
  const e = Number(process.argv[4]);
  const step = Number(process.argv[5] || '0.5');
  const composition = await pick('ChallengeCheck');
  const lines = [];
  for (let t = s; t < e; t += step) {
    const frame = Math.min(composition.durationInFrames - 1, Math.round(t * FPS));
    await renderStill({
      composition,
      serveUrl,
      chromiumOptions,
      scale: 0.25,
      frame,
      output: `out/review/_check.png`,
      timeoutInMilliseconds: 240000,
      onBrowserLog: (l) => {
        if (/^(BOUNDS|OVERLAP|CHECKED|FONTMISSING)/.test(l.text)) lines.push(l.text);
      },
    });
  }
  const out = `out/bounds-${s}-${e}.log`;
  fs.writeFileSync(out, lines.join('\n') + '\n');
  const bad = lines.filter((l) => !l.startsWith('CHECKED'));
  log(`checked ${lines.filter((l) => l.startsWith('CHECKED')).length} frames, issues ${bad.length} -> ${out}`);
} else if (mode === 'full') {
  const composition = await pick('Challenge');
  await range(0, composition.durationInFrames / FPS + 1, 'out/challenge-full.mp4', 1, true);
} else {
  throw new Error(`unknown mode ${mode}`);
}
