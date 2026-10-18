// v2: タイポグラフィー中心の部品（DOM／CSS）。文字は行ごとのマスクから出入りし、読む間は形を崩さない。
// 動きは行・塊・画面全体の移動／拡縮／回転で出す。すべてフレーム時刻から決まる。
import React from 'react';
import {Img, staticFile} from 'remotion';
import {C, clamp, ease, lerp, prog} from '../lib/anim';
import {FONT} from '../components/prims';
import {SPRITES, SpriteId} from '../components/stage';

export const W = 1920;
export const H = 1080;
export const outExpo = ease.outExpo;
export const inExpo = ease.inExpo;
export const inOut = ease.inOut;

export const typeBase: React.CSSProperties = {
  fontFamily: FONT,
  fontFeatureSettings: '"palt" 1',
  lineHeight: 1,
  whiteSpace: 'nowrap',
  position: 'absolute',
};

// ---- 画面全体（カメラ）。中心を原点に移動・拡縮・回転 ----
export const Cam: React.FC<{x?: number; y?: number; s?: number; r?: number; ox?: number; oy?: number; children: React.ReactNode}> = ({x = 0, y = 0, s = 1, r = 0, ox = W / 2, oy = H / 2, children}) => (
  <div style={{position: 'absolute', inset: 0, transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`, transformOrigin: `${ox}px ${oy}px`}}>{children}</div>
);
// 位置・回転・拡縮をまとめた層
export const Lay: React.FC<{x?: number; y?: number; s?: number; r?: number; ox?: number; oy?: number; o?: number; children: React.ReactNode}> = ({x = 0, y = 0, s = 1, r = 0, ox = W / 2, oy = H / 2, o = 1, children}) =>
  o <= 0.001 ? null : (
    <div style={{position: 'absolute', inset: 0, opacity: o, transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`, transformOrigin: `${ox}px ${oy}px`}}>{children}</div>
  );

// ---- 行のマスク表示 ----
// t0 から1文字ずつマスクの下からせり上がり、t1 からマスクの上へ抜ける。文字の形は崩さない。
export const Line: React.FC<{
  t: number;
  text: string;
  x: number;
  y: number; // 行の上端
  size: number;
  weight?: number;
  color?: string;
  t0: number;
  t1?: number;
  stagger?: number;
  dur?: number;
  outDur?: number;
  spacing?: number; // em
  colorAt?: (i: number) => string | undefined;
  mark?: [number, number, number]; // [開始文字, 終了文字(含まない), 引き始める秒] の黄色の印
  markOut?: number;
  slide?: number; // 読む間も行ごと流れる速さ（px/秒、塊として動く）
  style?: React.CSSProperties;
}> = ({t, text, x, y, size, weight = 900, color = C.ink, t0, t1 = 1e9, stagger = 0.028, dur = 0.55, outDur = 0.4, spacing = -0.02, colorAt, mark, markOut = 1e9, slide = 0, style}) => {
  if (t < t0 - 0.01 || t > t1 + outDur + 0.3) return null;
  const chars = Array.from(text);
  return (
    <div style={{...typeBase, transform: `translateX(${slide * Math.max(0, Math.min(t, t1) - t0)}px)`, left: x, top: y - size * 0.12, height: size * 1.24, overflow: 'hidden', fontSize: size, fontWeight: weight, color, letterSpacing: `${spacing}em`, ...style}}>
      <div style={{paddingTop: size * 0.12}}>
        {chars.map((ch, i) => {
          const kin = outExpo(prog(t, t0 + i * stagger, t0 + i * stagger + dur));
          const kout = inExpo(prog(t, t1 + i * stagger * 0.6, t1 + i * stagger * 0.6 + outDur));
          const ty = (1 - kin) * 115 - kout * 115;
          const inMark = mark && i >= mark[0] && i < mark[1];
          const mk = inMark ? outExpo(prog(t, mark[2] + (i - mark[0]) * 0.06, mark[2] + (i - mark[0]) * 0.06 + 0.22)) * (1 - inExpo(prog(t, markOut, markOut + 0.3))) : 0;
          return (
            <span key={i} style={{display: 'inline-block', transform: `translateY(${ty}%)`, color: colorAt?.(i) ?? color, backgroundImage: mk > 0 ? `linear-gradient(${C.yellow}, ${C.yellow})` : undefined, backgroundSize: `${mk * 100}% 78%`, backgroundPosition: '0 70%', backgroundRepeat: 'no-repeat'}}>
              {ch}
            </span>
          );
        })}
      </div>
    </div>
  );
};

