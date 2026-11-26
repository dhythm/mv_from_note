// 図の設計図。各カットの札・塊・列・輪を、カットの画面 px（1920×1080 の枠）で並べる。
// 時刻 T から決まる純関数。three.js の描画（world.tsx）、札の面の文字と検査用の矩形（type.tsx）が同じ並びを使う。
import {C, E_WHIP, clamp, hashR, in3, inOut, lerp, mix, out3, outBack, prog} from './kit';
import {pulse} from './lib/anim';
import {D, at, vt} from './timeline';

export type Prim = {
  k: 'card' | 'rect' | 'ring' | 'label';
  cut: string;
  /** 中心（カットの枠の px） */
  x: number;
  y: number;
  w: number;
  h: number;
  rz?: number; // 度
  ry?: number; // ラジアン（札の裏返し）
  s?: number;
  o?: number;
  z?: number; // 奥行き（世界単位。負が奥）
  layer?: number; // 重なりの順
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
  /** 輪の開き（度） */
  gap?: number;
  /** 面ごと DOM で描く札（色の札。ぼかしを札とその文字だけに掛けられる） */
  dom?: boolean;
  /** DOM の札のぼかし（px） */
  blur?: number;
  /** 文字との重なり検査の対象にするか（既定 true） */
  fig?: boolean;
  /** 移動中（検査では移動中の報告に分ける） */
  mv?: boolean;
  /** 動画インサートの上にも出す（既定は、動画が覆うあいだ退く） */
  over?: boolean;
};

const CARD = {fill: C.card, edge: C.cardEdge, ew: 3, rad: 14, shadow: 1};
const mvg = (t: number, a: number, b: number) => t > a - 0.02 && t < b + 0.02;
const card = (cut: string, p: Partial<Prim> & {x: number; y: number; w: number; h: number}): Prim => ({k: 'card', cut, ...CARD, ...p});
const rect = (cut: string, x0: number, y0: number, w: number, h: number, color: string, p: Partial<Prim> = {}): Prim => ({k: 'rect', cut, x: x0 + w / 2, y: y0 + h / 2, w, h, fill: color, ...p});
// 奥の面（z<0）に置いたとき、基準のカメラで画面の (x,y)・大きさ (w,h) に見える位置へ直す
const far = (p: Prim, z: number): Prim => {
  const f = (16 - z) / 16;
  return {...p, x: 960 + (p.x - 960) * f, y: 540 + (p.y - 540) * f, w: p.w * f, h: p.h * f, rad: (p.rad ?? 0) * f, ew: (p.ew ?? 0) * f, z};
};
// 色の札（文の部品）。白い字
const word = (cut: string, p: Partial<Prim> & {x: number; y: number; fill: string; text: string}): Prim => ({
  k: 'card', cut, w: 340, h: 200, edge: p.fill, ew: 0, rad: 18, shadow: 1, size: 84, color: C.white, dom: true, ...p,
});

// ---- 01: 揃った二列。片方だけが前へ出る ----
export const T01 = {
  clipEnd: vt('01', '実際は') - 0.25,
  see: vt('01', '能力の差'),
  act: vt('01', '主体的'),
  pas: vt('01', '受動的'),
  diff: vt('01', '待つか'),
};
function cut01(t: number, o: Prim[]) {
  const {clipEnd, act, pas} = T01;
  if (t < clipEnd - 0.1) return;
  const ys = [400, 520, 640, 760];
  for (let i = 0; i < 4; i++) {
    const t0 = clipEnd + 0.05 + i * 0.06;
    const pop = outBack(prog(t, t0, t0 + 0.38));
    // 左の列: 声の「主体的に動くか」で前へ出て大きくなり、読むあいだも少しずつ進む
    const a0 = act + (3 - i) * 0.09;
    const k = out3(prog(t, a0, a0 + 0.6));
    const drift = Math.max(0, t - act);
    o.push(card('01', {
      x: lerp(1180, 1150, k), y: ys[i] - k * (60 + (3 - i) * 26) - drift * 6, w: 300, h: 84,
      s: pop * lerp(1, 1.32, k), edge: mix(C.cardEdge, C.ink, k), ew: lerp(3, 5, k),
      mv: mvg(t, t0, t0 + 0.38) || mvg(t, a0, a0 + 0.6),
    }));
    // 右の列: 高さを変えず、灰になって待つ
    const g = inOut(prog(t, pas, pas + 0.5));
    o.push(card('01', {
      x: 1570, y: ys[i], w: 300, h: 84, s: pop * lerp(1, 0.86, g),
      fill: mix(C.card, C.wait, g), edge: mix(C.cardEdge, C.wait, g), shadow: 1 - 0.7 * g,
      mv: mvg(t, t0, t0 + 0.38) || mvg(t, pas, pas + 0.5),
    }));
  }
}

