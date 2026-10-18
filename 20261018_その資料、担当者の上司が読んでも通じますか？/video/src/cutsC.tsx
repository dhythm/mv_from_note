// カット 13–15 の画面（時刻から決まる純関数）。文言と狙いは ../plan.html のカット表に対応する。
import React from 'react';
import {C, beatEnv, clamp, damped, ease, lerp, prog, seg, smooth, wobble} from './lib/anim';
import {Grid} from './components/backdrop';
import {G, KLine, RRect, Txt} from './components/prims';
import {ClipPlane, StageSpec} from './components/stage';
import {Bubble, Dashed, Doc, Person, Spark, Tag, clipFrame, pop} from './parts';
import {L, TOP, TX, add, camBase, drift, hl, hudMove, merge, ripple, streaks, whipIn, whipOut} from './cuts';

// =====================================================================
// CUT 13  109–122秒  自分が初めて聞くなら？／「なぜ、ここだけ違う？」「境目は？」／足す一行、備える答えが見える。
// 読み直しの採用動画（109.4 秒から 1.5 倍速）。人物の移動の向きに重心を運び、問いを二つの面へ振り分ける。
// =====================================================================
// 例外のある図（読み手が引っかかる箇所）
const Diagram: React.FC<{x: number; y: number; s?: number; rz?: number; t: number; hot?: number}> = ({x, y, s = 1, rz = 0, t, hot = 0}) => {
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 3; c++) {
      const odd = r === 1 && c === 1;
      cells.push(<RRect key={`${r}${c}`} w={120} h={70} r={10} x={-140 + c * 140} y={45 - r * 90} color={odd ? C.lilac : C.pale} order={22} s={odd ? 1 + 0.12 * hot * Math.abs(Math.sin(t * 6)) : 1} />);
      cells.push(<RRect key={`b${r}${c}`} w={120} h={70} r={10} x={-140 + c * 140} y={45 - r * 90} border={3} color={odd ? C.purple : C.teal} order={23} />);
    }
  return (
    <G x={x} y={y} s={s} rz={rz}>
      <RRect w={480} h={250} r={16} color={C.card} order={20} />
      <RRect w={480} h={250} r={16} border={3.5} color={C.ink} order={21} />
      {cells}
    </G>
  );
};
export function cut13(t: number): StageSpec {
  // 素材は 1280×720。人物の高さ 460px → 本編で 400px
  const k = 400 / 460;
  const clipW = 1280 * k;
  const clipX = -160;
  const clipY = -520 + (623 - 360) * k;
  const f = clipFrame(t, 109.4);
  const sort = ease.inOut(prog(t, 117.4, 118.6));
  const q1 = pop(t, 113.3, 0.35, 2.2);
  const q2 = pop(t, 114.1, 0.35, 2.2);
  const shrink = ease.inOut(prog(t, 116.8, 117.8));
  const cam = add(camBase(t, 131, 16), merge(whipIn(t, 109, 0, 9, 0.5), whipOut(t, 122, 900, 8), {
    x: seg(t, [[109, -260], [113.4, 160], [115.5, 260], [117.4, 200], [118.6, 0], [122, 60]], ease.inOut),
    y: seg(t, [[109, -60], [113.4, -40], [115.5, 40], [118.6, 0]]),
    roll: seg(t, [[109, -6], [111, 2], [113.3, -1], [114.1, 4], [115.5, -3], [117.4, 2], [118.6, -1], [120.5, 1.5], [122, 0]]),
    zoom: seg(t, [[109, 1.2], [111, 1.1], [113.3, 1.22], [114.1, 1.3], [115.5, 1.24], [117.4, 1.1], [118.6, 1.0], [122, 1.06]], ease.inOut),
  }));
  // 問いは斜めに連鎖し、二つの面へ振り分けられる
  const A = {x: 360, y: 260};
  const B = {x: 620, y: 110};
  const tagA = {x: 140, y: 120};
  const tagB = {x: 140, y: -60};
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 132),
    world: (
      <>
        <Grid t={t} />
        <G x={lerp(clipX, -560, shrink)} y={lerp(clipY, clipY - 30, shrink)} s={lerp(1, 0.78, shrink)}>
          <ClipPlane id="reader" f={f} w={clipW} order={30} />
        </G>
        {/* 例外のある図（担当者が読み直す資料の中身） */}
        <Diagram t={t} x={lerp(560, 760, sort)} y={lerp(-120, -330, sort)} s={pop(t, 112.6, 0.4) * lerp(1, 0.6, sort)} rz={-3 + 2 * wobble(t, 133, 3)} hot={clamp((t - 113.2) * 2) * (1 - sort)} />
        <Bubble text="なぜ、ここだけ違う？" kind="ask" size={46} x={lerp(A.x, tagA.x + 40, sort)} y={lerp(A.y, tagA.y, sort)} z={lerp(200, 0, sort)} s={q1 * lerp(1, 0.0, ease.in(prog(t, 118.3, 118.7)))} rz={lerp(-6, 0, sort) + 3 * wobble(t, 134, 2)} order={56} />
        <Bubble text="境目は？" kind="ask" size={46} x={lerp(B.x, tagB.x + 40, sort)} y={lerp(B.y, tagB.y, sort)} z={lerp(120, 0, sort)} s={q2 * lerp(1, 0.0, ease.in(prog(t, 118.4, 118.8)))} rz={lerp(5, 0, sort) + 3 * wobble(t, 135, 2)} order={56} />
        <Tag text="資料に足す一行" kind="yellow" w={560} size={48} x={tagA.x} y={tagA.y} s={pop(t, 118.4, 0.4, 1.8) * (1 + 0.04 * beatEnv(t, 6))} rz={lerp(-8, 0, ease.out(prog(t, 118.4, 119)))} order={44} />
        <Tag text="当日、答えを用意する" kind="teal" w={560} size={48} x={tagB.x} y={tagB.y} s={pop(t, 118.6, 0.4, 1.8) * (1 + 0.04 * beatEnv(t, 6))} rz={lerp(8, 0, ease.out(prog(t, 118.6, 119.2)))} order={44} />
        {ripple(t, 113.3, 0.6, A.x, A.y, 40, 300, C.purple)}
        {ripple(t, 114.1, 0.6, B.x, B.y, 40, 300, C.purple)}
        <Spark t={t} at={118.6} x={tagA.x} y={tagA.y} color={C.yellowDeep} r={220} />
        <Spark t={t} at={118.8} x={tagB.x} y={tagB.y} color={C.teal} r={220} />
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['自分が初めて聞くなら？'], 92, TX, TOP, 109.45, 113.2, {inStyle: 'flip', outStyle: 'fly', seed: 1301, emph: hl([0, 2, 7, 1.12, C.purple]), extra: drift(40, 0, 109.45)})} />
        <KLine {...L(['足す一行、', '備える答えが見える。'], 88, TX, TOP, 118.8, 121.7, {inStyle: 'rise', outStyle: 'sink', seed: 1302, emph: hl([0, 0, 4, 1.12, C.ink], [1, 0, 5, 1.12, C.teal]), extra: drift(26, 0, 118.8)})} />
      </>
    ),
    screen: streaks(t, 121.6, 122.0, 1),
  };
}

