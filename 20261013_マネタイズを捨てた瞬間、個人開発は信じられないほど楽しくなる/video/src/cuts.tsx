// カット 1–8 の画面。各カットは時刻 t（秒）から「カメラ・HUD・世界・画面固定の要素」を返す純関数。
// 文言・配置・動きは plan.md のカット表に対応する。
import React from 'react';
import {C, DEG, X, Y, beatEnv, clamp, damped, ease, hash, lerp, prog, pulse, seg, smooth, wobble} from './lib/anim';
import {DotField, InkGrid} from './components/backdrop';
import {Disc, G, HudT, KLine, KLineProps, RRect, Ring, Txt, charPos, measure, screenToHud} from './components/prims';
import {Cam, ClipId, Mascot, StageSpec, Tool, handLeft, mascotMap, worldToScreen} from './components/stage';

const TEXT_X = -536; // 左の文の左端（画面の外周 5% より内側）

export function screenToWorld(cam: Cam, sx: number, sy: number): [number, number] {
  const c = Math.cos(-cam.roll * DEG);
  const s = Math.sin(-cam.roll * DEG);
  const dx = (sx * c - sy * s) / cam.zoom;
  const dy = (sx * s + sy * c) / cam.zoom;
  return [cam.x + dx, cam.y + dy];
}

// ---- 共通の部品 ----
const Board: React.FC<{text: string; x: number; y: number; z: number; rz: number; s?: number; w?: number; h?: number; order: number; opacity?: number}> = ({text, x, y, z, rz, s = 1, w = 780, h = 210, order, opacity = 1}) => (
  <G x={x} y={y} z={z} rz={rz} s={s}>
    <RRect w={w} h={h} r={22} color={C.terra} order={order} opacity={opacity} />
    <RRect w={w - 26} h={h - 26} r={14} color={C.kinari} border={3} order={order + 1} opacity={0.35 * opacity} />
    <Txt text={text} size={124} weight={900} color={C.kinari} order={order + 2} opacity={opacity} />
  </G>
);

const Tag: React.FC<{label: string; x: number; y: number; z: number; rz: number; s?: number; order: number; opacity?: number}> = ({label, x, y, z, rz, s = 1, order, opacity = 1}) => {
  const w = measure(label, 36, 800) + 56;
  return (
    <G x={x} y={y} z={z} rz={rz} s={s}>
      <RRect w={w} h={70} r={14} color={C.terra} order={order} opacity={opacity} />
      <Disc r={6} x={-w / 2 + 16} y={0} color={C.ink} order={order + 1} opacity={opacity} />
      <Txt text={label} size={36} weight={800} color={C.kinari} x={8} order={order + 2} opacity={opacity} />
    </G>
  );
};

// 画面固定の帯（場面の切り替え）
const Band: React.FC<{x: number; y?: number; rz: number; w: number; h: number; color: string; order?: number}> = ({x, y = 0, rz, w, h, color, order = 50}) => <RRect w={w} h={h} r={0} x={x} y={y} rz={rz} color={color} order={order} />;

// 拡がる輪（道具の反応・流れ）
function ripples(t: number, t0: number, t1: number, every: number, life: number, x: number, y: number, r0: number, grow: number, color: string, z = 0, order = 20, width = 5) {
  const out: React.ReactNode[] = [];
  for (let b = t0; b <= t1; b += every) {
    const age = t - b;
    if (age < 0 || age > life) continue;
    const k = age / life;
    out.push(<Ring key={b.toFixed(2)} x={x} y={y} z={z} r={r0 + grow * ease.out(k)} width={width * (1 - 0.6 * k)} color={color} opacity={0.75 * (1 - k)} order={order} />);
  }
  return out;
}

// =====================================================================
// CUT 1  0–5秒  自分がほしいツールを作りたい。／でも最初に浮かぶのは／マネタイズ／ユーザー数
// =====================================================================
export function cam1(t: number): Cam {
  return {
    x: seg(t, [[0, 0], [5, 60]]) + 6 * wobble(t, 1, 3) + damped(t, 3.25, 10, 7, 7) + damped(t, 4.05, 12, 7, 7),
    y: 5 * wobble(t, 2, 4) + damped(t, 3.25, 8, 6, 7),
    roll: seg(t, [[0, 0], [5, -8]]) + 0.7 * wobble(t, 3, 2.5),
    zoom: seg(t, [[0, 1], [5, 1.25]], (k) => k) + 0.02 * beatEnv(t, 7),
  };
}
function boardZ(t: number, tin: number) {
  const k = prog(t, tin, tin + 0.34);
  return lerp(-7000, 0, ease.outQuint(k)) + 60 * Math.max(0, t - tin - 0.34);
}
function cut1(t: number): StageSpec {
  const cam = cam1(t);
  const bob = 10 * beatEnv(t, 8);
  return {
    bg: C.ink,
    cam,
    hud: {x: 6 * wobble(t, 4, 3), y: 4 * wobble(t, 5, 3.5), roll: cam.roll * 0.45, s: 1 + (cam.zoom - 1) * 0.3},
    world: (
      <>
        <InkGrid t={t} />
        <Tool x={X(72)} y={Y(58) + bob * 0.4} s={1.1 + 0.05 * beatEnv(t, 8)} rz={-4 + 3 * Math.sin(t * 2.4)} knob={0.5 + 0.35 * Math.sin(t * 3.1)} order={6} />
        {t > 2.9 && <Board text="マネタイズ" x={60} y={70} z={boardZ(t, 2.9)} rz={-5 + damped(t, 3.24, 4, 3, 5)} order={12} opacity={clamp((t - 2.9) / 0.08)} />}
        {t > 3.7 && <Board text="ユーザー数" x={230} y={-140} z={boardZ(t, 3.7) + 40} rz={4 + damped(t, 4.04, 4, 3, 5)} order={15} opacity={clamp((t - 3.7) / 0.08)} />}
      </>
    ),
    hudNodes: (
      <>
        <KLine lines={['自分がほしい', 'ツールを作りたい。']} size={68} color={C.kinari} x={TEXT_X} y={190} t0={0.12} t1={2.0} inStyle="flip" outStyle="fly" seed={11} />
        <KLine lines={['でも最初に浮かぶのは']} size={58} color={C.apricot} x={TEXT_X} y={60} t0={1.98} t1={3.2} inStyle="rise" outStyle="sink" seed={12} />
      </>
    ),
    screen: <SweepBoard t={t} />,
  };
}
// カット1→2: 看板の縁が画面を横切り、その後ろから M1 が出る
const SweepBoard: React.FC<{t: number}> = ({t}) => {
  const k = prog(t, 4.72, 5.14);
  if (k <= 0 || k >= 1) return null;
  const x = lerp(1500, -1600, ease.inOut(k));
  return (
    <>
      <Band x={x} rz={10} w={1100} h={1500} color={C.terra} order={50} />
      <Band x={x + 560} rz={10} w={26} h={1500} color={C.kinari} order={51} />
    </>
  );
};

