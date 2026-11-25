// 図の設計図。各カットの札・棚・束・柱・線を、カットの画面 px（1920×1080 の枠）で並べる。
// 時刻 T から決まる純関数。three.js の描画（world.tsx）、札の面の文字と検査用の矩形（type.tsx）が同じ並びを使う。
import {C, E_WHIP, clamp, hashR, in3, inOut, lerp, out3, outBack, prog} from './kit';
import {D, at, vt} from './timeline';

export type Prim = {
  k: 'card' | 'rect' | 'tri' | 'label';
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
  /** 文字との重なり検査の対象にするか（既定 true） */
  fig?: boolean;
  /** 移動中（検査では移動中の報告に分ける） */
  mv?: boolean;
  /** 動画インサートの上にも出す（既定は、動画が覆うあいだ退く） */
  over?: boolean;
};

const CARD = {fill: C.card, edge: C.cardEdge, ew: 3, rad: 18, shadow: 1};
const RED_BACK = {fill: C.redTint, edge: C.red, color: C.red};
const mvg = (t: number, a: number, b: number) => t > a - 0.02 && t < b + 0.02;
const card = (cut: string, p: Partial<Prim> & {x: number; y: number; w: number; h: number}): Prim => ({k: 'card', cut, ...CARD, ...p});
const rect = (cut: string, x0: number, y0: number, w: number, h: number, color: string, p: Partial<Prim> = {}): Prim => ({k: 'rect', cut, x: x0 + w / 2, y: y0 + h / 2, w, h, fill: color, ...p});
// 奥の面（z<0）に置いたとき、基準のカメラで画面の (x,y)・大きさ (w,h) に見える位置へ直す
const far = (p: Prim, z: number): Prim => {
  const f = (16 - z) / 16;
  return {...p, x: 960 + (p.x - 960) * f, y: 540 + (p.y - 540) * f, w: p.w * f, h: p.h * f, rad: (p.rad ?? 0) * f, ew: (p.ew ?? 0) * f, z};
};

// ---- 01: その一言が札になり、相手の側へ滑る ----
function cut01(t: number, o: Prim[]) {
  const a = vt('01', 'と言った') - 0.1;
  const b = vt('01', '交渉');
  const c5 = vt('01', 'たいてい') - 0.1;
  if (t < a - 0.05) return;
  const pop = outBack(prog(t, a, a + 0.42));
  const k1 = out3(prog(t, b, b + 0.7));
  const k2 = inOut(prog(t, c5, c5 + 0.85));
  const yf = vt('01', '「やめた') + 1.0;
  const kf = inOut(prog(t, yf, yf + 0.5));
  o.push(card('01', {
    x: lerp(1540, 1570, k1) - 90 * k2 + 5 * Math.max(0, t - b),
    y: lerp(lerp(830, 600, k1), 320, k2),
    w: 520, h: 320, s: lerp(0.5, 1, pop),
    rz: lerp(-7, 3, k1) - 6 * k2 + 0.25 * Math.max(0, t - c5),
    text: '技術的には可能です', size: 50,
    // 声の「やめた方がいい」のあと、札が裏返って本当の意味を見せる
    ry: Math.PI * kf, back: {fill: C.card, edge: C.ink, text: 'やめた方がいい', color: C.ink, size: 58},
    mv: mvg(t, a, a + 0.42) || mvg(t, b, b + 0.7) || mvg(t, c5, c5 + 0.85) || mvg(t, yf, yf + 0.5),
  }));
}

