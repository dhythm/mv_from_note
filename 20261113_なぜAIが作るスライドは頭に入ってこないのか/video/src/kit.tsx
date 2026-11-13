// 文字の部品（DOM／CSS）。字形は崩さない。動かすのは行・語の塊・面。すべて時刻から決まる純関数。
import React from 'react';
import {clamp, cubicBezier, ease, hash, hashR, lerp, prog, wobble} from './lib/anim';

export const W = 1920;
export const H = 1080;

export const C = {
  paper: '#f6f3ec',
  ink: '#1a1a1a', // 画面に残す要点、本文と結論
  gray: '#5c564e', // 思い込みと留保（画面の文字）
  blue: '#1e4d8c', // 自分の声で運ぶ語り
  sheet: '#fffdf8', // 紙面
  edge: '#ddd6c8', // 紙面の縁
  line: '#7a736a', // 文章量を示す横線
  beige: '#e4dfd4', // 図の箱
};
export const F = {g: 'NotoSansJPv', m: 'NotoSansJPv'};

export const E_SLAM = cubicBezier(0.16, 1, 0.3, 1);
export const E_PUSH = cubicBezier(0.6, 0, 0.9, 0.4);
export const E_WHIP = cubicBezier(0.7, 0, 0.2, 1);
export const outExpo = ease.outExpo;
export const inExpo = ease.inExpo;
export const inOut = ease.inOut;
export const out3 = ease.out;
export const in3 = ease.in;
export const outBack = (k: number) => ease.outBack(k, 1.5);
export const outElastic = ease.outElastic;
export const lin = (k: number) => k;
export {clamp, hash, hashR, lerp, prog, wobble};

export type K = [number, number, ((k: number) => number)?];
export function kv(t: number, keys: K[]) {
  if (t <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i++) {
    const [a, va] = keys[i];
    const [b, vb, e] = keys[i + 1];
    if (t <= b) return lerp(va, vb, (e ?? inOut)(prog(t, a, b)));
  }
  return keys[keys.length - 1][1];
}
export const during = (t: number, a: number, b: number) => t > a && t < b;
export const sstep = (t: number, a: number, b: number) => {
  const k = prog(t, a, b);
  return k * k * (3 - 2 * k);
};
export function mix(a: string, b: string, k: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const kk = clamp(k);
  return `#${pa.map((v, i) => Math.round(lerp(v, pb[i], kk)).toString(16).padStart(2, '0')).join('')}`;
}

const base = (font: 'g' | 'm', vertical?: boolean): React.CSSProperties => ({
  position: 'absolute',
  whiteSpace: 'nowrap',
  lineHeight: 1,
  fontFamily: F[font],
  fontFeatureSettings: vertical ? '"vpal" 1' : '"palt" 1',
  writingMode: vertical ? 'vertical-rl' : undefined,
});

type Dir = 'up' | 'down' | 'left' | 'right';
export type LineP = {
  t: number;
  text: string;
  x: number;
  y: number;
  size: number;
  font?: 'g' | 'm';
  weight?: number;
  color?: string;
  t0: number;
  t1?: number;
  dir?: Dir;
  stagger?: number;
  dur?: number;
  outDur?: number;
  ls?: number;
  anchor?: 'l' | 'c' | 'r';
  dx?: number;
  dy?: number;
  s?: number;
  r?: number;
  vertical?: boolean;
  box?: boolean;
  mv?: boolean;
  o?: number;
  colorAt?: (i: number) => string | undefined;
};
// 行のマスクから一文字ずつ入り、マスクの外へ抜ける。読む間は dx, dy, s で行ごと流す。
// 横組: x は anchor の位置、y は行の上端。縦組: x は行の左端、y は上端。
export const Line: React.FC<LineP> = ({t, text, x, y, size, font = 'g', weight, color = C.ink, t0, t1 = 1e9, dir = 'up', stagger = 0.028, dur = 0.5, outDur = 0.32, ls = 0, anchor = 'l', dx = 0, dy = 0, s = 1, r = 0, vertical, box, mv, o = 1, colorAt}) => {
  if (t < t0 - 0.01 || o <= 0.001) return null;
  const chars = Array.from(text);
  const n = chars.length;
  if (t > t1 + outDur + n * stagger * 0.5 + 0.05) return null;
  const pad = size * 0.14;
  const tx = vertical ? '0' : anchor === 'c' ? '-50%' : anchor === 'r' ? '-100%' : '0';
  const org = vertical ? '50% 0' : anchor === 'c' ? '50% 50%' : anchor === 'r' ? '100% 50%' : '0 50%';
  return (
    <div
      data-mv={mv ? '1' : undefined}
      style={{...base(font, vertical), left: x, top: y, opacity: o, margin: `${-pad}px`, padding: `${pad}px`, transform: `translate(${dx}px, ${dy}px) translateX(${tx}) rotate(${r}deg) scale(${s})`, transformOrigin: org, overflow: 'hidden', fontSize: size, fontWeight: weight ?? (font === 'g' ? 900 : 400), color, letterSpacing: `${ls}em`}}
    >
      {chars.map((ch, i) => {
        const kin = outExpo(prog(t, t0 + i * stagger, t0 + i * stagger + dur));
        const kout = inExpo(prog(t, t1 + i * stagger * 0.5, t1 + i * stagger * 0.5 + outDur));
        const a = (1 - kin) * 130;
        const b = kout * 130;
        const tr = dir === 'up' ? `translateY(${a - b}%)` : dir === 'down' ? `translateY(${-a + b}%)` : dir === 'left' ? `translateX(${a - b}%)` : `translateX(${-a + b}%)`;
        return (
          <span key={i} data-ch={box ? 'box' : '1'} style={{display: 'inline-block', transform: tr, color: colorAt?.(i) ?? color}}>
            {ch}
          </span>
        );
      })}
    </div>
  );
};

