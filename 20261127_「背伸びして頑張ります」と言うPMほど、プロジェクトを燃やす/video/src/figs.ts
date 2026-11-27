// 図の設計図。柱・棒・ブロック列・帯と面を、カットの画面 px（1920×1080 の枠）で並べる。
// 時刻 t（カットの頭からの秒）から決まる純関数。three.js の描画（world.tsx）、ラベルの文字と検査用の矩形（type.tsx）が同じ並びを使う。
// 倒れる・傾く角度もフレーム時刻から決める（実時間の物理演算は使わない）。
import {C, clamp, in3, inOut, kv, lerp, mix, out3, outBack, outExpo, prog, type K} from './kit';
import {damped, pulse, wobble} from './lib/anim';
import {D, at, vt} from './timeline';

export type Prim = {
  k: 'card' | 'rect' | 'label';
  cut: string;
  /** 中心（カットの枠の px） */
  x: number;
  y: number;
  w: number;
  h: number;
  rz?: number; // 度（正で時計回り）
  ry?: number;
  s?: number;
  o?: number;
  z?: number; // 奥行き（世界単位。負が奥）
  layer?: number;
  fill?: string;
  edge?: string;
  ew?: number;
  rad?: number;
  shadow?: number;
  text?: string;
  size?: number;
  color?: string;
  weight?: number;
  back?: {fill: string; edge: string; text?: string; color?: string; size?: number};
  dom?: boolean;
  blur?: number;
  /** 文字との重なり検査の対象にするか（既定 true） */
  fig?: boolean;
  /** 移動中（検査では移動中の報告に分ける） */
  mv?: boolean;
  /** 動画インサートの上にも出す */
  over?: boolean;
};

const mvg = (t: number, a: number, b: number) => t > a - 0.02 && t < b + 0.02;
// 下端 base から高さ h で立つ柱・棒
const bar = (cut: string, x: number, base: number, w: number, h: number, fill: string, p: Partial<Prim> = {}): Prim => ({
  k: 'card', cut, x, y: base - h / 2, w, h, fill, edge: fill, ew: 0, rad: 10, shadow: 1, ...p,
});
// 下端の角（'r' 右下 / 'l' 左下）を軸に deg 度（正で時計回り）傾いた矩形
function pivot(cut: string, px: number, py: number, w: number, h: number, deg: number, side: 'r' | 'l', fill: string, p: Partial<Prim> = {}): Prim {
  const th = (deg * Math.PI) / 180;
  const ox = side === 'r' ? -w / 2 : w / 2;
  const oy = -h / 2;
  return {
    k: 'card', cut, w, h, rz: deg, fill, edge: fill, ew: 0, rad: 8, shadow: 1,
    x: px + ox * Math.cos(th) - oy * Math.sin(th),
    y: py + ox * Math.sin(th) + oy * Math.cos(th),
    ...p,
  };
}
// 図に添えるラベル（図と同じカメラで投影する文字）
const label = (cut: string, text: string, x: number, y: number, size: number, color: string, p: Partial<Prim> = {}): Prim => ({
  k: 'label', cut, text, x, y, w: size * Array.from(text).length * 1.02 + size * 0.4, h: size * 1.3, size, color, weight: 700, fig: false, ...p,
});
const rect = (cut: string, x: number, y: number, w: number, h: number, fill: string, p: Partial<Prim> = {}): Prim => ({k: 'rect', cut, x, y, w, h, fill, fig: false, ...p});

