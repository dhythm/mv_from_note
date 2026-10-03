import { AbsoluteFill } from "remotion";
import { ip, outBack, outExpo, window } from "./anim";
import { mincho, sans } from "./fonts";
import { quoteOf } from "./lib";
import { Chars, QuoteText } from "./Type";

export const AMBER = "rgba(242,184,75,0.8)";
export const INDIGO = "rgba(120,140,235,0.8)";

// 03 の画で、目覚まし時計と紙の山を指す札。崩れるまで残る。
export const TAGS = [
  { label: "早朝ルーティン", at: 18.7, x: 92, y: 318, px: 392, py: 356 },
  { label: "デスクワーク中心", at: 19.3, x: 830, y: 500, px: 720, py: 420 },
];

/** 札：引き出し線と、ずれていく印刷（版ずれ）で「合わない」を見せる */
export function Tag({ tag, t, fallen }: { tag: (typeof TAGS)[number]; t: number; fallen?: { x: number; y: number; rotate: number } }) {
  const pop = ip(t, [tag.at, tag.at + 0.6], [0, 1], outBack);
  if (pop <= 0) return null;
  const line = ip(t, [tag.at, tag.at + 0.5], [0, 1], outExpo);
  const misregister = ip(t, [27.5, 39], [0, 7]);
  const shake = ip(t, [42.8, 46.6], [0, 1]);
  const jx = Math.sin(t * 53 + tag.x) * shake * 3.5;
  const tilt = ip(t, [28, 39], [0, tag.x < 400 ? -5 : 5]) + Math.sin(t * 41) * shake * 4;
  const f = fallen ?? { x: 0, y: 0, rotate: 0 };
  const lineOpacity = fallen && (f.x !== 0 || f.y !== 0) ? 0 : 0.85;

  const text = (color: string, dx: number) => (
    <div
      style={{
        position: "absolute",
        left: dx,
        top: 0,
        fontFamily: sans,
        fontWeight: 900,
        fontSize: 26,
        color,
        whiteSpace: "nowrap",
        letterSpacing: "0.04em",
      }}
    >
      {tag.label}
    </div>
  );

  return (
    <>
      <svg width={1280} height={720} style={{ position: "absolute", left: 0, top: 0, opacity: lineOpacity }}>
        <line
          x1={tag.x + (tag.x < 400 ? 230 : 0)}
          y1={tag.y + 22}
          x2={tag.x + (tag.x < 400 ? 230 : 0) + (tag.px - tag.x - (tag.x < 400 ? 230 : 0)) * line}
          y2={tag.y + 22 + (tag.py - tag.y - 22) * line}
          stroke="#fff"
          strokeWidth={2}
        />
        <circle cx={tag.px} cy={tag.py} r={5 * line} fill="#fff" />
      </svg>
      <div
        style={{
          position: "absolute",
          left: tag.x + jx + f.x,
          top: tag.y + f.y,
          padding: "8px 16px",
          height: 54,
          minWidth: 230,
          background: "rgba(255,255,255,0.92)",
          borderRadius: 6,
          boxShadow: "0 8px 20px rgba(20,15,10,0.25)",
          transform: `rotate(${tilt + f.rotate}deg) scale(${pop})`,
          transformOrigin: "left center",
        }}
      >
        <div style={{ position: "relative", height: 38, top: 0 }}>
          {text(AMBER, -misregister)}
          {text(INDIGO, misregister)}
          {text("#1f1c19", 0)}
        </div>
      </div>
    </>
  );
}

function Night({ t }: { t: number }) {
  const o = window(t, 20.8, 24.4, 0.3, 0.5);
  if (o <= 0) return null;
  const words = ["夜に動いて、", "外に出る。"];
  return (
    <div style={{ position: "absolute", left: 770, top: 70, color: "#fff", opacity: o }}>
      <Chars
        lines={["でも、この一日は"]}
        style={{ fontFamily: mincho, fontSize: 30, textShadow: "0 2px 12px rgba(0,0,0,0.4)" }}
        charStyle={({ index }) => {
          const p = ip(t, [20.8 + index * 0.05, 21.3 + index * 0.05], [0, 1], outExpo);
          return { opacity: p };
        }}
      />
      {words.map((w, i) => {
        const at = 21.7 + i * 0.6;
        const p = ip(t, [at, at + 0.7], [0, 1], outExpo);
        return (
          <div
            key={w}
            style={{
              fontFamily: sans,
              fontWeight: 900,
              fontSize: 66,
              lineHeight: 1.25,
              whiteSpace: "nowrap",
              opacity: p,
              transform: `translateX(${(1 - p) * 160}px) skewX(${(1 - p) * -18}deg)`,
              filter: `blur(${(1 - p) * 8}px)`,
              textShadow: "0 4px 20px rgba(10,15,40,0.5)",
            }}
          >
            {w}
          </div>
        );
      })}
    </div>
  );
}

export function SceneDay({ t }: { t: number }) {
  if (t < 18 || t > 40.5) return null;
  const quoteStyle = {
    left: 772,
    top: 46,
    letterSpacing: "0.04em",
    textShadow: "0 2px 12px rgba(10,15,40,0.45)",
  };
  return (
    <AbsoluteFill>
      <Night t={t} />
      <QuoteText
        quote={quoteOf("morningType")}
        lines={["朝型の人が作った", "早朝ルーティンは、", "夜型の人には", "苦痛でしかありません。"]}
        t={t}
        style={quoteStyle}
        fontFamily={mincho}
        fontSize={38}
        color="#fff"
        highlights={[
          { text: "朝型", color: AMBER, at: 26.6 },
          { text: "夜型", color: INDIGO, at: 27.3 },
        ]}
      />
      <QuoteText
        quote={quoteOf("deskWork")}
        lines={["デスクワーク中心の", "人向けのツールは、", "外回りが多い人には", "使いづらいものです。"]}
        t={t}
        style={quoteStyle}
        fontFamily={mincho}
        fontSize={38}
        color="#fff"
        highlights={[
          { text: "デスクワーク中心", color: AMBER, at: 33.8, duration: 0.7 },
          { text: "外回り", color: INDIGO, at: 34.6 },
        ]}
      />
    </AbsoluteFill>
  );
}
