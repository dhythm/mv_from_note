// 文字と面の部品（DOM／CSS）。文字は行のマスクから入り、読む間は形を崩さない。
// 動きは行・塊・面・画面全体の移動／拡縮／回転で出す。すべてフレーム時刻から決まる純関数。
// 出発点: 20261018 の v2/kit.tsx（docs/techniques/typography-motion.md）。配色・書体は本作用。
import React from 'react';
import {OffthreadVideo, Sequence, staticFile} from 'remotion';
import {clamp, ease, lerp, prog} from './lib/anim';

export const W = 1920;
export const H = 1080;
export const FPS = 30;

// 配色（plan.html「記号と色」: 1 記号 = 1 意味）
// 灰の円＝慣れた領域（手放したもの）、橙＝未経験の領域＝頭を使う場所、青＝AI、朱＝恐怖・責任、白い札＝素材動画の上の文字の台
export const C = {
  paper: '#fbf8f1',
  ink: '#1e2430',
  gray: '#8c93a0',
  grayPale: '#e6e8ec',
  grayText: '#a9afb9',
  orange: '#e87800',
  orangePale: '#ffe6c2',
  blue: '#2f6fe4',
  bluePale: '#dfe8fb',
  red: '#e8452c',
  white: '#ffffff',
  lime: '#d2ff1a',
};

// 書体は Noto Sans JP（可変ウェイト）だけ。見出し 800〜900、補助文 500〜700
export const F = {
  noto: 'NotoSansJPv',
};

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
export const DrawLine: React.FC<{x1: number; y1: number; x2: number; y2: number; k: number; color?: string; w?: number; head?: number}> = ({x1, y1, x2, y2, k, color = C.orange, w = 8, head = 0}) => {
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

// ---- 素材動画（1280×720）。absStart は本編の絶対秒（この秒に素材の頭を出す）、rate は再生速度 ----
// 箱 (w, h) を覆う大きさ（cover × zoom）で、素材の (fx, fy)（0..1）を箱の中央に置く。はみ出しは箱で切る
export const Footage: React.FC<{src: string; absStart: number; srcDur: number; rate?: number; w: number; h: number; fx?: number; fy?: number; zoom?: number}> = ({src, absStart, srcDur, rate = 1, w, h, fx = 0.5, fy = 0.5, zoom = 1}) => {
  const sc = Math.max(w / 1280, h / 720) * zoom;
  const vw = 1280 * sc;
  const vh = 720 * sc;
  const left = clamp(w / 2 - fx * vw, w - vw, 0);
  const top = clamp(h / 2 - fy * vh, h - vh, 0);
  return (
    <Sequence from={Math.round(absStart * FPS)} durationInFrames={Math.ceil((srcDur / rate) * FPS)} layout="none">
      <OffthreadVideo muted src={staticFile(src)} playbackRate={rate} style={{position: 'absolute', left, top, width: vw, height: vh}} />
    </Sequence>
  );
};

// ---- 白い角丸の札（素材動画・図の上で文字を読ませる台）。文字は 1 枚の札ごと動かす ----
export const Card: React.FC<{text: string; x: number; y: number; size: number; color?: string; weight?: number; padX?: number; padY?: number; anchor?: 'l' | 'c' | 'r'; border?: string; style?: React.CSSProperties}> = ({text, x, y, size, color = C.ink, weight = 900, padX, padY, anchor = 'l', border, style}) => {
  const px = padX ?? size * 0.32;
  const py = padY ?? size * 0.2;
  const tx = anchor === 'c' ? '-50%' : anchor === 'r' ? '-100%' : '0';
  return (
    <div style={{position: 'absolute', left: x, top: y, transform: `translateX(${tx})`, background: C.white, borderRadius: size * 0.16, padding: `${py}px ${px}px`, boxShadow: '0 6px 22px rgba(30,36,48,0.10)', border, ...style}}>
      <div style={{...typeBase, position: 'relative', fontFamily: F.noto, fontWeight: weight, fontSize: size, color}}>
        {Array.from(text).map((ch, i) => (
          <span key={i} data-ch="1" style={{display: 'inline-block'}}>
            {ch}
          </span>
        ))}
      </div>
    </div>
  );
};

// ---- 円（領域）。中心 (x, y)、半径 r ----
export const Circle: React.FC<{x: number; y: number; r: number; fill: string; stroke?: string; sw?: number; o?: number; children?: React.ReactNode}> = ({x, y, r, fill, stroke, sw = 6, o = 1, children}) =>
  r <= 0.5 || o <= 0.001 ? null : (
    <div style={{position: 'absolute', left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: '50%', background: fill, boxShadow: stroke ? `inset 0 0 0 ${sw}px ${stroke}` : undefined, opacity: o}}>
      {children}
    </div>
  );