// ---- 01: 同じ高さの二本が、高さと傾きで分かれる ----
export const T01 = {
  strong: vt('01', '頼もしく'),
  but: vt('01', 'でも'),
  view: vt('01', '見通し'),
  co: vt('01', '会社が'),
  gamble: vt('01', '経営者'),
  risk: vt('01', 'リスクを取らず'),
  land: vt('01', '着地'),
  best: vt('01', 'いちばん'),
  small: vt('01', 'リスクは起き'),
  diff: vt('01', '大きさは'),
};
function cut01(t: number, o: Prim[]) {
  const {gamble, land} = T01;
  const BASE = 900;
  // 二本はまず同じ高さで立つ
  const pop = (d: number) => outBack(prog(t, 0.55 + d, 1.05 + d));
  // 左: 経営の賭け。声の「経営者」で高くなり、傾き続ける
  const kg = inOut(prog(t, gamble, gamble + 0.9));
  const hL = lerp(300, 640, kg) * pop(0);
  const tilt = -lerp(0, 9, out3(prog(t, gamble + 0.3, gamble + 1.4))) - 0.25 * Math.max(0, t - gamble - 1.4) + 0.6 * wobble(t, 3, 2.6) * kg;
  o.push(pivot('01', 1215, BASE, 170, Math.max(1, hL), tilt, 'l', mix(C.neutral, C.rust, kg), {mv: mvg(t, gamble, gamble + 1.4) || t < 1.1}));
  // 右: 着地。声の「着地」で低くなり、立ったまま残る
  const kl = inOut(prog(t, land - 0.1, land + 0.6));
  const hR = lerp(300, 220, kl) * pop(0.1);
  o.push(bar('01', 1560, BASE, 170, Math.max(1, hR), mix(C.neutral, C.blue, kl), {mv: mvg(t, land - 0.1, land + 0.6) || t < 1.2}));
  // 地面の線
  o.push(rect('01', 1390, BASE + 3, 560 * out3(prog(t, 0.4, 1.2)), 4, C.neutral, {layer: -2}));
  // ラベル（柱の面ではなく、柱の上に置く）
  const th = (tilt * Math.PI) / 180;
  if (t > gamble + 0.4) o.push(label('01', '経営の賭け', 1215 + 85 + Math.sin(th) * (hL + 50), BASE - Math.cos(th) * (hL + 50), 40, C.rust, {o: out3(prog(t, gamble + 0.4, gamble + 0.8))}));
  if (t > land + 0.3) o.push(label('01', '着地', 1560, BASE - hR - 46, 40, C.blue, {o: out3(prog(t, land + 0.3, land + 0.7))}));
}

// ---- 02: 柱が背伸びして伸び、短い高さへ戻る ----
export const T02 = {
  up: vt('02', '背伸び'),
  mgmt: vt('02', 'マネジメント'),
  luck: vt('02', 'うまくいっても'),
  member: vt('02', 'メンバー'),
  un: vt('02', '運が'),
  ctrl: vt('02', 'コントロール'),
  calm: vt('02', '淡々と'),
};
function cut02(t: number, o: Prim[]) {
  const {up, mgmt, luck, ctrl, calm} = T02;
  const BASE = 900;
  const grow = outExpo(prog(t, up - 0.15, up + 0.9));
  const shrink = inOut(prog(t, mgmt, mgmt + 0.7));
  const h = lerp(lerp(40, 700, grow), 260, shrink);
  // 支えるメンバー（小さなブロック三つ）が下に入って柱を持ち上げ、淡々と、で地面へ戻る
  const lift = out3(prog(t, luck + 0.2, luck + 0.7)) * (1 - inOut(prog(t, calm, calm + 0.6)));
  const slide = 14 * Math.max(0, t - calm - 0.4);
  const x = 1480 + slide;
  const sway = (1 - shrink) * grow * 1.6 * wobble(t, 5, 1.8);
  // 背伸びした高さの影（短くなったあとも、うすく残す）
  if (t > mgmt) o.push(bar('02', x, BASE, 180, 700, C.neutral, {o: 0.55 * (1 - prog(t, calm + 0.8, D['02'])), shadow: 0, layer: -3, fig: false}));
  o.push(pivot('02', x - 90, BASE - 56 * lift, 180, Math.max(1, h * clamp(t / 0.3)), sway, 'l', mix(C.rust, C.blue, shrink), {mv: mvg(t, up - 0.15, up + 0.9) || mvg(t, mgmt, mgmt + 0.7)}));
  for (let i = 0; i < 3; i++) {
    const k = out3(prog(t, luck + i * 0.08, luck + 0.45 + i * 0.08));
    const gone = inOut(prog(t, calm, calm + 0.6));
    if (k <= 0 || gone >= 1) continue;
    o.push(bar('02', x - 60 + i * 60, BASE, 52, 52 * k * (1 - gone) + 0.01, C.neutral, {mv: k < 1 || gone > 0}));
  }
  if (t > ctrl && t < calm + 0.6) o.push(label('02', 'メンバー', x, BASE + 40, 32, C.gray, {o: 1 - prog(t, calm, calm + 0.4)}));
  o.push(rect('02', 1480, BASE + 3, 520, 4, C.neutral, {layer: -2}));
}

