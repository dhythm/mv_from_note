// 「資産｜負債」の本（2枚のカードを背でつないだもの）。
// 閉じた状態は表紙の「資産」。表紙がめくれると、下の「資産」が残ったまま右に「負債」が開く＝両方が同時に見える。
import {ACC, DEG, clamp, ease, lerp, prog, wobble, beatEnv, damped} from './anim';

export const PAGE_W = 2.3;
export const PAGE_H = 3.1;

export type BookPose = {
  x: number; y: number; z: number;
  rx: number; ry: number; rz: number;
  scale: number;
  open: number; // 0 閉じ → 1 開き
  rightAngle: number; // 右ページの背まわりの回転
  leftAngle: number;
  glow: number;
  assetGlow: number;
};

export function bookPose(t: number): BookPose {
  // 21.2〜 塊の中から浮かび上がる
  const rise = ease.backOut(prog(t, 21.3, 22.6));
  let scale = rise;
  let x = 0;
  let y = lerp(-0.4, 1.35, rise);
  let z = lerp(0.4, 2.6, rise);
  let rz = lerp(-24, -3, rise) * DEG;
  let rx = -8 * DEG;
  let ry = 0;

  // 開き（26.5〜28.0）。開ききりは 28.0 のヒットに合わせる
  const open = ease.inOutBack(prog(t, ACC.flipStart, ACC.flipHit));
  const rightAngle = lerp(-180, -9, open) * DEG;
  const leftAngle = lerp(0, 9, open) * DEG;
  // 閉じているときは表紙の中心へ寄せる
  x += lerp(PAGE_W / 2, 0, clamp(open)) * scale;

  // 浮遊と揺れ（読む間も動かす）
  ry += (10 * wobble(t, 11, 6.2) + damped(t, ACC.flipHit, 14, 1.6, 2.5)) * DEG;
  rx += 4 * wobble(t, 12, 4.4) * DEG;
  y += 0.12 * wobble(t, 13, 3.3);
  scale *= 1 + 0.025 * beatEnv(t, 6);

  // 34〜37: 小さくなって隙間の中へ
  const into = ease.inOut(prog(t, ACC.gapHit, 37));
  scale = lerp(scale, 0.42, into);
  x = lerp(x, 0, into);
  y = lerp(y, -0.6, into);
  z = lerp(z, 1.0, into);
  rz = lerp(rz, 0, into);
  rx = lerp(rx, 0, into * 0.7);

  // 48〜50: 棚の中央へ
  const shelf = ease.backOut(prog(t, ACC.shelfHit + 0.2, ACC.shelfHit + 1.4));
  z = lerp(z, 0.5, shelf);
  y = lerp(y, 0, shelf);
  scale = lerp(scale, 0.64, shelf);

  // 72.5〜75.5: 結論「真の資産に」で棚から手前へ浮かぶ（負債の面も開いたまま）
  const lift = ease.inOut(prog(t, 72.5, 75.5));
  z = lerp(z, 3.4, lift);
  y = lerp(y, 0.35, lift);
  scale = lerp(scale, 1.05, lift);
  ry += lift * 14 * DEG;

  // 隙間の奥で光る（40〜48）→ 柔らかく残る → 結論で「資産」側が灯る
  const glow =
    ease.inOut(prog(t, 39.5, 45)) * (1 - 0.65 * ease.inOut(prog(t, 48.5, 51))) * (1 - ease.inOut(prog(t, 64, 67)));
  const assetGlow = ease.inOut(prog(t, 73.6, 76.2));
  return {x, y, z, rx, ry, rz, scale, open, rightAngle, leftAngle, glow, assetGlow};
}
