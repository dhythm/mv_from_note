import type { CSSProperties, ReactNode } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { C, EASE_IN, mix, prog } from "./design";
import { mincho, sans } from "./fonts";
import { Glyph, Key } from "./glyph";
import { Beat, relFrames } from "./timeline";

// 場面で共有する部品。文字の出し方を場面ごとに変える：
//   Wipe    … 要約の行を左から拭き出す（フロー組版。英数字を含む行もこれ）
//   CharRow … 全角のみの行を1字ずつ動かす（引用・ラベル）。出方は rise / slide / drop

export const B = {
  /** ビートの段 k が静止するフレーム（ビート先頭からの相対） */
  settle: (beat: Beat, k = 0) => relFrames(beat, beat.steps[k].at),
  out: (beat: Beat) => relFrames(beat, beat.out),
  end: (beat: Beat) => relFrames(beat, beat.end),
};

/** ビートの出口で全体を紙色へ溶かす */
export function Scene({ beat, children, bg = C.paper }: { beat: Beat; children: ReactNode; bg?: string }) {
  const frame = useCurrentFrame();
  // 最後のフレーム（end - 1）で溶け切る。全編の終端で半端なフェード文字が残らない
  const fade = 1 - prog(frame, B.out(beat), B.end(beat) - 1, EASE_IN);
  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: fade }}>{children}</AbsoluteFill>
    </AbsoluteFill>
  );
}

export function Wipe({
  text, left, top, size, start, end, color = C.ink, weight = 700, serif = false, align = "left", width, style,
}: {
  text: string; left: number; top: number; size: number; start: number; end: number;
  color?: string; weight?: number; serif?: boolean; align?: "left" | "center"; width?: number; style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const p = prog(frame, start, end);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute", left, top, width, textAlign: align, fontFamily: serif ? mincho : sans,
        fontWeight: serif ? 800 : weight, fontSize: size, lineHeight: 1.25, color, whiteSpace: "nowrap",
        letterSpacing: "0.03em", clipPath: `inset(-20% ${(1 - p) * 100}% -20% 0)`,
        transform: `translateX(${(1 - p) * 24}px)`, ...style,
      }}
    >
      {text}
    </div>
  );
}

export type RowMode = "rise" | "slide" | "drop" | "fade";

/** 全角の行を1字ずつ出す。最後の字が end で静止する。gap は字送り（1 = 字幅）。 */
export function rowKeys(
  i: number, n: number, { x, y, size, start, end, mode = "rise", serif = 0, color = C.ink, gap = 1 }:
  { x: number; y: number; size: number; start: number; end: number; mode?: RowMode; serif?: number; color?: string; gap?: number },
): Key[] {
  const dur = Math.max(6, Math.round((end - start) * 0.6));
  const stagger = n > 1 ? (end - start - dur) / (n - 1) : 0;
  const a = start + i * stagger;
  const fx = x + i * size * gap;
  const from: Partial<Key> =
    mode === "rise" ? { y: y + size * 0.6 } : mode === "drop" ? { y: y - size * 0.6 } : mode === "slide" ? { x: fx - size * 2 } : {};
  return [
    { f: a, x: fx, y, size, serif, color, opacity: 0, ...from },
    { f: a + dur, x: fx, y, opacity: 1 },
  ];
}

export function CharRow({
  text, extra = [], weight = 900, ...opts
}: Parameters<typeof rowKeys>[2] & { text: string; extra?: Key[]; weight?: number }) {
  const frame = useCurrentFrame();
  const chars = [...text];
  return (
    <>
      {chars.map((ch, i) => (
        <Glyph key={i} char={ch} frame={frame} weight={weight} keys={[...rowKeys(i, chars.length, opts), ...extra]} />
      ))}
    </>
  );
}

/** 「成果物」の札 */
export function Card({
  x, y, w = 340, h = 132, fill = 0, opacity = 1, marks = 0, scale = 1,
}: { x: number; y: number; w?: number; h?: number; fill?: number; opacity?: number; marks?: number; scale?: number }) {
  if (opacity <= 0.001) return null;
  const bg = fill > 0 ? `rgba(36,64,107,${fill})` : C.paper;
  return (
    <div
      style={{
        position: "absolute", left: x, top: y, width: w, height: h, border: `5px solid ${C.ai}`, borderRadius: 10,
        background: bg, opacity, transform: `scale(${scale})`, display: "flex", alignItems: "center",
        justifyContent: "center", fontFamily: sans, fontWeight: 900, fontSize: 60, letterSpacing: "0.12em",
        color: fill > 0.5 ? C.paper : C.ai, boxSizing: "border-box",
      }}
    >
      成果物
      {Array.from({ length: 3 }, (_, k) => (
        <div
          key={k}
          style={{
            position: "absolute", right: 14 + k * 30, top: 12, width: 18, height: 18, borderRadius: 9,
            border: `4px solid ${fill > 0.5 ? C.paper : C.ai}`, opacity: Math.max(0, Math.min(1, marks - k)),
          }}
        />
      ))}
    </div>
  );
}

export function Dot({
  x, y, r = 18, color = C.ink, opacity = 1, ring = 0, ringColor = C.ai, scale = 1,
}: { x: number; y: number; r?: number; color?: string; opacity?: number; ring?: number; ringColor?: string; scale?: number }) {
  if (opacity <= 0.001) return null;
  const rr = r * mix(2.4, 1.75, ring);
  return (
    <>
      <div
        style={{
          position: "absolute", left: x - r, top: y - r, width: r * 2, height: r * 2, borderRadius: r,
          background: color, opacity, transform: `scale(${scale})`,
        }}
      />
      {ring > 0.001 ? (
        <div
          style={{
            position: "absolute", left: x - rr, top: y - rr, width: rr * 2, height: rr * 2, borderRadius: rr,
            border: `4px solid ${ringColor}`, opacity: opacity * Math.min(1, ring * 1.5), boxSizing: "border-box",
          }}
        />
      ) : null}
    </>
  );
}

export function HLine({ x, y, w, p, color = C.ink, h = 4, opacity = 1 }: { x: number; y: number; w: number; p: number; color?: string; h?: number; opacity?: number }) {
  if (p <= 0.001 || opacity <= 0.001) return null;
  return <div style={{ position: "absolute", left: x, top: y - h / 2, width: w * p, height: h, background: color, opacity }} />;
}

/** 決定的な疑似乱数（場面ごとに同じ配置になるように） */
export function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