// =====================================================================
// CUT 2  5–11秒  収益・集客が前提だと／セキュリティも運用も重くなる／ハードルが一気に跳ね上がる
// =====================================================================
export function cam2(t: number): Cam {
  return {
    x: seg(t, [[5, 0], [11, 154]]) + 6 * wobble(t, 7, 3),
    y: 4 * wobble(t, 8, 3.2) + damped(t, 7.0, 6, 6, 6) + damped(t, 7.5, 6, 6, 6) + damped(t, 8.0, 6, 6, 6),
    roll: seg(t, [[5, -8], [11, 6]]) + 0.8 * wobble(t, 9, 2.2),
    zoom: seg(t, [[5, 1], [11, 1.15]], (k) => k) + 0.015 * beatEnv(t, 7),
  };
}
function cut2(t: number): StageSpec {
  const cam = cam2(t);
  const f = (t - 5) * 30;
  const spread = 1 + 1.6 * smooth(prog(t, 7, 11)); // 層の距離差を広げる
  const crowd = smooth(prog(t, 7.2, 11)); // 札が周囲を狭める
  const dip = (tin: number) => (t > tin + 0.4 ? -9 * beatEnv(t, 9) - 4 * Math.floor((t - tin) / 0.5) : 0); // 拍ごとに沈む
  const tag = (label: string, tx: number, ty: number, tz: number, tin: number, order: number, rz: number) => {
    if (t < tin) return null;
    const k = ease.outBack(prog(t, tin, tin + 0.32), 2);
    const x = lerp(tx, X(72), 0.22 * crowd);
    const y = lerp(ty + 420, ty, k) + dip(tin);
    return <Tag key={label} label={label} x={x} y={y} z={tz * spread} rz={rz + damped(t, tin + 0.3, 6, 4, 6)} order={order} />;
  };
  // ハードル（バー）が拍ごとに跳ね上がる
  const barY = seg(t, [[9.0, -200], [9.5, -200], [9.62, -115], [10.0, -115], [10.12, 140], [10.5, 140], [10.62, 200]], ease.outQuint) + damped(t, 9.62, 10, 4, 6) + damped(t, 10.12, 10, 4, 6) + damped(t, 10.62, 12, 4, 6);
  const barOn = clamp((t - 9.0) / 0.15);
  return {
    bg: C.ink,
    cam,
    hud: {x: 8 * wobble(t, 10, 3), y: 6 * wobble(t, 11, 3.6), roll: cam.roll * 0.4, s: 1 + 0.025 * Math.sin((t - 5) * 1.4)},
    world: (
      <>
        <InkGrid t={t} />
        <Board text="ユーザー数" x={seg(t, [[5, 760], [11, 700]])} y={330} z={-650 * (1 + 0.35 * (spread - 1))} rz={5 + 2 * wobble(t, 12, 3)} s={0.55} order={10} />
        <Board text="マネタイズ" x={seg(t, [[5, 420], [11, 340]])} y={seg(t, [[5, 270], [11, 235]])} z={-260 * spread} rz={-6 + 2 * wobble(t, 13, 3)} s={0.5} order={12} />
        {tag('固定費', 120, -150, -160, 8.0, 16, -6)}
        <Mascot id="m1" frame={f} foot={[X(72), -232]} height={325} />
        {tag('セキュリティ', 190, -190, 140, 7.0, 42, 3)}
        {tag('運用の責任', 480, -30, 70, 7.5, 44, 7)}
        {barOn > 0 && (
          <G x={X(72)} y={barY} z={90} rz={-3 + damped(t, 10.62, 4, 3, 5)}>
            <RRect w={420} h={20} r={10} color={C.apricot} opacity={barOn} order={46} />
            <RRect w={420} h={20} r={10} color={C.ink} border={3} opacity={barOn} order={47} />
          </G>
        )}
      </>
    ),
    hudNodes: (
      <>
        <KLine lines={['収益・集客が', '前提だと']} size={68} color={C.kinari} x={TEXT_X} y={190} t0={5.1} t1={7.0} inStyle="slam" outStyle="fly" seed={21} />
        <KLine lines={['セキュリティも', '運用も重くなる']} size={66} color={C.kinari} x={TEXT_X} y={190} t0={7.0} t1={9.0} inStyle="drop" outStyle="sink" seed={22} />
        <KLine
          lines={['ハードルが', '一気に跳ね上がる']}
          size={64}
          color={C.kinari}
          x={TEXT_X}
          y={190}
          t0={9.0}
          t1={11.0}
          inStyle="flip"
          outStyle="none"
          seed={23}
          emph={(li, ci) => (li === 1 && ci >= 3 ? {color: C.apricot} : null)}
          extra={({li, ci, t: tt}) => (li === 1 && ci >= 3 ? {y: 26 * Math.abs(Math.sin((tt - 9.5) * Math.PI * 2 + ci * 0.5)) * clamp((tt - 9.5) * 3)} : {})}
        />
      </>
    ),
    screen: <SweepBoard t={t} />,
  };
}

