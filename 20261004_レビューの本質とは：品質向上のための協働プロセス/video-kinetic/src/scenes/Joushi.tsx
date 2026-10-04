import { AbsoluteFill, useCurrentFrame } from "remotion";
import { CharRow, HLine, Wipe, B } from "../common";
import { C, EASE_IN, EASE_INOUT, mix, mixColor, prog } from "../design";
import { Glyph, Key } from "../glyph";
import { mincho } from "../fonts";
import { beatById, sec } from "../timeline";

// B12〜B13 を一つの舞台で。墨地で「上長の責任」と「レビュー」が一つの枠と朱印で束ねられる（混ざる）→
// 線が走って上下に切り分けられ、地が紙に戻る。上段「上長の責任」は残り続け、下段「レビュー」は印が外れて藍になる。

const SHU_LIGHT = "#E8836F";

export function Joushi() {
  const b12 = beatById("B12");
  const b13 = beatById("B13");
  const frame = useCurrentFrame();
  const T = sec(b13.start) - sec(b12.start); // B13 の開始（B12 先頭からの相対）
  const s12a = B.settle(b12, 0);
  const s12b = B.settle(b12, 1);
  const s13 = T + B.settle(b13);
  const out12 = B.out(b12);
  const end = T + B.end(b13);
  const out13 = T + B.out(b13);

  const toPaper = prog(frame, T, T + 16);
  const bg = mixColor(C.ink, C.paper, toPaper);
  const fadeAll = 1 - prog(frame, out13, end, EASE_IN);

  const BX = (1920 - 888) / 2; // 束ねた状態の左端（5字+4字×96 + 間24）
  const BY = 400;
  const joushiKeys = (i: number): Key[] => [
    { f: 0, x: BX + i * 96 - 500, y: BY, size: 96, color: C.paper, opacity: 0 },
    { f: s12a - 2, x: BX + i * 96, opacity: 1 },
    { f: T + 2 },
    { f: T + 22, x: 240 + i * 80, y: 250, size: 80, color: C.ink, easing: EASE_INOUT },
  ];
  const reviewKeys = (i: number): Key[] => [
    { f: 0, x: BX + 504 + i * 96 + 500, y: BY, size: 96, color: SHU_LIGHT, opacity: 0 },
    { f: s12a, x: BX + 504 + i * 96, opacity: 1 },
    { f: T + 2 },
    { f: T + 22, x: 240 + i * 80, y: 560, size: 80, color: C.ai, easing: EASE_INOUT },
  ];

  const border = prog(frame, s12a - 6, s12a + 6) * (1 - prog(frame, T, T + 8));
  const seal = prog(frame, s12a, s12a + 10);
  const sealDrop = prog(frame, T + 2, T + 22, EASE_IN);
  const summary12 = 1 - prog(frame, out12, T, EASE_IN);

  return (
    <AbsoluteFill style={{ background: bg, overflow: "hidden" }}>
      <AbsoluteFill style={{ opacity: fadeAll }}>
        {/* 束ねる枠 */}
        <div
          style={{
            position: "absolute", left: BX - 36, top: BY - 84, width: 888 + 72, height: 168, borderRadius: 14,
            border: `4px solid ${C.paper}`, opacity: border, transform: `scale(${mix(1.06, 1, border)})`,
          }}
        />
        {/* 朱印（束ねる承認） */}
        {seal > 0 && sealDrop < 1 ? (
          <div
            style={{
              position: "absolute", left: BX + 492 - 62, top: BY - 84 - 62 + sealDrop * 420, width: 124, height: 124,
              borderRadius: 62, border: `7px solid ${C.shu}`, background: "rgba(200,67,43,0.18)", color: C.shu,
              fontFamily: mincho, fontWeight: 800, fontSize: 44, display: "flex", alignItems: "center", justifyContent: "center",
              transform: `scale(${mix(1.6, 1, seal)}) rotate(${-8 + sealDrop * 40}deg)`,
              opacity: Math.min(1, seal * 1.4) * (1 - sealDrop), boxSizing: "border-box",
            }}
          >
            承認
          </div>
        ) : null}
        {[..."上長の責任"].map((ch, i) => <Glyph key={`j${i}`} char={ch} keys={joushiKeys(i)} frame={frame} />)}
        {[..."レビュー"].map((ch, i) => <Glyph key={`r${i}`} char={ch} keys={reviewKeys(i)} frame={frame} />)}
        <div style={{ opacity: summary12 }}>
          <Wipe text="上長がレビューすると、承認と責任が混ざりやすい。" left={0} width={1920} align="center" top={760} size={60}
            start={s12a} end={s12b} color={C.paper} />
        </div>

        {/* B13：切り分ける線と引用 */}
        <HLine x={240} y={430} w={1440} p={prog(frame, T, T + 14)} h={4} />
        <CharRow text="上長の責任は上長の責任として、" x={240} y={350} size={60} start={T + 8} end={s13 - 2} serif={1} />
        <CharRow text="レビューは品質を確保するためのものとして" x={240} y={660} size={60} start={T + 10} end={s13} serif={1} color={C.ai} />
        <CharRow text="切り分ける。" x={1680 - 6 * 88} y={870} size={88} start={T + 12} end={s13} mode="slide" />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export const JOUSHI_FROM = () => sec(beatById("B12").start);
export const JOUSHI_FRAMES = () => sec(beatById("B13").end) - sec(beatById("B12").start);
