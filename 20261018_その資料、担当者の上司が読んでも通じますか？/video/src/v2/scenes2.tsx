// v2 カット 04–09（22–74 秒）。文字が主役。文字の層は図・人物の層と分け、カメラの寄りで文字が切れないようにする。
import React from 'react';
import {C, clamp, lerp, prog, seg} from '../lib/anim';
import {ArrowSvg, Box, Bubble, Cam, ClipImg, H, Lay, Line, Paper, Sprite, W, clipBox, clipF, inExpo, inOut, outExpo, popK, typeBase} from './kit';

const LX = 120;
const small = (t: number, a: number, text: string, x: number, y: number, color: string = C.sub, size = 30) => (
  <div style={{...typeBase, left: x, top: y, fontSize: size, fontWeight: 700, color, opacity: clamp((t - a) * 3)}}>{text}</div>
);
// 場面の出入り（左右へ押し出す）
const pushOut = (t: number, a: number, b: number, dir = -1) => dir * 2100 * inExpo(prog(t, a, b));
const pushIn = (t: number, a: number, b: number, dir = 1) => dir * 2100 * (1 - outExpo(prog(t, a, b)));

// =====================================================================
// 04  22–30秒  その場では、通じる。／経緯を知り、言葉も足せる。
// =====================================================================
export function scene4(t: number) {
  const out = pushOut(t, 29.45, 30.0);
  const room = outExpo(prog(t, 22.2, 23.0));
  const cam = {s: seg(t, [[22, 1.06], [23, 1.0], [29.4, 1.05]], inOut), r: seg(t, [[22, -1.5], [23, 0], [29.4, 0.8]], inOut)};
  return (
    <>
      <Lay x={out}>
        <Cam {...cam}>
          {/* 会議の場 */}
          <Lay s={lerp(0.8, 1, room)} r={lerp(-6, 0, room)} o={room} ox={1300} oy={640}>
            <div style={{position: 'absolute', left: 900, top: 330, width: 820, height: 640, background: C.card, border: `5px solid ${C.line}`, borderRadius: 32}} />
            {small(t, 22.6, '会議の場', 940, 350, C.gray, 34)}
            {[0, 1].map((i) => (
              <Sprite key={i} id="staff-neutral" x={1000 + i * 120} feetY={930} h={260} opacity={0.2} />
            ))}
            <Sprite id="staff-give" x={1290} feetY={930} h={420} />
            <Lay x={lerp(0, 1100, inExpo(prog(t, 29.0, 29.6)))} r={lerp(0, 12, inExpo(prog(t, 29.0, 29.6)))} ox={1530} oy={700}>
              <Paper x={1440} y={600} w={180} h={240} lines={3} r={-4} />
            </Lay>
            <Bubble x={1330} y={400} text="経緯を共有" size={42} s={popK(t, 25.7)} ox="20% 100%" />
            <Bubble x={1060} y={520} text="口頭の補足" size={42} tail={1} s={popK(t, 26.5)} ox="80% 100%" />
          </Lay>
          {/* 会議の外の上司 */}
          <Sprite id="boss-neutral" x={1830} feetY={1040} h={300} opacity={clamp((t - 23.0) * 3)} />
          {small(t, 23.3, '会議には不参加', 1700, 690, C.gray, 28)}
        </Cam>
        {/* 文字 */}
        <Line t={t} text="その場では、" x={LX} y={170} size={120} weight={800} t0={22.3} t1={25.4} />
        <Line t={t} text="通じる。" x={LX} y={330} size={250} t0={22.65} t1={25.45} />
        <Line t={t} text="経緯を知り、" x={LX} y={230} size={150} t0={25.6} t1={29.3} colorAt={(i) => (i < 2 ? C.teal : undefined)} />
        <Line t={t} text="言葉も" x={LX} y={420} size={150} t0={25.9} t1={29.33} colorAt={(i) => (i < 2 ? C.teal : undefined)} />
        <Line t={t} text="足せる。" x={LX} y={610} size={150} t0={26.1} t1={29.36} />
      </Lay>
    </>
  );
}