// =====================================================================
// CUT 3  11–14.3秒  自分が使う（白地へ瞬時に切り替え。11.0–11.3 は無音）
// =====================================================================
export function cam3(t: number): Cam {
  const k = prog(t, 11.3, 14.3);
  return {x: lerp(0, 70, smooth(k)), y: lerp(0, -40, smooth(k)), roll: lerp(0, 3, k) + 0.6 * wobble(t, 31, 3), zoom: lerp(1, 1.3, ease.inOut(k))};
}
function cut3(t: number): StageSpec {
  const cam = cam3(t);
  // 道具は最後の 0.4 秒でカット4の道具の画面位置へ寄る（輪の中心をつなぐ）
  const base: [number, number] = [230, -130];
  const tgtS = worldToScreen(cam4(14.3), CUT4.toolX, CUT4.toolY);
  const tgtW = screenToWorld(cam, tgtS[0], tgtS[1]);
  const km = ease.inOut(prog(t, 13.9, 14.3));
  const tx = lerp(base[0], tgtW[0], km);
  const ty = lerp(base[1], tgtW[1], km);
  const pop = ease.outBack(prog(t, 11.0, 11.12), 2.5);
  return {
    bg: C.kinari,
    cam,
    hud: {x: 0, y: 0, roll: seg(t, [[11.3, -4], [14.3, 4]], (k) => k), s: 1 + 0.06 * prog(t, 11.3, 14.3)},
    world: (
      <>
        <DotField opacity={0.5} />
        {ripples(t, 11.3, 14.3, 0.5, 1.6, tx, ty, 50, 420, C.terra, 0, 18, 6)}
        {ripples(t, 11.55, 14.3, 0.5, 1.6, tx, ty, 50, 300, C.apricot, 0, 17, 4)}
        <Tool x={tx} y={ty} s={lerp(0.85, 1 / cam.zoom, km) * pop * (1 + 0.06 * beatEnv(t - 0.0, 9))} rz={lerp(-6 + 3 * Math.sin(t * 2), 0, km)} knob={0.5} order={22} />
      </>
    ),
    hudNodes: <KLine lines={['自分が使う']} size={128} weight={900} color={C.ink} x={-170} y={130} align="center" t0={11.0} t1={14.32} inStyle="slam" inDur={0.14} stagger={0.02} outStyle="fly" outDur={0.2} seed={31} wave={0.7} />,
  };
}

// =====================================================================
// CUT 4  14.3–20秒  最初のユーザーは自分。／不便が消えれば元は取れる／無料枠で、思いついた日に動かす
// =====================================================================
const M2_FOOT: [number, number] = [X(72), -236];
const M2_H = 330;
const M2_TW = 90; // つまみの溝の長さ
// M2 の手先の軌道から、道具の位置・つまみの動き・反応の時刻を決める
const CUT4 = (() => {
  const map = mascotMap('m2', M2_FOOT, M2_H);
  const hx: number[] = [];
  const hy: number[] = [];
  for (let f = 0; f < 171; f++) {
    const [u, v] = handLeft('m2', f, 2);
    const [wx, wy] = map.toWorld(u, v);
    hx.push(wx);
    hy.push(wy);
  }
  let fMin = 0;
  hx.forEach((x, i) => {
    if (x < hx[fMin]) fMin = i;
  });
  const left = hx[fMin] - 8;
  const toolX = left + M2_TW / 2;
  const toolY = hy[fMin] + 4;
  // つまみ: 手先が押した最も左の位置に残る
  const knobX: number[] = [];
  let m = left + M2_TW * 0.75; // つまみの初期位置。手先がそこへ届いてから押される
  for (let f = 0; f < 171; f++) {
    m = Math.min(m, Math.max(left, hx[f] - 4));
    knobX.push(m);
  }
  const react = knobX.findIndex((x) => x <= left + M2_TW * 0.35);
  return {toolX, toolY, left, knobX, reactT: 14.3 + (react < 0 ? fMin : react) / 30};
})();

