// 図の部品（盤・ピクセル地図の窓・コマ・十字キー・矢印・区のブロック・折れ線）。
// 盤と地図は「中心・一辺・回転」の幾何（Geo）で置き、縁のラベル（北・東＝右など）はその幾何から
// 画面座標を計算して、文字の層に正立で置く（文字は回さない。plan.html「動きの言語」の「回す」）。
// すべてフレーム時刻から決まる純関数で使う。
import React from 'react';
import {Img, staticFile} from 'remotion';
import {C, F, Line, clamp, lerp, mix, prog} from './kit';
import {cubicBezier} from './lib/anim';

export type Geo = {x: number; y: number; size: number; rot: number};
const rad = (d: number) => (d * Math.PI) / 180;

// 盤・地図の局所座標 (u, v)（0..1、回転前の左上が 0,0）→ 画面座標
export function pt(g: Geo, u: number, v: number): [number, number] {
  const dx = (u - 0.5) * g.size;
  const dy = (v - 0.5) * g.size;
  const c = Math.cos(rad(g.rot));
  const s = Math.sin(rad(g.rot));
  return [g.x + dx * c - dy * s, g.y + dx * s + dy * c];
}

// 縁の外側の点（side: 上=北 'n'、右 'e'、下 's'、左 'w'）。off は縁からの距離（px）
export function edgePt(g: Geo, side: 'n' | 'e' | 's' | 'w', off: number): [number, number] {
  const [u, v, nx, ny] = side === 'n' ? [0.5, 0, 0, -1] : side === 'e' ? [1, 0.5, 1, 0] : side === 's' ? [0.5, 1, 0, 1] : [0, 0.5, -1, 0];
  const [x, y] = pt(g, u, v);
  const c = Math.cos(rad(g.rot));
  const s = Math.sin(rad(g.rot));
  return [x + (nx * c - ny * s) * off, y + (nx * s + ny * c) * off];
}

// コマの位置（u, v）を回転の中心にしたまま盤を回す: 中心を逆算する
export function pivotGeo(px: number, py: number, u: number, v: number, size: number, rot: number): Geo {
  const g0 = {x: 0, y: 0, size, rot};
  const [ox, oy] = pt(g0, u, v);
  return {x: px - ox, y: py - oy, size, rot};
}

export const lerpGeo = (a: Geo, b: Geo, k: number): Geo => ({x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), size: lerp(a.size, b.size, k), rot: lerp(a.rot, b.rot, k)});

// 吸着: 少し行き過ぎてから収まる
export const E_SNAP = cubicBezier(0.34, 1.45, 0.64, 1);

// コマの移動: keys = [時刻, u, v]。区間ごとに 0.5 秒で吸着しながら移る。lift はその間の浮き
export function pieceAt(t: number, keys: [number, number, number][], dur = 0.5): {u: number; v: number; lift: number} {
  let u = keys[0][1];
  let v = keys[0][2];
  let lift = 0;
  for (let i = 1; i < keys.length; i++) {
    const [t0, nu, nv] = keys[i];
    const k = prog(t, t0, t0 + dur);
    if (k <= 0) break;
    u = lerp(u, nu, E_SNAP(k));
    v = lerp(v, nv, E_SNAP(k));
    lift = Math.sin(Math.PI * clamp(k * 1.15)) * 1;
  }
  return {u, v, lift};
}

// ---- ピクセル地図の窓（rpg-map.png）。北は画像の上 ----
export const MapWin: React.FC<{g: Geo; o?: number; imgO?: number; tilt?: number; border?: number}> = ({g, o = 1, imgO = 1, tilt = 0, border = 5}) =>
  o <= 0.001 ? null : (
    <div
      data-fig="1"
      style={{
        position: 'absolute',
        left: g.x - g.size / 2,
        top: g.y - g.size / 2,
        width: g.size,
        height: g.size,
        opacity: o,
        transform: `perspective(2200px) rotateX(${tilt}deg) rotate(${g.rot}deg)`,
        boxShadow: `0 ${g.size * 0.02}px ${g.size * 0.05}px rgba(60,45,30,0.18)`,
        background: C.paper,
      }}
    >
      <Img src={staticFile('rpg-map.png')} style={{position: 'absolute', inset: 0, width: '100%', height: '100%', imageRendering: 'pixelated', opacity: imgO}} />
      <div style={{position: 'absolute', inset: 0, border: `${border}px solid ${C.blue}`}} />
    </div>
  );

