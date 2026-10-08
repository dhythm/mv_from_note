// カット7: 家も車もソフトも、買った瞬間から維持費。値札「購入」が弾けて、回り続けるメーターに変わる。
// OS更新の波はソフトの箱だけを押し流す（起動できなくなることも＝可能性）。「ずっと使える」は買い手の願望。
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {cut, ease, pS, prog, rnd, smooth} from '../../lib/anim';
import {CamKeys, stage} from '../../lib/rig';
import {waveMaterial} from '../../lib/shaders';
import {KText} from '../KText';
import {Stage} from '../Stage';
import {Car, House, Label, Meter, SoftBox} from '../props';

const c = cut(7);
const XS = [-5.6, 0, 5.6];
const BASE = -2.2;
const WAVE0 = pS(7, 'os') - 0.1;
const HIT = pS(7, 'fail') - 0.15;

export const cam7: CamKeys = {
  dist: [[c.start + 0.35, 18], [pS(7, 'upkeep'), 16.5], [pS(7, 'old'), 13], [pS(7, 'os'), 12.5], [pS(7, 'fail'), 12], [pS(7, 'wish0'), 17], [pS(7, 'wish'), 15.5], [pS(7, 'cost'), 17.5], [c.end - 0.05, 16]],
  az: [[c.start + 0.35, -16], [pS(7, 'upkeep'), 12], [pS(7, 'old'), 26], [pS(7, 'os'), 8], [pS(7, 'fail'), -16], [pS(7, 'wish0'), 0], [pS(7, 'wish'), -16], [pS(7, 'cost'), 14], [c.end - 0.05, -6]],
  el: [[c.start + 0.35, 12], [pS(7, 'os'), 6], [pS(7, 'wish0'), 14], [c.end - 0.05, 10]],
  roll: [[c.start + 0.35, -4], [pS(7, 'upkeep'), 4], [pS(7, 'os'), -5], [pS(7, 'fail'), 6], [pS(7, 'wish0'), -2], [pS(7, 'cost'), 4], [c.end - 0.05, 0]],
  tx: [[c.start + 0.35, 0], [pS(7, 'old') - 0.2, 0], [pS(7, 'old') + 0.6, 5.0], [pS(7, 'wish0') - 0.3, 5.0], [pS(7, 'wish0') + 0.5, 0]],
  ty: [[c.start + 0.35, 0.6]],
  fov: [[c.start + 0.35, 40]],
};
export const hits7 = [pS(7, 'buy') + 0.1, HIT];

