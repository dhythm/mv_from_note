// 企画フォルダの素材（書体・ロゴ・05 の模擬画面と手元動画）を Remotion の public/ へ用意する。原本は変更しない。
import {copyFile, mkdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const video = fileURLToPath(new URL('../', import.meta.url));
const assets = path.resolve(video, '../assets');
const pub = path.join(video, 'public');
await mkdir(pub, {recursive: true});
const files = [
  ['fonts/NotoSansJP-wght.ttf', 'NotoSansJP-wght.ttf'],
  ['logo/okady-work-logo.svg', 'okady-work-logo.svg'],
  ['footage/cut05-manual-transfer-ui.mp4', 'ui.mp4'],
  ['footage/cut05-hand-mouse-4s.mp4', 'hand.mp4'],
];
for (const [src, dst] of files) {
  try {
    await copyFile(path.join(assets, src), path.join(pub, dst));
  } catch (e) {
    throw new Error(`素材のコピーに失敗: ${src}: ${e.message}`);
  }
}
// 05 の模擬画面の最初と最後のコマ（動画の前後で窓が開く・閉じる間に使う）
try {
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(pub, 'ui.mp4'), '-vframes', '1', path.join(pub, 'ui-first.png')]);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-sseof', '-0.05', '-i', path.join(pub, 'ui.mp4'), '-vframes', '1', path.join(pub, 'ui-last.png')]);
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-sseof', '-0.05', '-i', path.join(pub, 'hand.mp4'), '-vframes', '1', path.join(pub, 'hand-last.png')]);
} catch (e) {
  throw new Error(`模擬画面のコマの書き出しに失敗: ${e.message}`);
}
