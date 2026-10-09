// キネティックタイポグラフィの文字群。1文字ずつの登場・退場と、読む区間も止まらない群の運動（pose）を
// すべて時刻 t から計算する。読む区間に入った文字には data-settled を付け、検査用に画面外・重なりを測れるようにする。
import React from 'react';
import {BEAT, beatEnv, clamp, ease, hash, lerp, prog} from '../lib/anim';

export const LIME = '#d2ff1a';
export const INK = '#f4f1ea';
export const FONTS = {
  sans: '"NotoJP", sans-serif',
  mincho: '"BIZMincho", serif',
  dot: '"Dot16", monospace',
} as const;

export type Extra = {tx?: number; ty?: number; sc?: number; rot?: number; op?: number};
export type Tok = {
  t: string;
  s?: number;
  c?: string;
  f?: keyof typeof FONTS;
  w?: number;
  em?: boolean;
  dy?: number;
  // 退場しない（次の場面へ持ち越す字）
  stay?: boolean;
  // 登場しない（前の場面から持ち越された字）
  carried?: boolean;
  extra?: (t: number, i: number) => Extra;
};
export type Pose = {x: number; y: number; rot?: number; scale?: number; rx?: number; ry?: number; skew?: number; z?: number; opacity?: number};
export type Enter = 'slam' | 'flip' | 'scatter' | 'drop' | 'type' | 'slide' | 'rise' | 'cross' | 'none';
export type Exit = 'fly' | 'sink' | 'burst' | 'zoom' | 'slide' | 'none' | 'fall';

export type KineticProps = {
  id: string;
  lines: Tok[][];
  t: number;
  t0: number;
  t1: number;
  pose: (t: number) => Pose;
  enter?: Enter;
  exit?: Exit;
  enterDur?: number;
  exitDur?: number;
  stagger?: number;
  exitStagger?: number;
  dir?: [number, number];
  exitDir?: [number, number];
  align?: 'left' | 'center' | 'right';
  lineGap?: number;
  size?: number;
  weight?: number;
  color?: string;
  font?: keyof typeof FONTS;
  seed?: number;
  wave?: number;
  lineDelay?: number[];
  lineShift?: (t: number, line: number) => [number, number, number];
  // 縦書き（行＝列、右から左）
  vertical?: boolean;
  // 検査から外す（装飾の文字）
  decorative?: boolean;
};

type CharState = {tx: number; ty: number; rot: number; rx: number; ry: number; sc: number; op: number; blur: number; settled: boolean; xop: number};

function enterState(kind: Enter, k: number, seed: number, dir: [number, number]): CharState {
  const base: CharState = {tx: 0, ty: 0, rot: 0, rx: 0, ry: 0, sc: 1, op: 1, blur: 0, settled: k >= 1, xop: 0};
  if (k >= 1 || kind === 'none') return base;
  const h1 = hash(seed) * 2 - 1;
  const h2 = hash(seed + 7.3) * 2 - 1;
  switch (kind) {
    case 'slam': {
      const e = ease.outExpo(k);
      return {...base, sc: lerp(3.4, 1, e), op: clamp(k * 3.5), blur: (1 - e) * 9, rot: (1 - e) * h1 * 14, ty: (1 - e) * -40};
    }
    case 'flip': {
      const e = ease.outBack(k, 2.2);
      return {...base, rx: lerp(-105, 0, e), ty: lerp(60, 0, ease.out(k)), op: clamp(k * 4)};
    }
    case 'scatter': {
      const e = ease.outQuint(k);
      return {...base, tx: (1 - e) * h1 * 520, ty: (1 - e) * h2 * 300, rot: (1 - e) * h1 * 260, sc: lerp(0.25, 1, e), op: clamp(k * 3)};
    }
    case 'drop': {
      const e = ease.outBack(k, 1.4);
      return {...base, ty: lerp(-340, 0, e), rot: (1 - ease.out(k)) * h1 * 40, op: clamp(k * 5)};
    }
    case 'type': {
      const e = ease.out(clamp(k * 1.6));
      return {...base, sc: lerp(1.9, 1, e), op: k > 0.02 ? 1 : 0, ty: (1 - e) * 16};
    }
    case 'slide': {
      const e = ease.outExpo(k);
      return {...base, tx: (1 - e) * dir[0] * 620, ty: (1 - e) * dir[1] * 620, op: clamp(k * 3), blur: (1 - e) * 6, ry: (1 - e) * dir[0] * -50};
    }
    case 'rise': {
      const e = ease.outBack(k, 1.6);
      return {...base, ty: lerp(120, 0, e), ry: (1 - ease.out(k)) * 90, sc: lerp(0.6, 1, e), op: clamp(k * 3)};
    }
    case 'cross': {
      // ×が回転しながら飛んできて、字へ戻る
      const e = ease.outQuint(k);
      const swap = clamp((k - 0.55) / 0.3);
      return {...base, tx: (1 - e) * h1 * 460, ty: (1 - e) * (h2 * 260 + 160), rot: (1 - e) * 540 * Math.sign(h1 || 1), sc: lerp(0.5, 1, e), op: swap, xop: clamp(k * 6) * (1 - swap)};
    }
  }
  return base;
}

