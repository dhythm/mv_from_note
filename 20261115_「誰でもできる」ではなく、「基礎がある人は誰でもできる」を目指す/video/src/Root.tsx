import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Main';
import {FPS, TOTAL_FRAMES} from './timeline';
import {H, W} from './kit';

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Main" component={Main} defaultProps={{audioTrack: 'mix.m4a'}} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Silent" component={Main} defaultProps={{}} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
    <Composition id="Check" component={Main} defaultProps={{check: true}} durationInFrames={TOTAL_FRAMES} fps={FPS} width={W} height={H} />
  </>
);
