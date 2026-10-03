import { AbsoluteFill, Img, staticFile } from "remotion";
import { ip, inOutCubic } from "./anim";

// 机の静止画。カメラは動かさず、切り替えはクロスフェードだけ。
// [ファイル, フェードイン開始秒, フェードイン終了秒]
const STILLS: [string, number, number][] = [
  ["01-empty-desk.webp", -1, 0],
  ["02-phone-glow.webp", 0.3, 1.0],
  // 「なぜ、続かないのか。」の間に、積まれた山へ
  ["03-mismatched-stack.webp", 15.0, 16.2],
  // 03→04 は画角が変わる。崩れる紙片が画面を埋めている間に切り替える
  ["04-just-collapsed.webp", 47.9, 48.9],
  // 「自分に合わせてアレンジする」で手がノートの角度を変える
  ["05-one-change.webp", 64.3, 65.3],
  // 06 はノートの角度が 05 の前に戻っている。根が覆っている間にゆっくり替える
  ["06-one-remains.webp", 78.0, 81.0],
];

export function Backdrop({ t }: { t: number }) {
  // 原因のパートは白い文字が読めるよう少し沈め、「夜型」の間だけ夜の色まで落とす
  const night = Math.min(
    ip(t, [15.6, 17.0], [0, 0.6]) + ip(t, [23.4, 24.4, 27.6, 28.4], [0, 0.4, 0.4, 0]),
    ip(t, [47.3, 49.5], [1, 0]),
  );
  const warm = Math.max(ip(t, [0, 2, 12, 15], [0.0, 0.4, 0.4, 0]), ip(t, [82, 88], [0, 0.45]));
  const tremor = ip(t, [44.5, 47.3, 48.0], [0, 1, 0]);

  return (
    <AbsoluteFill style={{ backgroundColor: "#d8d2c8" }}>
      {STILLS.map(([file, a, b]) => {
        const opacity = ip(t, [a, b], [0, 1], inOutCubic);
        if (opacity <= 0) return null;
        return (
          <AbsoluteFill key={file} style={{ opacity }}>
            <Img src={staticFile(file)} style={{ width: "100%", height: "100%" }} />
          </AbsoluteFill>
        );
      })}
      <AbsoluteFill
        style={{
          background: "linear-gradient(180deg, #1c2a4a 0%, #2a3557 100%)",
          mixBlendMode: "multiply",
          opacity: night * 0.42,
        }}
      />
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 30% 20%, #ffd9a0 0%, rgba(255,217,160,0) 70%)",
          mixBlendMode: "soft-light",
          opacity: warm,
        }}
      />
      {/* 崩れる直前、画面の縁がわずかに締まる */}
      <AbsoluteFill
        style={{
          background: "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)",
          opacity: 0.35 + tremor * 0.4,
        }}
      />
    </AbsoluteFill>
  );
}
