// v2 カット 10–15（74–148 秒）。文字が主役。文字の層は図・人物の層と分け、カメラの寄りで文字が切れないようにする。
import React from 'react';
import {C, clamp, lerp, prog, seg} from '../lib/anim';
import {ArrowSvg, Box, Bubble, Cam, ClipImg, Iris, Lay, Line, Paper, Sprite, W, Wipe, clipF, inExpo, inOut, outExpo, popK, typeBase} from './kit';

const LX = 120;
const small = (t: number, a: number, text: string, x: number, y: number, color: string = C.sub, size = 30, o = 1) => (
  <div style={{...typeBase, left: x, top: y, fontSize: size, fontWeight: 800, color, opacity: clamp((t - a) * 3) * o}}>{text}</div>
);
const pushOut = (t: number, a: number, b: number, dir = -1) => dir * 2100 * inExpo(prog(t, a, b));
const pushIn = (t: number, a: number, b: number, dir = 1) => dir * 2100 * (1 - outExpo(prog(t, a, b)));

// =====================================================================
// 10  74–86秒  話す内容は、その場に合わせて削る。／資料には、その先の読み手に必要な情報を残す。
// 二つの場を並べ、口頭の言葉の塊は縮み、資料の紙面は手前へ展開する。
// =====================================================================
export function scene10(t: number) {
  const from = 1 - outExpo(prog(t, 74.0, 74.7)); // 09 の頁から
  const toR = inOut(prog(t, 79.1, 79.9));
  const both = inOut(prog(t, 83.0, 83.9));
  const dive = inExpo(prog(t, 85.4, 86.0));
  const squeeze = inOut(prog(t, 77.0, 77.7));
  const expand = outExpo(prog(t, 80.2, 81.0));
  // 寄り先: 左の場 → 右の場 → 両方
  const fx = lerp(lerp(510, 1410, toR), W / 2, both);
  const slot = {x: 1250, y: 790};
  const s = lerp(1.12, 1.0, both) * lerp(1, 3.8, dive);
  const cam = {s, x: (W / 2 - fx) * lerp(1.12, 1, both) * (1 - dive), ox: lerp(W / 2, slot.x, Math.min(1, dive * 3)), oy: lerp(700, slot.y, Math.min(1, dive * 3)), r: seg(t, [[74, -0.8], [79.1, 0.6], [79.9, -0.6], [83, 0.4], [83.9, 0], [85.4, 0]], inOut)};
  return (
    <>
      <Cam {...cam}>
        <Lay o={1 - from * 0.9} s={lerp(1, 0.9, from)} ox={W / 2} oy={700}>
          {/* 左: その場の相手へ */}
          <div style={{position: 'absolute', left: 80, top: 400, width: 860, height: 620, background: C.pale, border: `5px solid ${C.teal}`, borderRadius: 30}} />
          {small(t, 74.3, 'その場の相手へ', 120, 430, C.teal, 38)}
          <Sprite id="staff-give" x={260} feetY={980} h={430} />
          <div style={{position: 'absolute', left: 430, top: lerp(560, 600, squeeze), width: lerp(470, 220, squeeze), height: lerp(220, 120, squeeze), background: C.card, border: `4px solid ${C.teal}`, borderRadius: 60}} />
          <div style={{...typeBase, left: 430, top: 600, width: 470, textAlign: 'center', fontSize: 46, fontWeight: 900, color: C.teal, opacity: 1 - squeeze, transform: `scaleX(${lerp(1, 0.5, squeeze)})`}}>口頭で話す情報</div>
          <div style={{...typeBase, left: 430, top: 670, width: 470, textAlign: 'center', fontSize: 32, fontWeight: 700, color: C.sub, opacity: 1 - squeeze, transform: `scaleX(${lerp(1, 0.5, squeeze)})`}}>経緯・前提・細かな手順</div>
          <div style={{...typeBase, left: 430, top: 625, width: 220, textAlign: 'center', fontSize: 58, fontWeight: 900, color: C.teal, opacity: clamp((t - 77.5) * 4)}}>要点</div>
          {small(t, 77.9, '話す内容を削る', 480, 900, C.teal, 50)}
          {/* 右: その先の読み手へ */}
          <div style={{position: 'absolute', left: 980, top: 400, width: 860, height: 620, background: C.card, border: `5px solid ${C.line}`, borderRadius: 30}} />
          {small(t, 74.4, 'その先の読み手へ', 1020, 430, C.ink, 38)}
          <Sprite id="boss-read" x={1680} feetY={980} h={430} />
          <Lay s={lerp(0.82, 1.0, expand)} ox={1250} oy={720} r={lerp(-3, 1.5, expand)}>
            <Paper x={1090} y={500} w={320} h={420} lines={4} marks={[0, outExpo(prog(t, 80.8, 81.3)), 0, 0]}>
              <div style={{position: 'absolute', left: 40, top: 300, width: 240 * outExpo(prog(t, 81.2, 81.7)), height: 70, background: C.yellow, borderRadius: 6}} />
              <div style={{...typeBase, left: 40, top: 306, width: 240, textAlign: 'center', fontSize: 44, fontWeight: 900, color: C.ink, opacity: clamp((t - 81.5) * 4)}}>理由</div>
            </Paper>
          </Lay>
          <div style={{...typeBase, left: 1060, top: 940, fontSize: 50, fontWeight: 900, color: C.ink, opacity: clamp((t - 81.7) * 3), backgroundImage: `linear-gradient(${C.yellow}, ${C.yellow})`, backgroundSize: `${outExpo(prog(t, 81.9, 82.4)) * 100}% 40%`, backgroundPosition: '0 90%', backgroundRepeat: 'no-repeat'}}>必要な情報を残す</div>
        </Lay>
      </Cam>
      <Lay o={1 - dive}>
        <Line t={t} text="話す内容は、" x={LX} y={80} size={110} weight={800} t0={74.4} t1={79.2} />
        <Line t={t} text="その場に合わせて削る。" x={LX} y={215} size={130} t0={74.7} t1={79.25} colorAt={(i) => (i >= 8 && i < 10 ? C.teal : undefined)} />
        <Line t={t} text="資料には、その先の読み手に" x={LX} y={80} size={104} weight={800} t0={79.4} t1={85.3} />
        <Line t={t} text="必要な情報を残す。" x={LX} y={215} size={130} t0={79.75} t1={85.35} mark={[0, 7, 80.6]} />
      </Lay>
    </>
  );
}

