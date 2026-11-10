// 図の部品。全カットで同じ記号は同じ意味と質感（plan.html「記号と色」）。
// カード＝ファイル、暖色の円＝注意力、吹き出し＝AIの発話、歯車＝答えが一つに決まる仕事、プラグ＝道具、青い札＝問題なし。
import React from 'react';
import {C, Txt, clamp, mix} from './kit';

export const CW = 200;
export const CH = 124;

// カードの状態。x, y は中心。s 拡縮、r 回転、g 灰（注意が届いていない）、warm 光の当たり、lit 行のくっきり、bar 橙の帯、tag 問題なしの札
export type CardS = {x: number; y: number; s: number; r: number; g?: number; warm?: number; lit?: number; bar?: number; tag?: number; o?: number; z?: number; mv?: boolean};

export const Card: React.FC<{c: CardS}> = ({c}) => {
  const {x, y, s, r, g = 0, warm = 0, lit = 0.3, bar = 0, tag = 0, o = 1, z = 0, mv} = c;
  if (o <= 0.01 || s <= 0.01) return null;
  const face = mix(mix(C.card, C.lightSoft, warm), C.miss, g);
  const edge = mix(mix('#cfc8ba', '#d9a646', warm), '#a39c8f', g);
  const rule = mix(mix(C.rule, '#3b3832', lit), '#aaa396', g * (1 - lit));
  return (
    <div data-fig={mv ? 'fly' : '1'} style={{position: 'absolute', left: x - CW / 2, top: y - CH / 2, width: CW, height: CH, opacity: o, zIndex: z, transform: `rotate(${r}deg) scale(${s})`, borderRadius: 10, background: face, border: `2.5px solid ${edge}`, boxSizing: 'border-box', boxShadow: `5px 6px 0 rgba(26,26,26,${0.1 + 0.06 * g})`}}>
      <div style={{position: 'absolute', left: 24, top: 26, width: 118, height: 7, borderRadius: 4, background: rule}} />
      <div style={{position: 'absolute', left: 24, top: 48, width: 146, height: 7, borderRadius: 4, background: rule}} />
      {bar > 0.01 ? <div style={{position: 'absolute', left: 24, top: 72, width: 96 * clamp(bar), height: 20, borderRadius: 4, background: C.change}} /> : <div style={{position: 'absolute', left: 24, top: 70, width: 92, height: 7, borderRadius: 4, background: rule}} />}
      {tag > 0.01 ? (
        <div style={{position: 'absolute', left: 14, top: 30, width: CW - 33, height: 60, borderRadius: 8, background: C.tag, border: `2.5px solid ${C.tagLine}`, boxSizing: 'border-box', transform: `scale(${0.6 + 0.4 * clamp(tag)}) rotate(${-4 + (1 - clamp(tag)) * -14}deg)`, opacity: clamp(tag * 3)}}>
          <Txt text="問題なし" x={(CW - 33) / 2 - 2} y={11} size={32} weight={700} color={C.ai} anchor="c" box mv={mv} />
        </div>
      ) : null}
    </div>
  );
};

// 注意力（暖色の円）。a は濃さ。縁だけ柔らかい平らな円
export const Disc: React.FC<{x: number; y: number; r: number; a: number; sx?: number}> = ({x, y, r, a, sx = 1}) =>
  a <= 0.004 || r <= 1 ? null : (
    <div style={{position: 'absolute', left: x - r * sx, top: y - r, width: r * 2 * sx, height: r * 2, borderRadius: '50%', background: `radial-gradient(closest-side, rgba(232,168,48,${a}) 0%, rgba(232,168,48,${a}) 72%, rgba(232,168,48,0) 100%)`}} />
  );

