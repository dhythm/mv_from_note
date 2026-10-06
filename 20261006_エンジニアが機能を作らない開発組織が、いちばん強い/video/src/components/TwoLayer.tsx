import React from "react";
import { interpolate } from "remotion";
import { COLOR, LAYER } from "../theme";
import { jpFont, EASE_OUT } from "./ui";

// 役割の二層プラットフォーム（上＝機能／実務家、下＝土台／エンジニア）。
// 転換の着地形であり、後半の各シーンが共有する。

const Platform: React.FC<{
  cx: number;
  cy: number;
  w: number;
  h: number;
  color: string;
  glow: number; // 0-1 関与の光
  opacity: number;
  scale: number;
  label: string;
  labelOpacity: number;
  children?: React.ReactNode;
}> = ({ cx, cy, w, h, color, glow, opacity, scale, label, labelOpacity, children }) => {
  return (
    <div
      style={{
        position: "absolute",
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
        borderRadius: LAYER.r,
        background: color,
        opacity,
        scale,
        boxShadow:
          glow > 0.001
            ? `0 0 ${18 + glow * 46}px ${glow * 22}px rgba(207,147,64,${0.55 * glow})`
            : "0 10px 24px rgba(40,40,40,0.10)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          color: "#f3efe6",
          fontSize: 40,
          opacity: labelOpacity,
          letterSpacing: "0.04em",
          ...jpFont(800),
        }}
      >
        {label}
      </span>
      {children}
    </div>
  );
};

export const TwoLayer: React.FC<{
  frame: number;
  appear?: number; // 0-1 出現
  upGlow?: number;
  loGlow?: number;
  labelOpacity?: number;
  upLabelOpacity?: number;
  loLabelOpacity?: number;
  chips?: number; // 0-4 下層に灯る支えの数（小数可）
}> = ({
  frame,
  appear = 1,
  upGlow = 0,
  loGlow = 0,
  labelOpacity = 1,
  upLabelOpacity,
  loLabelOpacity,
  chips = 0,
}) => {
  const scale = interpolate(appear, [0, 1], [0.96, 1]);
  return (
    <>
      <Platform
        cx={LAYER.cx}
        cy={LAYER.upY}
        w={LAYER.w}
        h={LAYER.h}
        color={COLOR.slateUp}
        glow={upGlow}
        opacity={appear}
        scale={scale}
        label="機能／実務家"
        labelOpacity={upLabelOpacity ?? labelOpacity}
      />
      <Platform
        cx={LAYER.cx}
        cy={LAYER.loY}
        w={LAYER.w}
        h={LAYER.h}
        color={COLOR.slateLo}
        glow={loGlow}
        opacity={appear}
        scale={scale}
        label="土台／エンジニア"
        labelOpacity={loLabelOpacity ?? labelOpacity}
      >
        {/* 支えの小片（要件→PM・アーキ→QA→土台）。文字は重ねず形で示す */}
        <div
          style={{
            position: "absolute",
            bottom: 16,
            left: 0,
            width: "100%",
            display: "flex",
            justifyContent: "center",
            gap: 24,
          }}
        >
          {[0, 1, 2, 3].map((i) => {
            const lit = interpolate(chips, [i, i + 1], [0, 1], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
              easing: EASE_OUT,
            });
            return (
              <div
                key={i}
                style={{
                  width: 56,
                  height: 14,
                  borderRadius: 7,
                  background: "#f3efe6",
                  opacity: lit,
                  scale: `${0.7 + lit * 0.3}`,
                }}
              />
            );
          })}
        </div>
      </Platform>
    </>
  );
};
