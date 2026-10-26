// 素材を Remotion の public/ へ用意する。原本は変更しない。
//  - 企画フォルダ ../assets/ の書体・ロゴをコピー
//  - 06 の実写: footage-src/Speed_typing_with_dvorak.webm（Wikimedia Commons・CC0。Git 管理外。取得元と sha256 は ../references.md）
//    から原本 0:09–0:22 を 180° 回転・上部の天板を切り落として 30fps の JPEG コマへ書き出す（kit.tsx の TypingFrame が時刻で選ぶ）
import {copyFile, mkdir, access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const video = fileURLToPath(new URL('../', import.meta.url));
const assets = path.resolve(video, '../assets');
const pub = path.join(video, 'public');
await mkdir(pub, {recursive: true});
for (const [src, dst] of [
  ['fonts/NotoSansJP-wght.ttf', 'NotoSansJP-wght.ttf'],
  ['logo/okady-work-logo.svg', 'okady-work-logo.svg'],
]) await copyFile(path.join(assets, src), path.join(pub, dst));
const exists = (p) => access(p).then(() => true, () => false);
const frames = path.join(pub, 'typing');
if (!(await exists(path.join(frames, 'f390.jpg')))) {
  const src = path.join(video, 'footage-src', 'Speed_typing_with_dvorak.webm');
  if (!(await exists(src))) throw new Error(`実写の原本がありません: ${src}（取得元は ../references.md）`);
  await mkdir(frames, {recursive: true});
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', '9', '-t', '13', '-i', src, '-an', '-vf', 'transpose=2,transpose=2,crop=1280:560:0:160,scale=1120:-2', '-q:v', '3', path.join(frames, 'f%03d.jpg')]);
}