export const C07: React.FC<{t: number}> = ({t}) => {
  const s = stage(t, 7);
  const wave = useMemo(() => waveMaterial(), []);
  if (!s.on) return null;
  const drops = XS.map((_, i) => ease.outBack(prog(t, c.start + 0.1 + i * 0.22, c.start + 0.75 + i * 0.22)));
  // 波: 右から来て、ソフトの箱で砕ける（家と車には届かない）
  const wk = prog(t, WAVE0, HIT + 0.9);
  const waveX = XS[2] + 9 - 9.5 * ease.inOut(wk);
  const waveOn = smooth(prog(t, WAVE0, WAVE0 + 0.4)) * (1 - smooth(prog(t, HIT + 0.4, HIT + 1.3)));
  wave.uniforms.uT.value = t;
  wave.uniforms.uAmp.value = 1.4 + 0.6 * ease.inOut(wk);
  wave.uniforms.uOpacity.value = waveOn;
  const hit = ease.outQuint(prog(t, HIT, HIT + 0.6));
  const cracked = t > HIT;
  const meterOn = smooth(prog(t, pS(7, 'upkeep') - 0.1, pS(7, 'upkeep') + 0.4));
  const spinRate = 2.2 + 3.5 * smooth(prog(t, pS(7, 'cost'), pS(7, 'cost') + 0.6));
  const osN = 14 + Math.min(3, Math.floor(Math.max(0, t - pS(7, 'os') + 0.2) / 0.45));
  return (
    <Stage x={s.x}>
      <House position={[XS[0], BASE + 5 * (1 - drops[0]), 0]} scale={1.05} rotation={[0, 0.35 + 0.08 * Math.sin(t), 0]} />
      <Car position={[XS[1], BASE + 5 * (1 - drops[1]), 0]} scale={1.05} rotation={[0, -0.4 + 0.08 * Math.sin(t * 1.2), 0]} wheel={t * 2} />
      <SoftBox position={[XS[2] - hit * 1.4, BASE + 5 * (1 - drops[2]) - hit * 0.5, -hit * 1.5]} scale={1.05} rotation={[hit * 0.25, -0.25, hit * -0.45]} cracked={cracked} />
      {/* 値札「購入」: 弾けて、メーター（維持費）に変わる */}
      {XS.map((x, i) => {
        const pop = ease.outBack(prog(t, pS(7, 'buy') + i * 0.3, pS(7, 'buy') + 0.45 + i * 0.3));
        const burst = prog(t, pS(7, 'upkeep') - 0.1 + i * 0.12, pS(7, 'upkeep') + 0.35 + i * 0.12);
        const tagOp = pop * (1 - burst);
        const spin = (t - pS(7, 'upkeep')) * spinRate + i * 1.3;
        const fail = i === 2 ? 1 - smooth(prog(t, HIT, HIT + 0.5)) : 1;
        return (
          <group key={i}>
            <Label text="購入" opt={{px: 100, weight: 900, color: '#3a1c00', bg: '#ffb347', radius: 0.25}} height={0.85 * (1 + burst * 1.2)} position={[x, BASE + 4.2 + Math.sin(t * 3 + i) * 0.1, 0.6]} rotation={[0, 0, 0.12 * Math.sin(t * 2 + i)]} opacity={tagOp} />
            <Meter position={[x, BASE + 4.3, 0.6]} scale={0.95 * (0.6 + 0.4 * meterOn)} needle={Math.PI * 1.5 - (((spin % (Math.PI * 1.5)) + Math.PI * 1.5) % (Math.PI * 1.5))} opacity={meterOn * fail} />
          </group>
        );
      })}
      {/* OS 更新の波 */}
      {waveOn > 0.001 ? (
        <mesh position={[waveX, BASE + 0.9, 0.9]} rotation={[0, 0, 0]} material={wave}>
          <planeGeometry args={[6.5, 3.6, 90, 30]} />
        </mesh>
      ) : null}
      <Label text={`OS ${osN}`} opt={{px: 110, weight: 900, color: '#bff3ff'}} height={0.9} position={[XS[2] + 3.4, BASE + 4.6, -1]} opacity={smooth(prog(t, pS(7, 'os') - 0.2, pS(7, 'os') + 0.2)) * (1 - smooth(prog(t, pS(7, 'wish0') - 0.4, pS(7, 'wish0'))))} avoidCenter />
      {/* 維持費のコイン */}
      {Array.from({length: 14}).map((_, i) => {
        const on = smooth(prog(t, pS(7, 'cost') - 0.2, pS(7, 'cost') + 0.3)) * (1 - smooth(prog(t, c.end - 0.4, c.end)));
        if (on <= 0.001) return null;
        const per = 1.3;
        const ph = (((t - pS(7, 'cost')) / per + rnd(i, 1)) % 1 + 1) % 1;
        const x = XS[i % 3] + (rnd(i, 2) - 0.5) * 1.6;
        return (
          <mesh key={i} position={[x, BASE + 7 - ph * 4.2, 0.6 + rnd(i, 3)]} rotation={[Math.PI / 2, t * 4 + i, 0]} scale={on}>
            <cylinderGeometry args={[0.28, 0.28, 0.07, 20]} />
            <meshStandardMaterial color="#ffcc55" metalness={0.8} roughness={0.25} emissive="#7a5200" emissiveIntensity={0.4} />
          </mesh>
        );
      })}
      <KText text="家も、車も、ソフトも" t={t} at={[c.voice - 0.05, pS(7, 'upkeep') - 0.1]} size={0.9} pos={[0, 5.6, 0]} enter="drop" exit="blow" face seed={71} />
      <KText text="買った瞬間から、維持費" t={t} at={[pS(7, 'upkeep') - 0.05, pS(7, 'old') - 0.1]} size={1.05} pos={[0, 5.6, 0]} enter="fly" exit="scatter" face seed={72} color="#ffd36b" />
      <KText text="買い切りの古いソフト" t={t} at={[pS(7, 'old') - 0.05, pS(7, 'fail') - 0.2]} size={0.8} pos={[XS[2], 5.0, 0]} enter="twist" exit="blow" face seed={73} />
      <KText text="OS更新で、起動できないことも" t={t} at={[pS(7, 'fail') - 0.1, pS(7, 'wish0') - 0.15]} size={0.85} pos={[XS[2], -3.4, 1.5]} enter="rise" exit="blow" face color="#ff8a6a" seed={74} />
      <KText text="「一度買えば、ずっと使える」" t={t} at={[pS(7, 'wish0') - 0.05, pS(7, 'wish') + 0.25]} size={0.9} pos={[0, 5.4, 0]} enter="rise" exit="scatter" face color="#bfe9ff" seed={75} />
      <KText text="は、買い手の願望" t={t} at={[pS(7, 'wish') - 0.05, pS(7, 'cost') - 0.1]} size={1.25} pos={[0, -3.4, 1.5]} enter="slam" exit="blow" face seed={76} />
      <KText text="手入れには、手間とお金" t={t} at={[pS(7, 'cost') - 0.05, c.end - 0.3]} size={1.05} pos={[0, 5.6, 0]} enter="drop" exit="blow" face seed={77} color="#ffd36b" />
    </Stage>
  );
};
