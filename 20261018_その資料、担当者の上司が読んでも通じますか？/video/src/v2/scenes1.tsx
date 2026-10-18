// v2 カット 01–03（0–22 秒）。文字が主役。人物動画・資料は文字の構図の中で意味を支える。
import React from 'react';
import {C, clamp, lerp, prog, seg} from '../lib/anim';
import {ArrowSvg, Cam, ClipImg, H, Iris, Label, Line, Paper, Sprite, W, Wipe, clipBox, clipF, inExpo, inOut, outExpo, typeBase} from './kit';

const LX = 120; // 左の文字列の左端

// =====================================================================
// 01  0–8秒  その資料、／担当者の上司が／読んでも／通じますか？
// 受け渡しの動画の横に、問いが一行ずつ積み上がる。資料が上司に渡る拍で「上司」に印。
// 最後は「？」から紫の円が広がって次へ。
// =====================================================================
export function scene1(t: number) {
  const f = clipF(t, 0.2);
  // 人物は右。問いが大きくなる拍（3.6 秒）で右へ寄って小さくなり、文字に場所を譲る
  const give = outExpo(prog(t, 3.5, 4.3));
  const H1 = lerp(500, 440, give);
  const staffX = lerp(1180, 1280, give);
  const feet = 1010;
  const box = clipBox(staffX, feet, H1);
  const cam = {
    s: seg(t, [[0, 1.1], [3.5, 1.0], [3.62, 1.045], [7.3, 1.07]], (k) => (t < 3.62 ? outExpo(k) : inOut(k))),
    x: seg(t, [[0, 80], [3.5, 0], [7.3, 0]], inOut),
    y: seg(t, [[0, 0], [3.5, 0], [7.3, -30]], inOut),
    r: seg(t, [[0, -1.5], [3.5, 0], [7.3, -1.8]], inOut),
  };
  const out = 7.05;
  return (
    <>
      <Cam {...cam}>
        {/* 人物（受け渡し） */}
        <div style={{position: 'absolute', inset: 0, transform: `translateX(${inExpo(prog(t, out, out + 0.5)) * 900}px)`}}>
          <ClipImg id="handoff" f={f} staffX={staffX} feetY={feet} h={H1} opacity={clamp(t * 8)} />
          <div style={{...typeBase, left: staffX - 60, top: feet + 14, fontSize: 30, fontWeight: 700, color: C.sub, opacity: clamp((t - 0.6) * 3)}}>担当者</div>
          <div style={{...typeBase, left: box.bossX - 30, top: feet + 14, fontSize: 30, fontWeight: 700, color: C.sub, opacity: clamp((t - 0.9) * 3)}}>上司</div>
        </div>
        {/* 問い */}
        <Line t={t} text="その資料、" x={LX} y={120} size={120} weight={800} t0={0.15} t1={out} />
        <Line t={t} text="担当者の上司が" x={LX} y={270} size={166} t0={0.85} t1={out + 0.05} mark={[4, 6, 2.3]} />
        <Line t={t} text="読んでも" x={LX} y={460} size={166} t0={2.55} t1={out + 0.1} />
        <Line t={t} text="通じますか？" x={LX} y={670} size={180} color={C.purple} t0={3.55} t1={out + 0.15} stagger={0.04} />
      </Cam>
      {/* 「？」から紫の円 */}
      <Iris t={t} a={7.35} b={8.0} cx={LX + 5.45 * 180} cy={670 + 92} color={C.purple} r0={20} />
    </>
  );
}

