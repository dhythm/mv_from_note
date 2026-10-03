import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "./Backdrop";
import { SceneCause } from "./SceneCause";
import { Roots, SceneEnd } from "./SceneEnd";
import { SceneMethod } from "./SceneMethod";
import { SceneQuestion } from "./SceneQuestion";
import { SceneTurn } from "./SceneTurn";

export function Main() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // 各シーンは全体の絶対秒で動く（lib.ts の BEATS と同じ時間軸）
  const t = frame / fps;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Backdrop t={t} />
      <Roots t={t} />
      <SceneQuestion t={t} />
      <SceneCause t={t} />
      <SceneTurn t={t} />
      <SceneMethod t={t} />
      <SceneEnd t={t} />
      {/* この映像のために合成した BGM（bgm/compose.ts で生成） */}
      <Audio src={staticFile("bgm.mp3")} />
    </AbsoluteFill>
  );
}