// ---- 行の下に引く印（黄色の面）。左から伸びる ----
export const Marker: React.FC<{t: number; x: number; y: number; w: number; h: number; a: number; d?: number; color?: string; out?: number}> = ({t, x, y, w, h, a, d = 0.4, color = C.yellow, out = 1e9}) => {
  const k = outExpo(prog(t, a, a + d));
  const ko = inExpo(prog(t, out, out + 0.35));
  if (k <= 0) return null;
  return <div style={{position: 'absolute', left: x + w * ko, top: y, width: w * (k - ko), height: h, background: color}} />;
};

// ---- 全面のワイプ（色の面が横切る）。k は 0→1 で右から入り左へ抜ける。mid で全面を覆う ----
export function wipeX(t: number, a: number, b: number) {
  const k = prog(t, a, b);
  if (k <= 0 || k >= 1) return null;
  const inK = outExpo(clamp(k * 2));
  const outK = inExpo(clamp(k * 2 - 1));
  return {left: (1 - inK) * W * 1.1 - outK * W * 1.1, k};
}
export const Wipe: React.FC<{t: number; a: number; b: number; color: string; skew?: number}> = ({t, a, b, color, skew = -12}) => {
  const w = wipeX(t, a, b);
  if (!w) return null;
  return <div style={{position: 'absolute', top: -200, height: H + 400, left: w.left - 200, width: W + 400, background: color, transform: `skewX(${skew}deg)`}} />;
};

// ---- 円で覆う（中心 cx,cy から） ----
export const Iris: React.FC<{t: number; a: number; b: number; cx: number; cy: number; color: string; r0?: number}> = ({t, a, b, cx, cy, color, r0 = 0}) => {
  const k = inExpo(prog(t, a, b));
  if (k <= 0) return null;
  const r = lerp(r0, 2600, k);
  return <div style={{position: 'absolute', left: cx - r, top: cy - r, width: r * 2, height: r * 2, borderRadius: '50%', background: color}} />;
};

// ---- 採用動画のコマ（透過PNG）。staffX/feetY は担当者の頭の中心と足元、h は人物の高さ ----
export const CLIP = {staffX: 396, bossX: 876, feetY: 621, figH: 460};
export function clipBox(staffX: number, feetY: number, h: number) {
  const k = h / CLIP.figH;
  return {k, left: staffX - CLIP.staffX * k, top: feetY - CLIP.feetY * k, w: 1280 * k, h: 720 * k, bossX: staffX + (CLIP.bossX - CLIP.staffX) * k};
}
export const ClipImg: React.FC<{id: 'handoff' | 'question' | 'reader'; f: number; staffX: number; feetY: number; h: number; opacity?: number}> = ({id, f, staffX, feetY, h, opacity = 1}) => {
  const b = clipBox(staffX, feetY, h);
  const i = Math.max(0, Math.min(143, Math.floor(f + 1e-6)));
  return <Img src={staticFile(`clips/${id}/${String(i).padStart(4, '0')}.png`)} style={{position: 'absolute', left: b.left, top: b.top, width: b.w, height: b.h, opacity}} />;
};
// 原本 24fps のコマ番号（t0 から speed 倍、from〜to 秒。範囲外は端で止める）
export function clipF(t: number, t0: number, speed = 1.5, from = 0, to = 6) {
  return Math.min(clamp(from + Math.max(0, t - t0) * speed, from, to) * 24, to * 24 - 1);
}

// ---- 静止姿勢の人物。(x, feetY) は頭の中心の真下・足元 ----
export const Sprite: React.FC<{id: SpriteId; x: number; feetY: number; h: number; opacity?: number; style?: React.CSSProperties}> = ({id, x, feetY, h, opacity = 1, style}) => {
  const m = SPRITES[id];
  const k = h / m.h;
  return <Img src={staticFile(`sprites/${id}.png`)} style={{position: 'absolute', left: x - m.headX * k, top: feetY - h, width: m.w * k, height: h, opacity, ...style}} />;
};

