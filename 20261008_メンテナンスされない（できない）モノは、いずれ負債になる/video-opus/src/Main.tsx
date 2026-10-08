import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, interpolate, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {ThreeCanvas} from '@remotion/three';
import {H, TOTAL_FRAMES, W} from './lib/anim';
import {FONT} from './lib/glyphs';
import {Scene} from './components/Scene';

// 文字のテクスチャはフォント読込後に作るため、読込完了まで描画を待つ
function useFont() {
  const [handle] = useState(() => delayRender('load Noto Sans JP'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const face = new FontFace(FONT, `url(${staticFile('NotoSansJP-wght.ttf')})`, {weight: '100 900'});
    face
      .load()
      .then((f) => {
        document.fonts.add(f);
        return Promise.all([document.fonts.load(`700 40px ${FONT}`), document.fonts.load(`900 40px ${FONT}`), document.fonts.load(`800 40px ${FONT}`)]);
      })
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => {
        // 代替フォントで描くと字形が変わるので、描画を失敗させて気づけるようにする
        console.error('font load failed', err);
        throw err;
      });
  }, [handle]);
  return ready;
}

export const Main: React.FC<{audioTrack?: string}> = ({audioTrack}) => {
  const ready = useFont();
  const frame = useCurrentFrame();
  // 終わりは流れを止めずに暗くなる
  const fade = interpolate(frame, [TOTAL_FRAMES - 36, TOTAL_FRAMES - 1], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <AbsoluteFill style={{backgroundColor: '#061018'}}>
      {ready ? (
        <ThreeCanvas width={W} height={H} gl={{antialias: true, preserveDrawingBuffer: true}} camera={{fov: 38, near: 0.1, far: 700, position: [0, 2, 14]}}>
          <Scene />
        </ThreeCanvas>
      ) : null}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.42) 100%)', pointerEvents: 'none'}} />
      <AbsoluteFill style={{backgroundColor: '#03080c', opacity: fade}} />
      {audioTrack ? <Audio src={staticFile(audioTrack)} /> : null}
    </AbsoluteFill>
  );
};
