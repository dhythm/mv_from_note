// カット 1–4・8–9 の画面（時刻から決まる純関数）。文言と狙いは ../plan.html のカット表に対応する。
import React from 'react';
import {C, beatEnv, clamp, damped, ease, lerp, prog, pulse, seg, smooth, wobble} from './lib/anim';
import {Grid} from './components/backdrop';
import {G, KLine, Poly, RRect, Ring, Seg, Txt} from './components/prims';
import {StageSpec} from './components/stage';
import {Arrow, Bubble, Doc, Duo, Person, Room, Spark, Tag, clipFrame, clipGeom, pop} from './parts';
import {L, TOP, TX, add, camBase, drift, hl, hudMove, merge, ripple, streaks, whipIn, whipOut} from './cuts';

// =====================================================================
// CUT 1  0–8秒  その資料、／担当者の上司が読んでも／通じますか？
// 受け渡しの採用動画（近い構図・0.3 秒から 1.5 倍速）。受け渡しの向きに画面全体を横へ運ぶ。
// =====================================================================
const C1 = {staffX: 250, feetY: -600, h: 560};
export function cut1(t: number): StageSpec {
  const g = clipGeom(C1.staffX, C1.feetY, C1.h);
  const paperX = g.bossX - 30;
  const paperY = C1.feetY + C1.h * 0.6;
  const dive = ease.in(prog(t, 7.35, 8.0));
  const cam = add(camBase(t, 11, 14), {
    // 受け取る拍（約 2.5 秒）で画面の重心が上司へ移る
    x: seg(t, [[0, -260], [1.2, -140], [2.6, 120], [4.5, 220], [7.35, 260]], ease.inOut) * (1 - dive) + dive * paperX,
    y: seg(t, [[0, -60], [7.35, -40]]) * (1 - dive) + dive * paperY,
    roll: seg(t, [[0, -5], [1.4, 2], [2.6, -3], [4.5, 2], [6.2, -1.5], [7.35, 0], [8, 5]]),
    zoom: seg(t, [[0, 1.25], [1.0, 1.0], [2.5, 1.06], [2.7, 0.98], [6.5, 0.92], [7.35, 0.95], [8, 3.4]], (k) => (t > 7.3 ? ease.in(k) : ease.inOut(k))),
  });
  const f = clipFrame(t, 0.3);
  const slide = seg(t, [[0, -300], [2.6, 0], [8, 260]], ease.inOut);
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 12),
    world: (
      <>
        <Grid t={t} />
        {/* 背景の面も受け渡しの向きへ流れる */}
        <RRect w={900} h={1400} r={0} x={-900 + slide * 1.6} y={0} z={-700} rz={12} color={C.pale} opacity={0.8} order={4} />
        <RRect w={500} h={1400} r={0} x={1100 + slide * 2.2} y={0} z={-1000} rz={12} color={C.yellow} opacity={0.35} order={4} />
        <Duo id="handoff" f={f} staffX={C1.staffX} feetY={C1.feetY} h={C1.h} opacity={clamp(t * 6)} />
        <Txt text="担当者" size={36} weight={700} color={C.sub} x={C1.staffX} y={C1.feetY + C1.h + 50} opacity={clamp((t - 0.6) * 3) * (1 - clamp((t - 6) * 2))} order={40} />
        <Txt text="上司" size={36} weight={700} color={C.sub} x={g.bossX} y={C1.feetY + C1.h + 50} opacity={clamp((t - 1.2) * 3) * (1 - clamp((t - 6) * 2))} order={40} />
        <Arrow x1={C1.staffX + 140} y1={C1.feetY + C1.h * 0.48} x2={g.bossX - 140} y2={C1.feetY + C1.h * 0.48} k={ease.out(prog(t, 1.4, 2.6))} color={C.ink} w={6} head={26} opacity={1 - clamp((t - 4.5) * 2)} />
        {ripple(t, 2.6, 0.7, paperX, paperY, 30, 260, C.yellowDeep)}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['その資料、'], 104, TX, TOP, 0.25, 7.6, {inStyle: 'slam', outStyle: 'fly', seed: 101, extra: drift(26, 0, 0.25)})} />
        <KLine {...L(['担当者の上司が', '読んでも'], 92, TX, TOP - 140, 1.3, 7.6, {inStyle: 'flip', outStyle: 'fly', seed: 102, emph: hl([0, 4, 6, 1.15, C.ink]), extra: drift(34, 0, 1.3)})} />
        <KLine {...L(['通じますか？'], 108, TX, TOP - 400, 3.4, 7.6, {inStyle: 'drop', outStyle: 'fly', seed: 103, color: C.purple, extra: (c) => ({x: 40 * smooth(prog(c.t, 3.4, 7.5)), s: 1 + 0.05 * Math.sin(c.t * 4 + c.i * 0.6)})})} />
      </>
    ),
  };
}

