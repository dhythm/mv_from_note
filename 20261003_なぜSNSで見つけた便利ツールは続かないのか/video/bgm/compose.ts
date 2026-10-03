// 映像の時間軸に合わせて BGM を合成し、../assets/bgm.mp3 に書き出す。
// 使い方: node bgm/compose.ts
// 外部の音源は使っていないので、著作権の心配はない（この映像のために合成したもの）。

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { BEATS } from "../src/lib.ts";
import { SR, applyReverb, chord, encodeWav, impact, kick, makeBus, master, noteFreq, pad, pluck, riser, rng, shaker, type Bus } from "./synth.ts";

const DURATION = 90;
const BPM = 84;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;

const at = (id: string) => {
  const b = BEATS.find((x) => x.id === id);
  if (!b) throw new Error(`unknown beat ${id}`);
  return b;
};
const COLLAPSE = at("optimal").outAt;

type Chord = { pad: string; arp: string; bass: string };
const C: Record<string, Chord> = {
  Cmaj7: { pad: "C3 G3 B3 E4", arp: "E5 G5 B5 C6", bass: "C2" },
  Am7: { pad: "A2 E3 G3 C4", arp: "C5 E5 G5 A5", bass: "A2" },
  Fmaj7: { pad: "F2 C3 E3 A3", arp: "A4 C5 E5 F5", bass: "F2" },
  G6: { pad: "G2 D3 E3 B3", arp: "B4 D5 E5 G5", bass: "G2" },
  Dm7: { pad: "D3 A3 C4 F4", arp: "D5 F5 A5 C6", bass: "D2" },
  Em7: { pad: "E3 B3 D4 G4", arp: "E5 G5 B5 D6", bass: "E2" },
  Esus: { pad: "E2 B2 D3 A3", arp: "E5 A5 B5 D6", bass: "E2" },
  Cadd9: { pad: "C3 G3 D4 E4", arp: "E5 G5 C6 D6", bass: "C2" },
};

/** start から bars 小節ぶん、小節ごとに fn を呼ぶ */
function bars(start: number, count: number, fn: (i: number, t: number) => void) {
  for (let i = 0; i < count; i++) fn(i, start + i * BAR);
}

/** 8分音符で和音を上下に分散させる */
function arpeggio(bus: Bus, ch: Chord, start: number, end: number, amp: number, every = 1, seed = 0) {
  const notes = chord(ch.arp);
  const order = [0, 1, 2, 3, 2, 1, 2, 3];
  let k = 0;
  for (let t = start; t < end - 0.05; t += BEAT / 2, k++) {
    if (k % every !== 0) continue;
    const f = notes[order[k % order.length]];
    pluck(bus, f, t, amp * (k % 4 === 0 ? 1 : 0.75), { pan: k % 2 === 0 ? -0.3 : 0.3, decay: 0.995, seed: seed + k });
  }
}

function groove(bus: Bus, start: number, end: number, kickAmp: number, shakeAmp: number, seed: number) {
  let k = 0;
  for (let t = start; t < end - 0.05; t += BEAT / 2, k++) {
    if (k % 4 === 0) kick(bus, t, kickAmp);
    shaker(bus, t + (k % 2 === 1 ? 0.02 : 0), shakeAmp * (k % 2 === 1 ? 1 : 0.55), seed + k);
  }
}

