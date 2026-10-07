import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {COLORS, FONT} from '../lib/theme';

// 未実装シーンの仮表示（試作中のみ）。本編では使わない。
export const Placeholder: React.FC<{g0: number; dur: number; label: string}> = ({g0, dur, label}) => {
  const f = useCurrentFrame();
  const L = f - g0;
  if (L < 0 || L >= dur) return null;
  return (
    <AbsoluteFill style={{alignItems: 'center', justifyContent: 'center'}}>
      <div style={{fontFamily: FONT, color: COLORS.inkSoft, fontSize: 28, opacity: 0.4}}>{label}（制作中）</div>
    </AbsoluteFill>
  );
};
