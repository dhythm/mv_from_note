import { useCurrentFrame } from "remotion";
import { Card, CharRow, HLine, Scene, Wipe, B } from "../common";
import { C, EASE_INOUT, mix, prog } from "../design";
import { mincho } from "../fonts";
import { beatById } from "../timeline";

// B05：成果物の札だけがレビューアーへ渡って戻る。「作業者の責任」は錨の下線ごと一切動かない。
export function ShowingDoesNotMove() {
  const beat = beatById("B05");
  const frame = useCurrentFrame();
  const settle = B.settle(beat);

  const go = prog(frame, 44, 84, EASE_INOUT);
  const back = prog(frame, 120, 158, EASE_INOUT);
  const travel = go - back;
  const cardX = mix(250, 1250, travel);
  const cardY = 500 - Math.sin(Math.PI * travel) * 40;
  const marks = prog(frame, 90, 112) * 3;

  return (
    <Scene beat={beat}>
      {/* 中央の境界 */}
      <div style={{ position: "absolute", left: 1000, top: 290, width: 3, height: 400 * prog(frame, 0, 18), background: C.grey, opacity: 0.5 }} />
      <CharRow text="作業者の責任" x={210} y={380} size={84} start={0} end={settle - 4} mode="drop" />
      {/* 錨：太い下線 */}
      <HLine x={210} y={440} w={504} p={prog(frame, 6, settle)} h={12} />
      <CharRow text="レビューアー" x={1250} y={380} size={60} start={4} end={settle} mode="fade" color={C.grey} weight={700} />
      <Card x={cardX} y={cardY} marks={marks} opacity={prog(frame, 6, 20)} />
      <CharRow
        text="責任の所在が変わるわけではありません" x={(1920 - 18 * 72) / 2} y={830} size={72} start={6} end={settle}
        serif={1} mode="rise"
      />
    </Scene>
  );
}

// B06：墨地に反転。承認の印は否定せず置かれ、その下に注記。
export function ApprovalStillNeeded() {
  const beat = beatById("B06");
  const frame = useCurrentFrame();
  const settle = B.settle(beat);
  const wipe = prog(frame, 0, 12);
  const land = prog(frame, 2, 12);
  return (
    <Scene beat={beat}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 1920 * wipe, background: C.ink }} />
      {land > 0 ? (
        <div
          style={{
            position: "absolute", left: 960 - 90, top: 300 - 90, width: 180, height: 180, borderRadius: 90,
            border: `8px solid ${C.shu}`, color: C.shu, fontFamily: mincho, fontWeight: 800, fontSize: 60,
            display: "flex", alignItems: "center", justifyContent: "center", letterSpacing: "0.05em",
            transform: `scale(${mix(1.6, 1, land)}) rotate(-6deg)`, opacity: Math.min(1, land * 1.4), boxSizing: "border-box",
          }}
        >
          承認
        </div>
      ) : null}
      <Wipe
        text="承認を得ずに進めてよい、という意味ではない。" left={0} width={1920} align="center" top={560} size={72}
        start={2} end={settle} color={C.paper}
      />
    </Scene>
  );
}
