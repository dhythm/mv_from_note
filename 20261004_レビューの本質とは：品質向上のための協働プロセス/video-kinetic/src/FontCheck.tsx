import { AbsoluteFill } from "remotion";
import { mincho, sans } from "./fonts";

export function FontCheck() {
  return (
    <AbsoluteFill style={{ background: "#EFEBE3", color: "#17171B", padding: 120, gap: 40 }}>
      <div style={{ fontFamily: sans, fontWeight: 900, fontSize: 120 }}>レビューを通す　品質を高める</div>
      <div style={{ fontFamily: sans, fontWeight: 400, fontSize: 56 }}>〇〇さん・上長・設計会議・作業者・経営者 30/10/20</div>
      <div style={{ fontFamily: mincho, fontWeight: 800, fontSize: 88 }}>「〇〇さんのレビューを通した」</div>
      <div style={{ fontFamily: mincho, fontWeight: 500, fontSize: 56 }}>品質責任はレビューアーだけにあるわけではない。善意の人。</div>
    </AbsoluteFill>
  );
}
