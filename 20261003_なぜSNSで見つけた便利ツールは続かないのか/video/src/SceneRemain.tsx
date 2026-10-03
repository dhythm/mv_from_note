import { AbsoluteFill } from "remotion";
import { inOutCubic, ip, outBack, outCubic, outExpo, window } from "./anim";
import { INK, mincho, sans } from "./fonts";
import { layoutRow, quoteOf, seeded, swap } from "./lib";
import { AMBER } from "./SceneDay";
import { Chars, QuoteText } from "./Type";

// ノートの中心。05 は手で角度を変えた位置、04/06 は元の位置
const NOTE_04 = { x: 571, y: 314 };
const NOTE_05 = { x: 597, y: 288 };
// ノートの四隅。根はノートの下から伸びるので、この範囲には描かない
const NOTE_04_CORNERS = [437, 325, 555, 258, 708, 285, 598, 372];
const NOTE_05_CORNERS = [455, 345, 575, 195, 740, 232, 630, 380];

/** 「1つだけ、残す。」と、足されない「＋ 新しいもの」 */
function OnlyOne({ t }: { t: number }) {
  const o = window(t, 60.5, 65.2, 0.3, 0.5);
  if (o <= 0) return null;
  const one = ip(t, [60.5, 61.3], [0, 1], outBack);
  const add = ip(t, [61.9, 62.4], [0, 1], outBack);
  const strike = ip(t, [62.7, 63.1], [0, 1], outExpo);
  const drop = ip(t, [63.3, 64.0], [0, 1], (x) => x * x);
  const no = ip(t, [63.4, 63.9], [0, 1], outExpo);
  const ring = ip(t, [60.6, 62.2], [0, 1], outExpo) * ip(t, [63.4, 64.0], [1, 0]);
  return (
    <AbsoluteFill style={{ opacity: o }}>
      {/* 残ったノートを囲む輪 */}
      <div
        style={{
          position: "absolute",
          left: NOTE_04.x - 200,
          top: NOTE_04.y - 200,
          width: 400,
          height: 400,
          borderRadius: "50%",
          border: "2.5px solid rgba(255,255,255,0.95)",
          transform: `rotate(-8deg) scale(${1.4 - ring * 0.6}, ${(1.4 - ring * 0.6) * 0.38})`,
          opacity: ring,
          boxShadow: "0 0 24px rgba(255,255,255,0.5)",
        }}
      />
      <div style={{ position: "absolute", left: 80, top: 22, color: INK, display: "flex", alignItems: "baseline", gap: 10 }}>
        <span
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 112,
            lineHeight: 1,
            display: "inline-block",
            transform: `scale(${one})`,
            transformOrigin: "50% 80%",
          }}
        >
          1
        </span>
        <Chars
          lines={["つだけ、残す。"]}
          style={{ fontFamily: sans, fontWeight: 900, fontSize: 44 }}
          charStyle={({ index }) => {
            const p = ip(t, [60.9 + index * 0.05, 61.4 + index * 0.05], [0, 1], outExpo);
            return { opacity: p, transform: `translateX(${(1 - p) * 24}px)` };
          }}
        />
      </div>
      <div style={{ position: "absolute", right: 120, top: 46, textAlign: "right" }}>
        <div
          style={{
            position: "relative",
            display: "inline-block",
            padding: "6px 18px",
            borderRadius: 40,
            background: "rgba(255,255,255,0.92)",
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 30,
            color: INK,
            transform: `scale(${add}) translateY(${drop * 420}px) rotate(${drop * 24}deg)`,
            opacity: add * (1 - drop),
            boxShadow: "0 6px 18px rgba(0,0,0,0.2)",
          }}
        >
          ＋ 新しいもの
          <div style={{ position: "absolute", left: 10, right: 10, top: "50%", height: 4, background: "#c0392b", transform: `scaleX(${strike})`, transformOrigin: "left" }} />
        </div>
        <div
          style={{
            fontFamily: sans,
            fontWeight: 900,
            fontSize: 44,
            color: INK,
            marginTop: -46,
            opacity: no,
            transform: `translateY(${(1 - no) * -16}px)`,
          }}
        >
          足さない。
        </div>
      </div>
    </AbsoluteFill>
  );
}

// 「自分の習慣に合わせて順番を入れ替えてみます。」を、実際に順番を入れ替えて組み上げる
const REORDER_CHUNKS = ["自分の習慣に", "合わせて", "順番を", "入れ替えて", "みます。"];
const RO_SIZE = 38;
const RO_PAD = 14;
const FINAL_ORDER = [0, 1, 2, 3, 4];
// 2回の入れ替えで正しい順に戻る並び
const STEP1 = swap(FINAL_ORDER, 1, 3);
const START = swap(STEP1, 0, 2);
const SWAPS: { at: number; from: number[]; to: number[]; pair: [number, number] }[] = [
  { at: 66.9, from: START, to: STEP1, pair: [START[0], START[2]] },
  { at: 67.6, from: STEP1, to: FINAL_ORDER, pair: [STEP1[1], STEP1[3]] },
];
const SETTLE_FROM = 68.25;

