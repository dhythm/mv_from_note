import type { CSSProperties, ReactNode } from "react";
import { ip, outCubic, outExpo } from "./anim";
import { fall, seeded, type Beat } from "./lib";

export type CharCtx = { ch: string; index: number; total: number; line: number };

/** 行ごとに1文字ずつ span に分けて描く。lines を連結した文字列が元の文になる。 */
export function Chars({
  lines,
  style,
  lineStyle,
  lineStyles,
  charStyle,
  renderChar,
}: {
  lines: string[];
  style?: CSSProperties;
  lineStyle?: CSSProperties;
  lineStyles?: CSSProperties[];
  charStyle: (c: CharCtx) => CSSProperties;
  renderChar?: (c: CharCtx) => ReactNode;
}) {
  const total = lines.reduce((n, l) => n + [...l].length, 0);
  let index = 0;
  return (
    <div style={style}>
      {lines.map((line, li) => (
        <div key={li} style={{ whiteSpace: "nowrap", ...lineStyle, ...lineStyles?.[li] }}>
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

export type Highlight = {
  text: string;
  color: string;
  at: number;
  duration?: number;
  /** marker: 下半分に引くマーカー / strike: 中央に引く取り消し線 */
  kind?: "marker" | "strike";
};

/** 文中の部分文字列に、左から引かれる線を付ける（span の背景として） */
export function markerFor(text: string, highlights: Highlight[], t: number) {
  const ranges = highlights.map((h) => {
    const start = text.indexOf(h.text);
    if (start < 0) throw new Error(`highlight "${h.text}" not found in "${text}"`);
    return { ...h, start: [...text.slice(0, start)].length, len: [...h.text].length };
  });
  return (index: number): CSSProperties => {
    const r = ranges.find((x) => index >= x.start && index < x.start + x.len);
    if (!r) return {};
    const p = ip(t, [r.at, r.at + (r.duration ?? 0.5)], [0, r.len], outCubic) - (index - r.start);
    const pct = Math.max(0, Math.min(1, p)) * 100;
    const strike = r.kind === "strike";
    return {
      backgroundImage: `linear-gradient(90deg, ${r.color} ${pct}%, transparent ${pct}%)`,
      backgroundSize: strike ? "100% 9%" : "100% 42%",
      backgroundPosition: strike ? "0 56%" : "0 88%",
      backgroundRepeat: "no-repeat",
    };
  };
}

/** 文字ごとの落下の初速など（崩れる場面で使う） */
export function fallParams(seed: number) {
  const rnd = seeded(seed);
  return {
    delay: rnd() * 0.35,
    vx: (rnd() - 0.5) * 260,
    vy: -120 - rnd() * 280,
    g: 2600 + rnd() * 900,
    spin: (rnd() - 0.5) * 520,
  };
}

/**
 * 画面に出す言葉のひとまとまり。文字が少しずつ浮かび上がって静止し、outAt から消える。
 * exit に fallAt を渡すと、消える代わりにその瞬間から1文字ずつ落ちる。
 */
export function BeatText({
  beat,
  lines,
  t,
  style,
  fontFamily,
  fontSize,
  color,
  lineStyles,
  highlights = [],
  exit = "fade",
  extraCharStyle,
}: {
  beat: Beat;
  lines: string[];
  t: number;
  style: CSSProperties;
  fontFamily: string;
  fontSize: number;
  color: string;
  lineStyles?: CSSProperties[];
  highlights?: Highlight[];
  exit?: "fade" | { fallAt: number };
  extraCharStyle?: (c: CharCtx) => CSSProperties;
}) {
  if (lines.join("") !== beat.text) {
    throw new Error(`lines do not rebuild the beat: ${beat.id}`);
  }
  const fallAt = exit === "fade" ? null : exit.fallAt;
  if (t < beat.inAt) return null;
  if (fallAt === null && t > beat.outAt + 0.8) return null;
  if (fallAt !== null && t > fallAt + 2.2) return null;
  const marker = markerFor(beat.text, highlights, t);
  const span = Math.max(0.05, beat.settleAt - beat.inAt - 0.4);
  const out = fallAt === null ? ip(t, [beat.outAt, beat.outAt + 0.5], [0, 1]) : 0;

  return (
    <Chars
      lines={lines}
      lineStyles={lineStyles}
      style={{ position: "absolute", fontFamily, fontSize, color, lineHeight: 1.5, ...style }}
      charStyle={(c) => {
        const { index, total } = c;
        const start = beat.inAt + (span * index) / Math.max(1, total - 1);
        const p = ip(t, [start, start + 0.4], [0, 1], outExpo);
        const outDelay = (index / total) * 0.25;
        const o = ip(out, [outDelay, outDelay + 0.75], [0, 1]);
        let fx = 0;
        let fy = 0;
        let fr = 0;
        if (fallAt !== null) {
          const fp = fallParams(index * 7 + 3);
          const f = fall(t - fallAt - fp.delay, fp);
          fx = f.x;
          fy = f.y;
          fr = f.rotate;
        }
        const extra = extraCharStyle?.(c) ?? {};
        return {
          opacity: p * (1 - o),
          transform: `translate(${fx}px, ${fy + (1 - p) * 18 - o * 10}px) rotate(${fr}deg)`,
          filter: `blur(${(1 - p) * 6 + o * 4}px)`,
          ...marker(index),
          ...extra,
        };
      }}
    />
  );
}
