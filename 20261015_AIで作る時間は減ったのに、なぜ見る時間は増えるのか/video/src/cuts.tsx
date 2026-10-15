// カット 1–15 の画面。各カットは時刻 t（秒・全編の時刻）から「カメラ・HUD・世界・画面固定の要素」を返す純関数。
// 文言・素材の区間・動きの狙いは ../plan.html のカット表に対応する。カット16（ロゴ）は Main.tsx。
import React from 'react';
import {BEAT, C, DEG, beatEnv, clamp, damped, ease, hash, lerp, prog, pulse, seg, smooth, wobble} from './lib/anim';
import {Grid} from './components/backdrop';
import {Disc, G, KLine, KLineProps, Pin, Poly, RRect, Ring, Seg, Shade, Txt, charPos, measure} from './components/prims';
import {Cam, ClipPlane, StageSpec, StillPlane, anchorLocal} from './components/stage';

const TX = -820; // 左の文の左端（画面の外周 5% より内側）
const TOP = 440; // 上の文の上端

// ---- 共通の部品・動き ----
type LP = Omit<KLineProps, 'lines' | 'size' | 'x' | 'y' | 't0' | 't1'>;
const L = (lines: string[], size: number, x: number, y: number, t0: number, t1: number, o: LP = {}): KLineProps => ({lines, size, x, y, t0, t1, color: C.text, align: 'left', ...o});
// 強調: 指定の文字範囲を拡大・色替え
type Span = [number, number, number, number, string]; // 行, 開始, 終了(含まない), 倍率, 色
const hl = (...spans: Span[]) => (li: number, ci: number) => {
  for (const [l, a, b, s, c] of spans) if (li === l && ci >= a && ci < b) return {scale: s, color: c};
  return null;
};
// 読む間の移動（文全体が流れる・弧を描く）
const drift = (vx: number, vy: number, t0: number, rot = 0) => (c: {t: number; i: number}) => {
  const u = Math.max(0, c.t - t0);
  return {x: vx * u, y: vy * u, rz: rot * u};
};

// HUD（主張の文字の層）の連続した運動。拍で少し跳ねる
function hudMove(t: number, seed: number, ax = 36, ay = 22, ar = 1.8) {
  return {
    x: ax * wobble(t, seed, 5.2),
    y: ay * wobble(t, seed + 1, 4.4),
    roll: ar * wobble(t, seed + 2, 6.1),
    s: 1 + 0.018 * beatEnv(t, 7) + 0.02 * wobble(t, seed + 3, 7),
  };
}
const camBase = (t: number, seed: number, amp = 14): Cam => ({x: amp * wobble(t, seed, 4.6), y: amp * 0.7 * wobble(t, seed + 1, 5.3), roll: 1.2 * wobble(t, seed + 2, 5.8), zoom: 1 + 0.012 * beatEnv(t, 7)});
const add = (a: Cam, b: Partial<Cam>): Cam => ({x: a.x + (b.x ?? 0), y: a.y + (b.y ?? 0), roll: a.roll + (b.roll ?? 0), zoom: a.zoom * (b.zoom ?? 1)});

// 成果物の青い球（つや付き）
const Ball: React.FC<{x: number; y: number; z?: number; r: number; opacity?: number; order?: number; color?: string}> = ({x, y, z = 0, r, opacity = 1, order = 22, color = C.cyan}) => (
  <>
    <Disc r={r} x={x} y={y} z={z} color={color} opacity={opacity} order={order} />
    <Disc r={r * 0.32} x={x - r * 0.3} y={y + r * 0.32} z={z} color="#ffffff" opacity={0.55 * opacity} order={order + 1} />
  </>
);
// 枠つきの区画（担当・領域）
const Zone: React.FC<{x: number; y: number; w: number; h: number; color: string; fill?: string; label?: string; labelSize?: number; opacity?: number; order?: number; rz?: number; ry?: number; s?: number; z?: number; labelPos?: 'center' | 'tl'}> = ({x, y, w, h, color, fill = C.panel, label, labelSize = 56, opacity = 1, order = 14, rz = 0, ry = 0, s = 1, z = 0, labelPos = 'center'}) => (
  <G x={x} y={y} z={z} rz={rz} ry={ry} s={s}>
    <RRect w={w} h={h} r={16} color={fill} opacity={opacity} order={order} />
    <RRect w={w} h={h} r={16} color={color} border={3} opacity={opacity} order={order + 1} />
    {label && (labelPos === 'center' ? <Txt text={label} size={labelSize} weight={800} color={color} opacity={opacity} order={order + 2} /> : <Txt text={label} size={labelSize} weight={800} color={color} align="left" x={-w / 2 + 30} y={h / 2 - labelSize * 0.9} opacity={opacity} order={order + 2} />)}
  </G>
);
// 人・役割を表す角丸カード（成果物の球とは別の形）
const Card: React.FC<{x: number; y: number; s?: number; rz?: number; opacity?: number; order?: number}> = ({x, y, s = 1, rz = 0, opacity = 1, order = 24}) => (
  <G x={x} y={y} s={s} rz={rz}>
    <RRect w={104} h={104} r={26} color={C.text} opacity={opacity} order={order} />
    <Disc r={17} y={16} color={C.panel} opacity={0.75 * opacity} order={order + 1} />
    <RRect w={52} h={20} r={10} y={-24} color={C.panel} opacity={0.75 * opacity} order={order + 1} />
  </G>
);
// 整った見た目の文書。miss=根拠が抜けた度合い（0..1）
const Doc: React.FC<{miss: number; sep?: number; order?: number; opacity?: number; label?: number; inner?: number}> = ({miss, sep = 0, order = 30, opacity = 1, label = 0, inner = 1}) => {
  const z = (k: number) => k * sep;
  const fall = ease.in(clamp(miss));
  return (
    <>
      <RRect w={640} h={760} r={18} color={C.paper} order={order} opacity={opacity} />
      <RRect w={420} h={36} r={4} x={-70} y={300} z={z(160)} color={C.paperInk} order={order + 2} opacity={opacity} />
      <RRect w={540} h={10} r={5} y={240} z={z(120)} color="#5f7f97" order={order + 2} opacity={opacity} />
      <RRect w={460} h={10} r={5} x={-40} y={212} z={z(120)} color="#5f7f97" order={order + 2} opacity={opacity} />
      {/* 根拠の区画 */}
      <G z={z(240)}>
        <RRect w={540} h={250} r={8} color={miss > 0.02 ? C.amber : '#5f7f97'} border={3} order={order + 2} opacity={opacity} />
        {inner > 0 && (
          <G y={-300 * fall} rz={-25 * fall}>
            <Disc r={44} x={-160} y={20} color="#3d6f8f" order={order + 3} opacity={opacity * (1 - fall) * inner} />
            <Seg x1={-90} y1={30} x2={200} y2={-40} w={10} color="#3d6f8f" order={order + 3} opacity={opacity * (1 - fall) * inner} />
            <RRect w={300} h={10} r={5} x={40} y={-80} color="#9db4c4" order={order + 3} opacity={opacity * (1 - fall) * inner} />
          </G>
        )}
        {label > 0 && <Txt text="根拠が欠ける" size={46} weight={800} color={C.amber} order={order + 4} opacity={opacity * label} />}
      </G>
      {/* 見出しから結論へ根拠を結ぶ線（根拠の区画で切れる） */}
      <Seg x1={-300} y1={282} x2={-300} y2={125} w={6} color={C.paperInk} z={z(180)} order={order + 1} opacity={opacity} />
      <Seg x1={-300} y1={-125} x2={-300} y2={-282} w={6} color={C.paperInk} z={z(60)} order={order + 1} opacity={opacity} />
      <Seg x1={-300} y1={125} x2={-300} y2={-125} w={6} color={C.paperInk} z={z(240)} order={order + 1} opacity={opacity * (1 - clamp(miss * 1.5))} />
      <RRect w={540} h={64} r={6} y={-300} z={z(60)} color={C.paperInk} order={order + 2} opacity={opacity} />
    </>
  );
};
// 画面固定の帯
const Band: React.FC<{x: number; y?: number; rz: number; w: number; h: number; color: string; order?: number; opacity?: number}> = ({x, y = 0, rz, w, h, color, order = 70, opacity = 1}) => <RRect w={w} h={h} r={0} x={x} y={y} rz={rz} color={color} order={order} opacity={opacity} />;
// 拡がる輪
function ripple(t: number, at: number, life: number, x: number, y: number, r0: number, grow: number, color: string, order = 48, width = 4) {
  const age = t - at;
  if (age < 0 || age > life) return null;
  const k = age / life;
  return <Ring key={`rp${at.toFixed(2)}`} x={x} y={y} r={r0 + grow * ease.out(k)} width={width * (1 - 0.6 * k)} color={color} opacity={0.85 * (1 - k)} order={order} />;
}

