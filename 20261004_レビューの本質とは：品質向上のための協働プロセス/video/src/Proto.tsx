import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { protoState } from "./cuts/proto";
import { Stage } from "./stage/Stage";
import { FPS } from "./stage/geometry";

/** 難所試作 C08〜C11（約30秒） */
export function Proto() {
  const t = useCurrentFrame() / FPS;
  return (
    <AbsoluteFill>
      <Stage state={protoState(t)} />
      {/* 紙・鉛筆・消しゴム・息の効果音（npm run sfx -- proto で合成） */}
      <Audio src={staticFile("gen/sfx-proto.wav")} />
    </AbsoluteFill>
  );
}
