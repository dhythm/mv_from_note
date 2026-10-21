// 01–05: 思い込み → 答え → 苦しかったPM → 休日の夢中 → 香港へ
// 時刻はカットの頭からの秒。声はカットの頭から VO 秒後に始まる（文の位置は audio/voice の実測）。
import React from 'react';
import {staticFile} from 'remotion';
import {Bg, C, DrawLine, F, H, Lay, Line, PhotoText, Plate, VLine, VideoWindow, W, inOut, kv, outExpo, prog} from './kit';
import {VO} from './timeline';
import type {CutProps} from './Main';

const v = (s: number) => VO + s; // 声の頭からの秒 → カットの頭からの秒

// ---- 01 「つらい時間」の対価？ ----
export const Cut01: React.FC<CutProps> = ({t}) => {
  // 縦の列を上下から重くかみ合わせ、読む間は列どうしを逆向きにずらす
  const shift = kv(t, [[0.5, 0], [8.8, 1]]);
  // 「対価？」が入ると、構図全体が左へ組み替わる
  const re = outExpo(prog(t, v(4.45), v(5.2)));
  const camS = kv(t, [[0, 1.16], [9, 1.0]]);
  return (
    <>
      <Bg color={C.ink} />
      <Lay x={-re * 360} s={camS}>
        <VLine t={t} text="仕事" x={1060} y={150 + shift * 80} size={200} color={C.white} t0={0.05} dir="down" stagger={0.1} />
        <Line t={t} text="＝" x={880} y={420} size={120} font={F.dela} color={C.amber} t0={v(0.75)} dir="left" anchor="c" />
        <VLine t={t} text="つらい時間" x={700} y={150 - shift * 80} size={150} color={C.white} t0={v(1.05)} dir="up" stagger={0.07} />
      </Lay>
      <Line t={t} text="対価？" x={1080} y={400} size={240} font={F.dela} color={C.amber} t0={v(4.6)} dir="left" stagger={0.06} />
      <DrawLine x1={1090} y1={730} x2={1800} y2={730} k={outExpo(prog(t, v(5.0), v(6.0)))} w={10} head={34} />
    </>
  );
};

// ---- 02 楽しく働いて、お金をもらう。 ----
export const Cut02: React.FC<CutProps> = ({t}) => {
  const near = outExpo(prog(t, v(0.05), v(0.9)));
  // 組み上がったブロックごと斜めに横断する
  const bx = kv(t, [[v(2.0), 0], [10, -220]], );
  const by = kv(t, [[v(2.0), 0], [10, 70]]);
  const br = kv(t, [[0, -7], [v(2.2), -3], [10, 1.5]]);
  const band = kv(t, [[-0.5, -900], [10, 1500]]);
  return (
    <>
      <Bg color={C.amber} />
      {/* 背後で大きく横切る濃いアンバーの帯（面の運動） */}
      <div style={{position: 'absolute', left: band, top: -300, width: 520, height: H + 600, background: C.amberDeep, transform: 'rotate(18deg)', opacity: 0.55}} />
      <Lay x={bx} y={by} r={br}>
        <Lay s={1.7 - 0.7 * near} ox={W / 2} oy={340}>
          <Line t={t} text="楽しく働く。" x={W / 2 - 40} y={230} size={232} font={F.dela} color={C.ink} t0={v(0.05)} anchor="c" stagger={0.035} />
        </Lay>
        <Line t={t} text="お金をもらう。" x={W / 2 + 230} y={520} size={162} font={F.dela} color={C.ink} t0={v(1.75)} dir="left" anchor="c" stagger={0.035} />
      </Lay>
      <Plate x={1100} y={790} w={640} h={110} k={outExpo(prog(t, v(6.0), v(6.6)))} color={C.ink} from="r">
        <Line t={t} text="両方、できた。" x={320} y={22} size={66} color={C.white} t0={v(6.15)} anchor="c" />
      </Plate>
    </>
  );
};

// ---- 03 成果は出た。でも苦しかった。 ----
export const Cut03: React.FC<CutProps> = ({t}) => {
  const lab = inOut(prog(t, v(3.55), v(4.25)));
  const back = inOut(prog(t, v(7.4), v(8.4)));
  return (
    <>
      <Bg color={C.ink} />
      <DrawLine x1={120} y1={930} x2={1800} y2={930} k={outExpo(prog(t, 0.3, 1.6))} color={C.ink2} w={4} />
      {/* 時点表示: 最初は大きく、評価の話に入ると左上の札に縮む */}
      <Lay x={kv(t, [[0, 60], [v(3.55), -60]]) + lab * 60} y={-lab * 110} s={1 - lab * 0.74} ox={150} oy={260}>
        <Line t={t} text="20代 / PM" x={150} y={300} size={250} font={F.dela} color={C.white} t0={v(0.05)} stagger={0.05} spacing={0.1} style={{fontFeatureSettings: 'normal'}} />
      </Lay>
      {/* 二段を逆向きに流す。成果は奥へ、苦しさは前へ */}
      <Lay s={1 - back * 0.2} y={-back * 70} x={-(t - v(4.5)) * 32} o={1 - back * 0.5} ox={W / 2} oy={400}>
        <Line t={t} text="成果は出た。" x={180} y={330} size={168} color={C.blue} t0={v(4.45)} dir="left" />
      </Lay>
      <Lay s={1 + back * 0.12} y={back * 20} x={(t - v(6.1)) * 30} ox={W / 2} oy={680}>
        <Line t={t} text="でも、苦しかった。" x={250} y={590} size={182} color={C.white} t0={v(6.05)} dir="right" stagger={0.035} />
      </Lay>
    </>
  );
};