// ---- 盤（n×n の格子）。kind: fixed＝青の正立の盤（北が上で固定）、turn＝暖灰の回る盤 ----
// turnK で fixed→turn の色へ移る（06 の多数派の盤）。draw は線を描く進み（0..1）、fill は面の濃さ
export const Board: React.FC<{g: Geo; turnK?: number; n?: number; draw?: number; fill?: number; o?: number; tilt?: number; northW?: number}> = ({g, turnK = 0, n = 3, draw = 1, fill = 1, o = 1, tilt = 0, northW}) => {
  if (o <= 0.001) return null;
  const S = g.size;
  const line = mix(C.blue, C.turnLine, turnK);
  const face = mix(C.blueFill, C.turnFill, turnK);
  const lw = Math.max(2, S * 0.008);
  const nw = northW ?? Math.max(5, S * 0.022);
  const L = (len: number) => ({strokeDasharray: len, strokeDashoffset: len * (1 - clamp(draw))});
  const cells = Array.from({length: n - 1}, (_, i) => ((i + 1) / n) * S);
  return (
    <div data-fig="1" style={{position: 'absolute', left: g.x - S / 2, top: g.y - S / 2, width: S, height: S, opacity: o, transform: `perspective(2200px) rotateX(${tilt}deg) rotate(${g.rot}deg)`}}>
      <svg width={S} height={S} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <rect x={0} y={0} width={S} height={S} fill={face} opacity={clamp(fill) * 0.92} />
        {cells.map((p, i) => (
          <React.Fragment key={i}>
            <line x1={p} y1={0} x2={p} y2={S} stroke={line} strokeWidth={lw} style={L(S)} />
            <line x1={0} y1={p} x2={S} y2={p} stroke={line} strokeWidth={lw} style={L(S)} />
          </React.Fragment>
        ))}
        <path d={`M0,0 L0,${S} L${S},${S} L${S},0`} fill="none" stroke={line} strokeWidth={lw} style={L(S * 3)} />
        {/* 北の辺は太く */}
        <line x1={0} y1={0} x2={S} y2={0} stroke={line} strokeWidth={nw} strokeLinecap="square" style={L(S)} />
      </svg>
    </div>
  );
};

// 盤の (u, v) のマス中心。col, row は 0..n-1（小数で移動の途中）
export const cell = (col: number, row: number, n = 3): [number, number] => [(col + 0.5) / n, (row + 0.5) / n];

// ---- 自分のコマ（橙の角丸）。lift で浮き、影が離れる ----
export const Piece: React.FC<{x: number; y: number; size: number; lift?: number; o?: number; s?: number}> = ({x, y, size, lift = 0, o = 1, s = 1}) =>
  o <= 0.001 || s <= 0.001 ? null : (
    <>
      <div style={{position: 'absolute', left: x - size / 2, top: y - size / 2 + size * 0.18, width: size, height: size, borderRadius: size * 0.22, background: 'rgba(70,40,20,0.22)', filter: `blur(${2 + lift * size * 0.12}px)`, opacity: o * (1 - lift * 0.4), transform: `scale(${s * (1 - lift * 0.1)})`}} />
      <div
        data-fig="piece"
        style={{position: 'absolute', left: x - size / 2, top: y - size / 2 - lift * size * 0.5, width: size, height: size, borderRadius: size * 0.22, background: C.piece, opacity: o, transform: `scale(${s * (1 + lift * 0.12)})`, boxShadow: `inset 0 ${-size * 0.08}px 0 rgba(140,50,0,0.25)`}}
      />
    </>
  );