// ---- 資料（白い紙）。行・黄色の印・理由欄 ----
export const Paper: React.FC<{x: number; y: number; w: number; h: number; r?: number; marks?: number[]; lines?: number; style?: React.CSSProperties; children?: React.ReactNode}> = ({x, y, w, h, r = 0, marks = [], lines = 5, style, children}) => {
  const pad = w * 0.13;
  const gap = (h - pad * 2.2) / (lines + 1);
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, background: C.card, border: `${Math.max(4, w * 0.012)}px solid ${C.ink}`, borderRadius: 10, transform: `rotate(${r}deg)`, boxShadow: '0 24px 60px rgba(35,54,75,0.14)', ...style}}>
      <div style={{position: 'absolute', right: -2, top: -2, width: w * 0.18, height: w * 0.18, background: C.pale, borderLeft: `4px solid ${C.ink}`, borderBottom: `4px solid ${C.ink}`, borderBottomLeftRadius: 4}} />
      <div style={{position: 'absolute', left: pad, top: pad * 1.1, width: w * 0.5, height: gap * 0.42, background: C.ink, borderRadius: 4}} />
      {Array.from({length: lines}, (_, i) => {
        const mk = marks[i] ?? 0;
        const lw = i === lines - 1 ? 0.55 : 0.74;
        return (
          <div key={i} style={{position: 'absolute', left: pad, top: pad * 1.1 + gap * (i + 1.2), width: w * lw, height: gap * 0.5}}>
            {mk > 0 && <div style={{position: 'absolute', left: -6, top: -gap * 0.08, width: (w * lw + 12) * mk, height: gap * 0.66, background: C.yellow, borderRadius: 3}} />}
            <div style={{position: 'absolute', left: 0, top: gap * 0.17, width: '100%', height: Math.max(5, gap * 0.16), background: C.ink, borderRadius: 3}} />
          </div>
        );
      })}
      {children}
    </div>
  );
};

// ---- 矢印（線と先端を一つの輪郭で描く）。k で伸びる ----
export const ArrowSvg: React.FC<{x1: number; y1: number; x2: number; y2: number; k: number; color?: string; w?: number; head?: number}> = ({x1, y1, x2, y2, k, color = C.ink, w = 8, head = 30}) => {
  if (k <= 0) return null;
  const ex = lerp(x1, x2, k);
  const ey = lerp(y1, y2, k);
  const a = Math.atan2(ey - y1, ex - x1);
  const hx = ex - Math.cos(a) * head * 0.9;
  const hy = ey - Math.sin(a) * head * 0.9;
  const p1 = [ex - Math.cos(a - 0.5) * head, ey - Math.sin(a - 0.5) * head];
  const p2 = [ex - Math.cos(a + 0.5) * head, ey - Math.sin(a + 0.5) * head];
  return (
    <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
      <line x1={x1} y1={y1} x2={hx} y2={hy} stroke={color} strokeWidth={w} strokeLinecap="round" />
      <path d={`M${ex},${ey} L${p1[0]},${p1[1]} L${p2[0]},${p2[1]} Z`} fill={color} stroke={color} strokeWidth={w * 0.6} strokeLinejoin="round" />
    </svg>
  );
};

// ---- ラベル（細い引き出し線つきの札）。読み手の問いは紫 ----
export const Label: React.FC<{t: number; a: number; text: string; x: number; y: number; size?: number; color?: string; fill?: string; dashed?: boolean}> = ({t, a, text, x, y, size = 40, color = C.purple, fill = C.lilac, dashed = false}) => {
  const k = outExpo(prog(t, a, a + 0.45));
  if (k <= 0) return null;
  return (
    <div style={{...typeBase, left: x, top: y, fontSize: size, fontWeight: 800, color, padding: `${size * 0.32}px ${size * 0.6}px`, background: fill, border: `${dashed ? 4 : 3}px ${dashed ? 'dashed' : 'solid'} ${color}`, borderRadius: size * 0.3, clipPath: `inset(0 ${(1 - k) * 100}% 0 0)`}}>
      {text}
    </div>
  );
};

