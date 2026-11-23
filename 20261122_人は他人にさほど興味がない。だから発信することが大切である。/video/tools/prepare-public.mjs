// 企画フォルダの素材（書体・採用動画）を Remotion の public/ へ用意する。原本は変更しない。
import {copyFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const video = fileURLToPath(new URL('../', import.meta.url));
const assets = path.resolve(video, '../assets');
const pub = path.join(video, 'public');
await mkdir(pub, {recursive: true});

const files = [
  ['fonts/NotoSansJP-wght.ttf', 'NotoSansJP-wght.ttf'],
  ['videos/adopted/cut01_paper_stream.mp4', 'cut01_paper_stream.mp4'],
  ['videos/adopted/cut02_one_stops.mp4', 'cut02_one_stops.mp4'],
  ['videos/adopted/cut03_busy_lives.mp4', 'cut03_busy_lives.mp4'],
  ['videos/adopted/cut05_consult.mp4', 'cut05_consult.mp4'],
  ['videos/adopted/cut07_own_words.mp4', 'cut07_own_words.mp4'],
];

for (const [src, dst] of files) {
  try {
    await copyFile(path.join(assets, src), path.join(pub, dst));
  } catch (e) {
    throw new Error(`素材のコピーに失敗: ${src}: ${e.message}`);
  }
}
