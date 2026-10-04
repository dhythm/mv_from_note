// 控えめなオリジナル音楽と効果音を合成し、output/opus-kinetic/public/score.wav に書き出す。
// 外部の音源・サービスは使わない。乱数は種付き（毎回同じ音になる）。
// 実行：npm run audio（ffmpeg で -20 LUFS 前後に整える）

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BEATS, TOTAL_SECONDS } from "../src/timeline.ts";

const SR = 48000;
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = resolve(HERE, "../../../output/opus-kinetic/public");
const RAW = resolve(OUT_DIR, "score-raw.wav");
const OUT = resolve(OUT_DIR, "score.wav");

const N = Math.ceil(TOTAL_SECONDS * SR);
const L = new Float32Array(N);
const R = new Float32Array(N);

const start = (id: string) => {
  const b = BEATS.find((x) => x.id === id);
  if (!b) throw new Error(`unknown beat ${id}`);
  return b.start;
};

const NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function hz(name: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) throw new Error(`bad note ${name}`);
  const midi = (Number(m[3]) + 1) * 12 + NOTE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296 * 2 - 1;
  };
}

function add(i: number, v: number, pan = 0) {
  if (i < 0 || i >= N) return;
  L[i] += v * Math.cos(((pan + 1) * Math.PI) / 4);
  R[i] += v * Math.sin(((pan + 1) * Math.PI) / 4);
}

// ── パッド：区間ごとの和音。前後 1.6 秒で重ねて切り替える ──
const CHORDS: [number, string][] = [
  [0, "B2 F#3 A3 D4 C#5"], // 問い：Bm9
  [start("B03"), "G2 D3 F#3 B3 E4"], // 目的化：Gmaj7(9)
  [start("B03") + 3.1, "E2 B2 G3 D4 F#4"], // 入れ替わり：Em9
  [start("B04"), "D2 A2 F#3 A3 E4"], // 転換：Dadd9
  [start("B07"), "G2 D3 B3 F#4 A4"],
  [start("B08"), "E2 B2 G3 D4 F#4"],
  [start("B09"), "A2 E3 G3 D4 E4"], // Asus
  [start("B10"), "D2 A2 F#3 C#4 E4"],
  [start("B11"), "B2 F#3 A3 D4 E4"],
  [start("B12"), "F#2 C#3 A3 E4"], // 墨地：F#m7
  [start("B13"), "G2 D3 B3 F#4"],
  [start("B13") + 4, "A2 E3 A3 C#4 E4"],
  [start("B14"), "D2 A2 F#3 A3 C#4 E4"], // 結論：Dmaj9
];

function pad() {
  const fade = 1.6;
  CHORDS.forEach(([t0, notes], k) => {
    const t1 = k + 1 < CHORDS.length ? CHORDS[k + 1][0] : TOTAL_SECONDS;
    const freqs = notes.split(" ").map(hz);
    const a = Math.max(0, Math.floor((t0 - fade / 2) * SR));
    const b = Math.min(N, Math.ceil((t1 + fade / 2) * SR));
    freqs.forEach((f, j) => {
      const pan = (j / Math.max(1, freqs.length - 1)) * 1.2 - 0.6;
      const ph = j * 1.7;
      const amp = (f < 120 ? 0.05 : 0.032) / Math.sqrt(freqs.length / 4);
      for (let i = a; i < b; i++) {
        const t = i / SR;
        const env = Math.min(1, (t - (t0 - fade / 2)) / fade, ((t1 + fade / 2) - t) / fade);
        if (env <= 0) continue;
        const breath = 0.82 + 0.18 * Math.sin(2 * Math.PI * 0.11 * t + ph);
        const w = 2 * Math.PI * f * t;
        const v = Math.sin(w + ph) + 0.5 * Math.sin(w * 1.0035 + ph * 2) + 0.12 * Math.sin(2 * w);
        add(i, v * amp * env * breath, pan);
      }
    });
  });
}

// ── 効果音 ──
/** 印：低い打音（音程が下がる正弦＋ごく短い籠もったノイズ） */
function stamp(t0: number, gain = 0.5) {
  const noise = rng(Math.round(t0 * 1000));
  let lp = 0;
  const a = Math.floor(t0 * SR);
  for (let k = 0; k < SR * 0.5; k++) {
    const t = k / SR;
    const f = 55 + 70 * Math.exp(-t / 0.04);
    const body = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.16);
    lp += 0.08 * (noise() - lp);
    const click = lp * Math.exp(-t / 0.025) * 2.2;
    add(a + k, (body * 0.9 + click) * gain, 0);
  }
}

/** 水平に通り過ぎる：帯域を絞ったノイズが左から右へ */
function swish(t0: number, dur = 0.9, gain = 0.16) {
  const noise = rng(Math.round(t0 * 1000) + 7);
  let lp1 = 0;
  let lp2 = 0;
  const a = Math.floor(t0 * SR);
  for (let k = 0; k < dur * SR; k++) {
    const p = k / (dur * SR);
    const env = Math.sin(Math.PI * p) ** 2;
    lp1 += 0.12 * (noise() - lp1);
    lp2 += 0.03 * (lp1 - lp2);
    add(a + k, (lp1 - lp2) * env * gain * 3, -0.8 + 1.6 * p);
  }
}

