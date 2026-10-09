// 3D 全体: カメラ（フレームから求めた姿勢をそのまま適用）、霧・明るさ、各要素。
import React from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {clamp, cut, prog, seg, track} from '../lib/anim';
import {applyPose, cameraPose} from '../lib/camera';
import {Crosses, Dirt, Env, GlyphGlow, Grooves, Ground, Keys, People, Pillar, Roads, Slab, SuccessLine} from './World';

const FOG_COLOR = new THREE.Color('#0d0b09');

export function envAt(t: number, camY: number, tgt: [number, number]): Env {
  // 霧: 近接の追跡は浅め、カット7は濃い霧、俯瞰では遠くまで
  const near = track(t, [
    [0, 16], [cut(7).start - 0.5, 18], [cut(7).start + 0.8, 5], [70.2, 6], [71.6, 14], [75.4, 14], [76.6, 6], [cut(7).end - 1.5, 7], [cut(8).start + 0.5, 22], [cut(10).start, 18], [113, 30], [115, 70],
  ]);
  const far = track(t, [
    [0, 70], [cut(2).start, 85], [cut(4).start, 120], [cut(7).start - 0.5, 110], [cut(7).start + 0.8, 40], [70.2, 44], [71.6, 95], [75.4, 95], [76.6, 46], [cut(7).end - 1.5, 52], [cut(8).start + 0.5, 90], [cut(10).start, 80], [113, 130], [115, 230],
  ]);
  const light = seg(t, [
    [0, 0.42], [6.8, 0.62], [7.3, 1.2], [9, 1],
  ]);
  return {
    t,
    camY,
    fogNear: near,
    fogFar: far,
    fogColor: FOG_COLOR,
    flood: clamp(prog(t, 116.7, 117.5)),
    glyphGlow: prog(t, 112.6, 115.2),
    spot: tgt,
    light,
  };
}

export const Scene: React.FC<{t: number; mask: THREE.Texture | null}> = ({t, mask}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const scene = useThree((s) => s.scene);
  const pose = cameraPose(t);
  applyPose(camera, pose);
  const env = envAt(t, pose.pos[1], [pose.tgt[0], pose.tgt[2]]);
  scene.background = FOG_COLOR;
  return (
    <>
      <ambientLight intensity={0.55} />
      <directionalLight position={[30, 60, 40]} intensity={1.6} />
      <pointLight position={[pose.tgt[0], 6, pose.tgt[2]]} intensity={40} distance={40} color="#d2ff1a" />
      <Ground env={env} />
      <GlyphGlow env={env} mask={mask} />
      <Grooves env={env} />
      <Crosses env={env} />
      <Roads env={env} />
      <SuccessLine env={env} />
      <People env={env} />
      <Keys env={env} />
      <Pillar env={env} />
      <Slab env={env} />
      <Dirt env={env} />
    </>
  );
};