export function cam4(t: number): Cam {
  return {
    x: seg(t, [[14.3, -96], [20, 96]]) + 5 * wobble(t, 41, 3),
    y: seg(t, [[14.3, 54], [20, -54]]) + 4 * wobble(t, 42, 3.3),
    roll: seg(t, [[14.3, 6], [20, -5]]) + 0.6 * wobble(t, 43, 2.4),
    zoom: seg(t, [[14.3, 1], [20, 1.18]], (k) => k) + 0.012 * beatEnv(t, 8),
  };
}
const L4A: KLineProps = {lines: ['最初のユーザーは', '自分。'], size: 68, color: C.ink, x: TEXT_X, y: 190, t0: 14.4, t1: 16.6, inStyle: 'drop', outStyle: 'fly', seed: 41, emph: (li, ci) => (li === 1 && ci < 2 ? {scale: 1.5, color: C.terra} : null)};
function cut4(t: number): StageSpec {
  const cam = cam4(t);
  const hud: HudT = {x: 6 * wobble(t, 44, 3), y: 5 * wobble(t, 45, 3.4), roll: cam.roll * 0.4, s: 1 + 0.03 * Math.sin((t - 14.3) * 1.3)};
  const f = clamp((t - 14.3) * 30, 0, 170);
  const kx = CUT4.knobX[Math.round(f)];
  const knob = (kx - CUT4.left) / M2_TW;
  const r = CUT4.reactT;
  const glow = clamp((t - r) / 0.1);
  const pop = 1 + 0.22 * pulse(t, r, 7);
  // 最後に道具が右へ加速し、帯が M2 を覆う
  const fly = ease.in(prog(t, 19.45, 20.0));
  const toolX = CUT4.toolX + 1400 * fly;
  const toolY = CUT4.toolY + 40 * fly;
  const bandK = prog(t, 19.5, 20.05);
  const covered = t > 19.74;
  // 輪が道具から「自分」へ走る（HUD 座標で補間）
  const sTool = worldToScreen(cam, CUT4.toolX, CUT4.toolY);
  const hTool = screenToHud(hud, sTool[0], sTool[1]);
  const p0 = charPos(L4A, 1, 0);
  const p1 = charPos(L4A, 1, 1);
  const hSelf: [number, number] = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2];
  const rk = prog(t, r + 0.05, r + 0.55);
  const runner = rk > 0 && rk < 1;
  const arc = Math.sin(rk * Math.PI) * 120;
  const rx = lerp(hTool[0], hSelf[0], ease.inOut(rk));
  const ry = lerp(hTool[1], hSelf[1], ease.inOut(rk)) + arc;
  const selfHit = pulse(t, r + 0.55, 6);
  // 時計と雲（思いついた日・無料枠）
  const clockOn = ease.outBack(prog(t, 17.0, 17.35), 2);
  const cloudOn = ease.outBack(prog(t, 18.3, 18.65), 2);
  const orbit = (t - 17) * 2.4;
  return {
    bg: C.kinari,
    cam,
    hud,
    world: (
      <>
        <DotField opacity={0.5} />
        {t < 14.6 && ripples(t, 14.0, 14.3, 0.3, 0.6, CUT4.toolX, CUT4.toolY, 40, 300, C.terra, 0, 18)}
        {ripples(t, r, r + 4.5, 0.5, 1.4, CUT4.toolX, CUT4.toolY, 50, 380, C.terra, 0, 18, 5)}
        {clockOn > 0 && !covered && (
          <G x={430} y={210} z={-180} s={clockOn}>
            <Disc r={62} color={C.kinari} order={14} />
            <Ring r={62} width={8} color={C.ink} order={15} />
            <RRect w={6} h={44} r={3} y={18} rz={-(t - 17) * 220} color={C.ink} order={16} />
            <G rz={-(t - 17) * 900}>
              <RRect w={4} h={54} r={2} y={24} color={C.terra} order={16} />
            </G>
            <G x={Math.cos(orbit) * 118} y={Math.sin(orbit) * 70}>
              <RRect w={96} h={46} r={23} color={C.terra} order={17} />
              <Txt text="今日" size={28} weight={800} color={C.kinari} order={18} />
            </G>
          </G>
        )}
        {cloudOn > 0 && !covered && (
          <G x={540} y={-130} z={-260} s={cloudOn * (1 + 0.04 * beatEnv(t, 8))} rz={4 * Math.sin(t * 2)}>
            <Disc r={46} x={-50} y={0} color={C.apricot} order={13} />
            <Disc r={62} x={10} y={22} color={C.apricot} order={13} />
            <Disc r={42} x={70} y={-4} color={C.apricot} order={13} />
            <RRect w={210} h={60} r={30} y={-26} color={C.apricot} order={13} />
          </G>
        )}
        <Tool x={toolX} y={toolY} s={pop} rz={damped(t, r, 8, 3, 5)} knob={knob} glow={glow} order={fly > 0 ? 55 : 22} />
        {!covered && <Mascot id="m2" frame={f} foot={M2_FOOT} height={M2_H} />}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L4A} extra={({li, ci}) => (li === 1 && ci < 2 ? {s: 1 + 0.3 * selfHit, rz: 12 * selfHit} : {})} />
        <KLine lines={['不便が消えれば', '元は取れる']} size={68} color={C.ink} x={TEXT_X} y={190} t0={16.6} t1={18.3} inStyle="flip" outStyle="sink" seed={42} />
        <KLine lines={['無料枠で、', '思いついた日に動かす']} size={60} color={C.ink} x={TEXT_X} y={190} t0={18.3} t1={19.75} inStyle="rise" outStyle="fly" seed={43} />
        {runner && (
          <>
            <Ring x={rx} y={ry} r={30 + 10 * Math.sin(rk * Math.PI)} width={7} color={C.terra} order={70} />
            <Disc x={rx} y={ry} r={9} color={C.terra} order={70} />
          </>
        )}
        {selfHit > 0.05 && <Ring x={hSelf[0]} y={hSelf[1]} r={70 + 60 * (1 - selfHit)} width={5} color={C.terra} opacity={selfHit} order={59} />}
      </>
    ),
    screen: bandK > 0 && bandK < 1 ? <Band x={lerp(-2200, 2200, ease.inOut(bandK))} y={-20} rz={-8} w={2000} h={560} color={C.terra} order={50} /> : null,
  };
}

