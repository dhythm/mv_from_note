// カット4: ソフトウェアも同じ。周りの番号は進み続け、箱だけ v1.2 のまま。
// 外見は無傷。スキャン帯が通る所だけ表層が消え、内側の腐食が見える（錆びが見えない、を図にする）。
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {cut, ease, pS, prog, smooth, win} from '../../lib/anim';
import {CamKeys, stage} from '../../lib/rig';
import {coreMaterial, shellMaterial} from '../../lib/shaders';
import {drawTexture, FONT} from '../../lib/glyphs';
import {KText} from '../KText';
import {Stage} from '../Stage';
import {Label} from '../props';

const c = cut(4);
const S = 3.2;
const CY = 0.6;
const SCAN0 = pS(4, 'real') - 0.1;
const SCAN1 = pS(4, 'rot') + 0.5;

export const cam4: CamKeys = {
  dist: [[c.start + 0.35, 15.5], [pS(4, 'env'), 13], [pS(4, 'vul'), 14.5], [pS(4, 'inv'), 12.5], [pS(4, 'ok'), 12.5], [SCAN0, 12], [SCAN1, 11.5], [c.end - 0.05, 10.5]],
  az: [[c.start + 0.35, -32], [pS(4, 'env'), -10], [pS(4, 'lib'), 16], [pS(4, 'vul'), 32], [pS(4, 'inv'), -22], [pS(4, 'ok'), 26], [SCAN0, 2], [SCAN1, -20], [c.end - 0.05, 14]],
  el: [[c.start + 0.35, 13], [pS(4, 'lib'), 5], [pS(4, 'inv'), 19], [pS(4, 'ok'), 7], [SCAN0, 15], [SCAN1, 11], [c.end - 0.05, 6]],
  roll: [[c.start + 0.35, -6], [pS(4, 'env'), 6], [pS(4, 'vul'), -7], [pS(4, 'inv'), 4], [pS(4, 'ok'), -5], [SCAN0, 0], [SCAN1, 6], [c.end - 0.05, -3]],
  tx: [[c.start + 0.35, 0]],
  ty: [[c.start + 0.35, CY], [SCAN0 - 0.4, CY], [SCAN0 + 0.4, 0.0], [c.end - 0.05, 0.1]],
  fov: [[c.start + 0.35, 40], [pS(4, 'vul'), 44], [pS(4, 'inv'), 36], [c.end - 0.05, 38]],
};
export const hits4 = [pS(4, 'vul') + 0.05, SCAN0 + 0.2];

