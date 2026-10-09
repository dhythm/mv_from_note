import React, {useEffect, useState} from 'react';
import * as THREE from 'three';
import {AbsoluteFill, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {ThreeCanvas} from '@remotion/three';
import {FPS, H, W, clamp, ease, hash, lerp, prog} from './lib/anim';
import timeline from './lib/timeline.json';
import {Scene} from './components/Scene';
import {Texts} from './components/Texts';
import {LOGO_BG, Logo} from './components/Logo';
import {BoundsCheck} from './components/BoundsCheck';

const LOGO_START = timeline.logoStart;

// 書体3種と字形マスクを読み込むまで描画を待つ（代替フォントで描かない）
function useAssets() {
  const [handle] = useState(() => delayRender('load fonts and mask'));
  const [mask, setMask] = useState<THREE.Texture | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const faces = [
      new FontFace('NotoJP', `url(${staticFile('NotoSansJP-wght.ttf')})`, {weight: '100 900'}),
      new FontFace('BIZMincho', `url(${staticFile('BIZUDPMincho-Regular.ttf')})`),
      new FontFace('Dot16', `url(${staticFile('DotGothic16-Regular.ttf')})`),
    ];
    const fonts = Promise.all(faces.map((f) => f.load())).then((loaded) => {
      loaded.forEach((f) => document.fonts.add(f));
      return Promise.all([
        document.fonts.load('900 40px NotoJP', '経験'),
        document.fonts.load('800 40px NotoJP', '経験'),
        document.fonts.load('400 40px BIZMincho', '技術'),
        document.fonts.load('400 40px Dot16', '99%'),
      ]);
    });
    const tex = new Promise<THREE.Texture>((resolve, reject) => {
      new THREE.TextureLoader().load(staticFile('experience-mask.png'), resolve, undefined, reject);
    });
    Promise.all([fonts, tex])
      .then(([, m]) => {
        m.colorSpace = THREE.NoColorSpace;
        m.minFilter = THREE.LinearMipmapLinearFilter;
        m.anisotropy = 4;
        setMask(m);
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => {
        console.error('asset load failed', err);
        throw err;
      });
  }, [handle]);
  return {ready, mask};
}

// カット10の終わり: 字の発光からロゴの背景色へ、刷毛で塗るように左下から右上へ
function Wipe({t}: {t: number}) {
  const k = prog(t, 116.95, 117.95);
  if (k <= 0) return null;
  if (k >= 1) return <AbsoluteFill style={{backgroundColor: LOGO_BG}} />;
  const e = ease.inOut(k);
  // 方向 (1,-0.55) に垂直な線が画面を横切る。縁は固定seedのギザギザと筋
  const dx = 1;
  const dy = -0.55;
  const L = Math.hypot(dx, dy);
  const ux = dx / L;
  const uy = dy / L;
  const span = Math.abs(W * ux) + Math.abs(H * uy) + 400;
  const front = -200 + e * span;
  const ox = 0;
  const oy = H;
  const px = -uy;
  const py = ux;
  const pts: string[] = [];
  const N = 60;
  for (let i = 0; i <= N; i++) {
    const s = lerp(-1400, 1400, i / N);
    const jag = (hash(i * 3.7) - 0.5) * 60 + (i % 3 === 0 ? hash(i) * 120 : 0);
    const f = front + jag;
    pts.push(`${ox + ux * f + px * s},${oy + uy * f + py * s}`);
  }
  const back = front - span - 600;
  pts.push(`${ox + ux * back + px * 1400},${oy + uy * back + py * 1400}`);
  pts.push(`${ox + ux * back - px * 1400},${oy + uy * back - py * 1400}`);
  return (
    <AbsoluteFill>
      <svg width={W} height={H}>
        <polygon points={pts.join(' ')} fill={LOGO_BG} />
      </svg>
    </AbsoluteFill>
  );
}

export const Main: React.FC<{audioTrack?: string; checkBounds?: boolean}> = ({audioTrack, checkBounds}) => {
  const {ready, mask} = useAssets();
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const logo = t >= LOGO_START;
  // ロゴの幅（SVG 1250x400 の比率のまま。最終の字面 x=110〜1053 が左右の安全域に入る大きさ）
  const lw = 1100;
  return (
    <AbsoluteFill style={{backgroundColor: '#0d0b09'}}>
      {ready && !logo ? (
        <ThreeCanvas width={W} height={H} gl={{antialias: true, preserveDrawingBuffer: true}} camera={{fov: 40, near: 0.1, far: 900, position: [0, 5, 20]}}>
          <Scene t={t} mask={mask} />
        </ThreeCanvas>
      ) : null}
      {!logo ? <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.5) 100%)'}} /> : null}
      {ready && !logo ? (
        <AbsoluteFill>
          <Texts t={t} />
        </AbsoluteFill>
      ) : null}
      {!logo ? <Wipe t={t} /> : null}
      {logo ? (
        <AbsoluteFill style={{backgroundColor: LOGO_BG, alignItems: 'center', justifyContent: 'center'}}>
          <Logo tau={t - LOGO_START} width={lw} />
        </AbsoluteFill>
      ) : null}
      {checkBounds && ready ? <BoundsCheck frame={frame} /> : null}
      {audioTrack ? <Audio src={staticFile(audioTrack)} /> : null}
    </AbsoluteFill>
  );
};

export {clamp};
