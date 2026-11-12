// 企画フォルダの素材（書体・ロゴ・地図・紙・十字キー）を Remotion の public/ へ用意する。原本は変更しない。
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
  ['images/rpg-map.png', 'rpg-map.png'],
  ['images/map-paper-curl.png', 'map-paper-curl.png'],
  ['images/dpad-neutral.png', 'dpad-neutral.png'],
  ['images/dpad-up.png', 'dpad-up.png'],
  ['images/dpad-right.png', 'dpad-right.png'],
];
for (const [src, dst] of files) {
  try {
    await copyFile(path.join(assets, src), path.join(pub, dst));
  } catch (e) {
    throw new Error(`素材のコピーに失敗: ${src}: ${e.message}`);
  }
}
