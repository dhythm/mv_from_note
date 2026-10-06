import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { K, prog } from "../kinetic/design";
import { Phrase } from "../kinetic/glyph";
import { Statement } from "../kinetic/Statement";

export const Conclusion: React.FC = () => {
  const f = useCurrentFrame();
  const final = prog(f, 530, 538);
  const ratio = prog(f, 620, 628);
  // 下線の中心が少し移る。割合の数値や機能開発からの完全撤退は示さない。
  const focus = prog(f, 548, 592);
  return <AbsoluteFill style={{ overflow: "hidden" }}>
    <Statement frame={f} from={0} to={150} lead="大きな組織を" main="率いているわけではない。" size={76} weight={600} />
    <Statement frame={f} from={155} to={285} lead="思考実験で、" main="間違っているかもしれない。" size={72} weight={600} />
    <Statement frame={f} from={290} to={405} lead="それでも、自分なら" main="こうするだろう。" size={102} />
    <Statement frame={f} from={410} to={525} lead="大切なものは、" main="今も変わらない。" size={102} />
    <Phrase text="機能を作ることから、" left={80} top={220} centered width={1120} align="center" size={50} weight={600} opacity={final} dx={(1-final)*-64} />
    <div style={{ position: "absolute", left: 80, top: 312, width: 1120, display: "flex", flexDirection: "column", alignItems: "center", gap: 0, fontSize: 90, fontWeight: 900, fontVariationSettings: "'wght' 900", lineHeight: 1.2, color: K.ink, opacity: final, translate: `0px ${(1-final)*32}px` }}><span>作れる環境を</span><span>支えることへ。</span></div>
    <div style={{ position: "absolute", left: 240 + focus * 96, top: 548, width: 640, height: 6, background: K.ink, opacity: final }} />
    <Phrase text="その比重が、少しずつ変わる。" left={80} top={624} centered width={1120} align="center" size={42} weight={500} opacity={ratio} dy={(1-ratio)*16} />
  </AbsoluteFill>;
};
