import { AbsoluteFill } from "remotion";
import { ip, outBack, outExpo, window } from "./anim";
import { INK, mincho, sans } from "./fonts";
import { fall, quoteOf, seeded } from "./lib";
import { TAGS, Tag } from "./SceneDay";
import { Chars } from "./Type";

// 山が崩れる瞬間（秒）。ここから文字も札も紙片も落ちる
export const COLLAPSE = 46.6;

const OTHERS_CHUNKS = ["他人の", "便利さは、", "他人のために", "作られています。"];

const fallOf = (seed: number) => {
  const rnd = seeded(seed);
  return {
    delay: rnd() * 0.35,
    vx: (rnd() - 0.5) * 260,
    vy: -120 - rnd() * 280,
    g: 2600 + rnd() * 900,
    spin: (rnd() - 0.5) * 520,
  };
};

/** 「他人の便利さは〜」：一塊ずつ重く着地し、崩れる瞬間に1文字ずつ落ちる */
function Others({ t }: { t: number }) {
  const q = quoteOf("others");
  if (OTHERS_CHUNKS.join("") !== q.text) throw new Error("others chunks do not rebuild the quote");
  if (t < q.inAt || t > COLLAPSE + 2.2) return null;
  const starts: number[] = [];
  let acc = 0;
  const chunkOf: number[] = [];
  OTHERS_CHUNKS.forEach((c, ci) => {
    starts.push(acc);
    for (const _ of c) chunkOf.push(ci);
    acc += [...c].length;
  });
  const span = q.settleAt - q.inAt - 0.35;
  const shake = ip(t, [44.2, COLLAPSE], [0, 1]);
  return (
    <Chars
      lines={[OTHERS_CHUNKS[0] + OTHERS_CHUNKS[1], OTHERS_CHUNKS[2], OTHERS_CHUNKS[3]]}
      style={{
        position: "absolute",
        left: 770,
        top: 44,
        fontFamily: sans,
        fontWeight: 900,
        fontSize: 50,
        lineHeight: 1.32,
        color: "#fff",
        textShadow: "0 3px 16px rgba(10,15,40,0.5)",
      }}
      charStyle={({ index }) => {
        const ci = chunkOf[index];
        const at = q.inAt + (span * ci) / (OTHERS_CHUNKS.length - 1);
        const land = ip(t, [at, at + 0.35], [0, 1], outBack);
        const p = fallOf(index * 7 + 3);
        const f = fall(t - COLLAPSE - p.delay, p);
        const jx = Math.sin(t * 61 + index) * shake * 2.5;
        const jy = Math.cos(t * 47 + index * 2) * shake * 2.5;
        // 「他人」だけは琥珀色で、他人のものだと分かるように
        const other = (index >= 0 && index < 2) || (index >= starts[2] && index < starts[2] + 2);
        return {
          opacity: Math.min(1, land * 2),
          color: other ? "#f6c76a" : undefined,
          transform: `translate(${f.x + jx}px, ${f.y + jy - (1 - land) * 60}px) scale(${1.6 - land * 0.6}) rotate(${f.rotate}deg)`,
        };
      }}
    />
  );
}

/** 札は崩れる瞬間に落ちる */
function FallingTags({ t }: { t: number }) {
  if (t < 18 || t > COLLAPSE + 2) return null;
  return (
    <>
      {TAGS.map((tag, i) => {
        const p = fallOf(900 + i);
        return <Tag key={tag.label} tag={tag} t={t} fallen={fall(t - COLLAPSE - p.delay, p)} />;
      })}
    </>
  );
}

