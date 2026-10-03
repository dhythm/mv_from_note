import { AbsoluteFill } from "remotion";
import { inOutCubic, ip, outBack, outCubic, outExpo } from "./anim";
import { AMBER, INK, mincho, sans } from "./fonts";
import { TITLE, beatOf, seeded } from "./lib";
import { BeatText, Chars } from "./Type";

// ノートの中心。05 は手で角度を変えた位置、04/06 は元の位置
const NOTE_04 = { x: 571, y: 314 };
const NOTE_05 = { x: 597, y: 288 };
// ノートの四隅。根はノートの下から伸びるので、この範囲には描かない
const NOTE_04_CORNERS = [437, 325, 555, 258, 708, 285, 598, 372];
const NOTE_05_CORNERS = [455, 345, 575, 195, 740, 232, 630, 380];

// 根：ノートから机の天板に沿って広がる線。06 と同じ机の天板の範囲で切る
const DESK_TOP = "0,214 244,150 1140,264 1140,292 884,494 0,330";

type Root = { d: string; start: number; width: number };

const ROOTS: Root[] = (() => {
  const rnd = seeded(7300);
  const roots: Root[] = [];
  const grow = (x: number, y: number, angle: number, len: number, depth: number, start: number) => {
    const segs = 6 + Math.floor(rnd() * 4);
    let d = `M ${x.toFixed(1)} ${y.toFixed(1)}`;
    let a = angle;
    let cx = x;
    let cy = y;
    for (let i = 0; i < segs; i++) {
      a += (rnd() - 0.5) * 0.7;
      const step = len / segs;
      const nx = cx + Math.cos(a) * step;
      // 天板の奥行きに合わせて縦を潰す
      const ny = cy + Math.sin(a) * step * 0.42;
      d += ` Q ${(cx + Math.cos(a - 0.3) * step * 0.6).toFixed(1)} ${(cy + Math.sin(a - 0.3) * step * 0.25).toFixed(1)} ${nx.toFixed(1)} ${ny.toFixed(1)}`;
      if (depth < 2 && rnd() < 0.32) {
        grow(nx, ny, a + (rnd() < 0.5 ? -1 : 1) * (0.5 + rnd() * 0.6), len * 0.45, depth + 1, start + 0.25 + (i / segs) * 1.6);
      }
      cx = nx;
      cy = ny;
    }
    roots.push({ d, start, width: depth === 0 ? 2.8 : depth === 1 ? 1.7 : 1.1 });
  };
  const n = 9;
  for (let i = 0; i < n; i++) {
    const angle = (i / n) * Math.PI * 2 + rnd() * 0.4;
    grow(0, 0, angle, 260 + rnd() * 320, 0, 77.3 + rnd() * 1.0);
  }
  return roots;
})();

export function Roots({ t }: { t: number }) {
  if (t < 77.2) return null;
  const toOriginal = ip(t, [78.0, 81.0], [0, 1], inOutCubic);
  const anchor = {
    x: NOTE_05.x + (NOTE_04.x - NOTE_05.x) * toOriginal,
    y: NOTE_05.y + (NOTE_04.y - NOTE_05.y) * toOriginal,
  };
  const note = NOTE_05_CORNERS.map((v, i) => v + (NOTE_04_CORNERS[i] - v) * toOriginal);
  const fade = ip(t, [82.4, 84.5], [1, 0.3]);
  return (
    <svg width={1280} height={720} style={{ position: "absolute", left: 0, top: 0, opacity: fade }}>
      <defs>
        <clipPath id="desk">
          <polygon points={DESK_TOP} />
        </clipPath>
        <mask id="under-note" maskUnits="userSpaceOnUse" x={0} y={0} width={1280} height={720}>
          <rect width={1280} height={720} fill="#fff" />
          <polygon points={note.join(" ")} fill="#000" />
        </mask>
      </defs>
      <g clipPath="url(#desk)" mask="url(#under-note)">
        <g transform={`translate(${anchor.x} ${anchor.y})`}>
          {ROOTS.map((r, i) => {
            const p = ip(t, [r.start, r.start + 2.6], [0, 1], outCubic);
            if (p <= 0) return null;
            return (
              <path
                key={i}
                d={r.d}
                pathLength={1}
                fill="none"
                stroke="#3b2c1c"
                strokeOpacity={0.62}
                strokeWidth={r.width}
                strokeLinecap="round"
                strokeDasharray="1 1"
                strokeDashoffset={1 - p}
              />
            );
          })}
        </g>
      </g>
    </svg>
  );
}

