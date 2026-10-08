// カット1: 何もしなければ、今のまま？ — 畑の上を滑り続ける。手入れが止まると草が外周から伸び、畑が荒れていく。
import React from 'react';
import {cut, pE, pS} from '../../lib/anim';
import {CamKeys, stage} from '../../lib/rig';
import {KText} from '../KText';
import {Stage} from '../Stage';

const c = cut(1);
export const cam1: CamKeys = {
  dist: [[0, 36], [pS(1, 'q'), 15, 'out'], [pS(1, 'field'), 17], [pE(1, 'run'), 12.5], [c.end - 0.05, 11.5]],
  az: [[0, -34], [pS(1, 'q'), -8, 'out'], [pS(1, 'field') + 0.6, 22], [c.end - 0.05, 34]],
  el: [[0, 42], [pS(1, 'q'), 9, 'out'], [pS(1, 'field') + 0.6, 4], [c.end - 0.05, 12]],
  roll: [[0, -12], [pS(1, 'q'), 3], [pS(1, 'field') + 0.6, -5], [c.end - 0.05, 7]],
  tx: [[0, 0]],
  ty: [[0, 1.0]],
  tz: [[0, 0]],
  fov: [[0, 50], [pS(1, 'q'), 36, 'out'], [c.end - 0.05, 40]],
};
export const hits1 = [pS(1, 'q') + 0.1];

export const C01: React.FC<{t: number}> = ({t}) => {
  const s = stage(t, 1);
  if (!s.on) return null;
  return (
    <Stage x={s.x}>
      <KText text="何もしなければ、" t={t} at={[c.voice, pS(1, 'field') - 0.1]} size={0.85} pos={[0, 2.9, 0]} enter="fly" exit="blow" face seed={2} />
      <KText text="今のまま？" t={t} at={[pS(1, 'q') - 0.05, pS(1, 'run') - 0.25]} size={2.3} pos={[0, 0.7, 0]} enter="slam" exit="fall" face stagger={0.06} seed={3} />
      <KText text="手入れをやめると" t={t} at={[pS(1, 'field') - 0.05, pS(1, 'run') + 0.2]} size={0.8} pos={[0, 3.0, 0.5]} enter="rise" exit="scatter" face seed={4} color="#f3ead2" />
      <KText text="止まらずに、" t={t} at={[pS(1, 'run') - 0.2, c.end - 0.4]} size={1.0} pos={[-1.2, 2.2, 1]} enter="twist" exit="blow" face seed={5} />
      <KText text="荒れていく" t={t} at={[pS(1, 'run') + 0.3, c.end - 0.3]} size={2.1} pos={[0.5, 0.2, 1]} enter="drop" exit="blow" face seed={6} color="#e3c77d" stagger={0.07} />
    </Stage>
  );
};