// =====================================================================
// CUT 14  122–133秒  違いをつけるなら、理由を。／意味のある範囲は区別し、／説明できない違いは、そろえる。
// 図を画面いっぱいに押し広げ、必要な境界を大きく描き、意味のない差をそろえる。
// =====================================================================
export function cut14(t: number): StageSpec {
  const grow = ease.outBack(prog(t, 122.2, 123.2), 1.2);
  const frame = ease.inOut(prog(t, 126.2, 127.2));
  const unify = ease.inOut(prog(t, 129.4, 130.4));
  const pack = ease.in(prog(t, 132.3, 133.0));
  const cam = add(camBase(t, 141, 16), merge(whipIn(t, 122, -800, -8), {
    x: seg(t, [[122, 0], [124, -80], [126.2, -60], [127.2, -180], [129.4, -60], [130.4, 60], [133, 0]], ease.inOut),
    y: seg(t, [[122, -60], [133, -40]]),
    roll: seg(t, [[122, -4], [124, 2], [126.2, -2], [127.2, 4], [128.6, -1], [129.4, 1], [130.4, -3], [132, 1], [133, 0]]),
    zoom: seg(t, [[122, 1.0], [123.4, 1.0], [126.2, 1.06], [127.2, 1.18], [129.4, 1.06], [130.4, 1.1], [132.3, 1.0], [133, 0.55]], ease.inOut),
  }));
  const cells: React.ReactNode[] = [];
  const CW = 230;
  const CH = 130;
  for (let r = 0; r < 2; r++)
    for (let c = 0; c < 3; c++) {
      const x = -300 + c * 300;
      const y = 60 - r * 190;
      // 意味のない差: (1,1) の色、(0,2) の破線
      const oddColor = r === 1 && c === 1;
      const oddLine = r === 0 && c === 2;
      const inScope = c < 2;
      const fill = oddColor ? (unify < 0.5 ? C.lilac : C.pale) : C.pale;
      const sh = damped(t, 129.9, 10, 8, 6) * (oddColor || oddLine ? 1 : 0);
      cells.push(
        <G key={`${r}${c}`} x={x + sh} y={y + 6 * Math.sin(t * 2.2 + r + c)} rz={(oddColor || oddLine ? 4 : 1.5) * wobble(t, 142 + r * 3 + c, 3) * (1 - unify * 0.8)}>
          <RRect w={CW} h={CH} r={14} color={fill} order={24} />
          {inScope && frame > 0 && <RRect w={CW} h={CH} r={14} color={C.yellow} opacity={0.55 * frame} order={25} />}
          {oddLine && unify < 0.5 ? <Dashed w={CW} h={CH} color={C.teal} width={4} march={t * 40} order={26} /> : <RRect w={CW} h={CH} r={14} border={3.5} color={C.teal} order={26} />}
        </G>,
      );
    }
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 142),
    world: (
      <>
        <Grid t={t} />
        <G x={-120} y={-170} s={clamp(grow, 0, 1.2) * lerp(1, 0.3, pack)} ry={lerp(30, 0, clamp(grow)) + 3 * wobble(t, 143, 5)}>
          {cells}
          {/* 「この違いの意味は？」: 迷いの破線の枠 */}
          <G x={-150} y={-35} s={1 + 0.03 * Math.sin(t * 4)}>
            <Dashed w={660} h={430} color={C.purple} width={4} march={-t * 30} opacity={1 - frame} order={30} />
          </G>
          <Txt text="この違いの意味は？" size={40} weight={800} color={C.purple} x={-150} y={235} opacity={clamp((t - 123.0) * 3) * (1 - frame)} order={31} />
          {/* 今回の範囲（必要な区別） */}
          <G x={-150} y={-35}>
            <RRect w={lerp(560, 660, frame)} h={lerp(330, 420, frame)} r={22} border={9} color={C.yellowDeep} opacity={frame} order={31} />
          </G>
          <Tag text="今回の範囲" kind="yellow" size={40} x={-150} y={240} s={pop(t, 126.7, 0.35, 2)} order={40} />
        </G>
        <Person id={t < 126.6 ? 'boss-think' : 'boss-read'} x={760} y={-470} h={340} />
        <Spark t={t} at={127.2} x={-270} y={130} color={C.yellowDeep} r={200} />
        {ripple(t, 129.9, 0.7, 180, -130, 40, 260, C.teal)}
        {ripple(t, 129.9, 0.7, 330, 60, 40, 260, C.teal)}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['違いをつけるなら、理由を。'], 88, TX, TOP, 122.35, 125.9, {inStyle: 'drop', outStyle: 'sink', seed: 1401, emph: hl([0, 10, 12, 1.15, C.purple]), extra: drift(26, 0, 122.35)})} />
        <KLine {...L(['意味のある範囲は区別し、'], 88, TX, TOP, 125.8, 132.6, {inStyle: 'flip', outStyle: 'fly', seed: 1402, emph: hl([0, 7, 9, 1.15, C.ink]), extra: drift(14, 0, 125.8)})} />
        <KLine {...L(['説明できない違いは、そろえる。'], 88, TX, TOP - 120, 129.0, 132.6, {inStyle: 'rise', outStyle: 'fly', seed: 1403, emph: hl([0, 11, 14, 1.15, C.teal]), extra: drift(20, 0, 129.0)})} />
      </>
    ),
  };
}

