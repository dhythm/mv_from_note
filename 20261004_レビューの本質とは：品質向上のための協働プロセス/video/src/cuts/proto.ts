// 難所試作：C08〜C11 を約30秒に圧縮。
// 指摘（B）では絵は変わらない → 作り手（A）が消して描き直す → 再生すると接続は直ったが受け手が先に手を下げる。
import { at, track } from "../lib/track";
import { ERASER_HOME, leafEdgeX, PAGE } from "../stage/geometry";
import { handPoint } from "../film/handEvents";
import type { BookState, HandState, StageState } from "../stage/types";
import { FAN, gatherBack, riffle, turned } from "../story/flip";
import { CAM, PINCH_ERASER_OFFSET, TIP, edit, innerPt, keysOf, native, place, toolOnPath } from "./kit";
import type { Pt } from "../lib/track";
import type { Version } from "../story/pages";

/** 試作の拍（秒）。効果音もこの表から作る */
export const PB: Beats = {
  // C08 B がゆっくりめくる
  c08: 0,
  slowStart: 0.7,
  slowPps: 0.9,
  slowDur: 0.6,
  lift1: [3.4, 4.2] as Pt,
  lower1: [4.5, 5.1] as Pt,
  lift2: [5.4, 6.1] as Pt,
  // C09 薄紙越しに重ねる → 指で関係を示す → A が鉛筆へ手を伸ばしかけて止まる → A 自身がめくって確かめる
  c09: 7.0,
  pressFlat: [7.0, 7.8] as Pt,
  point: [8.0, 8.6] as Pt,
  trace: [8.9, 10.2] as Pt,
  aReach: [10.2, 10.9] as Pt,
  aStop: [10.9, 11.4] as Pt,
  aBack: [11.4, 11.9] as Pt,
  aLift: [12.0, 12.6] as Pt,
  aLower: [12.7, 13.1] as Pt,
  aTurn: [13.2, 13.9] as Pt,
  // C10 A が消して描き直す（B は紙を支える）
  c10: 14.0,
  fetch: [14.1, 15.0] as Pt,
  carry: [15.0, 15.6] as Pt,
  erase12: [15.9, 17.5] as Pt,
  putEraser: [17.6, 18.2] as Pt,
  takePencil: [18.2, 18.9] as Pt,
  toPage: [18.9, 19.4] as Pt,
  draw12: [19.5, 22.3] as Pt,
  // 時間を飛ばす：残りのページも描き直した最後
  later: 22.6,
  draw23: [22.6, 23.6] as Pt,
  // C11 置いて、戻して、通して再生
  c11: 23.8,
  putPencil: [23.8, 24.3] as Pt,
  gather: [24.9, 25.45] as Pt,
  ready: [25.45, 25.75] as Pt,
  closeCut: 25.8,
  replay: 26.0,
  backCut: 29.0,
  end: 30.0,
};

/** 机の消しゴムの左上（＝つまんだときに紙に当たる角） */
export type Beats = {
  c08: number; slowStart: number; slowPps: number; slowDur: number;
  lift1: Pt; lower1: Pt; lift2: Pt;
  c09: number; pressFlat: Pt; point: Pt; trace: Pt; aReach: Pt; aStop: Pt; aBack: Pt; aLift: Pt; aLower: Pt; aTurn: Pt;
  c10: number; fetch: Pt; carry: Pt; erase12: Pt; putEraser: Pt; takePencil: Pt; toPage: Pt; draw12: Pt;
  later: number; draw23: Pt;
  c11: number; putPencil: Pt; gather: Pt; ready: Pt; closeCut: number; replay: number; backCut: number; end: number;
};

/** 拍の表を一様に伸ばし、start だけずらす（めくりの速さ 12 ページ/秒と 1 枚の倒れる時間は変えない） */
export function stretchBeats(b: Beats, k: number, start: number): Beats {
  const out: Record<string, unknown> = {};
  for (const [key, v] of Object.entries(b)) {
    if (key === "slowPps") out[key] = (v as number) / k;
    else if (key === "slowDur") out[key] = (v as number) * k;
    else if (Array.isArray(v)) out[key] = [start + v[0] * k, start + v[1] * k];
    else out[key] = start + (v as number) * k;
  }
  // 通しの再生は伸ばさない：開始だけ合わせる
  const o = out as Beats;
  o.backCut = o.replay + (b.backCut - b.replay);
  o.end = o.backCut + (b.end - b.backCut) * k;
  return o;
}

