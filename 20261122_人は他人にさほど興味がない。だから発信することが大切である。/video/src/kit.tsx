// 文字の部品（DOM／CSS）。字形は崩さない。動かすのは行・語の塊・面。すべて時刻から決まる純関数。
import React from 'react';
import {clamp, cubicBezier, ease, hash, hashR, lerp, prog, wobble} from './lib/anim';

export const W = 1920;
export const H = 1080;

// 企画書（plan.html デザインシステム）の色
export const C = {
  paper: '#F4F0E6',
  ink: '#1A1916',   // 本人の決め語
  gray: '#7A746C',  // 留保・素通りする点
  grayDark: '#5A544C', // 通り道の線・可読性を確保した灰文字
  indigo: '#1F4E79', // 目に留まった点・吹き出し輪郭・弧
  amber: '#8C5A2B',  // 自分の言葉・通り道に出した点
  coral: '#B04834',  // 心ない批判・雑音の斜線
  white: '#FFFFFF',
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
export const outBack = (k: number) => ease.outBack(k, 1.55);
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
  shadow?: string;
  colorAt?: (i: number) => string | undefined;
};

export const Line: React.FC<LineP> = ({
  t, text, x, y, size, font = 'g', weight, color = C.ink,
  t0, t1 = 1e9, dir = 'up', stagger = 0.026, dur = 0.48, outDur = 0.30,
  ls = 0, anchor = 'l', dx = 0, dy = 0, s = 1, r = 0, vertical, box, mv, o = 1, shadow, colorAt,
}) => {
  if (t < t0 - 0.01 || o <= 0.001) return null;
  const chars = Array.from(text);
  const n = chars.length;
  if (t > t1 + outDur + n * stagger * 0.5 + 0.05) return null;
  const pad = size * 0.16;
  const tx = vertical ? '0' : anchor === 'c' ? '-50%' : anchor === 'r' ? '-100%' : '0';
  const org = vertical ? '50% 0' : anchor === 'c' ? '50% 50%' : anchor === 'r' ? '100% 50%' : '0 50%';
  const isTransit = mv || t < t0 + dur * 0.65 || t > t1 - 0.01;
  return (
    <div
      data-mv={isTransit ? '1' : undefined}
      style={{
        ...base(font, vertical),
        left: x,
        top: y,
        opacity: o,
        margin: `${-pad}px`,
        padding: `${pad}px`,
        transform: `translate(${dx}px, ${dy}px) translateX(${tx}) rotate(${r}deg) scale(${s})`,
        transformOrigin: org,
        overflow: 'hidden',
        fontSize: size,
        fontWeight: weight ?? 900,
        color,
        letterSpacing: `${ls}em`,
        textShadow: shadow,
      }}
    >
      {chars.map((ch, i) => {
        const kin = outExpo(prog(t, t0 + i * stagger, t0 + i * stagger + dur));
        const kout = inExpo(prog(t, t1 + i * stagger * 0.45, t1 + i * stagger * 0.45 + outDur));
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

export type TxtP = {
  text: string;
  x: number;
  y: number;
  size: number;
  font?: 'g' | 'm';
  weight?: number;
  color?: string;
  anchor?: 'l' | 'c' | 'r';
  s?: number;
  r?: number;
  o?: number;
  ls?: number;
  box?: boolean;
  mv?: boolean;
  vertical?: boolean;
  shadow?: string;
  colorAt?: (i: number) => string | undefined;
};

export const Txt: React.FC<TxtP> = ({
  text, x, y, size, font = 'g', weight, color = C.ink,
  anchor = 'l', s = 1, r = 0, o = 1, ls = 0, box, mv, vertical, shadow, colorAt,
}) => {
  if (o <= 0.001 || s <= 0.001) return null;
  const tx = vertical ? '0' : anchor === 'c' ? '-50%' : anchor === 'r' ? '-100%' : '0';
  const org = vertical ? '50% 0' : anchor === 'c' ? '50% 50%' : anchor === 'r' ? '100% 50%' : '0 50%';
  return (
    <div
      data-mv={mv ? '1' : undefined}
      style={{
        ...base(font, vertical),
        left: x,
        top: y,
        opacity: o,
        transform: `translateX(${tx}) rotate(${r}deg) scale(${s})`,
        transformOrigin: org,
        fontSize: size,
        fontWeight: weight ?? 900,
        color,
        letterSpacing: `${ls}em`,
        textShadow: shadow,
      }}
    >
      {Array.from(text).map((ch, i) => (
        <span key={i} data-ch={box ? 'box' : '1'} style={{display: 'inline-block', color: colorAt?.(i) ?? color}}>
          {ch}
        </span>
      ))}
    </div>
  );
};

// 着地（塊ごと）: t0 から dur 秒で収まり、その後も grow でゆっくり育つ
export function slam(
  t: number,
  t0: number,
  o: {dur?: number; x?: number; y?: number; s?: number; r?: number; r1?: number; grow?: number; out?: number; outX?: number; outY?: number} = {},
) {
  const dur = o.dur ?? 0.44;
  const k = E_SLAM(prog(t, t0, t0 + dur));
  const ko = o.out === undefined ? 0 : E_PUSH(prog(t, o.out, o.out + 0.30));
  return {
    dx: (1 - k) * (o.x ?? 0) + ko * (o.outX ?? 0),
    dy: (1 - k) * (o.y ?? 0) + ko * (o.outY ?? 0),
    s: lerp(o.s ?? 1.75, 1, k) * (1 + (o.grow ?? 0.025) * Math.max(0, t - t0 - dur)),
    r: lerp(o.r ?? -4, o.r1 ?? 0, k),
    o: t >= t0 && (o.out === undefined || t < o.out + 0.30) ? clamp(prog(t, t0, t0 + 0.06)) * (1 - ko) : 0,
    mv: during(t, t0 - 0.01, t0 + dur * 0.65) || (o.out !== undefined && t > o.out - 0.02),
  };
}

export const G: React.FC<{dx?: number; dy?: number; s?: number; r?: number; ox?: number; oy?: number; mv?: boolean; o?: number; children: React.ReactNode}> = ({
  dx = 0, dy = 0, s = 1, r = 0, ox = W / 2, oy = H / 2, mv, o = 1, children,
}) => (
  <div
    data-mv={mv ? '1' : undefined}
    style={{
      position: 'absolute',
      left: 0,
      top: 0,
      width: W,
      height: H,
      opacity: o,
      transform: `translate(${dx}px, ${dy}px) rotate(${r}deg) scale(${s})`,
      transformOrigin: `${ox}px ${oy}px`,
    }}
  >
    {children}
  </div>
);

export const DBlur: React.FC<{id: string; n: number; ax?: 'x' | 'y'; children: React.ReactNode}> = ({id, n, ax = 'x', children}) =>
  n < 0.4 ? (
    <>{children}</>
  ) : (
    <>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id={`db-${id}`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation={ax === 'x' ? `${n.toFixed(2)} 0` : `0 ${n.toFixed(2)}`} />
        </filter>
      </svg>
      <div style={{position: 'absolute', inset: 0, filter: `url(#db-${id})`}}>{children}</div>
    </>
  );
