import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { K, prog, mix, EASE_IN, OVERSHOOT } from "../kinetic/design";
import { Phrase } from "../kinetic/glyph";

// 原因1 0:14–0:30 。扱うものの重さで判断が変わる。
// 「ケースバイケース」→ 軽い側（問題ない：細く小さく上へ）と
// 重い側（怖い：太く大きく下へ）を文字の重量で対比し、最後に一理ずつ。

// 中央寄せの一行（サイズは上下中心 yc 基準）
const CenterLine: React.FC<{
  text: string;
  yc: number;
  size: number;
  weight: number;
  color: string;
  opacity: number;
  dy?: number;
}> = ({ text, yc, size, weight, color, opacity, dy = 0 }) => (
  <Phrase
    text={text}
    left={80}
    top={yc + dy}
    centered
    width={1120}
    align="center"
    size={size}
    weight={weight}
    color={color}
    opacity={opacity}
    letterSpacing="0.01em"
  />
);

export const Cause1: React.FC = () => {
  const frame = useCurrentFrame();

  // A: 「答えは、」→「ケースバイケース。」大きく出て、天井のヘッダへ縮む
  const ansOpacity = prog(frame, 6, 16) * (1 - prog(frame, 70, 82, EASE_IN));
  const heroPunch = prog(frame, 40, 56, OVERSHOOT);
  const heroToHeader = prog(frame, 92, 110);
  const heroSize = mix(100, 46, heroToHeader);
  const heroY = mix(416, 96, heroToHeader);
  const heroWeight = mix(900, 700, heroToHeader);
  const heroColor = heroToHeader > 0.5 ? K.grey : K.ink;
  const heroOpacity =
    heroPunch * (1 - prog(frame, 452, 466, EASE_IN)); // 最後まで天井に残す

  // B: 軽い側
  const lightQualIn = prog(frame, 120, 134) * (1 - prog(frame, 236, 242, EASE_IN));
  const lightWord = prog(frame, 150, 164) * (1 - prog(frame, 232, 244, EASE_IN));
  const lightRise = mix(24, -16, prog(frame, 150, 232)); // ゆっくり上へ漂う

  // C: 重い側
  const heavyQualIn = prog(frame, 244, 254) * (1 - prog(frame, 376, 384, EASE_IN));
  const heavyWord = prog(frame, 250, 262, OVERSHOOT) * (1 - prog(frame, 380, 388, EASE_IN));
  const heavyDrop = mix(-60, 0, prog(frame, 250, 268, OVERSHOOT));
  const heavySize = mix(120, 172, prog(frame, 250, 266, OVERSHOOT));
  const ruleW = 560 * prog(frame, 262, 280);

  // D: 一理ずつ
  const dSmall = prog(frame, 388, 400);
  const dBig = prog(frame, 404, 418, OVERSHOOT);
  const dBigSize = mix(54, 82, prog(frame, 404, 418, OVERSHOOT));

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      {/* A */}
      <CenterLine text="答えは、" yc={272} size={56} weight={600} color={K.ink} opacity={ansOpacity} dy={(1 - prog(frame, 6, 16)) * -20} />
      <CenterLine text="ケースバイケース。" yc={heroY} size={heroSize} weight={heroWeight} color={heroColor} opacity={heroOpacity} />

      {/* B 軽い側（細く・小さく・上へ） */}
      <CenterLine text="自分用や、仲間内の道具なら" yc={288} size={46} weight={500} color={K.ink} opacity={lightQualIn} dy={(1 - prog(frame, 120, 134)) * 16} />
      <CenterLine text="問題ない" yc={416} size={84} weight={400} color={K.ai} opacity={lightWord} dy={lightRise} />

      {/* C 重い側（太く・大きく・下へ） */}
      <CenterLine text="個人情報や、止まると困るものは" yc={260} size={46} weight={500} color={K.ink} opacity={heavyQualIn} dy={(1 - prog(frame, 236, 250)) * 16} />
      <CenterLine text="怖い。" yc={440} size={heavySize} weight={900} color={K.shu} opacity={heavyWord} dy={heavyDrop} />
      {/* 重さの底線 */}
      <div
        style={{
          position: "absolute",
          left: 640 - ruleW / 2,
          top: 568,
          width: ruleW,
          height: 10,
          background: K.ink,
          opacity: heavyWord,
        }}
      />

      {/* D 一理ずつ */}
      <CenterLine text="どちらにも、一理あり。" yc={282} size={52} weight={600} color={K.ink} opacity={dSmall * (1 - prog(frame, 470, 478, EASE_IN))} dy={(1 - dSmall) * 16} />
      <CenterLine text="片方だけが、正しくはない。" yc={430} size={dBigSize} weight={900} color={K.ink} opacity={dBig * (1 - prog(frame, 470, 478, EASE_IN))} />
    </AbsoluteFill>
  );
};
