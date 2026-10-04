// 全編の時刻表（秒）。本編 0〜180 秒。タイトルとクレジットは前後に別枠で置く。
import type { Pt } from "../lib/track";
import { PB, stretchBeats } from "../cuts/proto";

export const TITLE = 5;
export const CREDITS = 8;
export const MAIN = 180;
export const FILM_TOTAL = TITLE + MAIN + CREDITS;

/** カットの開始（plan.md 第6節の秒数） */
export const CUT = {
  C01: 0,
  C02: 8,
  C03: 20,
  C04: 29,
  C05: 35,
  C06: 48,
  C07: 65,
  C08: 83,
  C12: 128,
  C13: 153,
  C14: 173,
  END: 180,
} as const;

/** C08〜C11：試作の拍を 1.5 倍に伸ばして 83〜128 秒へ（めくりの速さは変えない） */
export const SEG = stretchBeats(PB, 1.5, CUT.C08);

const r = (a: number, b: number): Pt => [a, b];

/** C01〜C07 と C12〜C14 の拍 */
export const FB = {
  // C01 内側：止まった絵 → 親指でめくる → 形の違うカップで止まる → もう一度
  fadeIn: r(0, 1.2),
  riffleA: 3.0,
  riffleB: 6.0,
  gatherA: r(5.0, 5.8),
  // C02 自分で見つけて直す
  c02cut: 8.0,
  fetch2: r(8.5, 9.4),
  carry2: r(9.4, 9.9),
  erase9: r(10.0, 11.0),
  putBack2: r(11.1, 11.8),
  take2: r(11.8, 12.3),
  toPage2: r(12.3, 12.7),
  draw9: r(12.7, 14.2),
  later2: 14.4,
  draw11: r(14.4, 15.1),
  putPencil2: r(15.1, 15.6),
  gather2: r(16.0, 16.5),
  replay2: 16.9,
  replay2End: 19.0,
  rest2: r(19.0, 20.0),
  // C03 B に見せる（B は向かい側）
  aRelease: r(21.2, 22.2),
  bEnter: r(20.6, 21.8),
  bRiffle: 22.8,
  bGather: r(25.0, 25.6),
  bSlow: 25.9,
  bSlowPps: 1.1,
  bRest: r(28.0, 29.0),
  // C04 表紙を閉じて押印
  bGatherAll: r(29.0, 29.5),
  coverClose: r(29.6, 30.6),
  toStamp: r(30.7, 31.5),
  dab: r(31.6, 32.1),
  toCover: r(32.2, 33.0),
  press: 33.2,
  lift: r(33.35, 33.8),
  returnStamp: r(33.9, 34.6),
  // C05 安堵、もう一度開く、同じ速さで違和感に気づく
  relief: r(35.0, 37.0),
  coverOpen: r(37.0, 38.2),
  c05close: 38.8,
  replay5: 39.0,
  c05back: 41.8,
  gather5: r(42.0, 42.6),
  riffle5: 43.0,
  // C06 閉じかけて止まる、自分から見せる
  gather6: r(48.2, 49.2),
  coverBack: r(49.5, 51.0),
  hold6: r(51.0, 54.0),
  coverReopen: r(54.0, 55.0),
  riffle6: 55.5,
  tapDesk: r(56.8, 58.6),
  bPoint6: r(59.0, 61.0),
  bPause6: r(61.0, 65.0),
  // C07 一続きのショット：A が示す → B が向かいを立つ → 回り込む → 同じ側に座る
  aShow7: r(65.0, 67.6),
  bLeave: r(67.8, 69.4),
  walk: r(69.4, 74.0),
  aMakeRoom: r(70.0, 71.5),
  bArrive: r(74.0, 76.0),
  aBack7: r(76.4, 78.2),
  hold7: r(78.2, 83.0),
  // C12 二案を比べ、A が選び、前後も描き直す
  sigh: r(128.0, 130.0),
  bPropose: r(130.0, 132.4),
  sheet1In: r(132.6, 133.6),
  takeP12: r(133.6, 134.1),
  sketch1: r(134.2, 136.4),
  ponder: r(136.4, 137.6),
  sheet1Out: r(137.6, 138.6),
  sheet2In: r(138.8, 139.8),
  sketch2: r(139.9, 142.4),
  bAgree: r(142.4, 144.2),
  sheet2Out: r(144.2, 145.0),
  putP12: r(145.0, 145.4),
  back16: r(145.9, 146.5),
  fetch12: r(146.5, 147.2),
  erase16: r(147.3, 148.5),
  putE12: r(148.5, 149.1),
  take12: r(149.1, 149.6),
  toPage12: r(149.6, 150.0),
  draw16: r(150.0, 151.8),
  later12: 152.0,
  draw14: r(152.0, 153.0),
  // C13 置いて、戻して、同じ速さで通す
  putP13: r(153.0, 153.5),
  gather13: r(153.95, 154.6),
  c13close: 155.0,
  replay13: 155.4,
  c13back: 159.6,
  gather13b: r(160.2, 160.9),
  replay13b: 161.4,
  aOff13: r(164.0, 165.0),
  bTurn13: r(165.2, 165.6),
  bGather13: r(165.6, 166.4),
  bRiffle13: 167.0,
  // C14 二人の手の力が少し抜ける
  relax: r(173.0, 177.5),
  fadeOut: r(177.6, 180.0),
};
