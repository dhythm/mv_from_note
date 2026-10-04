import { useCurrentFrame } from "remotion";
import { Card, CharRow, Dot, Scene, Wipe, B } from "../common";
import { C, EASE_INOUT, mix, prog } from "../design";
import { beatById } from "../timeline";

const CX = 960;
const CY = 410;
const R = 200;
const pt = (deg: number, r = R) => ({ x: CX + r * Math.cos((deg * Math.PI) / 180), y: CY + r * Math.sin((deg * Math.PI) / 180) });

// B10：環の上を進む。「指摘」では印が付くだけ／「議論・修正」で点が消え、別の所に新しい点／「再レビュー」でそれを見つける。
export function ReviewCycle() {
  const beat = beatById("B10");
  const frame = useCurrentFrame();
  const s0 = B.settle(beat, 0);
  const s1 = B.settle(beat, 1);
  // 環の進み（度）。-90 = 指摘、30 = 議論・修正、150 = 再レビュー
  const head =
    -90 + 120 * prog(frame, 36, 52, EASE_INOUT) + 120 * prog(frame, 84, 108, EASE_INOUT) + 120 * prog(frame, 128, 156, EASE_INOUT);
  const arcLen = ((head + 90) / 360) * 2 * Math.PI * R;
  const circ = 2 * Math.PI * R;
  const h = pt(head);
  const marked = prog(frame, 20, 32);
  const fixed = prog(frame, 52, 62, EASE_INOUT);
  const newBug = prog(frame, 62, 70);
  const refound = prog(frame, 108, 118);
  const dots = [
    { x: 900, y: 380, m: true },
    { x: 1018, y: 372, m: true },
    { x: 960, y: 460, m: false },
  ];
  return (
    <Scene beat={beat}>
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={C.grey} strokeWidth={3} opacity={0.45 * prog(frame, 0, 14)} />
        <circle
          cx={CX} cy={CY} r={R} fill="none" stroke={C.ai} strokeWidth={8} strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ}`} transform={`rotate(-90 ${CX} ${CY})`} opacity={prog(frame, 30, 36)}
        />
      </svg>
      <Dot x={h.x} y={h.y} r={12} color={C.ai} opacity={prog(frame, 18, 26)} />
      <CharRow text="指摘" x={CX - 56} y={CY - R - 70} size={56} start={0} end={s0 - 4} mode="drop" weight={700} />
      <CharRow text="議論・修正" x={pt(30).x + 40} y={pt(30).y + 30} size={56} start={2} end={s0 - 2} mode="slide" weight={700} />
      <CharRow text="再レビュー" x={pt(150).x - 40 - 5 * 56} y={pt(150).y + 30} size={56} start={4} end={s0} mode="fade" weight={700} />
      {dots.map((d, k) => (
        <Dot
          key={k} x={d.x} y={d.y} r={16} opacity={prog(frame, 6 + k * 3, 16 + k * 3) * (d.m ? 1 - fixed : 1)}
          ring={d.m ? marked : 0} scale={d.m ? 1 - fixed * 0.5 : 1}
        />
      ))}
      {/* 修正で生まれた新しい点 */}
      <Dot x={1030} y={450} r={16} opacity={newBug} scale={1 + (1 - newBug) * 0.8} ring={refound} />
      <Wipe text="直すことで、新たなバグが生まれることもある。" left={0} width={1920} align="center" top={800} size={60} start={44} end={s1} />
    </Scene>
  );
}

// B11：第三者の視線が成果物に集まり、札が一段上がって藍に満ちる。「善意の人」。
export function Goodwill() {
  const beat = beatById("B11");
  const frame = useCurrentFrame();
  const s0 = B.settle(beat, 0);
  const s1 = B.settle(beat, 1);
  const lift = prog(frame, 34, 56, EASE_INOUT);
  const cardX = 790;
  const cardY = mix(470, 420, lift);
  const sources = [{ x: 1760, y: 300 }, { x: 1760, y: 520 }, { x: 1500, y: 700 }];
  return (
    <Scene beat={beat}>
      <Wipe text="レビューアーは、第三者の視点で品質を高める" left={0} width={1920} align="center" top={190} size={62} start={0} end={s0} />
      <svg width={1920} height={1080} style={{ position: "absolute", left: 0, top: 0 }}>
        {sources.map((s, k) => {
          const p = prog(frame, 16 + k * 4, 34 + k * 4);
          const tx = cardX + 340;
          const ty = 536;
          return (
            <line
              key={k} x1={s.x} y1={s.y} x2={mix(s.x, tx, p)} y2={mix(s.y, ty, p)} stroke={C.ai} strokeWidth={3}
              opacity={p > 0 ? 0.7 * (1 - prog(frame, 70, 90)) : 0}
            />
          );
        })}
      </svg>
      <Card x={cardX} y={cardY} marks={3} fill={lift} opacity={prog(frame, 0, 12)} />
      <CharRow text="善意の人" x={(1920 - 4 * 150 * 1.25) / 2 + 150 * 0.125} y={790} size={150} gap={1.25} start={s0 + 2} end={s1} serif={1} mode="fade" />
    </Scene>
  );
}
