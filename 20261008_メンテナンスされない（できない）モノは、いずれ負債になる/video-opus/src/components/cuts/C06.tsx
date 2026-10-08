// カット6: PTA・理事会。善意のツールが、役員交代で「誰が直せるの？」→後任の負債。
// 後半は解決像: 共通の手順を中心に担い手の輪がつながり、一人が倒れてもツールが手から手へ回り続ける（標準化）。
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {cut, ease, pS, prog, rnd, rndS, smooth} from '../../lib/anim';
import {CamKeys, stage} from '../../lib/rig';
import {drawTexture, glyph} from '../../lib/glyphs';
import {KText} from '../KText';
import {Stage} from '../Stage';
import {Label, Lock, Token, ToolDevice} from '../props';

const c = cut(6);
export const cam6: CamKeys = {
  dist: [[c.start + 0.35, 14], [pS(6, 'change'), 13], [pS(6, 'who'), 11], [pS(6, 'debt'), 12.5], [pS(6, 'need'), 17.5], [pS(6, 'help'), 16], [c.end - 0.05, 16.5]],
  az: [[c.start + 0.35, -18], [pS(6, 'tool'), 10], [pS(6, 'change'), -8], [pS(6, 'who'), 18], [pS(6, 'debt'), -12], [pS(6, 'need'), 0], [pS(6, 'help'), 26], [c.end - 0.05, -8]],
  el: [[c.start + 0.35, 8], [pS(6, 'who'), 4], [pS(6, 'debt'), 6], [pS(6, 'need') + 0.6, 46], [pS(6, 'help'), 38], [c.end - 0.05, 30]],
  roll: [[c.start + 0.35, -4], [pS(6, 'change'), 4], [pS(6, 'who'), -6], [pS(6, 'debt'), 5], [pS(6, 'need'), 0], [c.end - 0.05, 3]],
  tx: [[c.start + 0.35, 0]],
  ty: [[c.start + 0.35, 0.9], [pS(6, 'need'), 0.6], [c.end - 0.05, 0.4]],
  fov: [[c.start + 0.35, 40]],
};
export const hits6 = [pS(6, 'who') + 0.05, pS(6, 'debt2') + 0.05, pS(6, 'fall') + 0.25];

const RING = 4.6;
const RING_N = 5;
const TOKEN_COLORS = ['#4fb3d9', '#ff9a4a', '#7fd17a', '#d98ad9', '#f2d15c'];
const BASE_Y = -1.6;

function docTexture() {
  return drawTexture('doc', 360, 460, (g, w, h) => {
    g.fillStyle = '#f7f4ec';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f6f8f';
    g.fillRect(0, 0, w, 70);
    for (let i = 0; i < 7; i++) {
      g.fillStyle = i % 3 === 0 ? '#2f6f8f' : '#9ab8c8';
      g.fillRect(40, 110 + i * 46, (w - 80) * (i % 3 === 0 ? 0.5 : 0.85), 16);
    }
    g.strokeStyle = '#2f6f8f';
    g.lineWidth = 6;
    g.strokeRect(3, 3, w - 6, h - 6);
  });
}

// 物差し（年の目盛り）。左へ流れ続ける
const Ruler: React.FC<{t: number; opacity: number}> = ({t, opacity}) => {
  const mat = useMemo(() => new THREE.MeshBasicMaterial({color: '#cfe8f0', transparent: true, toneMapped: false}), []);
  mat.opacity = opacity;
  if (opacity <= 0.001) return null;
  const off = -(t - c.start) * 1.6;
  const ticks: React.ReactNode[] = [];
  for (let i = -6; i < 30; i++) {
    const x = i * 1.0 + (((off % 1) + 1) % 1) - 12;
    const k = Math.round(i - Math.floor(off));
    ticks.push(
      <mesh key={i} position={[x, k % 8 === 0 ? 0.3 : 0.15, 0]} material={mat}>
        <planeGeometry args={[0.05, k % 8 === 0 ? 0.6 : 0.3]} />
      </mesh>,
    );
  }
  return (
    <group position={[0, -3.0, 2.2]} rotation={[-0.35, 0, 0]}>
      <mesh material={mat}>
        <planeGeometry args={[26, 0.06]} />
      </mesh>
      {ticks}
    </group>
  );
};

