import { AbsoluteFill } from "remotion";
import { ip, outBack, outExpo } from "./anim";
import { AMBER, INDIGO, INK, mincho, sans } from "./fonts";
import { beatOf, fall } from "./lib";
import { BeatText, Chars, fallParams } from "./Type";

// 山が崩れる瞬間（秒）。「最適解」の引用が終わったところ
export const COLLAPSE = beatOf("optimal").outAt;

// 右側の壁。03 の画で文字を置ける場所
const WALL = { left: 772, top: 44 };
const WHITE_SHADOW = "0 2px 14px rgba(10,15,40,0.55)";

// 03 の画で、目覚まし時計と紙の山を指す札
const TAGS = [
  { label: "早朝ルーティン", at: 22.6, x: 92, y: 318, px: 392, py: 356 },
  { label: "デスクワーク向け", at: 28.3, x: 830, y: 500, px: 720, py: 420 },
];

/** 札：引き出し線と、ずれていく印刷（版ずれ）で「合わない」を見せる。崩れる瞬間に落ちる */
function Tag({ tag, t, seed }: { tag: (typeof TAGS)[number]; t: number; seed: number }) {
  const pop = ip(t, [tag.at, tag.at + 0.6], [0, 1], outBack);
  if (pop <= 0 || t > COLLAPSE + 2) return null;
  const line = ip(t, [tag.at, tag.at + 0.5], [0, 1], outExpo);
  const misregister = ip(t, [tag.at + 1.2, tag.at + 4], [0, 6]);
  const shake = ip(t, [44.5, COLLAPSE], [0, 1]);
  const jx = Math.sin(t * 53 + tag.x) * shake * 3.5;
  const tilt = ip(t, [tag.at + 1.2, tag.at + 4], [0, tag.x < 400 ? -5 : 5]) + Math.sin(t * 41) * shake * 4;
  const fp = fallParams(seed);
  const f = fall(t - COLLAPSE - fp.delay, fp);
  const fallen = f.x !== 0 || f.y !== 0;
  const left = tag.x < 400;
  const lx = tag.x + (left ? 236 : 0);

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
      {!fallen && (
        <svg width={1280} height={720} style={{ position: "absolute", left: 0, top: 0 }}>
          <line
            x1={lx}
            y1={tag.y + 27}
            x2={lx + (tag.px - lx) * line}
            y2={tag.y + 27 + (tag.py - tag.y - 27) * line}
            stroke="#fff"
            strokeWidth={2}
          />
          <circle cx={tag.px} cy={tag.py} r={5 * line} fill="#fff" />
        </svg>
      )}
      <div
        style={{
          position: "absolute",
          left: tag.x + jx + f.x,
          top: tag.y + f.y,
          padding: "8px 16px",
          height: 54,
          minWidth: 236,
          boxSizing: "border-box",
          background: "rgba(255,255,255,0.94)",
          borderRadius: 6,
          boxShadow: "0 8px 20px rgba(20,15,10,0.25)",
          transform: `rotate(${tilt + f.rotate}deg) scale(${pop})`,
          transformOrigin: "left center",
        }}
      >
        <div style={{ position: "relative", height: 38 }}>
          {text(AMBER, -misregister)}
          {text(INDIGO, misregister)}
          {text(INK, 0)}
        </div>
      </div>
    </>
  );
}

export function Tags({ t }: { t: number }) {
  return (
    <>
      {TAGS.map((tag, i) => (
        <Tag key={tag.label} tag={tag} t={t} seed={900 + i} />
      ))}
    </>
  );
}

/** 見出しの引用：「他人の」「便利さは、」…と一塊ずつ重く着地する */
function Others({ t }: { t: number }) {
  const b = beatOf("others");
  const chunks = ["他人の", "便利さは、", "他人のために", "作られています。"];
  if (chunks.join("") !== b.text) throw new Error("others chunks do not rebuild the beat");
  if (t < b.inAt || t > b.outAt + 0.8) return null;
  const chunkOf: number[] = [];
  chunks.forEach((c, ci) => {
    for (const _ of c) chunkOf.push(ci);
  });
  const span = b.settleAt - b.inAt - 0.3;
  const out = ip(t, [b.outAt, b.outAt + 0.5], [0, 1]);
  return (
    <Chars
      lines={[chunks[0] + chunks[1], chunks[2], chunks[3]]}
      style={{
        position: "absolute",
        ...WALL,
        fontFamily: mincho,
        fontWeight: 600,
        fontSize: 52,
        lineHeight: 1.3,
        color: "#fff",
        textShadow: WHITE_SHADOW,
      }}
      charStyle={({ index }) => {
        const ci = chunkOf[index];
        const at = b.inAt + (span * ci) / (chunks.length - 1);
        const land = ip(t, [at, at + 0.3], [0, 1], outBack);
        // 「他人」を他人の色で
        const other = index < 2 || (index >= 8 && index < 10);
        return {
          opacity: Math.min(1, land * 2) * (1 - out),
          color: other ? "#f6c76a" : undefined,
          transform: `translateY(${-(1 - land) * 50 - out * 12}px) scale(${1.5 - land * 0.5})`,
          filter: `blur(${out * 5}px)`,
        };
      }}
    />
  );
}

