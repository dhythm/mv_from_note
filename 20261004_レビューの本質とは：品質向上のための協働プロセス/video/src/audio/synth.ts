// 小さな効果音合成器。外部の音源は使わず、雑音と減衰する正弦波だけで紙・鉛筆・木・息の音を作る。
import type { Cue } from "./cues";

export const SR = 48000;

export type Bus = { l: Float32Array; r: Float32Array };

export function makeBus(seconds: number): Bus {
  const n = Math.ceil(seconds * SR);
  return { l: new Float32Array(n), r: new Float32Array(n) };
}

/** 決定的な乱数（毎回同じ音になる） */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Biquad = (x: number) => number;

/** RBJ の双二次フィルタ */
export function biquad(type: "lp" | "hp" | "bp", freq: number, q: number): Biquad {
  const w = (2 * Math.PI * Math.min(freq, SR * 0.45)) / SR;
  const cos = Math.cos(w);
  const alpha = Math.sin(w) / (2 * q);
  let b0: number, b1: number, b2: number;
  if (type === "lp") [b0, b1, b2] = [(1 - cos) / 2, 1 - cos, (1 - cos) / 2];
  else if (type === "hp") [b0, b1, b2] = [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2];
  else [b0, b1, b2] = [alpha, 0, -alpha];
  const a0 = 1 + alpha;
  const a1 = -2 * cos;
  const a2 = 1 - alpha;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}

function put(bus: Bus, i: number, v: number, pan: number) {
  if (i < 0 || i >= bus.l.length) return;
  const p = Math.max(-1, Math.min(1, pan));
  bus.l[i] += v * Math.cos(((p + 1) * Math.PI) / 4);
  bus.r[i] += v * Math.sin(((p + 1) * Math.PI) / 4);
}

/** 雑音をフィルタに通し、env(相対時刻0..1) で包んで置く */
function noiseEvent(bus: Bus, t0: number, dur: number, pan: number, filters: Biquad[], env: (u: number, sec: number) => number, seed: number, gain = 1) {
  const r = rng(seed);
  const n = Math.max(1, Math.round(dur * SR));
  const s0 = Math.round(t0 * SR);
  for (let k = 0; k < n; k++) {
    let x = r() * 2 - 1;
    for (const f of filters) x = f(x);
    put(bus, s0 + k, x * env(k / n, k / SR) * gain, pan);
  }
}

/** 減衰する正弦波の束（木・陶器の小さな音） */
function modes(bus: Bus, t0: number, freqs: number[], decay: number, amp: number, pan: number) {
  const s0 = Math.round(t0 * SR);
  const n = Math.round(decay * 6 * SR);
  for (let k = 0; k < n; k++) {
    const s = k / SR;
    let v = 0;
    freqs.forEach((f, j) => (v += Math.sin(2 * Math.PI * f * s) * Math.exp(-s / (decay / (1 + j * 0.4))) / (1 + j)));
    put(bus, s0 + k, v * amp, pan);
  }
}

const smooth = (u: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, u))) ** 2;

