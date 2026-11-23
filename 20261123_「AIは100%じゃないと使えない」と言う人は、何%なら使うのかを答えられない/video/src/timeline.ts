import data from './timeline.json';

export const FPS = data.fps;
export const BPM = data.bpm;
export const BEAT = 60 / BPM;
export const LOGO_DUR = data.logoDur;

export type CutInfo = {id: string; beats: number; voice: number; start: number; dur: number; end: number};

const cuts: CutInfo[] = [];
let acc = 0;
for (const c of data.cuts) {
  const dur = c.beats * BEAT;
  cuts.push({...c, start: acc, dur, end: acc + dur});
  acc += dur;
}

export const CUTS = cuts;
export const S: Record<string, number> = Object.fromEntries(cuts.map((c) => [c.id, c.start]));
export const D: Record<string, number> = Object.fromEntries(cuts.map((c) => [c.id, c.dur]));
export const LOGO_START = acc;
export const TOTAL_SEC = LOGO_START + LOGO_DUR;
export const TOTAL_FRAMES = Math.round(TOTAL_SEC * FPS);
export const at = (id: string, dt = 0) => S[id] + dt;