// ---- 02: まだ文になっていない三枚の札 ----
export const T02 = {
  not: vt('02', 'そこまで'),
  bad: vt('02', '教えてもらうこと自体') - 0.15,
  bad2: vt('02', '悪いわけ'),
  who: vt('02', '教えてくれる'),
  can: vt('02', 'できて'),
  thanks: vt('02', 'その感謝'),
  use: vt('02', '自分にどう') - 0.2,
  learn: vt('02', '学ぶ'),
  wear: vt('02', '身につける'),
  lean: vt('02', 'に寄せた'),
};
const SENT = [C.blue, C.orange, C.green];
function cut02(t: number, o: Prim[]) {
  const {learn} = T02;
  const tint = D['02'] - 1.5;
  for (let i = 0; i < 3; i++) {
    const t0 = 0.6 + i * 0.1;
    if (t < t0) continue;
    const pop = outBack(prog(t, t0, t0 + 0.36));
    const k = inOut(prog(t, learn + 0.5 + i * 0.08, learn + 1.2 + i * 0.08));
    const c = inOut(prog(t, tint + i * 0.12, tint + 0.4 + i * 0.12));
    o.push(card('02', {
      x: lerp(1290 + i * 215, 1250 + i * 235, k), y: lerp(930, 640, k) + 5 * Math.sin(t * 0.9 + i * 1.7), w: 190, h: 90,
      s: pop * lerp(1, 1.18, k), rz: 2.2 * Math.sin(t * 0.6 + i * 2.1) * (1 - k),
      fill: mix(C.card, SENT[i], c), edge: mix(C.cardEdge, SENT[i], c),
      mv: mvg(t, t0, t0 + 0.36) || mvg(t, learn + 0.5, learn + 1.4),
    }));
  }
}

// ---- 03: 先生が／私に／教える → 私が／学ぶ ----
const V3 = {
  say: vt('03', '先生が'),
  me: vt('03', '私に'),
  teach: vt('03', '教える'),
  sw: vt('03', '私が'),
  learn: vt('03', '学ぶ'),
};
export const T03 = {
  ...V3,
  pas: vt('03', '受動態'),
  act: vt('03', '能動態'),
  much: vt('03', 'かなり'),
  /** 2 秒のドリーインの終わり＝組み替わる瞬間 */
  flip: V3.sw - 0.05,
  /** 述語の面が替わる */
  verb: Math.max(V3.learn - 0.1, V3.sw + 0.25),
};
function cut03(t: number, o: Prim[]) {
  const {say, me, teach, flip, verb} = T03;
  const k = E_WHIP(prog(t, flip, flip + 0.5));
  const moving = mvg(t, flip, flip + 0.55);
  const pop = (i: number) => outBack(prog(t, 0.28 + i * 0.08, 0.66 + i * 0.08));
  const bump = (t0: number) => 1 + 0.09 * pulse(t, t0, 5);
  const settle = Math.max(0, t - flip - 0.5);
  // 先生が（主語だった札）: 左上へ退き、0.5 秒でこの札とその文字だけがぼける
  o.push(word('03', {
    x: lerp(560, 290, k), y: lerp(560, 215, k), fill: C.blue, text: '先生が',
    s: pop(0) * bump(say) * lerp(1, 0.6, k), o: lerp(1, 0.9, k), blur: 10 * inOut(prog(t, flip, flip + 0.5)),
    mv: moving || t < 0.8, layer: 0,
  }));
  // 私に → 私が: 文頭へ滑り、札が橙から青へ裏返る
  const mk = inOut(prog(t, flip + 0.05, flip + 0.45));
  o.push(word('03', {
    x: lerp(960, 600, k), y: lerp(560, 540, k), fill: C.orange, text: '私に',
    s: pop(1) * bump(me) * lerp(1, 1.5, k) * (1 + 0.006 * settle), ry: Math.PI * mk,
    back: {fill: C.blue, edge: C.blue, text: '私が', color: C.white},
    mv: moving || t < 0.9, layer: 2,
  }));
  // 教える → 学ぶ: 緑の面がまとめて替わる
  const vk = inOut(prog(t, verb, verb + 0.4));
  o.push(word('03', {
    x: lerp(1360, 1180, k), y: lerp(560, 540, k), fill: C.green, text: '教える',
    s: pop(2) * bump(teach) * lerp(1, 1.5, k) * (1 + 0.006 * settle), ry: Math.PI * vk,
    back: {fill: C.green, edge: C.green, text: '学ぶ', color: C.white},
    mv: moving || mvg(t, verb, verb + 0.4) || t < 1.0, layer: 1,
  }));
}