// =====================================================================
// CUT 5  20–21秒  新しい文なし。道具の輪郭が URL カードへ変形（ホイップパン）
// =====================================================================
const CARD = {x: 300, y: -10, w: 440, h: 270};
function cam5(t: number): Cam {
  const k = prog(t, 20, 20.72);
  return {x: lerp(-1300, 0, ease.outExpo(k)), y: 0, roll: 7 * (1 - ease.out(k)) + damped(t, 20.72, 2.5, 3, 6), zoom: 1};
}
function cut5(t: number): StageSpec {
  const cam = cam5(t);
  const k = prog(t, 20, 20.72);
  const vel = Math.pow(2, -10 * k) * 10 * Math.LN2; // outExpo の速度
  const mk = ease.inOut(prog(t, 20.12, 20.7));
  const land = ease.outBack(prog(t, 20.6, 20.9), 2.4);
  const w = lerp(150, CARD.w, mk);
  const h = lerp(84, CARD.h, mk);
  const col = mk < 0.5 ? C.apricot : C.ink;
  const lines: React.ReactNode[] = [];
  for (let i = 0; i < 16; i++) {
    const y = (hash(i * 3.3) - 0.5) * 640;
    const x = -1500 + hash(i * 7.1) * 1900;
    const len = 300 + hash(i * 1.9) * 700;
    lines.push(<RRect key={i} x={x} y={y} z={-100 + hash(i) * 200} w={len * (1 + vel * 0.25)} h={4 + hash(i * 5) * 6} r={3} color={i % 3 === 0 ? C.terra : C.apricot} opacity={0.55 * clamp(vel / 2)} order={5} />);
  }
  return {
    bg: C.kinari,
    cam,
    hud: {x: 0, y: 0, roll: 0, s: 1},
    world: (
      <>
        <DotField opacity={0.45} />
        {lines}
        <G x={CARD.x} y={CARD.y} z={lerp(-300, 0, clamp(land, 0, 1.2))} sx={1 + vel * 0.08} rz={-6 * (1 - mk)}>
          <RRect w={w} h={h} r={lerp(20, 26, mk)} color={col} order={30} />
          <RRect w={w} h={h} r={lerp(20, 26, mk)} color={C.ink} border={5} order={31} />
          {mk < 0.4 && <Tool x={0} y={0} knob={0.3} opacity={1 - mk / 0.4} order={32} />}
          <Txt text="URL" size={120} weight={900} color={C.kinari} x={-w / 2 + 40} y={h / 2 - 90} align="left" opacity={clamp((t - 20.62) / 0.2)} order={33} />
        </G>
      </>
    ),
  };
}

// =====================================================================
// CUT 6  21–27秒  登録なし、URLを送るだけ／「調整さん」感覚の道具
// =====================================================================
function cam6(t: number): Cam {
  return {
    x: seg(t, [[21, 0], [27, 256]]) + 5 * wobble(t, 61, 3),
    y: 6 * wobble(t, 62, 3.5),
    roll: seg(t, [[21, -2], [27, 3]]) + 0.7 * wobble(t, 63, 2.6),
    zoom: seg(t, [[21, 1], [27, 1.1]], (k) => k) + 0.01 * beatEnv(t, 8),
  };
}
const GRID = {x: 470, y: -10, cw: 120, ch: 84, gap: 16};
function cut6(t: number): StageSpec {
  const cam = cam6(t);
  const unfold = prog(t, 22.8, 23.8);
  const cardRx = -80 * ease.in(prog(t, 22.8, 23.3));
  const cardOp = 1 - prog(t, 23.15, 23.4);
  const send = prog(t, 21.7, 22.7);
  // 最後のマスの輪郭が M3 の道具へ
  const fin = prog(t, 26.25, 27.0);
  const drop = ease.in(prog(t, 26.2, 26.75));
  const tgtS = worldToScreen(cam7(27), CUT7.toolX, CUT7.toolY);
  const tgtW = screenToWorld(cam, tgtS[0], tgtS[1]);
  const cells: React.ReactNode[] = [];
  const marks = [
    {i: 4, at: 24.3},
    {i: 8, at: 24.8},
    {i: 1, at: 25.3},
  ];
  for (let i = 0; i < 9; i++) {
    const c = i % 3;
    const r = Math.floor(i / 3);
    const gx = GRID.x + (c - 1) * (GRID.cw + GRID.gap);
    const gy = GRID.y - (r - 1) * (GRID.ch + GRID.gap);
    const k = ease.outBack(prog(unfold, i * 0.05, i * 0.05 + 0.55), 1.8);
    if (k <= 0) continue;
    let x = lerp(CARD.x, gx, k);
    let y = lerp(CARD.y, gy, k) + 10 * Math.sin(t * 4.2 + i * 0.8) * clamp((t - 23.8) * 2);
    let rx = 90 * (1 - clamp(k));
    let rz = 0;
    let s = 1;
    let op = 1;
    if (i === 8) {
      const fk = ease.inOut(fin);
      x = lerp(x, tgtW[0], fk);
      y = lerp(y, tgtW[1], fk);
      s = lerp(1, (150 / GRID.cw) / cam.zoom, fk);
    } else if (drop > 0) {
      y -= 700 * drop;
      rz = (hash(i * 9) - 0.5) * 120 * drop;
      op = 1 - drop;
    }
    const mark = marks.find((m) => m.i === i);
    const mk = mark ? ease.out(prog(t, mark.at, mark.at + 0.3)) : 0;
    const toTool = i === 8 ? clamp(fin * 1.6 - 0.4) : 0;
    cells.push(
      <G key={i} x={x} y={y} z={(1 - clamp(k)) * -120} rx={rx} rz={rz} s={s * (1 + 0.15 * pulse(t, mark?.at ?? 99, 8))}>
        <RRect w={GRID.cw} h={GRID.ch * lerp(1, 84 / 84, toTool)} r={14} color={C.apricot} opacity={op} order={30} />
        <RRect w={GRID.cw} h={GRID.ch} r={14} color={C.ink} border={4} opacity={op} order={31} />
        {mk > 0 && <Ring r={22} width={6} arc={mk} color={C.ink} opacity={op * (1 - toTool)} order={32} />}
        {toTool > 0 && (
          <>
            <RRect w={GRID.cw * 0.6 * toTool} h={6} r={3} color={C.ink} order={33} />
            <Disc r={11 * toTool} color={C.ink} order={34} />
          </>
        )}
      </G>,
    );
  }
  const chevrons: React.ReactNode[] = [];
  for (let j = 0; j < 3; j++) {
    const k = prog(send, j * 0.15, j * 0.15 + 0.6);
    if (k <= 0 || k >= 1) continue;
    chevrons.push(<Txt key={j} text="›" size={96} weight={900} color={C.terra} x={CARD.x + CARD.w / 2 + 30 + 260 * ease.out(k)} y={CARD.y} opacity={Math.sin(k * Math.PI)} order={35} />);
  }
  return {
    bg: C.kinari,
    cam,
    hud: {x: 6 * wobble(t, 64, 3), y: 5 * wobble(t, 65, 3.2), roll: cam.roll * 0.5, s: 1 + 0.03 * Math.sin((t - 21) * 1.5)},
    world: (
      <>
        <DotField opacity={0.5} />
        {cardOp > 0 && (
          <G x={CARD.x} y={CARD.y + 8 * Math.sin(t * 3)} rx={cardRx} rz={2 * Math.sin(t * 1.7)} s={1 + 0.05 * pulse(t, 21.7, 6)}>
            <RRect w={CARD.w} h={CARD.h} r={26} color={C.ink} opacity={cardOp} order={28} />
            <Txt text="URL" size={120} weight={900} color={C.kinari} x={-CARD.w / 2 + 40} y={CARD.h / 2 - 90} align="left" opacity={cardOp} order={29} />
            <RRect w={CARD.w - 80} h={10} r={5} y={-70} color={C.apricot} opacity={cardOp * 0.8} order={29} />
          </G>
        )}
        {chevrons}
        {cells}
      </>
    ),
    hudNodes: (
      <>
        <KLine lines={['登録なし、', 'URLを送るだけ']} size={68} color={C.ink} x={TEXT_X} y={190} t0={21.05} t1={23.9} inStyle="flip" outStyle="fly" seed={61} />
        <KLine lines={['「調整さん」感覚の', '道具']} size={62} color={C.ink} x={TEXT_X} y={190} t0={23.9} t1={26.9} inStyle="drop" outStyle="sink" seed={62} emph={(li) => (li === 1 ? {scale: 1.5, color: C.terra} : null)} />
      </>
    ),
  };
}

