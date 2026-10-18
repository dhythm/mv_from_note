// この作品の共通部品: 二人のピクト（静止姿勢・採用動画）、資料、札、吹き出し、破線の枠、会議の場。
// 色の意味は企画書「配色と記号」に従う（青緑=口頭、黄=残す情報・今回の範囲、紫=読み手の問い、破線=不足、灰枠=会議の場）。
import React from 'react';
import {C, clamp, ease, prog} from './lib/anim';
import {Disc, G, RRect, Seg, Txt, measure} from './components/prims';
import {CLIP_FPS, ClipId, ClipPlane, SpriteId, SpritePlane} from './components/stage';

// 人物の標準の高さ（頭頂〜足元、px）
export const FIG = 380;

// ---- 静止姿勢の人物。(x, y) は足元の中央 ----
export const Person: React.FC<{id: SpriteId; x: number; y: number; z?: number; h?: number; opacity?: number; rz?: number; s?: number; order?: number; label?: string}> = ({id, x, y, z = 0, h = FIG, opacity = 1, rz = 0, s = 1, order = 30, label}) => (
  <G x={x} y={y} z={z} rz={rz} s={s}>
    <SpritePlane id={id} h={h} opacity={opacity} order={order} />
    {label && <Txt text={label} size={h * 0.075} weight={700} color={C.sub} y={-h * 0.07} opacity={opacity} order={order + 1} />}
  </G>
);

// ---- 採用動画の二人。staffX/feetY は担当者の頭の中心と足元、h は人物の高さ（静止姿勢と同じ大きさで置ける） ----
// 原本 1280×720 の中で、担当者の頭の中心 x=396、上司 x=876、足元 y=621、人物の高さ約 460px。
export const CLIP_STAFF_X = 396;
export const CLIP_BOSS_X = 876;
export const CLIP_FEET_Y = 621;
export const CLIP_FIG_H = 460;
export function clipGeom(staffX: number, feetY: number, h = FIG) {
  const k = h / CLIP_FIG_H;
  return {k, w: 1280 * k, cx: staffX - (CLIP_STAFF_X - 640) * k, cy: feetY + (CLIP_FEET_Y - 360) * k, bossX: staffX + (CLIP_BOSS_X - CLIP_STAFF_X) * k};
}
// t0 から speed 倍で原本の from 秒以降を再生し、to 秒で止める（最後のコマを保持。ループ・引き伸ばしなし）
export function clipFrame(t: number, t0: number, speed = 1.5, from = 0, to = 6) {
  const src = clamp(from + Math.max(0, t - t0) * speed, from, to);
  return Math.min(src * CLIP_FPS, to * CLIP_FPS - 1);
}
export const Duo: React.FC<{id: ClipId; f: number; staffX: number; feetY: number; h?: number; z?: number; opacity?: number; order?: number}> = ({id, f, staffX, feetY, h = FIG, z = 0, opacity = 1, order = 30}) => {
  const g = clipGeom(staffX, feetY, h);
  return (
    <G x={g.cx} y={g.cy} z={z}>
      <ClipPlane id={id} f={f} w={g.w} opacity={opacity} order={order} />
    </G>
  );
};

// ---- 破線の枠（不足を示す）。march で破線が流れる ----
export const Dashed: React.FC<{w: number; h: number; color?: string; width?: number; dash?: number; gap?: number; march?: number; opacity?: number; order?: number}> = ({w, h, color = C.purple, width = 4, dash = 18, gap = 12, march = 0, opacity = 1, order = 22}) => {
  if (opacity <= 0.001) return null;
  const per = dash + gap;
  const total = 2 * (w + h);
  const out: React.ReactNode[] = [];
  const pt = (d: number): [number, number] => {
    d = ((d % total) + total) % total;
    if (d < w) return [-w / 2 + d, h / 2];
    d -= w;
    if (d < h) return [w / 2, h / 2 - d];
    d -= h;
    if (d < w) return [w / 2 - d, -h / 2];
    d -= w;
    return [-w / 2, -h / 2 + d];
  };
  const n = Math.floor(total / per);
  for (let i = 0; i < n; i++) {
    const a = i * per + (march % per);
    // 角をまたぐ破線は2つに分けて描く
    const steps = 3;
    for (let s = 0; s < steps; s++) {
      const [x1, y1] = pt(a + (dash * s) / steps);
      const [x2, y2] = pt(a + (dash * (s + 1)) / steps);
      if (Math.abs(x1 - x2) > 0.5 && Math.abs(y1 - y2) > 0.5) continue;
      out.push(<Seg key={`${i}-${s}`} x1={x1} y1={y1} x2={x2} y2={y2} w={width} color={color} opacity={opacity} order={order} />);
    }
  }
  return <>{out}</>;
};