// =====================================================================
// CUT 1  0–8秒  AIで作る時間は減ったのに、／見ることに追われる。
// =====================================================================
function cut1(t: number): StageSpec {
  const cam = add(camBase(t, 1, 18), {
    x: seg(t, [[0, -120], [8, 160]], (k) => k),
    roll: seg(t, [[0, -5], [4.1, 4], [8, -3]]),
    zoom: seg(t, [[0, 1.0], [7.3, 1.16], [8, 1.55]], (k) => k * k),
  });
  const rev = smooth(prog(t, 3.9, 4.6)); // 「作る」と「見る」の大きさ・前後の逆転
  const lineK = ease.out(prog(t, 0.35, 3.4));
  const balls: React.ReactNode[] = [];
  for (let i = 0; i < 16; i++) {
    const ti = 0.55 + i * 0.42;
    const u = t - ti;
    if (u < 0 || u > 3.2) continue;
    const x = -840 + 620 * u + 90 * u * u;
    if (x > 1300) continue;
    const zz = lerp(-700, 280, clamp(u / 2.6));
    balls.push(<Ball key={i} x={x} y={150 + 26 * Math.sin(u * 4 + i)} z={zz} r={22} opacity={clamp(u * 5)} order={22} />);
  }
  const big = prog(t, 7.25, 8.0);
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 2),
    world: (
      <>
        <Grid t={t} />
        <G x={-600} y={330} z={lerp(0, -1300, rev)} sx={ease.outBack(prog(t, 0.15, 0.7), 1.5)} rz={lerp(-4, -12, rev) + 3 * wobble(t, 5, 3)}>
          <Txt text="作る" size={260} weight={900} color={C.cyan} align="left" opacity={lerp(1, 0.55, rev)} order={18} />
        </G>
        <Seg x1={-900} y1={150} x2={1100} y2={150} w={6} color={C.cyan} k={lineK} opacity={0.85} order={16} />
        {balls}
        <G x={lerp(340, 300, rev) + 40 * wobble(t, 6, 4)} y={lerp(-60, -130, rev)} z={seg(t, [[0.9, -3600], [3.9, -1700], [4.6, 260], [8, 420]], ease.outQuint)} rz={lerp(10, -4, rev)}>
          <Txt text="見る" size={340} weight={900} color={C.text} opacity={clamp((t - 0.9) * 2)} order={30} />
        </G>
        {big > 0 && big < 1 && (
          <>
            <Seg x1={-1400} y1={-40} x2={1700} y2={-40} k={ease.inOut(big)} k0={ease.inOut(big) - 0.35} w={10} color={C.cyan} opacity={0.8} order={40} />
            <Ball x={lerp(-1400, 1700, ease.inOut(big))} y={-40} r={70} order={42} />
          </>
        )}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['AIで作る時間は、減ったのに、'], 76, TX, -300, 0.45, 4.2, {inStyle: 'flip', outStyle: 'sink', seed: 11, extra: drift(26, 0, 0.45)})} />
        <KLine {...L(['見ることに', '追われる。'], 112, TX, -170, 4.25, 7.75, {inStyle: 'slam', outStyle: 'fly', seed: 12, extra: (c) => ({x: 14 * Math.sin(c.t * 9 + c.i) * clamp(c.t - 5.6), y: 0})})} />
      </>
    ),
  };
}

// =====================================================================
// CUT 2  8–15秒  見た目は整っている。／中身が伴わない。／ワークスロップ
// =====================================================================
const DOC2 = {x: 380, y: 0};
function cut2(t: number): StageSpec {
  const dive = prog(t, 14.35, 15.0);
  const cam = add(camBase(t, 3, 16), {
    x: seg(t, [[8, -260], [8.9, 0], [14.3, 60], [15, DOC2.x]], ease.outQuint),
    y: seg(t, [[14.3, 0], [15, DOC2.y + 30]]),
    roll: seg(t, [[8, -6], [10.5, 3], [13, -2.5], [15, 0]]),
    zoom: seg(t, [[8, 1.25], [8.9, 1.0], [14.35, 1.06], [15, 3.2]], (k) => (t > 14.3 ? ease.in(k) : ease.outQuint(k))),
  });
  const miss = prog(t, 10.9, 11.6);
  const sep = 1.4 * smooth(prog(t, 9.4, 10.6)) * (1 - 0.6 * smooth(prog(t, 12.8, 14.2)));
  const inBall = prog(t, 8.0, 8.55);
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 4),
    world: (
      <>
        <Grid t={t} />
        <G x={DOC2.x + 20 * wobble(t, 7, 4)} y={DOC2.y} ry={seg(t, [[8, -40], [9.2, -16], [11, -8], [13, 16], [15, 0]])} rx={seg(t, [[8, 10], [11, -6], [15, 0]])} rz={2 * wobble(t, 8, 5)} s={ease.outBack(prog(t, 8.05, 8.6), 1.4) * (1 + 0.04 * Math.sin(t))}>
          <Doc miss={miss} sep={sep} label={clamp((t - 11.3) * 4)} inner={t < 8.5 ? 0 : 1} />
        </G>
        {inBall < 1 && <Ball x={lerp(-1300, DOC2.x - 160, ease.outQuint(inBall))} y={lerp(-40, 20, inBall)} r={lerp(70, 44, inBall)} order={44} />}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['見た目は、', '整っている。'], 96, TX, 330, 8.45, 11.05, {inStyle: 'rise', outStyle: 'sink', seed: 21, extra: drift(18, -6, 8.45)})} />
        <KLine {...L(['中身が、', '伴わない。'], 96, TX, 330, 11.1, 14.9, {inStyle: 'drop', outStyle: 'fly', seed: 22, extra: drift(-14, 4, 11.1, -0.4)})} />
        <KLine {...L(['ワークスロップ'], 150, -760, -170, 12.25, 14.75, {inStyle: 'slam', outStyle: 'burst', seed: 23, color: C.cyan, extra: (c) => ({x: 90 * smooth(prog(c.t, 12.4, 14.7)), s: 1 + 0.06 * Math.sin(c.t * 3 + c.i * 0.4), z: 140})})} />
      </>
    ),
    screen: dive > 0.6 ? <RRect w={1920 * 1.2} h={1080 * 1.2} r={0} color={C.bg} opacity={clamp((dive - 0.6) * 3)} order={80} /> : null,
  };
}

// =====================================================================
// CUT 3  15–30秒  調査の数字（単位・出典とともに）／見た目が正しいほど、検証は重い。
// =====================================================================
type NB = {tin: number; tnext: number; row: [number, number]; label: string; num: string; seed: number};
const NUMS: NB[] = [
  {tin: 15.35, tnext: 19.4, row: [-800, 400], label: '米国のデスクワーカー', num: '1,150人', seed: 31},
  {tin: 19.4, tnext: 23.4, row: [-250, 400], label: '過去1か月に受け取った人', num: '約4割', seed: 32},
  {tin: 23.4, tnext: 26.9, row: [300, 400], label: '1件の手直し', num: '平均約2時間', seed: 33},
];
function numState(b: NB, t: number) {
  const kin = ease.outBack(prog(t, b.tin, b.tin + 0.5), 1.3);
  const kout = ease.inOut(prog(t, b.tnext, b.tnext + 0.55));
  const active = {x: -360 - 60 * Math.max(0, t - b.tin), y: 0, s: 1, op: 1, rz: -2 + 1.5 * wobble(t, b.seed, 3)};
  const enter = {x: 1500, y: 40, s: 1.3, op: 0, rz: 8};
  const back = {x: b.row[0], y: b.row[1], s: 0.36, op: 0.75, rz: 0};
  const a = t < b.tnext ? {x: lerp(enter.x, active.x, kin), y: lerp(enter.y, active.y, kin), s: lerp(enter.s, active.s, kin), op: clamp(prog(t, b.tin, b.tin + 0.15)), rz: lerp(enter.rz, active.rz, kin)} : active;
  const fin = {x: active.x, y: active.y, s: 1, op: 1, rz: active.rz};
  const from = t < b.tnext ? a : {...fin, x: -360 - 60 * (b.tnext - b.tin)};
  return {x: lerp(from.x, back.x, kout), y: lerp(from.y, back.y, kout), s: lerp(from.s, back.s, kout), op: lerp(from.op, back.op, kout), rz: lerp(from.rz, back.rz, kout), z: -500 * kout * (1 - smooth(prog(t, 26.9, 27.6)))};
}
function cut3(t: number): StageSpec {
  const cam = add(camBase(t, 5, 12), {
    x: seg(t, [[15, 0], [30, -80]]) + damped(t, 15.6, 22, 5, 6) + damped(t, 19.7, 22, 5, 6) + damped(t, 23.7, 22, 5, 6),
    roll: seg(t, [[15, 4], [19.4, -3], [23.4, 3], [27, -2], [30, 0]]),
    zoom: seg(t, [[15, 1.0], [27, 1.06], [29.2, 1.12], [30, 1.3]]),
  });
  const frameK = ease.outQuint(prog(t, 15.0, 15.7));
  const heavy = smooth(prog(t, 28.2, 29.6));
  return {
    bg: C.bg,
    cam,
    hud: {...hudMove(t, 6, 30, 18, 1.5), y: hudMove(t, 6).y - 40 * heavy},
    world: (
      <>
        <Grid t={t} />
        {frameK < 1 && <RRect w={lerp(3400, 1200, frameK)} h={lerp(2000, 600, frameK)} r={10} border={4} color={C.cyan} opacity={1 - frameK} order={12} />}
      </>
    ),
    hudNodes: (
      <>
        {NUMS.map((b) => {
          if (t < b.tin - 0.05) return null;
          const st = numState(b, t);
          return (
            <G key={b.num} x={st.x} y={st.y} z={st.z} s={st.s} rz={st.rz}>
              <KLine {...L([b.label], 60, -20, 170, b.tin + 0.15, 31, {inStyle: 'rise', outStyle: 'none', seed: b.seed, color: C.dim})} />
              <KLine {...L([b.num], 230, -20, 80, b.tin, 31, {inStyle: 'flip', outStyle: 'none', seed: b.seed + 5, color: C.cyan, stagger: 0.05, inDur: 0.45, wave: 1.5})} />
              {st.op < 1 ? <RRect w={2400} h={700} r={0} y={-60} color={C.bg} opacity={1 - st.op} order={65} /> : null}
            </G>
          );
        })}
        <G x={120 + 30 * wobble(t, 9, 5)} y={-400}>
          <KLine {...L(['BetterUp・Stanfordの調査／HBRの記事'], 36, 0, 0, 15.8, 29.6, {inStyle: 'rise', outStyle: 'sink', seed: 34, color: C.dim, wave: 0.5})} />
        </G>
        <KLine {...L(['見た目が正しいほど、'], 72, TX, -110, 27.0, 29.6, {inStyle: 'rise', outStyle: 'fly', seed: 35})} />
        <KLine
          {...L(['検証は重い。'], 120, TX, -210, 27.5, 30.05, {
            inStyle: 'drop',
            outStyle: 'none',
            seed: 36,
            emph: hl([0, 3, 5, 1.25, C.cyan]),
            extra: (c) => (c.i >= 3 && c.i < 5 ? {y: -70 * heavy - 6 * Math.sin(c.t * 6), rz: 4 * heavy} : {}),
          })}
        />
      </>
    ),
  };
}

