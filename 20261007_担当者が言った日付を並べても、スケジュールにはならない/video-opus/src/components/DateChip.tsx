import React from 'react';
import {COLORS, FONT} from '../lib/theme';

// 説明用の日付チップ（具体日付は例示・実測値ではない）
export const DateChip: React.FC<{
  x: number;
  y: number;
  label: string;
  opacity?: number;
  scale?: number;
  rotate?: number;
  hero?: boolean;
}> = ({x, y, label, opacity = 1, scale = 1, rotate = 0, hero = false}) => {
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity,
        scale,
        rotate: `${rotate}deg`,
        transformOrigin: 'center center',
        fontFamily: FONT,
        fontWeight: 800,
        fontSize: hero ? 34 : 24,
        color: hero ? '#fff' : COLORS.ink,
        background: hero ? COLORS.bar : 'rgba(255,255,255,0.9)',
        border: `2px solid ${hero ? COLORS.bar : COLORS.gridStrong}`,
        borderRadius: 10,
        padding: hero ? '6px 16px' : '4px 12px',
        boxShadow: '0 4px 12px rgba(40,40,40,0.12)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
  );
};