// 紙片：03 の山の範囲から落ちて、04 への画角の切り替えを覆う
const DEBRIS = (() => {
  const rnd = seeded(4660);
  const colors = ["#efe8dc", "#e2d8c6", "#d3c6b0", "#f7f3ec", "#3a3632", "#b8ab95"];
  return Array.from({ length: 150 }, (_, i) => {
    // 前半は山から崩れ、後半は画面の上から降り注いで切り替えを覆う
    const fromStack = i < 60;
    const scale = fromStack ? 1 : 1.3 + rnd() * 1.2;
    return {
      x: fromStack ? 330 + rnd() * 440 : -80 + rnd() * 1360,
      y: fromStack ? 90 + rnd() * 400 : -260 - rnd() * 260,
      w: (40 + rnd() * 120) * scale,
      h: (26 + rnd() * 70) * scale,
      r: (rnd() - 0.5) * 60,
      color: colors[i % colors.length],
      ...fallOf(5000 + i),
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

/** 崩れたあとの2行。「道具が悪いからではない」→「合わせていないから」 */
function Reason({ t }: { t: number }) {
  const a = window(t, 49.0, 53.0, 0.3, 0.45);
  const b = window(t, 53.6, 58.9, 0.3, 0.6);
  const strike = ip(t, [50.6, 51.2], [0, 1], outExpo);
  return (
    <>
      {a > 0 && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 46,
            textAlign: "center",
            color: INK,
            opacity: a,
          }}
        >
          <Chars
            lines={["落ちたのは、"]}
            style={{ fontFamily: mincho, fontSize: 30 }}
            charStyle={({ index }) => {
              const p = ip(t, [49 + index * 0.05, 49.5 + index * 0.05], [0, 1], outExpo);
              return { opacity: p, transform: `translateY(${(1 - p) * -20}px)` };
            }}
          />
          <div style={{ position: "relative", display: "inline-block", marginTop: 4 }}>
            <Chars
              lines={["道具が悪いから、ではない。"]}
              style={{ fontFamily: sans, fontWeight: 900, fontSize: 46 }}
              charStyle={({ index }) => {
                const p = ip(t, [49.5 + index * 0.04, 50.0 + index * 0.04], [0, 1], outExpo);
                return { opacity: p, transform: `translateY(${(1 - p) * -30}px)` };
              }}
            />
            {/* 「道具が悪いから」に引く線 */}
            <div
              style={{
                position: "absolute",
                left: 0,
                top: "52%",
                height: 4,
                width: 46 * 7 * strike,
                background: "#c0392b",
              }}
            />
          </div>
        </div>
      )}
      {b > 0 && (
        <div style={{ position: "absolute", left: 0, right: 0, top: 40, textAlign: "center", color: INK, opacity: b }}>
          <Chars
            lines={["この生活に、"]}
            style={{ fontFamily: mincho, fontSize: 30 }}
            charStyle={({ index }) => {
              const p = ip(t, [53.6 + index * 0.05, 54.1 + index * 0.05], [0, 1], outExpo);
              return { opacity: p };
            }}
          />
          <Chars
            lines={["合わせていないから。"]}
            style={{ fontFamily: sans, fontWeight: 900, fontSize: 60, lineHeight: 1.3 }}
            charStyle={({ index }) => {
              const at = 54.2 + index * 0.06;
              const p = ip(t, [at, at + 0.45], [0, 1], outBack);
              const mark = index < 7 ? ip(t, [55.2 + index * 0.05, 55.4 + index * 0.05], [0, 1]) : 0;
              return {
                opacity: Math.min(1, p * 1.5),
                transform: `scale(${0.4 + p * 0.6})`,
                backgroundImage: `linear-gradient(90deg, rgba(242,184,75,0.8) ${mark * 100}%, transparent ${mark * 100}%)`,
                backgroundSize: "100% 38%",
                backgroundPosition: "0 90%",
                backgroundRepeat: "no-repeat",
              };
            }}
          />
        </div>
      )}
    </>
  );
}

export function SceneCollapse({ t }: { t: number }) {
  if (t < 18 || t > 60.5) return null;
  // 崩れる瞬間の一瞬の白
  const flash = ip(t, [COLLAPSE, COLLAPSE + 0.06, COLLAPSE + 0.5], [0, 0.35, 0]);
  return (
    <AbsoluteFill>
      <FallingTags t={t} />
      <Others t={t} />
      <Debris t={t} />
      <AbsoluteFill style={{ background: "#fff", opacity: flash }} />
      <Reason t={t} />
    </AbsoluteFill>
  );
}
