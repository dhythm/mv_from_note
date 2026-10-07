import React from 'react';
import {Rect} from '../lib/gantt';
import {COLORS, FONT} from '../lib/theme';

type Props = {
  rect: Rect;
  color?: string;
  label?: string;
  sub?: string;
  opacity?: number;
  ghost?: boolean; // 元位置の細線
  radius?: number;
  labelColor?: string;
  shadow?: boolean;
};

export const Bar: React.FC<Props> = ({
  rect,
  color = COLORS.bar,
  label,
  sub,
  opacity = 1,
  ghost = false,
  radius = 10,
  labelColor = '#f7f6f3',
  shadow = true,
}) => {
  const {x, y, w, h} = rect;
  if (ghost) {
    return (
      <div
        style={{
          position: 'absolute',
          left: x,
          top: y,
          width: w,
          height: h,
          borderRadius: radius,
          border: `2px dashed ${COLORS.ghost}`,
          boxSizing: 'border-box',
          opacity,
        }}
      />
    );
  }
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        height: h,
        borderRadius: radius,
        background: color,
        opacity,
        boxShadow: shadow ? '0 6px 18px rgba(40,40,40,0.14)' : 'none',
        display: 'flex',
        alignItems: 'center',
        padding: '0 14px',
        boxSizing: 'border-box',
        fontFamily: FONT,
        overflow: 'hidden',
      }}
    >
      {label ? (
        <span style={{color: labelColor, fontWeight: 700, fontSize: Math.min(22, h * 0.46), whiteSpace: 'nowrap'}}>
          {label}
        </span>
      ) : null}
      {sub ? (
        <span style={{color: labelColor, opacity: 0.8, fontWeight: 500, fontSize: 14, marginLeft: 10, whiteSpace: 'nowrap'}}>
          {sub}
        </span>
      ) : null}
    </div>
  );
};
