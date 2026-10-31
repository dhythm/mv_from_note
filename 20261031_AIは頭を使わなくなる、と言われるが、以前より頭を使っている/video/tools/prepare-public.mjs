// 企画フォルダの素材（書体・ロゴ・素材動画 3 本）を Remotion の public/ へ用意する。原本は変更しない。
// 素材動画は plan.html の使用区間で切り出し、共通参照画像（assets/reference/common_room-lamp_style-ref.webp）の
// 色の平均に合わせてチャンネルごとの倍率をかける（y30 の色合わせ。倍率は README の「素材の使い方」）。
import {copyFile, mkdir, stat} from 'node:fs/promises';
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
];
for (const [src, dst] of files) await copyFile(path.join(assets, src), path.join(pub, dst));

// [原本, 出力, 開始秒, 長さ秒, R, G, B の倍率]
const clips = [
  ['footage/cut04-lamp-floor-tiles.mp4', 'f04.mp4', 0.75, 7, 1.029, 1.037, 1.035],
  ['footage/cut07-tiles-rush.mp4', 'f07.mp4', 1.5, 4, 1.03, 1.06, 1.09],
  ['footage/cut10-lit-floor-crane.mp4', 'f10.mp4', 0, 8.04, 0.985, 0.99, 0.99],
];
const exists = async (p) => stat(p).then(() => true, () => false);
for (const [src, dst, ss, dur, r, g, b] of clips) {
  const out = path.join(pub, dst);
  if (await exists(out)) continue;
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(ss), '-i', path.join(assets, src), '-t', String(dur), '-an',
      '-vf', `colorchannelmixer=rr=${r}:gg=${g}:bb=${b}`, '-c:v', 'libx264', '-crf', '12', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-g', '12', out]);
  } catch (e) {
    throw new Error(`素材動画の準備に失敗: ${src}: ${e.message}`);
  }
}
