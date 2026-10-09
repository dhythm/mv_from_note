// エンドロゴ: リポジトリ直下 okady-work-logo.svg の形・色・比率をそのまま使い、
// SVG 内の CSS アニメーション（キーフレーム・イージング・transform-origin）をフレーム時刻からの計算へ翻訳した。
// τ はロゴ区間の開始からの秒。
import React from 'react';
import {cubicBezier} from '../lib/anim';

type KF = {at: number; v: number; ease?: (k: number) => number};
const LINEAR = (k: number) => k;
const CSS_EASE = cubicBezier(0.25, 0.1, 0.25, 1); // animation-timing-function の既定値 ease
const EASE_IN_OUT = cubicBezier(0.42, 0, 0.58, 1);
const OUT_A = cubicBezier(0.2, 0.6, 0.35, 1);
const FALL = cubicBezier(0.55, 0, 1, 0.45);
const RISE = cubicBezier(0, 0.55, 0.45, 1);
const SLIDE = cubicBezier(0.7, 0, 0.2, 1);
const W_EASE = cubicBezier(0.2, 0.7, 0.3, 1);

// キーフレーム列の評価。各キーの ease はそのキーから次のキーまでの区間に掛かる（CSS と同じ）
function kf(p: number, keys: KF[]) {
  if (p <= keys[0].at) return keys[0].v;
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i];
    const b = keys[i + 1];
    if (p <= b.at) {
      const k = (p - a.at) / (b.at - a.at);
      return a.v + (b.v - a.v) * (a.ease ?? CSS_EASE)(k);
    }
  }
  return keys[keys.length - 1].v;
}

const DUR = 2.6;
const OX: KF[] = [
  {at: 0, v: 620, ease: LINEAR},
  {at: 0.62, v: 240, ease: OUT_A},
  {at: 0.88, v: -8, ease: EASE_IN_OUT},
  {at: 1, v: 0},
];
const SPIN: KF[] = [
  {at: 0, v: -798, ease: LINEAR},
  {at: 0.62, v: -309, ease: OUT_A},
  {at: 0.88, v: 10, ease: EASE_IN_OUT},
  {at: 1, v: 0},
];
const OY: KF[] = [
  {at: 0, v: -260, ease: FALL},
  {at: 0.22, v: 0, ease: RISE},
  {at: 0.34, v: -70, ease: FALL},
  {at: 0.46, v: 0, ease: RISE},
  {at: 0.54, v: -22, ease: FALL},
  {at: 0.62, v: 0},
  {at: 1, v: 0},
];
// squash は timing-function 指定なし＝各区間 ease
const SQ: [number, number, number][] = [
  [0, 1, 1],
  [0.2, 1, 1],
  [0.22, 1.16, 0.84],
  [0.27, 0.95, 1.05],
  [0.31, 1, 1],
  [0.44, 1, 1],
  [0.46, 1.1, 0.9],
  [0.5, 1, 1],
  [0.6, 1, 1],
  [0.62, 1.05, 0.95],
  [0.66, 1, 1],
  [0.87, 1, 1],
  [0.9, 1.04, 0.96],
  [0.95, 1, 1],
  [1, 1, 1],
];
function squash(p: number): [number, number] {
  const sx = kf(p, SQ.map(([at, x]) => ({at, v: x})));
  const sy = kf(p, SQ.map(([at, , y]) => ({at, v: y})));
  return [sx, sy];
}

export function logoState(tau: number) {
  const p = Math.min(1, Math.max(0, tau / DUR));
  const ox = kf(p, OX);
  const oy = kf(p, OY);
  const spin = kf(p, SPIN);
  const [sx, sy] = squash(p);
  // .slide: 0.6s、遅延 2.6s、fill both
  const slideK = Math.min(1, Math.max(0, (tau - 2.6) / 0.6));
  const slide = 194 * (1 - SLIDE(slideK));
  // .w: 0.7s、遅延 3.0 + 0.08i、opacity 0→1 / translateY 18→0
  const w = [0, 1, 2, 3, 4].map((i) => {
    const k = Math.min(1, Math.max(0, (tau - (3.0 + 0.08 * i)) / 0.7));
    const e = W_EASE(k);
    return {op: e, y: 18 * (1 - e)};
  });
  return {ox, oy, spin, sx, sy, slide, w};
}