// =====================================================================
// CUT 4  30–42秒  ただ、一歩引くと。／1件のレビュー時間は、以前とさほど変わらない。／品質の問題 ／ 球持ちの問題
// =====================================================================
function cut4(t: number): StageSpec {
  const back = ease.inOut(prog(t, 30.0, 31.3));
  const split = ease.outBack(prog(t, 37.0, 37.9), 1.2);
  const push = ease.in(prog(t, 41.2, 42.0));
  const cam = add(camBase(t, 7, 14), {
    x: lerp(0, -400, push) + 40 * Math.sin((t - 37) * 0.9) * clamp(t - 37),
    y: lerp(0, -40, push),
    roll: seg(t, [[30, 0], [31.3, -6], [34, 3], [37, -2], [38.5, 4], [40, -3], [41.2, 2], [42, 0]]),
    zoom: lerp(seg(t, [[30, 1.3], [31.3, 0.86], [37, 0.94], [38.2, 1.08], [39.6, 0.92], [41.2, 1.0]]), 2.8, push),
  });
  const pw = 640;
  const ph = 400;
  const swing = 2.2 * Math.sin((t - 37.9) * 1.6) * clamp((t - 37.9) * 2);
  const orbit = (t - 37.9) * clamp((t - 37.9) * 2);
  return {
    bg: C.bg,
    cam,
    hud: (() => {
      const h = hudMove(t, 8);
      return {x: h.x + lerp(0, -260, back), y: h.y + lerp(-40, 330, back), roll: h.roll + lerp(0, 5, back) * (1 - prog(t, 33, 34)), s: h.s * lerp(1, 0.78, back)};
    })(),
    world: (
      <>
        <Grid t={t} />
        {t > 36.9 && (
          <>
            <Zone x={lerp(0, -390, split) + 40 * Math.sin(orbit * 1.2)} y={-190 + 50 * Math.cos(orbit * 1.2)} w={pw} h={ph} ry={lerp(30, 0, split) + 8 * swing} rz={-2 * swing} color={C.cyan} fill={C.panel2} label="品質の問題" labelSize={84} opacity={clamp((t - 36.9) * 4)} order={20} />
            <Zone x={lerp(0, 390, split) - 40 * Math.sin(orbit * 1.2)} y={-190 - 50 * Math.cos(orbit * 1.2)} w={pw} h={ph} ry={lerp(-30, 0, split) - 8 * swing} rz={2 * swing} color={C.amber} fill="#2a2416" label="球持ちの問題" labelSize={84} opacity={clamp((t - 36.9) * 4) * (1 - push)} order={20} />
          </>
        )}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['検証は重い。'], 120, TX, -210, 29.95, 31.6, {inStyle: 'rise', inDur: 0.01, outStyle: 'fly', seed: 36, emph: hl([0, 3, 5, 1.25, C.cyan]), extra: (c) => (c.i >= 3 && c.i < 5 ? {y: -70 * (1 - back)} : {})})} />
        <KLine {...L(['ただ、一歩引くと。'], 150, TX, 160, 30.35, 33.4, {inStyle: 'spin', outStyle: 'sink', seed: 41, extra: (c) => ({x: lerp(900, 0, ease.outQuint(prog(c.t, 30.35, 31.0))) + 70 * (c.t - 31), rz: -2 * (c.t - 31), s: 1 + 0.05 * Math.sin(c.t * 2.2)})})} />
      </>
    ),
    screen: (
      <G x={140 * Math.sin((t - 33.2) * 0.9)} y={-40 * Math.sin((t - 33.2) * 1.3)} rz={-4 * Math.sin((t - 33.2) * 0.8) - 1.5 * wobble(t, 9, 4)} s={1 + 0.1 * Math.sin((t - 33.2) * 1.1) + 0.02 * beatEnv(t, 7)}>
        <KLine {...L(['1件のレビュー時間は、', '以前とさほど変わらない。'], 84, TX + 40, 300, 33.25, 36.95, {inStyle: 'flip', outStyle: 'fly', seed: 42, color: C.cyan, extra: drift(30, -10, 33.25, 0.2)})} />
      </G>
    ),
  };
}

// =====================================================================
// CUT 5  42–55秒  一つ目は、作る側の品質。／正しいプロセスを通っていない。／課題を置く場所は、制作側。
// =====================================================================
const ZONE5 = {x: -560, y: -170, w: 420, h: 420};
function cut5(t: number): StageSpec {
  const out = ease.outQuint(prog(t, 42.4, 44.4)); // 区画から出る
  const back = ease.inOut(prog(t, 49.2, 51.8)); // 区画へ引き戻す
  const ravel = ease.inOut(prog(t, 54.2, 55.0));
  const dx = lerp(lerp(ZONE5.x, 330, out), ZONE5.x, back);
  const dy = lerp(lerp(ZONE5.y, -60, out), ZONE5.y, back);
  const ds = lerp(lerp(0.3, 0.72, out), 0.42, back);
  const cam = add(camBase(t, 9, 16), {
    x: seg(t, [[42, -300], [43, 0], [49, 60], [52, -160], [55, -60]]),
    roll: seg(t, [[42, 0], [44, 4], [48, -3], [52, 3], [55, 0]]),
    zoom: seg(t, [[42, 1.7], [43, 1.0], [49, 1.05], [52, 1.12], [55, 1.0]], ease.outQuint),
  });
  const att = prog(t, 47.0, 48.6);
  const miss = [dx + 0 * ds, dy + 0 * ds] as const;
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 10),
    world: (
      <>
        <Grid t={t} />
        <Zone x={ZONE5.x} y={ZONE5.y} w={ZONE5.w} h={ZONE5.h} color={C.cyan} label="制作" labelSize={56} labelPos="tl" opacity={1 - ravel} rz={1.5 * wobble(t, 11, 4)} order={12} />
        <G x={dx} y={dy} s={ds * (1 + 0.03 * beatEnv(t, 6))} ry={lerp(-200, 0, out) + 14 * Math.sin(t * 0.9) * (1 - back) + 360 * back} rz={lerp(0, 8, out) - 6 * back + 2 * wobble(t, 12, 3)}>
          <Doc miss={1} label={1} opacity={1 - ravel} />
        </G>
        {att > 0 && (
          <Seg x1={miss[0] - 0.27 * 640 * ds} y1={miss[1]} x2={ZONE5.x + ZONE5.w / 2 - 20} y2={ZONE5.y + 40} w={6} color={C.amber} k={ease.out(att)} head={30} opacity={(1 - back) * (1 - ravel)} order={44} />
        )}
        {ravel > 0 && (
          <>
            <Seg x1={-1300} y1={-120} x2={1300} y2={-120} k={ravel} w={8} color={C.cyan} order={40} />
            <Seg x1={1300} y1={-260} x2={-1300} y2={-260} k={ravel} w={8} color={C.cyan} order={40} />
          </>
        )}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['一つ目は、', '作る側の品質。'], 92, TX, TOP, 42.3, 46.2, {inStyle: 'flip', outStyle: 'fly', seed: 51, emph: hl([1, 4, 6, 1.25, C.cyan]), extra: drift(20, -8, 42.3)})} />
        <KLine {...L(['正しいプロセスを', '通っていない。'], 92, -40, TOP, 46.2, 50.1, {inStyle: 'rise', outStyle: 'sink', seed: 52, extra: drift(-24, -4, 46.2, -0.3)})} />
        <KLine {...L(['課題を置く場所は、', '制作側。'], 84, -40, TOP, 50.2, 54.7, {inStyle: 'drop', outStyle: 'burst', seed: 53, emph: hl([1, 0, 3, 2.0, C.cyan]), extra: (c) => (c.i >= 9 ? {z: 160 * smooth(prog(c.t, 51, 52.5)), x: -40 * smooth(prog(c.t, 51, 52.5))} : {})})} />
      </>
    ),
  };
}

