import React from "react";
import { AbsoluteFill, Sequence, useCurrentFrame } from "remotion";
import { K, prog } from "../kinetic/design";
import { Statement } from "../kinetic/Statement";
import { BTablet } from "../components/BTablet";

export const Method2: React.FC = () => {
  const f = useCurrentFrame();
  const platform = prog(f, 377, 385) * (1-prog(f, 472, 478));
  const guard = prog(f, 483, 491);
  const vIn = prog(f, 450, 460);
  return <AbsoluteFill style={{ overflow: "hidden" }}>
    <Statement frame={f} from={0} to={140} lead="要件を掘り出し、" main="作れる形に落とす人。" size={86} />
    <Statement frame={f} from={145} to={270} lead="推進するPM、" main="形を決めるアーキテクト。" size={76} />
    <Statement frame={f} from={275} to={372} lead="届けてよいと" main="保証するQA。" size={108} inverted />
    <div style={{ position: "absolute", left: 80, top: "50%", width: 400, translate: "0 -50%", fontSize: 46, fontWeight: 900, fontVariationSettings: "'wght' 900", lineHeight: 1.4, color: K.ink, opacity: platform }}>
      土台を守る<br/>プラットフォーム<br/>エンジニア。
    </div>
    {f >= 377 && f < 450 ? <div style={{ position: "absolute", left: 560, top: 246, width: 640, height: 228, background: K.ink, clipPath: `inset(${100*(1-prog(f,385,395))}% 0 0 0)`, display: "flex", alignItems: "center", justifyContent: "center", color: K.knock, fontSize: 80, fontWeight: 900 }}>土台</div> : null}
    <Sequence from={450} durationInFrames={150} layout="none">
      <div style={{ position: "absolute", left: 560, top: 0, width: 720, height: 720, overflow: "hidden", translate: `${720*(1-vIn)}px 0px` }}>
        <div style={{ position: "absolute", left: -360, top: 0, width: 1280, height: 720 }}><BTablet /></div>
      </div>
    </Sequence>
    <div style={{ position: "absolute", left: 557, top: 0, width: 6, height: 720, background: K.ink, opacity: vIn }} />
    <div style={{ position: "absolute", left: 80, top: "50%", width: 400, translate: `${(1-guard)*-24}px -50%`, fontSize: 48, fontWeight: 900, fontVariationSettings: "'wght' 900", lineHeight: 1.4, color: K.ink, opacity: guard }}>
      ガードレールの<br/>内側で、<br/>実務家が作る。
    </div>
  </AbsoluteFill>;
};
