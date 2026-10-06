import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { K, prog, mix } from "../kinetic/design";
import { Phrase } from "../kinetic/glyph";
import { Statement } from "../kinetic/Statement";

export const Method1: React.FC = () => {
  const f = useCurrentFrame();
  const compact = prog(f, 12, 26);
  const barsOut = 1 - prog(f, 140, 148);
  const viewIn = prog(f, 164, 174);
  const viewOut = 1 - prog(f, 276, 284);
  const viewW = mix(720, 1120, prog(f, 180, 196));
  return <AbsoluteFill style={{ overflow: "hidden" }}>
    {[{ y: 326, end: 536, label: "機能／実務家" }, { y: 494, end: 616, label: "土台／エンジニア" }].map(({y,end,label}) => <div key={label} style={{ position: "absolute", left: mix(240, 80, compact), top: mix(y, end, compact) - mix(144, 64, compact) / 2, width: mix(800, 1120, compact), height: mix(144, 64, compact), background: K.ink, color: K.knock, display: "flex", alignItems: "center", justifyContent: "center", fontSize: mix(54, 32, compact), fontWeight: 900, fontVariationSettings: "'wght' 900", opacity: barsOut }}>{label}</div>)}
    <Phrase text="ただし、エンジニアが" left={80} top={232} centered width={1120} align="center" size={48} opacity={prog(f, 28, 36) * barsOut} />
    <Phrase text="ゼロでいいわけではない。" left={80} top={362} centered width={1120} align="center" size={78} weight={900} opacity={prog(f, 40, 48) * barsOut} dx={(1-prog(f,40,48))*80} />
    <Statement frame={f} from={150} to={285} lead="中長期の影響まで、" main="見渡せないこともある。" size={80} />
    <div style={{ position: "absolute", left: (1280 - viewW)/2, top: 172, width: viewW, height: 376, border: `3px solid ${K.ink}`, boxSizing: "border-box", opacity: viewIn * viewOut }} />
    <Phrase text="中長期・成長" left={80} top={600} centered width={1120} align="center" size={38} color={K.grey} opacity={viewIn * viewOut} />
    <Statement frame={f} from={285} to={420} lead="「ほしい」だけでは、" main="要件は決まらない。" size={96} color={K.ai} />
  </AbsoluteFill>;
};