// =====================================================================
// 02  8–15秒  レビューしてほしい。／まず聞く。誰に渡る資料？
// 紫の面で依頼を受け、濃紺の面で「まず聞く」。巨大な「誰」の横に、資料の行き先の二人が滑り込む。
// =====================================================================
export function scene2(t: number) {
  const ink = t >= 10.6;
  const shrink = outExpo(prog(t, 11.9, 12.5));
  const cam = {s: seg(t, [[8, 1.12], [8.8, 1.0], [10.6, 1.08], [10.62, 1.14], [11.9, 1.0], [14.4, 1.1]], inOut), r: seg(t, [[8, 2], [8.8, 0], [10.6, -1.5], [10.62, -2.5], [11.9, 0], [14.4, -1.5]], inOut), x: seg(t, [[8, 0], [10.6, -60], [10.62, 80], [11.9, 0], [14.4, 40]], inOut)};
  const zoomWho = inExpo(prog(t, 14.45, 15.0));
  const card = outExpo(prog(t, 12.6, 13.3));
  const whoX = 110;
  const whoY = 330;
  return (
    <>
      <div style={{position: 'absolute', inset: 0, background: ink ? C.ink : C.purple}} />
      <Cam {...cam}>
        {!ink && (
          <>
            <Line t={t} text="レビュー" x={LX} y={260} size={260} color={C.bg} t0={8.15} t1={10.2} />
            <Line t={t} text="してほしい。" x={LX} y={560} size={150} weight={800} color={C.bg} t0={8.55} t1={10.25} />
            {/* 依頼された資料 */}
            <div style={{position: 'absolute', inset: 0, transform: `translate(${lerp(700, 0, outExpo(prog(t, 8.3, 9.0))) - inExpo(prog(t, 10.2, 10.6)) * 1200}px, 0) rotate(${lerp(18, -6, outExpo(prog(t, 8.3, 9.0)))}deg)`, transformOrigin: '1500px 540px'}}>
              <Paper x={1300} y={230} w={420} h={560} marks={[]} />
            </div>
          </>
        )}
        {ink && (
          <>
            <div style={{position: 'absolute', inset: 0, transform: `translate(${-shrink * 20}px, ${-shrink * 160}px) scale(${lerp(1, 0.48, shrink)})`, transformOrigin: `${LX}px 120px`}}>
              <Line t={t} text="まず聞く。" x={LX} y={380} size={250} color={C.bg} t0={10.62} t1={14.4} />
            </div>
            {/* 誰に渡る資料？ */}
            <div style={{position: 'absolute', inset: 0, transform: `scale(${1 + zoomWho * 14})`, transformOrigin: `${whoX + 230}px ${whoY + 250}px`}}>
              <Line t={t} text="誰" x={whoX} y={whoY} size={500} color={C.yellow} t0={12.0} dur={0.5} />
              <Line t={t} text="に渡る" x={whoX + 520} y={whoY + 150} size={150} color={C.bg} t0={12.3} t1={14.3} />
              <Line t={t} text="資料？" x={whoX + 520} y={whoY + 320} size={150} color={C.bg} t0={12.45} t1={14.35} />
            </div>
            {/* 行き先の二人（明るい札の上） */}
            <div style={{position: 'absolute', left: 1340, top: 300, width: 470, height: 560, transform: `translateX(${(1 - card) * 700 + inExpo(prog(t, 14.2, 14.6)) * 800}px)`}}>
              <div style={{position: 'absolute', inset: 0, background: C.bg, borderRadius: 28}} />
              <Sprite id="staff-neutral" x={140} feetY={480} h={340} />
              <Sprite id="boss-neutral" x={340} feetY={480} h={340} />
              <ArrowSvg x1={90} y1={512} x2={400} y2={512} k={outExpo(prog(t, 13.2, 13.8))} w={6} head={22} />
              <div style={{...typeBase, left: 36, top: 26, fontSize: 30, fontWeight: 800, color: C.sub}}>この資料の行き先</div>
            </div>
          </>
        )}
      </Cam>
      {/* 紫 → 濃紺 */}
      <Wipe t={t} a={10.2} b={11.05} color={C.ink} />
    </>
  );
}

