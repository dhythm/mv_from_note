// 検査用: 原本 SVG の CSS アニメーションを Chrome で各時刻に止めた画と、Logo.tsx の翻訳の画を同じ大きさで描く。
// tools/logo_compare.mjs が両者の差を測る。本編では使わない。
import React, {useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {FPS} from '../lib/anim';
import {Logo} from './Logo';

const WIDTH = 1100;

export const LogoCompare: React.FC<{which: 'orig' | 'mine'}> = ({which}) => {
  const frame = useCurrentFrame();
  const tau = frame / FPS;
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [handle] = useState(() => (which === 'orig' ? delayRender('load svg') : null));
  useLayoutEffect(() => {
    if (which !== 'orig') return;
    fetch(staticFile('okady-work-logo.svg'))
      .then((r) => r.text())
      .then((s) => setSvg(s.replace('<svg width="1250" height="400"', `<svg width="${WIDTH}" height="${(WIDTH * 400) / 1250}" style="overflow:visible"`)))
      .catch((e) => {
        throw e;
      });
  }, [which]);
  useLayoutEffect(() => {
    if (which !== 'orig' || !svg || !ref.current) return;
    const el = ref.current.querySelector('svg');
    if (!el) return;
    for (const a of el.getAnimations({subtree: true})) {
      a.pause();
      a.currentTime = tau * 1000;
    }
    if (handle !== null) continueRender(handle);
  }, [svg, tau, which, handle]);
  return (
    <AbsoluteFill style={{backgroundColor: '#d2ff1a', alignItems: 'center', justifyContent: 'center'}}>
      {which === 'mine' ? <Logo tau={tau} width={WIDTH} /> : <div ref={ref} dangerouslySetInnerHTML={{__html: svg ?? ''}} style={{lineHeight: 0}} />}
    </AbsoluteFill>
  );
};
