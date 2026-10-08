// カット2: 乗らない自転車は錆びつき、車はバッテリーが上がる。家電が壊れることも。
// 歯車とチェーンが回る→急停止し、歯先から錆びる。背景の街は流れ続ける。右へ振ると電池が尽き、電源記号にひび。
import React from 'react';
import {cut, ease, pE, pS, prog, smooth} from '../../lib/anim';
import {CamKeys, stage} from '../../lib/rig';
import {KText} from '../KText';
import {Stage} from '../Stage';
import {Battery, Chain, Gear, PowerIcon} from '../props';

const c = cut(2);
const R = 2.8;
const W0 = 4.2; // 回転の角速度
const TS = pS(2, 'rust') - 0.05; // 止まり始め
const TD = 0.9; // 止まるまで

export function gearAngle(t: number) {
  if (t < TS) return -W0 * t;
  const u = Math.min(t - TS, TD);
  return -W0 * (TS + u - (u * u) / (2 * TD));
}
export const cam2: CamKeys = {
  dist: [[c.start + 0.35, 10.5], [pS(2, 'rust'), 8.2], [pS(2, 'car'), 11.5], [pS(2, 'appl'), 10.5], [c.end - 0.05, 9]],
  az: [[c.start + 0.35, -38], [pS(2, 'rust'), -12], [pS(2, 'car') + 0.5, 20], [pS(2, 'appl') + 0.6, -16], [c.end - 0.05, 12]],
  el: [[c.start + 0.35, 9], [pS(2, 'rust'), 2], [pS(2, 'car') + 0.5, 7], [c.end - 0.05, 4]],
  roll: [[c.start + 0.35, 9], [pS(2, 'rust'), -4], [pS(2, 'car') + 0.5, 5], [pS(2, 'appl') + 0.6, -7], [c.end - 0.05, 3]],
  tx: [[c.start + 0.35, -2.6], [pS(2, 'car') - 0.2, -1.8], [pS(2, 'car') + 0.6, 4.8], [pS(2, 'appl') - 0.15, 5.6], [pS(2, 'appl') + 0.55, 10.8], [c.end - 0.05, 11.2]],
  ty: [[c.start + 0.35, 0.8], [pS(2, 'car') + 0.6, 0.6], [c.end - 0.05, 0.4]],
  fov: [[c.start + 0.35, 42], [pS(2, 'rust'), 36], [c.end - 0.05, 38]],
};
export const hits2 = [TS + TD, pS(2, 'broke') + 0.05];

export const C02: React.FC<{t: number}> = ({t}) => {
  const s = stage(t, 2);
  if (!s.on) return null;
  const ang = gearAngle(t);
  const rust = ease.inOut(prog(t, TS + 0.2, TS + 3.4)) * 0.98;
  const level = 1 - ease.inOut(prog(t, pS(2, 'car') + 0.3, pE(2, 'car') + 0.2)) * 0.96;
  const blink = level < 0.15 ? 0.5 + 0.5 * Math.cos(t * 18) : 1;
  const powOn = smooth(prog(t, pS(2, 'appl') + 0.5, pS(2, 'appl') + 0.75));
  const crackK = ease.expoOut(prog(t, pS(2, 'broke'), pS(2, 'broke') + 0.35));
  // ひびが入ると明滅して消える
  const flick = crackK > 0 ? Math.max(0, 1 - prog(t, pS(2, 'broke'), pS(2, 'broke') + 0.9)) * (0.5 + 0.5 * Math.sign(Math.sin(t * 47))) : 1;
  return (
    <Stage x={s.x}>
      <group position={[-2.6, 0.8, 0]}>
        <Gear angle={ang} rust={rust} R={R} />
        <Chain travel={-ang * R} rust={rust * 0.9} R={R * 0.93} />
      </group>
      <KText text="乗らない自転車" t={t} at={[c.voice, pS(2, 'car') - 0.3]} size={0.75} pos={[-2.6, 4.6, 0.5]} enter="fly" exit="blow" face seed={11} />
      <KText text="錆びつく" t={t} at={[pS(2, 'rust') + 0.15, pS(2, 'car') - 0.1]} size={1.7} pos={[-2.4, -0.4, 3.4]} enter="drop" exit="blow" color="#ff8a3a" stagger={0.07} face seed={12} />
      <Battery position={[5.0, 2.0, 0]} scale={1.3} level={level} opacity={smooth(prog(t, pS(2, 'car') - 0.4, pS(2, 'car'))) * blink} />
      <KText text="バッテリーが上がる" t={t} at={[pS(2, 'car') + 0.05, pS(2, 'appl') + 0.4]} size={0.72} pos={[5.0, 0.2, 1.0]} enter="rise" exit="blow" face seed={13} />
      <PowerIcon position={[11, 1.0 + 0.25 * Math.sin(t * 2.6), 0]} scale={1.1 * (1 + 0.12 * powOn * (1 - crackK) * Math.abs(Math.sin(t * 6.5)))} on={powOn * flick} crack={crackK} />
      <KText text="久しぶりの通電" t={t} at={[pS(2, 'appl') + 0.1, pS(2, 'broke') + 0.2]} size={0.7} pos={[11, 3.2, 0.6]} enter="fly" exit="scatter" face seed={14} />
      <KText text="壊れることも" t={t} at={[pS(2, 'broke') + 0.05, c.end - 0.3]} size={1.15} pos={[11, -1.5, 1.4]} enter="slam" exit="blow" color="#ff6a4d" face seed={15} />
    </Stage>
  );
};
