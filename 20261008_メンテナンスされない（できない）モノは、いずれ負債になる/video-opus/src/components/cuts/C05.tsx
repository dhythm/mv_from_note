// カット5: 「AIで作れるなら保守費は無駄」という声。作ること自体は素晴らしい挑戦（肯定）。
// 部品が四方から飛来して業務ツールが組み上がる→手入れの前提を落とすと、流れに置いていかれて使えなくなる。
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {cut, ease, pE, pS, prog, rnd, rndS, smooth} from '../../lib/anim';
import {CamKeys, stage} from '../../lib/rig';
import {pointsMaterial} from '../../lib/shaders';
import {KText} from '../KText';
import {Stage} from '../Stage';
import {ToolDevice} from '../props';

const c = cut(5);
export const cam5: CamKeys = {
  dist: [[c.start + 0.35, 15], [pS(5, 'self'), 12], [pS(5, 'great'), 10], [pS(5, 'but'), 13], [pS(5, 'broke'), 14.5], [c.end - 0.05, 13]],
  az: [[c.start + 0.35, -22], [pS(5, 'self'), 16], [pS(5, 'great'), -42], [pS(5, 'but'), -10], [pS(5, 'broke'), 22], [c.end - 0.05, -6]],
  el: [[c.start + 0.35, 10], [pS(5, 'great'), 15], [pS(5, 'broke'), 6], [c.end - 0.05, 9]],
  roll: [[c.start + 0.35, 4], [pS(5, 'self'), -6], [pS(5, 'great'), 8], [pS(5, 'but'), -3], [pS(5, 'broke'), 5], [c.end - 0.05, 0]],
  tx: [[c.start + 0.35, 0]],
  ty: [[c.start + 0.35, 1.3]],
  fov: [[c.start + 0.35, 40], [pS(5, 'great'), 47], [pS(5, 'broke'), 40], [c.end - 0.05, 38]],
};
export const hits5 = [pS(5, 'great') + 0.05, pS(5, 'broke') + 0.05];

// 完成の火花
const Sparks: React.FC<{k: number}> = ({k}) => {
  const n = 260;
  const {geo, mat, dir} = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    const col = new Float32Array(n * 3);
    const al = new Float32Array(n);
    const ps = new Float32Array(n);
    const dir = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const cc = new THREE.Color(rnd(i, 1) > 0.5 ? '#ffd36b' : '#7ff0ff');
      col.set([cc.r, cc.g, cc.b], i * 3);
      ps[i] = 0.6 + rnd(i, 2) * 1.4;
      const v = new THREE.Vector3(rndS(i, 3), rndS(i, 4), rndS(i, 5)).normalize().multiplyScalar(3 + rnd(i, 6) * 6);
      dir.set([v.x, v.y, v.z], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(al, 1));
    geo.setAttribute('psize', new THREE.BufferAttribute(ps, 1));
    return {geo, mat: pointsMaterial(0.14), dir};
  }, []);
  if (k <= 0 || k >= 1) return null;
  const p = geo.attributes.position.array as Float32Array;
  const a = geo.attributes.alpha.array as Float32Array;
  const e = ease.out(k);
  for (let i = 0; i < n; i++) {
    p[i * 3] = dir[i * 3] * e;
    p[i * 3 + 1] = dir[i * 3 + 1] * e - 2.5 * k * k;
    p[i * 3 + 2] = dir[i * 3 + 2] * e;
    a[i] = 1 - k;
  }
  geo.attributes.position.needsUpdate = true;
  geo.attributes.alpha.needsUpdate = true;
  return <points geometry={geo} material={mat} frustumCulled={false} />;
};

export const C05: React.FC<{t: number}> = ({t}) => {
  const s = stage(t, 5);
  if (!s.on) return null;
  const a0 = pS(5, 'self') - 0.1;
  const parts = [0, 1, 2, 3, 4, 5].map((i) => ease.outBack(prog(t, a0 + i * 0.32, a0 + i * 0.32 + 0.65)));
  // 組み上がる前は宙に漂う
  const scatter = 9 + 1.5 * Math.sin(t * 0.8);
  // 手入れの前提を落とすと、流れから置いていかれる（奥・後ろへ）
  const lag = ease.in(prog(t, pS(5, 'keep') + 0.2, pE(5, 'broke') + 1.2));
  const off = t > pS(5, 'broke') + 0.15;
  const glitch = off ? 0 : smooth(prog(t, pS(5, 'keep') + 1.0, pS(5, 'broke'))) * (Math.sin(t * 37) > 0.3 ? 1 : 0);
  const dim = off && Math.sin(t * 29) > 0.6 && t < pS(5, 'broke') + 0.7;
  const bob = 0.25 * Math.sin(t * 2.1);
  const spinY = (1 - smooth(prog(t, pS(5, 'great'), pS(5, 'great') + 0.8))) * 0.5 * Math.sin(t * 1.3) + (t > pS(5, 'great') ? 0.35 * Math.sin((t - pS(5, 'great')) * 1.6) : 0);
  return (
    <Stage x={s.x}>
      <group position={[-lag * 14, -0.2 + bob - lag * 0.8, -lag * 26]} rotation={[0.1 + lag * 0.4, spinY - lag * 0.8, lag * 0.25]}>
        <ToolDevice parts={parts} scatter={scatter} screen={off ? (dim ? 'on' : 'off') : 'on'} glitch={glitch} seed={Math.floor(t * 12)} scale={1.15} />
        <Sparks k={prog(t, pS(5, 'great') - 0.05, pS(5, 'great') + 1.3)} />
      </group>
      <KText text="AIで作れるなら、" t={t} at={[c.voice - 0.05, pS(5, 'voice') + 0.1]} size={0.9} pos={[0, 3.9, 0]} enter="fly" exit="scatter" face color="#cfe3ea" seed={51} />
      <KText text="「保守費は、無駄」" t={t} at={[pS(5, 'waste') - 0.05, pS(5, 'self') - 0.3]} size={1.35} pos={[0, 2.5, 0.5]} enter="slam" exit="scatter" face seed={52} />
      <KText text="そんな声もある" t={t} at={[pS(5, 'voice') - 0.05, pS(5, 'self') - 0.2]} size={0.65} pos={[0, 1.2, 1.2]} enter="rise" exit="blow" face color="#9fb8c2" seed={53} />
      <KText text="作るのは、" t={t} at={[pS(5, 'self') - 0.05, pS(5, 'but') - 0.1]} size={0.95} pos={[0, 3.9, 0]} enter="twist" exit="scatter" face seed={54} />
      <KText text="素晴らしい挑戦" t={t} at={[pS(5, 'great') - 0.1, pS(5, 'but') - 0.05]} size={1.45} pos={[0, 2.6, 0.8]} enter="swing" exit="zoom" face color="#7ff0ff" seed={55} stagger={0.05} />
      <KText text="でも、作ったあとの手入れ" t={t} at={[pS(5, 'but') - 0.05, pS(5, 'broke') - 0.05]} size={0.95} pos={[0, 3.4, 0]} enter="fly" exit="blow" face seed={56} />
      <KText text="すぐに、使えなくなる" t={t} at={[pS(5, 'broke') - 0.05, pS(5, 'premise') - 0.1]} size={1.2} pos={[0, 1.8, 0.6]} enter="drop" exit="fall" face color="#ff6a4d" seed={57} />
      <KText text="その前提を、見落とさない" t={t} at={[pS(5, 'premise') - 0.05, c.end - 0.3]} size={1.0} pos={[0, 2.2, 0.6]} enter="rise" exit="blow" face seed={58} />
    </Stage>
  );
};