// ---- 02: 棚と、欲しいものを指す印 ----
export const T02 = {
  u1: vt('02', 'それが欲しい'),
  e1: vt('02', '選ばれない') - 0.15,
  d1: vt('02', '判断を'),
  n1: vt('02', '選ばれうる'),
  n2: vt('02', 'なおさら'),
  e2: vt('02', 'だから') - 0.1,
  out: vt('02', '出しません'),
};
function cut02(t: number, o: Prim[]) {
  const {u1, e1, d1, n1, n2, e2, out} = T02;
  // 下の棚
  const drawL = out3(prog(t, 0.3, 0.9));
  o.push(rect('02', 1040, 815, 820 * drawL, 10, C.blue));
  const boxA = {x: 1150, y: 740, w: 150, h: 150};
  const boxB = {x: 1650, y: 730, w: 170, h: 170};
  const boxD = {x: 1400, y: 740, w: 150, h: 150};
  const box = (b: {x: number; y: number; w: number; h: number}, t0: number, p: Partial<Prim> = {}) =>
    card('02', {...b, fill: C.blueTint, edge: C.blue, ew: 4, rad: 10, shadow: 0, s: outBack(prog(t, t0, t0 + 0.35)), mv: mvg(t, t0, t0 + 0.35), ...p});
  if (t > 0.5) o.push(box(boxA, 0.5));
  if (t > 0.65) o.push(box(boxB, 0.65));
  // おとり: 選ばれない一つ（灰の輪郭）。選ばれうるなら、青く埋まる
  if (t > e1 + 0.55 && t < e2 + 0.4) {
    const kd = out3(prog(t, e1 + 0.55, e1 + 0.95));
    const fillK = inOut(prog(t, n1 + 0.1, n1 + 0.6));
    const outK = in3(prog(t, e2, e2 + 0.4));
    o.push(card('02', {
      ...boxD, y: boxD.y - 260 * (1 - kd) + 420 * outK, o: kd * (1 - outK), shadow: 0, rad: 10, ew: 4,
      fill: fillK > 0.5 ? C.blueTint : C.paper, edge: fillK > 0.5 ? C.blue : C.gray,
      mv: mvg(t, e1 + 0.55, e1 + 0.95) || t > e2,
    }));
  }
  // 上の棚（奥）と、手が届かない箱
  const upIn = out3(prog(t, 0.6, 1.2));
  const upAway = inOut(prog(t, e1, e1 + 0.5)) - inOut(prog(t, e2 + 0.05, e2 + 0.65));
  const upY = -620 * upAway;
  const pull = in3(prog(t, out, out + 0.5));
  const retract = inOut(prog(t, out + 0.2, out + 0.8));
  o.push(far(rect('02', 1260 + 600 * retract, 400 + upY, 600 * upIn * (1 - retract), 10, C.blue, {mv: upAway > 0.01 && upAway < 0.99}), -5));
  if (t > 1.1) {
    const drop = outBack(prog(t, 1.1, 1.55));
    o.push(far(card('02', {
      x: 1600 + 760 * pull, y: 285 + upY - 300 * (1 - drop), w: 230, h: 230, fill: C.card, edge: C.ink, ew: 5, rad: 12, shadow: 1,
      o: clamp(prog(t, 1.1, 1.2)), rz: 14 * pull,
      mv: mvg(t, 1.1, 1.55) || (upAway > 0.01 && upAway < 0.99) || t > out,
    }), -5));
  }
  // 欲しいものを指す印（▼）
  if (t > 0.9) {
    const PA = [1150, 595];
    const PB = [1650, 575];
    const PD = [1400, 595];
    const PU = [1600, 105];
    const moves: [number, number, number[], number[]][] = [
      [u1 + 0.25, u1 + 0.95, PA, PU],
      [e1, e1 + 0.5, PU, PA],
      [d1 + 0.05, d1 + 0.65, PA, PB],
      [n2, n2 + 0.5, PB, PD],
      [e2, e2 + 0.5, PD, PA],
    ];
    let p = PA;
    let arc = 0;
    let moving = false;
    for (const [a, b, from, to] of moves) {
      if (t >= a) {
        const k = inOut(prog(t, a, b));
        p = [lerp(from[0], to[0], k), lerp(from[1], to[1], k)];
        arc = Math.sin(Math.PI * k) * (Math.abs(to[1] - from[1]) > 200 ? 0 : 90);
        moving = t < b;
      }
    }
    const pop = outBack(prog(t, 0.9, 1.25));
    // 上の箱を指すあいだは、その箱と同じ奥の面に乗る
    const upK = inOut(prog(t, u1 + 0.25, u1 + 0.95)) - inOut(prog(t, e1, e1 + 0.5));
    const tri: Prim = {k: 'tri', cut: '02', x: p[0], y: p[1] - arc + upY * clamp(upK), w: 64, h: 52, fill: C.blue, s: pop, mv: moving || mvg(t, 0.9, 1.25), layer: 3};
    o.push(upK > 0.5 ? far(tri, -5 * clamp(upK)) : tri);
  }
}

