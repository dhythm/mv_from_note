// 全編の舞台（本編の秒 → StageState）。C08〜C11 は試作の segState を伸ばした拍で使う。
import { at, pointAlong, track, type Pt } from "../lib/track";
import { ERASER_HOME as EH, innerToPlate, leafEdgeX, PAGE, SPRITES } from "../stage/geometry";
import { SKETCHES as SK_RAW } from "../stage/sketches";
import type { BookState, Camera, DeskProps, HandState, SheetState, StageState } from "../stage/types";
import { FAN, flat, gatherBack, gatherRange, riffle, turned, type Angles } from "../story/flip";
import type { Version } from "../story/pages";
import { CAM, PINCH_ERASER_OFFSET, TIP, edit, innerPt, keysOf, native, place, toolOnPath } from "../cuts/kit";
import { segState } from "../cuts/proto";
import { handPoint } from "./handEvents";
import { CUT, FB, SEG } from "./beats";

const COVER_FAN = FAN(-2);
const CORNER: Pt = [1122, 548];
/** 消しゴムの定位置（全カット共通）。使い終えたら同じ場所へ戻す */
const ERASER_HOME: Pt = EH;
const ERASER_DOWN: Pt = EH;
const PENCIL_GRAB: Pt = [560, 667];
const STAMP_HOME: Pt = [SPRITES.stamp.x, SPRITES.stamp.y];
/** 印の柄の頭（部品の左上から）と、印面の中心（部品の左上から） */
const STAMP_KNOB: Pt = [58, 34];
const STAMP_FACE: Pt = [58, 150];
/** 表紙に残る印の中心（机の座標） */
export const SEAL_AT: Pt = [PAGE.x + 494 + 42, PAGE.y + 222 + 42];
const PAD_AT: Pt = [1435, 160];
/** K02 の右手（安堵して表紙の右端に置いた手）の指先 */
const CURL_TIP: Pt = [1118, 440];
/** 向かい側の B が手を休める場所（本の上辺の向こう） */
const B_WAIT: Pt = [860, 150];

const lerp = (a: number, b: number, f: number) => a + (b - a) * f;
const lerpPt = (a: Pt, b: Pt, f: number): Pt => [lerp(a[0], b[0], f), lerp(a[1], b[1], f)];
const ease = (f: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, f)));

/** 休んでいる手の、ごく小さな呼吸（画面全体の揺れではなく、その手だけ） */
function breathe(h: HandState, t: number, amp = 0.8, phase = 0): HandState {
  const dy = amp * Math.sin(t * 1.35 + phase);
  const dx = amp * 0.4 * Math.sin(t * 0.9 + phase * 2);
  if (h.matrix) {
    const m = h.matrix;
    return { ...h, matrix: [m[0], m[1], m[2], m[3], m[4] + dx, m[5] + dy] };
  }
  return { ...h, dy: h.dy + dy, dx: h.dx + dx };
}

/** A の左手は背景にも描かれているので、前景の手は絶対に動かさない（動かすと輪郭が二重になる） */
const aLeft = (_t: number): HandState => native("aL");
/** A の親指を右下の角に（めくる構え） */
const aThumb = (t: number, lift = 0.05) => breathe(place("aRpinch", TIP.pinch, CORNER, lift, 0), t, 0.5);
/** 束を戻している途中の手：ページの右端を追う */
function aGathering(g: number, fromAngle = FAN(10)): HandState {
  const ex = g < 1 ? leafEdgeX(Math.min(92, fromAngle * (1 - g))) : CORNER[0];
  const p: Pt = [Math.min(CORNER[0], ex + 4), 548];
  return place("aRpinch", TIP.pinch, p, 0.3, -(1124 - p[0]) / 60);
}
/** 開いた右手で束の所まで運び（指先を合わせて形を替える）、束を戻す */
function approachGather(t: number, from: Pt, approach: Pt, gather: Pt, fromAngle = FAN(10)): HandState {
  const stack: Pt = [leafEdgeX(Math.min(92, fromAngle)) + 4, 548];
  if (t < gather[0]) return place("aR", TIP.restTip, lerpPt(from, stack, ease(at(t, ...approach))), 0.5, 0);
  return aGathering(at(t, ...gather), fromAngle);
}

/** A の右手を本の右下の机の上に休ませる */
const REST: Pt = [1196, 520];
const aRest = (t: number, lift = 0.05): HandState => breathe(place("aR", TIP.restTip, REST, lift, 0), t, 0.7, 0.4);
/** 向かい側の B の手（180 度回した部品） */
const bTop = (id: "bRrest" | "bRpoint", tip: Pt, lift: number, extra = 0): HandState => {
  const nativeTip = id === "bRrest" ? TIP.bRestTip : TIP.pointTip;
  return place(id, nativeTip, tip, lift, 180 + extra);
};
/** B の左手：右から入ってきて紙の右端を支える（f: 0=画面外, 1=支えている） */
const supportIn = (f: number): HandState => place("bLsupport", TIP.supportTip, [1124 + 650 * (1 - f), 316 + 80 * (1 - f)], 0.5 * (1 - f), 0);
/** 同じ側に座った B が、指差しの手を休める位置 */
const B_SIDE_WAIT: Pt = [1300, 600];

/** 同じ側に座った B の右手（K06 の置き方） */
const bSide = (t: number, lift = 0.05): HandState => breathe(place("bRrest", TIP.bRestTip, [1118, 468], lift, 0), t, 0.6, 2.1);

function book(keys: string[], angles: Angles, extra: Partial<BookState> = {}): BookState {
  return { keys, angles, cover: COVER_FAN, seal: 1, ...extra };
}
const all = (v: Version) => keysOf(() => v);
const desk = (o: Partial<DeskProps> = {}): DeskProps => ({ pencil: true, eraser: true, stamp: true, ...o });

