import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame, interpolate } from "remotion";
import { COLOR, LAYER } from "../theme";
import { ReadingLine, EASE_OUT, fade } from "../components/ui";
import { TwoLayer } from "../components/TwoLayer";
import { BTablet } from "../components/BTablet";

// 方法2 1:11–1:31 。支える役割を一つずつ下層に灯し、上層の機能を
// 現場で使う（動画B）。local: 動画B 450–600。

export const Method2: React.FC = () => {
  const frame = useCurrentFrame();

  // 下層に灯る支えの数（要件→PM・アーキ→QA→土台）。
  const chips = interpolate(
    frame,
    [70, 100, 200, 230, 320, 350, 430, 460],
    [0, 1, 1, 2, 2, 3, 3, 4],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT },
  );

  // 動画B窓（上層＝機能を現場で使う）。
  const vidOpacity = fade(frame, 450, 600, 16, 1);
  const upLabel = interpolate(frame, [438, 462], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <TwoLayer frame={frame} appear={1} chips={chips} upLabelOpacity={upLabel} loLabelOpacity={1} />

      {/* 動画B（320×180の窓に1280×720の合成を0.25で縮小） */}
      <Sequence from={450} durationInFrames={150} layout="none">
        <div
          style={{
            position: "absolute",
            left: LAYER.cx - 160,
            top: 278 - 90,
            width: 320,
            height: 180,
            opacity: vidOpacity,
            borderRadius: 12,
            overflow: "hidden",
            border: `5px solid ${COLOR.slate}`,
            boxShadow: "0 14px 30px rgba(40,40,40,0.24)",
            boxSizing: "border-box",
          }}
        >
          <div style={{ position: "absolute", left: 0, top: 0, width: 1280, height: 720, scale: "0.25", transformOrigin: "top left" }}>
            <BTablet />
          </div>
        </div>
      </Sequence>

      <ReadingLine frame={frame} text="要件を掘り出し、作れる形に落とす人。" from={10} to={140} centerY={96} />
      <ReadingLine frame={frame} text="推進するPM、形を決めるアーキテクト。" from={145} to={270} centerY={96} />
      <ReadingLine frame={frame} text="届けてよいと保証するQA。" from={275} to={372} centerY={96} />
      <ReadingLine frame={frame} text="土台を守るプラットフォームエンジニア。" from={377} to={478} centerY={96} />
      <ReadingLine frame={frame} text="ガードレールの内側で、実務家が作る。" from={483} to={596} centerY={96} />
    </AbsoluteFill>
  );
};