// ---- 03: 予想と実際の二本が、原稿の平均まで伸びる（比は 33.9 : 55.5） ----
const H_MAX = 560;
export const H_YO = (H_MAX * 33.9) / 55.5;
export const T03 = {
  me: vt('03', '私も'),
  pf: vt('03', 'けいかくさくご'),
  past: vt('03', '過去を'),
  next: vt('03', '次も'),
  ins0: vt('03', 'せんきゅう') - 0.35,
  thesis: vt('03', '卒業論文'),
  n37: vt('03', 'さんじゅうななにん'),
  ins1: vt('03', 'の予想は') + 0.15,
  yo: vt('03', '予想は'),
  yoNum: vt('03', 'さんじゅうさんてん'),
  ji: vt('03', '実際は'),
  jiNum: vt('03', 'ごじゅうご'),
  until: vt('03', '予想した日'),
  wari: vt('03', 'さんわり'),
};
export function bars03(t: number) {
  const {yo, yoNum, ji, jiNum} = T03;
  const kYo = out3(prog(t, yo + 0.1, yoNum + 1.1));
  const kJi = inOut(prog(t, ji + 0.15, jiNum + 1.25));
  return {hYo: lerp(24, H_YO, kYo), hJi: lerp(24, H_MAX, kJi), kYo, kJi};
}
function cut03(t: number, o: Prim[]) {
  const {pf, yo, jiNum} = T03;
  if (t < pf - 0.1) return;
  const BASE = 880;
  const pop = outBack(prog(t, pf + 0.1, pf + 0.6));
  const {hYo, hJi, kYo, kJi} = bars03(t);
  o.push(rect('03', 1400, BASE + 3, 640 * pop, 4, C.neutral, {layer: -2}));
  o.push(bar('03', 1250, BASE, 230 * pop, hYo, C.blue, {mv: kYo > 0 && kYo < 1}));
  o.push(bar('03', 1560, BASE, 230 * pop, hJi, C.rust, {mv: kJi > 0 && kJi < 1}));
  o.push(label('03', '予想', 1250, BASE + 46, 40, C.blue, {o: pop}));
  o.push(label('03', '実際', 1560, BASE + 46, 40, C.rust, {o: pop}));
  // 予想の高さの線（実際の棒の上を横切る）。長い棒を勝ちに見せず、予想を超えた分として見せる
  const kd = out3(prog(t, jiNum + 1.0, jiNum + 1.8));
  for (let i = 0; i < 14; i++) {
    const kk = clamp(kd * 14 - i);
    if (kk <= 0) continue;
    o.push(rect('03', 1120 + i * 40, BASE - H_YO, 22 * kk, 4, C.blue, {layer: 5, o: 0.85}));
  }
  void yo;
}

