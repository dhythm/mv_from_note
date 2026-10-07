import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {COLORS} from '../lib/theme';
import {lowEnergy} from '../lib/music';
import {drift} from '../lib/anim';

// 全編共通の背景。低音エネルギー（Y21）でわずかに明暗が脈打つ。
export const Background: React.FC = () => {
  const f = useCurrentFrame();
  const le = lowEnergy(f);
  const gx = 640 + drift(f, 120, 600);
  const gy = 360 + drift(f, 70, 520);
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(1200px 820px at ${gx}px ${gy}px, ${COLORS.bg} 0%, ${COLORS.bgDeep} 78%)`,
      }}
    >
      <AbsoluteFill style={{background: '#000', opacity: le * 0.04}} />
    </AbsoluteFill>
  );
};