export function render(bus: Bus, cue: Cue, seed: number) {
  switch (cue.k) {
    case "flip": {
      // 空気を切る音（上がって落ちる）＋最後に紙が触れる軽い音
      const d = cue.dur;
      noiseEvent(bus, cue.t, d, cue.pan, [biquad("bp", 2400 + 600 * (seed % 3), 0.7), biquad("hp", 600, 0.7)], (u) => Math.pow(Math.sin(Math.PI * u), 1.6), seed, cue.amp);
      noiseEvent(bus, cue.t + d * 0.9, 0.025, cue.pan, [biquad("hp", 2500, 0.7)], (u) => Math.exp(-u * 6), seed + 1, cue.amp * 0.6);
      noiseEvent(bus, cue.t + d * 0.95, 0.06, cue.pan, [biquad("lp", 380, 0.7)], (u) => Math.exp(-u * 5), seed + 2, cue.amp * 1.2);
      break;
    }
    case "rustle": {
      const r = rng(seed);
      const lfo = biquad("lp", 6, 0.7);
      const crackle = () => (r() < 0.0018 ? (r() * 2 - 1) * 6 : 0);
      noiseEvent(bus, cue.t0, cue.t1 - cue.t0, cue.pan, [biquad("bp", 1700, 0.6)], (u) => smooth(u * 1.2) * (0.5 + Math.abs(lfo(r() * 2 - 1)) * 30), seed, cue.amp);
      noiseEvent(bus, cue.t0, cue.t1 - cue.t0, cue.pan, [biquad("hp", 3000, 0.7)], () => crackle(), seed + 3, cue.amp * 0.22);
      break;
    }
    case "tap":
      noiseEvent(bus, cue.t, 0.04, cue.pan, [biquad("bp", 900, 1.0)], (u) => Math.exp(-u * 8), seed, cue.amp);
      break;
    case "pencil": {
      // 芯の摩擦：細かい粒の雑音を一画ごとに立ち上げる
      const r = rng(seed);
      const dur = cue.t1 - cue.t0;
      const st = cue.strokes;
      noiseEvent(
        bus,
        cue.t0,
        dur,
        cue.pan,
        [biquad("bp", 3800, 1.1), biquad("hp", 1200, 0.7)],
        (u) => {
          let j = 0;
          while (j < st.length - 2 && st[j + 1] < u) j++;
          const a = st[j], b = st[j + 1];
          const v = b > a ? (u - a) / (b - a) : 0;
          const edge = Math.min(1, v / 0.12, (1 - v) / 0.15);
          const grain = 0.55 + 0.45 * (r() < 0.25 ? 1 : 0);
          return Math.max(0, edge) * grain;
        },
        seed + 1,
        cue.amp,
      );
      break;
    }
    case "erase": {
      const dur = cue.t1 - cue.t0;
      noiseEvent(bus, cue.t0, dur, cue.pan, [biquad("bp", 950, 0.9), biquad("lp", 3000, 0.7)], (u) => Math.abs(Math.sin(Math.PI * cue.rubs * u)) ** 0.7 * Math.min(1, u * 12, (1 - u) * 12), seed, cue.amp);
      break;
    }
    case "wood":
      modes(bus, cue.t, [1750, 2630, 3910], 0.018, cue.amp, cue.pan);
      noiseEvent(bus, cue.t, 0.012, cue.pan, [biquad("hp", 2000, 0.7)], (u) => 1 - u, seed, cue.amp * 0.5);
      break;
    case "rubber":
      noiseEvent(bus, cue.t, 0.05, cue.pan, [biquad("lp", 420, 0.7)], (u) => Math.exp(-u * 4), seed, cue.amp);
      break;
    case "breath":
      noiseEvent(bus, cue.t, cue.dur, 0, [biquad("bp", cue.inhale ? 1300 : 850, 0.5), biquad("lp", 2600, 0.7)], (u) => smooth(cue.inhale ? Math.pow(u, 0.7) : Math.pow(u, 1.3)), seed, cue.amp);
      break;
    case "cloth":
      noiseEvent(bus, cue.t0, cue.t1 - cue.t0, cue.pan, [biquad("bp", 2200, 0.5)], (u) => smooth(u), seed, cue.amp);
      break;
    case "stamp": {
      // 乾いた一音：木の柄が紙を通して机を打つ
      const s0 = Math.round(cue.t * SR);
      for (let k = 0; k < SR * 0.25; k++) {
        const s = k / SR;
        const f = 95 - 35 * Math.min(1, s / 0.08);
        put(bus, s0 + k, Math.sin(2 * Math.PI * f * s) * Math.exp(-s / 0.045) * cue.amp, 0.15);
      }
      modes(bus, cue.t, [420, 980, 1650], 0.012, cue.amp * 0.6, 0.15);
      noiseEvent(bus, cue.t, 0.03, 0.15, [biquad("lp", 1200, 0.7)], (u) => 1 - u, seed, cue.amp * 0.8);
      break;
    }
    case "creak": {
      const r = rng(seed);
      const bp = biquad("bp", 650, 6);
      const bp2 = biquad("bp", 1400, 5);
      const s0 = Math.round(cue.t * SR);
      const n = Math.round(cue.dur * SR);
      let phase = 0;
      for (let k = 0; k < n; k++) {
        const u = k / n;
        phase += (38 + 22 * Math.sin(u * 7) + r() * 10) / SR;
        const pulse = phase % 1 < 0.04 ? 1 : 0;
        const v = bp(pulse) * 0.8 + bp2(pulse) * 0.5;
        put(bus, s0 + k, v * smooth(u) * cue.amp, 0.4);
      }
      break;
    }
    case "tick":
      modes(bus, cue.t, [2450, 3720, 5130], 0.05, cue.amp, 0.05);
      break;
    case "room": {
      // 室内の空気：とても小さな淡い雑音
      noiseEvent(bus, cue.t0, cue.t1 - cue.t0, 0, [biquad("lp", 1800, 0.6), biquad("hp", 60, 0.7)], (u, sec) => Math.min(1, sec / 0.5, ((cue.t1 - cue.t0) - sec) / 0.5), seed, cue.amp);
      break;
    }
  }
}