// 吹き出し（一つの輪郭）。x, y は本体の中心。k: 0→1 でしっぽの先から出る。語は塊で中に入る
export const Bubble: React.FC<{x: number; y: number; w: number; h: number; k?: number; r?: number; s?: number; stroke?: string; fill?: string; sw?: number; tail?: 'bl' | 'br'; text?: string; size?: number; color?: string; weight?: number; mv?: boolean; z?: number; lines?: string[]}> = ({x, y, w, h, k = 1, r = 0, s = 1, stroke = C.gray, fill = C.card, sw = 6, tail = 'bl', text, size = 60, color = C.gray, weight = 900, mv, z, lines}) => {
  if (k <= 0.005) return null;
  const rad = Math.min(34, h * 0.28);
  const tl = Math.min(54, h * 0.4);
  const hw = w / 2;
  const hh = h / 2;
  const f = tail === 'bl' ? 1 : -1;
  // しっぽの先（原点にして拡大する）
  const tipX = f * (-hw + rad - 6);
  const tipY = hh + tl;
  const d = [
    `M ${-hw + rad} ${-hh}`,
    `H ${hw - rad}`,
    `Q ${hw} ${-hh} ${hw} ${-hh + rad}`,
    `V ${hh - rad}`,
    `Q ${hw} ${hh} ${hw - rad} ${hh}`,
    tail === 'bl' ? `H ${-hw + rad + 84} L ${tipX} ${tipY} L ${-hw + rad + 22} ${hh} H ${-hw + rad}` : `H ${hw - rad - 22} L ${tipX} ${tipY} L ${hw - rad - 84} ${hh} H ${-hw + rad}`,
    `Q ${-hw} ${hh} ${-hw} ${hh - rad}`,
    `V ${-hh + rad}`,
    `Q ${-hw} ${-hh} ${-hw + rad} ${-hh}`,
    'Z',
  ].join(' ');
  const kk = clamp(k, 0, 1.2);
  return (
    <div style={{position: 'absolute', left: x - hw, top: y - hh, width: w, height: h, zIndex: z, transform: `rotate(${r}deg) scale(${s})`}}>
     <div data-fig={mv ? 'fly' : '1'} style={{position: 'absolute', left: 0, top: 0, width: w, height: h, transform: `scale(${kk})`, transformOrigin: `${hw + tipX}px ${hh + tipY}px`}}>
      <svg width={w} height={h} viewBox={`${-hw} ${-hh} ${w} ${h}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
        <path d={d} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      </svg>
      {text ? <Txt text={text} x={hw} y={hh - size / 2} size={size} color={color} weight={weight} anchor="c" box mv={mv} /> : null}
      {lines ? lines.map((l, i) => <Txt key={i} text={l} x={hw} y={hh - (lines.length * size * 1.25) / 2 + i * size * 1.25 + size * 0.125} size={size} color={color} weight={weight} anchor="c" box mv={mv} />) : null}
     </div>
    </div>
  );
};

// 歯車（一つの輪郭）。rot は度
function gearPath(R: number, n: number) {
  const root = R * 0.76;
  const pts: string[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const st = (Math.PI * 2) / n;
    const p = (rad: number, ang: number) => `${(Math.cos(ang) * rad).toFixed(2)} ${(Math.sin(ang) * rad).toFixed(2)}`;
    pts.push(`${i === 0 ? 'M' : 'L'} ${p(root, a - st * 0.3)}`, `L ${p(R, a - st * 0.17)}`, `L ${p(R, a + st * 0.17)}`, `L ${p(root, a + st * 0.3)}`);
  }
  const hole = R * 0.3;
  return `${pts.join(' ')} Z M ${hole} 0 A ${hole} ${hole} 0 1 0 ${-hole} 0 A ${hole} ${hole} 0 1 0 ${hole} 0 Z`;
}
export const Gear: React.FC<{x: number; y: number; R: number; rot?: number; s?: number; color?: string; teeth?: number; mv?: boolean}> = ({x, y, R, rot = 0, s = 1, color = C.gear, teeth = 8, mv}) =>
  s <= 0.01 ? null : (
    <div data-fig={mv ? 'fly' : '1'} style={{position: 'absolute', left: x - R, top: y - R, width: R * 2, height: R * 2, transform: `scale(${s}) rotate(${rot}deg)`}}>
      <svg width={R * 2} height={R * 2} viewBox={`${-R} ${-R} ${R * 2} ${R * 2}`} style={{overflow: 'visible'}}>
        <path d={gearPath(R, teeth)} fill={color} fillRule="evenodd" strokeLinejoin="round" stroke={color} strokeWidth={R * 0.05} />
      </svg>
    </div>
  );

// プラグ（道具）。x, y は刃の先端。左へコードが伸びる
export const Plug: React.FC<{x: number; y: number; s?: number; mv?: boolean}> = ({x, y, s = 1, mv}) => (
  <div data-fig={mv ? 'fly' : '1'} style={{position: 'absolute', left: x - 250 * s, top: y - 70 * s, width: 250 * s, height: 140 * s}}>
    <svg width={250 * s} height={140 * s} viewBox="-250 -70 250 140" style={{overflow: 'visible'}}>
      <path d="M -196 0 C -420 0 -520 120 -900 120 L -2600 120" fill="none" stroke={C.ink} strokeWidth={14} strokeLinecap="round" />
      <rect x={-200} y={-62} width={136} height={124} rx={22} fill={C.card} stroke={C.ink} strokeWidth={7} />
      <rect x={-64} y={-38} width={64} height={18} rx={5} fill={C.ink} />
      <rect x={-64} y={20} width={64} height={18} rx={5} fill={C.ink} />
    </svg>
  </div>
);
