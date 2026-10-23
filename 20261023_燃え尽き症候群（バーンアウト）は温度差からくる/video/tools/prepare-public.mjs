// 企画フォルダの素材（書体・ロゴ・ろうそくの実写）を Remotion の public/ へコピーする。原本は変更しない。
import {copyFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const video = fileURLToPath(new URL('../', import.meta.url));
const assets = path.resolve(video, '../assets');
const pub = path.join(video, 'public');
await mkdir(pub, {recursive: true});
const files = [
  ['fonts/NotoSansJP-wght.ttf', 'NotoSansJP-wght.ttf'],
  ['logo/okady-work-logo.svg', 'okady-work-logo.svg'],
  ['footage/white-candle-02-07.mp4', 'candle.mp4'],
];
for (const [src, dst] of files) await copyFile(path.join(assets, src), path.join(pub, dst));