function exitState(kind: Exit, k: number, seed: number, dir: [number, number]): Partial<CharState> {
  if (k <= 0 || kind === 'none') return {};
  const h1 = hash(seed + 3.1) * 2 - 1;
  const h2 = hash(seed + 9.7) * 2 - 1;
  const e = ease.in(k);
  const fade = 1 - clamp((k - 0.55) / 0.45);
  switch (kind) {
    case 'fly':
      return {tx: dir[0] * 1500 * e + h1 * 60 * k, ty: dir[1] * 1500 * e + h2 * 60 * k, rot: h1 * 70 * e, op: fade, blur: e * 8};
    case 'slide':
      return {tx: dir[0] * 1600 * e, ty: dir[1] * 1600 * e, op: fade, blur: e * 10, ry: dir[0] * 40 * e};
    case 'sink':
      return {ty: 260 * e, rx: 80 * e, sc: 1 - 0.5 * e, op: fade};
    case 'fall':
      return {ty: 900 * e, rot: h1 * 120 * e, op: fade};
    case 'burst':
      return {tx: h1 * 900 * e, ty: h2 * 600 * e, rot: h1 * 300 * e, sc: 1 + e, op: fade, blur: e * 6};
    case 'zoom':
      return {sc: 1 + 7 * e, op: 1 - clamp((k - 0.35) / 0.65), blur: e * 12};
  }
  return {};
}

const SHADOW = '0 0 22px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.85), 0 3px 2px rgba(0,0,0,0.7)';

