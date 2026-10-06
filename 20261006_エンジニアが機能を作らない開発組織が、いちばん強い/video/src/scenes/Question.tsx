import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { COLOR, WIDTH } from "../theme";
import { ReadingLine, jpFont, EASE_OUT, fade } from "../components/ui";

// 問い 0:00–0:14 。二つの声が横から衝突し、震えは収束。
// 意見の色・文字は後半の役割へ引き継がない。

const VoiceBlock: React.FC<{
  frame: number;
  text: string;
  side: "L" | "R";
}> = ({ frame, text, side }) => {
  const w = 236;
  const h = 300;
  const gap = 14;
  const restX =
    side === "L" ? WIDTH / 2 - gap / 2 - w / 2 : WIDTH / 2 + gap / 2 + w / 2;
  const fromX = side === "L" ? -w : WIDTH + w;

  // 55–150 で中央へ。150 で接触、以後 震えを約14フレームで収束。
  const slide = interpolate(frame, [55, 150], [fromX, restX], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const dir = side === "L" ? 1 : -1; // 接触後、互いに押し合う向き
  const shake =
    frame <= 150
      ? 0
      : Math.sin((frame - 150) * 0.9) *
        Math.exp(-(frame - 150) / 13) *
        9 *
        dir;
  const x = slide + shake;

  // 接触の一瞬だけ軽い縦圧（スケール）。
  const squash =
    frame <= 150
      ? 1
      : 1 + Math.sin((frame - 150) * 0.9) * Math.exp(-(frame - 150) / 10) * 0.03;

  const opacity = fade(frame, 55, 420, 10, 24);
  const textOpacity = interpolate(frame, [120, 158], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x - w / 2,
        top: 370 - h / 2,
        width: w,
        height: h,
        borderRadius: 18,
        background: side === "L" ? COLOR.voiceL : COLOR.voiceR,
        opacity,
        scale: `1 ${squash}`,
        boxShadow: "0 12px 26px rgba(40,40,40,0.14)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 22px",
        boxSizing: "border-box",
      }}
    >
      <span
        style={{
          color: "#f6f1e8",
          fontSize: 29,
          lineHeight: 1.5,
          textAlign: "center",
          opacity: textOpacity,
          ...jpFont(700),
        }}
      >
        {text}
      </span>
    </div>
  );
};

export const Question: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <ReadingLine
        frame={frame}
        text="エンジニアではない人が、AIで作る。"
        from={15}
        to={150}
        centerY={118}
        fontSize={48}
        weight={700}
      />
      <VoiceBlock frame={frame} text="「メンテナンスできるはずがない」" side="L" />
      <VoiceBlock frame={frame} text="「AIに任せればいい」" side="R" />
      <ReadingLine
        frame={frame}
        text="そのたびに、二つの声がぶつかる。"
        from={300}
        to={418}
        centerY={600}
        fontSize={46}
        color={COLOR.ink}
      />
    </AbsoluteFill>
  );
};
