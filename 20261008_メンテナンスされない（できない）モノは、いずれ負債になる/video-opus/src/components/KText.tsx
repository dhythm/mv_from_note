// キネティックタイポ: 1文字ずつの板。登場・保持・退場のすべてを時刻から計算する。
// 保持中も文字は波打ち、回り、群として漂う（読む区間を静止させない）。
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {clamp, ease, prog, rndS, rnd} from '../lib/anim';
import {glyph} from '../lib/glyphs';
import {useStage} from './Stage';

export type Enter = 'fly' | 'drop' | 'spin' | 'slam' | 'rise' | 'twist' | 'swing';
export type Exit = 'scatter' | 'fall' | 'blow' | 'zoom' | 'sink' | 'spin' | 'none';

export type KTextProps = {
  text: string;
  t: number;
  at: [number, number]; // [登場開始, 退場開始]
  size?: number;
  pos?: [number, number, number];
  rot?: [number, number, number];
  color?: string;
  weight?: number;
  enter?: Enter;
  exit?: Exit;
  stagger?: number;
  dur?: number;
  exitDur?: number;
  live?: number;
  face?: boolean; // カメラへ向ける
  seed?: number;
  lineGap?: number;
  align?: 'center' | 'left';
  // 群の追加運動（保持中の漂い・回転・伸縮）
  sway?: number;
  scale?: number;
  opacity?: number;
  renderOrder?: number;
};

const PLANE = new THREE.PlaneGeometry(1, 1);
const SAFE_X = 0.9;
const SAFE_Y = 0.84;

