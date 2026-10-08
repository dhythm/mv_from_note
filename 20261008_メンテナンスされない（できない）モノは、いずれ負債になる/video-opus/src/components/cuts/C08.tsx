// カット8: 一度の支払いで「生涯保証」。使われるほど利用のバーは伸び、提供側のゲージだけが減る。
// 条件: 提供する側だけが消耗する仕組みは続かない → 事業者が倒れれば蓋が閉じ、札は落ち、預けたデータがこぼれる。
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {cut, ease, pE, pS, prog, rnd, rndS, smooth} from '../../lib/anim';
import {CamKeys, stage} from '../../lib/rig';
import {KText} from '../KText';
import {Stage} from '../Stage';
import {Label} from '../props';

const c = cut(8);
const BOX_Y = -1.6;
const PLATE_Y = 2.2;
const PLATE_Z = 1.0;
export const cam8: CamKeys = {
  dist: [[c.start + 0.35, 14.5], [pS(8, 'life'), 12.5], [pS(8, 'but'), 17.5], [pS(8, 'only'), 17], [pS(8, 'nolast'), 14], [pS(8, 'fall'), 13], [pS(8, 'hurt'), 14.5], [c.end - 0.05, 15.5]],
  az: [[c.start + 0.35, -12], [pS(8, 'life'), 12], [pS(8, 'but'), -16], [pS(8, 'load'), 10], [pS(8, 'only'), -6], [pS(8, 'nolast'), 14], [pS(8, 'fall'), -10], [pS(8, 'gone'), 8], [pS(8, 'hurt'), -14], [c.end - 0.05, 6]],
  el: [[c.start + 0.35, 10], [pS(8, 'but'), 8], [pS(8, 'nolast'), 5], [pS(8, 'fall'), 16], [pS(8, 'hurt'), 32], [c.end - 0.05, 28]],
  roll: [[c.start + 0.35, 3], [pS(8, 'life'), -4], [pS(8, 'but'), 4], [pS(8, 'nolast'), -6], [pS(8, 'fall'), 7], [pS(8, 'gone'), -5], [pS(8, 'hurt'), 3], [c.end - 0.05, -2]],
  tx: [[c.start + 0.35, 0]],
  ty: [[c.start + 0.35, 0.9], [pS(8, 'hurt'), -0.4], [c.end - 0.05, -0.2]],
  fov: [[c.start + 0.35, 40], [pS(8, 'fall'), 46], [pS(8, 'gone'), 40]],
};
export const hits8 = [pS(8, 'once') + 1.0, pS(8, 'fall') + 0.6, pS(8, 'gone')];