// ---- 04: 隙間のない列は一つで倒れ、隙間のある列は一つで止まる ----
export const T04 = {
  buf: vt('04', 'バッファ'),
  pz: vt('04', 'パツパツ'),
  hobo: vt('04', 'ほぼ'),
  lose: vt('04', '負けが'),
  one: vt('04', '一つ遅れれば'),
  fill: vt('04', '現場が埋める'),
  first: vt('04', 'だから最初に'),
  nego: vt('04', '交渉'),
  ins0: vt('04', '休日も') - 0.3,
  hol: vt('04', '休日も'),
  pace: vt('04', '無理な'),
  pay: vt('04', '払うのは'),
  ins1: vt('04', '毎回') - 0.15,
  every: vt('04', '毎回'),
  some: vt('04', 'いつか'),
};
const TOP = {n: 9, w: 40, h: 150, sp: 66, x0: 1170, base: 470};
const BOT = {n: 6, w: 40, h: 150, sp: 110, x0: 1170, base: 800};
function cut04(t: number, o: Prim[]) {
  const {one} = T04;
  const enter = (d: number) => (1 - outExpo(prog(t, 0.3 + d, 1.3 + d))) * 760;
  const driftT = -9 * Math.max(0, t - one - 3.2);
  const driftB = 7 * Math.max(0, t - one - 3.2);
  for (let i = 0; i < TOP.n; i++) {
    const s = one + 0.12 + i * 0.19;
    const fin = i === TOP.n - 1 ? 86 : 70;
    const a = fin * in3(prog(t, s, s + 0.42)) + damped(t, s + 0.42, 2.2, 3, 7);
    const px = TOP.x0 + i * TOP.sp + TOP.w / 2 + enter(i * 0.03) + driftT;
    o.push(pivot('04', px, TOP.base, TOP.w, TOP.h, a, 'r', C.rust, {mv: mvg(t, s, s + 0.6) || t < 1.6}));
  }
  for (let i = 0; i < BOT.n; i++) {
    const s = one + 0.12;
    const a = i === 1 ? 22 * out3(prog(t, s, s + 0.5)) + damped(t, s + 0.5, 2.6, 2.4, 4) : 0;
    const px = BOT.x0 + i * BOT.sp + BOT.w / 2 + enter(0.15 + i * 0.03) + driftB;
    o.push(pivot('04', px, BOT.base, BOT.w, BOT.h, a, 'r', C.blue, {mv: mvg(t, s, s + 1.4) || t < 1.8}));
  }
  const lo = out3(prog(t, 0.9, 1.4));
  o.push(rect('04', 1480 + driftT, TOP.base + 3, 760, 4, C.neutral, {layer: -2, o: lo}));
  o.push(rect('04', 1480 + driftB, BOT.base + 3, 760, 4, C.neutral, {layer: -2, o: lo}));
  o.push(label('04', '余白がない', 1430 + driftT, TOP.base + 50, 36, C.rust, {o: lo}));
  o.push(label('04', 'バッファ', 1430 + driftB, BOT.base + 50, 36, C.blue, {o: lo}));
}

// ---- 05: 大きな夢が退き、着地へ向かう列 ----
export const T05 = {
  enemy: vt('05', '敵では'),
  dream: vt('05', '夢が'),
  can: vt('05', 'できることと'),
  cant: vt('05', 'できないこと'),
  land: vt('05', '着地'),
  talk: vt('05', '夢を語る'),
  bad: vt('05', '悪くない'),
  sales: vt('05', '売上'),
  real: vt('05', '現実'),
  hope: vt('05', '思っていた'),
  good: vt('05', '優秀'),
  three: vt('05', '三つも'),
  four: vt('05', '四つも'),
  luck: vt('05', '運が'),
  next: vt('05', '次も'),
};
function cut05(t: number, o: Prim[]) {
  const {dream, land, talk, real, hope, three, four, next} = T05;
  // 夢: 奥から手前へ大きく出る → 着地で右上へ退いて小さく → 語ると大きく、重く沈む → 現実で戻る
  if (t > dream - 0.2) {
    const kIn = outExpo(prog(t, dream - 0.1, dream + 0.8));
    const kBack = inOut(prog(t, land - 0.2, land + 0.6));
    const kTalk = inOut(prog(t, talk, talk + 0.8));
    const kReal = inOut(prog(t, real, real + 0.7));
    const s = lerp(lerp(lerp(0.3, 1, kIn), 0.24, kBack), 0.42, kTalk * (1 - kReal)) + 0.02 * (1 - kBack) * Math.max(0, t - dream);
    // 現実で戻る先は、退いた位置より少し内側（寄りのカメラで画面の端へ出ないように）
    const bx = lerp(1700, 1600, kReal);
    const by = lerp(200, 360, kReal);
    const x = lerp(lerp(1400, bx, kBack), 1560, kTalk * (1 - kReal));
    const y = lerp(lerp(520, by, kBack), 560, kTalk * (1 - kReal)) + 40 * kTalk * (1 - kReal) * prog(t, talk + 0.8, real);
    o.push(label('05', '夢', x, y, 420, C.rust, {s, weight: 900, o: clamp(kIn * 3), fig: true, mv: (kIn > 0 && kIn < 1) || (kBack > 0 && kBack < 1) || (kTalk > 0 && kTalk < 1) || (kReal > 0 && kReal < 1)}));
  }
  // 着地へ向かう列（左へ流れ続ける）。最後の一つは「思っていた通り」で青になる
  if (t > land - 0.1) {
    const flow = -16 * Math.max(0, t - land);
    for (let i = 0; i < 5; i++) {
      const k = outBack(prog(t, land + i * 0.07, land + 0.45 + i * 0.07));
      const blue = i === 4 ? inOut(prog(t, hope, hope + 0.5)) : 0;
      o.push(bar('05', 1180 + i * 110 + flow, 900, 64 * k, 64 * k + 0.01, mix(C.neutral, C.blue, blue), {s: 1 + 0.18 * pulse(t, hope + 0.2, 5) * (i === 4 ? 1 : 0), mv: k < 1}));
    }
    o.push(rect('05', 1400 + flow, 903, 700, 4, C.neutral, {layer: -2}));
  }
  // 三つも四つも抱えた積み上げ（揺れるが、倒しきらない）
  if (t > three - 0.1) {
    const offs = [0, 14, -10, 18];
    for (let i = 0; i < 4; i++) {
      const s0 = i < 3 ? three + i * 0.14 : four;
      const k = outBack(prog(t, s0, s0 + 0.4));
      if (k <= 0) continue;
      const sw = (1.2 + 2.6 * prog(t, next, next + 1.2)) * wobble(t, 11, 1.4) * (i + 1) * 0.9;
      o.push(bar('05', 1640 + offs[i] + sw * 4, 760 - i * 74, 92, 70 * k + 0.01, C.rust, {rz: sw, mv: k < 1}));
    }
    o.push(rect('05', 1660, 763, 220, 4, C.neutral, {layer: -2}));
  }
}

