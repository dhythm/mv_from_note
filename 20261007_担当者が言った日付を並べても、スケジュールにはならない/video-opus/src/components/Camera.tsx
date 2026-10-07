import React from 'react';
import {AbsoluteFill} from 'remotion';

// 画面全体の移動・拡縮・回転（S15の接近/引き/旋回に使う）
export const Camera: React.FC<{
  x?: number;
  y?: number;
  scale?: number;
  rotate?: number;
  originX?: number;
  originY?: number;
  children: React.ReactNode;
}> = ({x = 0, y = 0, scale = 1, rotate = 0, originX = 640, originY = 360, children}) => {
  return (
    <AbsoluteFill
      style={{
        translate: `${x}px ${y}px`,
        scale,
        rotate: `${rotate}deg`,
        transformOrigin: `${originX}px ${originY}px`,
      }}
    >
      {children}
    </AbsoluteFill>
  );
};
