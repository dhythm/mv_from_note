// 企画フォルダの素材（書体・ロゴ・07〜09 の採用イラスト）を Remotion の public/ へ用意する。原本は変更しない。
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
  ['broll/family-time.webp', 'family-time.webp'],
  ['broll/rest-before-exhaustion.webp', 'rest-before-exhaustion.webp'],
  ['broll/drink-in-moderation.webp', 'drink-in-moderation.webp'],
];
for (const [src, dst] of files) {
  try {
    await copyFile(path.join(assets, src), path.join(pub, dst));
  } catch (e) {
    throw new Error(`素材のコピーに失敗: ${src}: ${e.message}`);
  }
}
