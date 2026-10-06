import React from "react";
import { AbsoluteFill, Audio, Sequence, staticFile } from "remotion";
import { SCENES } from "./theme";
import { Paper } from "./components/ui";
import { Question } from "./scenes/Question";
import { Cause1 } from "./scenes/Cause1";
import { Cause2 } from "./scenes/Cause2";
import { Pivot } from "./scenes/Pivot";
import { Method1 } from "./scenes/Method1";
import { Method2 } from "./scenes/Method2";
import { Conclusion } from "./scenes/Conclusion";

const len = (s: readonly [number, number]) => s[1] - s[0];

export const Main: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#efe8da" }}>
      <Paper />

      {/* BGM（器楽1本、115秒）。効果音・生成音声は使わない */}
      <Audio src={staticFile("bgm.wav")} />

      <Sequence from={SCENES.question[0]} durationInFrames={len(SCENES.question)} layout="none">
        <Question />
      </Sequence>
      <Sequence from={SCENES.cause1[0]} durationInFrames={len(SCENES.cause1)} layout="none">
        <Cause1 />
      </Sequence>
      <Sequence from={SCENES.cause2[0]} durationInFrames={len(SCENES.cause2)} layout="none">
        <Cause2 />
      </Sequence>
      <Sequence from={SCENES.pivot[0]} durationInFrames={len(SCENES.pivot)} layout="none">
        <Pivot />
      </Sequence>
      <Sequence from={SCENES.method1[0]} durationInFrames={len(SCENES.method1)} layout="none">
        <Method1 />
      </Sequence>
      <Sequence from={SCENES.method2[0]} durationInFrames={len(SCENES.method2)} layout="none">
        <Method2 />
      </Sequence>
      <Sequence from={SCENES.conclusion[0]} durationInFrames={len(SCENES.conclusion)} layout="none">
        <Conclusion />
      </Sequence>
    </AbsoluteFill>
  );
};