/** 置きに行った消しゴムを指が離したか（この瞬間から机の上に出す） */
const released = (t: number, put: Pt) => at(t, ...put) >= 0.9;

/** 消しゴムをつまんだ手：消しゴムの角が c に来る */
const eraserHand = (c: Pt, lift: number, rot = 0, holding = true): HandState =>
  place("aRpinch", TIP.pinch, [c[0] - PINCH_ERASER_OFFSET[0], c[1] - PINCH_ERASER_OFFSET[1]], lift, rot, { holding: holding ? "eraser" : undefined });
const reachRot = (x: number) => -24 * Math.min(1, Math.max(0, (1100 - x) / 800));

/** 消しゴムを取る→経路に沿って消す→置く、を一つの手で */
function eraseSequence(t: number, name: string, fetch: Pt, carryEnd: number, erase: Pt, put: Pt, from: Pt, to: Pt): HandState {
  const start = toolOnPath(name, "erase", 0);
  const end = toolOnPath(name, "erase", 1);
  if (t < fetch[1]) {
    const f = ease(at(t, ...fetch));
    const start0: Pt = [CORNER[0] + PINCH_ERASER_OFFSET[0], CORNER[1] + PINCH_ERASER_OFFSET[1]];
    const c = lerpPt(start0, from, f);
    // 机の消しゴムが消えるのと同じ瞬間から指につまむ
    return eraserHand(c, 0.5, reachRot(c[0]), t >= fetch[1] - 0.05);
  }
  if (t < erase[0]) {
    const c = lerpPt(from, start, ease(at(t, fetch[1], Math.min(carryEnd, erase[0]))));
    return eraserHand(c, 0.55, reachRot(c[0]));
  }
  if (t < erase[1]) return eraserHand(toolOnPath(name, "erase", at(t, ...erase)), 0.02, reachRot(start[0]));
  const f = ease(at(t, ...put));
  const c = lerpPt(end, to, f);
  return eraserHand(c, 0.5, reachRot(c[0]), !released(t, put));
}

/** 鉛筆を取る（カットで持ち替え）→ 経路に沿って描く */
function pencilHand(t: number, name: string, take: Pt, toPage: Pt, draw: Pt, drawFrom = 0): HandState {
  if (t < take[1]) {
    const f = at(t, ...take);
    const from: Pt = [ERASER_HOME[0] - PINCH_ERASER_OFFSET[0], ERASER_HOME[1] - PINCH_ERASER_OFFSET[1]];
    return place("aR", TIP.restTip, lerpPt(from, [PENCIL_GRAB[0] + 250, PENCIL_GRAB[1] - 20], ease(f)), 0.5 - 0.35 * f, 0);
  }
  if (t < toPage[1]) {
    const f = at(t, take[1], toPage[1]);
    const s = toolOnPath(name, "draw", drawFrom);
    return place("aRwrite", TIP.pencilTip, lerpPt(PENCIL_GRAB, [s[0], s[1] - 14], ease(f)), 0.6 * Math.sin(f * Math.PI), -11 * (1 - f));
  }
  if (t < draw[1]) return place("aRwrite", TIP.pencilTip, toolOnPath(name, "draw", lerp(drawFrom, 1, at(t, ...draw))), 0, 1.5 * Math.sin(t * 9));
  const s = toolOnPath(name, "draw", 1);
  const f = at(t, draw[1], draw[1] + 0.5);
  return place("aRwrite", TIP.pencilTip, [s[0] + 30 * f, s[1] - 20 * f], 0.5 * f, 0);
}

// ───────────────────────── C01〜C02 ─────────────────────────

function c01(t: number): StageState {
  const b = FB;
  let angles: Angles = flat();
  if (t >= b.riffleA && t < b.gatherA[0]) angles = riffle(t, { start: b.riffleA, from: 0, to: 9 });
  else if (t >= b.gatherA[0] && t < b.riffleB) angles = gatherBack(turned(9), at(t, ...b.gatherA));
  else if (t >= b.riffleB) angles = riffle(t, { start: b.riffleB, from: 0, to: 9 });
  // 止まっている間も親指が角をわずかに押す
  const press = t < b.riffleA ? 1.2 + 1.2 * Math.sin(t * 2.1) : 0;
  const hands = [aLeft(t), t >= b.gatherA[0] && t < b.gatherA[1] ? aGathering(at(t, ...b.gatherA)) : aThumb(t, 0.04 + 0.01 * press)];
  return { camera: CAM.page, book: book(all("Q0"), angles, { lift: press / 3 }), hands, desk: desk(), fade: 1 - at(t, ...b.fadeIn) };
}