// =====================================================================
// CUT 15  133–148秒  記録も、報告も。／誰の手に渡り、どこで読まれるか。／作る前に、決めておく。
// 記録と報告の面を大きくめくって転換する。締めの問いと人物を組み替え、紙面の面がロゴの背景を開く。
// =====================================================================
const Card: React.FC<{front: string; back: string; flip: number; x: number; y: number; z?: number; kindBack: 'yellow' | 'plain'; s?: number; rz?: number}> = ({front, back, flip, x, y, z = 0, kindBack, s = 1, rz = 0}) => {
  const ang = 180 * clamp(flip);
  const showBack = ang > 90;
  return (
    <G x={x} y={y} z={z} s={s} rz={rz}>
      <G rx={showBack ? ang - 180 : ang}>
        {showBack ? <Tag text={back} kind={kindBack} w={620} size={44} order={40} /> : <Tag text={front} kind="plain" w={620} size={44} order={40} />}
      </G>
    </G>
  );
};
export function cut15(t: number): StageSpec {
  const flip1 = ease.inOut(prog(t, 136.2, 137.0));
  const flip2 = ease.inOut(prog(t, 136.6, 137.4));
  const regroup = ease.inOut(prog(t, 141.6, 142.8));
  const open = ease.in(prog(t, 147.2, 147.97)); // 紙面の面がロゴの背景（ライム）を開く
  const cam = add(camBase(t, 151, 16), merge(whipIn(t, 133, 0, -9, 0.5), {
    x: seg(t, [[133, -120], [136.2, 0], [137.4, 60], [139.5, 120], [141.6, 60], [142.8, 0], [145, -60], [147.2, 0]], ease.inOut),
    y: seg(t, [[133, -40], [137.4, -20], [142.8, -60], [147.2, -40]]),
    roll: seg(t, [[133, 5], [134.5, -2], [136.2, 2], [137.0, -5], [138.2, 1.5], [140, -1.5], [141.6, 2], [142.8, -3], [144.5, 1.5], [146, -1], [147.2, 0]]),
    zoom: seg(t, [[133, 1.15], [136.2, 1.04], [137.0, 1.16], [139.5, 1.06], [141.6, 1.1], [142.8, 0.98], [145.5, 1.06], [147.2, 1.1]], ease.inOut),
  }));
  const people = (
    <>
      <Person id={t < 141.8 ? 'staff-give' : 'staff-read'} x={lerp(-720, -300, regroup)} y={lerp(-470, -470, regroup)} h={lerp(340, 330, regroup)} />
      <Person id="boss-read" x={lerp(720, 300, regroup)} y={-470} h={lerp(340, 330, regroup)} />
    </>
  );
  const docRise = ease.outBack(prog(t, 142.8, 143.6), 1.4);
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 152),
    world: (
      <>
        <Grid t={t} />
        <Card front="「あれ」「それ」の会議記録" back="決まったこと・残っていること" kindBack="yellow" flip={flip1} x={lerp(0, -2600, regroup)} y={-70} z={lerp(0, -300, regroup)} s={pop(t, 133.3)} rz={2 * wobble(t, 153, 3)} />
        <Card front="細かな作業記録" back="使う人から見た変化" kindBack="plain" flip={flip2} x={lerp(0, 2600, regroup)} y={-220} z={lerp(0, -300, regroup)} s={pop(t, 133.5)} rz={-2 * wobble(t, 154, 3)} />
        <Txt text="記録" size={34} weight={800} color={C.gray} x={-400} y={-70} align="center" opacity={clamp((t - 133.8) * 3) * (1 - regroup)} order={44} />
        <Txt text="報告" size={34} weight={800} color={C.gray} x={-400} y={-220} align="center" opacity={clamp((t - 134.0) * 3) * (1 - regroup)} order={44} />
        {ripple(t, 137.0, 0.7, 0, -70, 40, 420, C.yellowDeep)}
        {/* 締め: 二人の間の資料と、読み手を示す印 */}
        <Doc x={0} y={-280} w={240} h={300} s={clamp(docRise, 0, 1.2) * (1 + 0.04 * beatEnv(t, 6))} rz={-2 + 2 * wobble(t, 155, 3)} mark={ease.out(prog(t, 143.4, 143.9))} reason="filled" reasonLabel="理由" order={30} />
        {people}
        {ripple(t, 139.6, 0.8, 720, -250, 60, 300, C.purple)}
        {ripple(t, 144.6, 0.8, 300, -250, 60, 300, C.purple)}
        {ripple(t, 145.6, 0.8, 300, -250, 60, 300, C.purple)}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['記録も、報告も。'], 104, TX, TOP, 133.3, 137.6, {inStyle: 'slam', outStyle: 'sink', seed: 1501, extra: drift(26, 0, 133.3, 0.4)})} />
        <KLine {...L(['誰の手に渡り、', 'どこで読まれるか。'], 100, TX, TOP, 137.5, 147.3, {inStyle: 'flip', outStyle: 'fly', seed: 1502, emph: hl([0, 0, 1, 1.25, C.purple], [1, 0, 3, 1.12, C.purple]), extra: (c) => ({x: 30 * smooth(prog(c.t, 137.5, 147)), y: 0})})} />
        <KLine {...L(['作る前に、決めておく。'], 92, TX, TOP - 280, 143.0, 147.3, {inStyle: 'drop', outStyle: 'fly', seed: 1503, color: C.purple, extra: (c) => ({x: 20 * smooth(prog(c.t, 143, 147)), s: 1 + 0.04 * Math.sin(c.t * 4 + c.i * 0.5)})})} />
      </>
    ),
    screen: open > 0 ? <RRect w={1920 * 1.3} h={1080 * 1.3} r={0} rz={lerp(-25, 0, open)} x={lerp(1900, 0, open)} color={C.lime} order={90} /> : null,
  };
}

