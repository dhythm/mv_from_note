import { Composition } from "remotion";
import { Debug } from "./Debug";
import { Proto } from "./Proto";
import { Film } from "./Film";
import { FILM_TOTAL } from "./film/beats";
import { PB } from "./cuts/proto";
import { FPS, OUT_H, OUT_W } from "./stage/geometry";

export function RemotionRoot() {
  return (
    <>
      <Composition id="Film" component={Film} durationInFrames={Math.round(FILM_TOTAL * FPS)} fps={FPS} width={OUT_W} height={OUT_H} />
      <Composition id="Proto" component={Proto} durationInFrames={Math.round(PB.end * FPS)} fps={FPS} width={OUT_W} height={OUT_H} />
      <Composition id="Debug" component={Debug} durationInFrames={72} fps={FPS} width={OUT_W} height={OUT_H} />
    </>
  );
}