// ---- 03: 札は相手の側で「やる前提」に裏返る ----
export const T03 = {
  r0: vt('03', 'お金と時間'),
  flip: vt('03', 'やる前提'),
  /** 03 の枠から、ホイップパンの先の枠までの距離（px） */
  shift: 1760,
};
function cut03(t: number, o: Prim[]) {
  const {r0, flip, shift} = T03;
  const kIn = out3(prog(t, 0.05, 0.6));
  const slide = inOut(prog(t, r0, flip));
  const kw = E_WHIP(prog(t, flip, flip + 0.4));
  o.push(card('03', {
    x: lerp(960, 1100, slide) + (shift + 400) * kw - 500 * (1 - kIn),
    y: 700 + 20 * kw,
    w: 760, h: 470, s: lerp(1, 0.72, kw) * (1 + 0.12 * Math.sin(Math.PI * kw)),
    rz: lerp(-2, 1.5, slide) + 2.5 * kw + 0.3 * Math.max(0, t - flip - 0.4),
    ry: Math.PI * kw,
    text: '技術的には可能です', size: 72,
    back: {...RED_BACK, text: 'やる前提', size: 124},
    rad: 24,
    mv: t < 0.6 || mvg(t, flip, flip + 0.4),
  }));
}

// ---- 04: 高すぎる束は崩れ、手元の厚さは「引き受ける」になる。札は選ぶ権利ごと渡る ----
export const T04 = {
  k0: vt('04', '出せません'),
  b0: vt('04', 'すうひゃく') - 0.15,
  take: vt('04', '引き受ける'),
  c0: vt('04', '断るため') - 0.15,
  right: vt('04', '選ぶ権利'),
  give: vt('04', '渡して'),
  d0: vt('04', 'だから') - 0.1,
  why: vt('04', 'なぜなら'),
};
function cut04(t: number, o: Prim[]) {
  const {k0, b0, take, c0, right, give, d0, why} = T04;
  const SH = 240;
  const baseX = 1500;
  // 高すぎる束（積むほど傾き、崩れる）
  if (t < b0 + 0.6) {
    const N = 56;
    const grow = prog(t, 0.6, k0 - 0.25);
    const n = Math.floor(N * grow * grow * (3 - 2 * grow));
    const lean = 2.2 * grow * grow * Math.sin(t * 5.2);
    const tau = t - k0;
    for (let i = 0; i < n; i++) {
      let x = baseX + hashR(i, -9, 9) + lean * i * 0.35;
      let y = 940 - i * 14;
      let rz = hashR(i + 50, -1.5, 1.5) + lean * 0.12 * (i / N) * 10;
      let op = 1;
      if (tau > 0) {
        const d = Math.max(0, tau - (N - i) * 0.006);
        x += hashR(i + 100, -620, 520) * d * (0.6 + i / N);
        y += hashR(i + 200, -520, -120) * d * (i / N) + 1500 * d * d;
        rz += hashR(i + 300, -260, 260) * d;
        op = 1 - prog(d, 0.55, 0.9);
      }
      if (op > 0.01) o.push(card('04', {x, y, w: SH, h: 12, rz, o: op, rad: 3, ew: 2.5, edge: '#9C9385', shadow: 0, fig: tau < 0, mv: tau > 0, layer: i * 0.02}));
    }
  }
  // 手元の厚さ（数百万円）。その金額で引き受けると、赤くなる
  if (t > b0 && t < c0 + 0.5) {
    const kr = inOut(prog(t, take, take + 0.4));
    const outK = in3(prog(t, c0, c0 + 0.45));
    for (let i = 0; i < 9; i++) {
      const k = outBack(prog(t, b0 + 0.25 + i * 0.07, b0 + 0.55 + i * 0.07));
      if (k <= 0) continue;
      o.push(card('04', {
        x: baseX + 60 + hashR(i + 7, -9, 9) + 900 * outK, y: 760 - i * 18 - 140 * (1 - k), w: 300, h: 16, rz: hashR(i + 60, -1.2, 1.2), o: clamp(k * 3), rad: 4, ew: 2.5, shadow: 0,
        fill: kr > 0.5 ? C.redTint : C.card, edge: kr > 0.5 ? C.red : '#9C9385', layer: i * 0.02,
        mv: k < 0.99 || outK > 0,
      }));
    }
    if (t > take + 0.1) o.push({k: 'label', cut: '04', x: baseX + 60 + 900 * outK, y: 822, w: 320, h: 70, text: 'やる前提', size: 54, color: C.red, o: clamp(prog(t, take + 0.1, take + 0.3)), fig: false});
  }
  // 選ぶ権利の札: 手元から相手の側へ
  if (t > c0 + 0.3 && t < d0 + 0.6) {
    const kIn = out3(prog(t, c0 + 0.3, c0 + 0.9));
    const kg = inOut(prog(t, right, give + 0.45));
    const kOut = in3(prog(t, d0, d0 + 0.5));
    o.push(card('04', {
      x: lerp(1180, 1560, kg) + 900 * kOut, y: lerp(lerp(1250, 800, kIn), 400, kg), w: 520, h: 320,
      rz: lerp(-9, 5, kg) + 12 * kOut, text: '選ぶ権利', size: 76,
      mv: kIn < 0.99 || (kg > 0.01 && kg < 0.99) || kOut > 0,
    }));
  }
  // 「なぜなら、」の先へ伸びる線（理由が続く）
  if (t > why + 0.35) {
    const k = out3(prog(t, why + 0.35, why + 1.3));
    o.push(rect('04', 1290, 742, 760 * k, 12, C.blue, {mv: k < 0.99, fig: false}));
  }
}

