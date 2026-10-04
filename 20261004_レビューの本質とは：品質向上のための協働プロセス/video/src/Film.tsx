import { Audio } from "@remotion/media";
import { AbsoluteFill, staticFile, useCurrentFrame } from "remotion";
import { CREDITS, MAIN, TITLE } from "./film/beats";
import { filmState } from "./film/film";
import { Stage } from "./stage/Stage";
import { FPS } from "./stage/geometry";
import { at } from "./lib/track";

const SERIF = '"Hiragino Mincho ProN", "Hiragino Mincho Pro", "Yu Mincho", "YuMincho", serif';

/** 本編の前後に置く独立したカード（本編の中に説明文字は出さない） */
function Card({ lines, opacity }: { lines: { text: string; size: number; gap?: number; tone?: number }[]; opacity: number }) {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0e1014", alignItems: "center", justifyContent: "center", opacity }}>
      <div style={{ textAlign: "center", fontFamily: SERIF }}>
        {lines.map((l, i) => (
          <div key={i} style={{ fontSize: l.size, color: `rgba(236,230,218,${l.tone ?? 0.92})`, letterSpacing: "0.18em", marginTop: l.gap ?? 0 }}>
            {l.text}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
}

export function Film() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0e1014" }}>
      <FilmPicture />
      {/* 紙・鉛筆・消しゴム・印・椅子・息の効果音（npm run sfx -- film で合成）。音楽はなし */}
      <Audio src={staticFile("gen/sfx-film.wav")} />
    </AbsoluteFill>
  );
}

function FilmPicture() {
  const t = useCurrentFrame() / FPS;
  const main = t - TITLE;
  if (t < TITLE) {
    const o = Math.min(at(t, 0.6, 1.6), 1 - at(t, 3.6, 4.6));
    return (
      <Card lines={[{ text: "もう一度、めくる", size: 64 }]} opacity={o} />
    );
  }
  if (main >= MAIN) {
    const c = main - MAIN;
    const o = Math.min(at(c, 0.6, 1.6), 1 - at(c, CREDITS - 1.4, CREDITS - 0.2));
    return (
      <Card
        lines={[
          { text: "もう一度、めくる", size: 44 },
          { text: "原案　『レビューの本質とは：品質向上のための協働プロセス』", size: 26, gap: 48, tone: 0.78 },
        ]}
        opacity={o}
      />
    );
  }
  return <Stage state={filmState(main)} />;
}