// =====================================================================
// 05  30–38秒  資料は、その場で終わるとは限らない。／担当者から、その上司へ。
// 受け渡しの動画（01 より引いた構図）。口頭の補足は会議側に置き去りになる。
// =====================================================================
const S5 = {staffX: 1180, feet: 1010, h: 440};
export function scene5(t: number) {
  const inn = pushIn(t, 30.0, 30.55);
  const b = clipBox(S5.staffX, S5.feet, S5.h);
  const walk = prog(t, 30.1, 32.0);
  const swap = t >= 32.0;
  const f = clipF(t, 32.0);
  const paperX = b.bossX - 30;
  const paperY = S5.feet - S5.h * 0.6;
  const zoom = inExpo(prog(t, 37.35, 38.0));
  const cam = {s: seg(t, [[30, 1.0], [32, 1.04], [36, 1.0], [37.35, 1.02]], inOut) * lerp(1, 4.2, zoom), ox: lerp(W / 2, paperX, Math.min(1, zoom * 3)), oy: lerp(H / 2, paperY, Math.min(1, zoom * 3)), r: seg(t, [[30, 0.8], [33, -0.6], [37.35, 0]], inOut)};
  const textOut = inExpo(prog(t, 37.3, 37.7));
  return (
    <Lay x={inn}>
      <Cam {...cam}>
        {/* 置き去りの口頭の補足 */}
        <Lay o={1 - 0.6 * outExpo(prog(t, 31, 32.5))} s={lerp(1, 0.85, outExpo(prog(t, 31, 32.5)))} ox={300} oy={880}>
          <div style={{position: 'absolute', left: 110, top: 760, width: 560, height: 240, border: `4px solid ${C.line}`, borderRadius: 26, background: C.card}} />
          {small(t, 30.2, '会議の場', 140, 780, C.gray, 28)}
          <Bubble x={260} y={830} text="口頭の補足" size={40} s={1} />
        </Lay>
        {!swap && <Sprite id="staff-give" x={lerp(560, S5.staffX, inOut(walk))} feetY={S5.feet - 8 * Math.abs(Math.sin(walk * Math.PI * 5))} h={S5.h} />}
        {!swap && <Sprite id="boss-neutral" x={b.bossX} feetY={S5.feet} h={S5.h} opacity={clamp((t - 30.4) * 3)} />}
        {swap && <ClipImg id="handoff" f={f} staffX={S5.staffX} feetY={S5.feet} h={S5.h} />}
        <ArrowSvg x1={S5.staffX + 60} y1={S5.feet + 30} x2={b.bossX - 60} y2={S5.feet + 30} k={outExpo(prog(t, 32.3, 33.2))} w={7} head={26} />
        {small(t, 32.2, '担当者', S5.staffX - 45, S5.feet + 12)}
        {small(t, 32.4, '上司', b.bossX - 30, S5.feet + 12)}
      </Cam>
      <Lay o={1 - textOut}>
        <Line t={t} text="資料は、" x={LX} y={130} size={120} weight={800} t0={30.4} t1={34.4} />
        <Line t={t} text="その場で終わるとは" x={LX} y={280} size={130} t0={30.7} t1={34.45} />
        <Line t={t} text="限らない。" x={LX} y={440} size={200} color={C.purple} t0={31.1} t1={34.5} />
        <Line t={t} text="担当者から、" x={LX} y={170} size={140} t0={34.6} t1={37.6} />
        <Line t={t} text="その上司へ。" x={LX} y={330} size={190} t0={34.9} t1={37.65} mark={[2, 4, 35.6]} />
      </Lay>
    </Lay>
  );
}

