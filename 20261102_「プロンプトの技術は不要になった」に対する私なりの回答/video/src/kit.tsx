// 文字と面の部品（DOM／CSS）。文字は行のマスクから入り、読む間は形を崩さない。
// 動きは行・塊・面・画面全体の移動／拡縮／回転で出す。すべてフレーム時刻から決まる純関数。
// 出発点: 20261031 の kit.tsx（元は 20261018 の v2/kit.tsx）。配色・地層・一行の入力は本作用。
import React from 'react';
import {staticFile} from 'remotion';
import {clamp, cubicBezier, ease, lerp, prog} from './lib/anim';

export const W = 1920;
export const H = 1080;
export const FPS = 30;

// 配色（plan.html「デザインシステム」「記号と色」: 1 記号 = 1 意味）
// 紙＝背景、墨＝本文と表層の線、灰＝他者の声・留保・補足、朱＝主張の決め語（とキャレットの縦棒）、地層 4 色＝深さ
export const C = {
  paper: '#F6F4EF',
  ink: '#14161A',
  gray: '#969BA3',
  grid: '#E9E6DF',
  red: '#FF4D1F',
  redPale: '#F7B8A4',
  white: '#ffffff',
  lime: '#d2ff1a',
};
export const STRATA = ['#E9E0CB', '#D8CAAE', '#B2BCC6', '#3E4A5C'];

// 書体は Noto Sans JP（可変ウェイト）だけ。見出し 800〜900、補助文 500〜700
export const F = {
  noto: 'NotoSansJPv',
};

// 動きの言語（plan.html）: E_SINK 沈む・昇る、E_SLAM 叩く、E_PUSH 押し出す。読む間（E_DRIFT）は線形
export const E_SINK = cubicBezier(0.65, 0, 0.35, 1);
export const E_SLAM = cubicBezier(0.16, 1, 0.3, 1);
export const E_PUSH = cubicBezier(0.55, 0, 1, 0.45);
export const outExpo = ease.outExpo;
export const inExpo = ease.inExpo;
export const inOut = ease.inOut;
export const out3 = ease.out;
export {clamp, lerp, prog};

export const typeBase: React.CSSProperties = {
  fontFeatureSettings: '"palt" 1',
  lineHeight: 1,
  whiteSpace: 'nowrap',
  position: 'absolute',
};

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

// 層: 位置・回転・拡縮。原点は (ox, oy)
export const Lay: React.FC<{x?: number; y?: number; s?: number; r?: number; ox?: number; oy?: number; o?: number; style?: React.CSSProperties; children: React.ReactNode}> = ({x = 0, y = 0, s = 1, r = 0, ox = W / 2, oy = H / 2, o = 1, style, children}) =>
  o <= 0.001 ? null : (
    <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, opacity: o, transform: `translate(${x}px, ${y}px) rotate(${r}deg) scale(${s})`, transformOrigin: `${ox}px ${oy}px`, ...style}}>{children}</div>
  );

export const Bg: React.FC<{color: string}> = ({color}) => <div style={{position: 'absolute', inset: -400, background: color}} />;