// =====================================================================
// CUT 2  8–15秒  レビューしてほしい。／まず聞く。誰に渡る資料？
// 机の資料から大きく引き、行き先の人物が滑り込む。問いの塊が時計を押し出す。
// =====================================================================
const Clock: React.FC<{t: number; x: number; y: number; r: number; rz?: number; s?: number}> = ({t, x, y, r, rz = 0, s = 1}) => (
  <G x={x} y={y} rz={rz} s={s}>
    <RRect w={r * 2} h={r * 2} r={r} color={C.pale} order={20} />
    <Ring r={r} width={7} color={C.teal} order={21} />
    <Seg x1={0} y1={0} x2={0} y2={r * 0.55} w={8} color={C.teal} order={22} />
    <Seg x1={0} y1={0} x2={Math.sin(t * 4) * r * 0.78} y2={Math.cos(t * 4) * r * 0.78} w={5} color={C.teal} order={22} />
  </G>
);
export function cut2(t: number): StageSpec {
  const DOC = {x: -380, y: -60};
  const pull = ease.outQuint(prog(t, 8.0, 9.4));
  const push = ease.in(prog(t, 10.85, 11.35));
  const arrive = ease.outBack(prog(t, 10.9, 11.7), 1.3);
  const cam = add(camBase(t, 21, 16), merge(whipOut(t, 15, 880, 7), {
    x: lerp(DOC.x + 60, -60, pull) + seg(t, [[9.4, 0], [11.0, -40], [12.5, 160], [15, 220]], ease.inOut),
    y: lerp(DOC.y, -40, pull),
    roll: seg(t, [[8, -6], [9.4, 2], [10.9, -1.5], [11.3, 4], [12.6, -2], [14, 1.5], [15, 0]]),
    zoom: lerp(3.0, 1.0, pull) * seg(t, [[9.4, 1], [10.85, 1.08], [11.2, 0.94], [13.5, 0.98], [15, 1.06]]),
  }));
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 22),
    world: (
      <>
        <Grid t={t} />
        {/* 机と資料 */}
        <RRect w={620} h={14} r={6} x={DOC.x} y={DOC.y - 240} color={C.ink} order={18} />
        <Doc x={DOC.x} y={DOC.y} w={300} h={380} rz={-2 + 2 * wobble(t, 23, 3)} s={1 + 0.03 * beatEnv(t, 6)} />
        <Clock t={t} x={lerp(180, 1500, push)} y={lerp(140, 380, push)} r={110} rz={-260 * push + 4 * wobble(t, 24, 2)} s={pop(t, 8.6)} />
        {/* 行き先の二人が滑り込む */}
        <Person id="staff-neutral" x={lerp(1300, 220, clamp(arrive))} y={-460} h={360} rz={lerp(-10, 0, clamp(arrive))} label="担当者" />
        <Person id="boss-neutral" x={lerp(1700, 600, clamp(ease.outBack(prog(t, 11.1, 11.9), 1.3)))} y={-460} h={360} label="上司" />
        <Arrow x1={DOC.x + 170} y1={-300} x2={760} y2={-300} k={ease.out(prog(t, 11.6, 12.6))} color={C.ink} w={6} head={26} />
        {ripple(t, 11.0, 0.7, 180, 140, 40, 400, C.purple, 48, 7)}
        {ripple(t, 13.0, 0.8, 600, -270, 30, 260, C.purple)}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['レビューしてほしい。'], 88, TX, TOP, 8.4, 10.9, {inStyle: 'rise', outStyle: 'burst', seed: 201, color: C.teal, extra: drift(30, 0, 8.4)})} />
        <KLine {...L(['まず聞く。', '誰に渡る資料？'], 108, TX, TOP, 10.95, 14.7, {inStyle: 'slam', outStyle: 'fly', seed: 202, emph: hl([1, 0, 1, 1.35, C.purple]), extra: (c) => ({x: 50 * smooth(prog(c.t, 11.5, 14.6)), y: 0})})} />
      </>
    ),
    screen: streaks(t, 14.6, 15.0, 1),
  };
}

