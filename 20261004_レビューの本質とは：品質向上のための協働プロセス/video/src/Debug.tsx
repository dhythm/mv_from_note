import { useCurrentFrame } from "remotion";
import { VERSIONS, pageKey } from "./story/pages";
import { riffle, turned } from "./story/flip";
import { Stage } from "./stage/Stage";
import { HAND_POINTS } from "./stage/geometry";
import type { StageState } from "./stage/types";

/** 位置合わせ確認用の静止画（本編には使わない） */
export function Debug() {
  const f = useCurrentFrame();
  const keys = VERSIONS.Q1.map(pageKey);
  const angles = riffle(f / 24, { start: 0.02, from: 0, to: 23 });
  const state: StageState = {
    camera: { cx: 804, cy: 386, zoom: 2.42 },
    book: { keys, angles, cover: 102, seal: 1 },
    hands:
      f < 300
        ? [
            { id: "aL", dx: 0, dy: 0, lift: 0 },
            { id: "bRpoint", dx: 0, dy: 0, lift: 0.6 },
          ]
        : [
            { id: "aL", dx: 0, dy: 0, lift: 0 },
            { id: "bLsupport", dx: 0, dy: 0, lift: 0 },
            { id: "aRwrite", dx: 0, dy: 0, lift: 0 },
            { id: "aRpinch", dx: 0, dy: 0, lift: 0, holding: "eraser" },
          ],
    desk: { pencil: true, eraser: true, stamp: true },

  };
  return <Stage state={state} />;
}
