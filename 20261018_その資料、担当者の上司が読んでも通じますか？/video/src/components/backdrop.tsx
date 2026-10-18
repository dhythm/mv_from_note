// 背景の場（カメラの移動・回転が見えるよう、奥に置く細い方眼。明るい紙色の上に薄い線）
import React from 'react';
import {C, beatEnv} from '../lib/anim';
import {RRect} from './prims';

export const Grid: React.FC<{t: number; z?: number; opacity?: number; step?: number; color?: string}> = ({t, z = -600, opacity = 1, step = 160, color = C.line}) => {
  const lines: React.ReactNode[] = [];
  const op = (0.35 + 0.15 * beatEnv(t, 5)) * opacity;
  if (op <= 0.002) return null;
  for (let i = -20; i <= 20; i++) lines.push(<RRect key={`v${i}`} w={2} h={5400} r={0} x={i * step} z={z} color={color} opacity={op} order={1} />);
  for (let j = -14; j <= 14; j++) lines.push(<RRect key={`h${j}`} w={7400} h={2} r={0} y={j * step} z={z} color={color} opacity={op} order={1} />);
  return <>{lines}</>;
};
