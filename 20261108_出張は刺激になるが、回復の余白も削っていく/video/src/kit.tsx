// 文字と面の部品（DOM／CSS）。文字は行のマスクから入り、読む間は形を崩さない。
// 動きは行・塊・面・画面全体の移動／拡縮／回転で出す。すべてフレーム時刻から決まる純関数。
// 出発点: 20261105 の kit.tsx（元は 20261018 の v2/kit.tsx）。配色は本作用。コマ・粒は削除。
import React from 'react';
import {clamp, cubicBezier, ease, lerp, prog} from './lib/anim';

export const W = 1920;
export const H = 1080;
export const FPS = 30;

// 配色（plan.html「デザインシステム（映像）」「記号と色」: 1 記号 = 1 意味。本編にライムは使わない）
// 紙＝地、墨＝主役の語・箱の外枠、灰字＝前置き・補足、琥珀＝得られたもの、灰＝移動・予定などの負荷、
// 白＝回復に使える余白、緑＝余白の境界
export const C = {
  paper: '#F6F3EC',
  ink: '#1C1915',
  gray: '#6B655C',
  grid: '#ECE7DC',
  amber: '#E07A2F',
  load: '#D6CEC0',
  room: '#FFFDF8',
  green: '#2F6F62',
  white: '#ffffff',
};

// 書体は Noto Sans JP（可変ウェイト）だけ。plan のとおり 700（主文）と 400（補足）
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
  inBox?: boolean; // 箱の中に置く語（画面端の検査はするが、箱との重なりは数えない）
  style?: React.CSSProperties;
}> = ({inBox, t, text, x, y, size, font = F.noto, weight: weightIn, color = C.ink, t0, t1 = 1e9, dir = 'up', stagger = 0.03, dur = 0.55, outDur = 0.4, spacing = 0, anchor = 'l', colorAt, style}) => {
  if (t < t0 - 0.01) return null;
  const weight = weightIn ?? 700;
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
          <span key={i} data-ch={inBox ? 'box' : '1'} style={{display: 'inline-block', transform: tr, color: colorAt?.(i) ?? color}}>
            {ch === ' ' ? ' ' : ch}
          </span>
        );
      })}
    </div>
  );
};

// ---- 縦組みの列（1文字ずつ上下から列のマスクに入る）。x は列の中心、y は上端 ----
export const VLine: React.FC<{t: number; text: string; x: number; y: number; size: number; font?: string; weight?: number; color?: string; t0: number; t1?: number; dir?: 'up' | 'down'; stagger?: number; gap?: number}> = ({t, text, x, y, size, font = F.noto, weight = 700, color = C.ink, t0, t1 = 1e9, dir = 'down', stagger = 0.06, gap = 0.04}) => {
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

// ---- 縦方向だけのぶれ（Whip pan・Crane のつなぎ）。n は標準偏差（px） ----
export const VBlur: React.FC<{id: string; n: number; x?: boolean; children: React.ReactNode}> = ({id, n, x, children}) =>
  n < 0.3 ? (
    <>{children}</>
  ) : (
    <>
      <svg width={0} height={0} style={{position: 'absolute'}}>
        <filter id={`vb-${id}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={x ? `${n.toFixed(2)} 0` : `0 ${n.toFixed(2)}`} />
        </filter>
      </svg>
      <div style={{position: 'absolute', inset: 0, filter: `url(#vb-${id})`}}>{children}</div>
    </>
  );

// カメラ: 図の層だけに掛ける（文字は別の層）。(cx, cy) を画面中央へ、拡大 z、回転 r
export const Cam: React.FC<{cx?: number; cy?: number; z?: number; r?: number; children: React.ReactNode}> = ({cx = W / 2, cy = H / 2, z = 1, r = 0, children}) => (
  <div style={{position: 'absolute', left: 0, top: 0, width: W, height: H, transform: `translate(${W / 2}px, ${H / 2}px) rotate(${r}deg) scale(${z}) translate(${-cx}px, ${-cy}px)`, transformOrigin: '0 0'}}>{children}</div>
);

// カメラの状態から、世界座標の点を画面座標へ写す（文字の層を図の位置に合わせるため。回転は使わない）
export type CamS = {cx: number; cy: number; z: number};
export const proj = (c: CamS, x: number, y: number): [number, number] => [W / 2 + (x - c.cx) * c.z, H / 2 + (y - c.cy) * c.z];

// 背景の薄いグリッド。カメラの移動に合わせて流し、画面全体が動いて見えるようにする
export const CamGrid: React.FC<{c: CamS; o?: number}> = ({c, o = 1}) => {
  const step = 160 * c.z;
  if (step < 24) return null;
  const ox = (((W / 2 - c.cx * c.z) % step) + step) % step;
  const oy = (((H / 2 - c.cy * c.z) % step) + step) % step;
  const nx = Math.ceil(W / step) + 1;
  const ny = Math.ceil(H / step) + 1;
  return (
    <svg style={{position: 'absolute', left: 0, top: 0, opacity: o}} width={W} height={H}>
      {Array.from({length: nx}, (_, i) => (
        <line key={`x${i}`} x1={ox + i * step} y1={0} x2={ox + i * step} y2={H} stroke={C.grid} strokeWidth={1.5} />
      ))}
      {Array.from({length: ny}, (_, i) => (
        <line key={`y${i}`} x1={0} y1={oy + i * step} x2={W} y2={oy + i * step} stroke={C.grid} strokeWidth={1.5} />
      ))}
    </svg>
  );
};

// 叩き込み（塊ごと）: t0 から dur 秒で、拡大・回転・下からの移動が収まる
export function slam(t: number, t0: number, dur = 0.55, from = {y: 220, s: 1.35, r: -7}) {
  const k = E_SLAM(prog(t, t0, t0 + dur));
  return {y: (1 - k) * from.y, s: lerp(from.s, 1, k), r: (1 - k) * from.r, o: prog(t, t0 - 0.01, t0 + 0.08)};
}