// ---- 06: 3 本の高い棒 → 同じ高さの単打 → 3 と 7 では困る → 単打のあとで一つ持ち上がる ----
export const T06 = {
  three: vt('06', 'さんわりで'),
  pm: vt('06', 'でもピーエム'),
  nine: vt('06', 'きゅうかいか'),
  single: vt('06', 'たんだ'),
  big: vt('06', 'さんかいの'),
  fail: vt('06', 'ななかい'),
  bad: vt('06', '困る'),
  order: vt('06', '順番が'),
  rev: vt('06', '逆なんです'),
};
const BAR6 = {n: 10, x0: 470, sp: 125, w: 84, base: 900};
function cut06(t: number, o: Prim[]) {
  const {three, nine, big, order} = T06;
  const home = order + 1.5;
  for (let i = 0; i < BAR6.n; i++) {
    const tall = i < 3;
    const d = i * 0.05;
    const hk: K[] = [
      [0.3 + d, 0.01], [0.75 + d, 60, outBack],
      [three + d, 60], [three + 0.5 + d, tall ? 340 : 46, outBack],
      [nine + d, tall ? 340 : 46], [nine + 0.55 + d, 170, outBack],
      [big + d, 170], [big + 0.5 + d, tall ? 340 : 46, outBack],
      [order + d, tall ? 340 : 46], [order + 0.5 + d, i === 9 ? 46 : 170, outBack],
      [home, i === 9 ? 46 : 170], [home + 0.55, i === 9 ? 360 : 170, outBack],
    ];
    const ck: K[] = [
      [three + d, 0], [three + 0.4 + d, tall ? 1 : 0],
      [nine + d, tall ? 1 : 0], [nine + 0.4 + d, 2],
      [big + d, 2], [big + 0.4 + d, tall ? 1 : 0],
      [order + d, tall ? 1 : 0], [order + 0.4 + d, i === 9 ? 0 : 2],
      [home, i === 9 ? 0 : 2], [home + 0.4, i === 9 ? 1 : 2],
    ];
    const h = Math.max(0.01, kv(t, hk));
    const c = kv(t, ck);
    const fill = c <= 1 ? mix(C.neutral, C.rust, c) : mix(C.rust, C.blue, c - 1);
    const moving = [three, nine, big, order].some((a) => mvg(t, a, a + 1.0)) || mvg(t, home, home + 0.6) || t < 1.4;
    o.push(bar('06', BAR6.x0 + i * BAR6.sp, BAR6.base, BAR6.w, h, fill, {mv: moving}));
  }
  o.push(rect('06', 1033, BAR6.base + 3, 1300 * out3(prog(t, 0.2, 1.0)), 4, C.neutral, {layer: -2}));
}