/** 「汎用的なほど、効力は薄い。」は薄く広がり、「特化するほど、効力は高い。」は締まって濃くなる */
function General({ t }: { t: number }) {
  const b = beatOf("general");
  const lines = ["汎用的なほど、", "効力は薄い。", "特化するほど、", "効力は高い。"];
  if (lines.join("") !== b.text) throw new Error("general lines do not rebuild the beat");
  if (t < b.inAt || t > b.outAt + 0.8) return null;
  const thin = ip(t, [b.inAt + 0.4, b.inAt + 1.6], [0, 1], outExpo);
  const sharp = ip(t, [b.settleAt - 0.1, b.settleAt + 0.6], [0, 1], outBack);
  const out = ip(t, [b.outAt, b.outAt + 0.5], [0, 1]);
  const lineIn = (line: number) => (line < 2 ? b.inAt + line * 0.15 : b.inAt + 0.3 + line * 0.12);
  return (
    <Chars
      lines={lines}
      style={{
        position: "absolute",
        ...WALL,
        fontFamily: sans,
        fontWeight: 900,
        fontSize: 44,
        lineHeight: 1.3,
        color: "#fff",
        textShadow: WHITE_SHADOW,
        opacity: 1 - out,
      }}
      lineStyles={[{}, { marginBottom: 14 }, {}, {}]}
      charStyle={({ index, line }) => {
        const p = ip(t, [lineIn(line) + index * 0.01, lineIn(line) + 0.4 + index * 0.01], [0, 1], outExpo);
        if (line < 2) {
          // 汎用：字間が開き、薄く、ぼやける
          return {
            opacity: p * (1 - thin * 0.55),
            filter: `blur(${thin * 1.6}px)`,
            marginRight: thin * 10,
            fontWeight: 500,
          };
        }
        // 特化：一度大きく、くっきり締まる
        return {
          opacity: p,
          transform: `scale(${1 + (1 - sharp) * 0.25})`,
          color: line === 3 ? "#f6c76a" : undefined,
        };
      }}
    />
  );
}

export function SceneCause({ t }: { t: number }) {
  if (t < 15 || t > 41) return null;
  return (
    <AbsoluteFill>
      <Others t={t} />
      <BeatText
        beat={beatOf("morningType")}
        lines={["朝型の人の", "早朝ルーティンは、", "夜型の人には、", "苦痛。"]}
        t={t}
        style={{ ...WALL, textShadow: WHITE_SHADOW }}
        fontFamily={sans}
        fontSize={38}
        color="#fff"
        lineStyles={[{ fontWeight: 500 }, { fontWeight: 500 }, { fontWeight: 500 }, { fontWeight: 900, fontSize: 72, lineHeight: 1.2 }]}
        highlights={[
          { text: "朝型", color: AMBER, at: 23.0 },
          { text: "夜型", color: INDIGO, at: 23.6 },
        ]}
      />
      <BeatText
        beat={beatOf("deskWork")}
        lines={["デスクワーク向けの", "ツールは、", "外回りの人には、", "使いづらい。"]}
        t={t}
        style={{ ...WALL, textShadow: WHITE_SHADOW }}
        fontFamily={sans}
        fontSize={38}
        color="#fff"
        lineStyles={[{ fontWeight: 500 }, { fontWeight: 500 }, { fontWeight: 500 }, { fontWeight: 900, fontSize: 72, lineHeight: 1.2 }]}
        highlights={[
          { text: "デスクワーク", color: AMBER, at: 29.0, duration: 0.6 },
          { text: "外回り", color: INDIGO, at: 29.7 },
        ]}
      />
      <General t={t} />
    </AbsoluteFill>
  );
}
