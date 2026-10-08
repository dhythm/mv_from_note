// カット10: 手入れされた区画と荒れた区画が並ぶ畑の上を、視点が前進し続ける。結論は問いのまま着地する。
import React from 'react';
import {cut, pS} from '../../lib/anim';
import {CamKeys, stage} from '../../lib/rig';
import {KText} from '../KText';
import {Stage} from '../Stage';

const c = cut(10);
export const cam10: CamKeys = {
  dist: [[c.start + 0.4, 13], [pS(10, 'wild'), 12], [pS(10, 'pay'), 12], [pS(10, 'q'), 12.5], [c.end, 15]],
  az: [[c.start + 0.4, -66], [pS(10, 'wild'), -84], [pS(10, 'pay'), -72], [pS(10, 'q'), -80], [c.end, -68]],
  el: [[c.start + 0.4, 9], [pS(10, 'wild'), 5], [pS(10, 'pay'), 9], [pS(10, 'q'), 12], [c.end, 20]],
  roll: [[c.start + 0.4, 6], [pS(10, 'wild'), -5], [pS(10, 'pay'), 2], [pS(10, 'q'), -1.5], [c.end, 1]],
  tx: [[c.start + 0.4, 0]],
  ty: [[c.start + 0.4, 1.4], [pS(10, 'pay'), 1.6], [c.end, 1.9]],
  fov: [[c.start + 0.4, 46], [pS(10, 'wild'), 42], [pS(10, 'pay'), 40], [c.end, 38]],
};
export const hits10 = [pS(10, 'pay') + 0.05];

export const C10: React.FC<{t: number}> = ({t}) => {
  const s = stage(t, 10, 46, 0.7, 0.01);
  if (!s.on && t < c.start) return null;
  return (
    <Stage x={s.x}>
      <KText text="土地も、" t={t} at={[c.voice - 0.05, pS(10, 'wild') - 0.15]} size={1.0} pos={[0, 3.0, 0]} enter="drop" exit="blow" face seed={101} />
      <KText text="道具も、" t={t} at={[c.voice + 0.75, pS(10, 'wild') - 0.1]} size={1.0} pos={[0, 1.6, 0]} enter="spin" exit="blow" face seed={102} />
      <KText text="ソフトウェアも、" t={t} at={[c.voice + 1.5, pS(10, 'wild') - 0.05]} size={1.0} pos={[0, 0.2, 0]} enter="twist" exit="blow" face seed={103} />
      <KText text="手入れを怠れば、荒れていく" t={t} at={[pS(10, 'wild') - 0.05, pS(10, 'pay') - 0.2]} size={0.9} pos={[0, 1.6, 0]} enter="drop" exit="sink" face color="#e9d39a" seed={104} />
      <KText text="手入れに、正当な対価を払う。" t={t} at={[pS(10, 'pay') - 0.05, c.end + 5]} size={1.0} pos={[0, 2.2, 0]} enter="slam" exit="none" face stagger={0.05} seed={105} live={0.8} />
      <KText text={'それが、自分を守る\nいちばんの近道ではないか。'} t={t} at={[pS(10, 'q') - 0.05, c.end + 5]} size={0.7} pos={[0, 0.1, 0]} enter="rise" exit="none" face lineGap={1.3} seed={106} live={0.8} color="#fff4d6" />
    </Stage>
  );
};
