import { AbsoluteFill } from "remotion";
import { inCubic, inOutCubic, ip, outBack, outExpo } from "./anim";
import { AMBER, INK, sans } from "./fonts";
import { CARD_TEXTS, beatOf, seeded } from "./lib";
import { BeatText, Chars } from "./Type";

// 02 の静止画でスマホの画面がある位置
const PHONE = { x: 450, y: 448 };
// 取り入れたものが積もる場所（03 で山がある位置）
const PILE = { x: 560, y: 400 };

const CARD_COUNT = 28;
const cards = (() => {
  const rnd = seeded(20261003);
  return Array.from({ length: CARD_COUNT }, (_, i) => {
    // 画面下半分に散らす。スマホの周りは空けておく
    let tx = 0;
    let ty = 0;
    do {
      tx = 90 + rnd() * 1100;
      ty = 250 + rnd() * 430;
    } while (Math.abs(tx - PHONE.x) < 170 && Math.abs(ty - PHONE.y) < 90);
    return {
      text: CARD_TEXTS[i % CARD_TEXTS.length],
      launch: 0.9 + i * 0.1 + rnd() * 0.06,
      tx,
      ty,
      size: 15 + Math.round(rnd() * 15),
      rot: (rnd() - 0.5) * 24,
      gather: 4.1 + rnd() * 2.2,
      // 積もったときの位置（上へ少しずつ積み上がる）
      px: PILE.x + (rnd() - 0.5) * 200,
      py: PILE.y - i * 7 + (rnd() - 0.5) * 16,
      prot: (rnd() - 0.5) * 18,
      // 続かなかったものは消える。続いているのは数枚だけ
      survives: rnd() < 0.18,
      vanish: 9.0 + rnd() * 3.0,
    };
  });
})();

