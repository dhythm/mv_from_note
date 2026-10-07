import React from 'react';
import {Composition} from 'remotion';
import {Main} from './Main';
import {FPS, H, W} from './lib/theme';
import {TOTAL} from './lib/music';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition id="Schedule" component={Main} durationInFrames={TOTAL} fps={FPS} width={W} height={H} />
  );
};
