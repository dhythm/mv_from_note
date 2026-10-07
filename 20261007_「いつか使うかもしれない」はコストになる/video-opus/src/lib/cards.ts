// カード群の配置を時刻から直接計算する。
// 雪崩れ込み → 圧縮（小節ごとの段）→ 塊 → 隙間が開く → 棚へ整列（捨てるカードは外へ）→ 列の旋回 → 削除で余白
import {ACC, DEG, clamp, ease, lerp, prog, rnd, wobble, beatEnv} from './anim';

export const CARD_COUNT = 140;
export const SHELF_COLS = 10; // 中央の列（本の場所）を空けて左右5列ずつ
export const SHELF_ROWS = 3;
export const ROW_Y = [2.25, 0, -2.25];
export const SHELF_W = 1.5;
export const SHELF_H = 1.05;
export const CENTER_HALF = 1.65; // 中央の空き（本と隙間）の半幅
export const COL_STEP = 1.72;

export function colX(c: number): number {
  // c: 0..9 → 左5列, 右5列
  const side = c < 5 ? -1 : 1;
  const k = c < 5 ? 4 - c : c - 5;
  return side * (CENTER_HALF + SHELF_W / 2 + 0.12 + k * COL_STEP);
}

export type CardDef = {
  i: number;
  w: number;
  h: number;
  variant: number;
  shade: number;
  pile: [number, number, number, number]; // x,y,z,rz
  start: [number, number, number];
  spin: [number, number, number];
  arrive: number;
  kept: boolean;
  row: number;
  col: number;
  deleted: boolean; // 棚に残ったあと、見直しで削除される
  deleteAt: number;
  discardAt: number;
};

function quant(t: number, step = 0.125) {
  return Math.round(t / step) * step;
}

function buildCards(): CardDef[] {
  const defs: CardDef[] = [];
  for (let i = 0; i < CARD_COUNT; i++) {
    const portrait = rnd(i, 1) < 0.2;
    const w0 = rnd(i, 2, 1.35, 2.05);
    const h0 = w0 * rnd(i, 3, 0.62, 0.76);
    const [w, h] = portrait ? [h0, w0] : [w0, h0];
    // 雪崩れの順番: 外側から内側へ埋まる傾向＋ばらつき
    const order = i / CARD_COUNT;
    const ang = rnd(i, 4, 0, Math.PI * 2);
    const radial = clamp(1 - order * 0.85 + rnd(i, 5, -0.15, 0.15), 0.05, 1);
    const x = Math.cos(ang) * radial * 8.2 + rnd(i, 6, -1.2, 1.2);
    const y = Math.sin(ang) * radial * 4.9 + rnd(i, 7, -0.8, 0.8);
    const z = 0.04 + i * 0.012;
    const rz = rnd(i, 8, -26, 26) * DEG;
    // 出発点: 外周の外。最初の14枚は画面の縁から覗く
    const peek = i < 14;
    const sr = peek ? 1.0 : rnd(i, 9, 1.7, 2.3);
    const sx = peek ? Math.sign(Math.cos(ang) || 1) * rnd(i, 10, 9.3, 10.2) : Math.cos(ang) * 10 * sr;
    const sy = peek ? Math.sin(ang) * 5.2 : Math.sin(ang) * 6.5 * sr;
    const arrive = peek ? quant(1.25 + i * 0.09) : quant(2.4 + 6.9 * Math.pow((i - 14) / (CARD_COUNT - 14), 0.85) + rnd(i, 11, -0.2, 0.2));
    defs.push({
      i, w, h,
      variant: Math.floor(rnd(i, 12, 0, 6)),
      shade: Math.floor(rnd(i, 13, 0, 4)),
      pile: [x, y, z, rz],
      start: [sx, sy, peek ? z : z + rnd(i, 14, 2, 7)],
      spin: [rnd(i, 15, -80, 80) * DEG, rnd(i, 16, -80, 80) * DEG, rnd(i, 17, -200, 200) * DEG],
      arrive,
      kept: false, row: -1, col: -1, deleted: false, deleteAt: 0,
      discardAt: 0,
    });
  }
  // 棚に残す30枚: 擬似乱数順の上位。塊でのx順に列を、y順に行を割り当てて交差を減らす
  const keptIdx = [...defs].sort((a, b) => rnd(a.i, 20) - rnd(b.i, 20)).slice(0, SHELF_COLS * SHELF_ROWS);
  keptIdx.sort((a, b) => a.pile[0] - b.pile[0]);
  for (let c = 0; c < SHELF_COLS; c++) {
    const col = keptIdx.slice(c * SHELF_ROWS, (c + 1) * SHELF_ROWS).sort((a, b) => b.pile[1] - a.pile[1]);
    col.forEach((d, r) => {
      d.kept = true;
      d.col = c;
      d.row = r;
    });
  }
  // 見直しで削除する棚のカード（各行から数枚。本の隣は残す）
  const del: [number, number][] = [[0, 1], [0, 8], [1, 0], [1, 7], [2, 3], [2, 9], [0, 4], [2, 6]];
  del.forEach(([r, c], k) => {
    const d = defs.find((x) => x.kept && x.row === r && x.col === c);
    if (d) {
      d.deleted = true;
      d.deleteAt = ACC.deleteHit + k * 0.22;
    }
  });
  // 捨てるカード: 中心から外へ、波状に
  defs.filter((d) => !d.kept).forEach((d) => {
    const r = Math.hypot(d.pile[0], d.pile[1]);
    d.discardAt = ACC.shelfHit - 0.15 + clamp(r / 9) * 1.4 + rnd(d.i, 21, 0, 0.35);
  });
  return defs;
}