// ---- 札（角丸のカード＋文字） ----
export type TagKind = 'plain' | 'yellow' | 'teal' | 'purple' | 'gray' | 'missing';
const TAG_STYLE: Record<TagKind, {fill: string; border: string; text: string}> = {
  plain: {fill: C.card, border: C.line, text: C.ink},
  yellow: {fill: C.yellow, border: C.yellowDeep, text: C.ink},
  teal: {fill: C.pale, border: C.teal, text: C.teal},
  purple: {fill: C.lilac, border: C.purple, text: C.purple},
  gray: {fill: '#eef2f5', border: C.line, text: C.gray},
  missing: {fill: C.card, border: C.purple, text: C.purple},
};
export const Tag: React.FC<{text: string; x?: number; y?: number; z?: number; w?: number; h?: number; size?: number; kind?: TagKind; opacity?: number; order?: number; rz?: number; rx?: number; ry?: number; s?: number; march?: number}> = ({text, x = 0, y = 0, z = 0, w, h, size = 40, kind = 'plain', opacity = 1, order = 40, rz = 0, rx = 0, ry = 0, s = 1, march = 0}) => {
  if (opacity <= 0.001 || s <= 0.001) return null;
  const st = TAG_STYLE[kind];
  const ww = w ?? measure(text, size, 800) + size * 1.6;
  const hh = h ?? size * 2.1;
  return (
    <G x={x} y={y} z={z} rz={rz} rx={rx} ry={ry} s={s}>
      <RRect w={ww} h={hh} r={Math.min(18, hh / 4)} color={st.fill} opacity={opacity} order={order} />
      {kind === 'missing' ? <Dashed w={ww} h={hh} color={st.border} width={4} march={march} opacity={opacity} order={order + 1} /> : <RRect w={ww} h={hh} r={Math.min(18, hh / 4)} border={3.5} color={st.border} opacity={opacity} order={order + 1} />}
      {text && <Txt text={text} size={size} weight={800} color={st.text} opacity={opacity} order={order + 2} />}
    </G>
  );
};

// ---- 吹き出し（青緑=口頭の補足、紫=読み手の問い）。tail は尾の位置（-1 左下 / 1 右下） ----
export const Bubble: React.FC<{text: string; kind?: 'talk' | 'ask'; x?: number; y?: number; z?: number; size?: number; w?: number; tail?: number; opacity?: number; order?: number; rz?: number; s?: number}> = ({text, kind = 'talk', x = 0, y = 0, z = 0, size = 38, w, tail = -1, opacity = 1, order = 44, rz = 0, s = 1}) => {
  if (opacity <= 0.001 || s <= 0.001) return null;
  const color = kind === 'ask' ? C.purple : C.teal;
  const fill = kind === 'ask' ? C.lilac : C.pale;
  const ww = w ?? measure(text, size, 800) + size * 1.4;
  const hh = size * 2.0;
  const tx = tail * (ww / 2 - size * 1.3);
  return (
    <G x={x} y={y} z={z} rz={rz} s={s}>
      <RRect w={size * 0.9} h={size * 0.9} r={2} x={tx} y={-hh / 2} rz={45} color={color} opacity={opacity} order={order} />
      <RRect w={size * 0.9 - 7} h={size * 0.9 - 7} r={2} x={tx} y={-hh / 2 + 1} rz={45} color={fill} opacity={opacity} order={order + 1} />
      <RRect w={ww} h={hh} r={hh / 2.4} color={fill} opacity={opacity} order={order + 2} />
      <RRect w={ww} h={hh} r={hh / 2.4} border={3.5} color={color} opacity={opacity} order={order + 3} />
      <Txt text={text} size={size} weight={800} color={color} opacity={opacity} order={order + 4} />
    </G>
  );
};

