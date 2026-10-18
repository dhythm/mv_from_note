// カット 5–7・10–12（代表区間）の画面と、全カット共通の動きの道具。
// カット 1–15 の画面。各カットは時刻 t（秒・全編の時刻）から「カメラ・HUD・世界・画面固定の要素」を返す純関数。
// 文言・素材の区間・動きの狙いは ../plan.html のカット表に対応する。カット16（ロゴ）は Main.tsx。
import React from 'react';
import {C, beatEnv, clamp, damped, ease, hash, lerp, prog, pulse, seg, smooth, wobble} from './lib/anim';
import {Grid} from './components/backdrop';
import {G, KLine, KLineProps, RRect, Ring, Seg, Txt} from './components/prims';
import {Cam, StageSpec} from './components/stage';
import {Arrow, Bubble, Doc, Duo, Person, Room, Spark, Tag, clipFrame, clipGeom, pop} from './parts';

export const TX = -820; // 左の文の左端（画面の外周 5% より内側）
export const TOP = 400; // 上の文の上端

// ---- 共通の部品・動き ----
type LP = Omit<KLineProps, 'lines' | 'size' | 'x' | 'y' | 't0' | 't1'>;
export const L = (lines: string[], size: number, x: number, y: number, t0: number, t1: number, o: LP = {}): KLineProps => ({lines, size, x, y, t0, t1, color: C.ink, align: 'left', ...o});
type Span = [number, number, number, number, string]; // 行, 開始, 終了(含まない), 倍率, 色
export const hl = (...spans: Span[]) => (li: number, ci: number) => {
  for (const [l, a, b, s, c] of spans) if (li === l && ci >= a && ci < b) return {scale: s, color: c};
  return null;
};
// 読む間の移動（文全体が流れる・弧を描く）
export const drift = (vx: number, vy: number, t0: number, rot = 0) => (c: {t: number}) => {
  const u = Math.max(0, c.t - t0);
  return {x: vx * u, y: vy * u, rz: rot * u};
};
// HUD（主張の文字の層）の連続した運動。拍で少し跳ねる
export function hudMove(t: number, seed: number, ax = 30, ay = 18, ar = 1.6) {
  return {
    x: ax * wobble(t, seed, 5.2),
    y: ay * wobble(t, seed + 1, 4.4),
    roll: ar * wobble(t, seed + 2, 6.1),
    s: 1 + 0.016 * beatEnv(t, 7) + 0.018 * wobble(t, seed + 3, 7),
  };
}
export const camBase = (t: number, seed: number, amp = 16): Cam => ({x: amp * wobble(t, seed, 4.6), y: amp * 0.7 * wobble(t, seed + 1, 5.3), roll: 1.3 * wobble(t, seed + 2, 5.8), zoom: 1 + 0.014 * beatEnv(t, 7)});
export const add = (a: Cam, b: Partial<Cam>): Cam => ({x: a.x + (b.x ?? 0), y: a.y + (b.y ?? 0), roll: a.roll + (b.roll ?? 0), zoom: a.zoom * (b.zoom ?? 1)});
// カットの境目の振り（勢いを次のカットへ渡す）
export function whipIn(t: number, t0: number, dx = -900, roll = -8, d = 0.5): Partial<Cam> {
  const k = 1 - ease.outQuint(prog(t, t0, t0 + d));
  return {x: dx * k, roll: roll * k, zoom: 1 + 0.18 * k};
}
export function whipOut(t: number, t1: number, dx = 900, roll = 8, d = 0.42): Partial<Cam> {
  const k = ease.in(prog(t, t1 - d, t1));
  return {x: dx * k, roll: roll * k, zoom: 1 + 0.16 * k};
}
export const merge = (...ps: Partial<Cam>[]): Partial<Cam> => ps.reduce<Partial<Cam>>((a, b) => ({x: (a.x ?? 0) + (b.x ?? 0), y: (a.y ?? 0) + (b.y ?? 0), roll: (a.roll ?? 0) + (b.roll ?? 0), zoom: (a.zoom ?? 1) * (b.zoom ?? 1)}), {});
// 拡がる輪
export function ripple(t: number, at: number, life: number, x: number, y: number, r0: number, grow: number, color: string, order = 48, width = 5) {
  const age = t - at;
  if (age < 0 || age > life) return null;
  const k = age / life;
  return <Ring key={`rp${at.toFixed(2)}`} x={x} y={y} r={r0 + grow * ease.out(k)} width={width * (1 - 0.6 * k)} color={color} opacity={0.85 * (1 - k)} order={order} />;
}
// 速度線（画面固定。振りの間だけ出す）
export function streaks(t: number, a: number, b: number, dir = 1, color: string = C.line) {
  const k = prog(t, a, b);
  if (k <= 0 || k >= 1) return null;
  const env = Math.sin(k * Math.PI);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < 14; i++) {
    const y = (hash(i * 3.7 + a) - 0.5) * 1000;
    const len = 300 + 600 * hash(i * 5.1 + a);
    const x = dir * (lerp(-1400, 1400, (k * 1.6 + hash(i * 1.3)) % 1));
    out.push(<RRect key={i} w={len} h={4 + 6 * hash(i * 9.1)} r={2} x={x} y={y} color={color} opacity={0.75 * env} order={75} />);
  }
  return <>{out}</>;
}


