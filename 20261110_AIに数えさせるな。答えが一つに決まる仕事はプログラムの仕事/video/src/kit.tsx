// 文字と面の部品（DOM／CSS）。文字は行のマスクから入るか、語の塊ごと着地する。字形は崩さない。
// 動きは行・塊・面・カメラの移動／拡縮／回転で出す。すべてフレーム時刻から決まる純関数。
// 出発点: 20261109 の kit.tsx（元は 20261018 の v2/kit.tsx）。配色と部品は本作用に書き直した。
import React from 'react';
import {clamp, cubicBezier, ease, hash, hashR, lerp, prog} from './lib/anim';

export const W = 1920;
export const H = 1080;
export const FPS = 30;

// 配色（plan.html「デザインシステム」「記号と色」: 1 記号 = 1 意味。本編にライムは使わない）
export const C = {
  paper: '#f4f1ea', // 画面の地
  ink: '#1a1a1a', // 事実の語
  ai: '#14315c', // 藍: 筆者の決め語、AIに渡す側の吹き出し
  gray: '#5c5854', // 留保、信頼しきれない発話
  card: '#fffcf7', // 見ているファイル
  miss: '#c4beb2', // 注意が届いていないファイル
  light: '#e8a830', // 注意力（暖光）。文字色にはしない
  lightSoft: '#f5cf7c', // 光が当たったカードの面
  change: '#b45309', // 残っていた変更（橙の帯）
  gear: '#243044', // 答えが一つに決まる仕事（歯車）
  tag: '#e8eef2', // 問題なしの札
  tagLine: '#8fa5b8',
  cool: '#dde5ec', // プログラム側の面
  rule: '#d8d2c6', // カードの中の行
  white: '#ffffff',
};

export const F = {noto: 'NotoSansJPv'};

export const E_SLAM = cubicBezier(0.16, 1, 0.3, 1);
export const E_PUSH = cubicBezier(0.55, 0, 1, 0.45);
export const E_SNAP = cubicBezier(0.3, 1.35, 0.5, 1);
export const outExpo = ease.outExpo;
export const inExpo = ease.inExpo;
export const inOut = ease.inOut;
export const out3 = ease.out;
export const in3 = ease.in;
export const outBack = (k: number) => ease.outBack(k, 1.4);
export {clamp, hash, hashR, lerp, prog};

// キー列の補間。キーの 3 つ目はそのキーへ向かう区間のイージング（省略時 inOut）
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
// 区間の途中かどうか（検査で「移動中」を区別するため）
export const during = (t: number, a: number, b: number) => t > a && t < b;

export function mix(a: string, b: string, k: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const kk = clamp(k);
  return `#${pa.map((v, i) => Math.round(lerp(v, pb[i], kk)).toString(16).padStart(2, '0')).join('')}`;
}

