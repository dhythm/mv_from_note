// 全編: 10 カット＋エンドロゴ。
// 箱（自分のキャパ）は全編で一つの層として続き、位置・大きさ（stage.ts）と配分（box.ts）は全体の時刻から決まる。
// 文字の層はカットごと（scenes.tsx）。カットの境目の前後 0.6 秒は前後の文字の層を両方描き、行のマスクで受け渡す。
// 07〜09 は「文字と箱 → 全面イラスト（参考 3 秒）→ 文字と箱」。声は続いたまま、文字と箱の画面を横へ送り、
// イラストを斜めの縁で全面へ押し入れる。戻るときは紙色の面がイラストを押し出す。イラストの上に文字・箱を重ねない。
// 10 → ロゴは横の Whip pan。
import React, {useEffect, useState} from 'react';
import {AbsoluteFill, Img, cancelRender, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {Audio} from '@remotion/media';
import {C, CamGrid, F, H, VBlur, W, inOut, lerp, prog} from './kit';
import {CUTS, FPS, LOGO_START} from './timeline';
import {LOGO_BG, Logo} from './components/Logo';
import {SCENES} from './scenes';
import {Box} from './BoxFig';
import {boxAt} from './box';
import {INSERTS, S, TRI, stageAt} from './stage';

// t: カットの頭からの秒、v: 声の頭からの秒、start: カットの頭（全体の秒）
export type CutProps = {t: number; v: number; start: number};

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
      .then(() => Promise.all([700, 400].map((w) => document.fonts.load(`${w} 40px ${F.noto}`, '刺激は得られる余白は失われる自分のキャパ'))))
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((err) => cancelRender(err));
  }, [handle]);
  return ready;
}

// 押し入る面の輪郭（斜めの縁が右から左へ。k: 0→1）
function clipLeft(k: number) {
  const sk = 220;
  const x = (1 - k) * (W + sk * 2) - sk;
  return `polygon(${x + sk}px -10px, ${W + 600}px -10px, ${W + 600}px ${H + 10}px, ${x - sk}px ${H + 10}px)`;
}

// 文字と箱の画面（紙色の地・流れるグリッド・箱・文字）
const Base: React.FC<{T: number}> = ({T}) => {
  const st = stageAt(T);
  const b = boxAt(T, S);
  // 08: 境界に墨の線を描き、細い白を確保する（box.ts の 08 の灰の後退と同じ時刻）
  const ink = prog(T, S['08'] + 6.9, S['08'] + 7.5);
  const labels = 1 - prog(T, S['10'] - 0.4, S['10'] + 0.3);
  const texts = CUTS.filter((c) => T >= c.start - 0.6 && T < c.start + c.dur + 0.6).map((c) => {
    const Sc = SCENES[c.id];
    return <Sc key={c.id} t={T - c.start} v={T - c.start - c.vo} start={c.start} />;
  });
  return (
    <AbsoluteFill style={{backgroundColor: C.paper, overflow: 'hidden'}}>
      <CamGrid c={{cx: (W / 2 - st.X) / st.z, cy: (H / 2 - st.Y) / st.z, z: st.z}} o={0.9} />
      <Box st={st} b={b} ink={T >= S['08'] ? ink : 0} labels={labels} />
      {texts}
    </AbsoluteFill>
  );
};

