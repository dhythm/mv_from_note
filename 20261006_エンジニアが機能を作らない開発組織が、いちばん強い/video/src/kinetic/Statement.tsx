import React from "react";
import { AbsoluteFill } from "remotion";
import { K, prog, EASE_IN } from "./design";
import { FONT } from "../theme";

// 意味の塊を一度に読める形で打ち出す。入口と出口だけ鋭く動かす。
export const Statement: React.FC<{
  frame: number; from: number; to: number; lead: string; main: string;
  size?: number; color?: string; weight?: number; inverted?: boolean;
}> = ({ frame, from, to, lead, main, size = 88, color = K.ink, weight = 900, inverted = false }) => {
  if (frame < from || frame >= to) return null;
  const enter = prog(frame, from, from + 8);
  const leave = prog(frame, to - 6, to, EASE_IN);
  const fg = inverted ? K.knock : color;
  return (
    <AbsoluteFill style={{ background: inverted ? K.ink : undefined, overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: "144px 80px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 48, fontFamily: FONT, translate: `${leave * -140}px 0px`, opacity: 1 - leave }}>
        <div style={{ fontSize: 48, fontWeight: 600, lineHeight: 1.35, color: inverted ? K.knock : K.ink, textAlign: "center", whiteSpace: "pre-line", translate: `0px ${(1 - enter) * -36}px`, opacity: enter }}>{lead}</div>
        <div style={{ fontSize: size, fontWeight: weight, fontVariationSettings: `'wght' ${weight}`, lineHeight: 1.18, letterSpacing: "0.01em", color: fg, textAlign: "center", whiteSpace: "pre-line", scale: 0.9 + enter * 0.1, clipPath: `inset(0 ${100 * (1 - enter)}% 0 0)` }}>{main}</div>
      </div>
    </AbsoluteFill>
  );
};
