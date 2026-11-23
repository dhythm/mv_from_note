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
  ...['cut01_report', 'cut02_marbles', 'cut03_sorter', 'cut04_needle', 'cut05_gap', 'cut06_line', 'cut07_together'].map((n) => [`videos/adopted/${n}.mp4`, `${n}.mp4`]),
];

for (const [src, dst] of files) {
  try {
    await copyFile(path.join(assets, src), path.join(pub, dst));
  } catch (e) {
    throw new Error(`素材のコピーに失敗: ${src}: ${e.message}`);
  }
}
