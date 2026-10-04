// 効果音を合成して public/gen/ に WAV で書き出す（Git 管理外）。
// 使い方: node scripts/compose-sfx.ts [proto|film]
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { encodeWav, mix } from "../src/audio/synth.ts";
import type { Cue } from "../src/audio/cues.ts";

// npm run sfx から実行する（カレントは video/）。束ねたファイルの場所に依存しない
const root = process.cwd();
const which = process.argv[2] ?? "proto";

async function load(): Promise<{ cues: Cue[]; seconds: number }> {
  if (which === "proto") {
    const { protoCues } = await import("../src/cuts/protoCues.ts");
    const { PB } = await import("../src/cuts/proto.ts");
    return { cues: protoCues(), seconds: PB.end };
  }
  const { filmCues, FILM_SECONDS } = await import("../src/film/filmCues.ts");
  return { cues: filmCues(), seconds: FILM_SECONDS };
}

const { cues, seconds } = await load();
const out = join(root, "public", "gen", `sfx-${which}.wav`);
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, encodeWav(mix(cues, seconds)));
console.log(`${out}: ${cues.length} cues, ${seconds.toFixed(2)} s`);