// =====================================================================
// 11  86–97秒  選んだものは、書いてある。／でも、選んだ理由がない。／「他のやり方は？」が残る。
// 候補 A・B・C から B が紙面へ。理由の欄はない。上司の問いが画面の中心へ迫る。
// =====================================================================
export function scene11(t: number) {
  const from = 1 - outExpo(prog(t, 86.0, 86.8));
  const pick = inOut(prog(t, 88.6, 89.4));
  const loom = inOut(prog(t, 94.0, 95.0));
  const dive = inExpo(prog(t, 96.4, 97.0));
  const cam = {s: lerp(1.6, 1, 1 - from) * seg(t, [[86.8, 1.0], [89.4, 1.04], [92, 1.0], [96.4, 1.05]], inOut), r: seg(t, [[86, 2], [86.8, 0], [89.4, -0.8], [92, 0.6], [96.4, 0]], inOut)};
  const cands = ['A', 'B', 'C'];
  const qx = lerp(1180, 620, loom);
  const qy = lerp(470, 600, loom);
  const qs = lerp(1, 1.9, loom) * lerp(1, 9, dive);
  return (
    <>
      <Cam {...cam}>
        <Sprite id="staff-neutral" x={230} feetY={1010} h={460} />
        {small(t, 86.6, '担当者', 190, 1022)}
        <Sprite id={t < 91.9 ? 'boss-read' : 'boss-ask'} x={1690} feetY={1010} h={460} />
        {small(t, 86.6, '上司', 1660, 1022)}
        {cands.map((k, i) => {
          const isB = k === 'B';
          const x0 = 430 + i * 380;
          const y0 = 440;
          const x = isB ? lerp(x0, 790, pick) : x0;
          const y = isB ? lerp(y0, 640, pick) : y0 - pick * 30;
          return <Box key={k} x={x} y={y} w={330} h={120} text={`候補 ${k}`} size={52} kind={isB ? (pick > 0.1 ? 'yellow' : 'plain') : pick > 0.5 ? 'gray' : 'plain'} s={popK(t, 86.4 + i * 0.15) * (isB ? lerp(1, 0.7, pick) : 1)} o={isB ? 1 : lerp(1, 0.55, pick) * (1 - loom * 0.7)} />;
        })}
        {/* B だけが書かれた紙面。理由の欄はない */}
        <Lay o={clamp((t - 88.9) * 4) * (1 - loom * 0.9)}>
          <Paper x={760} y={560} w={390} h={470} lines={3} r={-2}>
            <div style={{position: 'absolute', left: 50, top: 330, width: 280, height: 90}}>
              <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={280} height={90}>
                <rect x={2} y={2} width={276} height={86} rx={14} fill="none" stroke={C.purple} strokeWidth={4} strokeDasharray="20 12" strokeDashoffset={-t * 60} />
              </svg>
            </div>
          </Paper>
        </Lay>
        {small(t, 90.6, '理由の欄がない', 1180, 900, C.purple, 40, 1 - loom)}
        <Bubble x={qx} y={qy} text="他のやり方は？" kind="ask" size={56} tail={1} s={popK(t, 92.0) * qs} ox="50% 50%" />
      </Cam>
      <Lay o={1 - dive}>
        <Line t={t} text="選んだものは、" x={LX} y={110} size={130} t0={86.5} t1={90.2} />
        <Line t={t} text="書いてある。" x={LX} y={270} size={130} t0={86.8} t1={90.25} />
        <Line t={t} text="でも、" x={LX} y={110} size={120} weight={800} t0={90.4} t1={93.7} />
        <Line t={t} text="選んだ理由がない。" x={LX} y={260} size={150} t0={90.6} t1={93.75} colorAt={(i) => (i >= 3 && i < 5 ? C.purple : undefined)} />
        <Line t={t} text="「他のやり方は？」" x={LX} y={110} size={140} color={C.purple} t0={93.8} t1={96.3} />
        <Line t={t} text="が残る。" x={LX} y={280} size={140} t0={94.1} t1={96.35} />
      </Lay>
    </>
  );
}

