// Copy tracked source assets into Remotion's public directory.
import {copyFile, mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const video = fileURLToPath(new URL('../', import.meta.url));
const repo = path.resolve(video, '../..');
const fontDir = path.join(repo, '20261006_エンジニアが機能を作らない開発組織が、いちばん強い/assets/fonts');
const publicDir = path.join(video, 'public');
await mkdir(publicDir, {recursive: true});
await copyFile(path.join(fontDir, 'NotoSansJP-wght.ttf'), path.join(publicDir, 'NotoSansJP-wght.ttf'));
await copyFile(path.join(repo, '20261009_「そんなの、そのうちできるようになる」前にチャレンジすることに価値がある/assets/fonts/NotoSansJP-OFL.txt'), path.join(publicDir, 'NotoSansJP-OFL.txt'));
await copyFile(path.join(repo, 'okady-work-logo.svg'), path.join(publicDir, 'okady-work-logo.svg'));
