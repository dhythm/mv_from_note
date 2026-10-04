// 画面と机の座標。机の座標は基準画（1600x900）の画素で、出力 1920x1080 へは 1.2 倍。
import parts from "../../public/gen/parts.json";

export const FPS = 24;
export const OUT_W = 1920;
export const OUT_H = 1080;
export const PLATE_W = 1600;
export const PLATE_H = 900;
export const BASE_SCALE = OUT_W / PLATE_W;

const [px0, py0, px1, py1] = parts.page as number[];
/** 綴じ目の右のページ（ここを軸にめくる） */
export const PAGE = { x: px0, y: py0, w: px1 - px0, h: py1 - py0 };

/** 内側の絵（1280x720）をページへ置く倍率と位置 */
export const INNER_SCALE = 0.533;
export const INNER = {
  w: 1280 * INNER_SCALE,
  h: 720 * INNER_SCALE,
  left: (PAGE.w - 1280 * INNER_SCALE) / 2,
  top: (PAGE.h - 720 * INNER_SCALE) / 2,
};

/** 内側の絵の座標 → 机の座標 */
export function innerToPlate(ix: number, iy: number): [number, number] {
  return [PAGE.x + INNER.left + ix * INNER_SCALE, PAGE.y + INNER.top + iy * INNER_SCALE];
}

export type SpriteInfo = { file: string; x: number; y: number; w: number; h: number };
export const SPRITES = parts.sprites as Record<string, SpriteInfo>;

/** 手の部品の中の目印（机の座標。手を動かす前の位置） */
export const HAND_POINTS = {
  /** 鉛筆の芯の先（K05） */
  pencilTip: [781, 378] as [number, number],
  /** つまむ指先（K03） */
  pinch: [903, 458] as [number, number],
  /** 指差す人差し指の先（K04） */
  pointTip: [906, 371] as [number, number],
  /** 支える指先（K05 の B の左手） */
  supportTip: [1126, 312] as [number, number],
  /** 置いた手の中指の先（K01 の A の右手） */
  restTip: [1118, 430] as [number, number],
  /** B の置いた手の指先（K06） */
  bRestTip: [1112, 400] as [number, number],
};

/** めくれている紙を3本の帯に分けたときの、帯ごとの追加の曲がり（度）。動いている間だけ大きくしなる */
export const LEAF_STRIPS = 3;
export const FAN_MIN = 92.5;
export function leafCurls(angle: number): number[] {
  const bend = Math.sin((Math.min(angle, 180) * Math.PI) / 180);
  const moving = angle < FAN_MIN ? 1 : 0.15;
  return [0, 9 * bend * moving, 14 * bend * moving];
}

/** めくれている紙の右端の x（真上から見た位置） */
export function leafEdgeX(angle: number): number {
  const s = PAGE.w / LEAF_STRIPS;
  const c = leafCurls(angle);
  let a = angle;
  let x = PAGE.x;
  for (let i = 0; i < LEAF_STRIPS; i++) {
    a += c[i];
    x += s * Math.cos((a * Math.PI) / 180);
  }
  return x;
}

/** つまんだ消しゴムの左上の角（紙に当たる角）が、つまむ指先からどれだけ左上にあるか */
export const ERASER_GRIP: [number, number] = [70, 60];

/** 消しゴムの定位置（部品の左上）。A の右手が無理なく届く、本の上辺の向こう。全てのカットで同じ */
export const ERASER_HOME: [number, number] = [640, 62];