// ---- 行のマスク表示 ----
// t0 から1文字ずつマスクの外からせり出し、t1 からマスクの外へ抜ける。dir は入ってくる向き。
// anchor は x が行のどこを指すか（左端・中央・右端）。y は行の上端。
type Dir = 'up' | 'down' | 'left' | 'right';
export const Line: React.FC<{
  t: number;
  text: string;
  x: number;
  y: number;
  size: number;
  font?: string;
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
  colorAt?: (i: number) => string | undefined;
  style?: React.CSSProperties;
}> = ({t, text, x, y, size, font = F.noto, weight: weightIn, color = C.ink, t0, t1 = 1e9, dir = 'up', stagger = 0.03, dur = 0.55, outDur = 0.4, spacing = 0, anchor = 'l', colorAt, style}) => {
  if (t < t0 - 0.01) return null;
  const weight = weightIn ?? 900;
  const chars = Array.from(text);
  const n = chars.length;
  if (t > t1 + outDur + n * stagger * 0.6 + 0.05) return null;
  const pad = size * 0.16;
  const tx = anchor === 'c' ? '-50%' : anchor === 'r' ? '-100%' : '0';
  return (
    <div style={{...typeBase, left: x, top: y - pad, transform: `translateX(${tx})`, overflow: 'hidden', padding: `${pad}px ${size * 0.04}px`, fontFamily: font, fontSize: size, fontWeight: weight, color, letterSpacing: `${spacing}em`, ...style}}>
      {chars.map((ch, i) => {
        const kin = outExpo(prog(t, t0 + i * stagger, t0 + i * stagger + dur));
        const kout = inExpo(prog(t, t1 + i * stagger * 0.6, t1 + i * stagger * 0.6 + outDur));
        const a = (1 - kin) * 125;
        const b = kout * 125;
        const tr = dir === 'up' ? `translateY(${a - b}%)` : dir === 'down' ? `translateY(${-a + b}%)` : dir === 'left' ? `translateX(${a * 1.2 - b * 1.2}%)` : `translateX(${-a * 1.2 + b * 1.2}%)`;
        return (
          <span key={i} data-ch="1" style={{display: 'inline-block', transform: tr, color: colorAt?.(i) ?? color}}>
            {ch === ' ' ? ' ' : ch}
          </span>
        );
      })}
    </div>
  );
};

// ---- 縦組みの列（1文字ずつ上下から列のマスクに入る）。x は列の中心、y は上端 ----
export const VLine: React.FC<{t: number; text: string; x: number; y: number; size: number; font?: string; weight?: number; color?: string; t0: number; t1?: number; dir?: 'up' | 'down'; stagger?: number; gap?: number}> = ({t, text, x, y, size, font = F.noto, weight = 900, color = C.ink, t0, t1 = 1e9, dir = 'down', stagger = 0.06, gap = 0.04}) => {
  if (t < t0 - 0.01) return null;
  const chars = Array.from(text);
  if (t > t1 + 0.4 + chars.length * stagger + 0.05) return null;
  return (
    <div style={{position: 'absolute', left: x - size * 0.6, top: y, width: size * 1.2, overflow: 'hidden', fontFamily: font, fontWeight: weight, fontSize: size, color, lineHeight: 1, fontFeatureSettings: '"palt" 1'}}>
      {chars.map((ch, i) => {
        const kin = outExpo(prog(t, t0 + i * stagger, t0 + i * stagger + 0.6));
        const kout = inExpo(prog(t, t1 + i * stagger * 0.5, t1 + i * stagger * 0.5 + 0.4));
        // 列のマスクの外まで送る距離（px）。down は上から入って下へ抜け、up は下から入って上へ抜ける
        const ch1 = size * (1 + gap);
        const n = chars.length;
        const off = dir === 'down' ? -(1 - kin) * (i + 1.1) * ch1 + kout * (n - i + 0.1) * ch1 : (1 - kin) * (n - i + 0.1) * ch1 - kout * (i + 1.1) * ch1;
        return (
          <div key={i} data-ch="1" style={{height: ch1, textAlign: 'center', transform: `translateY(${off}px)`}}>
            {ch}
          </div>
        );
      })}
    </div>
  );
};

// ---- 色の面（矩形、左右・上下から伸びる）。k: 0→1 で開く ----
export const Plate: React.FC<{x: number; y: number; w: number; h: number; k: number; color: string; from?: 'l' | 'r' | 't' | 'b'; skew?: number; style?: React.CSSProperties; children?: React.ReactNode}> = ({x, y, w, h, k, color, from = 'l', skew = 0, style, children}) => {
  if (k <= 0.001) return null;
  const kk = clamp(k);
  const clip = from === 'l' ? `inset(0 ${(1 - kk) * 100}% 0 0)` : from === 'r' ? `inset(0 0 0 ${(1 - kk) * 100}%)` : from === 't' ? `inset(0 0 ${(1 - kk) * 100}% 0)` : `inset(${(1 - kk) * 100}% 0 0 0)`;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: w, height: h, transform: skew ? `skewX(${skew}deg)` : undefined, clipPath: clip, ...style}}>
      <div style={{position: 'absolute', inset: 0, background: color}} />
      {children}
    </div>
  );
};