// 層: 位置・回転・拡縮。原点は (ox, oy)
export const Lay: React.FC<{x?: number; y?: number; s?: number; r?: number; ox?: number; oy?: number; o?: number; mv?: boolean; style?: React.CSSProperties; children: React.ReactNode}> = ({x = 0, y = 0, s = 1, r = 0, ox = W / 2, oy = H / 2, o = 1, mv, style, children}) =>
  o <= 0.001 ? null : (
    <div data-mv={mv ? '1' : undefined} style={{position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: o, transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`, transformOrigin: `${ox}px ${oy}px`, ...style}}>
      {children}
    </div>
  );

const typeBase: React.CSSProperties = {fontFeatureSettings: '"palt" 1', lineHeight: 1, whiteSpace: 'nowrap', position: 'absolute', fontFamily: F.noto};

// ---- 行のマスク表示 ----
// t0 から1文字ずつマスクの外からせり出し、t1 からマスクの外へ抜ける。x は anchor の位置、y は行の上端。
// dx, dy は読む間の行の流し（行ごと動かす。字形は変えない）
type Dir = 'up' | 'down' | 'left' | 'right';
export const Line: React.FC<{
  t: number;
  text: string;
  x: number;
  y: number;
  size: number;
  weight?: number;
  color?: string;
  t0: number;
  t1?: number;
  dir?: Dir;
  stagger?: number;
  dur?: number;
  outDur?: number;
  spacing?: number;
  anchor?: 'l' | 'c' | 'r';
  dx?: number;
  dy?: number;
  box?: boolean; // 図の中・面の上に置く語（図との重なりは数えない）
  mv?: boolean; // 図に付いて画面を出入りする語（画面端は数えない）
  colorAt?: (i: number) => string | undefined;
}> = ({t, text, x, y, size, weight = 900, color = C.ink, t0, t1 = 1e9, dir = 'up', stagger = 0.03, dur = 0.5, outDur = 0.35, spacing = 0, anchor = 'l', dx = 0, dy = 0, box, mv, colorAt}) => {
  if (t < t0 - 0.01) return null;
  const chars = Array.from(text);
  const n = chars.length;
  if (t > t1 + outDur + n * stagger * 0.6 + 0.05) return null;
  const pad = size * 0.16;
  const tx = anchor === 'c' ? '-50%' : anchor === 'r' ? '-100%' : '0';
  return (
    <div data-mv={mv ? '1' : undefined} style={{...typeBase, left: x, top: y - pad, transform: `translate(${dx}px, ${dy}px) translateX(${tx})`, overflow: 'hidden', padding: `${pad}px ${size * 0.04}px`, fontSize: size, fontWeight: weight, color, letterSpacing: `${spacing}em`}}>
      {chars.map((ch, i) => {
        const kin = outExpo(prog(t, t0 + i * stagger, t0 + i * stagger + dur));
        const kout = inExpo(prog(t, t1 + i * stagger * 0.6, t1 + i * stagger * 0.6 + outDur));
        const a = (1 - kin) * 125;
        const b = kout * 125;
        const tr = dir === 'up' ? `translateY(${a - b}%)` : dir === 'down' ? `translateY(${-a + b}%)` : dir === 'left' ? `translateX(${a * 1.2 - b * 1.2}%)` : `translateX(${-a * 1.2 + b * 1.2}%)`;
        return (
          <span key={i} data-ch={box ? 'box' : '1'} style={{display: 'inline-block', transform: tr, color: colorAt?.(i) ?? color}}>
            {ch === ' ' ? ' ' : ch}
          </span>
        );
      })}
    </div>
  );
};

// ---- 語の塊 ----
// マスクなしの一塊。x は anchor の位置、y は上端。拡縮・回転は anchor 側の縦中央を原点にする。
export const Txt: React.FC<{
  text: string;
  x: number;
  y: number;
  size: number;
  weight?: number;
  color?: string;
  anchor?: 'l' | 'c' | 'r';
  s?: number;
  r?: number;
  o?: number;
  spacing?: number;
  box?: boolean;
  mv?: boolean; // 着地・退場の途中（画面端は数えない）
  colorAt?: (i: number) => string | undefined;
}> = ({text, x, y, size, weight = 900, color = C.ink, anchor = 'l', s = 1, r = 0, o = 1, spacing = 0, box, mv, colorAt}) => {
  if (o <= 0.001 || s <= 0.001) return null;
  const tx = anchor === 'c' ? '-50%' : anchor === 'r' ? '-100%' : '0';
  return (
    <div data-mv={mv ? '1' : undefined} style={{...typeBase, left: x, top: y, opacity: o, transform: `rotate(${r}deg) scale(${s}) translateX(${tx})`, transformOrigin: '0 50%', fontSize: size, fontWeight: weight, color, letterSpacing: `${spacing}em`}}>
      {Array.from(text).map((ch, i) => (
        <span key={i} data-ch={box ? 'box' : '1'} style={{display: 'inline-block', color: colorAt?.(i) ?? color}}>
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </div>
  );
};

// 着地（塊ごと）: t0 から dur 秒で、拡大・回転・移動が収まる。mv は途中かどうか
export function slam(t: number, t0: number, dur = 0.5, from: {x?: number; y?: number; s?: number; r?: number} = {}) {
  const k = E_SLAM(prog(t, t0, t0 + dur));
  return {dx: (1 - k) * (from.x ?? 0), dy: (1 - k) * (from.y ?? 260), s: lerp(from.s ?? 1.5, 1, k), r: (1 - k) * (from.r ?? -6), o: t >= t0 ? 1 : 0, mv: during(t, t0 - 0.01, t0 + dur * 0.7)};
}

// ---- 色の面（矩形、左右・上下から伸びる）。k: 0→1 で開く ----
export const Plate: React.FC<{x: number; y: number; w: number; h: number; k?: number; color: string; from?: 'l' | 'r' | 't' | 'b'; r?: number; radius?: number; fig?: boolean; style?: React.CSSProperties}> = ({x, y, w, h, k = 1, color, from = 'l', r = 0, radius = 0, fig, style}) => {
  if (k <= 0.001) return null;
  const kk = clamp(k);
  const clip = from === 'l' ? `inset(0 ${(1 - kk) * 100}% 0 0)` : from === 'r' ? `inset(0 0 0 ${(1 - kk) * 100}%)` : from === 't' ? `inset(0 0 ${(1 - kk) * 100}% 0)` : `inset(${(1 - kk) * 100}% 0 0 0)`;
  return <div data-fig={fig ? '1' : undefined} style={{position: 'absolute', left: x, top: y, width: w, height: h, background: color, borderRadius: radius, transform: r ? `rotate(${r}deg)` : undefined, clipPath: kk < 1 ? clip : undefined, ...style}} />;
};

// ---- 一方向だけのぶれ（速い横移動・押し出しのつなぎ）。n は標準偏差（px） ----
export const DBlur: React.FC<{id: string; n: number; x?: boolean; children: React.ReactNode}> = ({id, n, x, children}) =>
  n < 0.3 ? (
    <>{children}</>
  ) : (
    <>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id={`db-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={x ? `${n.toFixed(2)} 0` : `0 ${n.toFixed(2)}`} />
        </filter>
      </svg>
      <div style={{position: 'absolute', inset: 0, filter: `url(#db-${id})`}}>{children}</div>
    </>
  );

// カメラ: 図の層だけに掛ける（文字は別の層）。(cx, cy) を画面中央へ、拡大 z、回転 r
export type CamS = {cx: number; cy: number; z: number; r?: number};
export const Cam: React.FC<{c: CamS; children: React.ReactNode}> = ({c, children}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `translate(${W / 2}px, ${H / 2}px) rotate(${c.r ?? 0}deg) scale(${c.z}) translate(${-c.cx}px, ${-c.cy}px)`, transformOrigin: '0 0'}}>{children}</div>
);
// 世界座標の点を画面座標へ（文字の層を図の位置に合わせる。回転は無視）
export const proj = (c: CamS, x: number, y: number): [number, number] => [W / 2 + (x - c.cx) * c.z, H / 2 + (y - c.cy) * c.z];
