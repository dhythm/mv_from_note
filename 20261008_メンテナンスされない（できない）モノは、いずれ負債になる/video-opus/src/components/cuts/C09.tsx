// カット9: 提供する側も、使う側も、続けられるバランス。対価→人の時間→点検・修繕→道具 の循環。
// 天秤が揺れて釣り合い、まわりに保守の輪が回り始める。錆を残したまま金継ぎの修繕線が光る歯車が、流れに乗り直す。
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {cut, ease, pE, pS, prog, smooth} from '../../lib/anim';
import {CamKeys, stage} from '../../lib/rig';
import {KText} from '../KText';
import {Stage} from '../Stage';
import {Gear, Label, Token} from '../props';

const c = cut(9);
const TOP = 2.4;
const ARM = 3.6;
export const cam9: CamKeys = {
  dist: [[c.start + 0.35, 17], [pS(9, 'bal'), 14], [pS(9, 'pay'), 23], [pS(9, 'fix'), 24], [pS(9, 'tool'), 18], [pS(9, 'notonly'), 17.5], [pS(9, 'ins'), 13.5], [c.end - 0.05, 15]],
  az: [[c.start + 0.35, -26], [pS(9, 'bal'), 10], [pS(9, 'pay'), -18], [pS(9, 'fix'), 22], [pS(9, 'tool'), -10], [pS(9, 'notonly'), 18], [pS(9, 'ins'), -6], [c.end - 0.05, 12]],
  el: [[c.start + 0.35, 8], [pS(9, 'pay'), 34], [pS(9, 'fix'), 36], [pS(9, 'tool'), 11], [pS(9, 'ins'), 6], [c.end - 0.05, 9]],
  roll: [[c.start + 0.35, -5], [pS(9, 'bal'), 3], [pS(9, 'pay'), -4], [pS(9, 'tool'), 5], [pS(9, 'ins'), -2], [c.end - 0.05, 3]],
  tx: [[c.start + 0.35, 0]],
  ty: [[c.start + 0.35, 1.3], [pS(9, 'bal') + 0.8, 1.3], [pS(9, 'pay') + 0.4, -0.5], [pE(9, 'fix'), -0.5], [pS(9, 'tool') + 0.6, 1.2]],
  fov: [[c.start + 0.35, 40], [pS(9, 'pay'), 44], [pE(9, 'fix'), 44], [pS(9, 'tool') + 0.6, 40], [c.end - 0.05, 38]],
};
export const hits9 = [pS(9, 'bal') + 0.6, pS(9, 'tool') + 0.1];

function beamAngle(t: number) {
  const t0 = pS(9, 'bal') - 0.1;
  const tilt = 0.34;
  if (t < t0) return tilt + 0.03 * Math.sin(t * 2.2);
  const u = t - t0;
  return tilt * Math.exp(-u * 1.6) * Math.cos(u * 5.2);
}

const NODES = [
  {label: '対価', key: 'pay'},
  {label: '人の時間', key: 'time'},
  {label: '点検・修繕', key: 'fix'},
  {label: '道具', key: 'tool'},
];
const RING_R = 7.2;
const RING_TILT = -1.18;

const Shop: React.FC<{position: [number, number, number]}> = ({position}) => (
  <group position={position}>
    <mesh position={[0, 0.55, 0]}>
      <boxGeometry args={[1.5, 1.1, 1.1]} />
      <meshStandardMaterial color="#f1ede4" />
    </mesh>
    {[0, 1, 2, 3, 4].map((i) => (
      <mesh key={i} position={[-0.6 + i * 0.3, 1.25, 0.62]} rotation={[0.5, 0, 0]}>
        <boxGeometry args={[0.3, 0.06, 0.5]} />
        <meshStandardMaterial color={i % 2 ? '#f1ede4' : '#d9a441'} />
      </mesh>
    ))}
    <mesh position={[0, 0.45, 0.56]}>
      <planeGeometry args={[0.45, 0.7]} />
      <meshStandardMaterial color="#6a4a2a" />
    </mesh>
  </group>
);