export const CARDS = buildCards();

export type CardPose = {
  x: number; y: number; z: number;
  rx: number; ry: number; rz: number;
  w: number; h: number;
  visible: boolean;
  lit: number; // 走査光の当たり（0..1）
};

// 圧縮の進み（10s開始＋各小節頭の段）
export function compressAmount(t: number): number {
  const steps = [10, ...ACC.compressSteps];
  let c = 0;
  for (const s of steps) c += ease.backOut(prog(t, s, s + 0.42)) / steps.length;
  return c;
}

// 隙間の開き
export function gapAmount(t: number): number {
  return 1.3 * ease.backOut(prog(t, ACC.gapHit, ACC.gapHit + 0.7)) + 1.0 * ease.inOut(prog(t, 35, 44));
}

// 棚の列の旋回（カット6〜7）
export function rowAngle(r: number, t: number): number {
  const on = ease.inOut(prog(t, 53.6, 55.2)) * (1 - ease.inOut(prog(t, 68, 73)));
  const a = [1, -1, 1][r] * 24 * Math.sin(((t - 54) / 6) * Math.PI + r * 0.9);
  return a * on * DEG;
}
export function rowSlide(r: number, t: number): number {
  const on = ease.inOut(prog(t, 54, 56)) * (1 - ease.inOut(prog(t, 66, 71)));
  return [0.7, -0.4, 0.7][r] * Math.sin(((t - 54) / 4) * Math.PI) * on;
}

// RAG の走査光の位置（届かずに止まる）
export function beamX(t: number): number {
  if (t < 54.6) return -14;
  return lerp(-13, 3.2, ease.out(prog(t, 54.6, 57.6)));
}
export function beamAlpha(t: number): number {
  const on = ease.out(prog(t, 54.6, 55.0));
  const off = 1 - ease.inOut(prog(t, 58.4, 60.6));
  // 58.2〜「それでも」で明滅して止まる
  const flicker = t > 58.2 && t < 60.6 ? 0.75 + 0.25 * Math.sin(t * 38) : 1;
  return on * off * flicker;
}