function c02(t: number): StageState {
  const b = FB;
  const e9 = edit("Q0", "Q1", 9, 0, 0).name;
  const e11 = edit("Q0", "Q1", 11, 0, 0).name;
  const keys = keysOf((i) => {
    if (i === 9) return t >= b.draw9[1] ? "Q1" : "Q0";
    if (i === 10) return t >= b.later2 ? "Q1" : "Q0";
    if (i === 11) return t >= b.draw11[1] ? "Q1" : "Q0";
    return t >= b.replay2 - 1 ? "Q1" : "Q0";
  });
  let angles = turned(9);
  let ed: BookState["edit"];
  let camera: Camera = CAM.desk;
  const hands: HandState[] = [aLeft(t)];
  let d = desk();
  if (t < b.take2[1]) {
    ed = edit("Q0", "Q1", 9, at(t, ...b.erase9), 0);
    if (t >= b.carry2[1] && t < b.putBack2[0]) camera = CAM.draw;
    hands.push(eraseSequence(t, e9, b.fetch2, b.carry2[1], b.erase9, b.putBack2, ERASER_HOME, ERASER_HOME));
    if (t >= b.putBack2[1]) hands[1] = pencilHand(t, e9, b.take2, b.toPage2, b.draw9);
    d = desk({ eraser: t < b.fetch2[1] - 0.05 || released(t, b.putBack2) });
  } else if (t < b.later2) {
    camera = CAM.draw;
    ed = t < b.draw9[1] ? edit("Q0", "Q1", 9, 1, at(t, ...b.draw9)) : undefined;
    hands.push(pencilHand(t, e9, b.take2, b.toPage2, b.draw9));
    d = desk({ pencil: false });
  } else if (t < b.putPencil2[0]) {
    // 時間を飛ばす：最後の 11 ページ目を描き終えるところ
    camera = CAM.draw;
    angles = turned(11);
    ed = t < b.draw11[1] ? edit("Q0", "Q1", 11, 1, lerp(0.5, 1, at(t, ...b.draw11))) : undefined;
    hands.push(pencilHand(t, e11, [0, 0], [0, 0], b.draw11, 0.5));
    d = desk({ pencil: false });
  } else if (t < b.replay2) {
    angles = turned(11);
    const fp = at(t, ...b.putPencil2);
    const putEnd: Pt = [PENCIL_GRAB[0] + 420, PENCIL_GRAB[1] - 30];
    if (t < b.putPencil2[1]) {
      camera = fp < 0.5 ? CAM.draw : CAM.desk;
      if (fp < 0.5) {
        const s = toolOnPath(e11, "draw", 1);
        hands.push(place("aRwrite", TIP.pencilTip, lerpPt(s, PENCIL_GRAB, fp * 2), 0.5, -11 * fp * 2));
        d = desk({ pencil: false });
      } else hands.push(place("aR", TIP.restTip, lerpPt([PENCIL_GRAB[0] + 270, PENCIL_GRAB[1] - 30], putEnd, ease((fp - 0.5) * 2)), 0.4, 0));
    } else {
      const g = at(t, ...b.gather2);
      angles = gatherBack(turned(11), g);
      hands.push(t < b.gather2[1] ? approachGather(t, putEnd, [b.putPencil2[1], b.gather2[0]], b.gather2) : aThumb(t));
    }
  } else if (t < b.replay2End) {
    camera = CAM.page;
    angles = riffle(t, { start: b.replay2, from: 0, to: 23 });
    hands.push(aThumb(t));
  } else {
    camera = CAM.wide;
    angles = turned(23);
    // 通して見た後、ひと息ついて手を離す
    const f = at(t, ...b.rest2);
    hands.push(f < 0.4 ? aThumb(t, 0.05 + 0.3 * f) : place("aR", TIP.restTip, lerpPt(CORNER, REST, ease((f - 0.4) / 0.6)), 0.25, 0));
  }
  return { camera, book: book(keys, angles, { edit: ed }), hands, desk: d };
}

// ───────────────────────── C03〜C07 ─────────────────────────

function c03(t: number): StageState {
  const b = FB;
  // C02 の終わりの束を戻してから見せる
  const g0: Pt = [CUT.C03 + 0.5, CUT.C03 + 1.1];
  let angles = gatherBack(turned(23), at(t, ...g0));
  const hands: HandState[] = [aLeft(t)];
  // A：休めていた手で束を戻し、角を名残惜しく押さえてから離す
  if (t < b.aRelease[0]) hands.push(t < g0[1] ? approachGather(t, REST, [CUT.C03, g0[0]], g0) : aThumb(t, 0.05));
  else if (t < b.aRelease[1]) {
    const f = ease(at(t, ...b.aRelease));
    hands.push(f < 0.5 ? place("aRpinch", TIP.pinch, CORNER, 0.05 + 0.3 * f, 0) : place("aR", TIP.restTip, lerpPt(CORNER, REST, (f - 0.5) * 2), 0.2, 0));
  } else hands.push(aRest(t, 0.2));
  // B：向かい側から右上の角へ
  const corner: Pt = [1112, 236];
  let bt: Pt = lerpPt([1250, -120], corner, ease(at(t, ...b.bEnter)));
  if (t >= b.bRiffle && t < b.bGather[0]) angles = riffle(t, { start: b.bRiffle, from: 0, to: 23 });
  else if (t >= b.bGather[0] && t < b.bSlow) {
    const g = at(t, ...b.bGather);
    angles = gatherBack(turned(23), g);
    bt = [Math.min(corner[0], leafEdgeX(Math.min(92, FAN(10) * (1 - g))) + 4), corner[1]];
  } else if (t >= b.bSlow) {
    angles = riffle(t, { start: b.bSlow, from: 0, to: 5, pps: b.bSlowPps, dur: 0.6, ease: "inOut" });
  }
  const resting = at(t, ...b.bRest);
  bt = lerpPt(bt, B_WAIT, ease(resting));
  hands.push(breathe(bTop("bRrest", bt, 0.12 + 0.2 * resting), t, 0.5, 0.7));
  return { camera: CAM.wide, book: book(all("Q1"), angles), hands, desk: desk() };
}