// =====================================================================
// CUT 3  15–22秒  誰が読むか。／決まると、直す所が見えてくる。
// 読み手の側へ紙面ごと回り込み、紙の中へ大きく寄る。印が付く。
// =====================================================================
export function cut3(t: number): StageSpec {
  const turn = ease.inOut(prog(t, 17.6, 19.0));
  const docX = lerp(0, 300, turn);
  const cam = add(camBase(t, 31, 16), merge(whipIn(t, 15, -800, -8), whipOut(t, 22, 0, 10, 0.5), {
    x: seg(t, [[15, 0], [17.6, -60], [19.0, docX - 80], [22, docX - 40]], ease.inOut),
    y: seg(t, [[15, -20], [19, -60], [22, -80]]),
    roll: seg(t, [[15, 3], [16.5, -2], [17.6, 1], [18.3, -6], [19.0, 2], [20.5, -1.5], [22, 0]]),
    zoom: seg(t, [[15, 1.0], [17.6, 1.04], [19.0, 1.22], [21.4, 1.28], [22, 2.6]], (k) => (t > 21.4 ? ease.in(k) : ease.inOut(k))),
  }));
  const a1 = ease.out(prog(t, 15.5, 16.4));
  const a2 = ease.out(prog(t, 16.2, 17.1));
  const fade = 1 - turn;
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 32),
    world: (
      <>
        <Grid t={t} />
        <Person id="staff-neutral" x={lerp(-640, -900, turn)} y={-430} h={360} opacity={lerp(1, 0.5, turn)} />
        <Person id="boss-read" x={lerp(640, 760, turn)} y={-430} h={360} />
        <Txt text="上司" size={34} weight={700} color={C.sub} x={lerp(640, 760, turn)} y={-480} order={40} />
        <Arrow x1={-480} y1={-170} x2={-230} y2={-170} k={a1} color={C.ink} w={6} head={24} opacity={fade} />
        <Arrow x1={230} y1={-170} x2={480} y2={-170} k={a2} color={C.ink} w={6} head={24} opacity={fade} />
        <Doc x={docX} y={-170} w={340} h={430} ry={lerp(0, -32, turn) + lerp(0, 32, ease.inOut(prog(t, 19.0, 19.8)))} rz={2 * wobble(t, 33, 3)} s={pop(t, 15.2) * (1 + 0.04 * beatEnv(t, 6))} mark={ease.out(prog(t, 19.4, 19.9))} order={26} />
        <Tag text="説明は？" kind="purple" size={30} x={docX + 260} y={-100} s={pop(t, 19.6, 0.3, 2.2)} rz={-4} order={50} />
        <Tag text="理由は？" kind="purple" size={30} x={docX + 260} y={-240} s={pop(t, 20.0, 0.3, 2.2)} rz={3} order={50} />
        <Spark t={t} at={19.6} x={docX + 260} y={-100} color={C.purple} />
        <Spark t={t} at={20.0} x={docX + 260} y={-240} color={C.purple} />
        {ripple(t, 15.6, 0.7, 640, -250, 30, 300, C.purple)}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['誰が読むか。'], 124, TX, TOP, 15.3, 18.3, {inStyle: 'slam', outStyle: 'sink', seed: 301, emph: hl([0, 0, 1, 1.2, C.purple]), extra: drift(30, 0, 15.3, 0.4)})} />
        <KLine {...L(['決まると、', '直す所が見えてくる。'], 92, TX, TOP, 18.2, 21.8, {inStyle: 'flip', outStyle: 'fly', seed: 302, extra: drift(24, -4, 18.2)})} />
      </>
    ),
  };
}