// =====================================================================
// CUT 5  30–38秒  資料は、その場で終わるとは限らない。／担当者から、その上司へ。
// 受け渡しの採用動画（32.0 秒から 1.5 倍速）。会議の場は後退し、読む場が手前へ。
// =====================================================================
const C5 = {staffX: -250, feetY: -360, h: 430};
export function cut5(t: number): StageSpec {
  const g = clipGeom(C5.staffX, C5.feetY, C5.h);
  const paperX = g.bossX;
  const paperY = C5.feetY + C5.h * 0.6;
  const toPaper = ease.in(prog(t, 37.35, 38.0));
  const cam = add(camBase(t, 51, 16), merge(whipIn(t, 30, -700, -7), {
    x: seg(t, [[30, -470], [31.9, -170], [32.4, -40], [36.5, 20], [37.35, 30]], ease.inOut) * (1 - toPaper) + paperX * toPaper,
    y: seg(t, [[30, 0], [32, -30], [37.35, -20]]) * (1 - toPaper) + paperY * toPaper,
    roll: seg(t, [[30, -5], [31.9, 3], [32.4, -2.5], [35, 2], [37.35, -1], [38, 4]]),
    zoom: seg(t, [[30, 1.12], [31.9, 1.0], [32.05, 1.12], [32.6, 0.98], [35.4, 0.9], [37.35, 1.0], [38, 3.4]], (k) => (t > 37.3 ? ease.in(k) : ease.inOut(k))),
  }));
  // 会議の場から歩いて出る（静止姿勢＝受け渡しの姿勢。足取りの上下）
  const walk = prog(t, 30.2, 32.0);
  const sx = lerp(-640, C5.staffX, ease.inOut(walk));
  const bob = walk > 0 && walk < 1 ? 10 * Math.abs(Math.sin(walk * Math.PI * 5)) : 0;
  const swap = prog(t, 31.95, 32.08); // 静止姿勢→動画
  const recede = ease.inOut(prog(t, 30.9, 33.2));
  const readArea = ease.outBack(prog(t, 30.9, 32.0), 1.3);
  const f = clipFrame(t, 32.0);
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 52),
    world: (
      <>
        <Grid t={t} />
        {/* 会議の場（口頭の補足はここに残る） */}
        <G x={lerp(-560, -980, recede)} y={lerp(-120, 0, recede)} z={lerp(0, -1700, recede)} ry={lerp(0, 28, recede)}>
          <Room w={760} h={520} opacity={1 - 0.35 * recede} />
          <Bubble text="口頭の補足" x={-90} y={150} size={40} s={1 + 0.06 * beatEnv(t, 6)} rz={3 * wobble(t, 53, 3)} />
          {Array.from({length: 3}, (_, i) => (
            <Person key={i} id="staff-neutral" x={-250 + i * 120} y={-250} h={150} opacity={0.18} order={20} />
          ))}
        </G>
        {/* 読む場（上司の側）が手前へ展開 */}
        <G x={g.bossX + 20} y={C5.feetY + 170} z={lerp(-900, 0, readArea)} s={clamp(readArea, 0, 1.2)}>
          <RRect w={760} h={600} r={30} color={C.pale} opacity={0.55} order={8} />
        </G>
        {swap < 1 && <Person id="staff-give" x={sx} y={C5.feetY + bob} h={C5.h} rz={walk < 1 ? 2.5 * Math.sin(walk * Math.PI * 5) : 0} opacity={1 - swap} order={31} />}
        {swap < 1 && <Person id="boss-neutral" x={g.bossX} y={C5.feetY} h={C5.h} opacity={(1 - swap) * clamp(readArea)} order={31} />}
        {swap > 0 && <Duo id="handoff" f={f} staffX={C5.staffX} feetY={C5.feetY} h={C5.h} opacity={swap} />}
        <Arrow x1={C5.staffX + 40} y1={C5.feetY - 50} x2={g.bossX - 40} y2={C5.feetY - 50} k={ease.out(prog(t, 32.3, 33.6))} color={C.ink} w={6} head={26} />
        <Txt text="担当者" size={34} weight={700} color={C.sub} x={C5.staffX} y={C5.feetY - 100} opacity={clamp((t - 32.2) * 4)} order={40} />
        <Txt text="上司" size={34} weight={700} color={C.sub} x={g.bossX} y={C5.feetY - 100} opacity={clamp((t - 32.4) * 4)} order={40} />
        {ripple(t, 32.0, 0.6, C5.staffX + 180, C5.feetY + C5.h * 0.62, 30, 160, C.ink)}
        {ripple(t, 34.4, 0.7, g.bossX - 60, paperY, 30, 200, C.yellowDeep)}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['資料は、', 'その場で終わるとは限らない。'], 84, TX, TOP, 30.3, 34.7, {inStyle: 'flip', outStyle: 'sink', seed: 501, extra: drift(22, 0, 30.3), emph: hl([1, 8, 13, 1.12, C.ink])})} />
        <KLine {...L(['担当者から、', 'その上司へ。'], 104, TX, TOP, 34.6, 37.6, {inStyle: 'slam', outStyle: 'fly', seed: 502, extra: (c) => ({x: 60 * smooth(prog(c.t, 34.8, 37.4)) * (c.li === 1 ? 1.5 : 1)})})} />
      </>
    ),
    screen: streaks(t, 31.8, 32.25, 1),
  };
}

