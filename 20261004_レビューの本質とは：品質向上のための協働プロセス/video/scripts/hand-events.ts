// 全編・試作の手の出入りと差し替えを一覧にする（検品用）。使い方: npm run hands
import { filmState } from "../src/film/film";
import { protoState, PB } from "../src/cuts/proto";
import { handEvents } from "../src/film/handEvents";
import { CUT } from "../src/film/beats";

for (const [name, fn, end] of [["proto", protoState, PB.end], ["film", filmState, CUT.END]] as const) {
  const states = [];
  for (let f = 0; f < end * 24; f++) states.push({ t: f / 24, s: fn(f / 24) });
  const { events, duplicates } = handEvents(states);
  console.log(`== ${name}: duplicates ${duplicates.length}`);
  for (const e of events) {
    if (e.kind === "swap") console.log(`${e.t.toFixed(2)} swap ${e.side} ${e.from}->${e.to} jump=${e.jump.toFixed(0)}`);
    else console.log(`${e.t.toFixed(2)} ${e.kind} ${e.side} ${e.id} inside=${e.inside.toFixed(0)}`);
  }
}