/** 机の消しゴムの左上（＝つまんだときに紙に当たる角）。使い終えたら同じ場所へ戻す */
const ERASER_DOWN: Pt = ERASER_HOME;
const PENCIL_GRAB: Pt = [560, 667];
/** 確かめるために持ち上げるページの角度（下のページの真ん中のカップが見えるまで） */
const LIFT = 62;

const CUP_P11: Pt = innerPt(601, 259);
const CUP_P12: Pt = innerPt(657, 251);

function bookAt(p: Beats, t: number): BookState {
  const v12: Version = t >= p.draw12[1] ? "Q2" : "Q1";
  const later = t >= p.later;
  const keys = keysOf((i) => {
    if (i === 12) return later ? "Q2" : v12;
    if (i > 12 && later) return i === 23 && t < p.draw23[1] ? "Q1" : "Q2";
    return "Q1";
  });
  let angles = turned(9);
  let onion: BookState["onion"];
  let ed: BookState["edit"];
  if (t < p.c09) {
    angles = riffle(t, { start: p.slowStart, from: 9, to: 11, pps: p.slowPps, dur: p.slowDur, ease: "inOut" });
    const lift = track(
      [
        [p.lift1[0], 0],
        [p.lift1[1], LIFT],
        [p.lower1[0], LIFT],
        [p.lower1[1], 0],
        [p.lift2[0], 0],
        [p.lift2[1], LIFT + 2],
      ],
      t,
    );
    angles[11] = lift;
  } else if (t < p.c10) {
    angles = turned(11);
    angles[11] = track(
      [
        [p.pressFlat[0], LIFT + 2],
        [p.pressFlat[1], 0],
        [p.aLift[0], 0],
        [p.aLift[1], LIFT],
        [p.aLower[0], LIFT],
        [p.aLower[1], 0],
        [p.aTurn[0], 0],
        [p.aTurn[1], FAN(11), "in"],
      ],
      t,
    );
    onion = { page: 12, amount: track([[p.pressFlat[0] + 0.3, 0], [p.pressFlat[1] + 0.2, 1], [p.aLift[0] - 0.2, 1], [p.aLift[0], 0]], t) };
  } else if (t < p.later) {
    angles = turned(12);
    ed = edit("Q1", "Q2", 12, at(t, ...p.erase12), at(t, ...p.draw12));
    if (t >= p.draw12[1]) ed = undefined;
  } else if (t < p.c11) {
    angles = turned(23);
    ed = edit("Q1", "Q2", 23, 1, 0.55 + 0.45 * at(t, ...p.draw23));
    if (t >= p.draw23[1]) ed = undefined;
  } else if (t < p.replay) {
    angles = gatherBack(turned(23), at(t, ...p.gather));
  } else {
    angles = riffle(t, { start: p.replay, from: 0, to: 23 });
  }
  const a11 = angles[11];
  const peek = undefined;
  return { keys, angles, cover: FAN(-2), seal: 1, onion, edit: ed, peek };
}

/** B の右手：右端に親指をかけてめくる／持ち上げる */
function bRiffleHand(p: Beats, angle11: number, t: number): HandState {
  const ex = angle11 > 0 ? leafEdgeX(angle11) : PAGE.x + PAGE.w;
  const pull = PAGE.x + PAGE.w - ex;
  // ゆっくり離すたびに親指がわずかに動く
  const flick = Math.max(0, Math.sin(((t - p.slowStart) * p.slowPps) * Math.PI * 2)) * 3;
  return place("bRrest", TIP.bRestTip, [1118 - pull, 468 - flick], 0.15 + 0.4 * Math.sin((angle11 * Math.PI) / 180), -pull / 45);
}