// =====================================================================
// CUT 6  55–60秒  もう一つは、球持ち。／今、ボールを持っているのは誰か。
// =====================================================================
const BELT_ANGLE = -18; // カット7の搬送ベルトの斜め方向（画面上）
function cut6(t: number): StageSpec {
  const flip = ease.inOut(prog(t, 57.3, 59.3));
  const merge = ease.in(prog(t, 59.35, 60.0));
  const cam = add(camBase(t, 13, 14), {
    roll: seg(t, [[55, 0], [56.5, -3], [57.3, 2]]) + lerp(0, -6, flip),
    zoom: seg(t, [[55, 0.9], [55.6, 1.0], [59.3, 1.06], [60, 1.25]], ease.out),
  });
  const per = 1.6;
  const ph = ((t - 55.1) / per) % 1;
  const bx = lerp(-370, 370, ease.inOut(clamp(ph * 1.15)));
  const gather = ease.outQuint(prog(t, 55.0, 55.7));
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 14),
    world: (
      <>
        <Grid t={t} />
        <G rz={lerp(0, BELT_ANGLE, flip) + 14 * Math.sin(Math.PI * flip)} y={-150 + 90 * Math.sin(Math.PI * flip)} sx={lerp(1, 0.9, flip) * (1 - 0.55 * Math.sin(Math.PI * prog(t, 57.3, 58.5)))} sy={lerp(1, 0.9, flip) * (1 + 0.25 * Math.sin(Math.PI * prog(t, 57.3, 58.5)))}>
          <Zone x={lerp(-560, -540, gather)} y={lerp(30, 0, gather)} w={380} h={130} color={C.cyan} label="制作" labelSize={60} opacity={1 - merge} order={14} />
          <Zone x={560} y={0} w={380} h={130} color={C.cyan} label="レビュー" labelSize={60} opacity={1 - merge} order={14} />
          <Seg x1={-350} y1={0} x2={350} y2={0} w={6} color={C.cyan} head={24} k={ease.out(prog(t, 55.2, 55.8))} opacity={1 - merge} order={16} />
          {t > 55.2 && <Ball x={bx} y={0} r={28} opacity={1 - merge} order={22} />}
        </G>
        {merge > 0 && <Seg x1={-1400} y1={-1400 * Math.tan(BELT_ANGLE * DEG) * -1 - 120} x2={1400} y2={1400 * Math.tan(BELT_ANGLE * DEG) - 120} k={merge} w={10} color={C.cyan} order={46} />}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['もう一つは、球持ち。'], 96, TX, TOP, 55.25, 57.4, {inStyle: 'flip', outStyle: 'fly', seed: 61, emph: hl([0, 6, 9, 1.4, C.amber]), extra: drift(40, 0, 55.25)})} />
        <KLine {...L(['今、ボールを持っているのは', '誰か。'], 96, TX, TOP, 57.35, 59.9, {inStyle: 'slam', outStyle: 'fly', seed: 62, emph: hl([1, 0, 2, 2.0, C.cyan]), extra: (c) => ({x: 80 * smooth(prog(c.t, 57.6, 59.6)) * (c.i / 15)})})} />
      </>
    ),
    screen: <>{t > 58.9 && <Pin label="以前" x={720} y={430} size={44} s={ease.outBack(prog(t, 58.9, 59.3), 2)} />}</>,
  };
}

// =====================================================================
// CUT 7  60–71秒  以前は、制作側がボールを持っていた。／制作中は、別の仕事ができた。／届いたら、確認して返す。
// 素材 07_before.mp4 を全尺・等速
// =====================================================================
const CLIP_W = 2112; // 全画面の素材（カメラのロールで端が出ないよう 1.1 倍）
const REVIEW_HITS = (t0: number, dur: number) => {
  const out: number[] = [];
  for (let k = 0; t0 + 0.2 + 1.5 * k < t0 + dur; k++) out.push(t0 + 0.2 + 1.5 * k);
  return out;
};
// 搬送ベルトの起点（球が現れる位置）。素材のコマから測った正規化座標
const SPAWN07: [number, number, number][] = [
  [0, 0.146, 0.362],
  [4.5, 0.145, 0.342],
  [7.5, 0.148, 0.321],
  [10.5, 0.151, 0.291],
  [11, 0.151, 0.287],
];
function spawn07(u: number): [number, number] {
  const nx = seg(u, SPAWN07.map(([a, x]) => [a, x]), (k) => k);
  const ny = seg(u, SPAWN07.map(([a, , y]) => [a, y]), (k) => k);
  return [(nx - 0.5) * CLIP_W, (0.5 - ny) * ((CLIP_W * 9) / 16)];
}
function reviewLabel(id: '07_before' | '08_backlog', f: number, t: number, t0: number, dur: number, opacity = 1) {
  const [rx, ry, vis] = anchorLocal(id, 'REVIEW / header', f, CLIP_W);
  if (!vis) return null;
  return (
    <>
      <Pin label="レビュー" x={rx} y={ry} tx={rx + 40} ty={ry + 120} size={34} opacity={opacity} />
      {REVIEW_HITS(t0, dur).map((h) => ripple(t, h, 0.7, rx, ry, 18, 90, C.cyan))}
    </>
  );
}
function cut7(t: number): StageSpec {
  const u = t - 60;
  const f = u * 30;
  const toGate = ease.in(prog(t, 70.55, 71.0));
  const [gx, gy] = anchorLocal('07_before', 'REVIEW / header', f, CLIP_W);
  const cam = add(camBase(t, 15, 10), {
    x: lerp(0, gx * 0.75, toGate),
    y: lerp(0, gy * 0.75, toGate),
    roll: seg(t, [[60, -1.5], [65, 1.2], [70.5, -1]]),
    zoom: lerp(seg(t, [[60, 1.0], [70.5, 1.04]], (k) => k), 1.45, toGate),
  });
  const [sx, sy] = spawn07(u);
  const ret = ease.inOut(prog(t, 68.4, 70.0));
  const swap = prog(t, 70.6, 71.0);
  return {
    bg: C.bg,
    cam,
    hud: (() => {
      const h = hudMove(t, 16, 40, 24, 2.2);
      return {...h, y: h.y + 6 * beatEnv(t, 8)};
    })(),
    world: (
      <>
        <ClipPlane id="07_before" f={f} w={CLIP_W} order={2} />
        <Pin label="制作" x={sx} y={sy} tx={sx + 10} ty={sy - 120} size={34} opacity={clamp(u * 3)} />
        {reviewLabel('07_before', f, t, 60, 11, clamp(u * 3))}
        {ret > 0 && <Seg x1={gx + 40} y1={gy - 330} x2={sx + 160} y2={sy - 210} w={4} color={C.ice} k={ret} head={28} opacity={0.95 * (1 - toGate)} order={44} />}
        {u < 0.35 && <Seg x1={-1400} y1={1400 * Math.tan(-BELT_ANGLE * DEG) - 120} x2={1400} y2={1400 * Math.tan(BELT_ANGLE * DEG) - 120} w={10} color={C.cyan} opacity={1 - u / 0.35} order={46} />}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['以前は、', '制作側がボールを持っていた。'], 80, TX, TOP, 60.25, 64.2, {inStyle: 'flip', outStyle: 'fly', seed: 71, emph: hl([1, 0, 3, 1.2, C.cyan]), extra: drift(46, -14, 60.25, -0.25)})} />
        <KLine {...L(['制作中は、', '別の仕事ができた。'], 92, TX, TOP, 64.2, 68.25, {inStyle: 'drop', outStyle: 'sink', seed: 72, extra: (c) => ({...drift(30, -10, 64.2)(c), s: 1 + 0.05 * Math.sin((c.t - 64.2) * 1.4)})})} />
        <KLine {...L(['届いたら、', '確認して返す。'], 92, TX, TOP, 68.3, 70.95, {inStyle: 'rise', outStyle: 'fly', seed: 73, emph: hl([1, 4, 6, 1.35, C.cyan]), extra: drift(-36, -6, 68.3)})} />
      </>
    ),
    screen: (
      <>
        <Shade w={2400} h={460} y={330} opacity={0.85} order={40} />
        <Pin label="以前" x={720} y={430} size={44} rz={swap * 90} opacity={1 - swap} s={1 + 0.06 * beatEnv(t, 6)} />
        {swap > 0.4 && <Pin label="現在" x={720} y={430} size={44} s={ease.outBack(prog(t, 70.8, 71.0), 2.5) * 1.25} />}
      </>
    ),
  };
}

// =====================================================================
// CUT 8  71–87秒  制作は速くなった。／見る速度は、変わらない。／ボールが、見る側へ積もる。
// 素材 08_backlog.mp4 を全尺・等速（最後の3秒はレンズの引きをそのまま）
// =====================================================================
function cut8(t: number): StageSpec {
  const u = t - 71;
  const f = u * 30;
  const arrive = ease.outQuint(prog(t, 71.0, 71.55));
  // 冒頭はゲートの柱（素材の右端）へ寄った位置から引き、カット7の末尾の寄りとつなぐ
  const gx = 0.4 * CLIP_W;
  const gy = 0.12 * ((CLIP_W * 9) / 16);
  const cam = add(camBase(t, 17, 8), {
    x: lerp(gx * 0.75, 0, arrive),
    y: lerp(gy * 0.75, 0, arrive),
    roll: seg(t, [[71, 2], [76, -1.2], [81, 1], [84, 0], [87, 0]]) * (1 - prog(t, 86, 87)),
    zoom: lerp(1.35, seg(t, [[71.5, 1.0], [84, 1.03], [86.6, 1.0]]), arrive),
  });
  const reviewHits = REVIEW_HITS(71, 16);
  const tick = reviewHits.reduce((a, h) => a + pulse(t, h, 7), 0);
  const press = (c: {t: number; i: number; n: number}) => ({x: -320 * Math.pow(1 - ease.outQuint(prog(c.t, 71.4 + c.i * 0.05, 72.0 + c.i * 0.05)), 1) + 10 * Math.sin(c.t * 10 + c.i), y: 0});
  return {
    bg: C.bg,
    cam: {...cam, roll: cam.roll + (t > 86.9 ? 0 : 0)},
    hud: (() => {
      const h = hudMove(t, 18, 40, 24, 2.0);
      return {x: h.x + seg(t, [[71, 0], [76, 40], [81, -30], [84, 60], [87, 0]]), y: h.y + seg(t, [[81, 0], [84, -10], [86.5, 20]]), roll: h.roll + seg(t, [[71, -2], [76, 2], [81, -1.5], [86, 1.5], [87, 0]]), s: h.s * seg(t, [[71, 1], [76, 1.06], [81, 0.96], [84, 1.12], [87, 1.0]])};
    })(),
    world: (
      <>
        <ClipPlane id="08_backlog" f={f} w={CLIP_W} order={2} />
        {reviewLabel('08_backlog', f, t, 71, 16)}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['制作は、', '速くなった。'], 104, TX, TOP, 71.35, 76.05, {inStyle: 'rise', outStyle: 'fly', seed: 81, stagger: 0.05, emph: hl([1, 0, 2, 1.25, C.cyan]), extra: (c) => ({...press(c), ...{x: press(c).x + 34 * (c.t - 71.4)}})})} />
        <KLine {...L(['見る速度は、', '変わらない。'], 96, TX, TOP, 76.1, 81.0, {inStyle: 'flip', outStyle: 'sink', seed: 82, extra: () => ({s: 1 + 0.12 * tick})})} />
        <KLine {...L(['ボールが、', '見る側へ積もる。'], 104, TX, TOP, 81.05, 86.95, {inStyle: 'drop', outStyle: 'none', seed: 83, stagger: 0.06, emph: hl([1, 4, 7, 1.35, C.cyan]), extra: (c) => ({y: c.i >= 10 ? -8 * Math.abs(Math.sin((c.t - 81) * 2.4 + c.i)) : 0, x: 40 * smooth(prog(c.t, 84, 86.9))})})} />
      </>
    ),
    screen: (
      <>
        <Shade w={2400} h={460} y={330} opacity={0.85} order={40} />
        <Pin label="現在" x={720} y={430} size={44} s={1.25 * (1 + 0.06 * beatEnv(t, 6))} opacity={1 - prog(t, 86.5, 87)} />
      </>
    ),
  };
}