// ---- 04: 山が、手前（使う）と奥（使わない）に割れる ----
export const T04 = {
  cook: vt('04', '自分で調理'),
  all: vt('04', '全部'),
  clipEnd: vt('04', '使うのか') - 0.2,
  use: vt('04', '使うのか'),
  not: vt('04', '使わない'),
  judge: vt('04', '自分で判断'),
};
function cut04(t: number, o: Prim[]) {
  const {clipEnd, use, not} = T04;
  if (t < clipEnd - 0.1) return;
  const pile = (i: number) => ({x: 1330 + hashR(i * 3 + 1, -60, 60), y: 620 + hashR(i * 3 + 2, -70, 70), rz: hashR(i * 3 + 3, -16, 16)});
  const pop = (i: number) => outBack(prog(t, clipEnd + i * 0.04, clipEnd + 0.34 + i * 0.04));
  // 手前の三枚（使う）。手前ほど速い
  for (let i = 0; i < 3; i++) {
    const p = pile(i);
    const t0 = use + 0.05 + i * 0.1;
    const k = out3(prog(t, t0, t0 + 0.5));
    const dt = Math.max(0, t - t0 - 0.5);
    o.push(card('04', {
      x: lerp(p.x, 340, k) + dt * 5, y: lerp(p.y, 690 + i * 108, k), w: 440, h: 86, rz: p.rz * (1 - k),
      s: pop(i) * lerp(0.62, 1, k) * (1 + 0.006 * dt), edge: mix(C.cardEdge, C.ink, k), ew: lerp(3, 5, k), layer: 5 + i,
      mv: mvg(t, clipEnd, clipEnd + 0.5) || mvg(t, t0, t0 + 0.5),
    }));
  }
  // 奥の二枚（使わない）。遅く、灰になって退く
  for (let i = 0; i < 2; i++) {
    const p = pile(i + 3);
    const t0 = not + 0.1 + i * 0.16;
    const k = inOut(prog(t, t0, t0 + 0.9));
    const dt = Math.max(0, t - t0 - 0.9);
    o.push(far(card('04', {
      x: lerp(p.x, 1470, k) + dt * 3, y: lerp(p.y, 500 + i * 100, k), w: 440, h: 86, rz: p.rz * (1 - k),
      s: pop(i + 3) * lerp(0.62, 0.66, k), fill: mix(C.card, C.wait, k), edge: mix(C.cardEdge, C.wait, k), shadow: 1 - 0.7 * k, layer: i,
      mv: mvg(t, clipEnd, clipEnd + 0.5) || mvg(t, t0, t0 + 0.9),
    }), -5 * k));
  }
}

