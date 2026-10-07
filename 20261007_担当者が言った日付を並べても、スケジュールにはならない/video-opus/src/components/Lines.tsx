import React from 'react';
import {COLORS, FONT, H, ZONE} from '../lib/theme';

// S12: 線が描かれていく。points を順に結ぶ折れ線を progress(0..1) で描画。
export const DependencyLine: React.FC<{
  points: [number, number][];
  progress: number;
  color?: string;
  width?: number;
  dashedRemain?: boolean;
}> = ({points, progress, color = COLORS.inkSoft, width = 3}) => {
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  // 全長を概算
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  const shown = len * Math.max(0, Math.min(1, progress));
  const head = points.length > 1 ? pointAt(points, shown) : points[0];
  return (
    <svg width="100%" height="100%" viewBox={`0 0 1280 ${H}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={width}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={len}
        strokeDashoffset={len - shown}
      />
      {progress > 0.02 && progress < 1.2 ? <circle cx={head[0]} cy={head[1]} r={width + 2} fill={color} /> : null}
    </svg>
  );
};

function pointAt(points: [number, number][], dist: number): [number, number] {
  let acc = 0;
  for (let i = 1; i < points.length; i++) {
    const seg = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    if (acc + seg >= dist) {
      const t = (dist - acc) / (seg || 1);
      return [
        points[i - 1][0] + (points[i][0] - points[i - 1][0]) * t,
        points[i - 1][1] + (points[i][1] - points[i - 1][1]) * t,
      ];
    }
    acc += seg;
  }
  return points[points.length - 1];
}

// 期限線（縦）。grow 0..1 で下から伸び、ラベルを出す。
export const DeadlineLine: React.FC<{
  x: number;
  grow: number;
  label?: string;
  color?: string;
  y0?: number;
  y1?: number;
}> = ({x, grow, label = '期限', color = COLORS.deadline, y0 = ZONE.y0 - 30, y1 = ZONE.y1 + 40}) => {
  const g = Math.max(0, Math.min(1, grow));
  const top = y1 - (y1 - y0) * g;
  return (
    <div style={{position: 'absolute', inset: 0}}>
      <svg width="100%" height="100%" viewBox={`0 0 1280 ${H}`} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <line x1={x} y1={y1} x2={x} y2={top} stroke={color} strokeWidth={4} strokeDasharray="10 7" />
      </svg>
      {g > 0.5 ? (
        <div
          style={{
            position: 'absolute',
            left: x + 10,
            top: y0,
            color: '#fff',
            background: color,
            padding: '4px 12px',
            borderRadius: 8,
            fontFamily: FONT,
            fontWeight: 800,
            fontSize: 22,
            opacity: (g - 0.5) * 2,
          }}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
};
