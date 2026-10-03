import { AbsoluteFill } from "remotion";
import { ip, outBack, outExpo } from "./anim";
import { INK, mincho } from "./fonts";
import { quoteOf } from "./lib";
import { Chars } from "./Type";

const LINES = ["便利さは、与えられるものではなく、", "作り上げるものです。"];

/**
 * 最後の一文。前半は淡く流れ、「作り上げるものです。」は1文字ずつ上から積み上がる。
 * 静止した後は元の文のまま、最後まで画の上に残す。
 */
export function SceneEnd({ t }: { t: number }) {
  const q = quoteOf("final");
  if (LINES.join("") !== q.text) throw new Error("final lines do not rebuild the quote");
  if (t < q.inAt) return null;
  const firstLen = [...LINES[0]].length;
  const dimGiven = ip(t, [82.6, 83.4], [1, 0.45]);
  const end = ip(t, [89.3, 90], [0, 1]);
  return (
    <AbsoluteFill>
      <Chars
        lines={LINES}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 26,
          textAlign: "center",
          fontFamily: mincho,
          color: INK,
          textShadow: "0 0 20px rgba(246,241,232,0.95)",
        }}
        lineStyle={{ lineHeight: 1.4 }}
        charStyle={({ index }) => {
          if (index < firstLen) {
            const at = q.inAt + index * 0.075;
            const p = ip(t, [at, at + 0.6], [0, 1], outExpo);
            // 「与えられるもの」(5..11) は、言い切った後で一段薄くなる
            const given = index >= 5 && index < 12;
            return {
              fontSize: 36,
              opacity: p * (given ? dimGiven : 1),
              filter: `blur(${(1 - p) * 5}px)`,
            };
          }
          const k = index - firstLen;
          const at = 81.95 + k * 0.1;
          const p = ip(t, [at, at + 0.45], [0, 1], outBack);
          return {
            fontSize: 60,
            fontWeight: 600,
            opacity: Math.min(1, p * 3),
            transform: `translateY(${(1 - p) * -90}px)`,
          };
        }}
      />
      <AbsoluteFill style={{ background: "#000", opacity: end * 0.85 }} />
    </AbsoluteFill>
  );
}