function c04(t: number): StageState {
  const b = FB;
  const g = at(t, ...b.bGatherAll);
  let angles = gatherBack(turned(5), g);
  const cover = lerp(COVER_FAN, 0, ease(at(t, ...b.coverClose)));
  let stamp: DeskProps["stamp"] = true;
  let tip: Pt;
  let lift = 0.15;
  let id: "bRrest" | "bRpoint" = "bRrest";
  const coverEdge = (a: number): Pt => [Math.min(1118, leafEdgeX(Math.min(92, a)) + 4), 250];
  if (t < b.coverClose[0]) tip = lerpPt(B_WAIT, coverEdge(FAN(5) * (1 - g)), ease(g));
  else if (t < b.toStamp[0]) tip = coverEdge(cover);
  else {
    // 印を取る → 朱肉 → 表紙 → 押す → 戻す
    const knobAt = (topLeft: Pt): Pt => [topLeft[0] + STAMP_KNOB[0], topLeft[1] + STAMP_KNOB[1]];
    const faceTo = (p: Pt): Pt => [p[0] - STAMP_FACE[0], p[1] - STAMP_FACE[1]];
    let pos: Pt;
    if (t < b.toStamp[1]) {
      tip = lerpPt(coverEdge(0), knobAt(STAMP_HOME), ease(at(t, ...b.toStamp)));
      pos = STAMP_HOME;
      stamp = true;
    } else {
      if (t < b.dab[1]) {
        const f = at(t, ...b.dab);
        pos = lerpPt(STAMP_HOME, faceTo(PAD_AT), ease(Math.min(1, f * 1.6)));
        pos = [pos[0], pos[1] - 10 * Math.sin(Math.PI * f)];
      } else if (t < b.press) {
        pos = lerpPt(faceTo(PAD_AT), faceTo(SEAL_AT), ease(at(t, b.toCover[0], b.press - 0.08)));
        pos = [pos[0], pos[1] - 18 * Math.sin(Math.PI * at(t, b.toCover[0], b.press))];
      } else if (t < b.lift[1]) {
        pos = faceTo(SEAL_AT);
        pos = [pos[0], pos[1] - 14 * ease(at(t, ...b.lift))];
      } else {
        pos = lerpPt(faceTo(SEAL_AT), STAMP_HOME, ease(at(t, ...b.returnStamp)));
      }
      tip = knobAt(pos);
      lift = t >= b.press - 0.05 && t < b.lift[0] ? 0 : 0.3;
      stamp = t < b.returnStamp[1] ? pos : true;
    }
    if (t >= b.returnStamp[1]) tip = lerpPt(knobAt(STAMP_HOME), B_WAIT, ease(at(t, b.returnStamp[1], CUT.C05)));
  }
  if (t >= b.coverClose[0]) angles = flat();
  const seal = t >= b.press + 0.02 ? 1 : 0;
  // 押された後、A の右手は表紙の右端へ（次のカットの安堵の手の位置）
  const toCover = ease(at(t, b.returnStamp[0], CUT.C05));
  const aHand = toCover > 0 ? place("aR", TIP.restTip, lerpPt(REST, CURL_TIP, toCover), 0.2 - 0.15 * toCover, 0) : aRest(t, 0.15);
  const hands = [aLeft(t), aHand, breathe(bTop(id, tip, lift), t, 0.3, 0.7)];
  return { camera: CAM.wide, book: book(all("Q1"), angles, { cover, seal }), hands, desk: desk({ stamp }) };
}

function c05(t: number): StageState {
  const b = FB;
  let cover = 0;
  let angles: Angles = flat();
  let camera = CAM.wide;
  const hands: HandState[] = [aLeft(t)];
  if (t < b.coverOpen[0]) {
    // 承認の後の安堵：表紙の右端に置いた手（K02）がゆるみ、指先が丸まりはじめる
    const f = at(t, ...b.relief);
    // 最後に指先を表紙の右下の角へ滑らせる（そこでつまむ形に替える）
    const slide = ease(at(t, b.relief[1] - 0.6, b.relief[1]));
    hands.push(breathe(place("aRcurl", CURL_TIP, lerpPt([CURL_TIP[0], CURL_TIP[1] + 4 * f], CORNER, slide), 0.05, 0), t, 0.6 * (1 - slide)));
  } else if (t < b.c05close) {
    cover = lerp(0, COVER_FAN, ease(at(t, ...b.coverOpen)));
    const ex = cover > 0 ? leafEdgeX(Math.min(92, cover)) : CORNER[0];
    hands.push(place("aRpinch", TIP.pinch, [Math.min(CORNER[0], ex + 2), 548], 0.15 + 0.3 * Math.sin((Math.min(cover, 90) * Math.PI) / 180), -(1124 - Math.min(CORNER[0], ex)) / 60));
    if (t >= b.coverOpen[1]) hands[1] = aThumb(t);
    cover = t >= b.coverOpen[1] ? COVER_FAN : cover;
  } else if (t < b.c05back) {
    camera = CAM.page;
    cover = COVER_FAN;
    angles = riffle(t, { start: b.replay5, from: 0, to: 23 });
    hands.push(aThumb(t));
  } else {
    camera = CAM.book;
    cover = COVER_FAN;
    if (t < b.gather5[0]) {
      angles = turned(23);
      hands.push(aThumb(t, 0.08));
    } else if (t < b.riffle5) {
      const g = at(t, ...b.gather5);
      angles = gatherBack(turned(23), g);
      hands.push(t < b.gather5[1] ? aGathering(g) : aThumb(t));
    } else {
      // 同じ速さでめくり、浮いたカップのページで親指を止める。前のページを一枚戻して見比べ、また戻す
      angles = riffle(t, { start: b.riffle5, from: 0, to: 12 });
      const cmp = b.riffle5 + 1.6;
      if (t >= cmp) {
        angles[11] = track([[cmp, FAN(11)], [cmp + 0.6, 0], [cmp + 1.6, 0], [cmp + 2.3, FAN(11)]], t);
        const a = angles[11];
        const ex = a > 0 ? Math.min(CORNER[0], leafEdgeX(Math.min(92, a)) + 2) : CORNER[0];
        hands.push(place("aRpinch", TIP.pinch, [ex, 548], 0.1 + 0.3 * Math.sin((Math.min(a, 90) * Math.PI) / 180), 0));
      } else hands.push(aThumb(t, t > b.riffle5 + 1.2 ? 0.02 : 0.05));
    }
  }
  // B は向かい側で手を休めている
  if (camera === CAM.wide || camera === CAM.book) hands.push(breathe(bTop("bRrest", B_WAIT, 0.3), t, 0.5, 0.3));
  return { camera, book: book(all("Q1"), angles, { cover }), hands, desk: desk() };
}

