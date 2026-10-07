import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile} from 'remotion';
import {Audio} from '@remotion/media';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {H, W} from './lib/anim';
import {C, FONT} from './lib/textures';
import {Scene} from './components/Scene';

// 文字カードのテクスチャはフォント読込後に作るため、読込完了まで描画を待つ
function useFont() {
  const [handle] = useState(() => delayRender('load Noto Sans JP'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const face = new FontFace(FONT, `url(${staticFile('NotoSansJP-wght.ttf')})`, {weight: '100 900'});
    face
      .load()
      .then((f) => {
        document.fonts.add(f);
        return Promise.all([document.fonts.load(`700 40px ${FONT}`), document.fonts.load(`900 40px ${FONT}`)]);
      })
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => {
        // 読めないまま代替フォントで描くと字形が変わるので、描画を失敗させて気づけるようにする
        console.error('font load failed', err);
        throw err;
      });
  }, [handle]);
  return ready;
}

export const Main: React.FC<{audioTrack?: string}> = ({audioTrack = 'bgm.mp3'}) => {
  const ready = useFont();
  return (
    <AbsoluteFill style={{backgroundColor: C.paper}}>
      {ready ? (
        <ThreeCanvas
          width={W}
          height={H}
          shadows={{type: THREE.PCFShadowMap}}
          flat
          gl={{antialias: true, preserveDrawingBuffer: true}}
          camera={{fov: 34, near: 0.1, far: 400, position: [0, 0, 18]}}
        >
          <Scene />
        </ThreeCanvas>
      ) : null}
      <Audio src={staticFile(audioTrack)} />
    </AbsoluteFill>
  );
};
