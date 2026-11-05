// 全編: 11 カット＋エンドロゴ。
// cut は場面の側で前のカットの終わりの画を引き継ぐ（04→05 のコマ、05→06 の傾き、06→07 の巻き戻し、07→08 の鎖、09→10 の Crane down）。
// whip は縦、whipx は横（11→ロゴ、画面を右へ押し出す）の Whip pan。up・left は次のカットの面が斜めの縁で押し入る。
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {C, F, H, VBlur, W, inOut, lerp, prog} from './kit';
import {CUTS, FPS, LOGO_START, Tr} from './timeline';
import {LOGO_BG, Logo} from './components/Logo';
import {Cut01, Cut02, Cut03, Cut04} from './scenes1';
import {Cut05, Cut06, Cut07} from './scenes2';
import {Cut08, Cut09, Cut10, Cut11} from './scenes3';

// t: カットの頭からの秒、v: 声の頭からの秒（語の時刻 audio/voice/words.json に合わせる）
export type CutProps = {t: number; v: number; start: number};
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
};

const FONTS: [string, string, string][] = [
  [F.noto, 'NotoSansJP-wght.ttf', '100 900'],
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
      .then(() => Promise.all([900, 700, 400].map((w) => document.fonts.load(`${w} 40px ${F.noto}`, '数珠つなぎで動かせたら化ける経験'))))
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle]);
  return ready;
}

const TR = 0.5; // 切り替えの長さ（秒）。次のカットの頭の 0.5 秒前から押し入る（whip は 0.5 秒で振り切る）

// 押し入る面の輪郭（k: 0→1）
function clipFor(tr: Tr, k: number) {
  if (tr === 'whip' || tr === 'whipx') return 'none';
  if (tr === 'up') {
    const y = (1 - k) * (H + 260) - 130;
    return `polygon(-10px ${y + 130}px, ${W + 10}px ${y - 130}px, ${W + 10}px ${H + 400}px, -10px ${H + 400}px)`;
  }
  const sk = 220;
  if (tr === 'right') {
    const x = k * (W + sk * 2) - sk;
    return `polygon(-10px -10px, ${x + sk}px -10px, ${x - sk}px ${H + 10}px, -10px ${H + 10}px)`;
  }
  const x = (1 - k) * (W + sk * 2) - sk;
  return `polygon(${x + sk}px -10px, ${W + 600}px -10px, ${W + 600}px ${H + 10}px, ${x - sk}px ${H + 10}px)`;
}
// 押し出される側と押し入る側の移動
function pushFor(tr: Tr, k: number, incoming: boolean) {
  const d = incoming ? 1 - k : -k;
  // Whip pan（上へ振る）: 画は下へ流れ、次の画は上から入る
  if (tr === 'whip') return incoming ? `translateY(${-(1 - k) * H}px)` : `translateY(${k * H}px)`;
  // 横の Whip pan: 画面を右へ押し出し、次の画は左から入る
  if (tr === 'whipx') return incoming ? `translateX(${-(1 - k) * W}px)` : `translateX(${k * W}px)`;
  if (tr === 'up') return `translateY(${d * (incoming ? 380 : 320)}px)`;
  if (tr === 'right') return `translateX(${-d * (incoming ? 520 : 420)}px)`;
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
    // 線は外接矩形ではなく、要素自体（line／path）の矩形で見る
    const figs = Array.from(root.querySelectorAll('[data-fig] line, [data-fig] path, div[data-fig]')).map((f) => f.getBoundingClientRect()).filter((f) => f.width * f.height > 0 || f.width > 0 || f.height > 0);
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
      // 図（線・矢印・点。data-fig）との重なり
      figs.forEach((f) => {
        const ox = Math.min(r.right, f.right) - Math.max(r.left, f.left);
        const oy = Math.min(r.bottom, f.bottom) - Math.max(r.top, f.top);
        if (ox > 2 && oy > 2) bad.push(`overlap:${el.textContent}`);
      });
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
    const k = cur.tr === 'cut' ? 0 : inOut(prog(t, nextStart - TR, nextStart));
    const curNode = <Cur t={t - cur.start} v={t - cur.start - cur.vo} start={cur.start} />;
    const blur = cur.tr === 'whip' || cur.tr === 'whipx' ? Math.sin(Math.PI * k) * 26 : 0;
    const bx = cur.tr === 'whipx';
    if (k > 0) {
      layers.push(
        <AbsoluteFill key="cur" style={{transform: pushFor(cur.tr, k, false), transformOrigin: '50% 50%'}}>
          <VBlur id="cur" n={blur} x={bx}>
            {curNode}
          </VBlur>
        </AbsoluteFill>,
      );
      const nx = CUTS[i + 1];
      const incoming = nx ? (
        React.createElement(SCENES[nx.id], {t: t - nx.start, v: t - nx.start - nx.vo, start: nx.start})
      ) : (
        <AbsoluteFill style={{background: LOGO_BG, alignItems: 'center', justifyContent: 'center'}}>
          <Logo tau={0} width={1500} />
        </AbsoluteFill>
      );
      layers.push(
        <AbsoluteFill key="next" style={{clipPath: clipFor(cur.tr, k), overflow: 'hidden'}}>
          <AbsoluteFill style={{transform: pushFor(cur.tr, k, true), backgroundColor: C.paper}}>
            <VBlur id="next" n={blur} x={bx}>
              {incoming}
            </VBlur>
          </AbsoluteFill>
        </AbsoluteFill>,
      );
    } else {
      layers.push(<AbsoluteFill key="cur">{curNode}</AbsoluteFill>);
    }
  }
  const logo = t >= LOGO_START;
  return (
    <AbsoluteFill id="stage" style={{backgroundColor: C.paper, overflow: 'hidden'}}>
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
