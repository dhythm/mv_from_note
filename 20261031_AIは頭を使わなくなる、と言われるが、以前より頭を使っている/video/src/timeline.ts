import TL from './timeline.json';

export const FPS = 30;
export const VO = TL.voiceOffset;
export type Tr = 'up' | 'left' | 'right' | 'diag' | 'cut' | 'iris';
export const CUTS = (() => {
  let s = 0;
  return TL.cuts.map((c) => {
    const r = {id: c.id, start: s, dur: c.dur, tr: c.tr as Tr};
    s += c.dur;
    return r;
  });
})();
export const LOGO_START = CUTS[CUTS.length - 1].start + CUTS[CUTS.length - 1].dur;
export const TOTAL = LOGO_START + TL.logoDur;
export const TOTAL_FRAMES = Math.round(TOTAL * FPS);
