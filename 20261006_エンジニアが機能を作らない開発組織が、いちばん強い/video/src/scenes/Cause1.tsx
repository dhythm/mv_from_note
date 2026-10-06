import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { COLOR } from "../theme";
import { ReadingLine, EASE_IN_OUT, EASE_OUT } from "../components/ui";

// 原因1 0:14–0:30 。扱うものの重さで判断が変わる。天秤で対比し、
// 最後は水平へ戻して「どちらにも一理ある」を示す。

export const Cause1: React.FC = () => {
  const frame = useCurrentFrame();

  // 右下がり＝重い側が下がる。小さな軽い荷（左）→大きな重い荷（右）→ほぼ水平へ。
  const angle = interpolate(
    frame,
    [0, 150, 205, 285, 340, 410, 470],
    [0, 0, -3.5, -3.5, 11, 11, 1.5],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_IN_OUT },
  );

  const sLeft = interpolate(frame, [158, 205], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const sRight = interpolate(frame, [288, 338], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  const cube = (
    cx: number,
    baseY: number,
    size: number,
    s: number,
    color: string,
  ) => {
    if (s <= 0.001) return null;
    const half = size / 2;
    const cy = baseY - half;
    return (
      <g transform={`translate(${cx} ${cy}) scale(${s})`} opacity={s}>
        <rect
          x={-half}
          y={-half}
          width={size}
          height={size}
          rx={10}
          fill={color}
        />
      </g>
    );
  };

  return (
    <AbsoluteFill>
      <ReadingLine frame={frame} text="答えは、ケースバイケースだ。" from={15} to={150} centerY={110} />
      <ReadingLine
        frame={frame}
        text="自分用や仲間内の道具なら問題ない。"
        from={150}
        to={282}
        centerY={110}
      />
      <ReadingLine
        frame={frame}
        text="個人情報や、止まると困るものなら怖い。"
        from={282}
        to={402}
        centerY={110}
      />
      <ReadingLine
        frame={frame}
        text="どちらにも一理あり、片方だけが正しくはない。"
        from={402}
        to={478}
        centerY={110}
      />

      <svg
        width={1280}
        height={720}
        viewBox="0 0 1280 720"
        style={{ position: "absolute", left: 0, top: 0 }}
      >
        <g transform="translate(0 -54)">
        {/* 支柱と台（回転しない） */}
        <rect x={635} y={430} width={10} height={120} rx={5} fill={COLOR.inkSoft} />
        <polygon points="600,560 680,560 640,428" fill={COLOR.inkSoft} />

        {/* 回転する天秤一式 */}
        <g transform={`rotate(${angle} 640 430)`}>
          <rect x={380} y={424} width={520} height={12} rx={6} fill={COLOR.ink} />
          {/* 左の吊り */}
          <line x1={400} y1={430} x2={400} y2={508} stroke={COLOR.inkSoft} strokeWidth={4} />
          <line x1={350} y1={508} x2={450} y2={508} stroke={COLOR.inkSoft} strokeWidth={6} strokeLinecap="round" />
          {cube(400, 506, 66, sLeft, COLOR.calm)}
          {/* 右の吊り */}
          <line x1={880} y1={430} x2={880} y2={508} stroke={COLOR.inkSoft} strokeWidth={4} />
          <line x1={820} y1={508} x2={940} y2={508} stroke={COLOR.inkSoft} strokeWidth={6} strokeLinecap="round" />
          {cube(880, 506, 112, sRight, COLOR.heavy)}
        </g>
        </g>
      </svg>
    </AbsoluteFill>
  );
};