// ---- 線を描く（SVG、stroke-dashoffset）。矢印の先端は線の終わりと同じ輪郭で描く ----
export const DrawLine: React.FC<{x1: number; y1: number; x2: number; y2: number; k: number; color?: string; w?: number; head?: number}> = ({x1, y1, x2, y2, k, color = C.ink, w = 5, head = 0}) => {
  if (k <= 0) return null;
  const ex = lerp(x1, x2, clamp(k));
  const ey = lerp(y1, y2, clamp(k));
  const a = Math.atan2(y2 - y1, x2 - x1);
  const hb = head * 0.85;
  const lx = head ? ex - Math.cos(a) * hb : ex;
  const ly = head ? ey - Math.sin(a) * hb : ey;
  const p1 = [ex - Math.cos(a - 0.45) * head, ey - Math.sin(a - 0.45) * head];
  const p2 = [ex - Math.cos(a + 0.45) * head, ey - Math.sin(a + 0.45) * head];
  return (
    <svg data-fig="1" style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
      <line x1={x1} y1={y1} x2={lx} y2={ly} stroke={color} strokeWidth={w} strokeLinecap="round" />
      {head > 0 && <path d={`M${ex},${ey} L${p1[0]},${p1[1]} L${p2[0]},${p2[1]} Z`} fill={color} stroke={color} strokeWidth={w * 0.5} strokeLinejoin="round" />}
    </svg>
  );
};

// ---- 点 ----
export const Dot: React.FC<{x: number; y: number; r: number; color: string; s?: number}> = ({x, y, r, color, s = 1}) =>
  s <= 0.001 ? null : <div data-fig="1" style={{position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: color, transform: `scale(${s})`}} />;

// 色の補間（#rrggbb）
export function mix(a: string, b: string, k: number) {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const kk = clamp(k);
  return `rgb(${pa.map((v, i) => Math.round(lerp(v, pb[i], kk))).join(',')})`;
}


// ---- 背景のグリッド（12 列の縦線）。dx で流す ----
export const Grid: React.FC<{dx?: number; o?: number}> = ({dx = 0, o = 1}) => {
  const col = (W - 96 * 2 + 24) / 12;
  return (
    <svg style={{position: 'absolute', left: 0, top: 0, opacity: o}} width={W} height={H}>
      {Array.from({length: 15}, (_, i) => {
        const x = (((96 + (i - 1) * col + dx) % (col * 15)) + col * 15) % (col * 15) - col;
        return <line key={i} x1={x} y1={0} x2={x} y2={H} stroke={C.grid} strokeWidth={1.5} />;
      })}
    </svg>
  );
};

