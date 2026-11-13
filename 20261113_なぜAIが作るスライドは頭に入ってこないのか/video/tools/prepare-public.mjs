// 企画フォルダの素材（書体・本人資料の一覧 4 枚）を Remotion の public/ へ用意する。原本は変更しない。
// 採用ページの拡大用の切り出し（public/page-*.png）は tools/crops.py が作る。
import {copyFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const video = fileURLToPath(new URL('../', import.meta.url));
const assets = path.resolve(video, '../assets');
const pub = path.join(video, 'public');
await mkdir(pub, {recursive: true});
const files = [
  ['fonts/NotoSansJP-wght.ttf', 'NotoSansJP-wght.ttf'],
  ['source/2026-11-07_14-53-52.webp', 'ov-claude-pres.webp'],
  ['source/2026-11-07_14-54-08.webp', 'ov-gpt-pres.webp'],
  ['source/2026-11-07_14-53-59.webp', 'ov-claude-doc.webp'],
  ['source/2026-11-07_14-52-40.webp', 'ov-gpt-doc.webp'],
];
for (const [src, dst] of files) {
  try {
    await copyFile(path.join(assets, src), path.join(pub, dst));
  } catch (e) {
    throw new Error(`素材のコピーに失敗: ${src}: ${e.message}`);
  }
}