// =====================================================================
// 06  38–47秒  「なぜ、このやり方？」／その理由、資料にありますか？
// 上司の紙面から引いて問い返し。紙面の理由欄の空白へ。
// =====================================================================
const S6 = {staffX: 1130, feet: 1010, h: 470};
export function scene6(t: number) {
  const b = clipBox(S6.staffX, S6.feet, S6.h);
  const paperX = b.bossX - 30;
  const paperY = S6.feet - S6.h * 0.6;
  const pull = outExpo(prog(t, 38.0, 38.9));
  const f = clipF(t, 38.7, 1.5, 0, 2.5);
  const peopleOut = inExpo(prog(t, 42.3, 42.9));
  const docIn = outExpo(prog(t, 42.7, 43.5));
  const out = pushOut(t, 46.45, 47.0, 1);
  const cam = {s: lerp(4.2, 1, pull) * seg(t, [[38.9, 1], [42.3, 1.05], [43.5, 1.0], [46.4, 1.05]], inOut), ox: lerp(paperX, W / 2, pull), oy: lerp(paperY, H / 2, pull), r: seg(t, [[38, 3], [38.9, 0], [42.3, -0.8], [46.4, 0.8]], inOut)};
  return (
    <Lay x={out}>
      <Cam {...cam}>
        <Lay x={peopleOut * 1300}>
          <ClipImg id="question" f={f} staffX={S6.staffX} feetY={S6.feet} h={S6.h} />
          <Bubble x={b.bossX + 40} y={S6.feet - S6.h - 260} text="？" size={70} kind="ask" s={popK(t, 40.1)} ox="25% 100%" />
          {small(t, 38.9, '担当者', S6.staffX - 45, S6.feet + 14)}
          {small(t, 38.9, '上司', b.bossX - 30, S6.feet + 14)}
        </Lay>
        <Lay x={(1 - docIn) * -1100} r={lerp(-14, -3, docIn)} ox={400} oy={640} o={docIn > 0 ? 1 : 0}>
          <Paper x={140} y={280} w={500} h={680} lines={4}>
            <Box x={60} y={490} w={370} h={120} text="理由は？" size={48} kind="purple" dashed march={t * 60} style={{transform: `scale(${1 + 0.05 * Math.sin(t * 3)})`}} />
          </Paper>
        </Lay>
      </Cam>
      <Line t={t} text="「なぜ、" x={LX} y={170} size={170} color={C.purple} t0={40.2} t1={42.5} />
      <Line t={t} text="このやり方？」" x={LX} y={380} size={170} color={C.purple} t0={40.45} t1={42.55} />
      <Line t={t} text="その理由、" x={760} y={260} size={140} t0={43.4} t1={46.4} colorAt={(i) => (i >= 2 && i < 4 ? C.purple : undefined)} />
      <Line t={t} text="資料に" x={760} y={450} size={170} t0={43.7} t1={46.42} />
      <Line t={t} text="ありますか？" x={760} y={650} size={170} t0={43.95} t1={46.44} />
    </Lay>
  );
}