function faceTexture() {
  return drawTexture('cube-face', 512, 512, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.font = `800 150px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillStyle = '#2c4f63';
    g.fillText('v1.2', w / 2, h / 2 + 6);
  });
}

// 周りで進み続ける版番号（大きな表示）
const Counter: React.FC<{t: number; base: number; rate: number; pos: [number, number, number]; h: number; t0: number}> = ({t, base, rate, pos, h, t0}) => {
  const v = base + Math.floor(Math.max(0, t - t0) * rate) * 0.1;
  const k = (t - t0) * rate;
  const flash = 1 - (k - Math.floor(k));
  return <Label text={`v${v.toFixed(1)}`} opt={{px: 120, weight: 800, color: '#bff3ff'}} height={h} position={pos} avoidCenter opacity={0.55 + 0.45 * Math.pow(flash, 4)} />;
};

const LIBS = [
  {name: '[core] v1.2', a: 0},
  {name: '[utils] v0.8', a: 2.1},
  {name: '[auth] v2.0', a: 4.2},
];

export const C04: React.FC<{t: number}> = ({t}) => {
  const s = stage(t, 4);
  const shell = useMemo(() => shellMaterial(faceTexture()), []);
  const core = useMemo(() => coreMaterial(), []);
  const sheet = useMemo(() => new THREE.MeshBasicMaterial({color: '#6fe9ff', transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false}), []);
  if (!s.on) return null;
  // スキャン帯: 上から下へ一度通り、帯を広げてゆっくり戻る
  const down = ease.inOut(prog(t, SCAN0, SCAN0 + 1.5));
  const up = ease.inOut(prog(t, SCAN0 + 1.6, c.end - 0.2));
  const top = CY + S / 2 + 0.4, bot = CY - S / 2 - 0.4;
  const scanY = up > 0 ? bot + (top - bot) * 0.62 * up : top + (bot - top) * down;
  const band = (0.85 + 0.75 * smooth(prog(t, SCAN0 + 1.4, SCAN0 + 2.2))) * smooth(prog(t, SCAN0 - 0.1, SCAN0 + 0.15)) * (1 - smooth(prog(t, c.end - 0.3, c.end + 0.2)));
  shell.uniforms.uScanY.value = band > 0.001 ? scanY : -99;
  shell.uniforms.uBand.value = band;
  core.uniforms.uPulse.value = 0.5 + 0.5 * Math.sin(t * 9);
  sheet.opacity = 0.16 * Math.min(1, band * 2);
  const spin = 0.32 * t + 0.25 * Math.sin(t * 0.7);
  const libOld = smooth(prog(t, pS(4, 'lib'), pS(4, 'lib') + 0.6));
  const libOn = smooth(prog(t, pS(4, 'lib') + 0.1, pS(4, 'lib') + 0.6)) * (1 - smooth(prog(t, pS(4, 'inv'), pS(4, 'inv') + 0.6)));
  return (
    <Stage x={s.x}>
      {/* 箱（外見は無傷） */}
      <group position={[0, CY, 0]} rotation={[0.12, spin, 0]}>
        <mesh material={shell}>
          <boxGeometry args={[S, S, S]} />
        </mesh>
        <mesh material={core}>
          <boxGeometry args={[S * 0.94, S * 0.94, S * 0.94]} />
        </mesh>
      </group>
      {band > 0.001 ? (
        <mesh position={[0, scanY, 0]} rotation={[-Math.PI / 2, 0, 0]} material={sheet}>
          <planeGeometry args={[7, 7]} />
        </mesh>
      ) : null}
      {/* ライブラリの札: 自分の版は止まり、新しい版だけが流れていく */}
      {LIBS.map((l, i) => {
        const a = l.a + t * 0.6;
        const x = Math.cos(a) * 4.4, z = Math.sin(a) * 4.4;
        const fly = prog(t, pS(4, 'lib') + 0.2 + i * 0.25, pS(4, 'lib') + 1.6 + i * 0.25);
        return (
          <group key={i}>
            <Label text={l.name} opt={{px: 80, weight: 800, color: '#ffffff', bg: 'rgba(15,60,80,0.9)', stroke: '#6fe9ff', radius: 0.3}} height={0.62} position={[x, CY + 1.6 - i * 0.9, z]} rotation={[0, -a + Math.PI / 2, 0]} opacity={libOn} avoidCenter color={libOld > 0 ? new THREE.Color('#ffffff').lerp(new THREE.Color('#7d8a90'), libOld).getStyle() : '#ffffff'} />
            {fly > 0 && fly < 1 ? (
              <Label text={['v3.8', 'v2.4', 'v4.1'][i]} opt={{px: 90, weight: 900, color: '#8ff7ff'}} height={0.7} position={[x - ease.in(fly) * 16, CY + 1.6 - i * 0.9 + 0.8 * fly, z]} opacity={libOn * (1 - fly)} avoidCenter />
            ) : null}
          </group>
        );
      })}
      <Counter t={t} base={2.7} rate={1.6} pos={[-7.5, 2.6, -5]} h={1.3} t0={c.start} />
      <Counter t={t} base={4.0} rate={1.2} pos={[7.8, 0.4, -5]} h={1.1} t0={c.start} />
      <Counter t={t} base={3.1} rate={2.0} pos={[-6.4, -1.8, -6]} h={0.9} t0={c.start} />
      {/* 警告 */}
      <Label text="⚠ CVE" opt={{px: 90, weight: 900, color: '#ffffff', bg: '#d8452c', radius: 0.25}} height={0.8} position={[3.4, CY + 2.6, 1.2]} avoidCenter opacity={win(t, pS(4, 'vul'), pS(4, 'inv') - 0.2, 0.15, 0.4) * (0.6 + 0.4 * Math.sign(Math.sin(t * 14)))} />

      <KText text="ソフトウェアも、同じ。" t={t} at={[c.voice - 0.1, pS(4, 'env') - 0.2]} size={0.95} pos={[0, 3.9, 0.5]} enter="fly" exit="scatter" face seed={31} />
      <KText text="環境は、変わり続ける" t={t} at={[pS(4, 'env') - 0.05, pS(4, 'lib') + 0.1]} size={0.85} pos={[0, -2.5, 0.5]} enter="rise" exit="blow" face seed={32} />
      <KText text="ライブラリは古くなる" t={t} at={[pS(4, 'lib') - 0.05, pS(4, 'vul') + 0.05]} size={0.85} pos={[0, 3.8, 0.5]} enter="twist" exit="blow" face seed={33} />
      <KText text="脆弱性" t={t} at={[pS(4, 'vul') - 0.05, pS(4, 'inv') - 0.2]} size={1.7} pos={[0, -2.5, 0.5]} enter="slam" exit="scatter" face color="#ff6a4d" seed={34} stagger={0.07} />
      <KText text="錆びは、見えない" t={t} at={[pS(4, 'see') - 0.6, pS(4, 'ok') - 0.15]} size={1.25} pos={[0, -2.5, 0.5]} enter="drop" exit="sink" face seed={35} />
      <KText text="放っておいても、平気？" t={t} at={[pS(4, 'ok') - 0.05, pS(4, 'illu') + 0.2]} size={0.9} pos={[0, 3.8, 0.5]} enter="swing" exit="scatter" face seed={36} />
      <KText text="…と、錯覚する" t={t} at={[pS(4, 'illu') - 0.1, pS(4, 'real') + 0.2]} size={1.1} pos={[0, -2.5, 0.5]} enter="fly" exit="fall" face seed={37} />
      {/* 帯が内部を映す間は、文字を箱の上下に分けて置き、腐食の帯を空ける */}
      <KText text="実際は、見えないところで" t={t} at={[pS(4, 'real') - 0.05, c.end - 0.35]} size={0.85} pos={[0, 3.9, 0.5]} enter="fly" exit="blow" face seed={38} />
      <KText text="腐食が進む" t={t} at={[pS(4, 'rot') + 0.5, c.end - 0.3]} size={1.35} pos={[0, -2.5, 0.5]} enter="rise" exit="blow" face color="#ff8a3a" seed={39} stagger={0.06} />
    </Stage>
  );
};