// =====================================================================
// CUT 7  27–35秒  作って、すぐ使う。／使わなくなったら静かに閉じればいい／作る楽しさが戻ってくる
// =====================================================================
const M3_H = 330;
function toolForClip(id: ClipId, foot: [number, number], frames: number) {
  const map = mascotMap(id, foot, M3_H);
  let sx = 0;
  let sy = 0;
  for (let f = 0; f < frames; f++) {
    const [wx, wy] = map.toWorld(...handLeft(id, f, 2));
    sx += wx;
    sy += wy;
  }
  return {map, toolX: sx / frames - 22, toolY: sy / frames + 2};
}
const M3A_FOOT: [number, number] = [X(72), -236];
const CUT7 = toolForClip('m3a', M3A_FOOT, 150);
function knobFor(id: ClipId, map: ReturnType<typeof mascotMap>, toolX: number, f: number) {
  const [hx] = map.toWorld(...handLeft(id, f, 3));
  return clamp((hx - (toolX - 45)) / 90);
}
export function cam7(t: number): Cam {
  const th = ((t - 27) / 5) * Math.PI * 2 * 0.9;
  return {
    x: 70 * Math.cos(th) - 70 + 5 * wobble(t, 71, 3),
    y: 42 * Math.sin(th),
    roll: seg(t, [[27, -6], [35, 8]], (k) => k) + 0.8 * wobble(t, 72, 2.4),
    zoom: seg(t, [[27, 1], [35, 1.2]], (k) => k) + 0.012 * beatEnv(t, 8),
  };
}
function cut7(t: number): StageSpec {
  const cam = cam7(t);
  const th = ((t - 27) / 5) * Math.PI * 2 * 0.9;
  const f = clamp((t - 27) * 30, 0, 149);
  const knob = knobFor('m3a', CUT7.map, CUT7.toolX, f);
  const [hx0] = CUT7.map.toWorld(...handLeft('m3a', f - 2, 2));
  const [hx1] = CUT7.map.toWorld(...handLeft('m3a', f + 2, 2));
  const jig = clamp(Math.abs(hx1 - hx0) / 20); // 手の動きに合わせて道具が弾む
  const bandK = prog(t, 31.85, 32.3);
  const covered = t > 32.05;
  // 公開アイコン（窓）を閉じる
  const winOn = ease.outBack(prog(t, 32.05, 32.35), 2);
  const press = 1 - 0.12 * Math.sin(Math.PI * prog(t, 32.5, 32.65));
  const close = ease.in(prog(t, 32.7, 33.05));
  const fade = prog(t, 33.05, 33.4);
  return {
    bg: C.kinari,
    cam,
    hud: {x: -36 * Math.cos(th) + 20, y: -22 * Math.sin(th) + 5 * wobble(t, 73, 3), roll: cam.roll * 0.35 + seg(t, [[33.2, 0], [35, 6]]), s: 1 + 0.03 * Math.sin((t - 27) * 1.6) + 0.06 * prog(t, 33.2, 35)},
    world: (
      <>
        <DotField opacity={0.5} />
        {!covered && (
          <>
            <Tool x={CUT7.toolX} y={CUT7.toolY + 8 * jig * Math.abs(Math.sin(t * 9))} rz={6 * jig * Math.sin(t * 7)} s={1 + 0.06 * beatEnv(t, 9)} knob={knob} glow={0.4 + 0.6 * jig} order={22} />
            <Mascot id="m3a" frame={f} foot={[M3A_FOOT[0] + 140 * (1 - ease.outExpo(prog(t, 27.0, 27.35))), M3A_FOOT[1]]} height={M3_H} opacity={clamp((t - 27.0) / 0.1)} />
          </>
        )}
        {winOn > 0 && fade < 1 && (
          <G x={300} y={-20} s={winOn * (1 - 0.7 * fade)} sy={lerp(1, 0.03, close)}>
            <RRect w={340} h={210} r={22} color={C.ink} opacity={1 - fade} order={40} />
            {[0, 1, 2].map((i) => (
              <Disc key={i} r={8} x={-140 + i * 26} y={78} color={i === 0 ? C.terra : C.apricot} opacity={1 - fade} order={41} />
            ))}
            <G y={-20} s={press}>
              <RRect w={190} h={70} r={35} color={C.kinari} opacity={1 - fade} order={41} />
              <Txt text="閉じる" size={34} weight={800} color={C.ink} opacity={1 - fade} order={42} />
            </G>
          </G>
        )}
      </>
    ),
    hudNodes: (
      <>
        <KLine lines={['作って、', 'すぐ使う。']} size={92} weight={900} color={C.ink} x={TEXT_X} y={200} t0={27.1} t1={31.0} inStyle="slam" outStyle="burst" seed={71} />
        <KLine lines={['使わなくなったら', '静かに閉じればいい']} size={56} color={C.ink} x={TEXT_X} y={-60} t0={31.0} t1={33.2} inStyle="rise" outStyle="sink" seed={72} wave={0.6} />
        <KLine
          lines={['作る楽しさが', '戻ってくる']}
          size={66}
          weight={900}
          color={C.ink}
          x={-40}
          y={170}
          align="center"
          t0={33.2}
          t1={35.0}
          inStyle="spin"
          outStyle="none"
          seed={73}
          emph={(li, ci) => (li === 0 && ci >= 2 && ci <= 4 ? {scale: 2.0, color: C.terra} : null)}
          extra={({li, ci, t: tt}) => {
            const big = li === 0 && ci >= 2 && ci <= 4;
            const k = ease.in(prog(tt, 34.35, 35.0));
            if (big) return {z: -2600 * k, rz: 200 * k * (ci - 3 || 1), s: 1 + 0.25 * k, op: 1 - prog(tt, 34.85, 35.0)};
            return {y: -200 * k, op: 1 - k};
          }}
        />
      </>
    ),
    screen: bandK > 0 && bandK < 1 ? <Band x={160} y={lerp(1400, -1400, ease.inOut(bandK))} rz={-14} w={1400} h={700} color={C.terra} order={50} /> : null,
  };
}