// =====================================================================
// CUT 6  38–47秒  「なぜ、このやり方？」／その理由、資料にありますか？
// 問い返しの採用動画（原本 0–2.5 秒を 1.5 倍速）。紙面の理由欄の空白へ寄る。
// =====================================================================
const C6 = {staffX: -560, feetY: -380, h: 430};
const DOC6 = {x: 480, y: -150};
export function cut6(t: number): StageSpec {
  const g = clipGeom(C6.staffX, C6.feetY, C6.h);
  const paperX = g.bossX;
  const paperY = C6.feetY + C6.h * 0.6;
  const pull = ease.outQuint(prog(t, 38.0, 39.1));
  const toDoc = ease.inOut(prog(t, 42.3, 43.4));
  const back = ease.in(prog(t, 46.35, 47.0));
  const cam = add(camBase(t, 61, 14), {
    x: lerp(paperX, -180, pull) * (1 - toDoc) + lerp(-180, 300, toDoc) + 0 * back + seg(t, [[43.4, 0], [46.3, 40], [47, -760]], (k) => (t > 46.3 ? ease.in(k) : k)),
    y: lerp(paperY, 20, pull) * (1 - toDoc) + toDoc * -20 + back * -60,
    roll: seg(t, [[38, 9], [39.1, -4], [40.0, 3.5], [40.6, 2.5], [42.3, -1], [43.4, -4], [45, 2], [46.35, 0], [47, -8]]),
    zoom: lerp(3.4, 1.0, pull) * seg(t, [[39.1, 1], [40.2, 1.14], [41.2, 1.06], [42.3, 1.1]]) * lerp(1, 1.12, toDoc) * (1 + 0.05 * Math.sin((t - 43.4) * 1.7) * clamp(t - 43.4)) * (1 + 0.25 * back),
  });
  const f = clipFrame(t, 38.7, 1.5, 0, 2.5);
  const docIn = ease.outBack(prog(t, 42.3, 43.2), 1.4);
  // 問いが空白の周りを回り込む
  const orbit = prog(t, 43.5, 46.4);
  const ang = -Math.PI / 2 + orbit * Math.PI * 2.1;
  const askOnDoc = t >= 43.2;
  const ask0 = {x: g.bossX + 60, y: C6.feetY + C6.h + 90};
  const slotX = DOC6.x;
  const slotY = DOC6.y - 520 * 0.5 + 520 * 0.17;
  const ax = askOnDoc ? slotX + Math.cos(ang) * 330 : ask0.x;
  const ay = askOnDoc ? slotY + 40 + Math.sin(ang) * 150 : ask0.y;
  const travel = ease.inOut(prog(t, 42.6, 43.5));
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 62),
    world: (
      <>
        <Grid t={t} />
        <Duo id="question" f={f} staffX={C6.staffX} feetY={C6.feetY} h={C6.h} />
        <Txt text="担当者" size={34} weight={700} color={C.sub} x={C6.staffX} y={C6.feetY - 50} order={40} />
        <Txt text="上司" size={34} weight={700} color={C.sub} x={g.bossX} y={C6.feetY - 50} order={40} />
        {/* 紙面（理由の欄が空白） */}
        <Doc x={lerp(1500, DOC6.x, docIn) + 10 * wobble(t, 63, 3)} y={DOC6.y} z={lerp(400, 0, clamp(docIn))} w={420} h={520} ry={lerp(50, -6, clamp(docIn)) + 4 * Math.sin(t * 1.3)} rz={lerp(14, -2, clamp(docIn))} s={1 + 0.03 * beatEnv(t, 6)} reason="missing" reasonLabel="理由は？" march={t * 40} opacity={clamp(docIn * 3)} />
        {t > 40.2 && (
          <Bubble text="なぜ、このやり方？" kind="ask" tail={-1} x={lerp(ask0.x, ax, askOnDoc ? 1 : travel)} y={lerp(ask0.y, ay, askOnDoc ? 1 : travel)} z={askOnDoc ? 120 * Math.sin(ang) : 0} size={40} s={pop(t, 40.2, 0.35, 2) * (1 + 0.08 * pulse(t, 43.5, 4))} rz={askOnDoc ? 6 * Math.cos(ang) : 4 * wobble(t, 64, 2)} order={52} />
        )}
        {ripple(t, 40.25, 0.6, ask0.x, ask0.y, 40, 220, C.purple)}
        {ripple(t, 44.0, 0.8, slotX, slotY, 60, 360, C.purple)}
        {ripple(t, 45.5, 0.8, slotX, slotY, 60, 360, C.purple)}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['「なぜ、このやり方？」'], 104, TX, TOP, 40.2, 43.5, {inStyle: 'drop', outStyle: 'fly', seed: 601, color: C.purple, extra: drift(30, 0, 40.2, 0.6)})} />
        <KLine {...L(['その理由、', '資料にありますか？'], 92, TX, TOP, 43.45, 46.9, {inStyle: 'rise', outStyle: 'sink', seed: 602, emph: hl([0, 2, 4, 1.15, C.purple]), extra: (c) => ({x: 14 * Math.sin(c.t * 2.2 + c.li), y: c.li === 1 ? -10 * Math.sin(c.t * 1.8) : 0})})} />
      </>
    ),
    screen: streaks(t, 46.55, 47.0, -1),
  };
}