export const KText: React.FC<KTextProps> = (p) => {
  const {
    text, t, at, size = 1, pos = [0, 0, 0], rot = [0, 0, 0], color = '#ffffff', weight = 900,
    enter = 'fly', exit = 'scatter', stagger = 0.035, dur = 0.55, exitDur = 0.55, live = 1, face = false,
    seed = 1, lineGap = 1.2, align = 'center', sway = 1, scale = 1, opacity = 1, renderOrder = 10,
  } = p;
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const stageOrigin = useStage();
  const {chars, halfW, halfH} = useMemo(() => {
    const lines = text.split('\n');
    const out: {ch: string; x: number; y: number; w: number; h: number; tex: THREE.Texture; i: number}[] = [];
    let i = 0;
    let maxW = 0;
    lines.forEach((line, li) => {
      const gs = [...line].map((ch) => ({ch, g: glyph(ch, weight)}));
      const total = gs.reduce((s, x) => s + x.g.adv, 0);
      maxW = Math.max(maxW, total);
      let x = align === 'center' ? -total / 2 : 0;
      for (const {ch, g} of gs) {
        out.push({ch, x: x + g.adv / 2, y: -(li - (lines.length - 1) / 2) * lineGap, w: g.w, h: g.h, tex: g.tex, i: i++});
        x += g.adv;
      }
    });
    return {chars: out, halfW: maxW / 2 + 0.15, halfH: ((lines.length - 1) * lineGap) / 2 + 0.62};
  }, [text, weight, lineGap, align]);
  // 要点の文字は前面に合成する（箱・歯車・背景の札に遮られない）
  const mats = useMemo(
    () => chars.map((c) => new THREE.MeshBasicMaterial({map: c.tex, transparent: true, depthWrite: false, depthTest: false, toneMapped: false})),
    [chars],
  );
  const [tin, tout] = at;
  const n = chars.length;
  const last = tin + (n - 1) * stagger + dur;
  if (t < tin - 0.01 || t > tout + exitDur + n * stagger * 0.5 + 0.05) return null;

  // 群としての保持中の運動
  const hold = clamp((t - tin) / Math.max(0.01, tout - tin));
  const gRotY = sway * 0.12 * Math.sin(t * 0.9 + seed);
  const gRotZ = sway * 0.035 * Math.sin(t * 1.3 + seed * 2);
  const gScale = scale * (1 + sway * 0.04 * Math.sin(t * 1.7 + seed * 0.7) + 0.05 * hold * sway);

  const groupQuat = new THREE.Quaternion();
  if (face) groupQuat.copy(camera.quaternion);
  const local = new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1] + gRotY, rot[2] + gRotZ));
  groupQuat.multiply(local);

  // 安全域: カメラから見た位置と幅を毎フレーム求め、画面の内側（左右5%・上下8%）へ収める。
  // はみ出す幅なら縮め、外へ出る位置なら内側へ寄せる。運動は群の中で続く。
  let gPos = new THREE.Vector3(...pos);
  let fit = 1;
  if (face) {
    const w = gPos.clone().add(stageOrigin);
    const vc = w.clone().applyMatrix4(camera.matrixWorldInverse);
    const d = -vc.z;
    if (d > 0.5) {
      const hh = d * Math.tan((camera.fov * Math.PI) / 360);
      const hw = hh * camera.aspect;
      const sw = hw * SAFE_X, sh = hh * SAFE_Y;
      const tw = halfW * size * gScale, th = halfH * size * gScale;
      fit = Math.min(1, sw / tw, sh / th);
      const mx = Math.max(0, sw - tw * fit), my = Math.max(0, sh - th * fit);
      vc.x = clamp(vc.x, -mx, mx);
      vc.y = clamp(vc.y, -my, my);
      gPos = vc.applyMatrix4(camera.matrixWorld).sub(stageOrigin);
    }
  }
  const col = new THREE.Color(color);
  return (
    <group position={gPos} quaternion={groupQuat} scale={gScale * size * fit}>
      {chars.map((c, k) => {
        const s0 = tin + c.i * stagger;
        const e = prog(t, s0, s0 + dur);
        const ix = tout + (exit === 'scatter' || exit === 'blow' ? c.i * stagger * 0.5 : (n - 1 - c.i) * stagger * 0.3);
        const x = prog(t, ix, ix + exitDur);
        if (e <= 0 || x >= 1) return null;
        const r1 = rndS(c.i, seed), r2 = rndS(c.i, seed + 3), r3 = rnd(c.i, seed + 7);
        let px = c.x, py = c.y, pz = 0, rx = 0, ry = 0, rz = 0, sc = 1, op = 1;
        // 登場
        const u = 1 - e;
        switch (enter) {
          case 'fly': {
            const k2 = ease.outQuint(e);
            pz += -26 * (1 - k2); px += r1 * 5 * (1 - k2); py += r2 * 3 * (1 - k2);
            ry += r1 * Math.PI * 1.4 * (1 - ease.out(e)); rx += r2 * 1.2 * (1 - k2);
            op = clamp(e * 3); break;
          }
          case 'drop': {
            const k2 = ease.outBack(e);
            py += 6 * (1 - k2); rz += r1 * 0.9 * u; sc = 0.6 + 0.4 * k2; op = clamp(e * 4); break;
          }
          case 'spin': {
            const k2 = ease.outBack(e);
            rz += (1 - k2) * Math.PI * 2 * (r1 > 0 ? 1 : -1); sc = k2; op = clamp(e * 3); break;
          }
          case 'slam': {
            const k2 = ease.expoOut(e);
            pz += 14 * (1 - k2); sc = 1 + 1.6 * (1 - k2); op = clamp(e * 5); break;
          }
          case 'rise': {
            const k2 = ease.outQuint(e);
            py += -2.4 * (1 - k2); rx += -1.3 * (1 - k2); op = clamp(e * 3); break;
          }
          case 'twist': {
            const k2 = ease.outQuint(e);
            ry += (1 - k2) * Math.PI; px += (1 - k2) * (c.x * 1.8); op = clamp(e * 3); break;
          }
          case 'swing': {
            const k2 = ease.outElastic(e);
            rx += (1 - k2) * 1.6; py += (1 - ease.out(e)) * 1.2; op = clamp(e * 4); break;
          }
        }
        // 保持中の揺れ（文字ごと）
        const settled = clamp((t - (s0 + dur)) / 0.4);
        py += live * 0.07 * Math.sin(t * 3.1 + c.i * 0.55 + seed) * settled;
        rz += live * 0.045 * Math.sin(t * 2.3 + c.i * 0.9 + seed) * settled;
        ry += live * 0.12 * Math.sin(t * 1.7 + c.i * 0.4) * settled;
        // 退場
        if (x > 0) {
          const k2 = ease.in(x);
          switch (exit) {
            case 'scatter':
              px += r1 * 9 * k2; py += r2 * 6 * k2; pz += (4 + r3 * 10) * k2; rz += r1 * 3 * k2; ry += r2 * 3 * k2; break;
            case 'fall':
              py -= 9 * k2; rz += r1 * 1.6 * k2; rx += 1.2 * k2; break;
            case 'blow':
              px -= (12 + r3 * 8) * k2; py += r2 * 2 * k2; ry += 2.4 * k2; break;
            case 'zoom':
              pz += 16 * k2; sc *= 1 + 2 * k2; break;
            case 'sink':
              pz -= 18 * k2; py -= 2 * k2; break;
            case 'spin':
              rz += 4 * k2 * (r1 > 0 ? 1 : -1); sc *= 1 - k2; break;
            case 'none':
              break;
          }
          op *= 1 - ease.in(x);
        }
        const m = mats[k];
        m.color.copy(col);
        m.opacity = op * opacity;
        return (
          <mesh
            key={c.i}
            geometry={PLANE}
            material={m}
            position={[px, py, pz]}
            rotation={[rx, ry, rz]}
            scale={[c.w * sc, c.h * sc, 1]}
            renderOrder={renderOrder}
          />
        );
      })}
    </group>
  );
};

// 時刻が last を過ぎたか（呼び出し側の補助）
export function ktextSettled(t: number, tin: number, n: number, stagger = 0.035, dur = 0.55) {
  return t >= tin + (n - 1) * stagger + dur;
}
