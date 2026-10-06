import React from "react";
import { AbsoluteFill, useCurrentFrame, staticFile } from "remotion";
import { Video } from "@remotion/media";
import { K, prog, mix, EASE_IN, EASE_INOUT, OVERSHOOT } from "../kinetic/design";
import { Phrase } from "../kinetic/glyph";

// 転換 0:41–0:57 。
// A（0–150）いまはAIで、実務家も機能を作れる。
// B（150–300）動画Aを画面の大きな面として使い、左の紙面に文字。
// C（300–480）意見を消した共通色（墨）の空の形が、縦の並びから横の二層へ
//   向きを変えて積み上がり、役割ラベルが出る。角丸・影は使わない。

const SPLIT = 520; // 左の紙面と動画面の境

const CenterLine: React.FC<{
  text: string;
  yc: number;
  size: number;
  weight: number;
  color: string;
  opacity: number;
  dy?: number;
}> = ({ text, yc, size, weight, color, opacity, dy = 0 }) => (
  <Phrase text={text} left={0} top={yc - size * 0.72 + dy} width={1280} align="center" size={size} weight={weight} color={color} opacity={opacity} letterSpacing="0.03em" />
);

export const Pivot: React.FC = () => {
  const frame = useCurrentFrame();

  // A
  const aSmall = prog(frame, 8, 20) * (1 - prog(frame, 136, 148, EASE_IN));
  const aBig = prog(frame, 22, 38, OVERSHOOT);
  const aBigOut = 1 - prog(frame, 136, 150, EASE_IN);
  const aBigSize = mix(60, 88, prog(frame, 22, 38, OVERSHOOT));
  const aBigDx = -prog(frame, 136, 150, EASE_IN) * 420; // 動画の侵入と反対方向に抜ける

  // B 動画面
  const vIn = prog(frame, 150, 166);
  const vOut = prog(frame, 300, 316, EASE_IN);
  const videoX = mix(760, 0, vIn) + vOut * 760;
  const vTextIn = prog(frame, 170, 184) * (1 - prog(frame, 300, 314, EASE_IN));

  // C 変形（共通色の空の形 → 二層）
  const p = prog(frame, 330, 356, EASE_INOUT);
  const barsIn = prog(frame, 316, 330, OVERSHOOT);
  const lead = prog(frame, 318, 332) * (1 - prog(frame, 470, 478, EASE_IN));
  const labelIn = prog(frame, 356, 372, OVERSHOOT) * (1 - prog(frame, 470, 478, EASE_IN));

  const bar = (fromCx: number, toCy: number) => {
    const cx = mix(fromCx, 640, p);
    const cy = mix(400, toCy, p);
    const w = mix(200, 800, p);
    const h = mix(320, 150, p);
    return { left: cx - w / 2, top: cy - h / 2, width: w, height: h };
  };
  const up = bar(530, 300);
  const lo = bar(750, 470);
  const barOpacity = barsIn * (1 - prog(frame, 470, 478, EASE_IN));

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* A */}
      <CenterLine text="いまはAIで、実務家も" yc={248} size={50} weight={600} color={K.ink} opacity={aSmall} dy={(1 - prog(frame, 8, 20)) * -18} />
      <Phrase text="機能を作れる。" left={0} top={430 - aBigSize * 0.72} width={1280} align="center" size={aBigSize} weight={900} color={K.ink} opacity={aBig * aBigOut} dx={aBigDx} letterSpacing="0.02em" />

      {/* B 動画面（右・大きな面）＋左の紙面に文字 */}
      {vIn > 0 && vOut < 1 ? (
        <div
          style={{
            position: "absolute",
            left: SPLIT,
            top: 0,
            width: 1280 - SPLIT,
            height: 720,
            overflow: "hidden",
            translate: `${videoX}px 0px`,
          }}
        >
          <Video
            src={staticFile("cut-A.mp4")}
            muted
            style={{ position: "absolute", left: -230, top: 0, width: 1280, height: 720 }}
          />
        </div>
      ) : null}
      {/* 境界の罫線 */}
      <div style={{ position: "absolute", left: SPLIT - 3, top: 0, width: 6, height: 720, background: K.ink, opacity: vIn * (1 - vOut) }} />
      {/* 左の紙面テキスト */}
      <div
        style={{
          position: "absolute",
          left: 50,
          top: 236,
          width: SPLIT - 70,
          color: K.ink,
          fontSize: 50,
          fontWeight: 900,
          fontVariationSettings: "'wght' 900",
          lineHeight: 1.42,
          letterSpacing: "0.02em",
          opacity: vTextIn,
          translate: `${(1 - prog(frame, 170, 184)) * -20}px 0px`,
        }}
      >
        現場をいちばん
        <br />
        知る人が、
        <br />
        自分で形にする。
      </div>

      {/* C 変形：共通色（墨）の空の形 */}
      <div style={{ position: "absolute", left: up.left, top: up.top, width: up.width, height: up.height, background: K.ink, opacity: barOpacity }} />
      <div style={{ position: "absolute", left: lo.left, top: lo.top, width: lo.width, height: lo.height, background: K.ink, opacity: barOpacity }} />
      {/* 役割ラベル（着地後） */}
      <Phrase text="機能／実務家" left={0} top={300 - 54 * 0.72} width={1280} align="center" size={54} weight={900} color={K.knock} opacity={labelIn} letterSpacing="0.06em" />
      <Phrase text="土台／エンジニア" left={0} top={470 - 54 * 0.72} width={1280} align="center" size={54} weight={900} color={K.knock} opacity={labelIn} letterSpacing="0.06em" />

      {/* 14 */}
      <CenterLine text="どちらが正しいかではなく、役割分担で解く。" yc={120} size={44} weight={700} color={K.ink} opacity={lead} dy={(1 - prog(frame, 318, 332)) * -14} />
    </AbsoluteFill>
  );
};
