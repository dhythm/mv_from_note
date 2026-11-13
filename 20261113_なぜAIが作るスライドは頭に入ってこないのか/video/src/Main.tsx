// 全編: 本編＋エンドロゴ。層は下から、紙 → 図（three.js。本人資料の画像もここ）→ 画面の語（DOM）→ 紙の粒。
// 図の層だけにカメラを掛ける。文字は DOM のまま（詰め組・行のマスク・文字単位の検査）。
import React, {useEffect, useState} from 'react';
import {Audio} from '@remotion/media';
import {ThreeCanvas} from '@remotion/three';
import {AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {C, DBlur, F, H, W, inOut, prog} from './kit';
import {FPS, LOGO_START} from './timeline';
import {LOGO_BG, Logo} from './components/Logo';
import {camAt} from './cam';
import {CAM, whip} from './score';
import * as THREE from 'three';
import {Tex, World} from './world';
import {Type} from './type';

const SAFE_X = 64;
const SAFE_Y = 48;

function useFonts() {
  const [handle] = useState(() => delayRender('load fonts'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all([new FontFace(F.g, `url(${staticFile('NotoSansJP-wght.ttf')})`, {weight: '100 900'}).load()])
      .then((fs) => {
        fs.forEach((f) => document.fonts.add(f));
        return Promise.all([900, 700, 500].map((w) => document.fonts.load(`${w} 40px ${F.g}`, '頭入語設計足言葉要手元読必情報発表調査点見説明残聞図短句画面文脈削何伝順序組直声出確届資料体裁相棒責任代')));
      })
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle]);
  return ready;
}

const IMAGES: Record<keyof Tex, string> = {ovCP: 'ov-claude-pres.webp', ovGP: 'ov-gpt-pres.webp', ovCD: 'ov-claude-doc.webp', ovGD: 'ov-gpt-doc.webp', pagePres: 'page-pres.png', pageDoc: 'page-doc.png'};
// 本人資料の画像（一覧 4 枚と、採用ページの切り出し 2 枚）。色・文字は変えずに面へ貼る
function useTex() {
  const [handle] = useState(() => delayRender('load images'));
  const [tex, setTex] = useState<Tex | null>(null);
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    const keys = Object.keys(IMAGES) as (keyof Tex)[];
    Promise.all(keys.map((k) => loader.loadAsync(staticFile(IMAGES[k]))))
      .then((ts) => {
        ts.forEach((t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = 8;
        });
        setTex(Object.fromEntries(keys.map((k, i) => [k, ts[i]])) as Tex);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle]);
  return tex;
}

// 文字の検査: 画面端（安全域）、文字と図の重なり、文字どうしの重なり。
// data-mv は着地・退場の途中（transit として別に数える）。data-ch="box" は面や札の中の語（図との重なりを数えない）。
function useBoundsCheck(on: boolean, frame: number, ready: boolean) {
  useEffect(() => {
    if (!on || !ready) return;
    const root = document.getElementById('stage');
    if (!root) return;
    const box = root.getBoundingClientRect();
    const k = box.width / W;
    const bad: string[] = [];
    const figs = Array.from(root.querySelectorAll('[data-fig]')).map((f) => ({r: f.getBoundingClientRect(), fly: (f as HTMLElement).dataset.fig === 'fly'}));
    const chars = Array.from(root.querySelectorAll('[data-ch]')).map((el) => {
      const r = el.getBoundingClientRect();
      const par = el.parentElement as HTMLElement;
      const masked = getComputedStyle(par).overflow === 'hidden';
      const p = masked ? par.getBoundingClientRect() : r;
      const c = {left: Math.max(r.left, p.left), right: Math.min(r.right, p.right), top: Math.max(r.top, p.top), bottom: Math.min(r.bottom, p.bottom)};
      const vis = Math.max(0, c.right - c.left) * Math.max(0, c.bottom - c.top);
      let o = 1;
      for (let n: HTMLElement | null = el as HTMLElement; n && n !== root; n = n.parentElement) o *= Number(getComputedStyle(n).opacity);
      return {el: el as HTMLElement, r, c, par, shown: vis >= r.width * r.height * 0.6 && o > 0.25, mv: !!el.closest('[data-mv]'), box: (el as HTMLElement).dataset.ch === 'box'};
    });
    for (const ch of chars) {
      if (!ch.shown) continue;
      const L = (ch.c.left - box.left) / k;
      const R = (ch.c.right - box.left) / k;
      const T = (ch.c.top - box.top) / k;
      const B = (ch.c.bottom - box.top) / k;
      if (R < 0 || L > W || B < 0 || T > H) continue;
      if (L < SAFE_X || R > W - SAFE_X || T < SAFE_Y || B > H - SAFE_Y) bad.push(`${ch.mv ? 'transit-edge' : 'edge'}:${ch.el.textContent}@${Math.round(L)},${Math.round(T)}-${Math.round(R)},${Math.round(B)}`);
      if (!ch.box)
        for (const f of figs) {
          const ox = Math.min(ch.c.right, f.r.right) - Math.max(ch.c.left, f.r.left);
          const oy = Math.min(ch.c.bottom, f.r.bottom) - Math.max(ch.c.top, f.r.top);
          if (ox > 2 * k && oy > 2 * k) {
            bad.push(`${f.fly || ch.mv ? 'transit-fig' : 'fig'}:${ch.el.textContent}`);
            break;
          }
        }
    }
    const vis = chars.filter((c) => c.shown);
    for (let i = 0; i < vis.length; i++)
      for (let j = i + 1; j < vis.length; j++) {
        if (vis[i].par === vis[j].par) continue;
        if (vis[i].box || vis[j].box) continue;
        const a = vis[i].c;
        const b = vis[j].c;
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 4 * k && oy > 4 * k) bad.push(`${vis[i].mv || vis[j].mv ? 'transit-text' : 'text'}:${vis[i].el.textContent}/${vis[j].el.textContent}`);
      }
    console.log(`BOUNDS ${frame} ${bad.join(' ')}`);
  });
}

