// 全編: 本編 13 カット＋エンドロゴ。地は紙の色。図はカメラの層、文字は DOM の層（詰め組・行のマスク・文字単位の検査）。
// 場面は「幕」ごとの部品（actA〜actE）で、全体の時刻 T だけから状態が決まる。13 → ロゴは画面ごと左へ押し出す。
import React, {useEffect, useState} from 'react';
import {Audio} from '@remotion/media';
import {AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {C, DBlur, F, H, W, inOut, prog} from './kit';
import {FPS, LOGO_START} from './timeline';
import {LOGO_BG, Logo} from './components/Logo';
import {ACTS} from './acts';

const SAFE_X = 80;
const SAFE_Y = 64;

function useFonts() {
  const [handle] = useState(() => delayRender('load fonts'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    new FontFace(F.noto, `url(${staticFile('NotoSansJP-wght.ttf')})`, {weight: '100 900'})
      .load()
      .then((f) => {
        document.fonts.add(f);
        return Promise.all([900, 700, 500].map((w) => document.fonts.load(`${w} 40px ${F.noto}`, '問題ありません渡し方判断')));
      })
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle]);
  return ready;
}

// 文字の検査: 画面端（安全域）、文字と図の重なり、文字どうしの重なり。
// data-mv の中の文字は「着地・退場・カメラに付いた移動の途中」として画面端を数えず、transit として別に数える。
// data-ch="box" は吹き出し・札・面の中の語で、図との重なりを数えない。data-fig="fly" は移動中の図で、transit として別に数える。
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
      const off = R < 0 || L > W || B < 0 || T > H;
      if (off) continue;
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
        if (vis[i].box || vis[j].box) continue; // 図の中の語は、その図が前後に重なる演出（吹き出しの重なりなど）を別に目視する
        const a = vis[i].c;
        const b = vis[j].c;
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 4 * k && oy > 4 * k) bad.push(`${vis[i].mv || vis[j].mv ? 'transit-text' : 'text'}:${vis[i].el.textContent}/${vis[j].el.textContent}`);
      }
    console.log(`BOUNDS ${frame} ${bad.join(' ')}`);
  });
}

const Body: React.FC<{T: number}> = ({T}) => (
  <AbsoluteFill style={{backgroundColor: C.paper, overflow: 'hidden'}}>
    {ACTS.map((A, i) => (
      <A key={i} T={T} />
    ))}
  </AbsoluteFill>
);

export const Main: React.FC<{check?: boolean; audioTrack?: string}> = ({check, audioTrack}) => {
  const frame = useCurrentFrame();
  const T = frame / FPS;
  const ready = useFonts();
  useBoundsCheck(!!check, frame, ready);
  const logo = T >= LOGO_START;
  // 13 → ロゴ: 画面ごと左へ押し出し、ライムの面が右から入る
  const k = inOut(prog(T, LOGO_START - 0.5, LOGO_START));
  const blur = Math.sin(Math.PI * k) * 26;
  return (
    <AbsoluteFill id="stage" style={{backgroundColor: C.paper, overflow: 'hidden'}}>
      {ready && !logo ? (
        k > 0 ? (
          <>
            <AbsoluteFill style={{transform: `translateX(${-k * W}px)`}} data-mv="1">
              <DBlur id="cur" n={blur} x>
                <Body T={T} />
              </DBlur>
            </AbsoluteFill>
            <AbsoluteFill style={{transform: `translateX(${(1 - k) * W}px)`}}>
              <DBlur id="next" n={blur} x>
                <AbsoluteFill style={{background: LOGO_BG, alignItems: 'center', justifyContent: 'center'}}>
                  <Logo tau={0} width={1500} />
                </AbsoluteFill>
              </DBlur>
            </AbsoluteFill>
          </>
        ) : (
          <Body T={T} />
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