// ---- 05: 費用の札も相手の札になる。理由の札を先に出す ----
export const T05 = {
  same: vt('05', '同じ'),
  pay: vt('05', '払うから'),
  decide: vt('05', 'で決まり'),
  b0: vt('05', 'やるべきではないなら') - 0.15,
  no: vt('05', '出しません'),
  c0: vt('05', '先に') - 0.1,
  g0: vt('05', '個人的'),
  g1: vt('05', '載せません'),
  s0: vt('05', 'そのうえで') - 0.1,
  still: vt('05', 'それでも'),
  choose: vt('05', 'と選んで'),
};
function cut05(t: number, o: Prim[]) {
  const {decide, no, c0, g0, g1, s0} = T05;
  // 費用の札
  if (t < no + 0.7) {
    const kIn = out3(prog(t, 0.45, 1.3));
    const kf = inOut(prog(t, decide, decide + 0.45));
    const kOut = in3(prog(t, no, no + 0.55));
    o.push(card('05', {
      x: lerp(620, 1380, kIn) + 3 * Math.max(0, t - 1.3), y: lerp(1260, 560, kIn) + 800 * kOut, w: 560, h: 340,
      rz: lerp(-12, 3, kIn) - 8 * kOut, ry: Math.PI * kf, s: 1 + 0.1 * Math.sin(Math.PI * kf),
      text: 'お金がかかります', size: 56, back: {...RED_BACK, text: 'やる前提', size: 96},
      mv: kIn < 0.99 || (kf > 0.01 && kf < 0.99) || kOut > 0,
    }));
  }
  // 理由の二枚
  if (t > c0 + 0.4) {
    const ks = inOut(prog(t, s0, s0 + 0.9));
    const one = (i: number, text: string, x0: number, y0: number, x1: number, y1: number, r0: number, r1: number) => {
      const kIn = out3(prog(t, c0 + 0.5 + i * 0.55, c0 + 1.15 + i * 0.55));
      if (kIn <= 0) return;
      o.push(card('05', {
        x: lerp(lerp(x0 - 700, x0, kIn), x1, ks), y: lerp(lerp(y0 + 600, y0, kIn), y1, ks), w: 540, h: 290,
        rz: lerp(lerp(-16, r0, kIn), r1, ks), text, size: i === 0 ? 62 : 54, layer: i,
        mv: kIn < 0.99 || (ks > 0.01 && ks < 0.99),
      }));
    };
    one(0, '可能性を潰す', 1440, 500, 1610, 510, -3, 2);
    one(1, '負担が大きすぎる', 1360, 820, 1610, 815, 2, -2);
  }
  // 個人の好き嫌い: 載せない（来て、戻る）
  if (t > g0 + 0.15 && t < g1 + 0.8) {
    const kIn = out3(prog(t, g0 + 0.15, g0 + 0.8));
    const kOut = in3(prog(t, g1 + 0.1, g1 + 0.65));
    o.push(card('05', {
      x: lerp(180, 640, kIn) - 700 * kOut, y: lerp(1260, 870, kIn) + 420 * kOut, w: 360, h: 210, rz: lerp(-20, -6, kIn) - 14 * kOut,
      fill: '#EDEAE4', edge: C.gray, text: '好き嫌い', size: 48, color: C.gray, over: true,
      mv: kIn < 0.99 || kOut > 0,
    }));
  }
}