// =====================================================================
// CUT 7  47–57秒  資料に欠けがあると、／担当者も説明できない。／そこで、話が止まる。
// 問い返しの採用動画（原本 2.5–6 秒を 1.5 倍速）。説明の線が空白でつまずき、欠けが前面へ。
// =====================================================================
const C7 = {staffX: -250, feetY: -500, h: 340};
const ROW7 = {y: -20, a: -560, b: 0, c: 560};
export function cut7(t: number): StageSpec {
  const g = clipGeom(C7.staffX, C7.feetY, C7.h);
  const stopAt = 52.6;
  const frozen = t >= stopAt && t < stopAt + 0.42;
  const tc = frozen ? stopAt : t; // 止まる拍: 画面全体が一瞬止まる
  const grow = ease.inOut(prog(t, 53.1, 54.6));
  const dive = ease.in(prog(t, 56.35, 57.0));
  const cam = add(frozen ? {x: 0, y: 0, roll: 0, zoom: 1} : camBase(tc, 71, 18), merge(whipIn(t, 47, 760, 8), {
    x: seg(tc, [[47, -260], [49, -60], [52.6, 40], [54.6, 0], [56.35, 10]]) * (1 - dive),
    y: seg(tc, [[47, -60], [52.6, -20], [54.6, 40]]) * (1 - dive) + dive * ROW7.y,
    roll: frozen ? 0 : seg(tc, [[47, -4], [49.5, 3], [52.6, -2], [53.4, 3], [55, -2], [57, 0]]),
    zoom: seg(tc, [[47, 1.15], [48.2, 1.0], [52.6, 1.06], [53.0, 1.0], [54.6, 0.96], [56.35, 1.0], [57, 3.0]], (k) => (tc > 56.3 ? ease.in(k) : ease.inOut(k))),
  }));
  const f = clipFrame(t, 47.0, 1.5, 2.5, 6);
  // 説明の線: 担当者の手元から目的へ、空白でつまずいて途切れる
  const lineA = ease.out(prog(tc, 47.4, 48.3));
  const lineB = ease.out(prog(tc, 48.3, 48.9));
  const stumble = prog(tc, 48.9, 49.6);
  const fall = ease.in(prog(tc, 50.4, 51.6));
  const sh = frozen ? 0 : damped(tc, 48.9, 22, 9, 6) + damped(tc, stopAt + 0.42, 26, 7, 5);
  const blankS = 1 + 1.25 * grow;
  const repos = ease.inOut(prog(t, 53.1, 54.4));
  const duoX = lerp(C7.staffX, -600, repos);
  const duoH = lerp(C7.h, 300, repos);
  return {
    bg: C.bg,
    cam,
    hud: frozen ? {x: 0, y: 0, roll: 0, s: 1} : hudMove(tc, 72),
    world: (
      <>
        <Grid t={tc} />
        <Duo id="question" f={f} staffX={duoX} feetY={C7.feetY} h={duoH} />
        {/* 目的 → 理由は？ → 結論 */}
        <Tag text="目的" x={ROW7.a - 20 * repos} y={ROW7.y + 6 * Math.sin(tc * 2)} w={260} size={44} s={pop(t, 47.2) * (1 - 0.2 * repos)} order={40} />
        <Tag text="結論" x={ROW7.c + 260 * repos} y={ROW7.y + 6 * Math.sin(tc * 2 + 1) - 300 * fall * 0} w={260} size={44} s={pop(t, 47.45) * (1 - 0.2 * repos)} rz={-4 * fall} order={40} />
        <G x={ROW7.b + sh} y={ROW7.y + lerp(0, 60, grow)} z={lerp(0, 200, grow)} s={blankS * pop(t, 47.3)} rz={(frozen ? 0 : 2 * wobble(tc, 73, 2)) + 3 * repos}>
          <Tag text="理由は？" kind="missing" w={300} size={44} march={tc * 50} order={42} />
        </G>
        <Arrow x1={ROW7.a + 140} y1={ROW7.y} x2={ROW7.b - 160} y2={ROW7.y} k={ease.out(prog(tc, 47.6, 48.0))} color={C.ink} w={5} head={22} opacity={1 - repos} />
        {/* 説明の線（青緑=口頭）。空白の手前でつまずく */}
        <Seg x1={C7.staffX + 120} y1={C7.feetY + C7.h * 0.6} x2={ROW7.a} y2={ROW7.y - 50} k={lineA} w={7} color={C.teal} opacity={1 - repos} order={30} />
        <Seg x1={ROW7.a + 140} y1={ROW7.y - 60} x2={ROW7.b - 150 + 30 * Math.sin(stumble * 30) * (1 - stumble)} y2={ROW7.y - 60 + 40 * Math.sin(stumble * 22) * (1 - stumble)} k={lineB} w={7} color={C.teal} opacity={1 - repos} order={30} />
        {/* 途切れた続き（結論へ届かない線の断片が落ちる） */}
        <G y={-420 * fall} rz={-30 * fall} x={60 * fall}>
          <Seg x1={ROW7.b + 160} y1={ROW7.y - 60} x2={ROW7.c - 140} y2={ROW7.y - 60} k={ease.out(prog(tc, 49.0, 49.4))} w={7} color={C.teal} opacity={0.55 * (1 - fall)} order={30} />
        </G>
        <Txt text="説明の線が、つながらない" size={34} weight={700} color={C.sub} y={ROW7.y - 140} opacity={clamp((tc - 49.2) * 3) * (1 - repos)} order={40} />
        {ripple(tc, 48.95, 0.6, ROW7.b - 150, ROW7.y - 60, 20, 140, C.purple)}
        {ripple(t, stopAt + 0.42, 0.9, ROW7.b, ROW7.y, 80, 520, C.purple, 48, 7)}
        <Spark t={tc} at={48.9} x={ROW7.b - 160} y={ROW7.y - 60} color={C.purple} />
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['資料に欠けがあると、'], 92, TX, TOP, 47.35, 50.3, {inStyle: 'flip', outStyle: 'sink', seed: 701, emph: hl([0, 3, 5, 1.15, C.purple]), extra: drift(26, 0, 47.35)})} />
        <KLine {...L(['担当者も説明できない。'], 92, TX, TOP, 50.15, 56.6, {inStyle: 'drop', outStyle: 'fly', seed: 702, wave: frozen ? 0 : 1, extra: (c) => (frozen ? {} : {x: 30 * smooth(prog(c.t, 53.0, 56.4)), y: 0})})} />
        <KLine {...L(['そこで、話が止まる。'], 92, TX, TOP - 120, stopAt - 0.02, 56.6, {inStyle: 'slam', inDur: 0.18, stagger: 0.012, outStyle: 'burst', seed: 703, color: C.purple, wave: frozen ? 0 : 1, extra: (c) => (frozen ? {} : {y: -8 * Math.sin((c.t - 53) * 2 + c.i * 0.3)})})} />
      </>
    ),
  };
}