function c06(t: number): StageState {
  const b = FB;
  let angles = turned(12);
  let cover = COVER_FAN;
  const hands: HandState[] = [aLeft(t)];
  let camera = CAM.book;
  if (t < b.gather6[1]) {
    const g = at(t, ...b.gather6);
    angles = gatherBack(turned(12), g);
    hands.push(aGathering(g, FAN(8)));
  } else if (t < b.riffle6) {
    angles = flat();
    // 表紙を戻しかけて、止まる。印が見える角度で、指先にためらい
    const close = track(
      [
        [b.coverBack[0], COVER_FAN],
        [b.coverBack[1], 38],
        [b.hold6[1], 34],
        [b.coverReopen[1], COVER_FAN],
      ],
      t,
    );
    cover = close;
    const ex = leafEdgeX(Math.min(92, cover));
    const tremble = t >= b.hold6[0] && t < b.hold6[1] ? 1.2 * Math.sin(t * 7.3) * Math.sin(t * 2.1) : 0;
    hands.push(place("aRpinch", TIP.pinch, [ex + 2, 548 + tremble], 0.35 + 0.25 * Math.sin((Math.min(cover, 90) * Math.PI) / 180), -(1124 - ex) / 60));
    if (t >= b.coverReopen[1]) hands[1] = aThumb(t);
  } else if (t < b.tapDesk[0]) {
    angles = riffle(t, { start: b.riffle6, from: 0, to: 12 });
    hands.push(aThumb(t));
  } else {
    angles = turned(12);
    camera = CAM.wide;
    // 自分から向かいの B の方へ手を伸ばし、机を軽くたたく
    const f = track(
      [
        [b.tapDesk[0], 0],
        [b.tapDesk[0] + 1.0, 1],
        [b.tapDesk[1], 1],
        [b.bPoint6[0] + 0.6, 0.15],
      ],
      t,
    );
    const tap = t > b.tapDesk[0] + 1.05 && t < b.tapDesk[0] + 1.35 ? 1 : 0;
    hands.push(place("aR", TIP.restTip, lerpPt([1150, 560], [1215, 330], f), 0.3 - 0.25 * tap, -6 * f));
  }
  // B：向かい側で待つ → 指で示されたページを見に来る
  let bt: Pt = B_WAIT;
  let id: "bRrest" | "bRpoint" = "bRrest";
  let lift = 0.3;
  if (t >= b.bPoint6[0]) {
    id = "bRpoint";
    const cup = innerPt(657, 251);
    const f = ease(at(t, ...b.bPoint6));
    bt = lerpPt(B_WAIT, [cup[0] - 6, cup[1] - 18], f);
    // 浮いたカップと渡す人の手のあいだを、指先がゆっくり行き来する
    const hand = innerPt(600, 262);
    const k = 0.5 - 0.5 * Math.cos(Math.max(0, t - b.bPoint6[1]) * 1.6);
    if (t > b.bPoint6[1]) bt = lerpPt([cup[0] - 6, cup[1] - 18], [hand[0] - 6, hand[1] - 18], k);
    lift = 0.65;
  }
  hands.push(breathe(bTop(id, bt, lift), t, 0.5, 0.3));
  return { camera, book: book(all("Q1"), angles, { cover }), hands, desk: desk() };
}

/** C07：B が向かい側から同じ側へ。カメラは切らない（一続き） */
function c07(t: number): StageState {
  const b = FB;
  let angles = turned(12);
  const hands: HandState[] = [aLeft(t)];
  // A：p11 を束から戻して、p11 と p12 を親指で行き来させて見せる
  const c06End: Pt = lerpPt([1150, 560], [1215, 330], 0.15);
  if (t < b.aShow7[0] + 0.6) {
    hands.push(place("aR", TIP.restTip, lerpPt(c06End, [leafEdgeX(Math.min(92, FAN(11))) + 2, 548], ease(at(t, b.aShow7[0], b.aShow7[0] + 0.6))), 0.45, 0));
    angles = turned(12);
  } else if (t < b.aShow7[1]) {
    const f = at(t, ...b.aShow7);
    const a11 = track(
      [
        [0.23, FAN(11)],
        [0.42, 0],
        [0.52, 0],
        [0.65, 62],
        [0.78, 0],
        [0.9, 62],
        [1, 0],
      ],
      f,
    );
    angles = turned(11);
    angles[11] = a11;
    const ex = a11 > 0 ? leafEdgeX(Math.min(92, a11)) : CORNER[0];
    hands.push(place("aRpinch", TIP.pinch, [Math.min(CORNER[0], ex + 2), 548], 0.2, -(1124 - Math.min(CORNER[0], ex)) / 60));
  } else {
    angles = turned(11);
    // 席を空ける：右手を手前へ引く → B が座ったら角へ戻す
    const away = track(
      [
        [b.aMakeRoom[0], 0],
        [b.aMakeRoom[1], 1],
        [b.aBack7[0], 1],
        [b.aBack7[1], 0.55],
      ],
      t,
    );
    hands.push(breathe(place("aRpinch", TIP.pinch, lerpPt(CORNER, [980, 840], away), 0.15 + 0.3 * away, 8 * away), t, 0.5));
  }
  // B：向かいで見る → 手を引いて立つ（上へ出る）→ 影が回り込む → 右下から袖が入る
  if (t < b.bLeave[1]) {
    const f = ease(at(t, ...b.bLeave));
    const cup = innerPt(657, 251);
    hands.push(bTop("bRpoint", lerpPt([cup[0] - 6, cup[1] - 18], [1150, -260], f), 0.6 + 0.3 * f));
  } else if (t >= b.bArrive[0]) {
    const f = ease(at(t, ...b.bArrive));
    hands.push(breathe(place("bRrest", TIP.bRestTip, lerpPt([1520, 980], [1118, 468], f), 0.6 - 0.55 * f, 10 * (1 - f)), t, 0.6, 2.1));
  }
  // 立ち上がった B の体の影が、窓の光をさえぎりながら机の右側を回り込む
  const w = ease(at(t, ...b.walk));
  const path = (u: number): Pt => (u < 0.5 ? lerpPt([1250, -150], [1720, 380], u * 2) : lerpPt([1720, 380], [1450, 1080], (u - 0.5) * 2));
  const sp = path(w);
  const passShadow = t >= b.walk[0] - 0.3 && t < b.bArrive[1] ? { x: sp[0], y: sp[1], amount: Math.sin(Math.PI * Math.min(1, at(t, b.walk[0] - 0.3, b.bArrive[1]))) } : undefined;
  return { camera: CAM.wide, book: book(all("Q1"), angles), hands, desk: desk(), passShadow };
}