export const C06: React.FC<{t: number}> = ({t}) => {
  const s = stage(t, 6);
  const camera = useThree((st) => st.camera);
  const qGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const qMat = useMemo(() => new THREE.MeshBasicMaterial({map: glyph('？', 900).tex, transparent: true, depthWrite: false, toneMapped: false, color: '#ffd36b'}), []);
  const linkMat = useMemo(() => new THREE.MeshBasicMaterial({color: '#7ff0ff', transparent: true, toneMapped: false, depthWrite: false}), []);
  if (!s.on) return null;
  const q = camera.quaternion.clone();
  // 前半: 担い手A → 交代でB
  const hand = ease.inOut(prog(t, pS(6, 'change') + 0.2, pS(6, 'change') + 1.4));
  const ax = -2.6 - 8 * ease.in(prog(t, pS(6, 'change') + 0.6, pS(6, 'who')));
  const bx = 2.6 + 9 * (1 - ease.outQuint(prog(t, pS(6, 'change'), pS(6, 'change') + 1.1)));
  const solve = smooth(prog(t, pS(6, 'need') - 0.2, pS(6, 'need') + 0.9));
  const lockOn = smooth(prog(t, pS(6, 'who') + 0.4, pS(6, 'who') + 0.8)) * (1 - smooth(prog(t, pS(6, 'help') + 0.2, pS(6, 'help') + 0.8)));
  const lockOpen = ease.outBack(prog(t, pS(6, 'help'), pS(6, 'help') + 0.5));
  const debt = smooth(prog(t, pS(6, 'debt'), pS(6, 'debt') + 0.8)) * (1 - solve);
  // ツールの位置: Aの上 → Bの上（弧）→ 輪の上を手から手へ
  const toolA = new THREE.Vector3(-2.6, BASE_Y + 3.2, 0);
  const toolB = new THREE.Vector3(2.6, BASE_Y + 3.2, 0);
  const tp = toolA.clone().lerp(toolB, hand);
  tp.y += Math.sin(hand * Math.PI) * 1.4 - debt * 1.2;
  if (hand >= 1) tp.x = toolB.x;
  // 解決: 輪の上を回る（倒れた担い手の所は飛ばして次へ）
  const ringAng = (i: number) => Math.PI / 2 + (i / RING_N) * Math.PI * 2;
  const pass = Math.max(0, t - pS(6, 'help') + 0.3) * 1.5;
  const slot = Math.floor(pass) % RING_N;
  const frac = ease.inOut(pass - Math.floor(pass));
  const fallen = 0;
  const from = slot === fallen ? (slot + 1) % RING_N : slot;
  let to = (from + 1) % RING_N;
  if (to === fallen) to = (to + 1) % RING_N;
  const pa = new THREE.Vector3(Math.cos(ringAng(from)) * RING, BASE_Y + 3.0, Math.sin(ringAng(from)) * RING);
  const pb = new THREE.Vector3(Math.cos(ringAng(to)) * RING, BASE_Y + 3.0, Math.sin(ringAng(to)) * RING);
  const ringPos = pa.clone().lerp(pb, frac);
  ringPos.y += Math.sin(frac * Math.PI) * 0.9;
  const toRing = smooth(prog(t, pS(6, 'help') - 0.4, pS(6, 'help') + 0.3));
  const toolPos = tp.clone().lerp(t > pS(6, 'help') - 0.4 ? ringPos : tp, toRing);
  if (solve > 0 && toRing <= 0) toolPos.lerp(new THREE.Vector3(0, BASE_Y + 3.6, 0), solve);
  const qs = smooth(prog(t, pS(6, 'who') - 0.1, pS(6, 'debt2'))) * (1 - solve);
  const nQ = Math.floor(48 * qs);
  return (
    <Stage x={s.x}>
      <Ruler t={t} opacity={1 - solve} />
      {/* 前半の担い手 */}
      {solve < 1 ? (
        <>
          <Token color={TOKEN_COLORS[0]} position={[ax, BASE_Y, 0]} scale={1 - 0.3 * solve} glow={0.1} />
          <Token color={TOKEN_COLORS[1]} position={[bx, BASE_Y, 0]} scale={1 - solve} />
        </>
      ) : null}
      {/* 解決: 輪 */}
      {solve > 0
        ? Array.from({length: RING_N}).map((_, i) => {
            const a = ringAng(i);
            const p: [number, number, number] = [Math.cos(a) * RING, BASE_Y, Math.sin(a) * RING];
            const fall = i === fallen ? ease.outBack(prog(t, pS(6, 'fall'), pS(6, 'fall') + 0.7)) : 0;
            const sc = ease.outBack(prog(t, pS(6, 'need') + i * 0.12, pS(6, 'need') + 0.6 + i * 0.12));
            return (
              <group key={i}>
                <Token color={fall > 0.5 ? '#6c7a80' : TOKEN_COLORS[i]} position={p} rotation={[0, 0, fall * 1.45]} scale={sc} glow={i === to ? 0.5 * frac : 0} />
                <mesh position={[p[0] / 2, BASE_Y + 0.05, p[2] / 2]} rotation={[-Math.PI / 2, 0, -a]} material={linkMat} scale={[RING, 1, 1]}>
                  <planeGeometry args={[1, 0.08]} />
                </mesh>
              </group>
            );
          })
        : null}
      {solve > 0 ? (
        <>
          <mesh position={[0, BASE_Y + 0.9, 0]} quaternion={q} scale={solve}>
            <planeGeometry args={[1.35, 1.72]} />
            <meshBasicMaterial map={docTexture()} toneMapped={false} />
          </mesh>
          <Label text="共通の手順" opt={{px: 80, weight: 900, color: '#062530', bg: '#7ff0ff', radius: 0.3}} height={0.6} position={[0, BASE_Y + 2.15, 0]} quaternion={q} opacity={solve} renderOrder={12} />
        </>
      ) : null}
      {/* ツール（錠・疑問符） */}
      <group position={toolPos.toArray()} rotation={[0.15, 0.4 * Math.sin(t * 1.2), 0.08 * Math.sin(t * 2)]}>
        <ToolDevice scale={0.42} screen={debt > 0.5 ? 'off' : 'on'} tint={debt > 0.3 ? '#8a7a76' : '#eef3f6'} />
        <Lock position={[0.55, -0.35, 0.45]} scale={0.42} opacity={lockOn} open={lockOpen} />
      </group>
      {nQ > 0
        ? Array.from({length: nQ}).map((_, i) => {
            const r = 1.6 + rnd(i, 1) * 2.6;
            const a = rnd(i, 2) * 6.28 + t * (0.6 + rnd(i, 3) * 0.8) * (rndS(i, 4) > 0 ? 1 : -1);
            const pop = ease.outBack(prog(t, pS(6, 'who') + i * 0.06, pS(6, 'who') + i * 0.06 + 0.4));
            return (
              <mesh key={i} geometry={qGeo} material={qMat} quaternion={q} position={[toolPos.x + Math.cos(a) * r, toolPos.y + rndS(i, 5) * 1.8 + Math.sin(t * 2 + i) * 0.2, toolPos.z + Math.sin(a) * r * 0.6]} scale={(0.45 + rnd(i, 6) * 0.5) * pop} renderOrder={11} />
            );
          })
        : null}
      <KText text="PTA・理事会" t={t} at={[c.voice - 0.05, pS(6, 'maker') - 0.1]} size={1.0} pos={[0, 3.9, 0]} enter="drop" exit="blow" face seed={61} />
      <KText text="善意で、便利なツール" t={t} at={[pS(6, 'tool') - 0.2, pS(6, 'change') - 0.05]} size={0.9} pos={[0, 3.9, 0]} enter="fly" exit="blow" face seed={62} />
      <KText text="1年目" t={t} at={[pS(6, 'maker') - 0.1, pS(6, 'change') + 0.4]} size={0.75} pos={[-2.6, -2.2, 1.2]} enter="rise" exit="blow" face color="#9fe2f5" seed={63} />
      <KText text="2年目" t={t} at={[pS(6, 'change') + 0.4, pS(6, 'debt2') + 0.5]} size={0.75} pos={[2.6, -2.2, 1.2]} enter="rise" exit="blow" face color="#ffc08a" seed={64} />
      <KText text="誰が直せるの？" t={t} at={[pS(6, 'who') - 0.05, pS(6, 'debt') - 0.05]} size={1.3} pos={[0, 4.0, 0]} enter="spin" exit="scatter" face seed={65} />
      <KText text="担い手のいない仕組みは" t={t} at={[pS(6, 'debt') - 0.05, pS(6, 'need') - 0.1]} size={0.7} pos={[0, 4.6, 0]} enter="fly" exit="blow" face seed={66} />
      <KText text="後任の負債" t={t} at={[pS(6, 'debt2') - 0.1, pS(6, 'need') - 0.05]} size={1.6} pos={[0, 3.2, 0.4]} enter="slam" exit="fall" face color="#ff5a3c" seed={67} stagger={0.07} />
      <KText text="自分が倒れても" t={t} at={[pS(6, 'fall') - 0.1, pS(6, 'help') + 0.1]} size={0.85} pos={[0, 4.4, 0]} enter="drop" exit="scatter" face seed={68} />
      <KText text="誰かの助けで回せる" t={t} at={[pS(6, 'help') - 0.05, c.end - 0.3]} size={1.15} pos={[0, 4.2, 0.2]} enter="swing" exit="blow" face color="#7ff0ff" seed={69} />
      <KText text="標準化された仕組み" t={t} at={[pS(6, 'std') - 0.05, c.end - 0.25]} size={0.85} pos={[0, 2.9, 1.8]} enter="rise" exit="blow" face seed={70} />
    </Stage>
  );
};