// =====================================================================
// CUT 10  74–86秒  話す内容は、その場に合わせて削る。／資料には、その先の読み手に必要な情報を残す。
// 口頭の場と持ち帰って読む場を、奥行きのある二つの空間として開く。
// =====================================================================
export function cut10(t: number): StageSpec {
  const toRight = ease.inOut(prog(t, 79.0, 79.9));
  const both = ease.inOut(prog(t, 83.0, 84.0));
  const dive = ease.in(prog(t, 85.35, 86.0));
  const slot = {x: 520, y: -150};
  const cam = add(camBase(t, 101, 16), merge(whipIn(t, 74, 800, 7), {
    x: lerp(lerp(-470, 470, toRight), 0, both) * (1 - dive) + dive * slot.x,
    y: lerp(-110, -40, both) * (1 - dive) + dive * slot.y,
    roll: seg(t, [[74, -4], [77.5, 2], [79.0, -1], [79.9, 3], [82, -2], [83, 0], [84, 2], [86, 0]]),
    zoom: lerp(1.22, 0.9, both) * (1 + 2.2 * dive) * (1 + 0.05 * Math.sin((t - 79.9) * 1.5) * clamp(t - 79.9) * (1 - both)),
  }));
  const open = ease.outBack(prog(t, 74.0, 74.8), 1.3);
  const squeeze = ease.inOut(prog(t, 77.0, 77.8)); // 口頭の言葉の塊が圧縮される
  const expand = ease.outBack(prog(t, 80.2, 81.2), 1.6); // 紙面が手前へ展開
  const fill1 = ease.out(prog(t, 80.8, 81.4));
  const fill2 = ease.out(prog(t, 81.3, 81.9));
  const bubbleW = lerp(560, 200, squeeze);
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 102),
    world: (
      <>
        <Grid t={t} />
        {/* 左: その場の相手へ（口頭） */}
        <G x={-470} y={-200} ry={lerp(60, 14, clamp(open)) + 4 * wobble(t, 103, 5)} s={clamp(open, 0, 1.2)} z={lerp(0, -80, both)}>
          <RRect w={860} h={560} r={30} color={C.pale} order={10} />
          <RRect w={860} h={560} r={30} border={5} color={C.teal} order={11} />
          <Txt text="その場の相手へ" size={40} weight={800} color={C.teal} y={230} order={12} />
          <Person id="staff-give" x={-250} y={-200} h={360} />
          <G x={110} y={60}>
            <RRect w={bubbleW} h={lerp(170, 90, squeeze)} r={40} color={C.card} order={40} sx={1 + 0.08 * pulse(t, 77.8, 6)} />
            <RRect w={bubbleW} h={lerp(170, 90, squeeze)} r={40} border={4} color={C.teal} order={41} />
            <Txt text="口頭で話す情報" size={42} weight={800} color={C.teal} opacity={1 - clamp((t - 77.3) * 4)} y={22} sx={lerp(1, 0.4, squeeze)} order={42} />
            <Txt text="経緯・前提・細かな手順" size={30} weight={700} color={C.sub} opacity={1 - clamp((t - 77.1) * 4)} y={-30} sx={lerp(1, 0.4, squeeze)} order={42} />
            <Txt text="要点" size={52} weight={900} color={C.teal} s={pop(t, 77.6, 0.3, 2.2)} order={43} />
          </G>
          <Txt text="話す内容を削る" size={44} weight={800} color={C.teal} y={-225} x={150} s={pop(t, 78.0)} order={44} />
        </G>
        {/* 右: その先の読み手へ（資料） */}
        <G x={470} y={-200} ry={lerp(-60, -14, clamp(open)) + 4 * wobble(t, 104, 5)} s={clamp(open, 0, 1.2)} z={lerp(0, 60, both)}>
          <RRect w={860} h={560} r={30} color={C.card} order={10} />
          <RRect w={860} h={560} r={30} border={5} color={C.line} order={11} />
          <Txt text="その先の読み手へ" size={40} weight={800} color={C.ink} y={230} order={12} />
          <Person id="boss-read" x={260} y={-200} h={360} />
          <Doc x={-110} y={25} z={lerp(0, 240, clamp(expand))} s={lerp(0.7, 0.88, clamp(expand))} w={330} h={400} rz={lerp(-4, 2, clamp(expand))} ry={8 * Math.sin(t * 1.1)} reason="missing" reasonLabel={fill2 > 0.5 ? '理由' : ''} fill={fill2} mark={fill1} order={30} />
          <Txt text="必要な情報を残す" size={44} weight={800} color={C.ink} y={-225} x={-40} s={pop(t, 81.6)} order={44} />
          <RRect w={360} h={20} r={4} y={-247} x={-40} color={C.yellow} sx={ease.out(prog(t, 81.8, 82.3))} order={43} />
        </G>
        {ripple(t, 77.8, 0.6, -470 + 110, -30, 40, 260, C.teal)}
        {ripple(t, 81.35, 0.7, 360, -150, 40, 300, C.yellowDeep)}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['話す内容は、', 'その場に合わせて削る。'], 82, TX, TOP, 74.35, 79.3, {inStyle: 'flip', outStyle: 'fly', seed: 1001, emph: hl([1, 8, 10, 1.2, C.teal]), extra: drift(20, 0, 74.35)})} />
        <KLine {...L(['資料には、', 'その先の読み手に必要な情報を残す。'], 76, TX, TOP, 79.4, 85.6, {inStyle: 'rise', outStyle: 'sink', seed: 1002, emph: hl([1, 14, 16, 1.2, C.ink]), extra: drift(-12, 0, 79.4, 0)})} />
      </>
    ),
    screen: streaks(t, 79.05, 79.7, 1),
  };
}