function compose(): Bus {
  const bus = makeBus(DURATION + 1);
  const r = rng(90);

  // ── 問い（0–15）：明るく軽い。投稿が飛び出すたびに高い粒が鳴る
  pad(bus, chord(C.Cmaj7.pad), 0.2, 5.5, 0.22, { attack: 1.5 });
  pad(bus, chord(C.Am7.pad), 5.7, 5.6, 0.2);
  pad(bus, chord(C.Fmaj7.pad), 11.3, 2.4, 0.18);
  arpeggio(bus, C.Cmaj7, 0.9, 5.7, 0.16);
  arpeggio(bus, C.Am7, 5.7, at("few").inAt, 0.15);
  // 「驚くほど少ない」：音が半分ずつ抜けていく
  arpeggio(bus, C.Am7, at("few").inAt, 11.3, 0.11, 2, 50);
  arpeggio(bus, C.Fmaj7, 11.3, at("why").inAt, 0.08, 3, 80);
  const blips = ["C6", "D6", "E6", "G6", "A6", "C7"];
  for (let i = 0; i < 28; i++) {
    pluck(bus, noteFreq(blips[Math.floor(r() * blips.length)]), 0.9 + i * 0.1 + r() * 0.06, 0.07, { pan: r() * 1.4 - 0.7, bright: 0.8 });
  }
  // 「なぜ、続かないのか。」：宙に浮いた和音で問いを残す
  pad(bus, chord("D3 G3 C4 F4"), at("why").inAt, 2.6, 0.24, { attack: 0.3, release: 2.0, cutoff: 1200 });
  pluck(bus, noteFreq("C2"), at("why").inAt, 0.35, { decay: 0.998 });

  // ── 原因（16.4–40）：小さなリズムが入る。夜型のところで暗い和音へ
  const causeStart = 16.4;
  const causeProg = [C.Am7, C.Fmaj7, C.Dm7, C.Em7, C.Am7, C.Fmaj7, C.G6, C.Em7];
  bars(causeStart, 8, (i, t) => {
    const ch = causeProg[i];
    pad(bus, chord(ch.pad), t, BAR, 0.18);
    pluck(bus, noteFreq(ch.bass), t, 0.32, { decay: 0.997, bright: 0.2 });
    pluck(bus, noteFreq(ch.bass), t + BEAT * 2.5, 0.22, { decay: 0.996, bright: 0.2 });
    arpeggio(bus, ch, t, t + BAR, 0.1, 2, 200 + i * 10);
  });
  groove(bus, causeStart, causeStart + 8 * BAR, 0.4, 0.06, 1000);

  // ── 張りつめる（39.3–47.3）：同じ音が刻まれ、上昇して崩れる
  const tenseStart = causeStart + 8 * BAR;
  pad(bus, chord(C.Esus.pad), tenseStart, COLLAPSE - tenseStart, 0.2, { attack: 1.0, release: 0.05, cutoff: 1400 });
  for (let t = tenseStart, k = 0; t < COLLAPSE - 0.05; t += BEAT / 2, k++) {
    const p = (t - tenseStart) / (COLLAPSE - tenseStart);
    pluck(bus, noteFreq("E2"), t, 0.18 + p * 0.22, { decay: 0.99, bright: 0.3 });
    if (p > 0.45) shaker(bus, t, 0.05 + p * 0.07, 3000 + k, -0.2);
    if (p > 0.45) shaker(bus, t + BEAT / 4, 0.04 + p * 0.06, 4000 + k, 0.2);
  }
  riser(bus, COLLAPSE - 4, 4, 0.26);
  impact(bus, COLLAPSE, 0.42);

  // ── 転換と方法（49.9–77）：静けさから、あたたかい長調で立て直す
  const turnStart = at("turn").inAt;
  const turnProg = [C.Fmaj7, C.G6, C.Em7, C.Am7];
  const methodStart = at("observe").inAt;
  const nBars = Math.floor((77 - turnStart) / BAR);
  bars(turnStart, nBars, (i, t) => {
    const ch = turnProg[i % turnProg.length];
    pad(bus, chord(ch.pad), t, BAR, 0.2, { cutoff: 2200 });
    pluck(bus, noteFreq(ch.bass), t, 0.3, { decay: 0.997, bright: 0.2 });
    arpeggio(bus, ch, t, t + BAR, t < methodStart ? 0.09 : 0.13, t < methodStart ? 2 : 1, 500 + i * 10);
  });
  const turnEnd = turnStart + nBars * BAR;
  groove(bus, methodStart, turnEnd, 0.34, 0.055, 2000);
  // 順番の入れ替え：高い2音が入れ替わって鳴る
  const ro = at("reorder");
  for (const [k, swapAt] of [ro.inAt + 0.6, ro.inAt + 1.25].entries()) {
    const [a, b] = k === 0 ? ["E6", "G6"] : ["G6", "C7"];
    pluck(bus, noteFreq(a), swapAt, 0.12, { pan: -0.5, bright: 0.8 });
    pluck(bus, noteFreq(b), swapAt + 0.28, 0.12, { pan: 0.5, bright: 0.8 });
  }
  pluck(bus, noteFreq("C7"), ro.settleAt, 0.1, { bright: 0.8 });

  // ── 結論（77–90）：根が張る和音から、最後の一文で C に着地する
  pad(bus, chord(C.Fmaj7.pad), turnEnd, 2 * BAR, 0.24, { cutoff: 2400 });
  arpeggio(bus, C.Fmaj7, turnEnd, turnEnd + 2 * BAR, 0.12, 1, 700);
  groove(bus, turnEnd, at("final").inAt, 0.3, 0.05, 2500);
  const gStart = turnEnd + 2 * BAR;
  pad(bus, chord(C.G6.pad), gStart, 83.8 - gStart, 0.24, { cutoff: 2400, release: 0.6 });
  arpeggio(bus, C.G6, gStart, 83.8, 0.11, 2, 800);
  // 「作り上げるものです。」：1文字ごとに音階を一段ずつ積み上げる
  const scale = ["C5", "D5", "E5", "G5", "A5", "C6", "D6", "E6", "G6", "C7"];
  scale.forEach((n, k) => pluck(bus, noteFreq(n), 83.8 + k * 0.08, 0.11, { pan: -0.4 + k * 0.08, bright: 0.7 }));
  pad(bus, chord(C.Cadd9.pad), 84.6, 90 - 84.6, 0.28, { attack: 0.6, release: 0.01, cutoff: 2600 });
  pluck(bus, noteFreq("C2"), 84.6, 0.35, { decay: 0.999, bright: 0.2 });

  applyReverb(bus, 0.55);

  // 最後の2秒でフェードアウトし、90秒で切る
  for (const ch of [bus.l, bus.r]) {
    for (let i = 0; i < ch.length; i++) {
      const t = i / SR;
      ch[i] *= t < 88 ? 1 : Math.max(0, 1 - (t - 88) / 2);
    }
  }
  master(bus, 0.85);
  return bus;
}

function main() {
  const bus = compose();
  const n = DURATION * SR;
  const wav = encodeWav([bus.l.subarray(0, n), bus.r.subarray(0, n)], SR);
  const dir = mkdtempSync(join(tmpdir(), "bgm-"));
  const wavPath = join(dir, "bgm.wav");
  const out = fileURLToPath(new URL("../../assets/bgm.mp3", import.meta.url));
  try {
    writeFileSync(wavPath, wav);
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", wavPath, "-codec:a", "libmp3lame", "-b:a", "160k", out], { stdio: "inherit" });
    console.log(`wrote ${out}`);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

main();