// ---- 縁のラベル（北・東＝右 など）。正立の文字で、(x, y) を中心に置く ----
export const EdgeLabel: React.FC<{t: number; text: string; x: number; y: number; size?: number; color?: string; t0: number; t1?: number; dir?: 'up' | 'down' | 'left' | 'right'}> = ({t, text, x, y, size = 40, color = C.blue, t0, t1, dir = 'up'}) => (
  <Line t={t} text={text} x={x} y={y - size / 2} size={size} color={color} t0={t0} t1={t1} dir={dir} anchor="c" stagger={0.02} dur={0.4} inBox />
);

// ---- 一体型の十字キー（dpad-*.png。通常・上・右の 3 状態）。press で沈む ----
export const DPad: React.FC<{x: number; y: number; size: number; state: 'n' | 'up' | 'right'; press?: number; r?: number; o?: number}> = ({x, y, size, state, press = 0, r = 0, o = 1}) =>
  o <= 0.001 ? null : (
    <div data-fig="1" style={{position: 'absolute', left: x - size / 2, top: y - size / 2, width: size, height: size, opacity: o, transform: `rotate(${r}deg) translateY(${press * size * 0.012}px) scale(${1 - press * 0.025})`}}>
      <Img src={staticFile(state === 'n' ? 'dpad-neutral.png' : state === 'up' ? 'dpad-up.png' : 'dpad-right.png')} style={{width: '100%', height: '100%'}} />
    </div>
  );

// ---- 上向きの矢印と「前」（09 の自分視点だけ） ----
export const Arrow: React.FC<{x: number; y: number; w: number; h: number; o?: number; s?: number; label?: boolean}> = ({x, y, w, h, o = 1, s = 1, label = true}) => {
  if (o <= 0.001) return null;
  const head = h * 0.42;
  const sw = w * 0.46;
  return (
    <div data-fig="1" style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, opacity: o, transform: `scale(${s})`, transformOrigin: '50% 100%'}}>
      <svg width={w} height={h} style={{position: 'absolute', left: 0, top: 0}}>
        <path d={`M${w / 2},0 L${w},${head} L${(w + sw) / 2},${head} L${(w + sw) / 2},${h} L${(w - sw) / 2},${h} L${(w - sw) / 2},${head} L0,${head} Z`} fill={C.arrow} />
      </svg>
      {label && (
        <div style={{position: 'absolute', left: 0, width: w, top: head + (h - head) * 0.5 - w * 0.13, textAlign: 'center', fontFamily: F.noto, fontWeight: 700, fontSize: w * 0.26, lineHeight: 1, color: C.gray}}>
          <span data-ch="box">前</span>
        </div>
      )}
    </div>
  );
};

// ---- 区のブロック（08）。label は中の左寄せの名前 ----
export const Block: React.FC<{x: number; y: number; w: number; h: number; fill: string; label?: string; labelK?: number; o?: number; s?: number}> = ({x, y, w, h, fill, label, labelK = 1, o = 1, s = 1}) =>
  o <= 0.001 ? null : (
    <div data-fig="1" style={{position: 'absolute', left: x, top: y, width: w, height: h, opacity: o, background: fill, border: `4px solid ${C.blue}`, transform: `scale(${s})`, boxSizing: 'border-box'}}>
      {label && (
        <div style={{position: 'absolute', left: h * 0.3, top: h / 2 - h * 0.2, height: h * 0.4, overflow: 'hidden', fontFamily: F.noto, fontWeight: 700, fontSize: h * 0.3, lineHeight: 1.3, color: C.ink, fontFeatureSettings: '"palt" 1', whiteSpace: 'nowrap'}}>
          <span data-ch="box" style={{display: 'inline-block', transform: `translateY(${(1 - labelK) * 130}%)`}}>
            {label}
          </span>
        </div>
      )}
    </div>
  );

// ---- 折れ線（09 の地下）。points を順に描く ----
export const Poly: React.FC<{pts: [number, number][]; k: number; color?: string; w?: number}> = ({pts, k, color = C.arrow, w = 6}) => {
  if (k <= 0) return null;
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return (
    <svg style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}} width={1} height={1}>
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke={color} strokeWidth={w} strokeLinejoin="round" strokeDasharray={len} strokeDashoffset={len * (1 - clamp(k))} />
    </svg>
  );
};