// =====================================================================
// CUT 4  22–30秒  その場では、通じる。／経緯を知り、言葉も足せる。
// 会議の場がせり出し、補足の吹き出しが広がる。上司（会議の外）との距離は残る。
// =====================================================================
export function cut4(t: number): StageSpec {
  const ROOM = {x: -300, y: -150};
  const out = ease.in(prog(t, 29.0, 30.0)); // 資料だけが枠を越える
  const cam = add(camBase(t, 41, 16), merge(whipOut(t, 30, 700, 6, 0.45), {
    x: seg(t, [[22, -520], [23, -360], [26, -160], [29, 60], [30, 260]], ease.inOut),
    y: seg(t, [[22, -40], [30, -60]]),
    roll: seg(t, [[22, 10], [23, -3], [24.6, 2], [26.0, -2.5], [27.6, 2], [29, 0], [30, 4]]),
    zoom: seg(t, [[22, 1.8], [23, 1.0], [24.6, 1.06], [26.0, 0.98], [28, 1.04], [30, 1.0]]),
  }));
  const jut = ease.outBack(prog(t, 22.0, 22.9), 1.5);
  const b1 = pop(t, 24.4, 0.4, 2);
  const b2 = pop(t, 25.9, 0.4, 2);
  const docX = lerp(-260, 900, out);
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 42),
    world: (
      <>
        <Grid t={t} />
        <Room x={ROOM.x} y={ROOM.y} z={lerp(-600, 0, clamp(jut))} w={1100} h={580} s={clamp(jut, 0, 1.15)} ry={lerp(30, 0, clamp(jut)) + 3 * wobble(t, 43, 5)} />
        {[0, 1].map((i) => (
          <Person key={i} id="staff-neutral" x={ROOM.x - 400 + i * 130} y={ROOM.y - 240} h={250} opacity={0.22 * clamp(jut)} order={20} />
        ))}
        <Person id="staff-give" x={ROOM.x - 120} y={ROOM.y - 250} h={380} opacity={clamp(jut * 2)} />
        <Doc x={docX} y={ROOM.y - 70} w={170} h={220} lines={3} rz={lerp(0, -14, out) + 2 * wobble(t, 44, 3)} s={pop(t, 22.6)} order={34} />
        <Bubble text="経緯を共有" x={ROOM.x + 80 + 40 * smooth(prog(t, 24.4, 29))} y={ROOM.y + 170} size={42} s={b1 * (1 + 0.06 * beatEnv(t, 6))} rz={3 * wobble(t, 45, 2)} />
        <Bubble text="口頭の補足" x={ROOM.x + 300 + 80 * smooth(prog(t, 25.9, 29))} y={ROOM.y + 30} size={42} s={b2 * (1 + 0.06 * beatEnv(t, 6))} rz={-3 * wobble(t, 46, 2)} />
        {/* 会議の外の上司 */}
        <Person id="boss-neutral" x={760} y={-430} h={340} opacity={clamp((t - 22.6) * 3)} />
        <Txt text="会議には不参加" size={32} weight={700} color={C.gray} x={760} y={-30} opacity={clamp((t - 23.2) * 3)} order={40} />
        {ripple(t, 24.4, 0.6, ROOM.x + 80, ROOM.y + 170, 30, 240, C.teal)}
        {ripple(t, 25.9, 0.6, ROOM.x + 300, ROOM.y + 30, 30, 240, C.teal)}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['その場では、通じる。'], 96, TX, TOP, 22.35, 25.7, {inStyle: 'flip', outStyle: 'sink', seed: 401, extra: drift(26, 0, 22.35)})} />
        <KLine {...L(['経緯を知り、', '言葉も足せる。'], 92, TX, TOP, 25.6, 29.6, {inStyle: 'rise', outStyle: 'fly', seed: 402, emph: hl([0, 0, 2, 1.15, C.teal], [1, 0, 2, 1.15, C.teal]), extra: drift(30, 0, 25.6, 0.3)})} />
      </>
    ),
    screen: streaks(t, 29.55, 30.0, 1),
  };
}