export const Kinetic: React.FC<KineticProps> = (p) => {
  const {t, t0, t1} = p;
  const enterDur = p.enterDur ?? 0.55;
  const exitDur = p.exitDur ?? 0.5;
  const stagger = p.stagger ?? 0.03;
  const exitStagger = p.exitStagger ?? 0.012;
  if (t < t0 - 0.01 || t > t1 + 0.01) return null;
  const pose = p.pose(t);
  const seed = p.seed ?? 1;
  const dir = p.dir ?? [-1, 0];
  const exitDir = p.exitDir ?? [1, -0.2];
  const size = p.size ?? 58;
  const weight = p.weight ?? 800;
  const font = p.font ?? 'sans';
  const color = p.color ?? INK;
  const totalChars = p.lines.reduce((n, l) => n + l.reduce((m, tk) => m + [...tk.t].length, 0), 0);
  let idx = 0;
  const b = beatEnv(t, 7);
  const vertical = !!p.vertical;
  return (
    <div
      style={{
        position: 'absolute',
        left: pose.x,
        top: pose.y,
        transform: `translate(-50%, -50%) perspective(1500px) translateZ(${pose.z ?? 0}px) rotateX(${pose.rx ?? 0}deg) rotateY(${pose.ry ?? 0}deg) rotate(${pose.rot ?? 0}deg) skewX(${pose.skew ?? 0}deg) scale(${pose.scale ?? 1})`,
        transformStyle: 'preserve-3d',
        opacity: pose.opacity ?? 1,
        display: 'flex',
        flexDirection: vertical ? 'row-reverse' : 'column',
        alignItems: vertical ? 'flex-start' : p.align === 'left' ? 'flex-start' : p.align === 'right' ? 'flex-end' : 'center',
        gap: p.lineGap ?? 10,
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
      }}
      data-block={p.decorative ? undefined : p.id}
    >
      {p.lines.map((line, li) => {
        const ld = p.lineDelay?.[li] ?? 0;
        const shift = p.lineShift ? p.lineShift(t, li) : [0, 0, 0];
        return (
          <div
            key={li}
            style={{
              display: 'flex',
              flexDirection: vertical ? 'column' : 'row',
              alignItems: vertical ? 'center' : 'baseline',
              transform: `translate(${shift[0]}px, ${shift[1]}px) rotate(${shift[2]}deg)`,
              transformStyle: 'preserve-3d',
            }}
          >
            {line.map((tk, ti) => {
              const chars = [...tk.t];
              return chars.map((ch, ci) => {
                const i = idx++;
                const cs = seed * 101 + i * 13.7;
                const ke = tk.carried ? 1 : prog(t, t0 + ld + i * stagger, t0 + ld + i * stagger + enterDur);
                const exStart = t1 - exitDur - (totalChars - 1 - i) * exitStagger;
                const kx = p.exit === 'none' || tk.stay ? 0 : prog(t, exStart, exStart + exitDur);
                const en = enterState(p.enter ?? 'flip', ke, cs, dir);
                const ex = exitState(p.exit ?? 'fly', kx, cs, exitDir);
                const xt = tk.extra ? tk.extra(t, i) : {};
                const wave = p.wave ? Math.sin(t * 3.1 + i * 0.55) * p.wave : 0;
                const emPulse = tk.em ? 1 + 0.07 * b : 1;
                const fs = tk.s ?? size;
                const st = {
                  tx: en.tx + (ex.tx ?? 0) + (xt.tx ?? 0),
                  ty: en.ty + (ex.ty ?? 0) + wave + (tk.dy ?? 0) + (xt.ty ?? 0),
                  rot: en.rot + (ex.rot ?? 0) + (xt.rot ?? 0),
                  rx: en.rx + (ex.rx ?? 0),
                  ry: en.ry + (ex.ry ?? 0),
                  sc: en.sc * (ex.sc ?? 1) * emPulse * (xt.sc ?? 1),
                  op: en.op * (ex.op ?? 1) * (xt.op ?? 1),
                  blur: en.blur + (ex.blur ?? 0),
                };
                const settled = en.settled && kx <= 0 && Math.abs(xt.tx ?? 0) < 1 && Math.abs(xt.ty ?? 0) < 1;
                const isPunct = '、。，．・：？'.includes(ch);
                return (
                  <span
                    key={`${ti}-${ci}`}
                    data-settled={!p.decorative && settled && st.op > 0.9 && !isPunct ? '1' : undefined}
                    style={{
                      position: 'relative',
                      display: 'inline-block',
                      fontFamily: FONTS[tk.f ?? font],
                      fontWeight: tk.w ?? weight,
                      fontSize: fs,
                      lineHeight: vertical ? 1.02 : 1.12,
                      color: tk.c ?? (tk.em ? LIME : color),
                      opacity: Math.max(st.op, en.xop),
                      transform: `translate(${st.tx}px, ${st.ty}px) rotateX(${st.rx}deg) rotateY(${st.ry}deg) rotate(${st.rot}deg) scale(${st.sc})`,
                      filter: st.blur > 0.2 ? `blur(${st.blur.toFixed(2)}px)` : undefined,
                      textShadow: SHADOW,
                      letterSpacing: '0.02em',
                      whiteSpace: 'pre',
                    }}
                  >
                    <span style={{opacity: en.xop > 0 ? st.op / Math.max(st.op, en.xop, 1e-3) : 1}}>{vertical && ch === '、' ? '︑' : vertical && ch === '。' ? '︒' : ch}</span>
                    {en.xop > 0.001 ? (
                      <span style={{position: 'absolute', left: 0, right: 0, top: 0, textAlign: 'center', color: LIME, fontWeight: 900, opacity: en.xop / Math.max(st.op, en.xop, 1e-3)}}>×</span>
                    ) : null}
                  </span>
                );
              });
            })}
          </div>
        );
      })}
    </div>
  );
};

// 拍で跳ねる値（読む区間の群の運動に加える）
export const kick = (t: number, amp: number) => amp * beatEnv(t, 9) * (Math.floor(t / BEAT) % 2 === 0 ? 1 : -1);
