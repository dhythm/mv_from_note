import { useCurrentFrame } from "remotion";
import { CharRow, Dot, HLine, Scene, Wipe, B } from "../common";
import { C, EASE_INOUT, mix, mixColor, prog } from "../design";
import { beatById } from "../timeline";

// B07：一本目の視線が拾えなかった点を、別の角度の二本目が見つける。全部は見つからない（2点は残る）。
export function SecondViewpoint() {
  const beat = beatById("B07");
  const frame = useCurrentFrame();
  const settle = B.settle(beat);
  const dots = Array.from({ length: 9 }, (_, k) => ({ x: 330 + k * 158, y: 830 }));
  const A = [0, 3, 5, 7];
  const Bset = [1, 4, 8];
  const scan1 = mix(220, 1700, prog(frame, 30, 86, EASE_INOUT));
  const scan1On = prog(frame, 26, 32) * (1 - prog(frame, 86, 96));
  const scan2 = mix(1700, 220, prog(frame, 96, 150, EASE_INOUT));
  const scan2On = prog(frame, 92, 98) * (1 - prog(frame, 150, 160));
  return (
    <Scene beat={beat}>
      <Wipe text="複数の視点で、" left={240} top={250} size={64} start={0} end={settle - 4} />
      <CharRow text="一人では気づけない" x={240} y={470} size={88} start={2} end={settle} serif={1} />
      <CharRow text="問題点や改善点を発見する機会" x={240} y={590} size={88} start={4} end={settle} serif={1} />
      <HLine x={240} y={648} w={7 * 88} p={prog(frame, 150, 168)} color={C.ai} h={8} />
      {dots.map((d, k) => {
        const foundA = A.includes(k) && scan1 > d.x;
        const foundB = Bset.includes(k) && frame > 96 && scan2 < d.x;
        return (
          <Dot
            key={k} x={d.x} y={d.y} r={15} opacity={prog(frame, 10 + k, 22 + k)}
            color={foundB ? C.ai : foundA ? C.ink : "#D6D0C4"} ring={foundB ? 1 : 0}
          />
        );
      })}
      {/* 一本目：垂直の視線 */}
      <div style={{ position: "absolute", left: scan1, top: 760, width: 4, height: 140, background: C.ink, opacity: scan1On }} />
      {/* 二本目：傾いた別角度の視線 */}
      <div
        style={{
          position: "absolute", left: scan2, top: 740, width: 4, height: 180, background: C.ai, opacity: scan2On,
          transform: "rotate(28deg)",
        }}
      />
    </Scene>
  );
}

// 30個の点の配置（15列×2段）と、1回のレビューで見つかる10個（散らばっている）
const GRID = Array.from({ length: 30 }, (_, k) => ({ x: 330 + (k % 15) * 90, y: 430 + Math.floor(k / 15) * 100 }));
const FOUND = [1, 4, 6, 9, 13, 16, 20, 22, 25, 28];

// B08：視野の枠が通り過ぎても、印が付くのは10個。印の付いた点も消えない（発見≠修正）。20個はそのまま残る。
export function FocusLimit() {
  const beat = beatById("B08");
  const frame = useCurrentFrame();
  const s0 = B.settle(beat, 0);
  const s1 = B.settle(beat, 1);
  const frameX = mix(200, 1640, prog(frame, 70, 190, EASE_INOUT));
  const frameOn = prog(frame, 62, 72) * (1 - prog(frame, 190, 204));
  const remainPulse = prog(frame, 200, 214) * (1 - prog(frame, 214, 236));
  return (
    <Scene beat={beat}>
      <CharRow text="人の集中力には限りがある" x={240} y={220} size={88} start={0} end={s0} serif={1} />
      {GRID.map((d, k) => {
        const found = FOUND.includes(k) ? prog(frame, 0, 1) * (frameX > d.x ? 1 : 0) : 0;
        return (
          <Dot
            key={k} x={d.x} y={d.y} r={18} opacity={prog(frame, 14 + k * 0.9, 26 + k * 0.9)}
            color={found ? C.ai : C.ink} ring={found} scale={found ? 1 : 1 + remainPulse * 0.25}
          />
        );
      })}
      {/* レビューアーの視野 */}
      <div
        style={{
          position: "absolute", left: frameX - 130, top: 360, width: 260, height: 240, borderRadius: 18,
          border: `5px solid ${C.ai}`, opacity: frameOn, background: "rgba(36,64,107,0.05)",
        }}
      />
      <Wipe text="例えば、指摘すべき点が30あっても、" left={240} top={720} size={58} start={22} end={s1 - 6} />
      <Wipe text="1回で見つかるのが10なら、20は残る。" left={240} top={810} size={58} start={30} end={s1} />
    </Scene>
  );
}

// B09：作業者が事前に点を減らしてからレビューの枠へ。時間軸が伸びて、2回目の枠も入る。
export function PrepareBefore() {
  const beat = beatById("B09");
  const frame = useCurrentFrame();
  const settle = B.settle(beat);
  const cluster = Array.from({ length: 30 }, (_, k) => ({ x: 270 + (k % 6) * 62, y: 290 + Math.floor(k / 6) * 56 }));
  const keep = [2, 7, 9, 14, 17, 22, 26, 29];
  const frame1 = prog(frame, 92, 104);
  const frame2 = prog(frame, 150, 166);
  return (
    <Scene beat={beat}>
      {/* 時間軸 */}
      <HLine x={200} y={600} w={1520} p={prog(frame, 0, 34)} h={4} />
      <div
        style={{
          position: "absolute", left: 1708, top: 588, width: 0, height: 0, borderTop: "12px solid transparent",
          borderBottom: "12px solid transparent", borderLeft: `22px solid ${C.ink}`, opacity: prog(frame, 30, 36),
        }}
      />
      {[{ x: 860, on: frame1 }, { x: 1290, on: frame2 }].map((f, k) => (
        <div
          key={k}
          style={{
            position: "absolute", left: f.x, top: 270, width: 300, height: 290, borderRadius: 18,
            border: `5px solid ${C.ai}`, opacity: f.on, transform: `scale(${mix(0.9, 1, f.on)})`,
          }}
        />
      ))}
      {cluster.map((d, k) => {
        const kept = keep.indexOf(k);
        if (kept < 0) {
          const gone = prog(frame, 24 + k * 2, 34 + k * 2);
          return <Dot key={k} x={d.x} y={d.y} r={14} opacity={(1 - gone) * prog(frame, 0, 10)} scale={1 - gone * 0.6} />;
        }
        const move = prog(frame, 104 + kept * 2, 126 + kept * 2, EASE_INOUT);
        const tx = 900 + (kept % 4) * 72;
        const ty = 360 + Math.floor(kept / 4) * 110;
        const found = prog(frame, 128 + kept * 2, 136 + kept * 2);
        return (
          <Dot
            key={k} x={mix(d.x, tx, move)} y={mix(d.y, ty, move)} r={14} opacity={prog(frame, 0, 10)}
            color={mixColor(C.ink, C.ai, found)} ring={found}
          />
        );
      })}
      <Wipe text="だから作業者は、事前に品質を高め、" left={240} top={700} size={64} start={0} end={settle - 4} />
      <Wipe text="レビューを重ねる時間を確保しておく。" left={240} top={795} size={64} start={4} end={settle} />
    </Scene>
  );
}