// ---- 札（角丸の箱＋文字）。kind で意味の色 ----
export type BoxKind = 'plain' | 'yellow' | 'teal' | 'purple' | 'gray' | 'ink';
const BOX: Record<BoxKind, {fill: string; border: string; text: string}> = {
  plain: {fill: C.card, border: C.ink, text: C.ink},
  yellow: {fill: C.yellow, border: C.yellowDeep, text: C.ink},
  teal: {fill: C.pale, border: C.teal, text: C.teal},
  purple: {fill: C.lilac, border: C.purple, text: C.purple},
  gray: {fill: '#eef2f5', border: C.line, text: C.gray},
  ink: {fill: C.ink, border: C.ink, text: C.bg},
};
export const Box: React.FC<{x: number; y: number; w: number; h: number; text?: string; size?: number; kind?: BoxKind; s?: number; r?: number; o?: number; dashed?: boolean; march?: number; style?: React.CSSProperties; children?: React.ReactNode}> = ({x, y, w, h, text, size = 56, kind = 'plain', s = 1, r = 0, o = 1, dashed = false, march = 0, style, children}) => {
  if (o <= 0.001 || s <= 0.001) return null;
  const st = BOX[kind];
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity: o, transform: `rotate(${r}deg) scale(${s})`, ...style}}>
      <div style={{position: 'absolute', inset: 0, background: st.fill, borderRadius: Math.min(22, h * 0.22), border: dashed ? 'none' : `4px solid ${st.border}`}} />
      {dashed && <DashRect w={w} h={h} color={st.border} march={march} />}
      {text && <div style={{...typeBase, inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size, fontWeight: 900, color: st.text}}>{text}</div>}
      {children}
    </div>
  );
};
// 破線の枠（不足）。march で破線が流れる
export const DashRect: React.FC<{w: number; h: number; color?: string; march?: number; sw?: number}> = ({w, h, color = C.purple, march = 0, sw = 5}) => (
  <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={w} height={h}>
    <rect x={sw / 2} y={sw / 2} width={w - sw} height={h - sw} rx={Math.min(22, h * 0.22)} fill="none" stroke={color} strokeWidth={sw} strokeDasharray="22 14" strokeDashoffset={-march} />
  </svg>
);
// 吹き出し（本体と尾を一つの輪郭で描く）。tail: 尾の向き（-1 左下 / 1 右下）
export const Bubble: React.FC<{x: number; y: number; text: string; size?: number; kind?: 'talk' | 'ask'; tail?: number; s?: number; o?: number; w?: number; ox?: string}> = ({x, y, text, size = 46, kind = 'talk', tail = -1, s = 1, o = 1, w, ox = '50% 100%'}) => {
  if (o <= 0.001 || s <= 0.001) return null;
  const color = kind === 'ask' ? C.purple : C.teal;
  const fill = kind === 'ask' ? C.lilac : C.pale;
  const ww = w ?? Array.from(text).length * size * 0.96 + size * 1.4;
  const hh = size * 2.0;
  const r = hh / 2;
  const tx = tail < 0 ? ww * 0.24 : ww * 0.76;
  const th = size * 0.75;
  const tw = size * 0.6;
  const d = `M${r},0 H${ww - r} A${r},${r} 0 0 1 ${ww - r},${hh} H${tx + tw / 2} L${tx + (tail < 0 ? -tw * 0.7 : tw * 0.7)},${hh + th} L${tx - tw / 2},${hh} H${r} A${r},${r} 0 0 1 ${r},0 Z`;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: ww, height: hh + th, opacity: o, transform: `scale(${s})`, transformOrigin: ox}}>
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={ww} height={hh + th}>
        <path d={d} fill={fill} stroke={color} strokeWidth={4} strokeLinejoin="round" />
      </svg>
      <div style={{...typeBase, left: 0, top: 0, width: ww, height: hh, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size, fontWeight: 800, color}}>{text}</div>
    </div>
  );
};
// 登場の拡大（outBack、行き過ぎは小さく）
export const popK = (t: number, a: number, d = 0.4) => clamp(ease.outBack(prog(t, a, a + d), 1.4), 0, 1.15);