// =====================================================================
// CUT 8  35–45秒  壮大な成果より、／手元を助ける小さな道具を育てる／まず、自分のために作る
// =====================================================================
const M3B_FOOT: [number, number] = [X(27), -239];
const CUT8 = toolForClip('m3b', M3B_FOOT, 120);
function cam8(t: number): Cam {
  return {
    x: 55 * Math.sin((t - 35) * 1.3) * (t < 39 ? 1 : 0.4) + 5 * wobble(t, 81, 3),
    y: 30 * Math.sin((t - 35) * 0.9) + 5 * wobble(t, 82, 3.4),
    roll: seg(t, [[35, -7], [37, 6], [39, -5], [43, 4], [45, -3]]) + 0.8 * wobble(t, 83, 2.5),
    zoom: seg(t, [[35, 1.0], [39, 1.14], [39.4, 1.0], [43, 1.15], [45, 1.2]]) + 0.018 * beatEnv(t, 8),
  };
}
const L8A_W = 64 * 8;
function cut8(t: number): StageSpec {
  const cam = cam8(t);
  const f = clamp((t - 35) * 30, 0, 119);
  const slideIn = 1 - ease.outExpo(prog(t, 35.0, 35.4));
  const layer = seg(t, [[35, 0], [39, 1]]); // 左右の層を逆方向へ（画面幅 12%）
  const off = -60 * slideIn * 10 + 77 * layer;
  const foot: [number, number] = [M3B_FOOT[0] + off, M3B_FOOT[1]];
  const knob = knobFor('m3b', CUT8.map, CUT8.toolX, f);
  const covered = t > 39.0;
  const bandK = prog(t, 38.85, 39.25);
  // 39 秒: 道具と文字を中央へ集める → 40–43 秒: 小さな道具を手前へ
  const gather = ease.outBack(prog(t, 39.1, 39.8), 1.6);
  const forward = ease.inOut(prog(t, 40.0, 43.0));
  const tX = lerp(CUT8.toolX + off, 0, gather);
  const tY = lerp(CUT8.toolY, -150, gather);
  const tZ = 260 * forward;
  const grow = ease.outBack(prog(t, 41.4, 42.1), 2);
  // 43 秒: 墨色のワイプ → 45 秒の直前にライムの円
  const wipe = ease.inOut(prog(t, 43.0, 43.5));
  const lime = ease.in(prog(t, 44.82, 45.0));
  const center = worldToScreen(cam, tX, tY, tZ);
  return {
    bg: C.kinari,
    cam,
    hud: {x: -77 * layer + 30 * (1 - ease.out(prog(t, 35, 35.5))) + 14 * Math.sin((t - 35) * 2.1), y: 12 * Math.sin((t - 35) * 1.7) + 5 * wobble(t, 84, 3.2), roll: cam.roll * 0.5 + (t > 43.3 ? 4 * Math.sin((t - 43.3) * 2.2) : 0), s: 1 + 0.05 * Math.sin((t - 35) * 1.5) + 0.14 * ease.inOut(prog(t, 43.4, 45))},
    world: (
      <>
        <DotField opacity={0.5} />
        {t < 43.6 && (
          <>
            {t > 39.6 && ripples(t, 39.8, 43.0, 0.5, 1.5, tX, tY, 60 + 60 * forward, 300, C.terra, tZ, 18, 5)}
            <Tool x={tX} y={tY} z={tZ} s={lerp(1, 1.3, gather) * (1 + 0.05 * beatEnv(t, 9))} rz={covered ? 4 * Math.sin(t * 3) : 3 * Math.sin(t * 6)} knob={covered ? 0.5 + 0.4 * Math.sin((t - 39) * 2.2) : knob} glow={covered ? 0.6 + 0.4 * grow : 0.3} extraRow={grow} order={22} />
          </>
        )}
        {!covered && <Mascot id="m3b" frame={f} foot={foot} height={M3_H} />}
        {t < 43.2 && <Grand t={t} />}
      </>
    ),
    hudNodes: (
      <>
        <KLine
          lines={['壮大な成果より、']}
          size={64}
          color={C.ink}
          x={20}
          y={200}
          t0={35.2}
          t1={43.0}
          inStyle="flip"
          outStyle="none"
          seed={81}
          wave={2.2}
          extra={({t: tt}) => {
            const g = ease.inOut(prog(tt, 39.1, 39.8));
            const back = ease.inOut(prog(tt, 40.0, 42.8));
            return {x: lerp(0, -L8A_W / 2 - 20 + 77, g), y: 10 * g + 170 * back, z: -1400 * back, op: lerp(1, 0.35, back) * (1 - prog(tt, 42.6, 43.0))};
          }}
        />
        <KLine lines={['手元を助ける', '小さな道具を育てる']} size={66} color={C.ink} x={77} y={120} align="center" t0={39.6} t1={43.05} inStyle="flip" outStyle="burst" seed={82} emph={(li, ci) => (li === 1 && ci < 5 ? {color: C.terra} : null)} />
        <KLine
          lines={['まず、', '自分のために作る']}
          size={84}
          weight={900}
          color={C.kinari}
          x={77}
          y={130}
          align="center"
          t0={43.3}
          t1={45.0}
          inStyle="rise"
          outStyle="none"
          seed={83}
          wave={1.6}
          extra={({x, t: tt}) => ({x: -x * 0.55 * (1 - ease.outQuint(prog(tt, 43.3, 44.1)))})}
        />
      </>
    ),
    screen: (
      <>
        {bandK > 0 && bandK < 1 && <Band x={lerp(-2000, 2000, ease.inOut(bandK))} y={-30} rz={78} w={700} h={1800} color={C.terra} order={50} />}
        {wipe > 0 && <Disc x={center[0]} y={center[1]} r={1700 * wipe} color={C.ink} order={50} />}
        {wipe >= 1 && <Orbit t={t} />}
        {lime > 0 && <Disc r={1600 * lime} color={C.lime} order={80} />}
      </>
    ),
  };
}

