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

// 声の語の時刻（カットの頭からの秒）。audio/voice/words.json は読み上げ用の表記に対する文字ごとの時刻
import words from '../audio/voice/words.json';
const W = words as unknown as Record<string, {chars: [string, number, number][]}>;
export function vt(id: string, phrase: string, n = 0): number {
  const chars = W[id].chars;
  const text = chars.map((c) => c[0]).join('');
  let i = -1;
  for (let k = 0; k <= n; k++) i = text.indexOf(phrase, i + 1);
  if (i < 0) throw new Error(`声に「${phrase}」が無い（${id}）`);
  return chars[i][1] + (data.cuts.find((c) => c.id === id)?.voice ?? 0);
}