const Pan: React.FC<{x: number; y: number; children?: React.ReactNode}> = ({x, y, children}) => (
  <group position={[x, y, 0]}>
    {[-0.9, 0.9].map((dx) => (
      <mesh key={dx} position={[dx * 0.5, -0.8, 0]} rotation={[0, 0, dx > 0 ? 0.28 : -0.28]}>
        <cylinderGeometry args={[0.025, 0.025, 1.7, 6]} />
        <meshStandardMaterial color="#d9b35a" metalness={0.7} roughness={0.3} />
      </mesh>
    ))}
    <mesh position={[0, -1.65, 0]}>
      <cylinderGeometry args={[1.25, 0.9, 0.18, 32]} />
      <meshStandardMaterial color="#c99a3d" metalness={0.75} roughness={0.28} />
    </mesh>
    <group position={[0, -1.55, 0]}>{children}</group>
  </group>
);

export const C09: React.FC<{t: number}> = ({t}) => {
  const s = stage(t, 9);
  const camera = useThree((st) => st.camera);
  const ringMat = useMemo(() => new THREE.MeshBasicMaterial({color: '#ffd36b', transparent: true, toneMapped: false, depthWrite: false}), []);
  const dotMat = useMemo(() => new THREE.MeshBasicMaterial({color: '#fff1c4', toneMapped: false}), []);
  if (!s.on) return null;
  const th = beamAngle(t);
  const lx = -ARM * Math.cos(th), ly = TOP + ARM * Math.sin(th);
  const rx = ARM * Math.cos(th), ry = TOP - ARM * Math.sin(th);
  const ringOn = smooth(prog(t, pS(9, 'pay') - 0.4, pS(9, 'pay') + 0.4)) * (1 - smooth(prog(t, c.end - 0.4, c.end + 0.2)));
  ringMat.opacity = 0.75 * ringOn;
  // 循環の速さ: 道具が動き出すと速くなる
  const cyc = (t - pS(9, 'pay')) * 0.55 + 0.6 * Math.max(0, t - pS(9, 'tool'));
  const seam = ease.inOut(prog(t, pS(9, 'fix'), pE(9, 'fix') + 0.3));
  // 歯車: 後ろに取り残されていたところから、修繕されて流れに追いつく
  const catchUp = ease.inOut(prog(t, pS(9, 'fix') - 0.2, pS(9, 'tool') + 0.8));
  const gearX = -16 + (16 + 5.2) * catchUp + 1.8 * smooth(prog(t, pS(9, 'notonly'), pS(9, 'ins')));
  const spinStart = pS(9, 'tool');
  const gAng = t < spinStart ? 0 : -((t - spinStart) * (t - spinStart) * 0.9 + (t - spinStart) * 0.6);
  const q = camera.quaternion.clone();
  return (
    <Stage x={s.x}>
      {/* 天秤 */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.16, 0.22, 5.8, 16]} />
        <meshStandardMaterial color="#c99a3d" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh position={[0, -3.1, 0]}>
        <cylinderGeometry args={[1.4, 1.7, 0.3, 32]} />
        <meshStandardMaterial color="#a77d2e" metalness={0.7} roughness={0.35} />
      </mesh>
      <group position={[0, TOP, 0]} rotation={[0, 0, -th]}>
        <mesh>
          <boxGeometry args={[ARM * 2 + 0.4, 0.16, 0.22]} />
          <meshStandardMaterial color="#e0b552" metalness={0.8} roughness={0.25} />
        </mesh>
      </group>
      <Pan x={lx} y={ly}>
        <Shop position={[0, 0.05, 0]} />
      </Pan>
      <Pan x={rx} y={ry}>
        <Token color="#4fb3d9" position={[0, 0.05, 0]} scale={0.55} />
      </Pan>
      <Label text="提供する側" opt={{px: 80, weight: 800, color: '#ffe7a8'}} height={0.85} position={[lx, ly + 1.7, 0.6]} quaternion={q} opacity={1 - smooth(prog(t, pS(9, 'pay'), pS(9, 'pay') + 0.5))} />
      <Label text="使う側" opt={{px: 80, weight: 800, color: '#bfeaff'}} height={0.85} position={[rx, ry + 1.7, 0.6]} quaternion={q} opacity={1 - smooth(prog(t, pS(9, 'pay'), pS(9, 'pay') + 0.5))} />

      {/* 保守の循環 */}
      {ringOn > 0.001 ? (
        <group position={[0, 0.4, 0]} rotation={[RING_TILT, 0, 0]}>
          <mesh material={ringMat} rotation={[0, 0, 0]}>
            <torusGeometry args={[RING_R, 0.05, 8, 160]} />
          </mesh>
          {Array.from({length: 18}).map((_, i) => {
            const a = cyc + (i / 18) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * RING_R, Math.sin(a) * RING_R, 0]} material={dotMat} scale={ringOn * (0.12 + 0.06 * Math.sin(i * 2.1))}>
                <sphereGeometry args={[1, 10, 8]} />
              </mesh>
            );
          })}
          {NODES.map((n, i) => {
            const a = Math.PI / 2 - (i / NODES.length) * Math.PI * 2 + 0.25;
            const lit = smooth(prog(t, pS(9, n.key) - 0.2, pS(9, n.key) + 0.3));
            const pulse = 1 + 0.25 * Math.exp(-Math.max(0, t - pS(9, n.key)) * 3) * (t > pS(9, n.key) ? 1 : 0);
            const p = new THREE.Vector3(Math.cos(a) * RING_R, Math.sin(a) * RING_R, 0);
            // 札はカメラへ向ける（親の傾きを打ち消す）
            const parentQ = new THREE.Quaternion().setFromEuler(new THREE.Euler(RING_TILT, 0, 0));
            const lq = parentQ.clone().invert().multiply(q);
            return (
              <group key={n.key} position={p}>
                <mesh material={ringMat} scale={0.42 * pulse * (0.5 + 0.5 * lit)}>
                  <sphereGeometry args={[1, 18, 14]} />
                </mesh>
                <Label text={n.label} opt={{px: 90, weight: 900, color: '#1b1405', bg: '#ffd36b', radius: 0.35}} height={0.8 * pulse} position={[0, 0, 0.9]} quaternion={lq} opacity={ringOn * (0.35 + 0.65 * lit)} renderOrder={12} />
              </group>
            );
          })}
        </group>
      ) : null}

      {/* 金継ぎの歯車 */}
      {catchUp > 0 ? <Gear angle={gAng} rust={0.95} seam={seam} R={2.8} scale={0.62} position={[gearX, -0.9, 3.0]} rotation={[0, -0.35, 0]} emit={0.08 * seam} /> : null}

      <KText text="提供する側も、使う側も" t={t} at={[c.voice - 0.1, pS(9, 'bal') + 0.2]} size={0.82} pos={[0, 5.4, 0]} enter="fly" exit="scatter" face seed={91} />
      <KText text="続けられるバランス" t={t} at={[pS(9, 'bal') - 0.05, pS(9, 'pay') + 0.1]} size={1.3} pos={[0, -1.3, 1.5]} enter="swing" exit="blow" face color="#ffd36b" seed={92} />
      <KText text="道具を、明日も動かす" t={t} at={[pS(9, 'tool') - 0.05, pS(9, 'notonly') - 0.1]} size={0.95} pos={[0, -1.3, 1.5]} enter="rise" exit="blow" face seed={93} />
      <KText text={'保守費は、\n儲けさせるためだけじゃない'} t={t} at={[pS(9, 'notonly') - 0.05, pS(9, 'ins') - 0.1]} size={0.8} pos={[0, 5.0, 0.5]} enter="fly" exit="scatter" face seed={94} lineGap={1.25} />
      {/* 結びは上下に分節し、歯車（右下）と重ねない */}
      <KText text="自分の道具を守る、" t={t} at={[pS(9, 'ins') - 0.05, c.end - 0.35]} size={0.9} pos={[0, 5.2, 0.3]} enter="fly" exit="scatter" face seed={95} />
      <KText text="保険でもある" t={t} at={[pS(9, 'ins') + 0.75, c.end - 0.3]} size={1.45} pos={[-1.0, -1.4, 1.2]} enter="slam" exit="zoom" face color="#ffd36b" seed={96} stagger={0.06} />
    </Stage>
  );
};