function PhoneGlow({ t }: { t: number }) {
  const on = Math.min(ip(t, [0.6, 1.0], [0, 1]), ip(t, [3.6, 4.6], [1, 0]));
  if (on <= 0) return null;
  const pulse = 0.75 + 0.25 * Math.sin((t - 0.6) * Math.PI * 2.4);
  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: PHONE.x - 260,
          top: PHONE.y - 160,
          width: 520,
          height: 320,
          borderRadius: "50%",
          background: "radial-gradient(ellipse, rgba(255,250,235,0.9) 0%, rgba(255,250,235,0) 65%)",
          mixBlendMode: "screen",
          opacity: on * pulse * 0.8,
        }}
      />
      {[0, 1, 2, 3].map((k) => {
        const start = 0.8 + k * 0.6;
        const p = ip(t, [start, start + 1.6], [0, 1], outExpo);
        if (p <= 0 || p >= 1) return null;
        return (
          <div
            key={k}
            style={{
              position: "absolute",
              left: PHONE.x,
              top: PHONE.y,
              width: 640,
              height: 640,
              marginLeft: -320,
              marginTop: -320,
              borderRadius: "50%",
              border: "2px solid rgba(255,255,255,0.9)",
              transform: `rotate(-20deg) scale(${0.12 + p * 0.9}, ${(0.12 + p * 0.9) * 0.42})`,
              opacity: (1 - p) * on,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
}

/** 投稿が次々に飛び出し、机に積もり、ほとんどが消えていく */
function Cards({ t }: { t: number }) {
  const allGone = ip(t, [13.8, 15.4], [1, 0]);
  if (allGone <= 0) return null;
  return (
    <>
      {cards.map((c, i) => {
        const fly = ip(t, [c.launch, c.launch + 0.9], [0, 1], outExpo);
        if (fly <= 0) return null;
        const pop = ip(t, [c.launch, c.launch + 0.5], [0, 1], outBack);
        const g = ip(t, [c.gather, c.gather + 0.9], [0, 1], inOutCubic);
        const v = c.survives ? 0 : ip(t, [c.vanish, c.vanish + 0.5], [0, 1], inCubic);
        if (v >= 1) return null;
        // 「少ない」と言われるあいだ、残った数枚も色が抜ける
        const fade = ip(t, [9.0, 11.0], [0, 1]);
        const x0 = PHONE.x + (c.tx - PHONE.x) * fly;
        const y0 = PHONE.y + (c.ty - PHONE.y) * fly;
        const x = x0 + (c.px - x0) * g;
        const y = y0 + (c.py - y0) * g;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%, -50%) rotate(${c.rot + (c.prot - c.rot) * g}deg) scale(${pop * (1 - g * 0.2) * (1 - v)})`,
              opacity: allGone * (1 - v * 0.5) * (c.survives ? 1 - fade * 0.35 : 1),
              filter: `grayscale(${fade})`,
              padding: `${c.size * 0.35}px ${c.size * 0.8}px`,
              borderRadius: c.size,
              background: "rgba(255,255,255,0.95)",
              boxShadow: "0 6px 18px rgba(40,30,20,0.22)",
              fontFamily: sans,
              fontWeight: 900,
              fontSize: c.size,
              color: c.text === CARD_TEXTS[0] ? INK : "#b4532a",
              whiteSpace: "nowrap",
            }}
          >
            {c.text}
          </div>
        );
      })}
    </>
  );
}

/** 「なぜ、続かないのか。」：画面を少し沈めて、大きく1行 */
function Why({ t }: { t: number }) {
  const b = beatOf("why");
  const dim = Math.min(ip(t, [b.inAt - 0.2, b.inAt + 0.3], [0, 1]), ip(t, [b.outAt, b.outAt + 0.6], [1, 0]));
  if (dim <= 0) return null;
  const lines = ["なぜ、続かないのか。"];
  if (lines.join("") !== b.text) throw new Error("why lines do not rebuild the beat");
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(15,12,10,0.5)", opacity: dim }} />
      <Chars
        lines={lines}
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 290,
          textAlign: "center",
          fontFamily: sans,
          fontWeight: 900,
          fontSize: 92,
          color: "#fff",
          textShadow: "0 6px 30px rgba(0,0,0,0.5)",
        }}
        charStyle={({ index }) => {
          const at = b.inAt + index * 0.035;
          const p = ip(t, [at, at + 0.3], [0, 1], outBack);
          const o = ip(t, [b.outAt, b.outAt + 0.5], [0, 1]);
          return {
            opacity: Math.min(1, p * 2) * (1 - o),
            transform: `scale(${1.8 - p * 0.8}) translateY(${-o * 20}px)`,
            filter: `blur(${(1 - p) * 8 + o * 6}px)`,
          };
        }}
      />
    </AbsoluteFill>
  );
}

export function SceneQuestion({ t }: { t: number }) {
  if (t > 17.5) return null;
  const textStyle = { left: 92, top: 56, textShadow: "0 0 18px rgba(246,241,232,0.95)" };
  return (
    <AbsoluteFill>
      <PhoneGlow t={t} />
      <Cards t={t} />
      <BeatText
        beat={beatOf("tried")}
        lines={["つい試して、", "いくつも取り入れてきた。"]}
        t={t}
        style={textStyle}
        fontFamily={sans}
        fontSize={34}
        color={INK}
        lineStyles={[{ fontWeight: 500 }, { fontWeight: 900, fontSize: 56, lineHeight: 1.25 }]}
      />
      <BeatText
        beat={beatOf("few")}
        lines={["でも、今でも使い続けているものは、", "驚くほど少ない。"]}
        t={t}
        style={textStyle}
        fontFamily={sans}
        fontSize={34}
        color={INK}
        lineStyles={[{ fontWeight: 500 }, { fontWeight: 900, fontSize: 64, lineHeight: 1.25 }]}
        highlights={[{ text: "少ない", color: AMBER, at: 9.6 }]}
      />
      <Why t={t} />
    </AbsoluteFill>
  );
}
