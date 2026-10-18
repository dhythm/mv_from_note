// v2 全編: タイポグラフィー中心（DOM／CSS）。148 秒からエンドロゴ。
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {C, FPS, LOGO_START} from '../lib/anim';
import {FONT} from '../components/prims';
import {LOGO_BG, Logo} from '../components/Logo';
import {scene1, scene2, scene3} from './scenes1';

function useFonts() {
  const [handle] = useState(() => delayRender('load fonts'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const face = new FontFace(FONT, `url(${staticFile('NotoSansJP-wght.ttf')})`, {weight: '100 900'});
    face
      .load()
      .then((f) => {
        document.fonts.add(f);
        return Promise.all([document.fonts.load(`900 40px ${FONT}`, '上司が読んでも通じますか？'), document.fonts.load(`800 40px ${FONT}`, '資料')]);
      })
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle]);
  return ready;
}

const SCENES: [number, number, (t: number) => React.ReactNode][] = [
  [0, 8, scene1],
  [8, 15, scene2],
  [15, 22, scene3],
];

export const Main2: React.FC<{audioTrack?: string}> = ({audioTrack}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const ready = useFonts();
  const logo = t >= LOGO_START;
  const sc = SCENES.find(([a, b]) => t >= a && t < b);
  return (
    <AbsoluteFill style={{backgroundColor: C.bg, overflow: 'hidden'}}>
      {ready && !logo && sc ? sc[2](t) : null}
      {logo ? (
        <AbsoluteFill style={{backgroundColor: LOGO_BG, alignItems: 'center', justifyContent: 'center'}}>
          <Logo tau={t - LOGO_START} width={1500} />
        </AbsoluteFill>
      ) : null}
      {audioTrack ? <Audio src={staticFile(audioTrack)} /> : null}
    </AbsoluteFill>
  );
};
