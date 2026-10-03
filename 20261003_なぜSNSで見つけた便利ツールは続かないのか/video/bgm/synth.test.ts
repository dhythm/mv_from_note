import { describe, expect, it } from "vitest";
import { chord, encodeWav, noteFreq } from "./synth";

describe("noteFreq", () => {
  it("maps note names to equal-tempered frequencies", () => {
    expect(noteFreq("A4")).toBeCloseTo(440);
    expect(noteFreq("A3")).toBeCloseTo(220);
    expect(noteFreq("C4")).toBeCloseTo(261.626, 2);
    expect(noteFreq("F#2")).toBeCloseTo(92.499, 2);
    expect(noteFreq("Bb3")).toBeCloseTo(233.082, 2);
  });

  it("rejects malformed names", () => {
    expect(() => noteFreq("H4")).toThrow();
    expect(() => noteFreq("C")).toThrow();
  });
});

describe("chord", () => {
  it("splits a space separated chord into frequencies", () => {
    expect(chord("A3 C4 E4").map((f) => Math.round(f))).toEqual([220, 262, 330]);
  });
});

describe("encodeWav", () => {
  it("writes a 16-bit stereo PCM WAV with the right sizes", () => {
    const l = new Float32Array([0, 1, -1]);
    const r = new Float32Array([0.5, -0.5, 2]);
    const buf = encodeWav([l, r], 44100);
    expect(buf.toString("ascii", 0, 4)).toBe("RIFF");
    expect(buf.toString("ascii", 8, 12)).toBe("WAVE");
    expect(buf.readUInt16LE(22)).toBe(2); // channels
    expect(buf.readUInt32LE(24)).toBe(44100);
    expect(buf.readUInt16LE(34)).toBe(16);
    expect(buf.readUInt32LE(40)).toBe(3 * 2 * 2); // data bytes
    expect(buf.length).toBe(44 + 12);
    // interleaved L R, clipped to [-1, 1]
    expect(buf.readInt16LE(44 + 4)).toBe(32767); // L[1]
    expect(buf.readInt16LE(44 + 10)).toBe(32767); // R[2] clipped
  });

  it("rejects channels of different length", () => {
    expect(() => encodeWav([new Float32Array(2), new Float32Array(3)], 44100)).toThrow();
  });
});
