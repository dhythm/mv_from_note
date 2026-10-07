import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Line} from '../lib/copy';
import {COLORS, FONT} from '../lib/theme';
import {drift, pop} from '../lib/anim';
import {kickPulse} from '../lib/music';

type Props = {
  line: Line;
  start: number;
  x: number;
  y: number;
  size: number;
  maxWidth?: number;
  align?: 'left' | 'center';
  stagger?: number;
  tint?: string; // ヒーロー語の差し色（既定: add）
};

// 強調は fontSize で表現しレイアウト幅を確保（重なり防止）。scale は登場ポップと拍反応のみ。
const E_SIZE = [0.86, 1.08, 1.32];
const E_WEIGHT = [600, 800, 900];

// 語ごとに強弱を付け、登場後も読む間ドリフトと拍反応で動く（S16）
export const KineticText: React.FC<Props> = ({
  line,
  start,
  x,
  y,
  size,
  maxWidth = 900,
  align = 'left',
  stagger = 4,
  tint = COLORS.add,
}) => {
  const frame = useCurrentFrame();
  const kp = kickPulse(frame);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: maxWidth,
        display: 'flex',
        flexWrap: 'wrap',
        gap: `${size * 0.12}px ${size * 0.04}px`,
        justifyContent: align === 'center' ? 'center' : 'flex-start',
        fontFamily: FONT,
        lineHeight: 1.18,
      }}
    >
      {line.toks.map((tok, i) => {
        if (tok.br) {
          return <div key={`br${i}`} style={{flexBasis: '100%', height: 0}} />;
        }
        const e = (tok.e ?? 0) as 0 | 1 | 2;
        const st = start + i * stagger;
        const {scale: ps, opacity} = pop(frame, st, e === 2 ? 20 : 15);
        // 登場: 下から＋回転戻し
        const inY = (1 - ps) * (e ? 30 : 20);
        const inRot = (1 - ps) * (e === 2 ? -10 : e === 1 ? -6 : -3);
        // 読む間のドリフト（周辺も動く）
        const dY = drift(frame, e ? 3.2 : 1.6, e ? 70 : 110, i * 1.3);
        const dRot = drift(frame, e ? 2.2 : 0.7, e ? 90 : 150, i);
        // 拍反応（Y21）: 強調語を脈打たせる
        const pulse = 1 + (e ? e * 0.045 : 0.012) * kp;
        const color = e === 2 ? tint : COLORS.ink;
        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              fontWeight: E_WEIGHT[e],
              fontSize: size * E_SIZE[e],
              color,
              opacity,
              translate: `0px ${inY + dY}px`,
              scale: ps * pulse,
              rotate: `${inRot + dRot}deg`,
              transformOrigin: 'center bottom',
              whiteSpace: 'nowrap',
              letterSpacing: e ? '0.01em' : '0',
            }}
          >
            {tok.t}
          </span>
        );
      })}
    </div>
  );
};