function handsAt(p: Beats, t: number, book: BookState): HandState[] {
  const hands: HandState[] = [native("aL")];
  if (t < p.c09) {
    hands.push(bRiffleHand(p, book.angles[11], t));
    return hands;
  }
  if (t < p.c10) {
    // B：押さえて透かす → 指差しに替えて、手の中のカップから浮いたカップへなぞる → 退く
    if (t < p.point[0]) {
      hands.push(bRiffleHand(p, book.angles[11], t));
    } else {
      const fTrace = at(t, ...p.trace);
      const target: Pt = [CUP_P11[0] + (CUP_P12[0] - CUP_P11[0]) * fTrace + 10, CUP_P11[1] + (CUP_P12[1] - CUP_P11[1]) * fTrace + 16];
      const withdraw = at(t, p.aReach[0] - 0.2, p.aReach[0] + 0.5);
      const enter = at(t, ...p.point);
      // 親指を掛けていた手の位置から、そのまま指差しへ（形だけを替える）
      const from: Pt = handPoint(bRiffleHand(p, 0, p.point[0]));
      const tx = from[0] + (target[0] - from[0]) * enter + 260 * withdraw;
      const ty = from[1] + (target[1] - from[1]) * enter + 220 * withdraw;
      hands.push(place("bRpoint", TIP.pointTip, [tx, ty], 0.6 + 0.2 * withdraw, 4 * withdraw));
    }
    // A の右手：鉛筆へ伸ばしかけて止まり、戻す。自分で一枚めくって確かめる
    if (t >= p.aReach[0] && t < p.aLift[0] - 0.1) {
      // 画面の下から鉛筆の上まで伸ばし、止まり、本の右下の角へ移る（そこで指の形を替える）
      const outside: Pt = [1240, 900];
      const nearPencil: Pt = [860, 600];
      const corner: Pt = [1122, 548];
      let tip: Pt;
      if (t < p.aStop[1]) {
        const f = track([[p.aReach[0], 0], [p.aReach[1], 1], [p.aStop[1], 0.94]], t);
        tip = [outside[0] + (nearPencil[0] - outside[0]) * f, outside[1] + (nearPencil[1] - outside[1]) * f];
      } else {
        const f = at(t, p.aStop[1], p.aLift[0] - 0.1);
        const s = 0.5 - 0.5 * Math.cos(Math.PI * f);
        const from: Pt = [outside[0] + (nearPencil[0] - outside[0]) * 0.94, outside[1] + (nearPencil[1] - outside[1]) * 0.94];
        tip = [from[0] + (corner[0] - from[0]) * s, from[1] + (corner[1] - from[1]) * s];
      }
      hands.push(place("aR", TIP.restTip, tip, t < p.aStop[1] ? 0.55 : 0.4 - 0.3 * at(t, p.aStop[1], p.aLift[0] - 0.1), 0));
    } else if (t >= p.aLift[0] - 0.1) {
      const a = book.angles[11];
      const ex = a > 0 ? leafEdgeX(Math.min(a, 92)) : PAGE.x + PAGE.w;
      const away = at(t, p.aTurn[1] - 0.2, p.aTurn[1] + 0.4);
      hands.push(place("aRpinch", TIP.pinch, [ex - 2 + 120 * away, 548 + 60 * away], 0.2 + 0.4 * Math.sin((Math.min(a, 90) * Math.PI) / 180), -(1124 - ex) / 60));
    }
    return hands;
  }
  // C10 以降：B の左手が紙の右端を支える
  const support = t >= p.c10 && t < p.c11 + 1.0;
  // B の左手は画面の右から入ってきて紙の右端を押さえる
  const sIn = 0.5 - 0.5 * Math.cos(Math.PI * at(t, p.c10, p.c10 + 0.8));
  const supportHand = place("bLsupport", TIP.supportTip, [1124 + 600 * (1 - sIn), 316 + 60 * (1 - sIn)], 0.5 * (1 - sIn), 0);
  if (t < p.later) {
    if (support) hands.push(supportHand);
    if (t < p.putEraser[1]) {
      // 消しゴムを取りに行き、消して、本の左上へ置く
      let target: Pt;
      let holding = t >= p.fetch[1] - 0.05;
      const homeGrip: Pt = [ERASER_HOME[0] - PINCH_ERASER_OFFSET[0], ERASER_HOME[1] - PINCH_ERASER_OFFSET[1]];
      const start = toolOnPath(edit("Q1", "Q2", 12, 0, 0).name, "erase", 0);
      const startGrip: Pt = [start[0] - PINCH_ERASER_OFFSET[0], start[1] - PINCH_ERASER_OFFSET[1]];
      if (t < p.fetch[1]) {
        const f = 0.5 - 0.5 * Math.cos(Math.PI * at(t, p.c10, p.fetch[1]));
        const startTip = handPoint(handsAt(p, p.c10 - 0.01, bookAt(p, p.c10 - 0.01)).find((h) => h.id === "aRpinch")!);
        target = [startTip[0] + (homeGrip[0] - startTip[0]) * f, startTip[1] + (homeGrip[1] - startTip[1]) * f];
      } else if (t < p.erase12[0]) {
        const f = at(t, p.carry[0], p.erase12[0]);
        target = [homeGrip[0] + (startGrip[0] - homeGrip[0]) * f, homeGrip[1] + (startGrip[1] - homeGrip[1]) * f];
      } else if (t < p.erase12[1]) {
        const c = toolOnPath(edit("Q1", "Q2", 12, 0, 0).name, "erase", at(t, ...p.erase12));
        target = [c[0] - PINCH_ERASER_OFFSET[0], c[1] - PINCH_ERASER_OFFSET[1]];
      } else {
        const f = at(t, ...p.putEraser);
        const end = toolOnPath(edit("Q1", "Q2", 12, 0, 0).name, "erase", 1);
        const down: Pt = [ERASER_DOWN[0] - PINCH_ERASER_OFFSET[0], ERASER_DOWN[1] - PINCH_ERASER_OFFSET[1]];
        target = [end[0] + (down[0] - end[0]) * f, end[1] + (down[1] - end[1]) * f];
        holding = f < 0.9;
      }
      const reachRot = -24 * Math.min(1, Math.max(0, (1100 - target[0]) / 800));
      const rubbing = t >= p.erase12[0] && t < p.erase12[1];
      hands.push(place("aRpinch", TIP.pinch, target, rubbing ? 0.02 : 0.55, reachRot, { holding: holding ? "eraser" : undefined }));
    } else if (t < p.takePencil[1]) {
      // 鉛筆を取る
      // 消しゴムを置いた手の位置から、そのまま鉛筆へ（指の形だけを替える）
      const f = 0.5 - 0.5 * Math.cos(Math.PI * at(t, p.putEraser[1], p.takePencil[1]));
      const from: Pt = [ERASER_DOWN[0] - PINCH_ERASER_OFFSET[0], ERASER_DOWN[1] - PINCH_ERASER_OFFSET[1]];
      const to: Pt = [PENCIL_GRAB[0] + 250, PENCIL_GRAB[1] - 20];
      const tip: Pt = [from[0] + (to[0] - from[0]) * f, from[1] + (to[1] - from[1]) * f];
      hands.push(place("aR", TIP.restTip, tip, 0.5 - 0.35 * f, 0));
    } else {
      const draw = edit("Q1", "Q2", 12, 1, 0).name;
      let tip: Pt;
      let rot = 0;
      let lift = 0;
      if (t < p.toPage[1]) {
        const f = at(t, p.takePencil[1], p.toPage[1]);
        const s = toolOnPath(draw, "draw", 0);
        tip = [PENCIL_GRAB[0] + (s[0] - PENCIL_GRAB[0]) * f, PENCIL_GRAB[1] + (s[1] - 14 - PENCIL_GRAB[1]) * f];
        rot = -11 * (1 - f);
        lift = 0.6 * Math.sin(f * Math.PI);
      } else if (t < p.draw12[1]) {
        tip = toolOnPath(draw, "draw", at(t, p.draw12[0], p.draw12[1]));
        rot = 1.5 * Math.sin(t * 9);
      } else {
        const s = toolOnPath(draw, "draw", 1);
        const f = at(t, p.draw12[1], p.later);
        tip = [s[0] + 30 * f, s[1] - 20 * f];
        lift = 0.5 * f;
      }
      hands.push(place("aRwrite", TIP.pencilTip, tip, lift, rot));
    }
    return hands;
  }
  if (t < p.c11) {
    hands.push(place("bLsupport", TIP.supportTip, [1124, 316], 0, 0));
    const draw = edit("Q1", "Q2", 23, 1, 0).name;
    const tip = toolOnPath(draw, "draw", 0.55 + 0.45 * at(t, ...p.draw23));
    hands.push(place("aRwrite", TIP.pencilTip, t < p.draw23[1] ? tip : [tip[0] + 20, tip[1] - 15], t < p.draw23[1] ? 0 : 0.4, 1.2 * Math.sin(t * 9)));
    return hands;
  }
  // C11：鉛筆を置き、束の所へ手を運び、束を戻し、親指を右下の角へ。B の左手は右へ退き、右手が右下から入る
  const ease = (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, x)));
  const sOut = ease(at(t, ...p.putPencil));
  if (t < p.putPencil[1]) hands.push(place("bLsupport", TIP.supportTip, [1124 + 650 * sOut, 316 + 80 * sOut], 0.1 + 0.4 * sOut, 0));
  const bIn = ease(at(t, p.gather[0] - 0.2, p.gather[1] + 0.2));
  if (t >= p.gather[0] - 0.2) hands.push(place("bRrest", TIP.bRestTip, [1500 + (1250 - 1500) * bIn, 1000 + (640 - 1000) * bIn], 0.5 - 0.4 * bIn, 0));
  const putEnd: Pt = [PENCIL_GRAB[0] + 470, PENCIL_GRAB[1] + 10];
  const stack: Pt = [leafEdgeX(Math.min(92, FAN(10))) + 4, 548];
  if (t < p.putPencil[1]) {
    const f = at(t, ...p.putPencil);
    if (f < 0.5) {
      // 鉛筆を持った手が下へ出ていく（ここで書き割りの鉛筆と持ち替える：カットで隠す）
      const g2 = f / 0.5;
      const from = toolOnPath(edit("Q1", "Q2", 23, 1, 0).name, "draw", 1);
      hands.push(place("aRwrite", TIP.pencilTip, [from[0] + (PENCIL_GRAB[0] - from[0]) * g2, from[1] + (PENCIL_GRAB[1] - from[1]) * g2], 0.5 * Math.sin(g2 * Math.PI), -11 * g2));
    } else {
      // カットの後：鉛筆は机に置かれ、手が離れていく
      const g2 = (f - 0.5) / 0.5;
      hands.push(place("aR", TIP.restTip, [PENCIL_GRAB[0] + 270 + 200 * g2, PENCIL_GRAB[1] - 30 + 40 * g2], 0.2 + 0.3 * g2, 0));
    }
  } else if (t < p.gather[0]) {
    const f = ease(at(t, p.putPencil[1], p.gather[0]));
    hands.push(place("aR", TIP.restTip, [putEnd[0] + (stack[0] - putEnd[0]) * f, putEnd[1] + (stack[1] - putEnd[1]) * f], 0.5 - 0.2 * f, 0));
  } else {
    const g = at(t, ...p.gather);
    const ex = t < p.gather[1] ? leafEdgeX(Math.min(92, FAN(10) * (1 - ease(g)))) : PAGE.x + PAGE.w;
    let corner: Pt = [Math.min(1122, ex + 4), 548];
    // 通して見た後：受け手が先に手を下げた。親指が角から少し浮き、止まる
    const after = ease(at(t, p.backCut + 0.3, p.end - 0.4));
    corner = [corner[0] + 40 * after, corner[1] + 50 * after];
    hands.push(place("aRpinch", TIP.pinch, corner, t < p.gather[1] ? 0.3 : 0.05 + 0.3 * after, 0));
  }
  return hands;
}