// =====================================================================
// CUT 8  57–67秒  知っているとは限らない。／初めて出る言葉に、一言そえる。
// 孤立した用語の札に、説明の面が横から連結する。紙面の中でつながる。
// =====================================================================
export function cut8(t: number): StageSpec {
  const pull = ease.outQuint(prog(t, 57.0, 58.0));
  const link = ease.outBack(prog(t, 61.5, 62.4), 1.4);
  const page = ease.outBack(prog(t, 61.3, 62.2), 1.2);
  const away = ease.in(prog(t, 66.35, 67.0));
  const cam = add(camBase(t, 81, 16), merge(whipOut(t, 67, 800, 7, 0.4), {
    x: lerp(0, -140, pull) + seg(t, [[58, 0], [61.4, 60], [62.4, -40], [64.5, 60], [67, 140]], ease.inOut),
    y: seg(t, [[57, 40], [58, -20], [67, -40]]),
    roll: seg(t, [[57, -5], [58, 2], [59.5, -2], [61.3, 2.5], [62.2, -4], [63.5, 1.5], [65.5, -1], [67, 3]]),
    zoom: lerp(2.6, 1.0, pull) * seg(t, [[58, 1.05], [61.3, 1.1], [62.0, 0.94], [64, 1.04], [66.3, 1.1]]),
  }));
  const termX = lerp(0, -330, clamp(link));
  const shake = damped(t, 62.2, 18, 7, 6);
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 82),
    world: (
      <>
        <Grid t={t} />
        {/* 紙面（二つの札を囲む） */}
        <G x={0} y={-60} s={clamp(page, 0, 1.2)} rz={lerp(-6, 0, clamp(page))}>
          <RRect w={1180} h={360} r={20} color={C.card} order={12} />
          <RRect w={1180} h={360} r={20} border={4} color={C.ink} order={13} />
          <Txt text="資料" size={30} weight={700} color={C.gray} align="left" x={-560} y={140} order={14} />
        </G>
        <Tag text="手法の名前" w={320} size={48} x={termX + shake} y={-60 + 8 * Math.sin(t * 2.4)} s={pop(t, 57.4) * (1 + 0.05 * beatEnv(t, 6))} rz={lerp(3 * wobble(t, 83, 2), 0, clamp(link))} order={40} />
        <Txt text="？" size={200} weight={900} color={C.purple} x={360} y={-40 + 20 * Math.sin(t * 3)} rz={10 * Math.sin(t * 2)} s={pop(t, 58.2, 0.4, 2.5) * (1 - ease.in(prog(t, 61.2, 61.6)))} order={44} />
        <Tag text="何をする手法か" kind="yellow" w={400} size={44} x={lerp(1300, 220, clamp(link)) - away * 200} y={-60} z={away * -900} rz={lerp(20, 0, clamp(link))} order={42} />
        <Arrow x1={termX + 170} y1={-60} x2={20} y2={-60} k={ease.out(prog(t, 62.2, 62.6))} color={C.ink} w={6} head={24} />
        {/* 読む線（担当者から上司まで） */}
        <Seg x1={-520} y1={-200} x2={520} y2={-200} k={ease.inOut(prog(t, 63.0, 64.4))} w={6} color={C.ink} opacity={0.6} order={30} />
        <Person id="staff-give" x={lerp(-1200, -760, ease.out(prog(t, 62.6, 63.4)))} y={-470} h={340} />
        <Person id="boss-read" x={lerp(1200, 740, ease.out(prog(t, 57.6, 58.6)))} y={-470} h={340} />
        <Spark t={t} at={62.2} x={20} y={-60} color={C.yellowDeep} r={160} />
        {ripple(t, 58.2, 0.7, 360, -40, 40, 260, C.purple)}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['知っているとは限らない。'], 92, TX, TOP, 57.4, 61.6, {inStyle: 'drop', outStyle: 'sink', seed: 801, emph: hl([0, 5, 11, 1.12, C.purple]), extra: drift(24, 0, 57.4, -0.3)})} />
        <KLine {...L(['初めて出る言葉に、', '一言そえる。'], 92, TX, TOP, 61.5, 66.6, {inStyle: 'flip', outStyle: 'fly', seed: 802, emph: hl([1, 0, 2, 1.2, C.ink]), extra: drift(30, 0, 61.5)})} />
      </>
    ),
    screen: streaks(t, 66.6, 67.0, 1),
  };
}

