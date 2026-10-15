// 全編: 本編 0–189.5 秒は three.js の舞台（カット1–15）、189.5–195 秒はエンドロゴ（カット16）。
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {ThreeCanvas} from '@remotion/three';
import {FPS, H, LOGO_START, W} from './lib/anim';
import {specAt} from './cuts';
import {D, FOV, Stage} from './components/stage';
import {FONT} from './components/prims';
import {LOGO_BG, Logo} from './components/Logo';

// 書体を読み込むまで描画しない（代替フォントで描かない）
function useFonts() {
  const [handle] = useState(() => delayRender('load fonts'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const face = new FontFace(FONT, `url(${staticFile('NotoSansJP-wght.ttf')})`, {weight: '100 900'});
    face
      .load()
      .then((f) => {
        document.fonts.add(f);
        return Promise.all([document.fonts.load(`800 40px ${FONT}`, '球持ち'), document.fonts.load(`900 40px ${FONT}`, '球持ち')]);
      })
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle]);
  return ready;
}

export const Main: React.FC<{audioTrack?: string; check?: boolean}> = ({audioTrack, check}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const ready = useFonts();
  const logo = t >= LOGO_START;
  if (typeof window !== 'undefined') (window as unknown as {__CHECK?: boolean}).__CHECK = !!check;
  return (
    <AbsoluteFill style={{backgroundColor: '#0a1520'}}>
      {ready && !logo ? (
        <ThreeCanvas width={W} height={H} flat gl={{antialias: true, preserveDrawingBuffer: true}} camera={{fov: FOV, near: 1, far: 30000, position: [0, 0, D]}}>
          <Stage spec={specAt(frame)} t={t} />
        </ThreeCanvas>
      ) : null}
      {logo ? (
        <AbsoluteFill style={{backgroundColor: LOGO_BG, alignItems: 'center', justifyContent: 'center'}}>
          <Logo tau={t - LOGO_START} width={1500} />
        </AbsoluteFill>
      ) : null}
      {audioTrack ? <Audio src={staticFile(audioTrack)} /> : null}
    </AbsoluteFill>
  );
};
