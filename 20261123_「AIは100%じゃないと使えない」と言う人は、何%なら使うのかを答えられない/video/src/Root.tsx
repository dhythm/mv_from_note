import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Main';
import {H, W} from './kit';
import {FPS, TOTAL_FRAMES} from './timeline';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Main" component={Main} defaultProps={{audioTrack: 'mix.m4a'}} width={W} height={H} fps={FPS} durationInFrames={TOTAL_FRAMES} />
    <Composition id="Silent" component={Main} defaultProps={{}} width={W} height={H} fps={FPS} durationInFrames={TOTAL_FRAMES} />
    <Composition id="Check" component={Main} defaultProps={{check: true}} width={W} height={H} fps={FPS} durationInFrames={TOTAL_FRAMES} />
  </>
);