const Body: React.FC<{T: number; tex: Tex}> = ({T, tex}) => {
  const cam = camAt(T, CAM);
  return (
    <AbsoluteFill style={{backgroundColor: C.paper, overflow: 'hidden'}}>
      {/* 紙の明るさのむら（ごく薄い。動かさない） */}
      <AbsoluteFill style={{background: 'radial-gradient(120% 95% at 50% 40%, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0) 60%)'}} />
      <DBlur id="w" n={whip(T)}>
        <ThreeCanvas width={W} height={H} flat linear={false} gl={{antialias: true, alpha: true, preserveDrawingBuffer: true}} camera={{fov: 34, near: 0.3, far: 400, position: [0, 0, 16]}} style={{position: 'absolute', left: 0, top: 0}}>
          <World T={T} cam={cam} tex={tex} />
        </ThreeCanvas>
      </DBlur>
      <Type T={T} cam={cam} />
      {/* 紙の粒（固定の種。動かさない） */}
      <svg width={W} height={H} style={{position: 'absolute', left: 0, top: 0, mixBlendMode: 'multiply', opacity: 0.12, pointerEvents: 'none'}}>
        <filter id="grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={7} result="n" />
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
  const tex = useTex();
  const ready = fontsReady && !!tex;
  useBoundsCheck(!!check, frame, ready);
  const logo = T >= LOGO_START;
  // 本編 → ロゴ: 画面ごと左へ押し出し、ライムの面が右から入る
  const k = inOut(prog(T, LOGO_START - 0.5, LOGO_START));
  const blur = Math.sin(Math.PI * k) * 26;
  return (
    <AbsoluteFill id="stage" style={{backgroundColor: C.paper, overflow: 'hidden'}}>
      {ready && !logo ? (
        k > 0 ? (
          <>
            <AbsoluteFill style={{transform: `translateX(${-k * W}px)`}} data-mv="1">
              <DBlur id="cur" n={blur}>
                <Body T={T} tex={tex as Tex} />
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
          <Body T={T} tex={tex as Tex} />
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