// ---- 資料（白い紙、折れた角、行）。reason: 理由の欄の状態 0=通常の行 / 'missing'=破線の空白 / 'filled'=黄色で埋まる ----
export const Doc: React.FC<{
  x?: number;
  y?: number;
  z?: number;
  s?: number;
  rz?: number;
  rx?: number;
  ry?: number;
  w?: number;
  h?: number;
  opacity?: number;
  order?: number;
  mark?: number; // 2行目（説明）に引く黄色の印（0..1 で伸びる）
  reason?: 'none' | 'missing' | 'filled';
  reasonLabel?: string;
  fill?: number; // 理由の欄が埋まる割合
  march?: number;
  lines?: number;
}> = ({x = 0, y = 0, z = 0, s = 1, rz = 0, rx = 0, ry = 0, w = 300, h = 390, opacity = 1, order = 26, mark = 0, reason = 'none', reasonLabel, fill = 0, march = 0, lines = 4}) => {
  if (opacity <= 0.001 || s <= 0.001) return null;
  const fold = w * 0.2;
  const lx = -w / 2 + w * 0.15;
  const lw = w * 0.7;
  const rows: React.ReactNode[] = [];
  for (let i = 0; i < lines; i++) {
    const yy = h / 2 - h * 0.26 - i * h * 0.12;
    const ww = i === lines - 1 ? lw * 0.72 : lw;
    rows.push(<RRect key={i} w={ww} h={Math.max(5, h * 0.022)} r={3} x={lx + ww / 2} y={yy} color={C.ink} opacity={opacity} order={order + 2} />);
  }
  const ry0 = -h / 2 + h * 0.17;
  const rh = h * 0.16;
  return (
    <G x={x} y={y} z={z} s={s} rz={rz} rx={rx} ry={ry}>
      <RRect w={w} h={h} r={10} color={C.card} opacity={opacity} order={order} />
      <RRect w={w} h={h} r={10} border={4} color={C.ink} opacity={opacity} order={order + 1} />
      <RRect w={fold} h={fold} r={2} x={w / 2 - fold / 2 - 2} y={h / 2 - fold / 2 - 2} color={C.pale} opacity={opacity} order={order + 2} />
      <Seg x1={w / 2 - fold} y1={h / 2 - 2} x2={w / 2 - fold} y2={h / 2 - fold} w={3.5} color={C.ink} opacity={opacity} order={order + 3} />
      <Seg x1={w / 2 - fold} y1={h / 2 - fold} x2={w / 2 - 2} y2={h / 2 - fold} w={3.5} color={C.ink} opacity={opacity} order={order + 3} />
      {rows}
      {mark > 0 && <RRect w={lw * clamp(mark)} h={h * 0.07} r={3} x={lx + (lw * clamp(mark)) / 2} y={h / 2 - h * 0.38} color={C.yellow} opacity={opacity} order={order + 1.5} />}
      {reason === 'missing' && (
        <G y={ry0}>
          {fill > 0 && <RRect w={lw * clamp(fill)} h={rh} r={6} x={-lw / 2 + (lw * clamp(fill)) / 2 + (lx + lw / 2)} color={C.yellow} opacity={opacity} order={order + 2} />}
          <G x={lx + lw / 2}>
            <Dashed w={lw} h={rh} march={march} width={Math.max(3, w * 0.012)} dash={w * 0.05} gap={w * 0.035} opacity={opacity * (1 - clamp(fill))} order={order + 3} />
            {reasonLabel && <Txt text={reasonLabel} size={rh * 0.5} weight={800} color={fill > 0.5 ? C.ink : C.purple} opacity={opacity} order={order + 4} />}
          </G>
        </G>
      )}
      {reason === 'filled' && (
        <G x={lx + lw / 2} y={ry0}>
          <RRect w={lw} h={rh} r={6} color={C.yellow} opacity={opacity} order={order + 2} />
          {reasonLabel && <Txt text={reasonLabel} size={rh * 0.5} weight={800} color={C.ink} opacity={opacity} order={order + 4} />}
        </G>
      )}
    </G>
  );
};

// ---- 会議の場（灰色の枠とラベル） ----
export const Room: React.FC<{x?: number; y?: number; z?: number; w: number; h: number; s?: number; rz?: number; ry?: number; opacity?: number; order?: number; label?: string}> = ({x = 0, y = 0, z = 0, w, h, s = 1, rz = 0, ry = 0, opacity = 1, order = 12, label = '会議の場'}) => {
  if (opacity <= 0.001) return null;
  return (
    <G x={x} y={y} z={z} s={s} rz={rz} ry={ry}>
      <RRect w={w} h={h} r={28} color={C.card} opacity={opacity} order={order} />
      <RRect w={w} h={h} r={28} border={4} color={C.line} opacity={opacity} order={order + 1} />
      {label && <Txt text={label} size={34} weight={700} color={C.gray} align="left" x={-w / 2 + 34} y={h / 2 - 44} opacity={opacity} order={order + 2} />}
    </G>
  );
};

// ---- 矢印（p1→p2 を k まで） ----
export const Arrow: React.FC<{x1: number; y1: number; x2: number; y2: number; k?: number; color?: string; w?: number; head?: number; opacity?: number; order?: number; z?: number}> = ({x1, y1, x2, y2, k = 1, color = C.teal, w = 7, head = 30, opacity = 1, order = 24, z = 0}) => <Seg x1={x1} y1={y1} x2={x2} y2={y2} k={k} w={w} head={head} color={color} opacity={opacity} order={order} z={z} />;

// ---- 登場の拡大（outBack） ----
export const pop = (t: number, a: number, d = 0.35, s = 1.6) => clamp(ease.outBack(prog(t, a, a + d), s), 0, 1.3);

// 衝突の点（着地の閃き）
export const Spark: React.FC<{t: number; at: number; x: number; y: number; color?: string; n?: number; r?: number; order?: number}> = ({t, at, x, y, color = C.teal, n = 8, r = 120, order = 50}) => {
  const age = t - at;
  if (age < 0 || age > 0.45) return null;
  const k = ease.out(age / 0.45);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3;
    out.push(<Seg key={i} x1={x + Math.cos(a) * r * (0.35 + 0.5 * k)} y1={y + Math.sin(a) * r * (0.35 + 0.5 * k)} x2={x + Math.cos(a) * r * (0.55 + 0.6 * k)} y2={y + Math.sin(a) * r * (0.55 + 0.6 * k)} w={6} color={color} opacity={1 - k} order={order} />);
  }
  return (
    <>
      {out}
      <Disc r={r * 0.25 * (1 - k)} x={x} y={y} color={color} opacity={0.4 * (1 - k)} order={order} />
    </>
  );
};