// =====================================================================
// CUT 9  87–100秒  変わったのはレビュー時間じゃない、「球持ち」だ。／作れる量が増え、負担が見る側へ寄った。／これは、物量の問題。
// 8 の末尾画像を動く映像窓として使う
// =====================================================================
function cut9(t: number): StageSpec {
  const shrink = ease.inOut(prog(t, 87.05, 88.2));
  const lift = ease.inOut(prog(t, 95.0, 96.2));
  const split = ease.in(prog(t, 99.3, 100.0));
  const cam = add(camBase(t, 19, 14), {
    x: seg(t, [[87, 0], [88.2, 0], [93, 40], [96.5, -40], [100, 80]]),
    roll: seg(t, [[87, 0], [88.2, -3], [93, 3], [96.5, -2], [100, 1]]),
    zoom: seg(t, [[88, 1.0], [96.5, 1.05], [99.4, 0.98], [100, 1.1]]),
  });
  const pw = lerp(CLIP_W, lerp(860, 560, lift), shrink);
  const px = lerp(0, lerp(440, 560, lift) + 30 * wobble(t, 20, 5), shrink);
  const py = lerp(0, lerp(-30, 250, lift), shrink);
  const flowK = ease.out(prog(t, 93.6, 94.8));
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 20),
    world: (
      <>
        <Grid t={t} opacity={shrink} />
        <G x={px} y={py} rz={lerp(0, -4 + 5 * smooth(prog(t, 90, 97)), shrink)} ry={lerp(0, -10, shrink) * (1 - lift)}>
          <StillPlane name="08_backlog-end" w={pw} order={4} opacity={1 - split} />
          <RRect w={pw + 8} h={(pw * 9) / 16 + 8} r={6} border={4} color={C.cyan} opacity={shrink * (1 - split)} order={5} />
        </G>
        {t > 93.4 && (
          <G y={-300 + 12 * wobble(t, 21, 3)} x={60} rz={-2 * wobble(t, 22, 4)}>
            <Zone x={-300} y={0} w={400} h={130} color={C.cyan} label="つくる量" labelSize={58} opacity={clamp((t - 93.4) * 4) * (1 - split)} s={ease.outBack(prog(t, 93.4, 93.8), 2)} order={20} />
            <Seg x1={-80} y1={0} x2={lerp(260, 1400, split)} y2={0} w={6} color={C.cyan} k={flowK} head={split > 0 ? 0 : 26} order={22} />
            <Zone x={480} y={0} w={460} h={130} color={C.cyan} label="見る側の負担" labelSize={58} opacity={clamp((t - 94.6) * 4) * (1 - split)} s={ease.outBack(prog(t, 94.6, 95.0), 2) * (1 + 0.06 * beatEnv(t, 6))} order={20} />
            {split > 0 && (
              <>
                <Card x={lerp(1300, 520, split)} y={lerp(0, 120, split)} s={0.9} opacity={split} />
                <Card x={lerp(1300, 700, split)} y={lerp(0, -120, split)} s={0.9} opacity={split} />
              </>
            )}
          </G>
        )}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['変わったのは', 'レビュー時間じゃない、'], 80, TX, TOP, 87.4, 90.5, {inStyle: 'flip', outStyle: 'sink', seed: 91, extra: drift(20, -10, 87.4)})} />
        <KLine {...L(['「球持ち」だ。'], 170, TX, 210, 89.9, 93.25, {inStyle: 'slam', outStyle: 'fly', seed: 92, emph: hl([0, 1, 4, 1.2, C.cyan]), extra: (c) => ({x: 60 * smooth(prog(c.t, 90.2, 93.2)), rz: -3 * smooth(prog(c.t, 90.2, 93.2))})})} />
        <KLine {...L(['作れる量が増え、', '負担が見る側へ寄った。'], 84, TX, TOP, 93.0, 96.65, {inStyle: 'rise', outStyle: 'fly', seed: 93, extra: (c) => ({x: c.li === 1 ? 120 * smooth(prog(c.t, 94.4, 96)) : 0})})} />
        <KLine {...L(['これは、', '物量の問題。'], 110, TX, 290, 96.6, 99.9, {inStyle: 'drop', outStyle: 'burst', seed: 94, emph: hl([1, 0, 2, 1.7, C.cyan]), extra: (c) => (c.li === 1 && c.i < 6 ? {z: 120 * smooth(prog(c.t, 97.2, 98.5)), s: 1 + 0.08 * beatEnv(c.t, 6)} : {})})} />
      </>
    ),
  };
}

// =====================================================================
// CUT 10  100–113秒  人は、制作側に多く置かれてきた。／これからは、見る側の比重を上げる。／QAの役割へ。エンジニアが担ってもいい。
// =====================================================================
function cut10(t: number): StageSpec {
  const shift = ease.inOut(prog(t, 104.6, 108.0));
  const wp = lerp(1080, 620, shift);
  const wq = lerp(300, 880, shift);
  const left = -880;
  const pcx = left + wp / 2;
  const qcx = left + wp + 40 + wq / 2;
  const zy = -110;
  const zh = 440;
  const turn = ease.in(prog(t, 112.2, 113.0));
  const cam = add(camBase(t, 23, 14), {
    x: seg(t, [[100, -260], [104.6, -160], [108, 40], [113, 110]]),
    roll: seg(t, [[100, 3], [104.6, -2], [108, 3], [113, 0]]) + lerp(0, -14, turn),
    zoom: seg(t, [[100, 0.92], [108, 1.0], [112.2, 1.04], [113, 1.6]], ease.inOut),
  });
  // 5 枚のカード。3 枚が弧を描いて品質保証へ移る
  const cards: React.ReactNode[] = [];
  const pc = [[-1, 1], [0, 1], [1, 1], [-0.5, 0], [0.5, 0]];
  for (let i = 0; i < 5; i++) {
    const hx = pcx - 120 + pc[i][0] * 150;
    const hy = zy + 10 + (pc[i][1] - 0.5) * 150;
    const moving = i < 3;
    const k = moving ? ease.inOut(prog(t, 105.0 + i * 0.6, 106.6 + i * 0.6)) : 0;
    const tx = qcx - 180 + i * 150;
    const ty = zy - 20;
    const arcY = Math.sin(k * Math.PI) * 110;
    const x = moving ? lerp(hx, tx, k) : hx;
    const y = moving ? lerp(hy, ty, k) + arcY : hy;
    const pop = ease.outBack(prog(t, 100.4 + i * 0.12, 100.8 + i * 0.12), 2);
    cards.push(<Card key={i} x={x} y={y + 6 * Math.sin(t * 3 + i)} s={pop * (1 + 0.05 * beatEnv(t + i * 0.1, 7))} rz={moving ? 360 * k : 3 * wobble(t, 30 + i, 3)} />);
  }
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 24),
    world: (
      <>
        <Grid t={t} />
        <G rz={lerp(0, 30, turn)} s={lerp(1, 1.3, turn)}>
          <Zone x={pcx} y={zy} w={wp} h={zh} color={C.cyan} label="制作" labelSize={56} labelPos="tl" opacity={1 - turn} order={12} />
          <Zone x={qcx} y={zy} w={wq} h={zh} color={C.amber} fill="#231f14" label="品質保証" labelSize={56} labelPos="tl" opacity={1} order={12} />
          {cards}
          {[0, 1, 2].map((i) => {
            const ph = ((t - 100 + i * 1.1) / 3.3) % 1;
            return <Ball key={i} x={pcx - wp / 2 + 60 + ph * (wp - 120)} y={zy - zh / 2 + 50} r={18} opacity={(1 - turn) * Math.sin(ph * Math.PI)} order={22} />;
          })}
          <Txt text="角丸カード＝担う人・役割 ／ 青い球＝成果物" size={30} weight={600} color={C.dim} align="left" x={-860} y={zy - zh / 2 - 50} opacity={clamp((t - 101) * 2) * (1 - turn)} order={20} />
        </G>
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['人は、制作側に', '多く置かれてきた。'], 84, TX, TOP, 100.3, 104.45, {inStyle: 'flip', outStyle: 'fly', seed: 101, extra: drift(24, -6, 100.3)})} />
        <KLine {...L(['これからは、', '見る側の比重を上げる。'], 84, TX + 120, TOP, 104.45, 108.6, {inStyle: 'rise', outStyle: 'fly', seed: 102, emph: hl([1, 0, 3, 1.25, C.amber]), extra: drift(60, -6, 104.45, -0.3)})} />
        <KLine {...L(['QAの役割へ。', 'エンジニアが担ってもいい。'], 84, TX + 380, TOP, 108.65, 112.8, {inStyle: 'drop', outStyle: 'burst', seed: 103, emph: hl([0, 0, 2, 1.35, C.amber]), extra: drift(30, -4, 108.65)})} />
      </>
    ),
  };
}

