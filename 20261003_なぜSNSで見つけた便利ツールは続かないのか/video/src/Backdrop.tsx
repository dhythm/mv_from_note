import { AbsoluteFill, Img, staticFile } from "remotion";
import { ip, inOutCubic } from "./anim";

// 机の静止画。カメラは動かさず、切り替えはクロスフェードだけ。
// [ファイル, フェードイン開始秒, フェードイン終了秒]
const STILLS: [string, number, number][] = [
  ["01-empty-desk.webp", -1, 0],
  ["02-phone-glow.webp", 4.0, 4.9],
  ["03-mismatched-stack.webp", 16.4, 18.0],
  // 03→04 は画角が変わる。崩れる文字が画面を埋めている間に切り替える
  ["04-just-collapsed.webp", 47.2, 48.2],
  ["05-one-change.webp", 64.2, 65.2],
  // 06 はノートの角度が 05 の前に戻っている。根が覆っている間にゆっくり替える
  ["06-one-remains.webp", 75.4, 79.4],
];

export function Backdrop({ t }: { t: number }) {
  // 一日の光：朝はわずかに暖かく、夜に動く一日は青く沈み、崩れたあとに戻る
  const night = Math.min(ip(t, [21.2, 26], [0, 1], inOutCubic), ip(t, [46.6, 49.5], [1, 0]));
  const warm = Math.max(ip(t, [0, 3, 14, 18], [0.0, 0.5, 0.5, 0]), ip(t, [80, 86], [0, 0.45]));
  const tremor = ip(t, [43.5, 46.6, 47.4], [0, 1, 0]);

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