// ---- 04 休日は、夢中だった。 ----
export const Cut04: React.FC<CutProps> = ({t, start}) => {
  const open = outExpo(prog(t, v(1.2), v(1.9)));
  const wide = inOut(prog(t, v(2.9), v(4.2)));
  // 窓は右の切り抜きから、斜めの大きな帯へ広がる
  const x = 820 - wide * 230;
  const y = 150 - wide * 40;
  const w = 1000 + wide * 300;
  const h = 560 + wide * 140;
  const sk = 70 + wide * 60;
  const clip = `polygon(${sk + (1 - open) * w}px 0, ${w}px 0, ${w - sk}px ${h}px, ${(1 - open) * w}px ${h}px)`;
  const drift = kv(t, [[0, 0], [10, -70]]);
  return (
    <>
      <Bg color={C.paper} />
      <Lay y={kv(t, [[0, -30], [10, 50]])}>
        <VLine t={t} text="休日" x={260} y={150} size={250} font={F.dela} color={C.ink} t0={0.05} dir="down" stagger={0.12} />
      </Lay>
      <Lay x={drift}>
        {open > 0 && <VideoWindow vStart={start + v(1.2)} x={x} y={y} w={w} h={h} clip={clip} fy={0.55} until={8.6} />}
        {open > 0.5 && (
          <div style={{position: 'absolute', left: x + w - 300, top: y - 40, fontFamily: F.noto, fontWeight: 500, fontSize: 24, color: C.mute}}>手元のイメージ映像</div>
        )}
      </Lay>
      {/* 「夢中。」は窓の縁をまたいで進む */}
      <Lay x={kv(t, [[v(5.9), 200], [10, -170]])}>
        <Line t={t} text="つくることに、" x={330} y={820} size={84} color={C.ink} t0={v(5.95)} />
        <Plate x={960} y={720} w={600} h={250} k={outExpo(prog(t, v(6.2), v(6.75)))} color={C.amber} from="l">
          <Line t={t} text="夢中。" x={300} y={20} size={210} font={F.dela} color={C.ink} t0={v(6.35)} anchor="c" />
        </Plate>
      </Lay>
    </>
  );
};

// ---- 05 30歳、香港へ。 ----
export const Cut05: React.FC<CutProps> = ({t}) => {
  const z = kv(t, [[-0.5, 1.35], [v(3.4), 1.0, outExpo]]);
  const op = inOut(prog(t, v(3.45), v(4.15))); // 字のマスクが写真面へ開く
  const pan = kv(t, [[-0.5, 0], [8, -560]], );
  // 写真面: 「香港」の字の外接矩形から、右側の大きな面へ
  const r0 = {l: 330, t: 250, r: 1590, b: 830};
  const r1 = {l: 860, t: 0, r: W, b: H};
  const L = r0.l + (r1.l - r0.l) * op;
  const T = r0.t + (r1.t - r0.t) * op;
  const R = r0.r + (r1.r - r0.r) * op;
  const B = r0.b + (r1.b - r0.b) * op;
  const left = outExpo(prog(t, v(3.75), v(4.45)));
  return (
    <>
      <Bg color={C.ink} />
      {/* 写真の面（文字の中と同じ写真・同じ動き） */}
      {op > 0 && (
        <div style={{position: 'absolute', inset: 0, clipPath: `inset(${T}px ${W - R}px ${H - B}px ${L}px)`}}>
          <div style={{position: 'absolute', left: 260 + pan, top: -220, width: 2000, height: 1500, backgroundImage: `url(${staticFile('hong-kong.jpg')})`, backgroundSize: 'cover', transform: `scale(${1.0 + op * 0.06})`}} />
          <div style={{position: 'absolute', right: 30, bottom: 26, fontFamily: F.noto, fontWeight: 500, fontSize: 22, color: 'rgba(255,250,240,0.8)'}}>香港の街のイメージ</div>
        </div>
      )}
      <Lay s={z} o={1 - op}>
        <PhotoText text="香港" x={330} y={230} size={600} bx={-70 + pan} by={-450} bw={2000} style={{filter: 'brightness(1.45) saturate(1.15)'}} />
        {/* 字形が読めるよう、同じ字の輪郭だけを重ねる */}
        <div style={{position: 'absolute', left: 330, top: 230, fontFamily: F.dela, fontSize: 600, lineHeight: 1, whiteSpace: 'nowrap', fontFeatureSettings: '"palt" 1', color: 'transparent', WebkitTextStroke: `5px ${C.amber}`}}>香港</div>
      </Lay>
      <Line t={t} text="30歳、" x={120} y={100} size={96} font={F.dela} color={C.amber} t0={v(0.05)} t1={v(3.5)} />
      {/* 左の文字面 */}
      <Plate x={-40} y={0} w={900} h={H} k={left} color={C.amber} from="l">
        <Line t={t} text="30歳、" x={140} y={260} size={156} font={F.dela} color={C.ink} t0={v(3.95)} />
        <Line t={t} text="香港へ。" x={140} y={450} size={156} font={F.dela} color={C.ink} t0={v(4.15)} />
        <Line t={t} text="スタートアップに出向" x={146} y={690} size={58} color={C.ink} t0={v(4.5)} />
      </Plate>
    </>
  );
};
