// 全編: 本編＋エンドロゴ。
// 層は下から: 紙色 → 生成動画インサート層 → 図（three.js）→ 札の面の文字 → 画面の語（DOM/CSS）→ 紙の粒。
// 速い振りのぼかしは、図と札の面にだけ掛ける。画面の語はぼかさない。
import React, {useEffect, useState} from 'react';
import {Audio} from '@remotion/media';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, OffthreadVideo, Sequence, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {C, DBlur, F, H, W, inOut, lerp, prog} from './kit';
import {FPS, LOGO_START} from './timeline';
import {LOGO_BG, Logo} from './components/Logo';
import {camAt} from './cam';
import {CAM, CLIPS, clipState, cover, whip, type ClipDef} from './score';
import {World} from './world';
import {Faces, Type} from './type';
import {prims} from './figs';

const SAFE_X = 64;
const SAFE_Y = 48;

function useFonts() {
  const [handle] = useState(() => delayRender('load fonts'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([new FontFace(F.g, `url(${staticFile('NotoSansJP-wght.ttf')})`, {weight: '100 900'}).load()])
      .then((fs) => {
        fs.forEach((f) => document.fonts.add(f));
        return Promise.all(
          [900, 700, 500].map((w) =>
            document.fonts.load(
              `${w} 40px ${F.g}`,
              '技術的可能交渉負札渡意味棚欲判断選択肢効果予算期間実現前提載法外金額数百万円引受権利婉曲費用理由潰負担品質納期倍月経験則段階足伝緒直無迷惑納得飲込別言葉',
            ),
          ),
        );
      })
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle]);
  return ready;
}

// 文字の機械検査: 安全域（左右64px・上下48px）、文字と図の重なり、文字どうしの重なり。
function useBoundsCheck(on: boolean, frame: number, ready: boolean) {
  useEffect(() => {
    if (!on || !ready) return;
    const root = document.getElementById('stage');
    if (!root) return;
    const box = root.getBoundingClientRect();
    const k = box.width / W;
    const bad: string[] = [];
    const figs = Array.from(root.querySelectorAll('[data-fig]')).map((f) => ({
      r: f.getBoundingClientRect(),
      fly: (f as HTMLElement).dataset.fig === 'fly',
    }));
    const chars = Array.from(root.querySelectorAll('[data-ch]')).map((el) => {
      const r = el.getBoundingClientRect();
      const par = el.parentElement as HTMLElement;
      const masked = getComputedStyle(par).overflow === 'hidden';
      const p = masked ? par.getBoundingClientRect() : r;
      const c = {
        left: Math.max(r.left, p.left),
        right: Math.min(r.right, p.right),
        top: Math.max(r.top, p.top),
        bottom: Math.min(r.bottom, p.bottom),
      };
      const vis = Math.max(0, c.right - c.left) * Math.max(0, c.bottom - c.top);
      let o = 1;
      for (let n: HTMLElement | null = el as HTMLElement; n && n !== root; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
      return {
        el: el as HTMLElement,
        r,
        c,
        par,
        shown: vis >= r.width * r.height * 0.6 && o > 0.25,
        mv: !!el.closest('[data-mv]'),
        box: (el as HTMLElement).dataset.ch === 'box',
      };
    });
    for (const ch of chars) {
      if (!ch.shown) continue;
      const L = (ch.c.left - box.left) / k;
      const R = (ch.c.right - box.left) / k;
      const T = (ch.c.top - box.top) / k;
      const B = (ch.c.bottom - box.top) / k;
      if (R < 0 || L > W || B < 0 || T > H) continue;
      if (L < SAFE_X || R > W - SAFE_X || T < SAFE_Y || B > H - SAFE_Y) {
        bad.push(`${ch.mv ? 'transit-edge' : 'edge'}:${ch.el.textContent}@${Math.round(L)},${Math.round(T)}-${Math.round(R)},${Math.round(B)}`);
      }
      if (!ch.box) {
        for (const f of figs) {
          const ox = Math.min(ch.c.right, f.r.right) - Math.max(ch.c.left, f.r.left);
          const oy = Math.min(ch.c.bottom, f.r.bottom) - Math.max(ch.c.top, f.r.top);
          if (ox > 2 * k && oy > 2 * k) {
            bad.push(`${f.fly || ch.mv ? 'transit-fig' : 'fig'}:${ch.el.textContent}`);
            break;
          }
        }
      }
    }
    const vis = chars.filter((c) => c.shown);
    for (let i = 0; i < vis.length; i++) {
      for (let j = i + 1; j < vis.length; j++) {
        if (vis[i].par === vis[j].par) continue;
        if (vis[i].box || vis[j].box) continue;
        const a = vis[i].c;
        const b = vis[j].c;
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 4 * k && oy > 4 * k) {
          bad.push(`${vis[i].mv || vis[j].mv ? 'transit-text' : 'text'}:${vis[i].el.textContent}/${vis[j].el.textContent}`);
        }
      }
    }
    console.log(`BOUNDS ${frame} ${bad.join(' ')}`);
  });
}