// 語の塊（マスクなし）。着地・拡縮・回転は塊ごと。
export type TxtP = {text: string; x: number; y: number; size: number; font?: 'g' | 'm'; weight?: number; color?: string; anchor?: 'l' | 'c' | 'r'; s?: number; r?: number; o?: number; ls?: number; box?: boolean; mv?: boolean; vertical?: boolean; colorAt?: (i: number) => string | undefined; stroke?: string};
export const Txt: React.FC<TxtP> = ({text, x, y, size, font = 'g', weight, color = C.ink, anchor = 'l', s = 1, r = 0, o = 1, ls = 0, box, mv, vertical, colorAt, stroke}) => {
  if (o <= 0.001 || s <= 0.001) return null;
  const tx = vertical ? '0' : anchor === 'c' ? '-50%' : anchor === 'r' ? '-100%' : '0';
  const org = vertical ? '50% 0' : anchor === 'c' ? '50% 50%' : anchor === 'r' ? '100% 50%' : '0 50%';
  return (
    <div data-mv={mv ? '1' : undefined} style={{...base(font, vertical), left: x, top: y, opacity: o, transform: `translateX(${tx}) rotate(${r}deg) scale(${s})`, transformOrigin: org, fontSize: size, fontWeight: weight ?? (font === 'g' ? 900 : 400), color, letterSpacing: `${ls}em`, WebkitTextStroke: stroke}}>
      {Array.from(text).map((ch, i) => (
        <span key={i} data-ch={box ? 'box' : '1'} style={{display: 'inline-block', color: colorAt?.(i) ?? color}}>
          {ch}
        </span>
      ))}
    </div>
  );
};

// 着地（塊ごと）: t0 から dur 秒で、拡大・回転・移動が収まる。そのあとも s がゆっくり育つ（読む間も止めない）
export function slam(t: number, t0: number, o: {dur?: number; x?: number; y?: number; s?: number; r?: number; r1?: number; grow?: number; out?: number; outX?: number; outY?: number} = {}) {
  const dur = o.dur ?? 0.45;
  const k = E_SLAM(prog(t, t0, t0 + dur));
  const ko = o.out === undefined ? 0 : E_PUSH(prog(t, o.out, o.out + 0.3));
  return {
    dx: (1 - k) * (o.x ?? 0) + ko * (o.outX ?? 0),
    dy: (1 - k) * (o.y ?? 0) + ko * (o.outY ?? 0),
    s: lerp(o.s ?? 1.8, 1, k) * (1 + (o.grow ?? 0.035) * Math.max(0, t - t0 - dur)),
    r: lerp(o.r ?? -5, o.r1 ?? 0, k),
    o: t >= t0 && (o.out === undefined || t < o.out + 0.3) ? clamp(prog(t, t0, t0 + 0.06)) : 0,
    mv: during(t, t0 - 0.01, t0 + dur * 0.6) || (o.out !== undefined && t > o.out),
  };
}

// 色の面。k: 0→1 で from の辺から開く。k2: 0→1 で to の辺へ閉じる
export const Plate: React.FC<{x: number; y: number; w: number; h: number; k?: number; k2?: number; color: string; from?: 'l' | 'r' | 't' | 'b'; r?: number; radius?: number; fig?: boolean; o?: number; style?: React.CSSProperties; children?: React.ReactNode}> = ({x, y, w, h, k = 1, k2 = 0, color, from = 'l', r = 0, radius = 0, fig, o = 1, style, children}) => {
  if (k <= 0.001 || k2 >= 0.999 || o <= 0.001) return null;
  const a = (1 - clamp(k)) * 100;
  const b = clamp(k2) * 100;
  const clip = from === 'l' ? `inset(0 ${a}% 0 ${b}%)` : from === 'r' ? `inset(0 ${b}% 0 ${a}%)` : from === 't' ? `inset(${b}% 0 ${a}% 0)` : `inset(${a}% 0 ${b}% 0)`;
  return (
    <div data-fig={fig ? '1' : undefined} style={{position: 'absolute', left: x, top: y, width: w, height: h, background: color, borderRadius: radius, opacity: o, transform: r ? `rotate(${r}deg)` : undefined, clipPath: a > 0 || b > 0 ? clip : undefined, ...style}}>
      {children}
    </div>
  );
};

// 一方向だけのぶれ（速いカメラの振りや押し出し）
export const DBlur: React.FC<{id: string; n: number; children: React.ReactNode}> = ({id, n, children}) =>
  n < 0.4 ? (
    <>{children}</>
  ) : (
    <>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id={`db-${id}`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={`${n.toFixed(2)} 0`} />
        </filter>
      </svg>
      <div style={{position: 'absolute', inset: 0, filter: `url(#db-${id})`}}>{children}</div>
    </>
  );
