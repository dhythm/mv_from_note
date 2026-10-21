// 全編: 14 カット＋エンドロゴ。カットの境目では、次のカットの面が斜めの縁で押し入り、前のカットを押し出す。
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {C, F, H, W, inOut, prog} from './kit';
import {CUTS, FPS, LOGO_START, Tr} from './timeline';
import {LOGO_BG, Logo} from './components/Logo';
import {Cut01, Cut02, Cut03, Cut04, Cut05} from './scenes1';
import {Cut06, Cut07, Cut08, Cut09, Cut10} from './scenes2';
import {Cut11, Cut12, Cut13, Cut14} from './scenes3';

export type CutProps = {t: number; start: number};
const SCENES: Record<string, React.FC<CutProps>> = {
  '01': Cut01,
  '02': Cut02,
  '03': Cut03,
  '04': Cut04,
  '05': Cut05,
  '06': Cut06,
  '07': Cut07,
  '08': Cut08,
  '09': Cut09,
  '10': Cut10,
  '11': Cut11,
  '12': Cut12,
  '13': Cut13,
  '14': Cut14,
};

const FONTS: [string, string, string][] = [
  [F.noto, 'NotoSansJP-wght.ttf', '100 900'],
  [F.dela, 'DelaGothicOne-Regular.ttf', '400'],
  [F.min, 'BIZUDPMincho-Regular.ttf', '400'],
  [F.dot, 'DotGothic16-Regular.ttf', '400'],
];
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
      .then(() => Promise.all([document.fonts.load(`900 40px ${F.noto}`, '楽しい仕事'), document.fonts.load(`40px ${F.dela}`, '楽しい'), document.fonts.load(`40px ${F.min}`, '仕事'), document.fonts.load(`40px ${F.dot}`, 'コード')]))
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle]);
  return ready;
}

const TR = 0.5; // 切り替えの長さ（秒）。次のカットの頭の 0.5 秒前から押し入る

// 押し入る面の輪郭（k: 0→1）
function clipFor(tr: Tr, k: number) {
  if (tr === 'up') {
    const y = (1 - k) * (H + 260) - 130;
    return `polygon(-10px ${y + 130}px, ${W + 10}px ${y - 130}px, ${W + 10}px ${H + 400}px, -10px ${H + 400}px)`;
  }
  const sk = tr === 'diag' ? 520 : 220;
  if (tr === 'right') {
    const x = k * (W + sk * 2) - sk;
    return `polygon(-10px -10px, ${x + sk}px -10px, ${x - sk}px ${H + 10}px, -10px ${H + 10}px)`;
  }
  const x = (1 - k) * (W + sk * 2) - sk;
  return `polygon(${x + sk}px -10px, ${W + 600}px -10px, ${W + 600}px ${H + 10}px, ${x - sk}px ${H + 10}px)`;
}
// 押し出される側と押し入る側の移動
function pushFor(tr: Tr, k: number, incoming: boolean) {
  const d = incoming ? (1 - k) : -k;
  if (tr === 'up') return `translateY(${d * (incoming ? 380 : 320)}px)`;
  if (tr === 'right') return `translateX(${-d * (incoming ? 520 : 420)}px)`;
  if (tr === 'diag') return `translate(${d * 560}px, ${d * (incoming ? 140 : 90)}px) rotate(${d * (incoming ? 4 : -3)}deg)`;
  return `translateX(${d * (incoming ? 520 : 420)}px)`;
}

function useBoundsCheck(on: boolean, frame: number, ready: boolean) {
  useEffect(() => {
    if (!on || !ready) return;
    const root = document.getElementById('stage');
    if (!root) return;
    const box = root.getBoundingClientRect();
    const k = box.width / W;
    const bad: string[] = [];
    root.querySelectorAll('[data-ch]').forEach((el) => {
      const r = el.getBoundingClientRect();
      const p = (el.parentElement as HTMLElement).getBoundingClientRect();
      // マスクの外（入場前・退場後）の文字は数えない
      const ix = Math.max(0, Math.min(r.right, p.right) - Math.max(r.left, p.left));
      const iy = Math.max(0, Math.min(r.bottom, p.bottom) - Math.max(r.top, p.top));
      if (ix * iy < r.width * r.height * 0.6) return;
      const L = (r.left - box.left) / k;
      const R = (r.right - box.left) / k;
      const T = (r.top - box.top) / k;
      const B = (r.bottom - box.top) / k;
      if (L < 40 || R > W - 40 || T < 30 || B > H - 30) bad.push(`${el.textContent}@${Math.round(L)},${Math.round(T)}-${Math.round(R)},${Math.round(B)}`);
    });
    console.log(`BOUNDS ${frame} ${bad.join(' ')}`);
  });
}

export const Main: React.FC<{audioTrack?: string; check?: boolean}> = ({audioTrack, check}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const ready = useFonts();
  useBoundsCheck(!!check, frame, ready);
  const i = CUTS.findIndex((c) => t >= c.start && t < c.start + c.dur);
  const layers: React.ReactNode[] = [];
  if (ready && i >= 0) {
    const cur = CUTS[i];
    const Cur = SCENES[cur.id];
    const nextStart = cur.start + cur.dur;
    const k = inOut(prog(t, nextStart - TR, nextStart));
    const curNode = <Cur t={t - cur.start} start={cur.start} />;
    if (k > 0) {
      layers.push(
        <AbsoluteFill key="cur" style={{transform: pushFor(cur.tr, k, false), transformOrigin: '50% 50%'}}>
          {curNode}
        </AbsoluteFill>,
      );
      const nx = CUTS[i + 1];
      const incoming = nx ? (
        React.createElement(SCENES[nx.id], {t: t - nx.start, start: nx.start})
      ) : (
        <AbsoluteFill style={{background: LOGO_BG, alignItems: 'center', justifyContent: 'center'}}>
          <Logo tau={0} width={1500} />
        </AbsoluteFill>
      );
      layers.push(
        <AbsoluteFill key="next" style={{clipPath: clipFor(cur.tr, k), overflow: 'hidden'}}>
          <AbsoluteFill style={{transform: pushFor(cur.tr, k, true)}}>{incoming}</AbsoluteFill>
        </AbsoluteFill>,
      );
    } else {
      layers.push(<AbsoluteFill key="cur">{curNode}</AbsoluteFill>);
    }
  }
  const logo = t >= LOGO_START;
  return (
    <AbsoluteFill id="stage" style={{backgroundColor: C.ink, overflow: 'hidden'}}>
      {!logo && layers}
      {logo ? (
        <AbsoluteFill style={{backgroundColor: LOGO_BG, alignItems: 'center', justifyContent: 'center'}}>
          <Logo tau={t - LOGO_START} width={1500} />
        </AbsoluteFill>
      ) : null}
      {audioTrack ? <Audio src={staticFile(audioTrack)} /> : null}
    </AbsoluteFill>
  );
};
