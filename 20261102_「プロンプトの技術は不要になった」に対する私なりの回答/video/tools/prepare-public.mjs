// 企画フォルダの素材（地層テクスチャ・ロゴ）と書体を Remotion の public/ へ用意する。原本は変更しない。
// 書体は重複を避けて同梱せず、plan.html の指定どおり 20261031 の企画フォルダから参照する。
// 3D の円柱（07）には、テクスチャを不透明度 22% の乗算に相当する明るさへ変換した版（sediment-3d.png）を使う。
import {copyFile, mkdir, stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const video = fileURLToPath(new URL('../', import.meta.url));
const assets = path.resolve(video, '../assets');
const fonts = path.resolve(video, '../../20261031_AIは頭を使わなくなる、と言われるが、以前より頭を使っている/assets/fonts');
const pub = path.join(video, 'public');
await mkdir(pub, {recursive: true});
const files = [
  [path.join(fonts, 'NotoSansJP-wght.ttf'), 'NotoSansJP-wght.ttf'],
  [path.join(assets, 'logo/okady-work-logo.svg'), 'okady-work-logo.svg'],
  [path.join(assets, 'texture/sediment-grain.webp'), 'sediment.webp'],
];
for (const [src, dst] of files) {
  try {
    await copyFile(src, path.join(pub, dst));
  } catch (e) {
    throw new Error(`素材のコピーに失敗: ${src}: ${e.message}`);
  }
}
const exists = async (p) => stat(p).then(() => true, () => false);
const tex3d = path.join(pub, 'sediment-3d.png');
if (!(await exists(tex3d))) {
  try {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', path.join(assets, 'texture/sediment-grain.webp'), '-vf', "format=gray,scale=1024:576,lut=y='255-(255-val)*0.22'", tex3d]);
  } catch (e) {
    throw new Error(`3D 用テクスチャの変換に失敗: ${e.message}`);
  }
}
