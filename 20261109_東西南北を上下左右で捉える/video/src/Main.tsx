// 全編: 10 カット＋エンドロゴ。
// 地は共通の紙（map-paper-curl.png、右下の小さなめくれ）。紙は動かさず、盤・地図・文字を動かす。
// 図と文字はカットごと（scenes.tsx）。カットの境目の前後 0.6 秒は前後の文字の層を両方描き、行のマスクで受け渡す。
// 図は自分のカットの区間だけ描き、境目の状態を前後で一致させる。10 → ロゴは画面ごと上へ押し出す。
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Img, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {C, F, H, VBlur, W, inOut, prog} from './kit';
import {CUTS, FPS, LOGO_START} from './timeline';
import {LOGO_BG, Logo} from './components/Logo';
import {SCENES} from './scenes';

const FONTS: [string, string, string][] = [[F.noto, 'NotoSansJP-wght.ttf', '100 900']];
function useFonts() {
  const [handle] = useState(() => delayRender('load fonts'));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    Promise.all(
      FONTS.map(([family, file, weight]) =>
        new FontFace(family, `url(${staticFile(file)})`, {weight}).load().then((f) => {
          document.fonts.add(f);
        }),
      ),
    )
      .then(() => Promise.all([700, 400].map((w) => document.fonts.load(`${w} 40px ${F.noto}`, '地図回してますか北上に行く東右西左南下'))))
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle]);
  return ready;
}

const Paper: React.FC = () => <Img src={staticFile('map-paper-curl.png')} style={{position: 'absolute', left: 0, top: 0, width: W, height: H}} />;

// 図と文字の画面
const Base: React.FC<{T: number}> = ({T}) => {
  const cuts = CUTS.filter((c) => T >= c.start - 0.6 && T < c.start + c.dur + 0.6).map((c) => {
    const Sc = SCENES[c.id];
    return <Sc key={c.id} t={T - c.start} v={T - c.start - c.vo} start={c.start} dur={c.dur} vo={c.vo} />;
  });
  // 画面全体のカメラ: 全体の時刻だけで決まる連続のゆるい寄り引きと横移動（境目で途切れない）。紙は動かさない
  const s = 1.0 + 0.03 * Math.sin((2 * Math.PI * T) / 9.7);
  const x = 20 * Math.sin((2 * Math.PI * T) / 13.3);
  const y = 14 * Math.sin((2 * Math.PI * T) / 8.1 + 1);
  return <AbsoluteFill style={{overflow: 'hidden', transform: `translate(${x}px, ${y}px) scale(${s})`, transformOrigin: '960px 560px'}}>{cuts}</AbsoluteFill>;
};

function useBoundsCheck(on: boolean, frame: number, ready: boolean) {
  useEffect(() => {
    if (!on || !ready) return;
    const root = document.getElementById('stage');
    if (!root) return;
    const box = root.getBoundingClientRect();
    const k = box.width / W;
    const bad: string[] = [];
    const figs = Array.from(root.querySelectorAll('div[data-fig]')).map((f) => f.getBoundingClientRect());
    root.querySelectorAll('[data-ch]').forEach((el) => {
      const r = el.getBoundingClientRect();
      const p = (el.parentElement as HTMLElement).getBoundingClientRect();
      // マスクの外（入場前・退場後）の文字は数えない
      const ix = Math.max(0, Math.min(r.right, p.right) - Math.max(r.left, p.left));
      const iy = Math.max(0, Math.min(r.bottom, p.bottom) - Math.max(r.top, p.top));
      if (ix * iy < r.width * r.height * 0.6) return;
      // 画面端の判定は、行のマスクで切り抜いた見えている範囲で行う
      const L = (Math.max(r.left, p.left) - box.left) / k;
      const R = (Math.min(r.right, p.right) - box.left) / k;
      const T = (Math.max(r.top, p.top) - box.top) / k;
      const B = (Math.min(r.bottom, p.bottom) - box.top) / k;
      const off = R < 0 || L > W || B < 0 || T > H;
      if (!off && (L < 40 || R > W - 40 || T < 30 || B > H - 30)) bad.push(`${el.textContent}@${Math.round(L)},${Math.round(T)}-${Math.round(R)},${Math.round(B)}`);
      // 図との重なり（図の中・縁に付く語 data-ch="box" は除く）
      if ((el as HTMLElement).dataset.ch !== 'box')
        figs.forEach((f) => {
          const ox = Math.min(r.right, f.right) - Math.max(r.left, f.left);
          const oy = Math.min(r.bottom, f.bottom) - Math.max(r.top, f.top);
          if (ox > 2 && oy > 2) bad.push(`overlap:${el.textContent}`);
        });
    });
    // 文字どうしの重なり（別の行の文字どうし。行のマスクで切り抜いた範囲）
    const clipTo = (r: DOMRect, q: DOMRect) => ({left: Math.max(r.left, q.left), right: Math.min(r.right, q.right), top: Math.max(r.top, q.top), bottom: Math.min(r.bottom, q.bottom)});
    const chars = Array.from(root.querySelectorAll('[data-ch]')).map((el) => ({el, r: clipTo(el.getBoundingClientRect(), (el.parentElement as HTMLElement).getBoundingClientRect()), p: el.parentElement}));
    const vis = chars.filter(({r}) => r.right - r.left > 2 && r.bottom - r.top > 2);
    for (let i = 0; i < vis.length; i++)
      for (let j = i + 1; j < vis.length; j++) {
        if (vis[i].p === vis[j].p) continue;
        const a = vis[i].r;
        const b = vis[j].r;
        const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (ox > 4 && oy > 4) bad.push(`text:${vis[i].el.textContent}/${vis[j].el.textContent}`);
      }
    console.log(`BOUNDS ${frame} ${bad.join(' ')}`);
  });
}

export const Main: React.FC<{audioTrack?: string; check?: boolean}> = ({audioTrack, check}) => {
  const frame = useCurrentFrame();
  const T = frame / FPS;
  const ready = useFonts();
  useBoundsCheck(!!check, frame, ready);
  let body: React.ReactNode = null;
  if (ready && T < LOGO_START) {
    // 10 → ロゴ: 画面ごと上へ押し出し、ライムの面が下から入る
    const k = inOut(prog(T, LOGO_START - 0.55, LOGO_START));
    const blur = Math.sin(Math.PI * k) * 24;
    body =
      k > 0 ? (
        <>
          <AbsoluteFill style={{transform: `translateY(${-k * H}px)`}}>
            <VBlur id="cur" n={blur}>
              <Paper />
              <Base T={T} />
            </VBlur>
          </AbsoluteFill>
          <AbsoluteFill style={{transform: `translateY(${(1 - k) * H}px)`}}>
            <VBlur id="next" n={blur}>
              <AbsoluteFill style={{background: LOGO_BG, alignItems: 'center', justifyContent: 'center'}}>
                <Logo tau={0} width={1500} />
              </AbsoluteFill>
            </VBlur>
          </AbsoluteFill>
        </>
      ) : (
        <>
          <Paper />
          <Base T={T} />
        </>
      );
  }
  const logo = T >= LOGO_START;
  return (
    <AbsoluteFill id="stage" style={{backgroundColor: C.paper, overflow: 'hidden'}}>
      {!logo && body}
      {logo ? (
        <AbsoluteFill style={{backgroundColor: LOGO_BG, alignItems: 'center', justifyContent: 'center'}}>
          <Logo tau={T - LOGO_START} width={1500} />
        </AbsoluteFill>
      ) : null}
      {audioTrack ? <Audio src={staticFile(audioTrack)} /> : null}
    </AbsoluteFill>
  );
};