// ───────────────────────── C12〜C14 ─────────────────────────

function sheetPos(inAt: Pt, outAt: Pt | null, t: number, tilt: number): { x: number; y: number; rot: number; opacity: number } {
  const fin = ease(at(t, ...inAt));
  const fout = outAt ? ease(at(t, ...outAt)) : 0;
  return { x: lerp(260, 0, fin) + 560 * fout, y: lerp(120, 0, fin) - 300 * fout, rot: lerp(tilt + 6, tilt, fin) + 8 * fout, opacity: 1 };
}

function c12(t: number): StageState {
  const b = FB;
  const e16 = edit("Q2", "Q3", 16, 0, 0).name;
  const e14 = edit("Q2", "Q3", 14, 0, 0).name;
  const keys = keysOf((i) => {
    if (t >= b.later12) return i === 14 && t < b.draw14[1] ? "Q2" : "Q3";
    if (i === 16 && t >= b.draw16[1]) return "Q3";
    return "Q2";
  });
  let angles = turned(23);
  let camera: Camera = CAM.book;
  let ed: BookState["edit"];
  const sheets: SheetState[] = [];
  const hands: HandState[] = [aLeft(t)];
  let d = desk({ eraser: ERASER_DOWN });
  const support = supportIn(1);
  if (t < b.sheet1In[0]) {
    // B の案：渡す人の手を指し、受け手の方へ素早く払う（急がせる）
    hands.push(aThumb(t, 0.05));
    const giver = innerPt(600, 262);
    const recv = innerPt(735, 355);
    const f = at(t, ...b.bPropose);
    // 指して、受け手の方へ素早く二度払い、手を引く
    const swipe = f < 0.3 || f > 0.8 ? 0 : (Math.sin(((f - 0.3) / 0.5) * Math.PI * 2 * 2 - Math.PI / 2) + 1) / 2;
    const home = handPoint(bSide(b.bPropose[0]));
    let tip = lerpPt(lerpPt(home, [giver[0] + 6, giver[1] + 16], ease(f / 0.3)), [recv[0], recv[1] + 10], swipe);
    if (f > 0.8) tip = lerpPt([giver[0] + 6, giver[1] + 16], B_SIDE_WAIT, ease((f - 0.8) / 0.2));
    hands.push(f <= 0 ? bSide(t) : place("bRpoint", TIP.pointTip, tip, 0.55, 0));
  } else if (t < b.sheet2Out[1]) {
    // A が薄紙を重ね、B の案を描いてみる → 外す → 受け手が待つ案を描く。B は手を引き、うなずくように紙を押さえる
    const s1 = sheetPos(b.sheet1In, b.sheet1Out, t, -0.6);
    sheets.push({ sketch: "rush", ...s1, draw: at(t, ...b.sketch1) });
    if (t >= b.sheet2In[0]) {
      const s2 = sheetPos(b.sheet2In, b.sheet2Out, t, 0.5);
      sheets.push({ sketch: "wait", ...s2, draw: at(t, ...b.sketch2) });
    }
    const sk = (name: "rush" | "wait", f: number): Pt => {
      const sp = t < b.sheet2In[0] ? s1 : sheetPos(b.sheet2In, b.sheet2Out, t, 0.5);
      // 薄紙のずれも含めた鉛筆の位置（回転は小さいので平行移動だけ）
      const path = name === "rush" ? SK.rush : SK.wait;
      const p = pointAlongInner(path, f);
      return [p[0] + sp.x, p[1] + sp.y];
    };
    let a: HandState;
    if (t < b.takeP12[0]) {
      const f = ease(at(t, ...b.sheet1In));
      a = place("aRpinch", TIP.pinch, [lerp(1380, CORNER[0] + 4, f), lerp(660, 560, f)], 0.3, 0);
    } else if (t < b.takeP12[1]) {
      a = pencilTake(t, b.takeP12);
      camera = CAM.desk;
    } else if (t < b.sketch1[1]) {
      camera = CAM.draw;
      const f = at(t, b.sketch1[0], b.sketch1[1]);
      a = place("aRwrite", TIP.pencilTip, t < b.sketch1[0] ? lerpPt(PENCIL_GRAB, sk("rush", 0), ease(at(t, b.takeP12[1], b.sketch1[0]))) : sk("rush", f), t < b.sketch1[0] ? 0.4 : 0, 1.4 * Math.sin(t * 9));
    } else if (t < b.sheet2In[0]) {
      camera = CAM.draw;
      // 描いてみて手が止まる。薄紙を右へ外す（鉛筆を持ったまま指でずらす）
      const end = sk("rush", 1);
      const f = at(t, ...b.ponder);
      a = place("aRwrite", TIP.pencilTip, [end[0] + 40 * ease(f), end[1] - 30 * ease(f)], 0.2 + 0.4 * f, 0);
      if (t >= b.sheet1Out[0]) {
        const g = ease(at(t, ...b.sheet1Out));
        a = place("aRwrite", TIP.pencilTip, [end[0] + 40 + 380 * g, end[1] - 30 - 200 * g], 0.5, 0);
      }
    } else if (t < b.sketch2[1]) {
      camera = CAM.draw;
      const f = at(t, ...b.sketch2);
      a = place("aRwrite", TIP.pencilTip, t < b.sketch2[0] ? lerpPt([900, 300], sk("wait", 0), ease(at(t, ...b.sheet2In))) : sk("wait", f), t < b.sketch2[0] ? 0.5 : 0, 1.4 * Math.sin(t * 9));
    } else {
      camera = CAM.draw;
      const end = sk("wait", 1);
      const g = ease(at(t, ...b.sheet2Out));
      a = place("aRwrite", TIP.pencilTip, [end[0] + 20 + 380 * g, end[1] - 20 - 200 * g], 0.4, 0);
    }
    hands.push(a);
    // B：下描きを見ていたが、A の案を指で確かめ、右へ手を引いてから、左手で紙の端を支える
    if (t < b.bAgree[0]) hands.push(breathe(place("bRpoint", TIP.pointTip, B_SIDE_WAIT, 0.3, 0), t, 0.6, 2.1));
    else {
      const f = at(t, ...b.bAgree);
      const w = innerPt(690, 300);
      if (f < 0.45) hands.push(place("bRpoint", TIP.pointTip, lerpPt(B_SIDE_WAIT, [w[0] + 30, w[1] + 40], ease(f / 0.45)), 0.55, 0));
      else if (f < 0.7) hands.push(place("bRpoint", TIP.pointTip, lerpPt([w[0] + 30, w[1] + 40], [1900, 700], ease((f - 0.45) / 0.25)), 0.6, 0));
      else hands.push(supportIn(ease((f - 0.7) / 0.3)));
    }
    d = desk({ eraser: ERASER_DOWN, pencil: t < b.takeP12[1] });
  } else if (t < b.later12) {
    // A が自分で描き直す：16 ページまで戻り、受け手の下がった手を消して、待つ手を描く
    if (t < b.fetch12[0]) {
      const g = at(t, ...b.back16);
      angles = gatherRange(16, 23, g);
      const fp = at(t, ...b.putP12);
      const putEnd: Pt = [PENCIL_GRAB[0] + 300, PENCIL_GRAB[1] - 40];
      if (t < b.putP12[1]) {
        camera = fp < 0.5 ? CAM.draw : CAM.book;
        hands.push(fp < 0.5 ? place("aRwrite", TIP.pencilTip, lerpPt([1050, 330], PENCIL_GRAB, fp * 2), 0.5, -11 * fp * 2) : place("aR", TIP.restTip, lerpPt([PENCIL_GRAB[0] + 250, PENCIL_GRAB[1] - 20], putEnd, ease((fp - 0.5) * 2)), 0.4, 0));
      } else hands.push(approachGather(t, putEnd, [b.putP12[1], b.back16[0]], b.back16, FAN(18)));
    } else {
      angles = turned(16);
      ed = edit("Q2", "Q3", 16, at(t, ...b.erase16), at(t, ...b.draw16));
      if (t >= b.draw16[1]) ed = undefined;
      if (t < b.take12[0]) {
        camera = t < b.erase16[0] - 0.2 ? CAM.desk : CAM.draw;
        hands.push(eraseSequence(t, e16, b.fetch12, b.erase16[0], b.erase16, b.putE12, ERASER_DOWN, ERASER_DOWN));
      } else {
        camera = t < b.take12[1] ? CAM.desk : CAM.draw;
        hands.push(pencilHand(t, e16, b.take12, b.toPage12, b.draw16));
      }
    }
    hands.push(support);
    const pencilOn = t < b.putP12[0] + 0.2 ? false : t < b.take12[1];
    d = desk({ pencil: pencilOn, eraser: t < b.fetch12[1] - 0.05 || released(t, b.putE12) ? ERASER_DOWN : false });
  } else {
    // 時間を飛ばす：14 ページ目（受け手の手に触れる直前）を描き終える
    camera = CAM.draw;
    angles = turned(14);
    ed = t < b.draw14[1] ? edit("Q2", "Q3", 14, 1, lerp(0.45, 1, at(t, ...b.draw14))) : undefined;
    hands.push(pencilHand(t, e14, [0, 0], [0, 0], b.draw14, 0.45));
    hands.push(support);
    d = desk({ pencil: false, eraser: ERASER_DOWN });
  }
  return { camera, book: book(keys, angles, { edit: ed, sheets }), hands, desk: d };
}

