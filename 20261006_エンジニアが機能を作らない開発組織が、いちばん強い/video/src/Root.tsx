import React from "react";
import { Composition } from "remotion";
import { Main } from "./Main";
import { WIDTH, HEIGHT, FPS, DURATION } from "./theme";
import "./font";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="Main"
      component={Main}
      durationInFrames={DURATION}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
