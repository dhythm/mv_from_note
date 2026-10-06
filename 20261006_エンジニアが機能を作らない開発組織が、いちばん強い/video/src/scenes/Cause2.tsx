import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { COLOR } from "../theme";
import { ReadingLine, EASE_OUT, jpFont } from "../components/ui";

// 原因2 0:30–0:41 。要望をエンジニアが翻訳して機能にするしかなかった経路。
// 文字は静止、経路（トークン）だけが動く。

const CY = 405;
const X_REQ = 330;
const X_ENG = 640;
const X_FEAT = 950;

export const Cause2: React.FC = () => {
  const frame = useCurrentFrame();

  const nodesIn = interpolate(frame, [150, 185], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  // トークン: 要望→(翻訳で保持)→機能。
  const tokenX = interpolate(
    frame,
    [165, 212, 238, 288],
    [X_REQ, X_ENG, X_ENG, X_FEAT],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT },
  );
  const tokenVisible = frame >= 165 && frame <= 300;
  const transformed = interpolate(frame, [228, 244], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const featureFill = interpolate(frame, [282, 312], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  // 経路の強調（11「ほかに選択肢がなかった」）
  const onlyPath = interpolate(frame, [270, 300], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  return (
    <AbsoluteFill>
      <ReadingLine frame={frame} text="これまで、実務家は自分では作れなかった。" from={15} to={150} centerY={110} />
      <ReadingLine frame={frame} text="だからエンジニアが要望を翻訳して作った。" from={150} to={270} centerY={110} />
      <ReadingLine frame={frame} text="ほかに選択肢がなかった。" from={270} to={328} centerY={110} />

      <svg width={1280} height={720} viewBox="0 0 1280 720" style={{ position: "absolute", left: 0, top: 0 }}>
        <g opacity={nodesIn}>
          {/* 経路の矢印 */}
          <g stroke={COLOR.inkSoft} strokeWidth={3 + onlyPath * 2} fill="none" opacity={0.55 + onlyPath * 0.45}>
            <line x1={X_REQ + 70} y1={CY} x2={X_ENG - 86} y2={CY} />
            <line x1={X_ENG + 86} y1={CY} x2={X_FEAT - 72} y2={CY} />
          </g>
          <g fill={COLOR.inkSoft} opacity={0.55 + onlyPath * 0.45}>
            <polygon points={`${X_ENG - 86},${CY - 7} ${X_ENG - 72},${CY} ${X_ENG - 86},${CY + 7}`} />
            <polygon points={`${X_FEAT - 72},${CY - 7} ${X_FEAT - 58},${CY} ${X_FEAT - 72},${CY + 7}`} />
          </g>

          {/* 要望ノード */}
          <circle cx={X_REQ} cy={CY} r={48} fill="none" stroke={COLOR.ink} strokeWidth={3} />
          <text x={X_REQ} y={CY + 10} textAnchor="middle" fontSize={28} fill={COLOR.ink} style={jpFont(700)}>
            要望
          </text>

          {/* エンジニア（翻訳）ノード */}
          <rect x={X_ENG - 86} y={CY - 70} width={172} height={140} rx={16} fill="none" stroke={COLOR.slate} strokeWidth={4} />
          {/* 人の線画 */}
          <g stroke={COLOR.slate} strokeWidth={5} fill="none" strokeLinecap="round" strokeLinejoin="round">
            <circle cx={X_ENG} cy={CY - 26} r={17} />
            <path d={`M${X_ENG - 30} ${CY + 20} C${X_ENG - 30} ${CY - 6} ${X_ENG + 30} ${CY - 6} ${X_ENG + 30} ${CY + 20}`} />
          </g>
          <text x={X_ENG} y={CY + 56} textAnchor="middle" fontSize={22} fill={COLOR.slate} style={jpFont(700)}>
            翻訳
          </text>

          {/* 機能ノード */}
          <rect x={X_FEAT - 58} y={CY - 46} width={116} height={92} rx={14} fill={COLOR.slateUp} opacity={featureFill} />
          <rect x={X_FEAT - 58} y={CY - 46} width={116} height={92} rx={14} fill="none" stroke={COLOR.slate} strokeWidth={3} />
          <text x={X_FEAT} y={CY + 10} textAnchor="middle" fontSize={26} fill={featureFill > 0.5 ? "#f3efe6" : COLOR.slate} style={jpFont(700)}>
            機能
          </text>
        </g>

        {/* 移動するトークン */}
        {tokenVisible ? (
          <g transform={`translate(${tokenX} ${CY})`}>
            {/* 要望の形（やわらかい円） */}
            <circle r={16} fill={COLOR.heavy} opacity={1 - transformed} />
            {/* 機能の形（角丸四角） */}
            <rect x={-15} y={-15} width={30} height={30} rx={7} fill={COLOR.slateUp} opacity={transformed} />
          </g>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
};
