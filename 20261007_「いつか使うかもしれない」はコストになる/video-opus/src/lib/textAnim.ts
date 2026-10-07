// 語カードの動き（S16 歌詞が跳ねる の翻訳）。句の群れ全体も読む間に回り・寄り・流れる。
import {Dir, Phrase} from './copy';
import {DEG, beatEnv, clamp, damped, ease, lerp, prog, rnd, wobble} from './anim';

const DIRV: Record<Dir, [number, number, number]> = {
  left: [-8, 0, 0],
  right: [8, 0, 0],
  up: [0, 5.5, 0],
  down: [0, -5.5, 0],
  near: [0, 0, 7],
  far: [0, 0, -16],
};

export type TokenPose = {
  x: number; y: number; z: number;
  rx: number; ry: number; rz: number;
  sx: number; sy: number;
  opacity: number;
};

export function groupPose(p: Phrase, idx: number, t: number) {
  const u = prog(t, p.start, p.end);
  const sgn = idx % 2 ? -1 : 1;
  return {
    x: p.pos[0] + sgn * lerp(-0.35, 0.35, u),
    y: p.pos[1] + 0.25 * wobble(t, idx, 5.5),
    z: 0,
    ry: (sgn * lerp(-13, 13, ease.inOut(u)) + 2.5 * wobble(t, idx + 3, 3.7)) * DEG,
    rx: (4 * wobble(t, idx + 7, 4.9)) * DEG,
    rz: (sgn * lerp(3.5, -3.5, u) + 1.2 * wobble(t, idx + 9, 2.9)) * DEG,
    scale: lerp(0.93, 1.07, u) * (1 + 0.02 * beatEnv(t, 7)),
  };
}

export function tokenPose(p: Phrase, j: number, n: number, emphasized: boolean, t: number): TokenPose {
  const seed = p.start * 13 + j;
  const tin = p.start + j * 0.08;
  const kIn = prog(t, tin, tin + 0.55);
  const kPos = ease.outQuint(kIn);
  const kRot = ease.expoOut(kIn);
  const [ix, iy, iz] = DIRV[p.dirIn];
  let x = ix * (1 - kPos) * rnd(seed, 1, 0.7, 1.3);
  let y = iy * (1 - kPos) + (1 - kPos) * rnd(seed, 2, -1.2, 1.2);
  let z = iz * (1 - kPos);
  let rx = (1 - kRot) * rnd(seed, 3, -85, 85) * DEG;
  let ry = (1 - kRot) * rnd(seed, 4, -70, 70) * DEG;
  let rz = (1 - kRot) * rnd(seed, 5, -45, 45) * DEG;
  let s = lerp(0.15, 1, ease.backOut(kIn));

  // 着地後: 強調語は拡大回転で弾み、全語が読む間も漂う
  const landed = tin + 0.55;
  if (emphasized) {
    s *= 1 + damped(t, landed - 0.1, 0.22, 1.4, 4.5) + 0.07 * beatEnv(t, 7);
    rz += damped(t, landed - 0.1, 9, 1.1, 3.5) * DEG;
  } else {
    s *= 1 + 0.025 * beatEnv(t, 8);
  }
  y += 0.05 * wobble(t, seed, 2.3);
  rz += 1.4 * wobble(t, seed + 1, 3.1) * DEG;
  ry += 4 * wobble(t, seed + 2, 4.2) * DEG;

  let sx = s;
  let sy = s;
  if (p.squash && t < 21.6) {
    const b = beatEnv(t, 6);
    sx *= 1 - 0.16 * b;
    sy *= 1 + 0.07 * b;
  }

  // 退場: 次の句へ勢いを渡す
  let opacity = clamp(kIn * 3);
  if (!p.keep) {
    const tout = p.end - 0.5 + (j / Math.max(1, n - 1)) * 0.12;
    const kOut = ease.in(prog(t, tout, tout + 0.38));
    const [ox, oy, oz] = DIRV[p.dirOut];
    x += ox * kOut * rnd(seed, 6, 0.8, 1.4);
    y += oy * kOut + kOut * rnd(seed, 7, -1, 1);
    z += oz * kOut;
    rx += kOut * rnd(seed, 8, -90, 90) * DEG;
    rz += kOut * rnd(seed, 9, -60, 60) * DEG;
    opacity *= 1 - clamp((kOut - 0.55) / 0.45);
  }
  return {x, y, z, rx, ry, rz, sx, sy, opacity};
}
