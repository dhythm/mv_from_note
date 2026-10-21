// 企画フォルダの素材（書体・ロゴ・写真・手元動画）を Remotion の public/ へコピーする。原本は変更しない。
import {copyFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const video = fileURLToPath(new URL('../', import.meta.url));
const assets = path.resolve(video, '../assets');
const pub = path.join(video, 'public');
await mkdir(pub, {recursive: true});
const files = [
  ['fonts/NotoSansJP-wght.ttf', 'NotoSansJP-wght.ttf'],
  ['fonts/DelaGothicOne-Regular.ttf', 'DelaGothicOne-Regular.ttf'],
  ['fonts/BIZUDPMincho-Regular.ttf', 'BIZUDPMincho-Regular.ttf'],
  ['fonts/DotGothic16-Regular.ttf', 'DotGothic16-Regular.ttf'],
  ['logo/okady-work-logo.svg', 'okady-work-logo.svg'],
  ['photo/hong-kong-skyline-2009.jpg', 'hong-kong.jpg'],
  ['video/typing-closeup-10s.mp4', 'typing.mp4'],
];
for (const [src, dst] of files) await copyFile(path.join(assets, src), path.join(pub, dst));
