import { Audio } from "@remotion/media";
import type { ComponentType } from "react";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { C } from "./design";
import { Goodwill, ReviewCycle } from "./scenes/Cycle";
import { Conclusion } from "./scenes/Ending";
import { FocusLimit, PrepareBefore, SecondViewpoint } from "./scenes/Focus";
import { Joushi } from "./scenes/Joushi";
import { Opening, OPENING_FRAMES } from "./scenes/Opening";
import { ApprovalStillNeeded, ShowingDoesNotMove } from "./scenes/Responsibility";
import { beatById, sec } from "./timeline";

// 場面と担当ビート。複数ビートを一つの舞台で続けるものは first〜last。
const SCENES: { first: string; last: string; component: ComponentType }[] = [
  { first: "B05", last: "B05", component: ShowingDoesNotMove },
  { first: "B06", last: "B06", component: ApprovalStillNeeded },
  { first: "B07", last: "B07", component: SecondViewpoint },
  { first: "B08", last: "B08", component: FocusLimit },
  { first: "B09", last: "B09", component: PrepareBefore },
  { first: "B10", last: "B10", component: ReviewCycle },
  { first: "B11", last: "B11", component: Goodwill },
  { first: "B12", last: "B13", component: Joushi },
  { first: "B14", last: "B14", component: Conclusion },
];

export function Main({ withAudio = true }: { withAudio?: boolean }) {
  return (
    <AbsoluteFill style={{ background: C.paper }}>
      <Sequence durationInFrames={OPENING_FRAMES}>
        <Opening />
      </Sequence>
      {SCENES.map(({ first, last, component: Comp }) => {
        const from = sec(beatById(first).start);
        return (
          <Sequence key={first} from={from} durationInFrames={sec(beatById(last).end) - from}>
            <Comp />
          </Sequence>
        );
      })}
      {withAudio ? <Audio src={staticFile("score.wav")} /> : null}
    </AbsoluteFill>
  );
}

export const SCENE_TABLE = SCENES;