// カットの境目はフレーム番号で判定する（plan.md のフレーム範囲。終端を含まない）
// カット8: 「壮大な成果」の大きな輪（40–43 秒に文字と一緒に奥へ遠ざかる）
const Grand: React.FC<{t: number}> = ({t}) => {
  const on = ease.out(prog(t, 35.3, 36.2));
  const back = ease.inOut(prog(t, 40.0, 42.8));
  const op = on * (1 - back * 0.8) * (1 - prog(t, 42.7, 43.1));
  const z = -300 - 3000 * back;
  return (
    <G x={260 - 260 * back} y={60} z={z} rz={(t - 35) * 14}>
      <Ring r={520} width={3} color={C.terra} opacity={0.35 * op} order={3} />
      <Ring r={430} width={14} arc={0.32} start={20} color={C.apricot} opacity={0.6 * op} order={3} />
      <Ring r={430} width={14} arc={0.18} start={200} color={C.terra} opacity={0.5 * op} order={3} />
      <Ring r={610} width={6} arc={0.22} start={110 - (t - 35) * 30} color={C.apricot} opacity={0.5 * op} order={3} />
    </G>
  );
};
// カット8 の最終文の背後（墨色の上）でゆっくり回る弧
const Orbit: React.FC<{t: number}> = ({t}) => {
  const k = ease.out(prog(t, 43.4, 44.2));
  return (
    <G rz={(t - 43) * 40}>
      <Ring r={330 + 40 * k} width={4} arc={0.28 * k} start={30} color={C.apricot} opacity={0.8} order={55} />
      <Ring r={330 + 40 * k} width={4} arc={0.28 * k} start={210} color={C.terra} opacity={0.9} order={55} />
      <Ring r={390 + 50 * k} width={2} arc={0.6 * k} start={300 - (t - 43) * 80} color={C.kinari} opacity={0.25} order={55} />
    </G>
  );
};

export function specAt(frame: number): StageSpec {
  const t = frame / 30;
  if (frame < 150) return cut1(t);
  if (frame < 330) return cut2(t);
  if (frame < 429) return cut3(t);
  if (frame < 600) return cut4(t);
  if (frame < 630) return cut5(t);
  if (frame < 810) return cut6(t);
  if (frame < 1050) return cut7(t);
  return cut8(t);
}
