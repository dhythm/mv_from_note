import { AbsoluteFill } from "remotion";
import { inCubic, inOutCubic, ip, outBack, outExpo, window } from "./anim";
import { INK, mincho, sans } from "./fonts";
import { quoteOf, seeded } from "./lib";
import { Chars, QuoteText } from "./Type";

// 02 の静止画でスマホの画面がある位置
const PHONE = { x: 450, y: 448 };
// 03 で道具が積まれている位置（カードはここへ吸い込まれる）
const STACK = { x: 560, y: 360 };

const CARD_COUNT = 30;
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
      launch: 5.0 + i * 0.11 + rnd() * 0.08,
      tx,
      ty,
      size: 15 + Math.round(rnd() * 17),
      rot: (rnd() - 0.5) * 24,
      drift: (rnd() - 0.5) * 40,
      gather: 15.4 + rnd() * 1.4,
    };
  });
})();

function Opening({ t }: { t: number }) {
  const o = window(t, 0.6, 3.6, 0.3, 0.5);
  if (o <= 0) return null;
  const big = ip(t, [0.6, 1.6], [0, 1], outExpo);
  return (
    <div style={{ position: "absolute", left: 92, top: 58, opacity: o, color: INK }}>
      <div
        style={{
          fontFamily: sans,
          fontWeight: 900,
          fontSize: 132,
          lineHeight: 1,
          letterSpacing: `${(1 - big) * 0.6}em`,
          transform: `scale(${1.25 - big * 0.25})`,
          transformOrigin: "left center",
          filter: `blur(${(1 - big) * 10}px)`,
        }}
      >
        朝。
      </div>
      <Chars
        lines={["机は、空いている。"]}
        style={{ fontFamily: mincho, fontSize: 30, marginTop: 22, letterSpacing: "0.08em" }}
        charStyle={({ index }) => {
          const p = ip(t, [1.5 + index * 0.07, 2.0 + index * 0.07], [0, 1], outExpo);
          return { opacity: p, transform: `translateY(${(1 - p) * 12}px)` };
        }}
      />
    </div>
  );
}

function PhoneGlow({ t }: { t: number }) {
  const on = window(t, 4.5, 9.6, 0.5, 1.2);
  if (on <= 0) return null;
  const pulse = 0.75 + 0.25 * Math.sin((t - 4.5) * Math.PI * 2.2);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
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
        const start = 4.7 + k * 0.55;
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

/** 「これが便利」が次々に飛び出し、読まれないまま机の山へ吸い込まれる */
function Cards({ t }: { t: number }) {
  return (
    <>
      {cards.map((c, i) => {
        const fly = ip(t, [c.launch, c.launch + 0.9], [0, 1], outExpo);
        if (fly <= 0) return null;
        const g = ip(t, [c.gather, c.gather + 1.2], [0, 1], inCubic);
        if (g >= 1) return null;
        const pop = ip(t, [c.launch, c.launch + 0.5], [0, 1], outBack);
        // 引用を読む間は薄く退く
        const dim = ip(t, [9.2, 10.2], [1, 0.22]);
        const x0 = PHONE.x + (c.tx - PHONE.x) * fly + c.drift * ip(t, [c.launch, 16], [0, 1]);
        const y0 = PHONE.y + (c.ty - PHONE.y) * fly;
        const x = x0 + (STACK.x - x0) * g;
        const y = y0 + (STACK.y - y0) * g;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y,
              transform: `translate(-50%, -50%) rotate(${c.rot * (1 - g) + g * 90}deg) scale(${pop * (1 - g * 0.85)})`,
              opacity: Math.max(dim, g * 0.9) * (1 - g * 0.3),
              padding: `${c.size * 0.35}px ${c.size * 0.8}px`,
              borderRadius: c.size,
              background: "rgba(255,255,255,0.94)",
              boxShadow: "0 6px 18px rgba(40,30,20,0.22)",
              fontFamily: sans,
              fontWeight: 900,
              fontSize: c.size,
              color: INK,
              whiteSpace: "nowrap",
            }}
          >
            これが便利
          </div>
        );
      })}
    </>
  );
}

function PlaceIt({ t }: { t: number }) {
  // 手は中身を見ずに、光ったものを置く
  const o = window(t, 15.3, 17.6, 0.3, 0.5);
  if (o <= 0) return null;
  return (
    <Chars
      lines={["中身は見ずに、置く。"]}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 96,
        textAlign: "center",
        fontFamily: sans,
        fontWeight: 900,
        fontSize: 40,
        color: "#fff",
        textShadow: "0 2px 14px rgba(0,0,0,0.55)",
        opacity: o,
      }}
      charStyle={({ index }) => {
        const p = ip(t, [15.3 + index * 0.05, 15.75 + index * 0.05], [0, 1], outBack);
        return { transform: `translateY(${(1 - p) * -40}px)`, opacity: Math.min(1, p * 1.5) };
      }}
    />
  );
}

export function SceneMorning({ t }: { t: number }) {
  if (t > 18.2) return null;
  return (
    <AbsoluteFill>
      <Opening t={t} />
      <PhoneGlow t={t} />
      <Cards t={t} />
      <QuoteText
        quote={quoteOf("optimal")}
        lines={["他人がシェアしてくれた『便利』は、", "あくまでその人にとっての最適解なのです。"]}
        t={t}
        style={{ left: 92, top: 64, letterSpacing: "0.04em", textShadow: "0 0 18px rgba(246,241,232,0.9)" }}
        fontFamily={mincho}
        fontSize={40}
        color={INK}
        highlights={[
          { text: "『便利』", color: "rgba(242,184,75,0.75)", at: 11.2 },
          { text: "その人にとっての最適解", color: "rgba(242,184,75,0.75)", at: 12.0, duration: 0.9 },
        ]}
      />
      <Sweep t={t} />
    </AbsoluteFill>
  );
}

/** 03 への切り替えに重ねる、斜めの光の帯 */
function Sweep({ t }: { t: number }) {
  const p = ip(t, [16.3, 17.9], [0, 1], inOutCubic);
  if (p <= 0 || p >= 1) return null;
  return (
    <div
      style={{
        position: "absolute",
        top: -200,
        bottom: -200,
        width: 260,
        left: -400 + p * 2100,
        transform: "rotate(18deg)",
        background: "linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,250,240,0.45) 50%, rgba(255,255,255,0) 100%)",
        mixBlendMode: "screen",
      }}
    />
  );
}
