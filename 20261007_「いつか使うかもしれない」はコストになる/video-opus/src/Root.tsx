import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Main';
import {FPS, H, TOTAL_FRAMES, W} from './lib/anim';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="ItsukaCost" component={Main} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="ItsukaCostNarrated" component={Main} defaultProps={{audioTrack: 'narrated-mix-v4-synced.m4a'}} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
  </>
);