function pencilTake(t: number, take: Pt): HandState {
  const f = at(t, ...take);
  return place("aR", TIP.restTip, lerpPt([1200, 560], [PENCIL_GRAB[0] + 250, PENCIL_GRAB[1] - 20], ease(f)), 0.45 - 0.3 * f, -6);
}

function c13(t: number): StageState {
  const b = FB;
  let angles = turned(14);
  let camera: Camera = CAM.book;
  const hands: HandState[] = [aLeft(t)];
  let pencil = true;
  if (t < b.putP13[1]) {
    const fp = at(t, ...b.putP13);
    camera = fp < 0.5 ? CAM.draw : CAM.book;
    pencil = fp >= 0.5;
    const s = toolOnPath(edit("Q2", "Q3", 14, 0, 0).name, "draw", 1);
    const putEnd: Pt = [PENCIL_GRAB[0] + 400, PENCIL_GRAB[1] - 30];
    hands.push(fp < 0.5 ? place("aRwrite", TIP.pencilTip, lerpPt(s, PENCIL_GRAB, fp * 2), 0.5, -11 * fp * 2) : place("aR", TIP.restTip, lerpPt([PENCIL_GRAB[0] + 270, PENCIL_GRAB[1] - 30], putEnd, ease((fp - 0.5) * 2)), 0.4, 0));
    hands.push(supportIn(1 - ease(fp)));
  } else if (t < b.c13close) {
    const g = at(t, ...b.gather13);
    angles = gatherBack(turned(14), g);
    const putEnd: Pt = [PENCIL_GRAB[0] + 400, PENCIL_GRAB[1] - 30];
    hands.push(t < b.gather13[1] ? approachGather(t, putEnd, [b.putP13[1], b.gather13[0]], b.gather13) : aThumb(t));
    // B の右手が右下から入ってきて、紙の右端に指を置く
    const bIn = ease(at(t, b.putP13[1], b.gather13[1]));
    hands.push(breathe(place("bRrest", TIP.bRestTip, lerpPt([1520, 1000], [1118, 468], bIn), 0.5 - 0.4 * bIn, 0), t, 0.6 * bIn, 2.1));
  } else if (t < b.c13back) {
    camera = CAM.page;
    angles = riffle(t, { start: b.replay13, from: 0, to: 23 });
    hands.push(aThumb(t));
  } else if (t < b.bTurn13[0]) {
    if (t < b.gather13b[0]) angles = turned(23);
    else if (t < b.replay13b) {
      const g = at(t, ...b.gather13b);
      angles = gatherBack(turned(23), g);
    } else angles = riffle(t, { start: b.replay13b, from: 0, to: 23 });
    const gathering = t >= b.gather13b[0] && t < b.gather13b[1];
    const off = at(t, ...b.aOff13);
    hands.push(gathering ? aGathering(at(t, ...b.gather13b)) : off > 0 ? place("aRpinch", TIP.pinch, lerpPt(CORNER, [1030, 760], ease(off)), 0.05 + 0.35 * off, 6 * off) : aThumb(t, 0.04));
    hands.push(bSide(t, 0.08));
  } else {
    // B も自分の指で戻して、同じ速さでめくって確かめる
    const g = at(t, ...b.bGather13);
    angles = t < b.bRiffle13 ? gatherBack(turned(23), g) : riffle(t, { start: b.bRiffle13, from: 0, to: 23 });
    const ex = t < b.bGather13[1] ? Math.min(1118, leafEdgeX(Math.min(92, FAN(10) * (1 - g))) + 4) : 1118;
    const reach = ease(at(t, ...b.bTurn13));
    hands.push(breathe(place("aRpinch", TIP.pinch, [1030, 760], 0.4, 6), t, 0.6));
    hands.push(breathe(place("bRrest", TIP.bRestTip, lerpPt([1118, 468], [ex, 470], reach), 0.1, -(1118 - ex) / 45), t, 0.4, 2.1));
  }
  return { camera, book: book(all("Q3"), angles), hands, desk: desk({ pencil }) };
}