// ---- 05: 短い基礎の塊と、高い列（一節だけ橙） ----
export const T05 = {
  first: vt('05', '初心者'),
  ok: vt('05', 'いいです'),
  but: vt('05', 'ただ'),
  level: vt('05', 'レベル'),
  low: vt('05', '低い'),
  base: vt('05', '基礎'),
  esc: vt('05', 'そこを') - 0.2,
  pro: vt('05', 'プロには'),
  stuck: vt('05', '詰まった') - 0.1,
  part: vt('05', '一部分'),
  diff: vt('05', 'この違い'),
  big: vt('05', 'かなり大きい'),
};
function cut05(t: number, o: Prim[]) {
  const {first, level, esc, pro, part} = T05;
  // 短い青の塊（教えてもらえる基礎）
  if (t > first) {
    const k = out3(prog(t, level, level + 0.6));
    const seed = outBack(prog(t, first, first + 0.4));
    const m = inOut(prog(t, esc, esc + 0.7));
    const w = lerp(lerp(110, 640, k), 250, m);
    o.push(card('05', {
      x: lerp(96 + lerp(110, 640, k) / 2, 1175, m), y: lerp(850, 950, m), w, h: lerp(150, 92, m), s: seed,
      fill: C.blue, edge: C.blue, ew: 0, rad: 12, mv: mvg(t, first, first + 0.4) || mvg(t, level, level + 0.6) || mvg(t, esc, esc + 0.7),
    }));
  }
  // 高い列（自分で学ぶ側の道のり）。下から一節ずつ伸びる
  const g0 = Math.max(esc + 0.4, pro - 1.1);
  for (let i = 0; i < 6; i++) {
    const t0 = g0 + i * 0.22;
    if (t < t0) continue;
    const k = outBack(prog(t, t0, t0 + 0.34));
    const c = i === 2 ? inOut(prog(t, part, part + 0.35)) : 0;
    const rise = 3 * Math.max(0, t - pro);
    o.push(card('05', {
      x: 1520 - (i === 2 ? 44 * out3(prog(t, T05.big, T05.big + 0.4)) : 0), y: 950 - i * 106 + 46 * (1 - k) - rise, w: 320, h: 92, o: clamp(prog(t, t0, t0 + 0.12)),
      s: 1 + 0.10 * c * pulse(t, part, 4) + 0.04 * c,
      fill: mix(C.card, C.orange, c), edge: mix(C.cardEdge, C.orange, c), layer: i === 2 ? 9 : i,
      mv: mvg(t, t0, t0 + 0.34) || (i === 2 && (mvg(t, part, part + 0.5) || mvg(t, T05.big, T05.big + 0.4))),
    }));
  }
}

// ---- 06: 教えてくれる側の札が、画面の外へ出ていく ----
export const T06 = {
  none: vt('06', '誰も'),
  must: vt('06', '出していか'),
  self: vt('06', '自分で学'),
  only: vt('06', '学ぶだけ'),
  out: vt('06', 'アウトプット'),
  taught: vt('06', '教えられて') - 0.15,
  cant: vt('06', 'できません'),
  then: vt('06', 'では'),
  money: vt('06', 'お金は'),
  never: vt('06', '絶対'),
};
function cut06(t: number, o: Prim[]) {
  const {none} = T06;
  const defs = [
    {x: 1470, y: 660, fill: C.blue, rz: -3},
    {x: 1650, y: 560, fill: C.green, rz: 2},
    {x: 1730, y: 790, fill: C.orange, rz: -1.5},
  ];
  defs.forEach((d, i) => {
    const t0 = 0.3 + i * 0.09;
    if (t < t0) return;
    const pop = outBack(prog(t, t0, t0 + 0.38));
    const a = none + i * 0.38;
    let x = d.x;
    let mv = mvg(t, t0, t0 + 0.38);
    if (i < 2) {
      x += 900 * in3(prog(t, a, a + 0.6));
      mv = mv || mvg(t, a, a + 0.6);
    } else {
      // 最後の一枚は、右端でまだ出ていく途中のまま
      const endK = in3(prog(t, D['06'] - 0.6, D['06'] - 0.1));
      x += 150 * out3(prog(t, a, a + 0.9)) + 5 * Math.max(0, t - a - 0.9) + 500 * endK;
      mv = mv || mvg(t, a, a + 0.9) || endK > 0;
    }
    if (x > 2200) return;
    o.push(card('06', {x, y: d.y + 4 * Math.sin(t * 0.8 + i), w: 300, h: 190, rz: d.rz + 0.4 * Math.max(0, t - a), s: pop, fill: d.fill, edge: d.fill, ew: 0, rad: 18, layer: i, mv}));
  });
}

