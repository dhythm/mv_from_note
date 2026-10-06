import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { COLOR } from "../theme";
import { ReadingLine, EASE_IN_OUT, jpFont } from "../components/ui";
import { TwoLayer } from "../components/TwoLayer";

// 方法1 0:57–1:11 。二層を保持し、視野の枠が中長期・成長まで広がる。
// 人の能力の優劣は描かない。

export const Method1: React.FC = () => {
  const frame = useCurrentFrame();

  const p = interpolate(frame, [175, 265], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_IN_OUT,
  });
  const cx = 640;
  const cy = interpolate(p, [0, 1], [285, 380]);
  const w = interpolate(p, [0, 1], [520, 900]);
  const h = interpolate(p, [0, 1], [184, 404]);
  const tagOpacity = interpolate(frame, [230, 275], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <TwoLayer frame={frame} appear={1} labelOpacity={1} />

      <svg width={1280} height={720} viewBox="0 0 1280 720" style={{ position: "absolute", left: 0, top: 0 }}>
        <rect
          x={cx - w / 2}
          y={cy - h / 2}
          width={w}
          height={h}
          rx={22}
          fill="none"
          stroke={COLOR.amber}
          strokeWidth={3}
          strokeDasharray="12 10"
          opacity={0.85}
        />
        <text
          x={cx + w / 2 - 14}
          y={cy - h / 2 - 12}
          textAnchor="end"
          fontSize={24}
          fill={COLOR.amber}
          opacity={tagOpacity}
          style={jpFont(700)}
        >
          中長期・成長
        </text>
      </svg>

      <ReadingLine frame={frame} text="ただし、エンジニアがゼロでいいわけではない。" from={15} to={150} centerY={110} />
      <ReadingLine frame={frame} text="中長期の影響まで、見渡せないこともある。" from={150} to={285} centerY={110} />
      <ReadingLine frame={frame} text="「ほしい」だけでは、要件は決まらない。" from={285} to={415} centerY={110} />
    </AbsoluteFill>
  );
};