/** 小さな部屋の響き（櫛形＋全域通過） */
export function reverb(bus: Bus, wet: number): Bus {
  const n = bus.l.length;
  const out = { l: new Float32Array(n), r: new Float32Array(n) };
  const combs = [1116, 1188, 1277, 1356].map((d) => Math.round((d * SR) / 44100 * 0.6));
  for (const [src, dst, off] of [[bus.l, out.l, 0], [bus.r, out.r, 23]] as const) {
    const acc = new Float32Array(n);
    for (const d0 of combs) {
      const d = d0 + off;
      const buf = new Float32Array(n);
      let lp = 0;
      for (let i = 0; i < n; i++) {
        const fb = i >= d ? buf[i - d] : 0;
        lp = lp * 0.3 + fb * 0.7;
        buf[i] = src[i] + lp * 0.72;
        acc[i] += buf[i];
      }
    }
    for (let i = 0; i < n; i++) dst[i] = src[i] + (acc[i] / combs.length) * wet;
  }
  return out;
}

export function mix(cues: Cue[], seconds: number): Bus {
  const bus = makeBus(seconds);
  cues.forEach((c, i) => render(bus, c, 1000 + i * 17));
  const out = reverb(bus, 0.18);
  let peak = 0;
  for (let i = 0; i < out.l.length; i++) peak = Math.max(peak, Math.abs(out.l[i]), Math.abs(out.r[i]));
  // 最大値を -3dB 付近にそろえる（小さな音を大きくしすぎない範囲で）
  const g = peak > 0 ? Math.min(0.7 / peak, 4) : 1;
  if (g !== 1) for (let i = 0; i < out.l.length; i++) { out.l[i] *= g; out.r[i] *= g; }
  return out;
}

export function encodeWav(bus: Bus): Uint8Array {
  const n = bus.l.length;
  const data = n * 4;
  const buf = new ArrayBuffer(44 + data);
  const v = new DataView(buf);
  const str = (o: number, s: string) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  str(0, "RIFF"); v.setUint32(4, 36 + data, true); str(8, "WAVE"); str(12, "fmt ");
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true);
  v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true);
  str(36, "data"); v.setUint32(40, data, true);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (const ch of [bus.l, bus.r]) {
      v.setInt16(o, Math.round(Math.max(-1, Math.min(1, ch[i])) * 32767), true);
      o += 2;
    }
  }
  return new Uint8Array(buf);
}
