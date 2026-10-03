import { AbsoluteFill } from "remotion";
import { ip, outExpo } from "./anim";
import { AMBER, INK, mincho, sans } from "./fonts";
import { beatOf, fall, seeded } from "./lib";
import { COLLAPSE, Tags } from "./SceneCause";
import { BeatText, fallParams } from "./Type";

// 紙片：前半は 03 の山から崩れ、後半は画面の上から降り注いで 04 への切り替えを覆う
const DEBRIS = (() => {
  const rnd = seeded(4660);
  const colors = ["#efe8dc", "#e2d8c6", "#d3c6b0", "#f7f3ec", "#3a3632", "#b8ab95"];
  return Array.from({ length: 150 }, (_, i) => {
    const fromStack = i < 60;
    const scale = fromStack ? 1 : 1.3 + rnd() * 1.2;
    return {
      x: fromStack ? 330 + rnd() * 440 : -80 + rnd() * 1360,
      y: fromStack ? 90 + rnd() * 400 : -260 - rnd() * 260,
      w: (40 + rnd() * 120) * scale,
      h: (26 + rnd() * 70) * scale,
      r: (rnd() - 0.5) * 60,
      color: colors[i % colors.length],
      ...fallParams(5000 + i),
      delay: fromStack ? rnd() * 0.15 : 0.15 + rnd() * 0.9,
    };
  });
})();

function Debris({ t }: { t: number }) {
  if (t < COLLAPSE || t > COLLAPSE + 3) return null;
  return (
    <>
      {DEBRIS.map((d, i) => {
        const appear = ip(t, [COLLAPSE + d.delay, COLLAPSE + d.delay + 0.08], [0, 1]);
        const f = fall(t - COLLAPSE - d.delay, { ...d, vx: d.vx * 1.6, vy: d.vy * 0.6, g: d.g * 0.55 });
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: d.x + f.x,
              top: d.y + f.y,
              width: d.w,
              height: d.h,
              background: d.color,
              opacity: appear,
              boxShadow: "0 10px 24px rgba(0,0,0,0.25)",
              transform: `rotate(${d.r + f.rotate}deg)`,
            }}
          />
        );
      })}
    </>
  );
}

/** 崩れたあと、残ったノートを囲む輪 */
function Ring({ t }: { t: number }) {
  const b = beatOf("turn");
  const ring = ip(t, [b.inAt + 0.8, b.inAt + 2.2], [0, 1], outExpo) * ip(t, [b.outAt, b.outAt + 0.6], [1, 0]);
  if (ring <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 571 - 200,
        top: 314 - 200,
        width: 400,
        height: 400,
        borderRadius: "50%",
        border: "2.5px solid rgba(255,255,255,0.95)",
        transform: `rotate(-8deg) scale(${1.4 - ring * 0.6}, ${(1.4 - ring * 0.6) * 0.38})`,
        opacity: ring,
        boxShadow: "0 0 24px rgba(255,255,255,0.5)",
      }}
    />
  );
}

export function SceneTurn({ t }: { t: number }) {
  if (t < 15 || t > 57.5) return null;
  const optimal = beatOf("optimal");
  const shake = ip(t, [44.5, COLLAPSE], [0, 1]);
  // 崩れる瞬間の一瞬の白
  const flash = ip(t, [COLLAPSE, COLLAPSE + 0.06, COLLAPSE + 0.5], [0, 0.35, 0]);
  return (
    <AbsoluteFill>
      <Tags t={t} />
      <BeatText
        beat={optimal}
        lines={["他人がシェアしてくれた", "『便利』は、あくまで", "その人にとっての", "最適解なのです。"]}
        t={t}
        style={{ left: 772, top: 50, letterSpacing: "0.03em", textShadow: "0 2px 14px rgba(10,15,40,0.55)" }}
        fontFamily={mincho}
        fontSize={38}
        color="#fff"
        highlights={[
          { text: "『便利』", color: AMBER, at: 41.6 },
          { text: "その人にとっての最適解", color: AMBER, at: 42.4, duration: 0.9 },
        ]}
        exit={{ fallAt: COLLAPSE }}
        extraCharStyle={({ index }) =>
          shake > 0 && t < COLLAPSE
            ? { translate: `${Math.sin(t * 61 + index) * shake * 2.5}px ${Math.cos(t * 47 + index * 2) * shake * 2.5}px` }
            : {}
        }
      />
      <Debris t={t} />
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
      <Ring t={t} />
      <BeatText
        beat={beatOf("turn")}
        lines={["参考にするのはいい。", "でも、続いているものは、そのまま使っていない。"]}
        t={t}
        style={{ left: 0, right: 0, top: 30, textAlign: "center", textShadow: "0 0 18px rgba(246,241,232,0.95)" }}
        fontFamily={sans}
        fontSize={32}
        color={INK}
        lineStyles={[{ fontWeight: 500 }, { fontWeight: 900, fontSize: 42, lineHeight: 1.35 }]}
        highlights={[{ text: "そのまま使っていない", color: AMBER, at: 51.6, duration: 0.8 }]}
      />
    </AbsoluteFill>
  );
}