// ---- 07: 一本の帯が、二つの面に割れる（全部受けると、また丸い帯に戻る） ----
export const T07 = {
  easy: vt('07', '楽に'),
  rev: vt('07', '実際は'),
  all: vt('07', '全部受け'),
  round: vt('07', '丸く'),
  but: vt('07', 'けれど'),
  view: vt('07', '見通しが'),
  hol: vt('07', '休日に'),
  hard: vt('07', '言いにくい'),
  hate: vt('07', '嫌われる'),
  pay: vt('07', '報酬'),
  kata: vt('07', '型に'),
  sei: vt('07', '正解は'),
  trust: vt('07', '信頼'),
  awa: vt('07', '合わない'),
  done: vt('07', 'やり切り'),
};
export function split07(t: number) {
  const {rev, all, view} = T07;
  return inOut(prog(t, rev - 0.05, rev + 0.6)) * (1 - inOut(prog(t, all + 0.2, all + 0.9))) + inOut(prog(t, view + 0.3, view + 1.0));
}
function panels(cut: string, t: number, k: number, o: Prim[], base = 900) {
  const hb = 320 + 110 * Math.sin(0.95 * t);
  const hr = 380 + 120 * Math.sin(0.95 * t + 2.1);
  const defs = [
    {bx: 1185, px: 1300, h: hb, c: C.blue, lab: 'お客さん側'},
    {bx: 1635, px: 1580, h: hr, c: C.rust, lab: 'メンバー側'},
  ];
  for (const d of defs) {
    const w = lerp(450, 220, k);
    const h = lerp(56, d.h, k);
    o.push(bar(cut, lerp(d.bx, d.px, k), base, w, h, mix(C.neutral, d.c, k), {rad: lerp(28, 10, k), mv: k > 0.02 && k < 0.98}));
    if (k > 0.6) o.push(label(cut, d.lab, d.px, base + 42, 32, C.gray, {o: prog(k, 0.6, 1)}));
  }
}
function cut07(t: number, o: Prim[]) {
  const k = clamp(split07(t));
  const pop = out3(prog(t, 0.3, 0.9));
  if (pop <= 0) return;
  panels('07', t, k, o);
  void pop;
}

// ---- 08: 誰のリスクか → 見通しの方（二つの面は、低い一つの青へ着地する） ----
export const T08 = {
  who: vt('08', '誰のリスク'),
  whom: vt('08', '誰に背負'),
  think: vt('08', '考えて'),
  pm: vt('08', 'ピーエムが'),
  not: vt('08', '頑張りでは'),
  view: vt('08', '見通しの方'),
};
function cut08(t: number, o: Prim[]) {
  const {whom, view} = T08;
  const land = inOut(prog(t, view - 0.2, view + 0.6));
  if (land < 1) {
    const lean = 7 * inOut(prog(t, whom, whom + 0.8)) * (1 - land);
    const hb = lerp(320 + 110 * Math.sin(0.95 * (t + 30)), 110, land);
    const hr = lerp(380 + 120 * Math.sin(0.95 * (t + 30) + 2.1), 110, land);
    o.push(bar('08', lerp(1300, 1480, land), 900, lerp(220, 300, land), hb, C.blue, {o: 1, mv: land > 0}));
    o.push(pivot('08', lerp(1470, 1330, land), 900, lerp(220, 300, land), hr, -lean, 'l', C.rust, {o: 1 - land, mv: land > 0 || mvg(t, whom, whom + 0.8)}));
  } else {
    o.push(bar('08', 1480, 900, 300, 110, C.blue, {s: 1 + 0.06 * pulse(t, view + 0.6, 4)}));
  }
  o.push(rect('08', 1480, 903, 640, 4, C.neutral, {layer: -2}));
}

const FNS: [string, (t: number, o: Prim[]) => void][] = [
  ['01', cut01], ['02', cut02], ['03', cut03], ['04', cut04], ['05', cut05], ['06', cut06], ['07', cut07], ['08', cut08],
];

export function prims(T: number): Prim[] {
  const out: Prim[] = [];
  for (const [id, fn] of FNS) {
    const t = T - at(id, 0);
    if (t > -0.45 && t < D[id] + 0.45) fn(t, out);
  }
  return out;
}
