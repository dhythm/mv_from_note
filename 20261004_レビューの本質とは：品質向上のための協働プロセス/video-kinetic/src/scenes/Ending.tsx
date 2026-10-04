import { useCurrentFrame } from "remotion";
import { CharRow, HLine, Scene, B } from "../common";
import { C, prog } from "../design";
import { Key } from "../glyph";
import { beatById } from "../timeline";

// B14：冒頭の運動を回収する。「承認を得るためのプロセスではなく、」は朱の通り道を水平に滑って来て、
// やがて灰に退く。「品質を高めるための協働作業です。」は藍で下から積み上がり、垂直の軸が伸びる。
export function Conclusion() {
  const beat = beatById("B14");
  const frame = useCurrentFrame();
  const settle = B.settle(beat);
  const line1Dim: Key[] = [{ f: 96 }, { f: 124, color: C.grey }];
  return (
    <Scene beat={beat}>
      <HLine x={0} y={470} w={1920} p={prog(frame, 0, 12)} color={C.shu} h={5} opacity={1 - prog(frame, 26, 46)} />
      <div
        style={{
          position: "absolute", left: 196, top: 700 - 330 * prog(frame, 12, 44), width: 8, height: 330 * prog(frame, 12, 44),
          background: C.ai,
        }}
      />
      <CharRow
        text="承認を得るためのプロセスではなく、" x={240} y={420} size={76} start={0} end={settle - 4} mode="slide"
        serif={1} color={C.shu} extra={line1Dim}
      />
      <CharRow text="品質を高めるための協働作業です。" x={240} y={600} size={92} start={6} end={settle} mode="rise" serif={1} color={C.ai} />
    </Scene>
  );
}