// 全面イラストの寄り引き・横移動（素材の中だけで動かす。人物を動いたように見せる処理はしない）
const InsertImg: React.FC<{id: string; src: string; p: number}> = ({id, src, p}) => {
  const e = inOut(p);
  let tf = '';
  let origin = '50% 50%';
  if (id === '07') {
    // 二人と本を残して寄る
    tf = `scale(${lerp(1.04, 1.3, e)}) translateX(${lerp(20, -30, e)}px)`;
    origin = '1180px 690px';
  } else if (id === '08') {
    // パソコン・水・椅子を残して横へ移動
    tf = `scale(${lerp(1.12, 1.16, e)}) translateX(${lerp(80, -80, e)}px)`;
  } else {
    // 酒器から水へ視線を移す
    tf = `scale(${lerp(1.36, 1.3, e)})`;
    origin = `${lerp(470, 1180, e)}px 600px`;
  }
  return (
    <AbsoluteFill style={{backgroundColor: C.paper, overflow: 'hidden'}}>
      <Img src={staticFile(src)} style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transform: tf, transformOrigin: origin}} />
    </AbsoluteFill>
  );
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
      // 箱との重なり（箱の中に置く語 data-ch="box" は除く）
      if ((el as HTMLElement).dataset.ch !== 'box')
        figs.forEach((f) => {
          const ox = Math.min(r.right, f.right) - Math.max(r.left, f.left);
          const oy = Math.min(r.bottom, f.bottom) - Math.max(r.top, f.top);
          if (ox > 2 && oy > 2) bad.push(`overlap:${el.textContent}`);
        });
    });
    // 文字どうしの重なり（別の行・別の札の文字どうし）
    const clipTo = (r: DOMRect, q: DOMRect) => {
      const left = Math.max(r.left, q.left);
      const right = Math.min(r.right, q.right);
      const top = Math.max(r.top, q.top);
      const bottom = Math.min(r.bottom, q.bottom);
      return {left, right, top, bottom};
    };
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
    // 箱の中のラベル（data-ch-in）が自分の領域（data-region）に収まっているか
    root.querySelectorAll('[data-region] [data-ch-in]').forEach((el) => {
      const r = el.getBoundingClientRect();
      const g = (el.closest('[data-region]') as HTMLElement).getBoundingClientRect();
      if (r.left < g.left - 1 || r.right > g.right + 1) bad.push(`label:${el.textContent}`);
    });
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
    const ins = INSERTS.find((x) => T >= x.a && T < x.b + TRI);
    if (ins) {
      const kin = inOut(prog(T, ins.a, ins.a + TRI));
      const kout = inOut(prog(T, ins.b, ins.b + TRI));
      const img = <InsertImg id={ins.id} src={ins.src} p={prog(T, ins.a, ins.b + TRI)} />;
      body =
        kout <= 0 ? (
          <>
            {kin < 1 && (
              <AbsoluteFill style={{transform: `translateX(${-kin * 520}px)`}}>
                <Base T={T} />
              </AbsoluteFill>
            )}
            <AbsoluteFill style={{clipPath: clipLeft(kin), overflow: 'hidden'}}>
              <AbsoluteFill style={{transform: `translateX(${(1 - kin) * 520}px)`}}>{img}</AbsoluteFill>
            </AbsoluteFill>
          </>
        ) : (
          <>
            <AbsoluteFill style={{transform: `translateX(${-kout * 420}px)`}}>{img}</AbsoluteFill>
            <AbsoluteFill style={{clipPath: clipLeft(kout), overflow: 'hidden'}}>
              <AbsoluteFill style={{transform: `translateX(${(1 - kout) * 520}px)`}}>
                <Base T={T} />
              </AbsoluteFill>
            </AbsoluteFill>
          </>
        );
    } else {
      // 10 → ロゴ: 横の Whip pan（画面を右へ押し出し、ロゴのライムの面が左から入る）
      const k = inOut(prog(T, LOGO_START - 0.5, LOGO_START));
      const blur = Math.sin(Math.PI * k) * 26;
      body =
        k > 0 ? (
          <>
            <AbsoluteFill style={{transform: `translateX(${k * W}px)`}}>
              <VBlur id="cur" n={blur} x>
                <Base T={T} />
              </VBlur>
            </AbsoluteFill>
            <AbsoluteFill style={{transform: `translateX(${-(1 - k) * W}px)`}}>
              <VBlur id="next" n={blur} x>
                <AbsoluteFill style={{background: LOGO_BG, alignItems: 'center', justifyContent: 'center'}}>
                  <Logo tau={0} width={1500} />
                </AbsoluteFill>
              </VBlur>
            </AbsoluteFill>
          </>
        ) : (
          <Base T={T} />
        );
    }
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