// =====================================================================
// CUT 11  86–97秒  選んだものは、書いてある。／でも、選んだ理由がない。／「他のやり方は？」が残る。
// 候補の面が二人の周りを巡り、B が紙へ。残った問いが流れる頁の前へ回り込む。
// =====================================================================
export function cut11(t: number): StageSpec {
  const DOC = {x: -120, y: -60};
  const pull = ease.outQuint(prog(t, 86.0, 86.9));
  const dive = ease.in(prog(t, 96.4, 97.0));
  const q = {x: 280, y: 190};
  const cam = add(camBase(t, 111, 16), {
    x: seg(t, [[86, 520], [86.9, 0], [89.5, -60], [92, 80], [94, 120], [96.4, 160]]) * (1 - dive) + dive * q.x,
    y: seg(t, [[86, -150], [86.9, 0], [92, 0], [96.4, 60]]) * (1 - dive) + dive * q.y,
    roll: seg(t, [[86, 4], [87.5, -3], [89.5, 3], [92, -2], [94, 3], [96.4, 0], [97, -6]]),
    zoom: lerp(3.2, 1.0, pull) * seg(t, [[86.9, 1.12], [89.4, 1.04], [90.2, 1.2], [93.6, 1.1], [96.4, 1.16]]) * (1 + 2.4 * dive),
  });
  const cands = [
    {k: 'A', i: 0},
    {k: 'B', i: 1},
    {k: 'C', i: 2},
  ];
  const settle = ease.inOut(prog(t, 89.3, 90.2));
  const flow = Math.max(0, t - 92.6);
  const pages: React.ReactNode[] = [];
  for (let i = 0; i < 9; i++) {
    const x = 1300 - ((flow * 360 + i * 300) % 2700);
    pages.push(<Doc key={i} x={x} y={120} z={-520} w={170} h={220} lines={3} opacity={clamp((t - 92.6) * 2) * 0.8} order={14} />);
  }
  const qFront = ease.inOut(prog(t, 94.0, 95.0));
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 112),
    world: (
      <>
        <Grid t={t} />
        {pages}
        <Person id="staff-neutral" x={-560} y={-470} h={340} />
        <Person id={t < 91.8 ? 'boss-read' : 'boss-ask'} x={520} y={-470} h={340} />
        {cands.map(({k, i}) => {
          const ph = (t - 86.0) * 1.9 + (i * Math.PI * 2) / 3;
          const ox = Math.cos(ph) * 720;
          const oz = Math.sin(ph) * 520;
          const oy = 40 + Math.sin(ph * 2) * 30;
          const isB = k === 'B';
          const tx = isB ? DOC.x : -560 + i * 300;
          const ty = isB ? DOC.y : 300;
          const tz = isB ? 60 : -900;
          const kk = settle;
          return (
            <Tag
              key={k}
              text={`候補 ${k}`}
              kind={isB ? 'yellow' : 'gray'}
              size={42}
              w={240}
              x={lerp(ox, tx, kk)}
              y={lerp(oy, ty, kk) + (isB ? 0 : 20 * Math.sin(t * 2 + i))}
              z={lerp(oz, tz, kk)}
              ry={lerp(-Math.cos(ph) * 40, 0, kk)}
              s={pop(t, 86.2 + i * 0.12) * (isB ? lerp(1, 0.55, ease.in(prog(t, 90.1, 90.5))) : 1)}
              opacity={isB ? 1 - clamp((t - 90.4) * 5) : 1 - 0.5 * kk}
              order={isB ? 52 : 36}
            />
          );
        })}
        {/* B だけが書かれた紙面。理由の欄はない */}
        <Doc x={DOC.x} y={DOC.y} w={300} h={380} s={pop(t, 89.6, 0.4) * (1 + 0.06 * pulse(t, 90.4, 5))} rz={-3 + 2 * wobble(t, 113, 3)} reason="missing" march={t * 40} order={26} />
        <Tag text="選んだ B" kind="yellow" size={34} x={DOC.x} y={DOC.y + 90} s={pop(t, 90.35, 0.3, 2)} order={40} />
        <Txt text="理由の欄がない" size={36} weight={800} color={C.purple} x={DOC.x} y={DOC.y - 250} opacity={clamp((t - 91.2) * 3)} order={40} />
        <Bubble text="他のやり方は？" kind="ask" tail={1} x={lerp(520 - 20, q.x, qFront)} y={lerp(-60 + 0, q.y, qFront)} z={lerp(0, 260, qFront)} size={lerp(40, 54, qFront)} s={pop(t, 92.0, 0.35, 2)} rz={4 * wobble(t, 114, 2) + lerp(0, -4, qFront)} order={56} />
        {ripple(t, 90.4, 0.6, DOC.x, DOC.y, 40, 260, C.yellowDeep)}
        {ripple(t, 92.0, 0.6, 500, -60, 40, 240, C.purple)}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['選んだものは、書いてある。'], 88, TX, TOP, 86.5, 90.3, {inStyle: 'flip', outStyle: 'sink', seed: 1101, extra: drift(22, 0, 86.5)})} />
        <KLine {...L(['でも、選んだ理由がない。'], 92, TX, TOP, 90.4, 93.9, {inStyle: 'drop', outStyle: 'fly', seed: 1102, emph: hl([0, 3, 9, 1.12, C.purple]), extra: drift(-18, 0, 90.4, -0.3)})} />
        <KLine {...L(['「他のやり方は？」', 'が残る。'], 92, TX, TOP, 93.8, 96.9, {inStyle: 'slam', outStyle: 'burst', seed: 1103, emph: hl([0, 0, 9, 1.0, C.purple]), extra: (c) => ({x: 40 * smooth(prog(c.t, 94, 96.8)), y: 0})})} />
      </>
    ),
  };
}

