import type { CSSProperties, ReactNode } from "react";
import { ip, outCubic, outExpo } from "./anim";
import type { Quote } from "./lib";

export type CharCtx = { ch: string; index: number; total: number; line: number };

/** 行ごとに1文字ずつ span に分けて描く。lines を連結した文字列が元の文になる。 */
export function Chars({
  lines,
  style,
  lineStyle,
  charStyle,
  renderChar,
}: {
  lines: string[];
  style?: CSSProperties;
  lineStyle?: CSSProperties;
  charStyle: (c: CharCtx) => CSSProperties;
  renderChar?: (c: CharCtx) => ReactNode;
}) {
  const total = lines.reduce((n, l) => n + [...l].length, 0);
  let index = 0;
  return (
    <div style={style}>
      {lines.map((line, li) => (
        <div key={li} style={{ whiteSpace: "nowrap", ...lineStyle }}>
          {[...line].map((ch) => {
            const c = { ch, index: index++, total, line: li };
            return (
              <span key={c.index} style={{ display: "inline-block", ...charStyle(c) }}>
                {renderChar ? renderChar(c) : ch}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export type Highlight = { text: string; color: string; at: number; duration?: number };

/** 文中の部分文字列に、左から引かれるマーカーを付ける（span の背景として） */
export function markerFor(text: string, highlights: Highlight[], t: number) {
  const chars = [...text];
  const ranges = highlights.map((h) => {
    const start = chars.join("").indexOf(h.text);
    if (start < 0) throw new Error(`highlight "${h.text}" not found in "${text}"`);
    return { ...h, start: [...text.slice(0, start)].length, len: [...h.text].length };
  });
  return (index: number): CSSProperties => {
    const r = ranges.find((x) => index >= x.start && index < x.start + x.len);
    if (!r) return {};
    const p = ip(t, [r.at, r.at + (r.duration ?? 0.5)], [0, r.len], outCubic) - (index - r.start);
    const pct = Math.max(0, Math.min(1, p)) * 100;
    return {
      backgroundImage: `linear-gradient(90deg, ${r.color} ${pct}%, transparent ${pct}%)`,
      backgroundSize: "100% 42%",
      backgroundPosition: "0 88%",
      backgroundRepeat: "no-repeat",
    };
  };
}

/**
 * 記事の引用。文字が少しずつ浮かび上がって元の文の形で静止し、outAt から消える。
 * exit を "none" にすると消さない（落下など別の演出に引き渡す）。
 */
export function QuoteText({
  quote,
  lines,
  t,
  style,
  fontFamily,
  fontSize,
  color,
  highlights = [],
  exit = "fade",
}: {
  quote: Quote;
  lines: string[];
  t: number;
  style: CSSProperties;
  fontFamily: string;
  fontSize: number;
  color: string;
  highlights?: Highlight[];
  exit?: "fade" | "none";
}) {
  if (lines.join("") !== quote.text) {
    throw new Error(`lines do not rebuild the quote: ${quote.id}`);
  }
  if (t < quote.inAt || (exit === "fade" && t > quote.outAt + 0.6)) return null;
  const marker = markerFor(quote.text, highlights, t);
  const span = quote.settleAt - quote.inAt - 0.5;
  const out = exit === "fade" ? ip(t, [quote.outAt, quote.outAt + 0.5], [0, 1]) : 0;

  return (
    <Chars
      lines={lines}
      style={{ position: "absolute", fontFamily, fontSize, color, lineHeight: 1.55, ...style }}
      charStyle={({ index, total }) => {
        const start = quote.inAt + (span * index) / Math.max(1, total - 1);
        const p = ip(t, [start, start + 0.5], [0, 1], outExpo);
        const outDelay = (index / total) * 0.25;
        const o = ip(out, [outDelay, outDelay + 0.75], [0, 1]);
        return {
          opacity: p * (1 - o),
          transform: `translateY(${(1 - p) * 18 - o * 10}px)`,
          filter: `blur(${(1 - p) * 6 + o * 4}px)`,
          ...marker(index),
        };
      }}
    />
  );
}