// =====================================================================
// 12  97–109秒  目的 → 選んだ理由 → 進め方／他の候補も、一言。
// 離れていた「選んだ理由」が画面を横断して目的の隣へ着地し、語の列が一本の筋道になる。
// =====================================================================
export function scene12(t: number) {
  const land = 101.3;
  const from = 1 - outExpo(prog(t, 97.0, 97.6));
  const fly = prog(t, 99.3, land);
  const row = outExpo(prog(t, 100.6, 101.6));
  const shake = t > land ? Math.exp(-(t - land) * 7) * Math.sin((t - land) * 40) * 14 : 0;
  // 札の軌道: 右下の奥 → 手前を大きく → 中央
  let rx: number;
  let ry: number;
  let rs: number;
  if (t < 99.3) {
    rx = 1470;
    ry = 820;
    rs = 0.55;
  } else if (fly < 0.6) {
    const a = inOut(fly / 0.6);
    rx = lerp(1470, 980, a);
    ry = lerp(820, 600, a) - Math.sin(a * Math.PI) * 120;
    rs = lerp(0.55, 2.1, a);
  } else {
    const b = outExpo((fly - 0.6) / 0.4);
    rx = lerp(980, 960, b);
    ry = lerp(600, 560, b);
    rs = lerp(2.1, 1, b);
  }
  const A = {x: lerp(160, 140, row), y: lerp(380, 500, row)};
  const Bn = {x: lerp(160, 1380, row), y: lerp(540, 500, row)};
  const cam = {s: seg(t, [[97, 1.0], [99.3, 1.02], [100.4, 0.97], [land, 1.06], [103, 1.0], [108.4, 1.04]], inOut), x: shake, r: seg(t, [[97, -0.6], [99.3, 0], [100.4, 1.5], [land, -1], [102.5, 0], [108.4, 0.6]], inOut)};
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: C.lilac, opacity: from}} />
      <Cam {...cam}>
        <Box x={A.x} y={A.y} w={400} h={140} text="目的" size={70} s={popK(t, 97.3)} />
        <Box x={Bn.x} y={Bn.y} w={400} h={140} text="進め方" size={70} s={popK(t, 97.45)} />
        <div style={{...typeBase, left: 1240, top: 940, fontSize: 36, fontWeight: 800, color: C.purple, opacity: clamp((t - 97.9) * 3) * (1 - clamp((t - 99.3) * 4))}}>理由が、後ろに離れている</div>
        <Box x={rx - 220} y={ry - 70} w={440} h={140} text="選んだ理由" size={68} kind="yellow" s={rs * popK(t, 97.6)} r={t < land ? lerp(-10, 0, fly) : 0} />
        <ArrowSvg x1={560} y1={570} x2={720} y2={570} k={outExpo(prog(t, 101.9, 102.3))} color={C.teal} w={11} head={36} />
        <ArrowSvg x1={1200} y1={570} x2={1360} y2={570} k={outExpo(prog(t, 102.4, 102.8))} color={C.teal} w={11} head={36} />
        {/* 他の候補も一言 */}
        <div style={{position: 'absolute', left: 958, top: 642, width: 4, height: 80 * outExpo(prog(t, 104.0, 104.3)), background: C.gray}} />
        <Box x={700} y={720} w={240} h={84} text="候補A" size={38} kind="gray" s={popK(t, 104.2)} />
        <Box x={980} y={720} w={240} h={84} text="候補C" size={38} kind="gray" s={popK(t, 104.35)} />
        <Sprite id="staff-read" x={330} feetY={1040} h={330} opacity={clamp((t - 101.6) * 3)} />
        <Sprite id="boss-read" x={1590} feetY={1040} h={330} opacity={clamp((t - 101.7) * 3)} />
      </Cam>
      <Line t={t} text="理由は、目的のすぐ近くへ。" x={LX} y={110} size={120} weight={800} t0={97.5} t1={104.3} />
      <Line t={t} text="他の候補も、一言。" x={LX} y={110} size={150} t0={104.5} t1={108.5} mark={[6, 8, 105.2]} />
      <Wipe t={t} a={108.45} b={109.25} color={C.ink} />
    </>
  );
}

