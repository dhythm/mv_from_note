// カットの時刻表。plan.html の構成と尺（目安）に対応。148 秒からはエンドロゴ（Main.tsx）。
import {StageSpec} from './components/stage';
import {cut10, cut11, cut12, cut5, cut6, cut7} from './cuts';
import {cut1, cut2, cut3, cut4, cut8, cut9} from './cutsA';
import {cut13, cut14, cut15} from './cutsC';

export const CUTS: [number, number, (t: number) => StageSpec][] = [
  [0, 8, cut1],
  [8, 15, cut2],
  [15, 22, cut3],
  [22, 30, cut4],
  [30, 38, cut5],
  [38, 47, cut6],
  [47, 57, cut7],
  [57, 67, cut8],
  [67, 74, cut9],
  [74, 86, cut10],
  [86, 97, cut11],
  [97, 109, cut12],
  [109, 122, cut13],
  [122, 133, cut14],
  [133, 148, cut15],
];

export function specAt(frame: number): StageSpec {
  const t = frame / 30;
  for (const [a, b, fn] of CUTS) if (t >= a && t < b) return fn(t);
  return cut15(Math.min(t, 147.99));
}
