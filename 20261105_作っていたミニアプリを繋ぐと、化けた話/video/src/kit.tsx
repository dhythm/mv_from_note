// 文字と面の部品（DOM／CSS）。文字は行のマスクから入り、読む間は形を崩さない。
// 動きは行・塊・面・画面全体の移動／拡縮／回転で出す。すべてフレーム時刻から決まる純関数。
// 出発点: 20261102 の kit.tsx（元は 20261018 の v2/kit.tsx）。配色とコマ・粒は本作用。
import React from 'react';
import {clamp, cubicBezier, ease, lerp, prog} from './lib/anim';

export const W = 1920;
export const H = 1080;
export const FPS = 30;

// 配色（plan.html「記号と色」: 1 記号 = 1 意味）
// 紙＝地、墨＝主役の語、灰字＝前置き・補足、青＝ミニアプリ（コマ）、灰のコマ＝止めたもの、
// 緑＝ちゃんと機能している、オレンジ＝仕事の流れ（粒・矢印・？）、赤＝06 の不具合だけ
export const C = {
  paper: '#F7F5EF',
  ink: '#1A1A1A',
  gray: '#6E6E6E',
  grid: '#ECE9E1',
  blue: '#2B59FF',
  stop: '#BEBEBE',
  green: '#1A9E5A',
  orange: '#FF7A00',
  red: '#E5322D',
  white: '#ffffff',
  lime: '#d2ff1a',
};

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

// ---- コマ（ミニアプリ）: 左に凹（入口）、右に凸（出口）のついた四角。中心 (x, y)、本体の幅 w ----
// 凹凸の向き（左が入口・右が出口）は全編で固定。隣のコマを x + w に置くと、出口が次の入口に噛み合う。
export const KH = 0.56; // 高さ / 幅
export const KT = 0.13; // 凸の長さ / 幅
export function komaPath(w: number) {
  const h = w * KH;
  const t = w * KT;
  const a = h * 0.34;
  const b = h * 0.66;
  return `M0,0 H${w} V${a} H${w + t} V${b} H${w} V${h} H0 V${b} H${t} V${a} H0 Z`;
}
export const Koma: React.FC<{
  x: number;
  y: number;
  w: number;
  color?: string;
  s?: number;
  r?: number;
  o?: number;
  frame?: number; // 緑の枠（0..1 で一周描く）
  label?: string;
  labelSize?: number;
  push?: number; // 押される（0..1、縦に少し潰れる）
  z?: number; // 奥への沈み（0..1。小さく・薄く）
}> = ({x, y, w, color = C.blue, s = 1, r = 0, o = 1, frame = 0, label, labelSize, push = 0, z = 0}) => {
  if (o <= 0.001 || s <= 0.001) return null;
  const h = w * KH;
  const t = w * KT;
  const pad = w * 0.09;
  const fw = w + pad * 2;
  const fh = h + pad * 2;
  const per = 2 * (fw + fh);
  const zs = 1 - z * 0.28;
  return (
    <div
      data-koma="1"
      style={{
        position: 'absolute',
        left: x - w / 2,
        top: y - h / 2,
        width: w,
        height: h,
        opacity: o * (1 - z * 0.25),
        transform: `rotate(${r}deg) scale(${s * zs * (1 + push * 0.06)}, ${s * zs * (1 - push * 0.12)})`,
        transformOrigin: '50% 50%',
      }}
    >
      <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={w} height={h}>
        {/* 紙色の細い縁: 噛み合ったコマどうしの継ぎ目を見せる（つないでも 1 つの塊にならない） */}
        <path d={komaPath(w)} fill={color} stroke={C.paper} strokeWidth={Math.max(2.5, w * 0.022)} strokeLinejoin="miter" />
        {frame > 0 && (
          <rect x={-pad} y={-pad} width={fw + t * 0.4} height={fh} rx={w * 0.04} fill="none" stroke={C.green} strokeWidth={Math.max(4, w * 0.03)} strokeDasharray={per + t} strokeDashoffset={(per + t) * (1 - clamp(frame))} />
        )}
      </svg>
      {label && (
        <div style={{...typeBase, left: t, width: w - t, top: 0, height: h, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.noto, fontWeight: 800, fontSize: labelSize ?? w * 0.2, color: C.white}}>
          <span data-ch-in="1">{label}</span>
        </div>
      )}
    </div>
  );
};

// ---- 粒（仕事の流れ）。短い尾（約 0.3 秒の残像）は、少し前の位置 pos(t - d) を薄く重ねる ----
export const Particle: React.FC<{t: number; pos: (t: number) => [number, number] | null; r?: number; trail?: number; color?: string}> = ({t, pos, r = 12, trail = 0.3, color = C.orange}) => {
  const ghosts = [0, 0.06, 0.12, 0.2, 0.3].filter((d) => d <= trail);
  return (
    <>
      {ghosts
        .slice()
        .reverse()
        .map((d, i) => {
          const p = pos(t - d);
          if (!p) return null;
          const k = 1 - d / Math.max(0.0001, trail + 0.05);
          return <div key={i} style={{position: 'absolute', left: p[0] - r * (d ? 0.8 : 1), top: p[1] - r * (d ? 0.8 : 1), width: r * 2 * (d ? 0.8 : 1), height: r * 2 * (d ? 0.8 : 1), borderRadius: '50%', background: color, opacity: d ? k * 0.35 : 1}} />;
        })}
    </>
  );
};

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