const putMid = (p: Beats) => (p.putPencil[0] + p.putPencil[1]) / 2;

/** 拍の表 p に従った C08〜C11 の舞台 */
export function segState(p: Beats, t: number): StageState {
  const book = bookAt(p, t);
  let camera = CAM.book;
  if (t >= p.c10 && t < p.carry[1]) camera = CAM.desk;
  else if (t >= p.carry[1] && t < p.putEraser[0]) camera = CAM.draw;
  else if (t >= p.putEraser[0] && t < p.takePencil[1]) camera = CAM.desk;
  // 鉛筆を手に取る瞬間と置く瞬間はカットに重ねる（机の鉛筆と手の中の鉛筆は長さが違う）
  else if (t >= p.takePencil[1] && t < putMid(p)) camera = CAM.draw;
  else if (t >= p.closeCut && t < p.backCut) camera = CAM.page;
  // 手が離した瞬間からだけ机に置かれる（手の中と机の上に同時に出さない）
  const eraserOnDesk: boolean | Pt = t < p.fetch[1] - 0.05 ? true : t >= p.putEraser[0] + 0.9 * (p.putEraser[1] - p.putEraser[0]) ? ERASER_DOWN : false;
  const pencilOnDesk = t < p.takePencil[1] || t >= putMid(p);
  return {
    camera,
    book,
    hands: handsAt(p, t, book),
    desk: { pencil: pencilOnDesk, eraser: eraserOnDesk, stamp: true },
  };
}

export function protoState(t: number): StageState {
  return segState(PB, t);
}