// =====================================================================
// 03  15–22秒  誰が読むか。／決まると、直す所が見えてくる。
// 「誰」の黄色の面から引くと「誰が読むか。」。読み手の側へ資料が回り込み、直す所に印と問いが付く。
// =====================================================================
export function scene3(t: number) {
  const back = outExpo(prog(t, 15.0, 15.8));
  const move = inOut(prog(t, 17.5, 18.3));
  const cam = {s: seg(t, [[15, 1.0], [17.5, 1.1], [18.3, 0.97], [21.4, 1.04]], inOut), r: seg(t, [[15, 0], [17.5, 1.5], [18.3, -1.2], [21.4, 1]], inOut), x: seg(t, [[15, 0], [17.5, -70], [18.3, 40], [21.4, 0]], inOut)};
  // 「誰」の位置
  const qx = LX;
  const qy = 330;
  const qs = 250;
  // 黄色の面: 全面 → 「誰」の背後の印
  const mx = lerp(-40, qx - 10, back);
  const my = lerp(-40, qy + 20, back);
  const mw = lerp(W + 80, qs + 20, back);
  const mh = lerp(H + 80, qs * 0.9, back);
  const paperIn = outExpo(prog(t, 17.8, 18.6));
  const tilt = lerp(24, -3, paperIn);
  return (
    <>
      <Cam {...cam}>
        {/* 見出し（誰が読むか。）は上へ小さく退く */}
        <div style={{position: 'absolute', inset: 0, transform: `translate(${move * 30}px, ${move * -100}px) scale(${lerp(1, 0.42, move)})`, transformOrigin: `${LX}px 130px`}}>
          <div style={{position: 'absolute', left: mx, top: my, width: mw, height: mh, background: C.yellow}} />
          <Line t={t} text="誰" x={qx} y={qy} size={qs} color={C.purple} t0={15.0} dur={0.01} />
          <Line t={t} text="が読むか。" x={qx + qs * 0.98} y={qy} size={qs} t0={15.45} stagger={0.045} />
        </div>
        {/* 読み手（上司）。見出しの横に立ち、資料が回り込む拍で右へ退く */}
        <div style={{position: 'absolute', inset: 0, transform: `translateX(${(1 - outExpo(prog(t, 15.7, 16.4))) * 500 + inExpo(prog(t, 17.3, 17.9)) * 600}px)`}}>
          <Sprite id="boss-read" x={1740} feetY={985} h={520} />
          <div style={{...typeBase, left: 1712, top: 995, fontSize: 30, fontWeight: 700, color: C.sub, opacity: clamp((t - 16.2) * 3)}}>上司</div>
          {t < 17.4 && <ArrowSvg x1={1420} y1={800} x2={1600} y2={800} k={outExpo(prog(t, 16.2, 16.7))} color={C.purple} w={8} head={30} />}
        </div>
        {/* 資料が読み手の側へ回り込む */}
        <div style={{position: 'absolute', inset: 0, transform: `translateX(${(1 - paperIn) * -900}px) rotate(${tilt}deg)`, transformOrigin: '420px 620px', opacity: clamp((t - 17.8) * 6)}}>
          <Paper x={150} y={300} w={460} h={620} marks={[0, outExpo(prog(t, 19.3, 19.8)), 0, 0, outExpo(prog(t, 19.6, 20.1))]} />
        </div>
        <Label t={t} a={19.75} text="説明は？" x={640} y={470} size={46} />
        <Label t={t} a={20.1} text="理由は？" x={640} y={760} size={46} />
        {/* 決まると、直す所が見えてくる。 */}
        <Line t={t} text="決まると、" x={990} y={330} size={104} weight={800} t0={18.25} t1={21.3} />
        <Line t={t} text="直す所が" x={990} y={480} size={150} t0={18.6} t1={21.32} mark={[0, 3, 19.35]} />
        <Line t={t} text="見えてくる。" x={990} y={660} size={150} t0={19.0} t1={21.34} />
      </Cam>
      <Wipe t={t} a={21.3} b={22.1} color={C.ink} />
    </>
  );
}