// ---- 地層 ----
// 境目 i の高さ（x の関数）。基準 base に、時刻から決まる正弦のうねり（振幅 amp、周期 3 秒）を足す
export function stratumY(base: number, x: number, t: number, i: number, amp = 6) {
  return base + amp * (0.65 * Math.sin((x / 520) * 2 * Math.PI + t * ((2 * Math.PI) / 3) + i * 1.9) + 0.35 * Math.sin((x / 230) * 2 * Math.PI - t * 1.3 + i * 4.1));
}
function wavePts(fn: (x: number) => number, x0: number, x1: number, step = 24) {
  const pts: string[] = [];
  for (let x = x0; x <= x1 + step; x += step) {
    const xx = Math.min(x, x1);
    pts.push(`${xx.toFixed(1)},${fn(xx).toFixed(1)}`);
  }
  return pts;
}
// bounds: 4 本の境目の基準の高さ（上から ガイドライン／要求・要件／設計書／ハーネス の上端）。
// top が与えられれば最上の境目（表層の線）をその関数で描く（03 の水面）。帯は下へ bottom まで塗る
export const Strata: React.FC<{
  id: string;
  t: number;
  bounds: number[];
  x0?: number;
  x1?: number;
  bottom?: number;
  amp?: number;
  top?: (x: number) => number;
  edges?: number; // 境目の墨の線（0..1 で左から描く）
  texture?: number; // テクスチャの不透明度
  surface?: number; // 表層の線（墨）の描画 0..1
  n?: number; // 描く帯の数（上から）
}> = ({id, t, bounds, x0 = -200, x1 = W + 200, bottom = H + 400, amp = 6, top, edges = 0, texture = 0.2, surface = 1, n = 4}) => {
  const fns = bounds.map((b, i) => (i === 0 && top ? top : (x: number) => stratumY(b, x, t, i, i === 0 ? 0 : amp)));
  const paths = fns.map((fn) => `M${wavePts(fn, x0, x1).join(' L')} L${x1},${bottom} L${x0},${bottom} Z`);
  const top0 = Math.min(...wavePts(fns[0], x0, x1).map((p) => Number(p.split(',')[1])));
  return (
    <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={W} height={H}>
      <defs>
        <clipPath id={`st-${id}`}>
          <path d={paths[0]} />
        </clipPath>
      </defs>
      {paths.slice(0, n).map((d, i) => (
        <path key={i} d={d} fill={STRATA[i]} />
      ))}
      {texture > 0 && (
        <image href={staticFile('sediment.webp')} x={x0} y={top0} width={x1 - x0} height={Math.max(200, bottom - top0)} preserveAspectRatio="none" clipPath={`url(#st-${id})`} style={{mixBlendMode: 'multiply', opacity: texture}} />
      )}
      {edges > 0 &&
        fns.slice(1, n).map((fn, i) => {
          const k = clamp(edges * 1.6 - i * 0.2);
          return k > 0 ? <polyline key={i} points={wavePts(fn, x0, lerp(x0, x1, k)).join(' ')} fill="none" stroke={C.ink} strokeOpacity={0.35} strokeWidth={2} /> : null;
        })}
      {surface > 0 && <polyline data-fig="1" points={wavePts(fns[0], x0, lerp(x0, x1, clamp(surface))).join(' ')} fill="none" stroke={C.ink} strokeWidth={3} />}
    </svg>
  );
};

// ---- 一行の入力「› この機能を作って」。細く軽い（400）。› は灰、キャレットは朱の縦棒 ----
// typed: 0..1 で文字が打たれる。blink: キャレットの点滅の基準の秒（未指定なら点灯のまま）
export const PROMPT = 'この機能を作って';
export const Prompt: React.FC<{t: number; x: number; y: number; size: number; typed?: number; blink?: number; s?: number; o?: number}> = ({t, x, y, size, typed = 1, blink, s = 1, o = 1}) => {
  const chars = Array.from(PROMPT);
  const n = Math.round(chars.length * clamp(typed));
  const on = blink === undefined || t < blink || Math.floor((t - blink) / 0.25) % 2 === 0;
  if (o <= 0.001) return null;
  return (
    <div style={{...typeBase, left: x, top: y, fontFamily: F.noto, fontWeight: 400, fontSize: size, color: C.ink, letterSpacing: '0.02em', transform: `scale(${s})`, transformOrigin: '0 50%', opacity: o, display: 'flex', alignItems: 'center'}}>
      <span data-ch="1" style={{color: C.gray, marginRight: size * 0.35}}>›</span>
      {chars.slice(0, n).map((ch, i) => (
        <span key={i} data-ch="1" style={{display: 'inline-block'}}>
          {ch}
        </span>
      ))}
      <span style={{display: 'inline-block', width: Math.max(3, size * 0.07), height: size * 1.05, marginLeft: size * 0.08, background: C.red, opacity: on ? 1 : 0}} />
    </div>
  );
};

// ---- 縦方向だけのぶれ（Whip pan・Crane のつなぎ）。n は標準偏差（px） ----
export const VBlur: React.FC<{id: string; n: number; children: React.ReactNode}> = ({id, n, children}) =>
  n < 0.3 ? (
    <>{children}</>
  ) : (
    <>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id={`vb-${id}`} x="-5%" y="-20%" width="110%" height="140%">
          <feGaussianBlur stdDeviation={`0 ${n.toFixed(2)}`} />
        </filter>
      </svg>
      <div style={{position: 'absolute', inset: 0, filter: `url(#vb-${id})`}}>{children}</div>
    </>
  );
