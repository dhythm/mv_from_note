import { AbsoluteFill } from "remotion";
import { inOutCubic, ip, outBack, outExpo, window } from "./anim";
import { AMBER, INK, mincho, sans } from "./fonts";
import { beatOf, layoutRow, swap } from "./lib";
import { BeatText, Chars } from "./Type";

// 04 の画でノートの中心
const NOTE = { x: 571, y: 314 };

/** 「まず、自分を観察する。」と、ノートから伸びる3つの問い */
const QUESTIONS = [
  { text: "いつ不便か", x: 120, y: 236 },
  { text: "どこで集中できるか", x: 790, y: 262 },
  { text: "何が得意で苦手か", x: 640, y: 410 },
];

function Observe({ t }: { t: number }) {
  const b = beatOf("observe");
  const head = "まず、自分を観察する。";
  if (head + QUESTIONS.map((q) => q.text).join("") !== b.text) throw new Error("observe does not rebuild the beat");
  const o = window(t, b.inAt, b.outAt, 0.01, 0.5);
  if (o <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity: o }}>
      <Chars
        lines={[head]}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 40,
          textAlign: "center",
          fontFamily: sans,
          fontWeight: 900,
          fontSize: 50,
          color: INK,
          textShadow: "0 0 18px rgba(246,241,232,0.95)",
        }}
        charStyle={({ index }) => {
          const p = ip(t, [b.inAt + index * 0.03, b.inAt + 0.35 + index * 0.03], [0, 1], outExpo);
          return { opacity: p, transform: `translateY(${(1 - p) * 16}px)` };
        }}
      />
      <svg width={1280} height={720} style={{ position: "absolute", left: 0, top: 0 }}>
        {QUESTIONS.map((q, i) => {
          const at = b.inAt + 0.25 + i * 0.3;
          const p = ip(t, [at, at + 0.4], [0, 1], outExpo);
          const tx = q.x + (q.x < NOTE.x ? 150 : 0);
          const ty = q.y + 24;
          return (
            <g key={q.text} opacity={p}>
              <line
                x1={NOTE.x}
                y1={NOTE.y}
                x2={NOTE.x + (tx - NOTE.x) * p}
                y2={NOTE.y + (ty - NOTE.y) * p}
                stroke="#fff"
                strokeWidth={2}
                strokeDasharray="6 6"
              />
              <circle cx={NOTE.x} cy={NOTE.y} r={6} fill="#fff" />
            </g>
          );
        })}
      </svg>
      {QUESTIONS.map((q, i) => {
        const at = b.inAt + 0.25 + i * 0.3;
        const p = ip(t, [at, at + 0.4], [0, 1], outBack);
        return (
          <div
            key={q.text}
            style={{
              position: "absolute",
              left: q.x,
              top: q.y,
              padding: "8px 20px",
              borderRadius: 40,
              background: "rgba(255,255,255,0.95)",
              boxShadow: "0 8px 22px rgba(0,0,0,0.22)",
              fontFamily: sans,
              fontWeight: 900,
              fontSize: 28,
              color: INK,
              whiteSpace: "nowrap",
              transform: `scale(${p})`,
              transformOrigin: q.x < NOTE.x ? "right center" : "left center",
            }}
          >
            {q.text}
          </div>
        );
      })}
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

function Reorder({ t }: { t: number }) {
  const b = beatOf("reorder");
  if (REORDER_CHUNKS.join("") !== b.text) throw new Error("reorder chunks do not rebuild the beat");
  if (t < b.inAt || t > b.outAt + 0.6) return null;
  const swaps = [
    { at: b.inAt + 0.6, from: START, to: STEP1, pair: [START[0], START[2]] },
    { at: b.inAt + 1.25, from: STEP1, to: FINAL_ORDER, pair: [STEP1[1], STEP1[3]] },
  ];
  const settle = ip(t, [b.settleAt - 0.4, b.settleAt], [0, 1], inOutCubic);
  const pad = RO_PAD * (1 - settle);
  const gap = 16 * (1 - settle);
  const widths = REORDER_CHUNKS.map((c) => [...c].length * RO_SIZE + pad * 2);
  const out = ip(t, [b.outAt, b.outAt + 0.5], [0, 1]);

  const pos = REORDER_CHUNKS.map((_, id) => {
    let x = layoutRow(widths, START, gap, 640)[id];
    let lift = 0;
    for (const s of swaps) {
      const p = ip(t, [s.at, s.at + 0.55], [0, 1], inOutCubic);
      const from = layoutRow(widths, s.from, gap, 640)[id];
      const to = layoutRow(widths, s.to, gap, 640)[id];
      if (p > 0) x = from + (to - from) * p;
      if (s.pair.includes(id)) lift += Math.sin(p * Math.PI) * (id === s.pair[0] ? -56 : 56);
    }
    return { x, lift };
  });

  return (
    <>
      {REORDER_CHUNKS.map((chunk, id) => {
        const appear = ip(t, [b.inAt + id * 0.06, b.inAt + id * 0.06 + 0.4], [0, 1], outBack);
        const moving = swaps.some((s) => s.pair.includes(id) && t >= s.at && t <= s.at + 0.55);
        const startIndex = REORDER_CHUNKS.slice(0, id).join("").length;
        return (
          <div
            key={chunk}
            style={{
              position: "absolute",
              left: pos[id].x,
              top: 600 + pos[id].lift,
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
              // 組み上がったあと「順番を入れ替え」に線を引く
              const gi = startIndex + k;
              const m = gi >= 10 && gi < 17 ? ip(t, [b.settleAt + 0.3 + (gi - 10) * 0.07, b.settleAt + 0.5 + (gi - 10) * 0.07], [0, 1]) : 0;
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

/** 05 の下側に敷く暗いグラデーション（白い文字を読ませる） */
function BottomScrim({ t }: { t: number }) {
  const o = window(t, beatOf("arrange").inAt - 0.3, beatOf("reorder").outAt, 0.5, 0.6);
  if (o <= 0) return null;
  return (
    <AbsoluteFill
      style={{ background: "linear-gradient(180deg, rgba(0,0,0,0) 60%, rgba(20,16,12,0.66) 100%)", opacity: o }}
    />
  );
}

export function SceneMethod({ t }: { t: number }) {
  if (t < 56 || t > 77.5) return null;
  return (
    <AbsoluteFill>
      <Observe t={t} />
      <BottomScrim t={t} />
      <BeatText
        beat={beatOf("arrange")}
        lines={["次に、なぜ便利なのかを考えて、", "自分に合わせてアレンジする。"]}
        t={t}
        style={{ left: 0, right: 0, top: 560, textAlign: "center", textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}
        fontFamily={sans}
        fontSize={34}
        color="#fff"
        lineStyles={[{ fontWeight: 500 }, { fontWeight: 900, fontSize: 44, lineHeight: 1.3 }]}
        highlights={[{ text: "なぜ便利なのか", color: AMBER, at: 65.4, duration: 0.6 }]}
      />
      <Reorder t={t} />
    </AbsoluteFill>
  );
}