const FINAL_LINES = ["便利さは、与えられるものではなく、", "作り上げるものです。"];

/**
 * 最後の一文。前半は流れるように出て「与えられるもの」が薄くなり、
 * 「作り上げるものです。」は1文字ずつ上から積み上がる。静止後は元の文のまま残す。
 */
function Final({ t }: { t: number }) {
  const b = beatOf("final");
  if (FINAL_LINES.join("") !== b.text) throw new Error("final lines do not rebuild the beat");
  if (t < b.inAt) return null;
  const firstLen = [...FINAL_LINES[0]].length;
  const dimGiven = ip(t, [84.2, 85.0], [1, 0.45]);
  return (
    <Chars
      lines={FINAL_LINES}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: 26,
        textAlign: "center",
        fontFamily: mincho,
        color: INK,
        textShadow: "0 0 20px rgba(246,241,232,0.95)",
      }}
      lineStyle={{ lineHeight: 1.4 }}
      charStyle={({ index }) => {
        if (index < firstLen) {
          const at = b.inAt + index * 0.07;
          const p = ip(t, [at, at + 0.5], [0, 1], outExpo);
          // 「与えられるもの」(5..11) は、言い切った後で一段薄くなる
          const given = index >= 5 && index < 12;
          return { fontSize: 36, opacity: p * (given ? dimGiven : 1), filter: `blur(${(1 - p) * 5}px)` };
        }
        const k = index - firstLen;
        const at = 83.8 + k * 0.08;
        const p = ip(t, [at, at + 0.45], [0, 1], outBack);
        return {
          fontSize: 60,
          fontWeight: 600,
          opacity: Math.min(1, p * 3),
          transform: `translateY(${(1 - p) * -90}px)`,
        };
      }}
    />
  );
}

/** 元記事のタイトル。最後に小さく出して、記事につなぐ */
function Title({ t }: { t: number }) {
  const p = ip(t, [87.2, 87.9], [0, 1], outCubic);
  if (p <= 0) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 40,
        textAlign: "center",
        fontFamily: sans,
        fontWeight: 500,
        fontSize: 20,
        letterSpacing: "0.08em",
        color: "#fff",
        textShadow: "0 1px 8px rgba(0,0,0,0.6)",
        opacity: p,
        transform: `translateY(${(1 - p) * 10}px)`,
      }}
    >
      ── {TITLE}
    </div>
  );
}

export function SceneEnd({ t }: { t: number }) {
  if (t < 77) return null;
  const end = ip(t, [89.5, 90], [0, 1]);
  return (
    <AbsoluteFill>
      <BeatText
        beat={beatOf("grow")}
        lines={["便利は、種のようなもの。", "便利さは、育てるもの"]}
        t={t}
        style={{ left: 80, top: 28, textShadow: "0 0 18px rgba(246,241,232,0.95)" }}
        fontFamily={sans}
        fontSize={30}
        color={INK}
        lineStyles={[{ fontWeight: 500 }, { fontFamily: mincho, fontSize: 54, lineHeight: 1.3, letterSpacing: "0.06em" }]}
        highlights={[{ text: "育てる", color: AMBER, at: 78.6 }]}
      />
      <Final t={t} />
      <Title t={t} />
      <AbsoluteFill style={{ background: "#000", opacity: end * 0.85 }} />
    </AbsoluteFill>
  );
}