export function cardPose(d: CardDef, t: number): CardPose {
  const [px, py, pz, prz] = d.pile;
  let x: number, y: number, z: number, rx = 0, ry = 0, rz: number;
  let w = d.w;
  let h = d.h;

  // --- 1 雪崩れ込み
  const k = ease.outQuint(prog(t, d.arrive - 0.55, d.arrive));
  const spinK = 1 - ease.expoOut(prog(t, d.arrive - 0.55, d.arrive + 0.1));
  x = lerp(d.start[0], px, k);
  y = lerp(d.start[1], py, k);
  z = lerp(d.start[2], pz, k);
  rx = d.spin[0] * spinK;
  ry = d.spin[1] * spinK;
  rz = prz + d.spin[2] * spinK;
  // 着地の反動（小さな跳ね）
  const land = t > d.arrive ? Math.exp(-(t - d.arrive) * 7) * Math.sin((t - d.arrive) * 22) : 0;
  z += land * 0.25;

  // --- 2 圧縮（段ごとに押し込む）＋拍で息苦しく脈打つ
  const c = compressAmount(t);
  const pulse = 1 - 0.035 * beatEnv(t, 8) * (t > 10 && t < 21.5 ? 1 : 0);
  x *= lerp(1, 0.5, c) * pulse;
  y *= lerp(1, 0.55, c) * pulse;
  z = lerp(z, pz * 0.75 + 0.02, c);
  rz = lerp(rz, prz * 0.45, c);

  // --- 3 塊へ（21.2〜22.4 のホイップで固まる）
  const b = ease.expoOut(prog(t, 21.2, 22.4));
  x = lerp(x, px * 0.43, b);
  y = lerp(y, py * 0.47, b);
  z = lerp(z, pz * 0.55, b);
  rz = lerp(rz, prz * 0.35, b);
  // 裏返し区間: 塊がハーフタイムの拍で呼吸
  if (t >= 22 && t < 34) {
    const br = 1 + 0.03 * beatEnv(t, 5);
    x *= br;
    y *= br;
  }

  // --- 4 隙間（中央ほど大きく押し出す、また閉じない）
  const g = gapAmount(t);
  if (g > 0) {
    const bx = px * 0.43;
    const side = bx >= 0 ? 1 : -1;
    x += side * g * (0.55 + 0.9 * Math.exp(-Math.abs(bx) / 2.0));
    y *= 1 + 0.1 * g;
    rz += side * g * 3 * DEG;
  }

  // --- 5 整列／捨てる
  if (d.kept) {
    const colDelay = Math.abs(colX(d.col)) * 0.07 + d.row * 0.06;
    const s0 = ACC.shelfHit + colDelay;
    const sk = ease.backOut(prog(t, s0, s0 + 0.85));
    const sxp = colX(d.col) + rowSlide(d.row, t);
    const syp = ROW_Y[d.row];
    // 列の旋回: 行の中心まわりに Y 回転
    const ang = rowAngle(d.row, t);
    const lx = sxp * Math.cos(ang);
    const lz = -sxp * Math.sin(ang);
    x = lerp(x, lx, sk);
    y = lerp(y, syp, sk);
    z = lerp(z, 0.35 + lz, sk);
    rz = lerp(rz, 0, sk);
    ry = lerp(ry, ang, sk);
    rx = lerp(rx, 0, sk);
    w = lerp(w, SHELF_W, sk);
    h = lerp(h, SHELF_H, sk);
    // 整列後も止めない: 拍で小さく浮き、行ごとに波打つ
    const settle = prog(t, s0 + 0.85, s0 + 1.5);
    z += settle * (0.06 * wobble(t, d.i, 3.1) + 0.12 * beatEnv(t, 7) * Math.sin(d.col * 0.9 + t * 3));
    // 見直しで削除
    if (d.deleted) {
      const q = ease.in(prog(t, d.deleteAt, d.deleteAt + 0.9));
      y += q * (ROW_Y[d.row] >= 0 ? 7 : -7);
      z += q * 6;
      rz += q * 120 * DEG * (d.col < 5 ? -1 : 1);
      rx += q * 70 * DEG;
      if (t > d.deleteAt + 0.9) return {x, y, z, rx, ry, rz, w, h, visible: false, lit: 0};
    }
  } else {
    const q = ease.in(prog(t, d.discardAt, d.discardAt + 1.0));
    if (q > 0) {
      const ang = Math.atan2(y, x || 0.001);
      x += Math.cos(ang) * q * 16;
      y += Math.sin(ang) * q * 10 - q * q * 6;
      z += q * rnd(d.i, 22, -2, 7);
      rz += q * rnd(d.i, 23, -300, 300) * DEG;
      rx += q * rnd(d.i, 24, -160, 160) * DEG;
    }
    if (t > d.discardAt + 1.0) return {x, y, z, rx, ry, rz, w, h, visible: false, lit: 0};
  }

  // 走査光: 通過したカードがしばらく灯る
  let lit = 0;
  if (d.kept && t > 54.6 && t < 61) {
    const bxp = beamX(t);
    lit = x < bxp ? clamp(1 - (bxp - x) / 9) * 0.9 + 0.1 : 0;
    lit *= beamAlpha(t);
  }
  return {x, y, z, rx, ry, rz, w, h, visible: t > d.arrive - 0.6 || d.i < 14, lit};
}