const GLYPH_O =
  'm 326.84001,263.04 q -12.92,0 -23.12,-5.61 -10.03,-5.78 -15.81,-15.81 -5.61,-10.03 -5.61,-23.12 0,-13.09 5.61,-23.12 5.61,-10.03 15.64,-15.64 10.03,-5.78 22.95,-5.78 13.09,0 23.12,5.78 10.03,5.61 15.64,15.64 5.61,10.03 5.61,23.12 0,13.09 -5.61,23.12 -5.61,10.03 -15.64,15.81 -9.86,5.61 -22.78,5.61 z m 0,-20.74 q 6.29,0 11.05,-3.06 4.76,-3.06 7.31,-8.33 2.72,-5.44 2.72,-12.41 0,-6.97 -2.72,-12.24 -2.72,-5.44 -7.65,-8.5 -4.76,-3.06 -11.05,-3.06 -6.12,0 -11.05,3.06 -4.76,3.06 -7.48,8.5 -2.72,5.27 -2.72,12.24 0,6.97 2.72,12.41 2.72,5.27 7.65,8.33 4.93,3.06 11.22,3.06 z';
const GLYPH_K = 'M 385.66,261 V 142 h 22.44 v 65.62 l 29.07,-31.62 h 26.69 l -32.13,35.87 34.68,49.13 h -26.35 l -22.61,-32.98 -9.35,10.2 V 261 Z';
const KADY =
  'M 385.66001,261 V 142 h 22.44 v 65.62 l 29.07,-31.62 h 26.69 l -32.13,35.87 34.68,49.13 h -26.35 l -22.61,-32.98 -9.35,10.2 V 261 Z m 114.58018,2.04 q -15.3,0 -23.8,-6.8 -8.33,-6.8 -8.33,-19.21 0,-13.6 9.01,-20.4 9.18,-6.97 25.67,-6.97 h 20.06 q -1.19,-7.82 -4.93,-11.9 -3.74,-4.25 -10.71,-4.25 -5.44,0 -9.86,2.38 -4.42,2.38 -7.48,7.31 l -19.72,-6.8 q 2.38,-5.44 6.97,-10.54 4.59,-5.27 11.9,-8.5 7.48,-3.4 18.19,-3.4 12.92,0 21.42,4.93 8.67,4.93 12.75,13.94 4.25,8.84 4.08,21.08 l -0.51,47.09 h -20.91 l -0.34,-9.86 q -3.23,5.78 -9.18,8.84 -5.78,3.06 -14.28,3.06 z m 3.74,-18.7 q 5.44,0 9.86,-2.55 4.42,-2.55 6.97,-6.63 2.55,-4.08 2.55,-8.5 v -0.34 h -12.75 q -11.05,0 -15.3,2.72 -4.25,2.55 -4.25,7.31 0,3.74 3.4,5.95 3.4,2.04 9.52,2.04 z m 93.16015,18.7 q -11.73,0 -20.4,-5.44 -8.5,-5.44 -13.26,-15.47 -4.76,-10.03 -4.76,-23.63 0,-13.77 4.76,-23.63 4.76,-10.03 13.26,-15.47 8.67,-5.44 20.4,-5.44 8.33,0 14.79,3.57 6.63,3.4 10.71,9.86 V 142 h 22.44 v 119 h -21.25 l -0.68,-11.9 q -4.25,6.63 -10.88,10.37 -6.63,3.57 -15.13,3.57 z m 5.78,-20.57 q 5.61,0 9.86,-2.72 4.42,-2.89 6.97,-7.99 2.55,-5.1 2.89,-11.56 v -3.4 q -0.34,-6.46 -2.89,-11.39 -2.55,-5.1 -6.97,-7.82 -4.42,-2.89 -10.03,-2.89 -6.12,0 -10.88,3.06 -4.59,2.89 -7.31,8.33 -2.55,5.44 -2.55,12.41 0,6.97 2.72,12.41 2.72,5.44 7.31,8.5 4.76,3.06 10.88,3.06 z m 78.5399,54.57 q -4.59,0 -10.2,-1.87 -5.44,-1.7 -9.69,-4.08 l 8.33,-18.19 q 2.89,1.53 5.27,2.38 2.55,1.02 4.42,1.02 3.57,0 6.29,-2.04 2.72,-1.87 4.42,-5.61 l 3.57,-8.67 -38.42,-83.98 h 24.65 l 24.14,58.65 23.12,-58.65 h 24.65 l -38.59,92.31 q -3.57,8.5 -7.48,14.96 -3.91,6.63 -9.69,10.2 -5.61,3.57 -14.79,3.57 z';