// =====================================================================
// 13  109–122秒  自分が初めて聞くなら？／「なぜ、ここだけ違う？」「境目は？」／足す一行、備える答えが見える。
// 読み直しの動画。気づいた問いを、資料に足す一行と当日備える答えの二つへ振り分ける。
// =====================================================================
export function scene13(t: number) {
  const f = clipF(t, 109.4);
  const sort = inOut(prog(t, 117.3, 118.4));
  const out = pushOut(t, 121.5, 122.0);
  const cam = {s: seg(t, [[109, 1.04], [113.3, 1.0], [117.3, 1.04], [118.4, 1.0], [121.4, 1.03]], inOut), r: seg(t, [[109, -0.8], [113.3, 0.5], [117.3, -0.5], [118.4, 0], [121.4, 0.4]], inOut)};
  return (
    <Lay x={out}>
      <Cam {...cam}>
        <Lay x={-sort * 120} s={lerp(1, 0.86, sort)} ox={300} oy={1010}>
          <ClipImg id="reader" f={f} staffX={330} feetY={1010} h={440} />
        </Lay>
        {/* 例外のある図 */}
        <Lay s={lerp(1, 0.7, sort) * popK(t, 112.6)} x={sort * 300} y={sort * 180} ox={1420} oy={620}>
          <div style={{position: 'absolute', left: 1160, top: 470, width: 520, height: 300, background: C.card, border: `5px solid ${C.ink}`, borderRadius: 18}} />
          {Array.from({length: 6}, (_, i) => {
            const odd = i === 4;
            return <div key={i} style={{position: 'absolute', left: 1195 + (i % 3) * 160, top: 505 + Math.floor(i / 3) * 125, width: 130, height: 95, background: odd ? C.lilac : C.pale, border: `4px solid ${odd ? C.purple : C.teal}`, borderRadius: 12}} />;
          })}
        </Lay>
        <Bubble x={lerp(980, 900, sort)} y={lerp(300, 470, sort)} text="なぜ、ここだけ違う？" kind="ask" size={50} s={popK(t, 113.3) * (1 - inExpo(prog(t, 117.75, 118.15)))} />
        <Bubble x={lerp(1420, 900, sort)} y={lerp(810, 700, sort)} text="境目は？" kind="ask" size={50} tail={1} s={popK(t, 114.1) * (1 - inExpo(prog(t, 117.85, 118.25)))} />
        <Box x={840} y={420} w={760} h={150} text="資料に足す一行" size={66} kind="yellow" s={popK(t, 118.4)} />
        <Box x={840} y={620} w={760} h={150} text="当日、答えを用意する" size={66} kind="teal" s={popK(t, 118.6)} />
      </Cam>
      <Line t={t} text="自分が初めて聞くなら？" x={LX} y={110} size={140} t0={109.45} t1={117.1} colorAt={(i) => (i >= 3 && i < 8 ? C.purple : undefined)} />
      <Line t={t} text="足す一行、" x={LX} y={90} size={130} t0={118.8} t1={121.4} mark={[0, 4, 119.4]} />
      <Line t={t} text="備える答えが見える。" x={LX} y={240} size={130} t0={119.05} t1={121.45} colorAt={(i) => (i < 5 ? C.teal : undefined)} />
    </Lay>
  );
}

