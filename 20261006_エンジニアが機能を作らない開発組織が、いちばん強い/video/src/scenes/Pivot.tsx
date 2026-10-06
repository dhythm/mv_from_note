import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate, staticFile } from "remotion";
import { Video } from "@remotion/media";
import { COLOR, LAYER, WIDTH } from "../theme";
import { ReadingLine, jpFont, EASE_OUT, EASE_IN_OUT, fade } from "../components/ui";

// 転換 0:41–0:57 。AIで実務家も作れる→現場を知る人が形にする（動画A）→
// 意見の文字を消し、共通色の形を回して上下に積む（一度だけの大きな変形）。
// local: 動画A 150–300、変形 310–440、ラベル 418–475。

const MORPH_START = 312;
const MORPH_END = 438; // 約4.2秒。横の対立→縦の二層へ。

const MorphBlock: React.FC<{
  frame: number;
  fromCx: number;
  fromCy: number;
  toCx: number;
  toCy: number;
  delay: number;
  label: string;
  color: string;
}> = ({ frame, fromCx, fromCy, toCx, toCy, delay, label, color }) => {
  const s = MORPH_START + delay;
  const e = MORPH_END + delay;
  const p = interpolate(frame, [s, e], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_IN_OUT,
  });
  const fromW = 210;
  const fromH = 280;
  const cx = interpolate(p, [0, 1], [fromCx, toCx]);
  const cy = interpolate(p, [0, 1], [fromCy, toCy]);
  const w = interpolate(p, [0, 1], [fromW, LAYER.w]);
  const h = interpolate(p, [0, 1], [fromH, LAYER.h]);
  // 立ち上がりの出現（312 の少し前から）。
  const appear = interpolate(frame, [s - 18, s], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  // 回転の気配（±4度、着地で0へ）。
  const wob = Math.sin(p * Math.PI) * 4;
  const labelOpacity = interpolate(frame, [e - 8, e + 24], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  return (
    <div
      style={{
        position: "absolute",
        left: cx - w / 2,
        top: cy - h / 2,
        width: w,
        height: h,
        borderRadius: LAYER.r,
        background: color,
        opacity: appear,
        rotate: `${wob}deg`,
        boxShadow: "0 10px 24px rgba(40,40,40,0.12)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{ color: "#f3efe6", fontSize: 40, opacity: labelOpacity, letterSpacing: "0.04em", ...jpFont(800) }}
      >
        {label}
      </span>
    </div>
  );
};

export const Pivot: React.FC = () => {
  const frame = useCurrentFrame();

  // 動画窓（右）。
  const vidOpacity = fade(frame, 150, 300, 14, 16);
  const vidScale = interpolate(frame, [150, 176], [0.95, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  // 13 の左テキスト。
  const t13 = fade(frame, 158, 300, 14, 16);

  return (
    <AbsoluteFill>
      {/* 12 */}
      <ReadingLine frame={frame} text="いまはAIで、実務家も機能を作れる。" from={15} to={150} centerY={320} fontSize={50} weight={700} />

      {/* 13 現場を知る人が形にする（左テキスト＋動画A右） */}
      {t13 > 0 ? (
        <div
          style={{
            position: "absolute",
            left: 64,
            top: 300,
            width: 452,
            opacity: t13,
            color: COLOR.ink,
            fontSize: 42,
            lineHeight: 1.5,
            ...jpFont(700),
          }}
        >
          現場をいちばん知る人が、自分で形にする。
        </div>
      ) : null}

      <Sequence from={150} durationInFrames={150} layout="none">
        <div
          style={{
            position: "absolute",
            left: 686,
            top: 356 - 254 / 2,
            width: 452,
            height: 254,
            opacity: vidOpacity,
            scale: `${vidScale}`,
            borderRadius: 16,
            overflow: "hidden",
            border: `6px solid ${COLOR.slate}`,
            boxShadow: "0 16px 36px rgba(40,40,40,0.22)",
            boxSizing: "border-box",
          }}
        >
          <Video
            src={staticFile("cut-A.mp4")}
            muted
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </Sequence>

      {/* 14 ＋ 変形 */}
      <ReadingLine frame={frame} text="どちらが正しいかではなく、役割分担で解く。" from={312} to={478} centerY={110} />

      <MorphBlock
        frame={frame}
        fromCx={WIDTH / 2 - 112}
        fromCy={408}
        toCx={LAYER.cx}
        toCy={LAYER.upY}
        delay={0}
        label="機能／実務家"
        color={COLOR.slateUp}
      />
      <MorphBlock
        frame={frame}
        fromCx={WIDTH / 2 + 112}
        fromCy={408}
        toCx={LAYER.cx}
        toCy={LAYER.loY}
        delay={26}
        label="土台／エンジニア"
        color={COLOR.slateLo}
      />
    </AbsoluteFill>
  );
};