/** 柔らかい鐘（低い変調指数の FM） */
function bell(t0: number, f: number, gain = 0.09, pan = 0) {
  const a = Math.floor(t0 * SR);
  for (let k = 0; k < SR * 2.4; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.006) * Math.exp(-t / 0.7);
    const mod = 1.2 * Math.exp(-t / 0.25) * Math.sin(2 * Math.PI * f * 2 * t);
    add(a + k, Math.sin(2 * Math.PI * f * t + mod) * env * gain, pan);
  }
}

/** 木の打楽器のような短い音（場面の節目） */
function pluck(t0: number, f: number, gain = 0.07) {
  const a = Math.floor(t0 * SR);
  for (let k = 0; k < SR * 0.9; k++) {
    const t = k / SR;
    const env = Math.min(1, t / 0.004);
    const v = Math.sin(2 * Math.PI * f * t) * Math.exp(-t / 0.35) + 0.3 * Math.sin(2 * Math.PI * f * 4 * t) * Math.exp(-t / 0.05);
    add(a + k, v * env * gain, 0);
  }
}

pad();
// 冒頭
pluck(0.3, hz("B3"));
stamp(204 / 30); // B02 角印
bell(420 / 30, hz("A4"), 0.06, 0.3); // B03 入れ替わり：下がる2音
bell(436 / 30 + 0.12, hz("F#4"), 0.06, -0.3);
swish(start("B04") - 0.05, 1.1); // 「通す」が水平に抜ける
["D5", "F#5", "A5"].forEach((n, k) => bell(start("B04") + 0.6 + k * 0.16, hz(n), 0.07)); // 品質が上る
// 本編
pluck(start("B05"), hz("D4"));
bell(start("B05") + 3.0, hz("A4"), 0.045, 0.6); // 成果物がレビューアーに届く
stamp(start("B06") + 0.15, 0.4);
pluck(start("B07"), hz("G3"));
pluck(start("B08"), hz("E4"));
pluck(start("B09"), hz("A3"));
bell(start("B09") + 4.3, hz("E5"), 0.045);
pluck(start("B10"), hz("D4"));
bell(start("B10") + 2.1, hz("C#5"), 0.04, 0.4); // 新たな点
bell(start("B11") + 1.2, hz("D5"), 0.05);
bell(start("B11") + 1.4, hz("F#5"), 0.05);
stamp(start("B12") + 0.75, 0.42);
swish(start("B13"), 0.7, 0.12); // 切り分ける線
bell(start("B13") + 0.4, hz("B4"), 0.05, -0.3);
swish(start("B14") - 0.05, 0.9, 0.1);
["D5", "F#5", "A5", "D6"].forEach((n, k) => bell(start("B14") + 0.4 + k * 0.18, hz(n), 0.06));
pluck(start("B14") + 7.2, hz("D3"), 0.05); // 結論の保持が終わり、溶け始める所で低く一度だけ

// ── 簡単な残響（くし形4本＋全域通過2本） ──
function reverb(x: Float32Array, seedOffset: number): Float32Array {
  const combs = [1557, 1617, 1491, 1422].map((d) => d + seedOffset);
  const out = new Float32Array(x.length);
  for (const d of combs) {
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < x.length; i++) {
      const y = buf[idx];
      buf[idx] = x[i] + y * 0.8;
      out[i] += y / combs.length;
      idx = (idx + 1) % d;
    }
  }
  for (const d of [225, 556]) {
    const buf = new Float32Array(d);
    let idx = 0;
    for (let i = 0; i < out.length; i++) {
      const b = buf[idx];
      const y = -out[i] + b;
      buf[idx] = out[i] + b * 0.5;
      out[i] = y;
      idx = (idx + 1) % d;
    }
  }
  return out;
}
const wetL = reverb(L, 0);
const wetR = reverb(R, 23);
// 全体の出入り
for (let i = 0; i < N; i++) {
  const t = i / SR;
  const env = Math.min(1, t / 1.2, (TOTAL_SECONDS - t) / 2.5);
  L[i] = (L[i] * 0.78 + wetL[i] * 0.3) * Math.max(0, env);
  R[i] = (R[i] * 0.78 + wetR[i] * 0.3) * Math.max(0, env);
}

function encodeWav(chs: Float32Array[]): Buffer {
  const n = chs[0].length;
  const buf = Buffer.alloc(44 + n * chs.length * 2);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + n * chs.length * 2, 4);
  buf.write("WAVEfmt ", 8, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(chs.length, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * chs.length * 2, 28);
  buf.writeUInt16LE(chs.length * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(n * chs.length * 2, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (const c of chs) {
      buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, c[i])) * 32767), o);
      o += 2;
    }
  }
  return buf;
}

let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
if (peak > 0.98) {
  for (let i = 0; i < N; i++) {
    L[i] *= 0.98 / peak;
    R[i] *= 0.98 / peak;
  }
}

try {
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(RAW, encodeWav([L, R]));
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", RAW, "-af", "loudnorm=I=-20:TP=-2:LRA=11", "-ar", String(SR), OUT]);
  console.log(`wrote ${OUT} (${TOTAL_SECONDS}s, raw peak ${peak.toFixed(3)})`);
} catch (e) {
  console.error("score の書き出しに失敗しました:", e);
  process.exit(1);
}