// =====================================================================
// 14  122–133秒  違いをつけるなら、理由を。／意味のある範囲は区別し、／説明できない違いは、そろえる。
// =====================================================================
export function scene14(t: number) {
  const inn = pushIn(t, 122.0, 122.5);
  const frame = outExpo(prog(t, 126.2, 126.9));
  const unify = inOut(prog(t, 129.5, 130.3));
  const pack = inExpo(prog(t, 132.4, 133.0));
  const cam = {s: seg(t, [[122.5, 1.0], [126.2, 1.05], [126.9, 1.0], [129.5, 1.04], [130.3, 1.0], [132.4, 1.03]], inOut) * lerp(1, 0.2, pack), r: seg(t, [[122.5, -0.8], [126.2, 0.6], [126.9, 0], [129.5, -0.5], [130.3, 0]], inOut), oy: 700};
  const cells = Array.from({length: 6}, (_, i) => {
    const c = i % 3;
    const r = Math.floor(i / 3);
    const oddColor = i === 4;
    const oddLine = i === 2;
    const inScope = c < 2;
    const x = 200 + c * 330;
    const y = 520 + r * 230;
    return (
      <div key={i} style={{position: 'absolute', left: x, top: y, width: 280, height: 180}}>
        <div style={{position: 'absolute', inset: 0, background: oddColor && unify < 0.5 ? C.lilac : inScope && frame > 0.3 ? '#fff3c4' : C.pale, borderRadius: 16, border: oddLine && unify < 0.5 ? 'none' : `4px solid ${C.teal}`}} />
        {oddLine && unify < 0.5 && (
          <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={280} height={180}>
            <rect x={2} y={2} width={276} height={176} rx={16} fill="none" stroke={C.teal} strokeWidth={4} strokeDasharray="18 12" />
          </svg>
        )}
      </div>
    );
  });
  return (
    <Lay x={inn}>
      <Cam {...cam}>
        <Lay x={0}>{cells}</Lay>
        {/* 迷いの破線の枠 */}
        <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: 1 - frame}} width={1} height={1}>
          <rect x={170} y={490} width={1050} height={470} rx={26} fill="none" stroke={C.purple} strokeWidth={5} strokeDasharray="22 14" strokeDashoffset={-t * 40} />
        </svg>
        <div style={{...typeBase, left: 180, top: 440, fontSize: 38, fontWeight: 800, color: C.purple, opacity: clamp((t - 123.0) * 3) * (1 - frame)}}>この違いの意味は？</div>
        {/* 今回の範囲 */}
        <div style={{position: 'absolute', left: 170, top: 490, width: lerp(1050, 700, frame), height: 470, border: `10px solid ${C.yellowDeep}`, borderRadius: 26, opacity: frame}} />
        <Box x={190} y={430} w={300} h={84} text="今回の範囲" size={42} kind="yellow" s={popK(t, 126.6)} />
        <Sprite id={t < 126.6 ? 'boss-think' : 'boss-read'} x={1640} feetY={1010} h={470} />
        {small(t, 122.6, '上司', 1610, 1022)}
      </Cam>
      <Lay o={1 - pack}>
        <Line t={t} text="違いをつけるなら、" x={LX} y={90} size={120} weight={800} t0={122.4} t1={125.8} />
        <Line t={t} text="理由を。" x={LX} y={230} size={150} t0={122.7} t1={125.85} colorAt={(i) => (i < 2 ? C.purple : undefined)} />
        <Line t={t} text="意味のある範囲は区別し、" x={LX} y={90} size={110} weight={800} t0={125.9} t1={132.4} mark={[8, 10, 126.6]} />
        <Line t={t} text="説明できない違いは、そろえる。" x={LX} y={230} size={110} weight={800} t0={129.1} t1={132.45} colorAt={(i) => (i >= 11 && i < 14 ? C.teal : undefined)} />
      </Lay>
    </Lay>
  );
}

