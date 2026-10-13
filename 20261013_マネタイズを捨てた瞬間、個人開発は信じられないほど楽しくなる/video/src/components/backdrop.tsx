// 背景の場（カメラの移動・回転が見えるよう、奥に置く格子と点）
import React, {useLayoutEffect, useMemo, useRef} from 'react';
import * as THREE from 'three';
import {C, beatEnv} from '../lib/anim';
import {RRect} from './prims';

// 前半（墨色）: 生成りの細い格子。拍で少し明るくなる重い反復
export const InkGrid: React.FC<{t: number; z?: number; opacity?: number}> = ({t, z = -500, opacity = 1}) => {
  const step = 140;
  const lines: React.ReactNode[] = [];
  const op = (0.07 + 0.05 * beatEnv(t, 5)) * opacity;
  for (let i = -18; i <= 18; i++) {
    lines.push(<RRect key={`v${i}`} w={2} h={3600} r={0} x={i * step} z={z} color={C.kinari} opacity={op} order={1} />);
  }
  for (let j = -12; j <= 12; j++) {
    lines.push(<RRect key={`h${j}`} w={5200} h={2} r={0} y={j * step} z={z} color={C.kinari} opacity={op} order={1} />);
  }
  return <>{lines}</>;
};

// 後半（生成り）: アプリコットの点の場（インスタンスで 1 回の描画）
const dotGeo = new THREE.CircleGeometry(1, 16);
export const DotField: React.FC<{z?: number; opacity?: number; color?: string; step?: number; r?: number}> = ({z = -500, opacity = 0.55, color = C.apricot, step = 96, r = 3.2}) => {
  const ref = useRef<THREE.InstancedMesh>(null);
  const pts = useMemo(() => {
    const out: [number, number][] = [];
    for (let i = -28; i <= 28; i++) for (let j = -18; j <= 18; j++) out.push([i * step + (j % 2 ? step / 2 : 0), j * step * 0.8]);
    return out;
  }, [step]);
  useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    pts.forEach(([x, y], i) => {
      o.position.set(x, y, 0);
      o.scale.set(r, r, 1);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  }, [pts, r]);
  return (
    <instancedMesh ref={ref} args={[dotGeo, undefined, pts.length]} position={[0, 0, z]} renderOrder={1}>
      <meshBasicMaterial color={color} transparent opacity={opacity} depthTest={false} depthWrite={false} toneMapped={false} />
    </instancedMesh>
  );
};