// =====================================================================
// 07  47–57秒  資料に欠けがあると、／担当者も説明できない。／そこで、話が止まる。
// 目的 → 理由は？ → 結論。説明の矢印が空白で折れる。「止まる」で画面全体が止まり、欠けが前面へ。
// =====================================================================
export function scene7(t: number) {
  const inn = pushIn(t, 47.0, 47.5, 1);
  const stopAt = 52.6;
  const frozen = t >= stopAt && t < stopAt + 0.42;
  const tc = frozen ? stopAt : t;
  const grow = outExpo(prog(t, 53.05, 53.9));
  const dive = inExpo(prog(t, 56.35, 57.0));
  const f = clipF(t, 47.0, 1.5, 2.5, 6);
  const snap = prog(tc, 49.0, 49.9);
  const cam = {s: seg(tc, [[47, 1.0], [52.6, 1.05], [53.05, 1.05], [56.35, 1.0]], inOut), r: seg(tc, [[47, -1], [52.6, 0.8], [53.05, 0], [56.35, -0.5]], inOut)};
  const box = {x: lerp(700, 360, grow), y: lerp(560, 470, grow), w: lerp(320, 1200, grow), h: lerp(120, 420, grow)};
  return (
    <Lay x={inn}>
      <Cam {...cam}>
        <Lay o={1 - grow} x={-grow * 200}>
          <Box x={160} y={560} w={300} h={120} text="目的" size={56} s={popK(t, 47.25)} />
          <Box x={1180} y={560} w={300} h={120} text="結論" size={56} s={popK(t, 47.45)} />
          <ArrowSvg x1={480} y1={620} x2={680} y2={620} k={outExpo(prog(tc, 47.6, 48.1))} w={8} head={28} />
          {/* 理由→結論の矢印は、空白から伸びきれずに折れて落ちる */}
          <Lay y={inExpo(snap) * 420} r={inExpo(snap) * 28} ox={1040} oy={620} o={1 - clamp((snap - 0.6) * 2.5)}>
            <ArrowSvg x1={1040} y1={620} x2={1160} y2={620} k={outExpo(prog(tc, 48.3, 48.8))} w={8} head={28} color={C.teal} />
          </Lay>
          <ClipImg id="question" f={f} staffX={1420} feetY={1050} h={330} />
          {small(tc, 49.6, '説明の線が、つながらない', 640, 720, C.purple, 34)}
        </Lay>
        <Box x={box.x} y={box.y} w={box.w} h={box.h} text="理由は？" size={lerp(56, 170, grow)} kind="purple" dashed march={tc * 60} s={popK(t, 47.35)} />
      </Cam>
      <Line t={t} text="資料に欠けがあると、" x={LX} y={170} size={140} t0={47.4} t1={50.1} colorAt={(i) => (i >= 3 && i < 5 ? C.purple : undefined)} />
      <Line t={t} text="担当者も説明できない。" x={LX} y={130} size={140} t0={50.45} t1={56.3} />
      <Line t={t} text="そこで、話が止まる。" x={LX} y={300} size={140} color={C.purple} t0={stopAt - 0.02} dur={0.2} stagger={0.012} t1={56.3} />
      {/* 次へ: 空白の中へ入る */}
      {dive > 0 && <div style={{position: 'absolute', inset: 0, background: C.lilac, opacity: dive}} />}
    </Lay>
  );
}

// =====================================================================
// 08  57–67秒  知っているとは限らない。／初めて出る言葉に、一言そえる。
// 孤立した用語の札。「？」が落ち、「何をする手法か」が横から連結する。
// =====================================================================
export function scene8(t: number) {
  const from = 1 - outExpo(prog(t, 57.0, 57.7));
  const link = outExpo(prog(t, 61.7, 62.4));
  const out = pushOut(t, 66.45, 67.0);
  const qDrop = inExpo(prog(t, 61.3, 61.9));
  const cam = {s: seg(t, [[57.7, 1.0], [61.3, 1.05], [62.4, 1.0], [66.4, 1.04]], inOut), r: seg(t, [[57.7, -0.6], [61.3, 0.6], [62.4, 0], [66.4, -0.5]], inOut)};
  return (
    <Lay x={out}>
      <div style={{position: 'absolute', inset: 0, background: C.lilac, opacity: from}} />
      <Cam {...cam}>
        {/* 資料の枠 */}
        <Lay o={link} s={lerp(0.92, 1, link)} ox={900} oy={700}>
          <div style={{position: 'absolute', left: 160, top: 520, width: 1360, height: 360, background: C.card, border: `5px solid ${C.ink}`, borderRadius: 24}} />
          {small(t, 61.8, '資料', 190, 536, C.gray, 30)}
        </Lay>
        <Box x={lerp(560, 240, link)} y={620} w={420} h={150} text="手法の名前" size={62} s={popK(t, 57.3)} />
        <div style={{...typeBase, left: 1060, top: 520 + qDrop * 500, fontSize: 320, fontWeight: 900, color: C.purple, transform: `rotate(${qDrop * 40}deg) scale(${popK(t, 58.0)})`, opacity: 1 - qDrop}}>？</div>
        <Box x={lerp(1900, 820, link)} y={620} w={560} h={150} text="何をする手法か" size={58} kind="yellow" o={t > 61.6 ? 1 : 0} />
        <ArrowSvg x1={680} y1={695} x2={800} y2={695} k={outExpo(prog(t, 62.3, 62.7))} w={8} head={26} />
        <Sprite id="boss-read" x={1720} feetY={1010} h={480} />
        {small(t, 57.6, '上司', 1690, 1020)}
      </Cam>
      <Line t={t} text="知っているとは" x={LX} y={130} size={130} t0={57.4} t1={61.5} />
      <Line t={t} text="限らない。" x={LX} y={290} size={180} color={C.purple} t0={57.7} t1={61.55} />
      <Line t={t} text="初めて出る言葉に、" x={LX} y={140} size={120} weight={800} t0={61.65} t1={66.3} />
      <Line t={t} text="一言そえる。" x={LX} y={290} size={190} t0={61.95} t1={66.35} mark={[0, 2, 62.6]} />
    </Lay>
  );
}

