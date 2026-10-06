import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { K, prog, mix, EASE_IN, OVERSHOOT } from "../kinetic/design";
import { Glyph, Phrase, Key } from "../kinetic/glyph";

// 問い 0:00–0:14 。文字が画面を支配する。
// 前提「エンジニアではない人が、AIで作る。」→ 大きな「作る」が左右に裂け、
// 二つの声の面（朱＝左／藍＝右）が突進して衝突。言葉の圧力で対立を見せる。
// 最後は面が割れて「そのたびに、二つの声がぶつかる。」が中央を打つ。

const SEAM = 640;

// 「作」：中央から左へ裂けて朱の面の種になる
const sakuKeys: Key[] = [
  { f: 40, x: 468, y: 416, size: 120, weight: 900, color: K.ink, opacity: 0 },
  { f: 58, size: 160, opacity: 1, easing: OVERSHOOT },
  { f: 86 },
  { f: 104, x: 120, y: 330, size: 74, color: K.shu, opacity: 0, easing: EASE_IN },
];
// 「る」：中央から右へ裂けて藍の面の種になる
const ruKeys: Key[] = [
  { f: 40, x: 628, y: 416, size: 120, weight: 900, color: K.ink, opacity: 0 },
  { f: 58, size: 160, opacity: 1, easing: OVERSHOOT },
  { f: 86 },
  { f: 104, x: 1086, y: 330, size: 74, color: K.ai, opacity: 0, easing: EASE_IN },
];

export const Question: React.FC = () => {
  const frame = useCurrentFrame();

  // 前提の一行
  const premiseIn = prog(frame, 6, 20);
  const premiseOut = 1 - prog(frame, 80, 92, EASE_IN);
  const premise = premiseIn * premiseOut;

  // 面の侵入（左右から突進）
  const leftIn = prog(frame, 96, 116);
  const rightIn = prog(frame, 100, 120);
  // 衝突の二度の押し合い（270–300）
  const shove =
    (prog(frame, 270, 278) - prog(frame, 278, 286)) +
    (prog(frame, 286, 294) - prog(frame, 294, 302));
  // 面の退場（315–332）
  const leftOut = prog(frame, 315, 332, EASE_IN);
  const rightOut = prog(frame, 318, 335, EASE_IN);

  const leftX = mix(-680, 0, leftIn) + shove * 16 - leftOut * 760;
  const rightX = mix(680, 0, rightIn) - shove * 16 + rightOut * 760;

  const seamOpacity = prog(frame, 110, 120) * (1 - prog(frame, 315, 326));
  const seamFlash = shove; // 押し合いで朱に光る
  const knock = prog(frame, 112, 128); // ヌキ文字の出
  // 読ませる区間にも交互の強調を置き、対立する声の応酬を続ける。
  // 64BPMの半拍ごと。文字の内容と読み順は保持する。
  const accent = (beats: number[]) =>
    beats.reduce((v, f) => v + prog(frame, f, f + 4) - prog(frame, f + 4, f + 10), 0);
  const leftAccent = accent([140, 196, 252]);
  const rightAccent = accent([168, 224, 280]);

  // まとめ「そのたびに、二つの声がぶつかる。」
  const sumSmall = prog(frame, 322, 334) * (1 - prog(frame, 406, 416, EASE_IN));
  const sumBig = prog(frame, 322, 338, OVERSHOOT) * (1 - prog(frame, 406, 416, EASE_IN));
  const bigSize = mix(92, 144, sumBig > 0 ? prog(frame, 322, 338, OVERSHOOT) : 0);

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* 前提 */}
      <Phrase
        text="エンジニアではない人が、AIで"
        left={80}
        top={220}
        width={1120}
        align="center"
        size={50}
        weight={600}
        color={K.ink}
        opacity={premise}
        dy={(1 - premiseIn) * -24}
      />
      {/* 大きな「作る」（裂ける） */}
      <Glyph char="作" keys={sakuKeys} frame={frame} />
      <Glyph char="る" keys={ruKeys} frame={frame} />

      {/* 左の面（朱） */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: SEAM,
          height: 720,
          background: K.shu,
          translate: `${leftX}px 0px`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 72,
            top: "50%",
            width: 496,
            translate: "0 -50%",
            color: K.knock,
            fontSize: 54,
            fontWeight: 800,
            fontVariationSettings: "'wght' 800",
            lineHeight: 1.36,
            opacity: knock,
            letterSpacing: "0.01em",
            whiteSpace: "pre",
            scale: 1 + leftAccent * 0.1,
            transformOrigin: "left center",
          }}
        >
          「メンテナンス
          <br />
          できるはずがない」
        </div>
      </div>

      {/* 右の面（藍） */}
      <div
        style={{
          position: "absolute",
          left: SEAM,
          top: 0,
          width: 1280 - SEAM,
          height: 720,
          background: K.ai,
          translate: `${rightX}px 0px`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 72,
            top: "50%",
            width: 496,
            translate: "0 -50%",
            color: K.knock,
            fontSize: 54,
            fontWeight: 800,
            fontVariationSettings: "'wght' 800",
            lineHeight: 1.36,
            opacity: knock,
            letterSpacing: "0.01em",
            scale: 1 + rightAccent * 0.1,
            transformOrigin: "left center",
          }}
        >
          「AIに
          <br />
          任せればいい」
        </div>
      </div>

      {/* 継ぎ目の罫線（押し合いで朱に光る） */}
      <div
        style={{
          position: "absolute",
          left: SEAM - 4,
          top: 0,
          width: 8,
          height: 720,
          background: seamFlash > 0.2 ? K.shu : K.ink,
          opacity: seamOpacity,
        }}
      />

      {/* まとめ */}
      <Phrase
        text="そのたびに、二つの声が"
        left={80}
        top={224}
        width={1120}
        align="center"
        size={50}
        weight={600}
        color={K.ink}
        opacity={sumSmall}
        dy={(1 - prog(frame, 322, 334)) * 20}
      />
      <Phrase
        text="ぶつかる。"
        left={80}
        top={344}
        width={1120}
        align="center"
        size={bigSize}
        weight={900}
        color={K.shu}
        opacity={sumBig}
      />
    </AbsoluteFill>
  );
};
