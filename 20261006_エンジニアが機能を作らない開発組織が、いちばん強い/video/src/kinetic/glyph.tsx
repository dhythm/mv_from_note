import React from "react";
import { interpolate } from "remotion";
import { K, SNAP, mixColor } from "./design";
import { FONT } from "../theme";

// 1文字ずつキーフレームで動かす仕組み（参照作品の方式を、明朝の代わりに
// ウェイト軸で太さを補間する形へ発展）。和文は全角1字=1emなので、
// x（左端）・y（中心）・size から配置を算術で決められる。

export type GlyphState = {
  x: number;
  y: number;
  size: number;
  weight: number; // 100–900
  color: string;
  opacity: number;
};

export type Key = { f: number; easing?: (t: number) => number } & Partial<GlyphState>;

function complete(keys: Key[]) {
  const out: (GlyphState & { f: number; easing?: (t: number) => number })[] = [];
  let prev: GlyphState = { x: 0, y: 0, size: 100, weight: 900, color: K.ink, opacity: 1 };
  for (const k of keys) {
    const next = { ...prev, ...k } as GlyphState & { f: number; easing?: (t: number) => number };
    out.push(next);
    prev = next;
  }
  return out;
}

export function stateAt(keys: Key[], frame: number): GlyphState {
  const ks = complete(keys);
  if (frame <= ks[0].f) return ks[0];
  for (let i = 1; i < ks.length; i++) {
    const a = ks[i - 1];
    const b = ks[i];
    if (frame <= b.f) {
      const t = interpolate(frame, [a.f, b.f], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: b.easing ?? SNAP,
      });
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        size: a.size + (b.size - a.size) * t,
        weight: a.weight + (b.weight - a.weight) * t,
        color: a.color === b.color ? a.color : mixColor(a.color, b.color, t),
        opacity: a.opacity + (b.opacity - a.opacity) * t,
      };
    }
  }
  return ks[ks.length - 1];
}

export const Glyph: React.FC<{ char: string; keys: Key[]; frame: number }> = ({
  char,
  keys,
  frame,
}) => {
  const st = stateAt(keys, frame);
  if (st.opacity <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: st.x,
        top: st.y - st.size / 2,
        width: st.size,
        height: st.size,
        fontSize: st.size,
        lineHeight: `${st.size}px`,
        textAlign: "center",
        whiteSpace: "pre",
        color: st.color,
        opacity: st.opacity,
        fontFamily: FONT,
        fontWeight: Math.round(st.weight),
        fontVariationSettings: `'wght' ${Math.round(st.weight)}`,
      }}
    >
      {char}
    </div>
  );
};

// 補助句・つなぎ・面上のヌキ文字。位置・太さ・色・不透明度を指定して置く。
export const Phrase: React.FC<{
  text: string;
  left: number;
  top: number;
  size: number;
  weight?: number;
  color?: string;
  opacity?: number;
  dx?: number;
  dy?: number;
  letterSpacing?: string;
  align?: "left" | "center" | "right";
  width?: number;
  lineHeight?: number;
  centered?: boolean;
}> = ({
  text,
  left,
  top,
  size,
  weight = 700,
  color = K.ink,
  opacity = 1,
  dx = 0,
  dy = 0,
  letterSpacing = "0.02em",
  align = "left",
  width,
  lineHeight = 1.3,
  centered = false,
}) => {
  if (opacity <= 0.001) return null;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width,
        translate: `${dx}px ${centered ? `calc(-50% + ${dy}px)` : `${dy}px`}`,
        textAlign: align,
        color,
        opacity,
        fontSize: size,
        lineHeight,
        letterSpacing,
        whiteSpace: width ? "normal" : "pre",
        fontFamily: FONT,
        fontWeight: Math.round(weight),
        fontVariationSettings: `'wght' ${Math.round(weight)}`,
      }}
    >
      {text}
    </div>
  );
};