// ---- 07: 開いた輪が、回り続ける ----
export const T07 = {
  ever: vt('07', '永遠'),
  keep0: vt('07', '学び続けています'),
  clipEnd: vt('07', '完成している人など') - 0.2,
  done: vt('07', '完成している人など'),
  none: vt('07', 'いません'),
  even: vt('07', '完成していなくても') - 0.1,
  keep: vt('07', '学び続けている人'),
  eat: vt('07', 'めし'),
  work: vt('07', '仕事'),
};
function cut07(t: number, o: Prim[]) {
  const {clipEnd, eat} = T07;
  if (t < clipEnd) return;
  const pop = outBack(prog(t, clipEnd + 0.05, clipEnd + 0.5));
  o.push({
    k: 'ring', cut: '07', x: 1500, y: 560, w: 470, h: 26, gap: 62, fill: C.ink,
    rz: -40 - 62 * (t - clipEnd), s: pop * (1 + 0.05 * pulse(t, eat, 3)), o: clamp(prog(t, clipEnd + 0.05, clipEnd + 0.2)),
    mv: mvg(t, clipEnd, clipEnd + 0.5),
  });
}

// ---- 08: 私が／学ぶ。学ぶ側に回り、景色が変わる ----
export const T08 = {
  grow: vt('08', '絶対'),
  nobi: vt('08', '伸び'),
  stop: vt('08', '自分があゆみ'),
  end: vt('08', '終わり'),
  side: vt('08', '学ぶ側') - 0.15,
  turn: vt('08', '回った'),
  all: vt('08', 'そこに'),
  grad: vt('08', '「教えて') - 0.1,
  from: vt('08', 'を卒業'),
  view: vt('08', '景色'),
  change: vt('08', '変わり'),
};
function cut08(t: number, o: Prim[]) {
  const {side, all, grad, change} = T08;
  // 景色が変わる: 淡い青の面が、左から机を塗り替える
  if (t > change - 0.05) {
    const k = out3(prog(t, change, change + 0.9));
    o.push(rect('08', -1500, -1000, 5200 * k, 3100, C.blueTint, {o: 0.9, fig: false, layer: -9, mv: k < 1}));
  }
  // 03 の結果の二枚。声の「学ぶ側に回ったかどうか」で、下から上へ回り込む
  const outK = in3(prog(t, grad, grad + 0.4));
  if (t > 0.3 && outK < 1) {
    const k = inOut(prog(t, side, side + 1.7));
    const defs = [
      {dx: -128, fill: C.blue, text: '私が'},
      {dx: 128, fill: C.green, text: '学ぶ'},
    ];
    defs.forEach((d, i) => {
      const pop = outBack(prog(t, 0.32 + i * 0.1, 0.72 + i * 0.1));
      o.push(word('08', {
        x: 1590 + d.dx - 150 * Math.sin(Math.PI * k), y: lerp(900, 250, k) - 380 * outK + 4 * Math.sin(t * 0.9 + i),
        w: 236, h: 132, size: 66, fill: d.fill, text: d.text, rz: -8 * Math.sin(Math.PI * k) * (i === 0 ? 1 : -1),
        s: pop * (1 + 0.12 * pulse(t, all, 5)), o: 1 - outK,
        mv: (k > 0 && k < 1) || outK > 0 || t < 0.9, layer: i,
      }));
    });
  }
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
