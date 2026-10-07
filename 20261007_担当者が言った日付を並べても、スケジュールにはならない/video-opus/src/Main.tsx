import React, {useState} from 'react';
import {AbsoluteFill, Audio, cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {Background} from './components/Background';
import {ensureFont} from './lib/font';
import {SCENE_F} from './lib/music';
import {Scene1} from './scenes/Scene1';
import {Scene2} from './scenes/Scene2';
import {Scene3} from './scenes/Scene3';
import {Scene4} from './scenes/Scene4';
import {Scene5} from './scenes/Scene5';
import {Scene6} from './scenes/Scene6';
import {Scene7} from './scenes/Scene7';
import {Scene8} from './scenes/Scene8';

export const Main: React.FC = () => {
  const [handle] = useState(() => delayRender('load-font'));
  const [ready, setReady] = useState(false);
  React.useEffect(() => {
    ensureFont()
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((e) => cancelRender(e));
  }, [handle]);

  const seg = (i: number) => ({g0: SCENE_F[i], dur: SCENE_F[i + 1] - SCENE_F[i]});

  return (
    <AbsoluteFill>
      <Background />
      <Audio src={staticFile('bgm.mp3')} volume={0.72} />
      {ready && (
        <>
          <Scene1 {...seg(0)} />
          <Scene2 {...seg(1)} />
          <Scene3 {...seg(2)} />
          <Scene4 {...seg(3)} />
          <Scene5 {...seg(4)} />
          <Scene6 {...seg(5)} />
          <Scene7 {...seg(6)} />
          <Scene8 {...seg(7)} />
        </>
      )}
    </AbsoluteFill>
  );
};