export const LOGO_BG = '#d2ff1a';

export const Logo: React.FC<{tau: number; width: number}> = ({tau, width}) => {
  const s = logoState(tau);
  const ink = '#0a0a0a';
  return (
    <svg width={width} height={(width * 400) / 1250} viewBox="0 0 1250 400" style={{overflow: 'visible'}}>
      <defs>
        <clipPath id="kady-reveal-r">
          <rect x={371} y={-400} width={600} height={1200} transform={`translate(${s.ox} 0)`} />
        </clipPath>
      </defs>
      <g transform={`translate(${s.slide} 0)`}>
        <g transform="translate(110,127.64) scale(0.67)">
          <g fill="none" stroke="#0A0A0A" strokeWidth={22} strokeLinecap="round" strokeLinejoin="round">
            <path d="M11,95 A84,84 0 0 1 179,95 V193 Q179,205 167,205 H23 Q11,205 11,193 Z" />
            <path d="M11,95 H179 M95,95 V205 M11,150 H179" />
          </g>
        </g>
        <g fill={ink}>
          <path d={KADY} clipPath="url(#kady-reveal-r)" />
          <g transform={`translate(${s.ox} 0)`}>
            <g transform={`translate(0 ${s.oy})`}>
              <g transform={`translate(326.59 263.04) scale(${s.sx} ${s.sy}) translate(-326.59 -263.04)`}>
                <g transform={`rotate(${s.spin} 326.59 218.5)`}>
                  <path d={GLYPH_O} />
                </g>
              </g>
            </g>
          </g>
        </g>
        <g fill={ink}>
          <circle cx={755.4} cy={248} r={13} opacity={s.w[0].op} transform={`translate(0 ${s.w[0].y})`} />
          <path
            opacity={s.w[1].op}
            transform={`translate(0 ${s.w[1].y})`}
            d="M 766,176 H 789.5 L 816.5,261 H 793 Z M 820,176 H 843.5 L 816.5,261 H 793 Z M 820,176 H 843.5 L 870.5,261 H 847 Z M 874,176 H 897.5 L 870.5,261 H 847 Z"
          />
          <g opacity={s.w[2].op} transform={`translate(0 ${s.w[2].y})`}>
            <path d={GLYPH_O} transform="translate(616.4 0)" />
          </g>
          <path
            opacity={s.w[3].op}
            transform={`translate(0 ${s.w[3].y})`}
            d="M 999.5,261 V 176 H 1020.75 L 1021.4,188 Q 1025,181 1030.5,177.5 Q 1037,173.96 1045.5,173.96 Q 1049.5,173.96 1053,174.8 V 196.5 Q 1049,195.4 1044.5,195.4 Q 1034,195.4 1028,201.5 Q 1021.94,207.6 1021.94,219 V 261 Z"
          />
          <g opacity={s.w[4].op} transform={`translate(0 ${s.w[4].y})`}>
            <path d={GLYPH_K} transform="translate(673.34 0)" />
          </g>
        </g>
      </g>
    </svg>
  );
};