// ---- 06: 三つの材料。費用を積んでも、期間の印には届かない ----
export const T06 = {
  q0: vt('06', '品質、'),
  n0: vt('06', '納期、'),
  c0: vt('06', '費用です'),
  q: vt('06', '品質はほとんど'),
  n: vt('06', '納期にも'),
  m: vt('06', 'お金で何とか'),
  b0: vt('06', 'でも') - 0.15,
  month: vt('06', 'いっかげつ'),
  x3: vt('06', 'さんばい'),
  late: vt('06', '間に合わない'),
  c1: vt('06', '人を足す') - 0.12,
  more: vt('06', 'さらに遅れる'),
  d0: vt('06', 'お金で解決') - 0.12,
  hand: vt('06', 'それも'),
  e0: vt('06', 'できない段階') - 0.2,
  tell: vt('06', '何が足りない'),
  together: vt('06', '一緒に'),
};
const PILLAR_X = [1260, 1500, 1740];
const PILLAR_W = 170;
const BASE = 860;
export const MARK_X = 1500;
function cut06(t: number, o: Prim[]) {
  const {q0, n0, c0, q, n, m, b0, x3, c1, more, d0, e0, together} = T06;
  // 三本の柱（品質・納期・費用）
  const first = t < b0 + 0.6;
  const again = t > e0;
  if (first || again) {
    const names = ['品質', '納期', '費用'];
    const t0s = first ? [q0, n0, c0] : [e0 + 0.55, e0 + 0.67, e0 + 0.79];
    const down = first ? in3(prog(t, b0, b0 + 0.5)) : 0;
    const kt = inOut(prog(t, together, together + 0.7));
    for (let i = 0; i < 3; i++) {
      const up = outBack(prog(t, t0s[i], t0s[i] + 0.4));
      if (up <= 0) continue;
      let h = 300;
      let w = PILLAR_W;
      let fill = C.blueTint;
      let edge = C.blue;
      if (first) {
        // 品質は下げようとしても戻る。納期は延ばそうとしても戻る。費用だけが伸びる
        if (i === 0) h = 300 - 110 * Math.sin(Math.PI * prog(t, q + 0.2, q + 1.3)) * (1 - 0.5 * prog(t, q + 0.2, q + 1.3));
        if (i === 1) w = PILLAR_W + 70 * Math.sin(Math.PI * prog(t, n + 0.2, n + 1.3)) * (1 - 0.5 * prog(t, n + 0.2, n + 1.3));
        if (i === 2) {
          const g = out3(prog(t, m, m + 0.8));
          h = 300 + 330 * g + 12 * Math.max(0, t - m - 0.8);
          if (g > 0.3) {
            fill = C.ink;
            edge = C.ink;
          }
        }
      } else {
        h = [lerp(240, 200, kt), lerp(180, 240, kt), lerp(240, 200, kt)][i];
        if (i === 1 && kt > 0.5) {
          fill = C.blue;
          edge = C.blue;
        }
      }
      h *= up;
      o.push(card('06', {x: PILLAR_X[i], y: BASE - h / 2 + 700 * down, w, h, fill, edge, ew: 4, rad: 8, shadow: 0, mv: up < 0.99 || down > 0 || (first && t > q && t < m + 0.8) || (kt > 0.01 && kt < 0.99)}));
      o.push({k: 'label', cut: '06', x: PILLAR_X[i], y: BASE + 62 + 700 * down, w: 200, h: 80, text: names[i], size: 60, color: C.ink, o: clamp(prog(t, t0s[i] + 0.1, t0s[i] + 0.3)), fig: false, mv: down > 0});
    }
    o.push(rect('06', 1120, BASE, 760 * out3(prog(t, first ? 1.2 : e0 + 0.45, first ? 1.9 : e0 + 1.0)), 8, C.blue, {y: BASE + 4 + 700 * down}));
  }
  // 期間の線と印、進みの帯
  if (t > b0 + 0.25 && t < e0 + 0.6) {
    const outK = in3(prog(t, e0, e0 + 0.5));
    const dy = 600 * outK;
    const draw = out3(prog(t, b0 + 0.3, b0 + 1.0));
    o.push(rect('06', 160, 838 + dy, 1600 * draw, 6, C.blue, {mv: outK > 0}));
    const mk = outBack(prog(t, T06.month - 0.1, T06.month + 0.3));
    if (mk > 0) {
      o.push(rect('06', MARK_X - 5, 838 - 250 * mk + dy, 10, 250 * mk + 30, C.blue, {mv: outK > 0 || mk < 0.99, layer: 2}));
      o.push({k: 'label', cut: '06', x: MARK_X, y: 548 + dy, w: 300, h: 80, text: '1か月後', size: 60, color: C.blue, o: clamp(mk), fig: false});
    }
    // 進み: 1倍 → 3倍（列が増えるが、印の手前で止まる）→ 人を足す（列が増え、先頭は下がる）→ 早い段階なら届く
    const reset = inOut(prog(t, d0, d0 + 0.5));
    let L = lerp(160, 760, prog(t, b0 + 0.9, x3));
    L = lerp(L, 1240, out3(prog(t, x3, x3 + 2.1))) + 9 * clamp(t - x3 - 2.1, 0, 3);
    L = lerp(L, 1000, inOut(prog(t, more, more + 0.9)));
    L = lerp(L, 160, reset);
    const reach = prog(t, d0 + 0.6, T06.hand + 0.5);
    L = lerp(L, MARK_X - 5, reach * reach * (3 - 2 * reach));
    const lanesA = lerp(1, 3, out3(prog(t, x3, x3 + 0.45)));
    const lanesB = lerp(0, 4, out3(prog(t, c1 + 0.1, c1 + 0.9))) * (1 - reset);
    const lanes = lanesA + lanesB;
    const nL = Math.ceil(lanes - 0.001);
    const thick = lerp(44, 22, clamp(lanesB / 4));
    const gap = lerp(52, 30, clamp(lanesB / 4));
    for (let i = 0; i < nL; i++) {
      const k = clamp(lanes - i);
      const len = (L - 160) * k * (1 - 0.035 * ((i * 7) % 4) * clamp(lanesB));
      if (len < 4) continue;
      o.push(card('06', {x: 160 + len / 2, y: 800 - i * gap - thick / 2 + dy, w: len, h: thick, fill: C.ink, edge: C.ink, ew: 0, rad: thick / 2, shadow: 0, mv: outK > 0 || reset > 0.01 && reset < 0.99, layer: 1}));
    }
    // 届いた印
    const hit = outBack(prog(t, T06.hand + 0.5, T06.hand + 0.85));
    if (hit > 0 && outK < 1) o.push(card('06', {x: MARK_X, y: 560 + 76 + dy, w: 44 * hit, h: 44 * hit, rad: 22 * hit, fill: C.blue, edge: C.blue, ew: 0, shadow: 0, fig: false, layer: 3}));
  }
}

