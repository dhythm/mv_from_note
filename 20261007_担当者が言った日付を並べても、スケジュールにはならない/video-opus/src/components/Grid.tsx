import React from 'react';
import {COLORS, unitX, ZONE, H} from '../lib/theme';

type Props = {
  translateX?: number;
  translateY?: number;
  scale?: number;
  rotate?: number;
  opacity?: number;
  strong?: boolean;
};

// 時間軸の格子（S15 パララックスの背景/中景に使う）。unit 0..10 に縦線。
export const Grid: React.FC<Props> = ({
  translateX = 0,
  translateY = 0,
  scale = 1,
  rotate = 0,
  opacity = 1,
  strong = false,
}) => {
  const lines = [];
  for (let u = 0; u <= 10; u++) {
    lines.push(
      <line
        key={u}
        x1={unitX(u)}
        y1={ZONE.y0 - 20}
        x2={unitX(u)}
        y2={ZONE.y1 + 20}
        stroke={u % 2 === 0 ? COLORS.gridStrong : COLORS.grid}
        strokeWidth={u % 2 === 0 ? 2 : 1}
      />
    );
  }
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity,
        translate: `${translateX}px ${translateY}px`,
        scale,
        rotate: `${rotate}deg`,
        transformOrigin: 'center center',
      }}
    >
      <svg width="100%" height="100%" viewBox={`0 0 1280 ${H}`} style={{overflow: 'visible'}}>
        {lines}
        <line
          x1={ZONE.x0 - 10}
          y1={ZONE.y1 + 20}
          x2={ZONE.x1 + 20}
          y2={ZONE.y1 + 20}
          stroke={strong ? COLORS.inkSoft : COLORS.gridStrong}
          strokeWidth={2}
        />
      </svg>
    </div>
  );
};
