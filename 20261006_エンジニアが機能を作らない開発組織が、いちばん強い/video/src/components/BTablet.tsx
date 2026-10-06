import React from "react";
import { useCurrentFrame, staticFile } from "remotion";
import { Video } from "@remotion/media";
import { colorKey } from "@remotion/effects/color-key";
import { TabletScreen } from "./TabletScreen";

// 動画Bの端末画面に作業記録UIを合成する。
// 実素材1280×720の座標で組み、画面の四隅に合わせてUIを置き、
// 同じ映像を灰色キーで抜いて上に重ねることで、動く手を前面に残す。
//
// 端末画面の四隅（1280×720実座標、代表フレームから採寸）:
const QUAD = {
  tl: [628, 178],
  tr: [1055, 192],
  br: [1040, 455],
  bl: [614, 442],
} as const;

const polygon = `polygon(${QUAD.tl[0]}px ${QUAD.tl[1]}px, ${QUAD.tr[0]}px ${QUAD.tr[1]}px, ${QUAD.br[0]}px ${QUAD.br[1]}px, ${QUAD.bl[0]}px ${QUAD.bl[1]}px)`;

// UI配置用の外接矩形と傾き。
const UI_LEFT = 614;
const UI_TOP = 176;
const UI_W = 441;
const UI_H = 281;
const UI_ROT = -1.9; // 端末のわずかな傾き（右が上がる）

// 端末画面のおおよその灰色。
const SCREEN_GRAY = "#8b8c8e";

export const BTablet: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", inset: 0, width: 1280, height: 720 }}>
      {/* 1. 実素材（机・紙・手・灰色画面） */}
      <Video
        src={staticFile("cut-B.mp4")}
        muted
        style={{ position: "absolute", inset: 0, width: 1280, height: 720, objectFit: "cover" }}
      />

      {/* 2. 画面の四隅に合わせてUIを敷く */}
      <div style={{ position: "absolute", inset: 0, width: 1280, height: 720, clipPath: polygon }}>
        <div
          style={{
            position: "absolute",
            left: UI_LEFT,
            top: UI_TOP,
            width: UI_W,
            height: UI_H,
            rotate: `${UI_ROT}deg`,
            transformOrigin: "center center",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <TabletScreen localFrame={frame} />
        </div>
      </div>

      {/* 3. 同じ映像の灰色を抜いて上に重ね、動く手を前面へ戻す */}
      <div style={{ position: "absolute", inset: 0, width: 1280, height: 720, clipPath: polygon }}>
        <Video
          src={staticFile("cut-B.mp4")}
          muted
          effects={[
            colorKey({ keyColor: SCREEN_GRAY, similarity: 0.32, smoothness: 0.14, spillSuppression: 0.1 }),
          ]}
          style={{ position: "absolute", inset: 0, width: 1280, height: 720, objectFit: "cover" }}
        />
      </div>
    </div>
  );
};