// ---- 07: 止まる札の流れ。引き受けられる札だけが残り、一枚が半分出る ----
export const T07 = {
  stop: vt('07', '無理です'),
  b0: vt('07', '断るなら') - 0.15,
  only: vt('07', '引き受けられる'),
  cards: vt('07', 'カードだけ'),
  c0: vt('07', '出したカード') - 0.1,
  sure: vt('07', '必ず'),
  real: vt('07', '本当に'),
  cut: vt('07', '切ります'),
};
function cut07(t: number, o: Prim[]) {
  const {stop, b0, only, c0, sure} = T07;
  // 右へ流れていた札が、「無理です」で止まる
  if (t < b0 + 0.7) {
    const travel = (tt: number) => (tt < stop ? tt : stop + 0.35 * (1 - Math.pow(1 - clamp((tt - stop) / 0.35), 2)) * 0.5);
    const drop = in3(prog(t, b0, b0 + 0.55));
    for (let i = 0; i < 6; i++) {
      const row = i % 2;
      const x = -260 + i * 330 + 420 * (travel(t) + 0.6);
      o.push(card('07', {x, y: 810 + row * 150 + 500 * drop, w: 290, h: 180, rz: hashR(i + 11, -4, 4) - 10 * drop, mv: t < stop + 0.4 || drop > 0, layer: i}));
    }
  }
  // 並べた七枚のうち、引き受けられない四枚は机の外へ。三枚が残る
  if (t > b0 + 0.25) {
    const keep = [1, 3, 5];
    const half = inOut(prog(t, sure, sure + 0.9));
    for (let i = 0; i < 7; i++) {
      const kIn = out3(prog(t, b0 + 0.3 + i * 0.06, b0 + 0.85 + i * 0.06));
      if (kIn <= 0) continue;
      const x0 = 240 + i * 240;
      const y0 = 860 + (i % 2 ? -22 : 18);
      const ki = keep.indexOf(i);
      if (ki < 0) {
        const kOut = in3(prog(t, only + 0.15 + i * 0.07, only + 0.75 + i * 0.07));
        if (kOut >= 1) continue;
        o.push(card('07', {x: x0 + hashR(i, -60, 60) * kOut, y: lerp(1300, y0, kIn) + 460 * kOut, w: 220, h: 140, rz: hashR(i + 3, -8, 8) + hashR(i + 5, -30, 30) * kOut, fill: '#EDEAE4', edge: C.gray, mv: kIn < 0.99 || kOut > 0, layer: i}));
      } else {
        const kg = inOut(prog(t, only + 0.7, only + 1.5));
        const tx = [1240, 1500, 1760][ki];
        const isHalf = ki === 1;
        o.push(card('07', {
          x: lerp(x0, tx, kg) + (isHalf ? 150 * half + 5 * Math.max(0, t - sure - 0.9) : 0),
          y: lerp(lerp(1300, y0, kIn), 880, kg) - (isHalf ? 235 * half + 3 * Math.max(0, t - sure - 0.9) : 0),
          w: 240, h: 160, rz: lerp(hashR(i + 3, -8, 8), [-3, 2, 4][ki], kg) + (isHalf ? 7 * half : 0),
          edge: isHalf && half > 0.5 ? C.blue : C.cardEdge, ew: isHalf && half > 0.5 ? 5 : 3,
          mv: kIn < 0.99 || (kg > 0.01 && kg < 0.99) || (isHalf && half > 0.01 && half < 0.99), layer: 10 + ki,
        }));
      }
    }
  }
  void c0;
}