// =====================================================================
// CUT 11  113–128秒  なぜ、レビューするのか。／「ルールだから」では、ゼロ点。／背景が分からなければ、変える議論ができない。
// =====================================================================
const RULE = L(['「ルールだから」'], 120, -470, 70, 113.05, 120.6, {inStyle: 'rise', inDur: 0.2, outStyle: 'burst', outDur: 0.5, seed: 111});
function cut11(t: number): StageSpec {
  const open = ease.inOut(prog(t, 120.6, 121.4));
  const hit = damped(t, 113.95, 26, 5, 5);
  const pull = ease.in(prog(t, 127.3, 128.0));
  const cam = add(camBase(t, 25, 12), {roll: seg(t, [[113, 6], [114, -2], [117, 2], [121, -3], [128, 0]]), zoom: seg(t, [[113, 1.25], [114, 1.0], [128, 1.08]])});
  const purposeX = -680;
  const purposeY = 160;
  // 枠の破片が「目的」を囲む枠へ並び直す
  const frags: React.ReactNode[] = [];
  for (let i = 0; i < 14; i++) {
    const k = ease.inOut(prog(t, 121.2 + i * 0.04, 122.4 + i * 0.04));
    if (t < 120.6) break;
    const a = hash(i * 7.3) * Math.PI * 2;
    const sx = lerp(-460, 460, hash(i * 3.1)) + Math.cos(a) * 600 * ease.out(prog(t, 120.6, 121.2));
    const sy = (hash(i * 5.7) > 0.5 ? 100 : -100) + Math.sin(a) * 400 * ease.out(prog(t, 120.6, 121.2));
    const per = i / 14;
    const bw = 360;
    const bh = 240;
    const pp = per * 2 * (bw + bh);
    const [txx, tyy, rot] = pp < bw ? [-bw / 2 + pp, bh / 2, 0] : pp < bw + bh ? [bw / 2, bh / 2 - (pp - bw), 90] : pp < 2 * bw + bh ? [bw / 2 - (pp - bw - bh), -bh / 2, 0] : [-bw / 2, -bh / 2 + (pp - 2 * bw - bh), 90];
    frags.push(<RRect key={i} w={lerp(70, 80, k)} h={5} r={2} x={lerp(sx, purposeX + 140 + txx, k)} y={lerp(sy, purposeY - 70 + tyy, k)} rz={lerp(hash(i) * 360, rot, k)} color={C.cyan} opacity={0.8} order={30} />);
  }
  return {
    bg: C.bg,
    cam,
    hud: (() => {
      const h = hudMove(t, 26, 30, 20, 1.6);
      return {...h, x: h.x + hit * 0.6, s: h.s * lerp(1, 1.6, pull), roll: h.roll + lerp(0, 8, pull)};
    })(),
    world: <Grid t={t} />,
    hudNodes: (
      <>
        <KLine {...L(['なぜ、レビューするのか。'], 96, TX, TOP, 113.25, 116.95, {inStyle: 'flip', outStyle: 'fly', seed: 112, extra: drift(20, -6, 113.25)})} />
        {/* 枠と中の「ルールだから」 */}
        <G x={hit} rz={hit * 0.08}>
          <RRect w={1100} h={lerp(240, 0, open)} r={14} y={10} color={C.panel2} opacity={1 - open} order={20} />
          <RRect w={1100} h={8} y={lerp(130, 600, open)} color={C.cyan} opacity={1 - open * 0.9} order={21} />
          <RRect w={1100} h={8} y={lerp(-110, -620, open)} color={C.cyan} opacity={1 - open * 0.9} order={21} />
        </G>
        <KLine {...RULE} extra={() => ({x: hit})} />
        <KLine {...L(['なぜ？'], 130, 360, 330, 113.55, 120.4, {inStyle: 'drop', outStyle: 'fly', seed: 113, color: C.amber, extra: (c) => ({x: lerp(1100, 0, ease.outQuint(prog(c.t, 113.55, 113.95))), rz: 4 * Math.sin(c.t * 2)})})} />
        <KLine {...L(['「ルールだから」では、', 'ゼロ点。'], 84, TX, -250, 117.05, 120.95, {inStyle: 'slam', outStyle: 'burst', seed: 114, emph: hl([1, 0, 3, 1.7, C.amber]), extra: drift(16, 0, 117.05)})} />
        {frags}
        <KLine {...L(['目的'], 190, purposeX, purposeY + 50, 121.15, 128.2, {inStyle: 'slam', outStyle: 'none', seed: 115, color: C.cyan, extra: (c) => ({s: 1 + 0.05 * beatEnv(c.t, 6), x: 30 * smooth(prog(c.t, 122, 127))})})} />
        <Seg x1={-280} y1={purposeY - 70} x2={-80} y2={purposeY - 70} w={5} color={C.cyan} head={22} k={ease.out(prog(t, 121.9, 122.4))} order={40} />
        <KLine {...L(['背景を', '理解する。'], 84, -30, purposeY + 20, 122.2, 128.0, {inStyle: 'rise', outStyle: 'fly', seed: 116, extra: drift(14, 0, 122.2)})} />
        <KLine {...L(['背景が分からなければ、', '変える議論ができない。'], 84, TX, -210, 123.6, 127.7, {inStyle: 'flip', outStyle: 'sink', seed: 117, extra: drift(26, 4, 123.6, 0.2)})} />
      </>
    ),
  };
}

// =====================================================================
// CUT 12  128–141秒  レビューは、品質を保証して出すこと。／私の場合、コードをほぼ見ない。／確認できる知識は、持ったまま。／自分で全部触ると、スケールしない。
// =====================================================================
function cut12(t: number): StageSpec {
  const out = ease.in(prog(t, 140.3, 141.0));
  const cam = add(camBase(t, 27, 14), {
    x: seg(t, [[128, -200], [128.8, 0], [132, 0], [138, 120], [141, 260]]),
    roll: seg(t, [[128, -4], [130, 2], [134, -2], [138, 3], [141, 0]]),
    zoom: seg(t, [[128, 1.4], [128.8, 1.0], [132, 1.05], [138.2, 0.9], [141, 0.95]], ease.outQuint),
  });
  const gx0 = 60;
  const gy0 = 260;
  const cw = 120;
  const ch = 76;
  const cells: React.ReactNode[] = [];
  for (let i = 0; i < 35; i++) {
    const c = i % 7;
    const r = Math.floor(i / 7);
    const ta = i < 4 ? 132 + i * 0.12 : i < 14 ? 132.5 + ((i - 4) / 10) * 3.0 : 135.5 + ((i - 14) / 21) * 2.7;
    if (t < ta) continue;
    const pop = ease.outBack(prog(t, ta, ta + 0.3), 2);
    cells.push(<RRect key={i} w={cw} h={ch} r={8} x={gx0 + c * 140} y={gy0 - r * 100} s={pop} color={C.panel2} order={14} />, <RRect key={`b${i}`} w={cw} h={ch} r={8} x={gx0 + c * 140} y={gy0 - r * 100} s={pop} color={C.line} border={2} order={15} />);
  }
  // 個人の手と目の届く枠: カードの間を追いかけるが、増えるほど追いつかない
  const fx = gx0 + 140 * (1.5 + 1.5 * Math.sin((t - 132) * 1.3));
  const fy = gy0 - 100 * (1 + Math.sin((t - 132) * 0.9 + 1));
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 28),
    world: (
      <>
        <Grid t={t} />
        <G x={20 * wobble(t, 29, 4)} rz={-3 + 2 * wobble(t, 30, 5)} s={1 + 0.03 * Math.sin(t)}>
          {t > 131.8 && cells}
          {t > 132.4 && <RRect w={300} h={200} r={14} border={5} x={fx} y={fy} color={C.amber} opacity={clamp((t - 132.4) * 3) * (1 - out)} order={30} />}
          {out > 0 && <Seg x1={gx0 - 60} y1={gy0 + 70} x2={gx0 + 3000} y2={gy0 + 70} w={6} color={C.cyan} k={out} order={40} />}
        </G>
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['レビューは、'], 70, TX, 300, 128.2, 132.0, {inStyle: 'rise', outStyle: 'fly', seed: 121})} />
        <KLine {...L(['品質を保証して', '出すこと。'], 130, TX, 200, 128.45, 132.0, {inStyle: 'slam', outStyle: 'fly', seed: 122, color: C.cyan, emph: hl([0, 3, 5, 1.25, C.text]), extra: (c) => ({z: c.li === 0 && c.ci >= 3 && c.ci < 5 ? 120 * smooth(prog(c.t, 129.3, 130.3)) : 0, x: 30 * (c.t - 128.45)})})} />
        <KLine {...L(['私の場合、', 'コードをほぼ見ない。'], 84, TX, 80, 132.05, 135.6, {inStyle: 'flip', outStyle: 'sink', seed: 123, extra: drift(10, 6, 132.05)})} />
        <KLine {...L(['確認できる知識は、', '持ったまま。'], 84, TX, 80, 135.6, 138.15, {inStyle: 'rise', outStyle: 'fly', seed: 124, emph: hl([1, 0, 6, 1.15, C.cyan]), extra: drift(-14, 4, 135.6)})} />
        <KLine {...L(['自分で全部触ると、', 'スケールしない。'], 84, TX, 80, 138.15, 140.85, {inStyle: 'drop', outStyle: 'burst', seed: 125, emph: hl([1, 0, 7, 1.25, C.amber]), extra: drift(12, -4, 138.15)})} />
        <G x={TX + 10} y={-300}>
          <Pin label="著者の実践" x={110} y={0} size={34} color={C.dim} opacity={clamp((t - 129.6) * 3) * (1 - out)} />
        </G>
      </>
    ),
  };
}

