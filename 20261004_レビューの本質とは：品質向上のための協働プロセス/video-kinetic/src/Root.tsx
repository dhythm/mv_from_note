import { Composition, Still } from "remotion";
import { FontCheck } from "./FontCheck";
import { Main } from "./Main";
import { Opening, OPENING_FRAMES } from "./scenes/Opening";
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from "./timeline";

export function Root() {
  return (
    <>
      <Composition id="Main" component={Main} durationInFrames={TOTAL_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Composition id="Opening" component={Opening} durationInFrames={OPENING_FRAMES} fps={FPS} width={WIDTH} height={HEIGHT} />
      <Still id="FontCheck" component={FontCheck} width={WIDTH} height={HEIGHT} />
    </>
  );
}