// =====================================================================
// CUT 9  67–74秒  知っている相手なら、説明は飛ばせる。／必要なページまで、消さなくていい。
// 話す流れが頁を飛び越える。引くと飛ばした頁も束に残っている。残す頁を手前へ起こす。
// =====================================================================
export function cut9(t: number): StageSpec {
  const xs = [-360, 0, 360];
  const hop = prog(t, 68.4, 69.8);
  const back = ease.inOut(prog(t, 70.1, 70.9));
  const rise = ease.inOut(prog(t, 72.2, 73.6));
  const arcPts: [number, number][] = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    arcPts.push([lerp(-420, 420, u), -60 + Math.sin(u * Math.PI) * 160]);
  }
  const hx = lerp(-420, 420, ease.inOut(hop));
  const hy = -60 + Math.sin(ease.inOut(hop) * Math.PI) * 160;
  const cam = add(camBase(t, 91, 14), merge(whipIn(t, 67, -800, -7), {
    x: seg(t, [[67, -300], [68.4, -300], [69.8, 300], [70.1, 300]], ease.inOut) * (1 - back) + rise * 0,
    y: seg(t, [[67, -10], [68.4, -10], [69.1, 20], [69.8, -10]], ease.inOut) * (1 - back) + back * -150 + rise * -40,
    roll: seg(t, [[67, -3], [68.4, -2], [69.1, 6], [69.8, -3], [70.9, 1], [72.2, -1], [73.6, 2], [74, 0]]),
    zoom: seg(t, [[67, 1.3], [68.4, 1.3], [69.1, 1.02], [69.8, 1.3], [70.1, 1.3], [70.9, 1.0], [72.2, 1.02], [73.6, 1.5], [74, 2.4]], ease.inOut),
  }));
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 92),
    world: (
      <>
        <Grid t={t} />
        {xs.map((x, i) => {
          const mid = i === 1;
          return (
            <Doc
              key={i}
              x={x + (mid ? 0 : (i - 1) * 260 * rise)}
              y={-200 + (mid ? lerp(0, -40, rise) : 0)}
              z={mid ? lerp(0, 380, rise) : lerp(0, -300, rise)}
              rx={mid ? lerp(0, -12, rise) : 0}
              rz={2 * wobble(t, 93 + i, 3)}
              w={240}
              h={310}
              lines={4}
              mark={mid ? ease.out(prog(t, 70.6, 71.1)) : 0}
              s={pop(t, 67.2 + i * 0.12) * (mid ? 1 + 0.06 * pulse(t, 70.9, 4) : 1)}
              opacity={mid ? 1 : 1 - 0.6 * rise}
              order={mid ? 32 : 26}
            />
          );
        })}
        {/* 話す流れ（口頭）が中央の頁を飛び越える */}
        <Poly pts={arcPts} k={ease.inOut(hop)} w={8} color={C.teal} order={36} head={hop >= 1 ? 26 : 0} opacity={1 - rise} />
        {hop > 0 && hop < 1 && <RRect w={34} h={34} r={17} x={hx} y={hy} color={C.teal} order={37} />}
        <Txt text="話すときは飛ばせる" size={36} weight={800} color={C.teal} y={50} opacity={clamp((t - 69.0) * 3) * (1 - rise)} order={40} />
        <Txt text="説明を飛ばす ＝ ページを消す？" size={40} weight={800} color={C.purple} y={-430} opacity={clamp((t - 67.6) * 3) * (1 - clamp((t - 70.1) * 3))} order={40} />
        <Txt text="必要なページは残る" size={44} weight={800} color={C.ink} y={-430} s={pop(t, 70.9)} opacity={1 - rise} order={40} />
        {ripple(t, 70.9, 0.7, 0, -200, 60, 340, C.yellowDeep)}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['知っている相手なら、', '説明は飛ばせる。'], 84, TX, TOP, 67.35, 70.6, {inStyle: 'rise', outStyle: 'sink', seed: 901, emph: hl([1, 3, 7, 1.15, C.teal]), extra: drift(28, 0, 67.35)})} />
        <KLine {...L(['必要なページまで、', '消さなくていい。'], 92, TX, TOP, 70.5, 73.7, {inStyle: 'slam', outStyle: 'fly', seed: 902, extra: (c) => ({x: 40 * smooth(prog(c.t, 71, 73.6)), y: c.li === 1 ? 6 * Math.sin(c.t * 3) : 0})})} />
      </>
    ),
  };
}

