import React from "react";
import { AbsoluteFill, Easing, interpolate } from "remotion";
import { COLOR, FONT, WIDTH, HEIGHT } from "../theme";

// 共通イージング。入りは減速、抜けは加速。
export const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
export const EASE_IN_OUT = Easing.bezier(0.45, 0, 0.55, 1);
export const EASE_IN = Easing.in(Easing.cubic);

// フレーム範囲でのフェード（読む間は不透明を保持）。
export const fade = (
  frame: number,
  from: number,
  to: number,
  fadeIn = 10,
  fadeOut = 10,
): number => {
  return interpolate(
    frame,
    [from, from + fadeIn, to - fadeOut, to],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT },
  );
};

export const jpFont = (weight: number): React.CSSProperties => ({
  fontFamily: FONT,
  fontWeight: weight,
  fontVariationSettings: `'wght' ${weight}`,
  fontKerning: "normal",
});

// 紙地の背景。ごく弱いビネットのみ、動かさない。
export const Paper: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(130% 120% at 50% 42%, ${COLOR.paper} 58%, ${COLOR.paperEdge} 100%)`,
      }}
    />
  );
};

// 読ませる一文。指定の中心Yに置き、フェードで出し入れし、読む間は静止。
export const ReadingLine: React.FC<{
  frame: number;
  text: string;
  from: number;
  to: number;
  centerY: number;
  fontSize?: number;
  weight?: number;
  color?: string;
  maxWidth?: number;
  fadeIn?: number;
  fadeOut?: number;
  rise?: number; // 立ち上がりの微小な上方向移動（px）
}> = ({
  frame,
  text,
  from,
  to,
  centerY,
  fontSize = 46,
  weight = 400,
  color = COLOR.ink,
  maxWidth = 1090,
  fadeIn = 12,
  fadeOut = 12,
  rise = 10,
}) => {
  const opacity = fade(frame, from, to, fadeIn, fadeOut);
  const ty = interpolate(frame, [from, from + fadeIn], [rise, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  if (opacity <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: (WIDTH - maxWidth) / 2,
        top: centerY,
        width: maxWidth,
        transform: `translateY(${ty - fontSize * 0.7}px)`,
        textAlign: "center",
        opacity,
        color,
        fontSize,
        lineHeight: 1.4,
        letterSpacing: "0.01em",
        ...jpFont(weight),
      }}
    >
      {text}
    </div>
  );
};

export const SAFE = { WIDTH, HEIGHT };
