import {loadFont} from '@remotion/fonts';
import {staticFile} from 'remotion';
import {FONT} from './theme';

// ローカル同梱の Noto Sans JP 可変フォントを読み込む（public/）。
let loaded: Promise<void> | null = null;
export const ensureFont = () => {
  if (!loaded) {
    loaded = loadFont({
      family: FONT,
      url: staticFile('NotoSansJP-wght.ttf'),
      weight: '400 900',
    }).then(() => undefined);
  }
  return loaded;
};
