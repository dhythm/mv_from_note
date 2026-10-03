// BGM 用の小さな合成器。外部の音源は使わず、すべてここで波形を作る。

export const SR = 44100;

const NOTE_INDEX: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "A4" → 440Hz。# と b に対応 */
export function noteFreq(name: string): number {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) throw new Error(`bad note name: ${name}`);
  const semis = NOTE_INDEX[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
  const midi = (Number(m[3]) + 1) * 12 + semis;
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function chord(names: string): number[] {
  return names.trim().split(/\s+/).map(noteFreq);
}

/** 16bit PCM の WAV（チャンネルは交互に並べる） */
export function encodeWav(channels: Float32Array[], sampleRate: number): Buffer {
  const n = channels[0].length;
  if (channels.some((c) => c.length !== n)) throw new Error("channels must have the same length");
  const ch = channels.length;
  const dataBytes = n * ch * 2;
  const buf = Buffer.alloc(44 + dataBytes);
  buf.write("RIFF", 0, "ascii");
  buf.writeUInt32LE(36 + dataBytes, 4);
  buf.write("WAVE", 8, "ascii");
  buf.write("fmt ", 12, "ascii");
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(ch, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * ch * 2, 28);
  buf.writeUInt16LE(ch * 2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36, "ascii");
  buf.writeUInt32LE(dataBytes, 40);
  let o = 44;
  for (let i = 0; i < n; i++) {
    for (let c = 0; c < ch; c++) {
      const v = Math.max(-1, Math.min(1, channels[c][i]));
      buf.writeInt16LE(Math.round(v * 32767), o);
      o += 2;
    }
  }
  return buf;
}

/** ステレオのバス。dry と reverb send を持つ */
export type Bus = { l: Float32Array; r: Float32Array; sendL: Float32Array; sendR: Float32Array };

export function makeBus(seconds: number): Bus {
  const n = Math.ceil(seconds * SR);
  return { l: new Float32Array(n), r: new Float32Array(n), sendL: new Float32Array(n), sendR: new Float32Array(n) };
}

function add(bus: Bus, i: number, v: number, pan: number, send: number) {
  if (i < 0 || i >= bus.l.length) return;
  const gl = Math.cos(((pan + 1) * Math.PI) / 4);
  const gr = Math.sin(((pan + 1) * Math.PI) / 4);
  bus.l[i] += v * gl;
  bus.r[i] += v * gr;
  bus.sendL[i] += v * gl * send;
  bus.sendR[i] += v * gr * send;
}

/** 決定的な乱数（毎回同じ音になるように） */
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

/** やわらかいパッド：わずかにずらした三角波を重ね、一次のローパスで丸める */
export function pad(bus: Bus, freqs: number[], start: number, dur: number, amp: number, opts: { attack?: number; release?: number; cutoff?: number; pan?: number } = {}) {
  const attack = opts.attack ?? 0.8;
  const release = opts.release ?? 1.2;
  const cutoff = opts.cutoff ?? 1800;
  const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
  const s0 = Math.floor(start * SR);
  const len = Math.floor((dur + release) * SR);
  freqs.forEach((f, k) => {
    const pan = (opts.pan ?? 0) + (k % 2 === 0 ? -0.35 : 0.35);
    for (const detune of [-0.004, 0.004]) {
      let ph = (k * 0.37 + detune * 50) % 1;
      let y = 0;
      const inc = (f * (1 + detune)) / SR;
      for (let i = 0; i < len; i++) {
        const t = i / SR;
        const env = Math.min(1, t / attack) * (t > dur ? Math.max(0, 1 - (t - dur) / release) : 1);
        ph += inc;
        if (ph >= 1) ph -= 1;
        const tri = 4 * Math.abs(ph - 0.5) - 1;
        y += a * (tri - y);
        add(bus, s0 + i, (y * env * amp) / freqs.length, pan, 0.5);
      }
    }
  });
}

/** 撥弦（Karplus-Strong）。ピアノとハープの間のような粒 */
export function pluck(bus: Bus, f: number, start: number, amp: number, opts: { decay?: number; pan?: number; bright?: number; seed?: number } = {}) {
  const period = Math.max(2, Math.round(SR / f));
  const rand = rng(opts.seed ?? Math.round(f * 1000 + start * 7));
  const ring = new Float32Array(period);
  for (let i = 0; i < period; i++) ring[i] = rand() * 2 - 1;
  const decay = opts.decay ?? 0.996;
  const bright = opts.bright ?? 0.5;
  const s0 = Math.floor(start * SR);
  const len = Math.floor(3.5 * SR);
  let idx = 0;
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const cur = ring[idx];
    const next = ring[(idx + 1) % period];
    const v = decay * (bright * cur + (1 - bright) * 0.5 * (cur + next));
    ring[idx] = v;
    idx = (idx + 1) % period;
    // 立ち上がりの角を少し丸める
    const y = prev + 0.6 * (cur - prev);
    prev = y;
    const fade = i > len - 2000 ? (len - i) / 2000 : 1;
    add(bus, s0 + i, y * amp * fade, opts.pan ?? 0, 0.35);
  }
}