// =====================================================================
// CUT 13  141–157秒  上流の指示と、下流の品質ゲート（素材 13_quality_gates.mp4 を全尺・等速）
// =====================================================================
const PANEL = {x: 370, y: -70, w: 1120};
type PanelT = {x: number; y: number; s: number; rz: number; ry: number};
function panel13(t: number): PanelT {
  return {
    x: PANEL.x + seg(t, [[141, 900], [141.6, 0], [145, -20], [149, 30], [153, 0], [157, -60]], ease.outQuint),
    y: PANEL.y + seg(t, [[141, -60], [141.6, 0], [149, 20], [153, -10], [157, 0]]),
    s: seg(t, [[141, 0.8], [141.6, 1.0], [144.8, 1.0], [145.4, 1.06], [148.5, 1.0], [152.4, 0.97], [156.2, 1.03], [157, 1.0]]),
    rz: seg(t, [[141, 6], [141.6, -1.5], [145, 1.5], [149, -1.5], [153, 1.2], [157, -1]]),
    ry: seg(t, [[141, -20], [141.6, -6], [149, -2], [157, -8]]),
  };
}
const GATE_LABELS: [string, string, number][] = [
  ['SPECIFICATION board', '指示', 141.5],
  ['CHECK 1 / header', 'テスト・VRT', 142.3],
  ['CHECK 2 / header', '型・リンター', 142.9],
  ['CHECK 3 / header', '規約・不要コード', 143.5],
];
function focus13(t: number, i: number) {
  if (t > 144.8 && t < 146.8) return i === 1 ? 1 : 0.4;
  if (t > 146.8 && t < 148.6) return i >= 2 ? 1 : 0.4;
  return 0.9;
}
function cut13(t: number): StageSpec {
  const u = t - 141;
  const f = u * 30;
  const p = panel13(t);
  const cam = add(camBase(t, 31, 10), {roll: seg(t, [[141, -2], [148, 1.5], [157, -1]]), zoom: seg(t, [[141, 1.1], [141.6, 1.0], [157, 1.03]])});
  const ph = (p.s * PANEL.w * 9) / 16;
  const exit = anchorLocal('13_quality_gates', 'CHECK 3 / header', 470, PANEL.w);
  const shoot = ease.in(prog(t, 156.1, 157.0));
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 32, 30, 18, 1.4),
    world: (
      <>
        <Grid t={t} />
        <G x={p.x} y={p.y} s={p.s} rz={p.rz} ry={p.ry}>
          <ClipPlane id="13_quality_gates" f={f} w={PANEL.w} order={4} />
          <RRect w={PANEL.w + 8} h={(PANEL.w * 9) / 16 + 8} r={6} border={4} color={C.line} order={5} />
          {GATE_LABELS.map(([name, label, tin], i) => {
            const [ax, ay, vis] = anchorLocal('13_quality_gates', name, f, PANEL.w);
            if (!vis || t < tin) return null;
            const op = clamp((t - tin) * 4) * focus13(t, i);
            return <Pin key={name} label={label} x={ax} y={ay} tx={ax + (i === 0 ? 10 : 30)} ty={ay + 70} size={i === 0 ? 34 : 30} color={i === 0 ? C.text : C.cyan} opacity={op} s={ease.outBack(prog(t, tin, tin + 0.35), 2) * (focus13(t, i) > 0.95 && t > 144.8 && t < 148.6 ? 1.15 : 1)} />;
          })}
          {shoot > 0 && <Seg x1={exit[0]} y1={exit[1] - 180} x2={exit[0] - 2600} y2={exit[1] - 900} w={lerp(4, 14, shoot)} color={C.cyan} k={shoot} order={48} />}
        </G>
        <RRect w={10} h={ph} r={0} x={-1000} color={C.bg} opacity={0} order={1} />
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['細かい指示 → 制作 → 品質ゲート'], 56, TX, TOP + 10, 141.75, 156.6, {inStyle: 'flip', outStyle: 'fly', seed: 131, wave: 0.6, emph: hl([0, 0, 5, 1, focus13(t, 0) > 0.95 && t > 141.7 && t < 144.8 ? C.amber : C.cyan], [0, 13, 18, 1, t > 144.8 && t < 148.6 ? C.amber : C.cyan])})} />
        <KLine {...L(['先に、', '見なくても', '回る環境を。'], 84, TX, 300, 141.3, 144.8, {inStyle: 'slam', outStyle: 'fly', seed: 132, emph: hl([2, 0, 2, 1.15, C.cyan]), extra: drift(10, -6, 141.3)})} />
        <KLine {...L(['意味のある', 'テスト・VRT'], 74, TX, 300, 144.85, 146.85, {inStyle: 'rise', outStyle: 'sink', seed: 133, emph: hl([1, 0, 7, 1.1, C.cyan]), extra: drift(16, 0, 144.85)})} />
        <KLine {...L(['型・リンター・規約・', '不要コードの確認'], 62, TX, 300, 146.9, 148.6, {inStyle: 'flip', outStyle: 'fly', seed: 134, emph: hl([0, 0, 9, 1, C.cyan], [1, 0, 5, 1, C.cyan]), extra: drift(10, 0, 146.9)})} />
        <KLine {...L(['AIの「大丈夫」', 'だけにしない。'], 76, TX, 300, 148.65, 152.4, {inStyle: 'drop', outStyle: 'burst', seed: 135, emph: hl([0, 3, 8, 1.15, C.amber]), extra: (c) => ({x: 6 * Math.sin(c.t * 7 + c.i) * clamp(c.t - 149.5), y: 0})})} />
        <KLine {...L(['通過した範囲を', '確かめ、', '人が見る所を', '絞る。'], 76, TX, 330, 152.45, 156.95, {inStyle: 'rise', outStyle: 'fly', seed: 136, emph: hl([3, 0, 2, 1.6, C.cyan]), extra: (c) => ({s: c.li === 3 ? 1 + 0.25 * smooth(prog(c.t, 154.8, 155.6)) : 1})})} />
      </>
    ),
  };
}

// =====================================================================
// CUT 14  157–171秒  均一なチェックは、AIへ。／見る観点を渡す。／人の価値は、「こんな場合は？」／お金・個人情報・セキュリティ／後から変えにくいデータモデル
// =====================================================================
const ROOT14: [number, number] = [-80, 60];
const NODES14: {label: string; x: number; y: number; t: number; size: number}[] = [
  {label: 'お金', x: -680, y: -110, t: 165.6, size: 52},
  {label: '個人情報', x: -560, y: -320, t: 165.9, size: 52},
  {label: 'セキュリティ', x: 540, y: -150, t: 166.2, size: 52},
  {label: '後から変えにくいデータモデル', x: 160, y: -390, t: 167.1, size: 52},
];
function cut14(t: number): StageSpec {
  const recede = smooth(prog(t, 163.4, 164.6));
  const enter = ease.outQuint(prog(t, 157.0, 157.7));
  const cam = add(camBase(t, 33, 14), {
    x: seg(t, [[157, -300], [157.7, 0], [164, 40], [171, 200]]),
    roll: seg(t, [[157, -5], [160, 2], [164, -2], [168, 2.5], [171, 0]]),
    zoom: seg(t, [[157, 1.3], [157.7, 1.0], [164, 1.04], [171, 1.1]]),
  });
  const cols = 12;
  const rows = 6;
  const flow = ((t - 157) * 60) % 156;
  const scanX = -900 + (((t - 157.6) / 2.4) % 1) * 1900;
  const scanOn = t > 157.6 && t < 164.2;
  const cells: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = -1; c < cols + 1; c++) {
      const x = -900 + c * 156 - flow + 78;
      const y = 180 - r * 100;
      const lit = scanOn ? clamp(1 - Math.abs(x - scanX) / 160) : 0;
      cells.push(<RRect key={`c${r}_${c}`} w={136} h={80} r={8} x={x} y={y} color={C.panel2} order={10} />, <RRect key={`b${r}_${c}`} w={136} h={80} r={8} x={x} y={y} color={lit > 0.05 ? C.cyan : C.line} border={2 + 2 * lit} order={11} />);
    }
  const dm = NODES14[3];
  const dmFwd = ease.outBack(prog(t, 168.4, 169.0), 1.6);
  const shoot = ease.in(prog(t, 170.3, 171.0));
  return {
    bg: C.bg,
    cam,
    hud: hudMove(t, 34),
    world: (
      <>
        <Grid t={t} />
        <G y={-60} z={lerp(0, -900, recede)} rx={seg(t, [[157, 50], [157.7, 34], [163, 22], [171, 30]])} rz={seg(t, [[157, -12], [164, -4], [171, 6]])} s={enter}>
          {cells.map((c, i) => (
            <React.Fragment key={i}>{c}</React.Fragment>
          ))}
          {scanOn && <RRect w={10} h={720} r={2} x={scanX} y={-70} color={C.cyan} order={20} />}
          {scanOn && t > 159.0 && <Txt text="見る観点を渡す。" size={50} weight={800} color={C.cyan} align="left" x={scanX + 30} y={300} opacity={clamp((t - 159) * 3) * (1 - recede)} order={22} />}
        </G>
        {recede > 0 && <RRect w={4000} h={3000} color={C.bg} opacity={0.55 * recede} order={30} />}
        {t < 157.6 && <Seg x1={-1400} y1={-700} x2={1600} y2={330} w={14} color={C.cyan} k={1} k0={ease.out(prog(t, 157.0, 157.6))} order={50} />}
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['均一なチェックは、AIへ。'], 96, TX, TOP, 157.3, 163.6, {inStyle: 'flip', outStyle: 'fly', seed: 141, emph: hl([0, 9, 11, 1.3, C.cyan]), extra: drift(16, -4, 157.3)})} />
        <KLine {...L(['人の価値は、'], 70, TX, TOP, 163.5, 171.0, {inStyle: 'rise', outStyle: 'fly', seed: 142})} />
        <KLine {...L(['「こんな場合は？」'], 130, TX, TOP - 100, 163.85, 171.0, {inStyle: 'slam', outStyle: 'fly', seed: 143, color: C.amber, extra: (c) => ({rz: 2 * Math.sin(c.t * 2 + c.i * 0.3), x: 20 * smooth(prog(c.t, 165, 170))})})} />
        <Disc r={14 + 4 * beatEnv(t, 6)} x={ROOT14[0]} y={ROOT14[1]} color={C.amber} opacity={clamp((t - 165.2) * 4)} order={50} />
        {NODES14.map((nd, i) => {
          const k = ease.out(prog(t, nd.t - 0.3, nd.t + 0.2));
          const isDm = i === 3;
          const nx = nd.x + 14 * wobble(t, 40 + i, 4);
          const ny = nd.y + 10 * wobble(t, 50 + i, 4);
          return (
            <React.Fragment key={nd.label}>
              <Seg x1={ROOT14[0]} y1={ROOT14[1]} x2={nx} y2={ny + 40} w={4} color={C.amber} k={k} head={20} order={48} />
              {t > nd.t && <Pin label={nd.label} x={nx} y={ny} size={nd.size} color={C.amber} s={ease.outBack(prog(t, nd.t, nd.t + 0.3), 2) * (isDm ? 1 + 0.2 * dmFwd : 1)} order={52 + i * 3} />}
            </React.Fragment>
          );
        })}
        {shoot > 0 && <Seg x1={dm.x + 80} y1={dm.y} x2={dm.x + 1600} y2={dm.y + 300} w={8} color={C.amber} k={shoot} order={60} />}
      </>
    ),
  };
}