// =====================================================================
// 15  133–148秒  記録も、報告も。／誰の手に渡り、どこで読まれるか。／作る前に、決めておく。
// 記録と報告の札をめくって読み手の形に変え、最後は二人の間の資料と、読み手を決める一文。
// =====================================================================
const Flip: React.FC<{x: number; y: number; w: number; h: number; k: number; front: string; back: string; kindBack: 'yellow' | 'teal'}> = ({x, y, w, h, k, front, back, kindBack}) => {
  const ang = 180 * k;
  const showBack = ang > 90;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, perspective: 1600}}>
      <div style={{position: 'absolute', inset: 0, transform: `rotateX(${showBack ? ang - 180 : ang}deg)`}}>
        {showBack ? <Box x={0} y={0} w={w} h={h} text={back} size={54} kind={kindBack} /> : <Box x={0} y={0} w={w} h={h} text={front} size={54} />}
      </div>
    </div>
  );
};
export function scene15(t: number) {
  const inn = pushIn(t, 133.0, 133.5);
  const cardsOut = inExpo(prog(t, 141.5, 142.1));
  const close = outExpo(prog(t, 142.4, 143.2));
  const cam = {s: seg(t, [[133.5, 1.0], [136.2, 1.04], [137.4, 1.0], [141.5, 1.03], [143.2, 1.0], [147.2, 1.05]], inOut), r: seg(t, [[133.5, -0.6], [136.2, 0.6], [137.4, 0], [141.5, -0.5], [143.2, 0], [147.2, 0.4]], inOut)};
  return (
    <Lay x={inn}>
      <Cam {...cam}>
        <Lay y={cardsOut * 700} o={1 - cardsOut}>
          {small(t, 133.6, '記録', 360, 548, C.gray, 38)}
          {small(t, 133.8, '報告', 360, 748, C.gray, 38)}
          <Flip x={480} y={500} w={980} h={140} k={inOut(prog(t, 136.2, 137.0))} front="「あれ」「それ」の会議記録" back="決まったこと・残っていること" kindBack="yellow" />
          <Flip x={480} y={700} w={980} h={140} k={inOut(prog(t, 136.6, 137.4))} front="細かな作業記録" back="使う人から見た変化" kindBack="teal" />
        </Lay>
        <Sprite id={t < 142.4 ? 'staff-give' : 'staff-read'} x={lerp(170, 720, close)} feetY={1040} h={lerp(460, 400, close)} />
        <Sprite id="boss-read" x={lerp(1750, 1200, close)} feetY={1040} h={lerp(460, 400, close)} />
        <Lay o={close} s={lerp(0.8, 1, close)} ox={960} oy={850}>
          <Paper x={850} y={680} w={240} h={320} lines={3} marks={[0, 1, 0]} />
        </Lay>
      </Cam>
      <Line t={t} text="記録も、報告も。" x={LX} y={140} size={190} t0={133.3} t1={137.5} />
      <Line t={t} text="誰の手に渡り、" x={LX} y={80} size={140} t0={137.6} t1={147.25} colorAt={(i) => (i === 0 ? C.purple : undefined)} />
      <Line t={t} text="どこで読まれるか。" x={LX} y={240} size={140} t0={137.9} t1={147.3} colorAt={(i) => (i < 3 ? C.purple : undefined)} />
      <Line t={t} text="作る前に、決めておく。" x={LX} y={420} size={150} t0={143.0} t1={147.35} mark={[0, 4, 143.7]} />
      <Iris t={t} a={147.15} b={147.95} cx={970} cy={840} color={C.lime} r0={10} />
    </Lay>
  );
}

