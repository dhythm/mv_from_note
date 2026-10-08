// カットの舞台。位置を文脈で子へ渡し、文字が画面の安全域を計算できるようにする。
import React, {createContext, useContext} from 'react';
import * as THREE from 'three';

const StageCtx = createContext<THREE.Vector3>(new THREE.Vector3());
export const useStage = () => useContext(StageCtx);

export const Stage: React.FC<{x: number; y?: number; children: React.ReactNode}> = ({x, y = 0, children}) => (
  <StageCtx.Provider value={new THREE.Vector3(x, y, 0)}>
    <group position={[x, y, 0]}>{children}</group>
  </StageCtx.Provider>
);

const v = new THREE.Vector3();
// 画面中央（要点の文字が来る範囲）にあるほど小さくなる係数。背景の札・番号を字面に重ねないために使う
export function centerFade(camera: THREE.Camera, world: THREE.Vector3, inner = 0.42, outer = 0.72): number {
  v.copy(world).project(camera);
  if (v.z > 1) return 0;
  const r = Math.hypot(v.x * 0.85, v.y * 1.25);
  const k = (r - inner) / (outer - inner);
  return Math.min(1, Math.max(0, k * k * (3 - 2 * k)));
}
