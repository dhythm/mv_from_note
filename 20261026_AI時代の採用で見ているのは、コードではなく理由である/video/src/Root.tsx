import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Main';
import {FPS, TOTAL_FRAMES} from './timeline';
import {H, W} from './kit';

export const RemotionRoot: React.FC = () => (
  <>
    {/* 完成版（ナレーション＋BGM） */}
    <Composition id="Main" component={Main} defaultProps={{audioTrack: 'mix.m4a'}} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
    {/* 文字の画面外検査用（node render.mjs check） */}
    <Composition id="Check" component={Main} defaultProps={{check: true}} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
    {/* 映像のみ（確認用） */}
    <Composition id="Silent" component={Main} defaultProps={{}} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
  </>
);
