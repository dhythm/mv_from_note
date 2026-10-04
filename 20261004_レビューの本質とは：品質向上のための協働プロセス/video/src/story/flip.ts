// ページのめくり（綴じ目まわりの回転角）。0 = 平ら、180 = 左へ倒れきる。
// めくったページは綴じ目の左で、ほぼ立った束（FAN）になる。真上のカメラからは細い帯に見える。
import { ease, type Ease } from "../lib/track";
import { PAGE_COUNT, PAGES_PER_SEC } from "./pages";

/** 1枚が倒れるのにかかる時間。親指から離れた紙は素早く跳ねるので、各ページの絵は約2フレームずつ見える */
export const FLIP_DUR = 0.09;
/** めくったページが止まる角度（i 枚目ほど少しずつ寝る） */
export const FAN = (i: number) => 93 + i * 0.2;

export type Angles = number[];

export function flat(): Angles {
  return new Array(PAGE_COUNT).fill(0);
}

/** from より前を束にした状態 */
export function turned(upto: number): Angles {
  return flat().map((_, i) => (i < upto ? FAN(i) : 0));
}

/** 平らに見えている一番上のページ */
export function topPage(a: Angles): number {
  const i = a.findIndex((x) => x === 0);
  return i < 0 ? PAGE_COUNT - 1 : i;
}

export type Riffle = { start: number; from: number; to: number; pps?: number; dur?: number; ease?: Ease };

/** 親指で from から to の手前まで一定の速さでめくる */
export function riffle(t: number, r: Riffle): Angles {
  const pps = r.pps ?? PAGES_PER_SEC;
  const dur = r.dur ?? FLIP_DUR;
  return flat().map((_, i) => {
    if (i < r.from) return FAN(i);
    if (i >= r.to) return 0;
    const t0 = r.start + (i - r.from) / pps;
    if (t < t0) return 0;
    const f = Math.min(1, (t - t0) / dur);
    return f >= 1 ? FAN(i) : Math.max(0.5, FAN(i) * ease(r.ease ?? "out", f));
  });
}

/** 束を一度に戻す（手でまとめて右へ倒す）。f: 0=束のまま, 1=全て平ら */
export function gatherBack(a: Angles, f: number): Angles {
  const k = ease("inOut", f);
  return a.map((x) => x * (1 - k));
}

/** 1枚だけを手でゆっくりめくる。f: 0..1 で 0→束の角度 */
export function turnOne(base: Angles, page: number, f: number): Angles {
  const a = [...base];
  a[page] = FAN(page) * ease("inOut", f);
  return a;
}

/** 1枚だけを束から戻す。f: 0..1 で束の角度→0 */
export function returnOne(base: Angles, page: number, f: number): Angles {
  const a = [...base];
  a[page] = FAN(page) * (1 - ease("inOut", f));
  return a;
}

/** from から to の手前までの束だけを戻す（f: 0=束, 1=平ら）。from より前は束のまま */
export function gatherRange(from: number, to: number, f: number): Angles {
  const k = ease("inOut", f);
  return turned(to).map((x, i) => (i >= from ? x * (1 - k) : x));
}