// =====================================================================
// 09  67–74秒  知っている相手なら、説明は飛ばせる。／必要なページまで、消さなくていい。
// 話す流れ（青緑）は頁を飛び越える。飛ばした頁は残り、手前へ起きて次の画面になる。
// =====================================================================
export function scene9(t: number) {
  const inn = pushIn(t, 67.0, 67.5);
  const hop = inOut(prog(t, 68.4, 69.8));
  const keep = outExpo(prog(t, 70.8, 71.5));
  const rise = inExpo(prog(t, 72.6, 74.0));
  const xs = [380, 810, 1240];
  // 弧の点
  const arc = (u: number) => [lerp(530, 1390, u), 550 - Math.sin(u * Math.PI) * 130] as const;
  const pts = Array.from({length: 33}, (_, i) => arc((i / 32) * hop));
  const d = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0]},${p[1]}`).join(' ');
  const end = arc(hop);
  return (
    <Lay x={inn}>
      <Cam s={seg(t, [[67, 1.0], [70.6, 1.04], [72.6, 1.0]], inOut) * lerp(1, 7, rise)} ox={xs[1] + 160} oy={810} r={seg(t, [[67, 0.6], [70.6, -0.6], [72.6, 0]], inOut)}>
        {xs.map((x, i) => (
          <Lay key={i} y={i === 1 ? -keep * 30 : 0} s={i === 1 ? 1 + keep * 0.06 : 1} ox={x + 160} oy={800} o={i === 1 ? 1 : 1 - rise}>
            <Paper x={x} y={560} w={300} h={380} lines={4} marks={i === 1 ? [0, keep, 0, keep] : []} r={[-3, 1.5, 3][i]} />
          </Lay>
        ))}
        {hop > 0 && (
          <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', opacity: 1 - rise}} width={1} height={1}>
            <path d={d} fill="none" stroke={C.teal} strokeWidth={9} strokeLinecap="round" />
            <circle cx={end[0]} cy={end[1]} r={14} fill={C.teal} />
          </svg>
        )}
        {small(t, 68.9, '話すときは飛ばせる', 810, 478, C.teal, 34)}
        <div style={{...typeBase, left: 640, top: 975, fontSize: 40, fontWeight: 800, color: C.purple, opacity: clamp((t - 67.8) * 3) * (1 - clamp((t - 70.6) * 4))}}>説明を飛ばす ＝ ページを消す？</div>
        <div style={{...typeBase, left: 760, top: 970, fontSize: 44, fontWeight: 900, color: C.ink, opacity: keep * (1 - rise)}}>必要なページは残る</div>
      </Cam>
      <Lay o={1 - rise}>
        <Line t={t} text="知っている相手なら、" x={LX} y={110} size={110} weight={800} t0={67.4} t1={70.5} />
        <Line t={t} text="説明は飛ばせる。" x={LX} y={250} size={150} t0={67.7} t1={70.55} colorAt={(i) => (i >= 3 && i < 7 ? C.teal : undefined)} />
        <Line t={t} text="必要なページまで、" x={LX} y={110} size={120} weight={800} t0={70.6} t1={73.9} />
        <Line t={t} text="消さなくていい。" x={LX} y={260} size={170} t0={70.9} t1={73.95} mark={[0, 7, 71.5]} />
      </Lay>
    </Lay>
  );
}