// =====================================================================
// CUT 12  97–109秒  目的 → 選んだ理由 → 進め方／他の候補も、一言。
// 離れた理由の札がカメラの近くを横断し、目的の隣へ。紙面全体を組み替える（後半の第一の見せ場）。
// =====================================================================
export function cut12(t: number): StageSpec {
  const land = 101.3;
  // 札の軌道（奥の右 → カメラの近く → 目的と進め方の間）
  const fly = prog(t, 99.3, land);
  const away = ease.inOut(prog(t, 97.2, 98.3));
  const far = {x: 640, y: -160, z: -700};
  const near = {x: 180, y: -80, z: 650};
  const dest = {x: 0, y: 60, z: 0};
  let rx: number;
  let ry: number;
  let rz: number;
  if (t < 99.3) {
    rx = lerp(0, far.x, away);
    ry = lerp(0, far.y, away);
    rz = lerp(0, far.z, away);
  } else {
    const u = fly;
    const a = ease.inOut(clamp(u / 0.55));
    const b = ease.outQuint(clamp((u - 0.55) / 0.45));
    if (u < 0.55) {
      rx = lerp(far.x, near.x, a);
      ry = lerp(far.y, near.y, a) + Math.sin(a * Math.PI) * 120;
      rz = lerp(far.z, near.z, a);
    } else {
      rx = lerp(near.x, dest.x, b);
      ry = lerp(near.y, dest.y, b);
      rz = lerp(near.z, dest.z, b);
    }
  }
  const row = ease.inOut(prog(t, 100.4, 101.5)); // 縦積み → 横一列
  const shake = damped(t, land, 26, 6, 5);
  const camFollow = ease.inOut(prog(t, 99.3, 100.4)) * (1 - ease.inOut(prog(t, 100.5, 101.6)));
  const cam = add(camBase(t, 121, 14), merge(whipIn(t, 97, 0, 6, 0.5), whipOut(t, 109, -900, -8), {
    x: seg(t, [[97, 0], [98.3, -260], [99.3, -60], [101.6, 0], [103.5, 120], [105.5, -100], [107.5, 80], [109, -40]]) + camFollow * 240 + shake,
    y: seg(t, [[97, 0], [99.3, 0], [101.6, -10], [109, 10]]) + shake * 0.4,
    roll: seg(t, [[97, -6], [98.3, 4], [99.3, -2], [100.2, 10], [101.3, -4], [102, 1.5], [103.5, -3], [105.5, 3], [107.5, -2.5], [109, 0]]),
    zoom: seg(t, [[97, 1.3], [98.3, 1.12], [99.3, 1.2], [100.3, 0.95], [101.3, 1.4], [101.8, 1.28], [103.5, 1.18], [105, 1.3], [107, 1.2], [109, 1.28]]),
  }));
  const stackA = {x: -440, y: 160};
  const stackB = {x: -440, y: 0};
  const rowA = {x: -520, y: 60};
  const rowB = {x: 520, y: 60};
  const tagS = 1 + 0.05 * pulse(t, land, 5);
  const arrow1 = ease.out(prog(t, 101.9, 102.4));
  const arrow2 = ease.out(prog(t, 102.4, 102.9));
  const morph = prog(t, 97.0, 97.4); // 前のカットの問いの塊が札へ
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 122),
    world: (
      <>
        <Grid t={t} />
        <Tag text="目的" w={280} size={50} x={lerp(stackA.x, rowA.x, row)} y={lerp(stackA.y, rowA.y, row)} rz={lerp(-2, 0, row)} s={pop(t, 97.4) * tagS} order={40} />
        <Tag text="進め方" w={280} size={50} x={lerp(stackB.x, rowB.x, row)} y={lerp(stackB.y, rowB.y, row)} rz={lerp(2, 0, row)} s={pop(t, 97.55) * tagS} order={40} />
        <Txt text="理由が、後ろに離れている" size={36} weight={800} color={C.purple} x={300} y={-330} opacity={clamp((t - 98.0) * 3) * (1 - clamp((t - 99.4) * 4))} order={44} />
        <Bubble text="他のやり方は？" kind="ask" size={54} x={rx} y={ry} z={rz} s={1 - morph} order={56} />
        <Tag text="選んだ理由" kind="yellow" w={360} size={52} x={rx} y={ry} z={rz} rz={t < land ? lerp(-18, 8, fly) : 0} ry={t < land ? Math.sin(fly * Math.PI) * -30 : 0} s={morph * tagS} order={58} />
        <Arrow x1={-360} y1={60} x2={-196} y2={60} k={arrow1} color={C.teal} w={9} head={30} />
        <Arrow x1={196} y1={60} x2={360} y2={60} k={arrow2} color={C.teal} w={9} head={30} />
        {/* 他の候補も一言 */}
        <Seg x1={0} y1={0} x2={0} y2={-110} k={ease.out(prog(t, 104.0, 104.3))} w={4} color={C.gray} order={30} />
        <Tag text="候補A" kind="gray" size={32} x={-150} y={-150} s={pop(t, 104.2)} order={40} />
        <Tag text="候補C" kind="gray" size={32} x={150} y={-150} s={pop(t, 104.35)} order={40} />
        <RRect w={110} h={8} r={4} x={-150} y={-208} color={C.line} sx={ease.out(prog(t, 104.5, 104.9))} order={40} />
        <RRect w={110} h={8} r={4} x={150} y={-208} color={C.line} sx={ease.out(prog(t, 104.6, 105.0))} order={40} />
        <Person id={t < 102.0 ? 'staff-neutral' : 'staff-read'} x={-420} y={-470} h={300} opacity={clamp((t - 101.4) * 3)} />
        <Person id={t < 102.2 ? 'boss-neutral' : 'boss-read'} x={420} y={-470} h={300} opacity={clamp((t - 101.5) * 3)} />
        <Spark t={t} at={land} x={0} y={60} color={C.yellowDeep} n={10} r={260} />
        {ripple(t, land, 0.8, 0, 60, 120, 700, C.yellowDeep, 48, 8)}
        {ripple(t, 102.4, 0.5, -196, 60, 20, 120, C.teal)}
        {ripple(t, 102.9, 0.5, 360, 60, 20, 120, C.teal)}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['他の候補も、一言。'], 88, TX, TOP, 104.6, 108.7, {inStyle: 'rise', outStyle: 'fly', seed: 1201, extra: drift(20, 0, 104.6)})} />
      </>
    ),
    screen: streaks(t, 99.6, 100.6, 1, C.line),
  };
}

