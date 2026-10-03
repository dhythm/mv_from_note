import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { Backdrop } from "./Backdrop";
import { Chapter } from "./Chapter";
import { SceneCollapse } from "./SceneCollapse";
import { SceneDay } from "./SceneDay";
import { SceneEnd } from "./SceneEnd";
import { SceneMorning } from "./SceneMorning";
import { Roots, SceneRemain } from "./SceneRemain";

export function Main() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // 各シーンは全体の絶対秒で動く（lib.ts の QUOTES と同じ時間軸）
  const t = frame / fps;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Backdrop t={t} />
      <Roots t={t} />
      <SceneMorning t={t} />
      <SceneDay t={t} />
      <SceneCollapse t={t} />
      <SceneRemain t={t} />
      <SceneEnd t={t} />
      <Chapter t={t} />
    </AbsoluteFill>
  );
}