// Seedance 2.5 Flash 動画インサート（全面または窓。ワイプで紙色の面とつなぐ）
const ClipItem: React.FC<{clip: ClipDef; T: number}> = ({clip, T}) => {
  const st = clipState(T, clip);
  if (!st || st.vis <= 0.001) return null;
  const fromFrame = Math.round(clip.start * FPS);
  const durFrames = Math.ceil((clip.end - clip.start) * FPS) + 2;
  const p = st.localT / Math.max(0.01, clip.end - clip.start);
  const sc = clip.zoom ? lerp(clip.zoom[0], clip.zoom[1], p) : 1;
  const [x, y, w, h] = clip.rect ?? [0, 0, W, H];
  const inPct = (1 - st.kIn) * 100;
  const outPct = st.kOut * 100;
  let clipPath: string | undefined;
  if (inPct > 0.2) clipPath = clip.wipeIn === 'up' ? `inset(${inPct.toFixed(2)}% 0 0 0)` : clip.wipeIn === 'left' ? `inset(0 ${inPct.toFixed(2)}% 0 0)` : undefined;
  else if (outPct > 0.2) clipPath = clip.wipeOut === 'left' ? `inset(0 0 0 ${outPct.toFixed(2)}%)` : clip.wipeOut === 'right' ? `inset(0 ${outPct.toFixed(2)}% 0 0)` : undefined;
  return (
    <Sequence from={fromFrame} durationInFrames={durFrames} layout="none">
      <div style={{position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden', clipPath}}>
        <OffthreadVideo
          src={staticFile(clip.file)}
          muted
          trimBefore={Math.round((clip.from ?? 0) * FPS)}
          style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: clip.objPos ?? '50% 50%', transform: `translateX(${clip.shift ?? 0}px) scale(${sc.toFixed(4)})`, filter: clip.filter}}
        />
        {clip.veil ? <AbsoluteFill style={{background: clip.veil}} /> : null}
      </div>
    </Sequence>
  );
};

const Body: React.FC<{T: number; check?: boolean}> = ({T, check}) => {
  const cam = camAt(T, CAM, 0);
  const wh = whip(T);
  const items = prims(T);
  return (
    <AbsoluteFill style={{backgroundColor: C.paper, overflow: 'hidden'}}>
      {/* 紙の明るさのむら（固定） */}
      <AbsoluteFill style={{background: 'radial-gradient(120% 95% at 50% 40%, rgba(255,255,255,0.48) 0%, rgba(255,255,255,0) 62%)'}} />
      <DBlur id="w" n={wh.n} ax={wh.ax}>
        {/* Seedance 2.5 Flash 動画インサート層（bounds check 時は背景映像のためスキップし高速検査） */}
        {!check ? CLIPS.map((clip) => <ClipItem key={clip.id} clip={clip} T={T} />) : null}
        {/* Three.js 図形層 */}
        <ThreeCanvas
          width={W}
          height={H}
          flat
          linear={false}
          gl={{antialias: true, alpha: true, preserveDrawingBuffer: true}}
          camera={{fov: 34, near: 0.3, far: 400, position: [0, 0, 16]}}
          style={{position: 'absolute', left: 0, top: 0}}
        >
          <World T={T} cam={cam} items={items} />
        </ThreeCanvas>
        <Faces cam={cam} items={items} show={1 - cover(T)} whipping={wh.n > 0.5} />
      </DBlur>
      {/* DOM/CSS キネティックタイポグラフィ層 */}
      <Type T={T} cam={cam} items={items} />
      {/* 紙の粒（固定の種） */}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, mixBlendMode: 'multiply', opacity: 0.10, pointerEvents: 'none'}}>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={23} result="n" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0.9 0.9 0.9 0 -0.75" />
        </filter>
        <rect width={W} height={H} filter="url(#grain)" />
      </svg>
    </AbsoluteFill>
  );
};

export const Main: React.FC<{check?: boolean; audioTrack?: string}> = ({check, audioTrack}) => {
  const frame = useCurrentFrame();
  const T = frame / FPS;
  const fontsReady = useFonts();
  useBoundsCheck(!!check, frame, fontsReady);
  const logo = T >= LOGO_START;
  // 本編 → ロゴ: 画面ごと左へ横振り、ライムの面が右から入る（白フラッシュなし）
  const k = inOut(prog(T, LOGO_START - 0.48, LOGO_START));
  const blur = Math.sin(Math.PI * k) * 26;

  return (
    <AbsoluteFill id="stage" style={{backgroundColor: C.paper, overflow: 'hidden'}}>
      {fontsReady && !logo ? (
        k > 0 ? (
          <>
            <AbsoluteFill style={{transform: `translateX(${-k * W}px)`}} data-mv="1">
              <DBlur id="cur" n={blur}>
                <Body T={T} check={check} />
              </DBlur>
            </AbsoluteFill>
            <AbsoluteFill style={{transform: `translateX(${(1 - k) * W}px)`}}>
              <DBlur id="next" n={blur}>
                <AbsoluteFill style={{background: LOGO_BG, alignItems: 'center', justifyContent: 'center'}}>
                  <Logo tau={0} width={1500} />
                </AbsoluteFill>
              </DBlur>
            </AbsoluteFill>
          </>
        ) : (
          <Body T={T} check={check} />
        )
      ) : null}
      {logo ? (
        <AbsoluteFill style={{backgroundColor: LOGO_BG, alignItems: 'center', justifyContent: 'center'}}>
          <Logo tau={T - LOGO_START} width={1500} />
        </AbsoluteFill>
      ) : null}
      {audioTrack ? <Audio src={staticFile(audioTrack)} /> : null}
    </AbsoluteFill>
  );
};