/** やわらかいキック */
export function kick(bus: Bus, start: number, amp: number) {
  const s0 = Math.floor(start * SR);
  const len = Math.floor(0.45 * SR);
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const f = 45 + 75 * Math.exp(-t * 30);
    ph += (2 * Math.PI * f) / SR;
    add(bus, s0 + i, Math.sin(ph) * Math.exp(-t * 9) * amp, 0, 0.05);
  }
}

/** シェイカー：高い帯域のノイズの短い粒 */
export function shaker(bus: Bus, start: number, amp: number, seed: number, pan = 0.2) {
  const rand = rng(seed);
  const s0 = Math.floor(start * SR);
  const len = Math.floor(0.09 * SR);
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    const n = rand() * 2 - 1;
    const hp = n - prev;
    prev = n;
    const env = Math.min(1, t / 0.01) * Math.exp(-t * 45);
    add(bus, s0 + i, hp * env * amp, pan, 0.2);
  }
}

/** 上昇するノイズと音程（崩れる前の緊張） */
export function riser(bus: Bus, start: number, dur: number, amp: number) {
  const rand = rng(777);
  const s0 = Math.floor(start * SR);
  const len = Math.floor(dur * SR);
  let y = 0;
  let ph = 0;
  for (let i = 0; i < len; i++) {
    const p = i / len;
    const cutoff = 300 + 6000 * p * p;
    const a = 1 - Math.exp((-2 * Math.PI * cutoff) / SR);
    y += a * (rand() * 2 - 1 - y);
    ph += (2 * Math.PI * (110 + 330 * p * p)) / SR;
    const env = p * p;
    add(bus, s0 + i, (y * 0.7 + Math.sin(ph) * 0.3) * env * amp, Math.sin(p * 20) * 0.3, 0.6);
  }
}

/** 崩れる瞬間の低い衝撃音 */
export function impact(bus: Bus, start: number, amp: number) {
  const rand = rng(4711);
  const s0 = Math.floor(start * SR);
  const len = Math.floor(3 * SR);
  let ph = 0;
  let y = 0;
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    ph += (2 * Math.PI * (38 + 40 * Math.exp(-t * 6))) / SR;
    const a = 1 - Math.exp((-2 * Math.PI * (1500 * Math.exp(-t * 3) + 200)) / SR);
    y += a * (rand() * 2 - 1 - y);
    const v = Math.sin(ph) * Math.exp(-t * 1.6) * 0.9 + y * Math.exp(-t * 4) * 0.6;
    add(bus, s0 + i, v * amp, 0, 0.8);
  }
}

/** Schroeder 型の簡単なリバーブ（send を wet にして dry に足す） */
export function applyReverb(bus: Bus, wet: number) {
  const process = (input: Float32Array, offset: number): Float32Array => {
    const out = new Float32Array(input.length);
    const combs = [1557, 1617, 1491, 1422, 1277, 1356].map((d) => d + offset);
    for (const d of combs) {
      const buf = new Float32Array(d);
      let idx = 0;
      let lp = 0;
      for (let i = 0; i < input.length; i++) {
        const y = buf[idx];
        lp = y * 0.7 + lp * 0.3;
        buf[idx] = input[i] + lp * 0.84;
        idx = (idx + 1) % d;
        out[i] += y / combs.length;
      }
    }
    for (const d of [225, 556, 441].map((x) => x + offset)) {
      const buf = new Float32Array(d);
      let idx = 0;
      for (let i = 0; i < out.length; i++) {
        const b = buf[idx];
        const x = out[i];
        const y = -x + b;
        buf[idx] = x + b * 0.5;
        idx = (idx + 1) % d;
        out[i] = y;
      }
    }
    return out;
  };
  const wl = process(bus.sendL, 0);
  const wr = process(bus.sendR, 23);
  for (let i = 0; i < bus.l.length; i++) {
    bus.l[i] += wl[i] * wet;
    bus.r[i] += wr[i] * wet;
  }
}

/** ソフトクリップしてピークを target に合わせる */
export function master(bus: Bus, target: number) {
  let peak = 0;
  for (const ch of [bus.l, bus.r]) {
    for (let i = 0; i < ch.length; i++) {
      ch[i] = Math.tanh(ch[i]);
      peak = Math.max(peak, Math.abs(ch[i]));
    }
  }
  if (peak === 0) return;
  const g = target / peak;
  for (const ch of [bus.l, bus.r]) for (let i = 0; i < ch.length; i++) ch[i] *= g;
}