function c14(t: number): StageState {
  const b = FB;
  const f = ease(at(t, ...b.relax));
  // 二人の手の力が少し抜ける：A は角から手を離して引き、B の指は紙の上でゆるむ
  const a = breathe(place("aRpinch", TIP.pinch, lerpPt([1030, 760], [1070, 960], f), 0.4, 6 + 4 * f), t, 0.6);
  const bh = breathe(place("bRrest", TIP.bRestTip, [1118 - 6 * f, 468 + 10 * f], 0.05 + 0.04 * f, -1.5 * f), t, 0.5, 2.1);
  const left = native("aL");
  return { camera: CAM.wide, book: book(all("Q3"), turned(23)), hands: f < 0.98 ? [left, a, bh] : [left, bh], desk: desk(), fade: at(t, ...b.fadeOut) };
}

// C12 の下描きの経路（内側の絵の座標 → 机の座標）
const SK = { rush: SK_RAW.rush.drawPath, wait: SK_RAW.wait.drawPath };
function pointAlongInner(path: Pt[], f: number): Pt {
  const [ix, iy] = pointAlong(path, f);
  return innerToPlate(ix, iy);
}

/** 本編の秒 → 舞台。表紙の印は押した瞬間を境に、全てのカットで共通 */
export function filmState(t: number): StageState {
  const s = cutState(t);
  return { ...s, book: { ...s.book, seal: t >= FB.press + 0.02 ? 1 : 0 } };
}

function cutState(t: number): StageState {
  if (t < CUT.C02) return c01(t);
  if (t < CUT.C03) return c02(t);
  if (t < CUT.C04) return c03(t);
  if (t < CUT.C05) return c04(t);
  if (t < CUT.C06) return c05(t);
  if (t < CUT.C07) return c06(t);
  if (t < CUT.C08) return c07(t);
  if (t < CUT.C12) return segState(SEG, t);
  if (t < CUT.C13) return c12(t);
  if (t < CUT.C14) return c13(t);
  return c14(t);
}
