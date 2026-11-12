import TL from './timeline.json';

export const FPS = 30;
export const CUTS = (() => {
  let s = 0;
  return TL.cuts.map((c) => {
    const r = {id: c.id, start: s, dur: c.dur};
    s += c.dur;
    return r;
  });
})();
// カットの開始秒（id → 秒）
export const S: Record<string, number> = Object.fromEntries(CUTS.map((c) => [c.id, c.start]));
export const LOGO_START = CUTS[CUTS.length - 1].start + CUTS[CUTS.length - 1].dur;
S.logo = LOGO_START;
export const TOTAL = LOGO_START + TL.logoDur;
export const TOTAL_FRAMES = Math.round(TOTAL * FPS);
