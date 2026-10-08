import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Main';
import {FPS, H, TOTAL_FRAMES, W} from './lib/anim';

export const RemotionRoot: React.FC = () => (
  <>
    {/* 完成版: ナレーション＋BGMのミックス */}
    <Composition id="Maintenance" component={Main} defaultProps={{audioTrack: 'mix.m4a'}} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
    {/* 映像のみ（確認用） */}
    <Composition id="MaintenanceSilent" component={Main} defaultProps={{}} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
  </>
);
