import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { K, prog } from "../kinetic/design";
import { Phrase } from "../kinetic/glyph";
import { Statement } from "../kinetic/Statement";

export const Cause2: React.FC = () => {
  const f = useCurrentFrame();
  const pathway = prog(f, 150, 158) * (1 - prog(f, 264, 270));
  const route = prog(f, 162, 180);
  const translate = prog(f, 206, 220);
  return <AbsoluteFill style={{ overflow: "hidden" }}>
    <Statement frame={f} from={0} to={150} lead="これまで、実務家は" main="自分では作れなかった。" size={80} />
    <Phrase text="だからエンジニアが" left={80} top={200} centered width={1120} align="center" size={48} opacity={pathway} />
    <Phrase text="要望を翻訳して作った。" left={80} top={304} centered width={1120} align="center" size={76} weight={900} opacity={pathway} />
    <div style={{ position: "absolute", left: 160, top: 466, width: 960, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: pathway }}>
      <div style={{ fontSize: 54, fontWeight: 800, fontVariationSettings: "'wght' 800", color: K.ink, translate: `${route * 40}px 0px` }}>要望</div>
      <div style={{ height: 5, width: 150 * route, background: K.ink }} />
      <div style={{ fontSize: 46, fontWeight: 800, fontVariationSettings: "'wght' 800", color: K.knock, background: K.ink, padding: "18px 30px", scale: 1 + (prog(f, 206, 210) - prog(f, 210, 218)) * 0.08 }}>翻訳</div>
      <div style={{ height: 5, width: 150 * translate, background: K.ink }} />
      <div style={{ fontSize: 54, fontWeight: 800, fontVariationSettings: "'wght' 800", color: K.ink, opacity: translate, translate: `${(1 - translate) * -48}px 0px` }}>機能</div>
    </div>
    <Statement frame={f} from={270} to={330} lead="ほかに" main="選択肢がなかった。" size={94} />
  </AbsoluteFill>;
};