// =====================================================================
// CUT 15  171–189.5秒  判断を、次の作り方へ（素材 15_feedback_loop.mp4 の 12 秒＋末尾画像と文字）
// =====================================================================
function cut15(t: number): StageSpec {
  const u = t - 171;
  const f = u * 30;
  const toStill = ease.inOut(prog(t, 183.0, 184.4));
  const sweep = ease.in(prog(t, 188.85, 189.5));
  const cam = add(camBase(t, 35, 12), {
    roll: seg(t, [[171, 3], [175, -1.5], [179.6, 1.5], [183, 0], [186, -4], [189.5, 3]]),
    zoom: seg(t, [[171, 1.25], [171.7, 1.0], [183, 1.03], [189.5, 1.08]], ease.outQuint),
  });
  const px = PANEL.x + seg(t, [[171, -400], [171.7, 0], [179.6, 30], [183, 0]], ease.outQuint) + lerp(0, 230, toStill);
  const py = PANEL.y + lerp(0, -160, toStill) + 14 * wobble(t, 36, 5);
  const pw = lerp(PANEL.w, 600, toStill);
  const prz = seg(t, [[171, -4], [175, 1], [179.6, -1], [183, 0], [186, 5], [189.5, -3]]);
  const [sxA, syA, specVis] = anchorLocal('15_feedback_loop', 'SPECIFICATION', Math.min(f, 359), PANEL.w);
  const [rvx, rvy, revVis] = anchorLocal('15_feedback_loop', 'REVIEW / header', Math.min(f, 359), PANEL.w);
  const toSpec = ease.out(prog(t, 175.6, 177.0));
  return {
    bg: C.bg,
    cam,
    hud: (() => {
      const h = hudMove(t, 36, 34, 20, 1.6);
      return {...h, roll: h.roll + seg(t, [[183, 0], [185, -3], [189, 2]])};
    })(),
    world: (
      <>
        <Grid t={t} />
        <G x={px} y={py} rz={prz} ry={seg(t, [[171, 20], [171.7, -6], [183, -3], [184.4, 0]])} >
          {t < 183.0 ? <ClipPlane id="15_feedback_loop" f={f} w={PANEL.w} order={4} /> : <StillPlane name="15_feedback_loop-end" w={pw} order={4} opacity={1 - sweep} />}
          <RRect w={pw + 8} h={(pw * 9) / 16 + 8} r={6} border={4} color={C.amber} opacity={0.8 * (1 - sweep)} order={5} />
          {t < 183.0 && specVis && <Pin label="指示" x={sxA} y={syA} tx={sxA + 20} ty={syA + 80} size={34} color={C.text} opacity={clamp((t - 172.4) * 4)} />}
          {t < 183.0 && revVis && <Pin label="レビュー" x={rvx} y={rvy} tx={rvx + 30} ty={rvy + 90} size={30} opacity={clamp((t - 171.5) * 4)} />}
        </G>
      </>
    ),
    hudNodes: (
      <>
        <KLine {...L(['AIは、品質を高める道具。'], 64, TX, TOP + 10, 171.2, 182.9, {inStyle: 'flip', outStyle: 'fly', seed: 151, emph: hl([0, 4, 10, 1.15, C.cyan]), extra: (c) => ({x: c.t < 175 ? 0 : 0, s: c.t < 175 ? 1.15 : 1})})} />
        <KLine {...L(['判断を、', '次の', '作り方へ。'], 100, TX, 300, 175.0, 179.65, {inStyle: 'slam', outStyle: 'fly', seed: 152, emph: hl([0, 0, 2, 1.2, C.amber]), extra: drift(12, -4, 175)})} />
        {toSpec > 0 && t < 179.6 && t < 183 && (
          <Poly
            pts={[
              [TX + 260, 220],
              [-160, 220],
              [px + sxA * (1) - 40, py + syA + 40],
            ]}
            w={5}
            color={C.amber}
            k={toSpec}
            head={26}
            order={50}
            opacity={1 - prog(t, 179.2, 179.6)}
          />
        )}
        <KLine {...L(['良いものが出る', 'ラインを、磨く。'], 88, TX, 280, 179.7, 182.9, {inStyle: 'rise', outStyle: 'sink', seed: 153, emph: hl([1, 5, 7, 1.35, C.cyan]), extra: (c) => ({x: c.li === 1 && c.ci >= 5 ? 6 * Math.sin(c.t * 18) * clamp(c.t - 180.6) : 0})})} />
        <KLine {...L(['見る時間を減らすのは、'], 70, TX, 330, 183.0, 189.45, {inStyle: 'flip', outStyle: 'none', seed: 154, extra: (c) => ({x: -900 * sweep * (1 + c.i * 0.02)})})} />
        <KLine {...L(['組織と自分の', '成長。'], 140, TX, 220, 183.45, 189.45, {inStyle: 'slam', outStyle: 'none', seed: 155, color: C.cyan, emph: hl([1, 0, 2, 1.3, C.text]), extra: (c) => ({x: -1200 * sweep * (1 + c.i * 0.03), s: 1 + 0.04 * Math.sin((c.t - 183.4) * 2)})})} />
        <Seg x1={TX} y1={-160} x2={300} y2={-160} w={lerp(6, 40, sweep)} color={C.lime} k={ease.out(prog(t, 184.2, 185.2))} order={58} opacity={0.9} />
        <KLine {...L(['これは一つの実践。やり方は組織ごとに違う。'], 46, TX, -260, 184.7, 189.45, {inStyle: 'rise', outStyle: 'none', seed: 156, color: C.dim, extra: (c) => ({x: -900 * sweep})})} />
      </>
    ),
    screen: sweep > 0 ? <Band x={0} y={lerp(-380, 0, sweep)} rz={0} w={2600} h={lerp(40, 1400, ease.in(sweep))} color={C.lime} order={90} /> : null,
  };
}

// ---- タイムライン ----
export const CUTS: {s: number; e: number; fn: (t: number) => StageSpec}[] = [
  {s: 0, e: 8, fn: cut1},
  {s: 8, e: 15, fn: cut2},
  {s: 15, e: 30, fn: cut3},
  {s: 30, e: 42, fn: cut4},
  {s: 42, e: 55, fn: cut5},
  {s: 55, e: 60, fn: cut6},
  {s: 60, e: 71, fn: cut7},
  {s: 71, e: 87, fn: cut8},
  {s: 87, e: 100, fn: cut9},
  {s: 100, e: 113, fn: cut10},
  {s: 113, e: 128, fn: cut11},
  {s: 128, e: 141, fn: cut12},
  {s: 141, e: 157, fn: cut13},
  {s: 157, e: 171, fn: cut14},
  {s: 171, e: 189.5, fn: cut15},
];

export function specAt(frame: number): StageSpec {
  const t = frame / 30;
  const c = CUTS.find((k) => t < k.e) ?? CUTS[CUTS.length - 1];
  return c.fn(t);
}

// 未使用の警告を避ける（点検用の補助）
export const _unused = {charPos, measure, BEAT};
