import { interpolate } from "remotion";
import { C, EASE, mixColor } from "./design";
import { mincho, sans } from "./fonts";

// 1文字ずつキーフレームで動かす仕組み。和文は全角1文字 = 1em なので、
// x（文字枠の左端）・y（文字枠の中心）・size から配置を算術で決められる。

export type GlyphState = {
  x: number;
  y: number;
  size: number;
  /** 0 = ゴシック, 1 = 明朝（途中はクロスフェード） */
  serif: number;
  color: string;
  opacity: number;
};

export type Key = { f: number; easing?: (t: number) => number } & Partial<GlyphState>;

/** 前のキーの値を引き継いで、すべての値を持つキー列にする */
function complete(keys: Key[]): (GlyphState & { f: number; easing?: (t: number) => number })[] {
  const out: (GlyphState & { f: number; easing?: (t: number) => number })[] = [];
  let prev: GlyphState = { x: 0, y: 0, size: 100, serif: 0, color: C.ink, opacity: 1 };
  for (const k of keys) {
    const next = { ...prev, ...k } as GlyphState & { f: number; easing?: (t: number) => number };
    out.push(next);
    prev = next;
  }
  return out;
}

export function stateAt(keys: Key[], frame: number): GlyphState {
  const ks = complete(keys);
  if (ks.length === 0) throw new Error("no keys");
  if (frame <= ks[0].f) return ks[0];
  for (let i = 1; i < ks.length; i++) {
    const a = ks[i - 1];
    const b = ks[i];
    if (frame <= b.f) {
      const t = interpolate(frame, [a.f, b.f], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: b.easing ?? EASE,
      });
      return {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        size: a.size + (b.size - a.size) * t,
        serif: a.serif + (b.serif - a.serif) * t,
        color: a.color === b.color ? a.color : mixColor(a.color, b.color, t),
        opacity: a.opacity + (b.opacity - a.opacity) * t,
      };
    }
  }
  return ks[ks.length - 1];
}

export function Glyph({ char, keys, frame, weight = 900 }: { char: string; keys: Key[]; frame: number; weight?: number }) {
  const st = stateAt(keys, frame);
  if (st.opacity <= 0.001) return null;
  const box = {
    position: "absolute" as const,
    left: st.x,
    top: st.y - st.size / 2,
    width: st.size,
    height: st.size,
    fontSize: st.size,
    lineHeight: `${st.size}px`,
    textAlign: "center" as const,
    color: st.color,
    whiteSpace: "pre" as const,
  };
  return (
    <>
      {st.serif < 0.999 ? (
        <div style={{ ...box, fontFamily: sans, fontWeight: weight, opacity: st.opacity * (1 - st.serif) }}>{char}</div>
      ) : null}
      {st.serif > 0.001 ? (
        <div style={{ ...box, fontFamily: mincho, fontWeight: 800, opacity: st.opacity * st.serif }}>{char}</div>
      ) : null}
    </>
  );
}