function Reorder({ t }: { t: number }) {
  const q = quoteOf("reorder");
  if (REORDER_CHUNKS.join("") !== q.text) throw new Error("reorder chunks do not rebuild the quote");
  if (t < q.inAt || t > q.outAt + 0.6) return null;

  const settle = ip(t, [SETTLE_FROM, q.settleAt], [0, 1], inOutCubic);
  const pad = RO_PAD * (1 - settle);
  const gap = 16 * (1 - settle);
  const widths = REORDER_CHUNKS.map((c) => [...c].length * RO_SIZE + pad * 2);
  const out = ip(t, [q.outAt, q.outAt + 0.5], [0, 1]);
  const scrim = window(t, q.inAt - 0.2, q.outAt, 0.5, 0.6);

  const xs = REORDER_CHUNKS.map((_, id) => {
    let x = layoutRow(widths, START, gap, 640)[id];
    let lift = 0;
    for (const s of SWAPS) {
      const p = ip(t, [s.at, s.at + 0.6], [0, 1], inOutCubic);
      const a = layoutRow(widths, s.from, gap, 640)[id];
      const b = layoutRow(widths, s.to, gap, 640)[id];
      if (p > 0) x = a + (b - a) * p;
      if (s.pair.includes(id)) lift += Math.sin(p * Math.PI) * (id === s.pair[0] ? -56 : 56);
    }
    return { x, lift };
  });

  return (
    <>
      <AbsoluteFill
        style={{
          background: "linear-gradient(180deg, rgba(0,0,0,0) 62%, rgba(20,16,12,0.62) 100%)",
          opacity: scrim,
        }}
      />
      {REORDER_CHUNKS.map((chunk, id) => {
        const appear = ip(t, [q.inAt + id * 0.08, q.inAt + id * 0.08 + 0.45], [0, 1], outBack);
        const moving = SWAPS.some((s) => s.pair.includes(id) && t >= s.at && t <= s.at + 0.6);
        const startIndex = REORDER_CHUNKS.slice(0, id).join("").length;
        return (
          <div
            key={chunk}
            style={{
              position: "absolute",
              left: xs[id].x,
              top: 596 + xs[id].lift,
              padding: `4px ${pad}px`,
              borderRadius: 8,
              background: `rgba(255,255,255,${0.16 * (1 - settle)})`,
              border: `1.5px solid rgba(255,255,255,${0.75 * (1 - settle)})`,
              fontFamily: mincho,
              fontSize: RO_SIZE,
              lineHeight: 1.3,
              color: moving ? "#ffe2a6" : "#fff",
              whiteSpace: "nowrap",
              textShadow: "0 2px 10px rgba(0,0,0,0.5)",
              opacity: appear * (1 - out),
              transform: `scale(${0.6 + appear * 0.4})`,
              filter: `blur(${out * 4}px)`,
            }}
          >
            {[...chunk].map((ch, k) => {
              // 「順番を入れ替え」に、組み上がったあとで線を引く
              const gi = startIndex + k;
              const inMark = gi >= 10 && gi < 17;
              const m = inMark ? ip(t, [69.0 + (gi - 10) * 0.07, 69.2 + (gi - 10) * 0.07], [0, 1]) : 0;
              return (
                <span
                  key={k}
                  style={{
                    backgroundImage: `linear-gradient(90deg, ${AMBER} ${m * 100}%, transparent ${m * 100}%)`,
                    backgroundSize: "100% 30%",
                    backgroundPosition: "0 92%",
                    backgroundRepeat: "no-repeat",
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>
        );
      })}
    </>
  );
}

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
    grow(0, 0, angle, 260 + rnd() * 320, 0, 72.4 + rnd() * 1.2);
  }
  return roots;
})();

export function Roots({ t }: { t: number }) {
  if (t < 72.3) return null;
  const toOriginal = ip(t, [75.4, 79.4], [0, 1], inOutCubic);
  const anchor = {
    x: NOTE_05.x + (NOTE_04.x - NOTE_05.x) * toOriginal,
    y: NOTE_05.y + (NOTE_04.y - NOTE_05.y) * toOriginal,
  };
  const note = NOTE_05_CORNERS.map((v, i) => v + (NOTE_04_CORNERS[i] - v) * toOriginal);
  const fade = ip(t, [80.2, 82.5], [1, 0.32]);
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

export function SceneRemain({ t }: { t: number }) {
  if (t < 60 || t > 80.5) return null;
  return (
    <AbsoluteFill>
      <OnlyOne t={t} />
      <Reorder t={t} />
      <QuoteText
        quote={quoteOf("grow")}
        lines={["便利さは、育てるもの"]}
        t={t}
        style={{ left: 80, top: 46, letterSpacing: "0.08em", textShadow: "0 0 18px rgba(246,241,232,0.9)" }}
        fontFamily={mincho}
        fontSize={50}
        color={INK}
        highlights={[{ text: "育てる", color: AMBER, at: 75.2 }]}
      />
    </AbsoluteFill>
  );
}