// ---- 08: できなかった札は周りを巻き込む。言いそうな札は飲み込み、白い札が残る ----
export const T08 = {
  fail: vt('08', 'できなかった'),
  many: vt('08', 'よほど'),
  trouble: vt('08', '迷惑'),
  b0: vt('08', 'できないことは') - 0.15,
  b1: vt('08', 'できないと伝え'),
  agree: vt('08', '納得'),
  c0: vt('08', '言いそうに'),
  swallow: vt('08', 'いちど'),
  d0: vt('08', '本当に伝えたい'),
  maybe: vt('08', 'たぶん'),
};
function cut08(t: number, o: Prim[]) {
  const {fail, many, b0, c0, swallow, maybe} = T08;
  if (t < b0 + 0.7) {
    const sweep = in3(prog(t, b0, b0 + 0.55));
    const pop = outBack(prog(t, 0.35, 0.75));
    const kf = inOut(prog(t, fail, fail + 0.45));
    const fall = out3(prog(t, many, many + 0.5));
    o.push(card('08', {
      x: 1600 + 900 * sweep, y: 380 + 60 * fall, w: 440, h: 270, s: lerp(0.5, 1, pop) * (1 + 0.1 * Math.sin(Math.PI * kf)), rz: -3 + 9 * fall,
      ry: Math.PI * kf, text: 'できます', size: 70, back: {...RED_BACK, text: 'できなかった', size: 56},
      mv: pop < 0.99 || (kf > 0.01 && kf < 0.99) || (fall > 0.01 && fall < 0.99) || sweep > 0, layer: 20,
    }));
    // 周りの小さな札（巻き込まれる人たち）
    for (let i = 0; i < 9; i++) {
      const cx = 1440 + (i % 3) * 170;
      const cy = 670 + Math.floor(i / 3) * 125;
      const kIn = out3(prog(t, 0.5 + i * 0.05, 0.9 + i * 0.05));
      if (kIn <= 0) continue;
      const dist = Math.hypot(cx - 1600, cy - 440) / 520;
      const hit = out3(prog(t, many + 0.12 + dist * 0.55, many + 0.6 + dist * 0.55));
      o.push(card('08', {
        x: cx + (cx - 1560) * 0.12 * hit + hashR(i, -14, 14) * hit + 900 * sweep, y: cy + 34 * hit + 60 * (1 - kIn), w: 130, h: 84, o: kIn,
        rz: hashR(i + 9, -3, 3) + hashR(i + 20, -34, 34) * hit, fill: hit > 0.3 ? C.redTint : '#EDEAE4', edge: hit > 0.3 ? C.red : C.gray, rad: 10, ew: 2,
        mv: kIn < 0.99 || (hit > 0.01 && hit < 0.99) || sweep > 0, layer: i,
      }));
    }
  }
  // 言いそうになった札は、手前へ引いて飲み込む
  if (t > c0 - 0.1 && t < swallow + 1.0) {
    const kIn = out3(prog(t, c0, c0 + 0.6));
    const kOut = in3(prog(t, swallow + 0.1, swallow + 0.7));
    o.push(card('08', {x: 1500 + 40 * kIn, y: lerp(1300, 885, kIn) + 420 * kOut, w: 480, h: 300, rz: lerp(-10, -3, kIn) + 5 * kOut, text: '技術的には可能です', size: 46, mv: kIn < 0.99 || kOut > 0}));
  }
  // 別の言葉を書くための、白い札
  if (t > maybe + 0.5) {
    const kIn = out3(prog(t, maybe + 0.5, maybe + 1.3));
    // 声が終わったあと、札の縁が青くなる（これから書く言葉の場所）
    const ready = outBack(prog(t, maybe + 2.7, maybe + 3.1));
    o.push(card('08', {x: 1560, y: lerp(1300, 880, kIn) - 4 * Math.max(0, t - maybe - 1.3), w: 440, h: 270, s: 1 + 0.04 * ready, rz: lerp(8, 2, kIn) + 0.2 * Math.max(0, t - maybe - 1.3), edge: ready > 0.5 ? C.blue : C.cardEdge, ew: ready > 0.5 ? 6 : 3, mv: kIn < 0.99 || (ready > 0.01 && ready < 0.99)}));
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
