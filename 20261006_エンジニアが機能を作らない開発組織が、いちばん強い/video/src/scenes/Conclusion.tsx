import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import { ReadingLine, EASE_IN_OUT } from "../components/ui";
import { TwoLayer } from "../components/TwoLayer";

// 結論 1:31–1:55 。思考実験の留保を残し、関与の光を機能側から
// 環境・品質側へ徐々に移す。機能側の光も残し、完全移行を示さない。最後は静止。

export const Conclusion: React.FC = () => {
  const frame = useCurrentFrame();

  const glowIn = interpolate(frame, [470, 520], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const shift = interpolate(frame, [540, 675], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_IN_OUT,
  });
  const upGlow = glowIn * interpolate(shift, [0, 1], [0.62, 0.34]);
  const loGlow = glowIn * interpolate(shift, [0, 1], [0.16, 0.66]);

  return (
    <AbsoluteFill>
      <TwoLayer frame={frame} appear={1} labelOpacity={1} upGlow={upGlow} loGlow={loGlow} chips={4} />

      <ReadingLine frame={frame} text="大きな組織を率いているわけではない。" from={20} to={150} centerY={100} />
      <ReadingLine frame={frame} text="思考実験で、間違っているかもしれない。" from={155} to={285} centerY={100} />
      <ReadingLine frame={frame} text="それでも、自分ならこうするだろう。" from={290} to={405} centerY={100} />
      <ReadingLine frame={frame} text="大切なものは、今も変わらない。" from={410} to={525} centerY={100} />
      <ReadingLine frame={frame} text="機能を作ることから、作れる環境を支えることへ。" from={530} to={655} centerY={100} fontSize={44} />
      <ReadingLine frame={frame} text="その比重が、少しずつ変わる。" from={620} to={720} centerY={620} fadeOut={1} />
    </AbsoluteFill>
  );
};