export const C08: React.FC<{t: number}> = ({t}) => {
  const s = stage(t, 8);
  const camera = useThree((st) => st.camera);
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(3.2, 2.0, 3.2)), []);
  const dataGeo = useMemo(() => new THREE.BoxGeometry(0.18, 0.18, 0.18), []);
  const dataMat = useMemo(() => new THREE.MeshBasicMaterial({color: '#7fe6ff', toneMapped: false, transparent: true}), []);
  if (!s.on) return null;
  const coin = ease.in(prog(t, pS(8, 'once') + 0.2, pS(8, 'once') + 1.0));
  const plateOn = ease.outBack(prog(t, pS(8, 'life') - 0.2, pS(8, 'life') + 0.4));
  const glow = 1 + 0.6 * Math.exp(-Math.max(0, t - pS(8, 'life')) * 3) * (t > pS(8, 'life') ? 1 : 0);
  const use = ease.inOut(prog(t, pS(8, 'but'), pE(8, 'load') + 0.4));
  const drain = ease.inOut(prog(t, pS(8, 'but') + 0.3, pS(8, 'nolast') + 0.2));
  const provider = 1 - 0.97 * drain;
  const lid = ease.outBack(prog(t, pS(8, 'fall') + 0.3, pS(8, 'fall') + 0.9));
  const plateFall = ease.in(prog(t, pS(8, 'gone') - 0.1, pS(8, 'gone') + 1.0));
  const flicker = t > pS(8, 'fall') && t < pS(8, 'gone') ? (Math.sin(t * 41) > 0 ? 1 : 0.25) : 1;
  const spill = prog(t, pS(8, 'hurt') - 0.4, c.end + 0.5);
  const q = camera.quaternion.clone();
  const barCol = provider < 0.25 ? (Math.sin(t * 20) > 0 ? '#ff3b2b' : '#7a1a12') : '#ff5a3c';
  return (
    <Stage x={s.x}>
      {/* サービスの箱 */}
      <group position={[0, BOX_Y, 0]}>
        <mesh>
          <boxGeometry args={[3.2, 2.0, 3.2]} />
          <meshStandardMaterial color="#14262e" roughness={0.6} />
        </mesh>
        <lineSegments geometry={edges}>
          <lineBasicMaterial color="#e8b04a" />
        </lineSegments>
        {/* 蓋（奥の辺を軸に閉じる） */}
        <group position={[0, 1.0, -1.6]} rotation={[-1.25 * (1 - lid), 0, 0]}>
          <mesh position={[0, 0.06, 1.6]}>
            <boxGeometry args={[3.3, 0.12, 3.3]} />
            <meshStandardMaterial color="#1d343e" emissive="#e8b04a" emissiveIntensity={0.08} />
          </mesh>
        </group>
      </group>
      {/* コイン1枚 */}
      {coin > 0 && coin < 1 ? (
        <mesh position={[0, 6 - coin * 7, 0]} rotation={[Math.PI / 2, 0, t * 9]}>
          <cylinderGeometry args={[0.45, 0.45, 0.1, 28]} />
          <meshStandardMaterial color="#ffcc55" metalness={0.85} roughness={0.2} emissive="#805a00" emissiveIntensity={0.5} />
        </mesh>
      ) : null}
      {/* 生涯保証の札: 開いた蓋（上端 y≈2.5, z≈-0.6）と同じ奥行きに置くと交差して暗い線が出るため、
          蓋より手前（z=PLATE_Z）に浮かせる。落下も手前へ向け、閉じる蓋・箱の前面（z=1.6）にめり込ませない */}
      <Label text="生涯保証" opt={{px: 130, weight: 900, color: '#3a2500', bg: '#ffcf5a', stroke: '#fff2b0', radius: 0.18}} height={1.25 * plateOn} position={[0, PLATE_Y - plateFall * 5, PLATE_Z + plateFall * 3]} rotation={[plateFall * 1.1, 0, plateFall * 0.6]} opacity={(1 - plateFall) * flicker} color={new THREE.Color('#ffffff').multiplyScalar(glow).getStyle()} />
      {/* 利用のバー（左）と提供側のゲージ（右） */}
      {use > 0 ? (
        <>
          <mesh position={[-5.2, BOX_Y - 1 + (0.2 + 5.2 * use) / 2, 0]}>
            <boxGeometry args={[0.7, 0.2 + 5.2 * use, 0.7]} />
            <meshBasicMaterial color="#5ef08a" toneMapped={false} />
          </mesh>
          <Label text="利用" opt={{px: 90, weight: 900, color: '#d9ffe6'}} height={0.95} position={[-6.5, 0.6, 0.6]} quaternion={q} />
          <mesh position={[5.2, BOX_Y - 1 + 2.7, 0]}>
            <boxGeometry args={[0.9, 5.4, 0.9]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.12} />
          </mesh>
          <mesh position={[5.2, BOX_Y - 1 + (5.2 * provider) / 2 + 0.1, 0]}>
            <boxGeometry args={[0.7, 5.2 * provider, 0.7]} />
            <meshBasicMaterial color={barCol} toneMapped={false} />
          </mesh>
          <Label text="提供側" opt={{px: 90, weight: 900, color: '#ffd9d2'}} height={0.95} position={[6.6, 0.6, 0.6]} quaternion={q} />
        </>
      ) : null}
      {/* 利用が流れ込む粒（使われるほど増える） */}
      {use > 0 && t < pS(8, 'fall') + 0.4
        ? Array.from({length: 16}).map((_, i) => {
            const ph = (((t - pS(8, 'but')) * (0.6 + use * 1.2) + rnd(i, 1)) % 1 + 1) % 1;
            return <mesh key={i} geometry={dataGeo} material={dataMat} position={[-5.2 + ph * 5.0, BOX_Y + 2.6 + Math.sin(ph * Math.PI) * 1.2 + rndS(i, 2) * 0.3, rndS(i, 3) * 0.6]} />;
          })
        : null}
      {/* 閉鎖: 預けたデータがこぼれ落ちる */}
      {spill > 0
        ? Array.from({length: 90}).map((_, i) => {
            const d = rnd(i, 4) * 0.6;
            const k = Math.max(0, spill * 1.6 - d);
            if (k <= 0) return null;
            const x = rndS(i, 5) * 1.3 + rndS(i, 6) * k * 2.5;
            const z = 1.7 + k * (1.5 + rnd(i, 7) * 2.5);
            const y = Math.max(-3.15, BOX_Y - 0.6 - k * k * 6);
            const fade = 1 - smooth((k - 0.7) / 0.6);
            dataMat.opacity = 1;
            return <mesh key={i} geometry={dataGeo} material={dataMat} position={[x, y, z]} rotation={[k * 5, k * 3, 0]} scale={Math.max(0.01, fade)} />;
          })
        : null}
      <KText text="一度の支払いで、" t={t} at={[c.voice - 0.05, pS(8, 'but') - 0.1]} size={0.9} pos={[0, 5.2, 0]} enter="fly" exit="blow" face seed={81} />
      <KText text="使われるほど、" t={t} at={[pS(8, 'but') - 0.05, pS(8, 'only') - 0.15]} size={0.9} pos={[0, 5.4, 0]} enter="drop" exit="scatter" face seed={82} />
      <KText text="負担は増える" t={t} at={[pS(8, 'load') - 0.05, pS(8, 'only') - 0.1]} size={1.25} pos={[0, -3.6, 1.4]} enter="rise" exit="blow" face color="#ff9a7a" seed={83} />
      <KText text="提供側だけが消耗する仕組みは、" t={t} at={[pS(8, 'only') - 0.05, pS(8, 'fall') - 0.15]} size={0.8} pos={[0, 5.4, 0]} enter="fly" exit="scatter" face seed={84} />
      <KText text="続かない" t={t} at={[pS(8, 'nolast') - 0.15, pS(8, 'fall') - 0.1]} size={1.6} pos={[0, -3.6, 1.4]} enter="slam" exit="fall" face color="#ff5a3c" seed={85} stagger={0.07} />
      <KText text="事業者が倒れれば、" t={t} at={[pS(8, 'fall') - 0.05, pS(8, 'hurt') - 0.15]} size={0.85} pos={[0, 5.2, 0]} enter="twist" exit="blow" face seed={86} />
      <KText text="保証も消える" t={t} at={[pS(8, 'gone') - 0.1, pS(8, 'hurt') - 0.1]} size={1.3} pos={[0, -3.6, 1.4]} enter="spin" exit="fall" face seed={87} />
      <KText text="いちばん困るのは、" t={t} at={[pS(8, 'hurt') - 0.05, c.end - 0.35]} size={0.85} pos={[0, 5.0, 0]} enter="drop" exit="blow" face seed={88} />
      <KText text="データを預けた利用者" t={t} at={[pS(8, 'user') - 0.05, c.end - 0.3]} size={1.1} pos={[0, -3.4, 2.2]} enter="rise" exit="blow" face color="#7fe6ff" seed={89} />
    </Stage>
  );
};
