// 動く小道具。形はローカルで作画し、状態はすべて引数（時刻から計算した値）で受け取る。
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {useThree} from '@react-three/fiber';
import {metalMaterial} from '../lib/shaders';
import {centerFade, useStage} from './Stage';
import {drawTexture, labelTexture, LabelOpt} from '../lib/glyphs';

// ---- 歯車 ----
export function gearGeometry(teeth = 18, R = 2.8, depth = 0.45) {
  const r = R * 0.86;
  const shape = new THREE.Shape();
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step;
    const pts: [number, number][] = [
      [r, a - step * 0.5],
      [r, a - step * 0.28],
      [R, a - step * 0.16],
      [R, a + step * 0.16],
      [r, a + step * 0.28],
    ];
    pts.forEach(([rad, ang], k) => {
      const x = rad * Math.cos(ang), y = rad * Math.sin(ang);
      if (i === 0 && k === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    });
  }
  shape.closePath();
  // 軸穴と肉抜きの窓
  const hub = new THREE.Path();
  hub.absarc(0, 0, R * 0.13, 0, Math.PI * 2, true);
  shape.holes.push(hub);
  const spokes = 5;
  for (let s = 0; s < spokes; s++) {
    const a0 = (s / spokes) * Math.PI * 2 + 0.22;
    const a1 = a0 + (Math.PI * 2) / spokes - 0.44;
    const w = new THREE.Path();
    w.absarc(0, 0, R * 0.66, a0, a1, false);
    w.absarc(0, 0, R * 0.3, a1, a0, true);
    w.closePath();
    shape.holes.push(w);
  }
  const geo = new THREE.ExtrudeGeometry(shape, {depth, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 2, curveSegments: 18});
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

export const Gear: React.FC<{
  angle: number; rust: number; seam?: number; R?: number; teeth?: number; position?: [number, number, number];
  rotation?: [number, number, number]; scale?: number; emit?: number; base?: string;
}> = ({angle, rust, seam = 0, R = 2.8, teeth = 18, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, emit = 0, base}) => {
  const geo = useMemo(() => gearGeometry(teeth, R), [teeth, R]);
  const mat = useMemo(() => metalMaterial(base), [base]);
  mat.uniforms.uRust.value = rust;
  mat.uniforms.uSeam.value = seam;
  mat.uniforms.uR.value = R;
  mat.uniforms.uEmit.value = emit;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh geometry={geo} material={mat} rotation={[0, 0, angle]} />
      <mesh material={mat} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[R * 0.2, R * 0.2, 0.7, 24]} />
      </mesh>
    </group>
  );
};

// ---- チェーン: 歯車の上側から右回りに巻き、左の画面外へ延びるループ ----
export function chainPath(s: number, R: number, len: number): [number, number, number] {
  // 区間: 上の直線(左→右) / 歯車の右半周 / 下の直線(右→左) / 左端の折り返し
  const arc = Math.PI * R;
  const back = Math.PI * R;
  const L = len * 2 + arc + back;
  const u = ((s % L) + L) % L;
  if (u < len) return [-len + u, R, Math.PI];
  if (u < len + arc) {
    const a = Math.PI / 2 - (u - len) / R;
    return [R * Math.cos(a), R * Math.sin(a), a + Math.PI / 2 + Math.PI];
  }
  if (u < len * 2 + arc) return [-(u - len - arc), -R, 0];
  const a = -Math.PI / 2 - (u - 2 * len - arc) / R;
  return [-len + R * Math.cos(a), R * Math.sin(a), a + Math.PI / 2 + Math.PI];
}
export const Chain: React.FC<{travel: number; rust: number; R: number; len?: number}> = ({travel, rust, R, len = 14}) => {
  const L = len * 2 + Math.PI * R * 2;
  const pitch = 0.32;
  const n = Math.floor(L / pitch);
  const {mesh, mat} = useMemo(() => {
    const geo = new RoundedBoxGeometry(0.34, 0.16, 0.3, 2, 0.06);
    const mat = metalMaterial('#9aa6ae');
    const m = new THREE.InstancedMesh(geo, mat, n);
    m.frustumCulled = false;
    return {mesh: m, mat};
  }, [n]);
  mat.uniforms.uRust.value = rust;
  mat.uniforms.uRadial.value = 0;
  const o = new THREE.Object3D();
  for (let i = 0; i < n; i++) {
    const [x, y, a] = chainPath(i * (L / n) + travel, R, len);
    o.position.set(x, y, 0);
    o.rotation.set(0, 0, a);
    o.updateMatrix();
    mesh.setMatrixAt(i, o.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  return <primitive object={mesh} />;
};

// ---- 文字の板（ラベル） ----
export const Label: React.FC<{
  text: string; opt?: LabelOpt; height: number; position?: [number, number, number]; rotation?: [number, number, number];
  opacity?: number; color?: string; renderOrder?: number; quaternion?: THREE.Quaternion;
  avoidCenter?: boolean; // 背景の札: 画面中央（要点の字面域）に来たら薄くする（舞台直下に置いたときだけ使う）
}> = ({text, opt, height, position = [0, 0, 0], rotation = [0, 0, 0], opacity = 1, color = '#ffffff', renderOrder = 5, quaternion, avoidCenter = false}) => {
  const lt = labelTexture(text, opt);
  const mat = useMemo(() => new THREE.MeshBasicMaterial({map: lt.tex, transparent: true, depthWrite: false, toneMapped: false}), [lt]);
  const camera = useThree((s) => s.camera);
  const origin = useStage();
  if (avoidCenter) opacity *= 0.1 + 0.9 * centerFade(camera, new THREE.Vector3(...position).add(origin));
  mat.opacity = opacity;
  mat.color.set(color);
  if (opacity <= 0.001) return null;
  const w = (height * lt.w) / lt.h;
  return (
    <mesh position={position} rotation={quaternion ? undefined : rotation} quaternion={quaternion} material={mat} renderOrder={renderOrder}>
      <planeGeometry args={[w, height]} />
    </mesh>
  );
};

// ---- 人の駒（抽象的な担い手） ----
export const Token: React.FC<{color: string; position?: [number, number, number]; rotation?: [number, number, number]; scale?: number; glow?: number}> = ({
  color, position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, glow = 0,
}) => (
  <group position={position} rotation={rotation} scale={scale}>
    <mesh position={[0, 0.85, 0]}>
      <capsuleGeometry args={[0.45, 0.8, 6, 16]} />
      <meshStandardMaterial color={color} roughness={0.45} emissive={color} emissiveIntensity={0.15 + glow} />
    </mesh>
    <mesh position={[0, 2.0, 0]}>
      <sphereGeometry args={[0.38, 24, 16]} />
      <meshStandardMaterial color={color} roughness={0.45} emissive={color} emissiveIntensity={0.15 + glow} />
    </mesh>
  </group>
);

// ---- 業務ツール（画面とボタンの箱） ----
export function toolScreen(state: 'on' | 'off' | 'lock') {
  return drawTexture(`tool-${state}`, 512, 320, (g, w, h) => {
    g.fillStyle = state === 'off' ? '#0d1418' : '#0d2a3a';
    g.fillRect(0, 0, w, h);
    if (state === 'off') return;
    const bars = [0.35, 0.55, 0.42, 0.78, 0.65, 0.9];
    bars.forEach((b, i) => {
      g.fillStyle = i % 2 ? '#35d4ff' : '#ffb347';
      g.fillRect(60 + i * 68, h - 40 - b * (h - 110), 44, b * (h - 110));
    });
    g.strokeStyle = '#8ff0ff';
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(50, 70);
    g.lineTo(w - 50, 70);
    g.stroke();
  });
}
export const ToolDevice: React.FC<{
  parts?: number[]; // 各部品の組み上がり度 0..1（1=所定の位置）
  scatter?: number; // 組み上がり前の散らばり幅
  screen?: 'on' | 'off' | 'lock';
  position?: [number, number, number]; rotation?: [number, number, number]; scale?: number; tint?: string; glitch?: number; seed?: number;
}> = ({parts = [1, 1, 1, 1, 1, 1], scatter = 9, screen = 'on', position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, tint = '#eef3f6', glitch = 0, seed = 0}) => {
  const body = useMemo(() => new RoundedBoxGeometry(3.2, 2.4, 1.0, 4, 0.3), []);
  const scr = toolScreen(screen);
  // 部品の所定位置と飛来元
  const P: {to: [number, number, number]; from: [number, number, number]; spin: number}[] = [
    {to: [0, 0, 0], from: [0, 0, 0], spin: 0}, // 本体
    {to: [0, 0.25, 0.52], from: [-1.2, 1.4, 1.2], spin: 2}, // 画面
    {to: [-0.8, -0.85, 0.55], from: [-1.4, -1.1, 0.6], spin: 3}, // ボタン
    {to: [0, -0.85, 0.55], from: [0.2, -1.5, 0.9], spin: -3},
    {to: [0.8, -0.85, 0.55], from: [1.5, -1.0, 0.5], spin: 4},
    {to: [1.2, 1.55, 0], from: [1.4, 1.3, -0.8], spin: -2}, // アンテナ
  ];
  const pose = (i: number) => {
    const k = parts[i] ?? 1;
    const u = 1 - k;
    const f = P[i].from;
    return {
      p: [P[i].to[0] + f[0] * scatter * u, P[i].to[1] + f[1] * scatter * u, P[i].to[2] + f[2] * scatter * u] as [number, number, number],
      r: [P[i].spin * u * 2, P[i].spin * u * 3, P[i].spin * u] as [number, number, number],
      s: 0.4 + 0.6 * Math.min(1, k * 1.3),
    };
  };
  const gx = glitch * Math.sin(seed * 91.7) * 0.15;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const q = pose(i);
        if (i === 0)
          return (
            <mesh key={i} geometry={body} position={q.p} rotation={q.r} scale={q.s}>
              <meshStandardMaterial color={tint} roughness={0.35} metalness={0.05} />
            </mesh>
          );
        if (i === 1)
          return (
            <mesh key={i} position={[q.p[0] + gx, q.p[1], q.p[2]]} rotation={q.r} scale={q.s}>
              <planeGeometry args={[2.5, 1.45]} />
              <meshBasicMaterial map={scr} toneMapped={false} />
            </mesh>
          );
        if (i === 5)
          return (
            <group key={i} position={q.p} rotation={q.r} scale={q.s}>
              <mesh position={[0, 0.3, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 0.7, 8]} />
                <meshStandardMaterial color="#9aa7b0" />
              </mesh>
              <mesh position={[0, 0.7, 0]}>
                <sphereGeometry args={[0.14, 16, 12]} />
                <meshStandardMaterial color="#ff9a3c" emissive="#ff9a3c" emissiveIntensity={0.8} />
              </mesh>
            </group>
          );
        const cols = ['#ff7a59', '#ffd25e', '#5ee0ff'];
        return (
          <mesh key={i} position={q.p} rotation={[Math.PI / 2 + q.r[0], q.r[1], q.r[2]]} scale={q.s}>
            <cylinderGeometry args={[0.22, 0.22, 0.16, 20]} />
            <meshStandardMaterial color={cols[i - 2]} emissive={cols[i - 2]} emissiveIntensity={screen === 'off' ? 0 : 0.5} />
          </mesh>
        );
      })}
    </group>
  );
};

// ---- 錠 ----
export const Lock: React.FC<{position?: [number, number, number]; rotation?: [number, number, number]; scale?: number; open?: number; opacity?: number}> = ({
  position = [0, 0, 0], rotation = [0, 0, 0], scale = 1, open = 0, opacity = 1,
}) => {
  if (opacity <= 0.001) return null;
  return (
    <group position={position} rotation={rotation} scale={scale}>
      <mesh>
        <boxGeometry args={[1.3, 1.0, 0.45]} />
        <meshStandardMaterial color="#c9a55a" metalness={0.6} roughness={0.35} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, 0.6 + open * 0.5, 0]} rotation={[0, open * 1.2, 0]}>
        <torusGeometry args={[0.42, 0.11, 10, 24, Math.PI]} />
        <meshStandardMaterial color="#b8bec4" metalness={0.8} roughness={0.25} transparent opacity={opacity} />
      </mesh>
      <mesh position={[0, -0.05, 0.24]}>
        <circleGeometry args={[0.12, 16]} />
        <meshBasicMaterial color="#2a1a08" transparent opacity={opacity} />
      </mesh>
    </group>
  );
};

// ---- 家・車・ソフトの箱 ----
export const House: React.FC<{position?: [number, number, number]; scale?: number; rotation?: [number, number, number]}> = ({position = [0, 0, 0], scale = 1, rotation = [0, 0, 0]}) => (
  <group position={position} scale={scale} rotation={rotation}>
    <mesh position={[0, 0.9, 0]}>
      <boxGeometry args={[2.4, 1.8, 2]} />
      <meshStandardMaterial color="#f2f4f6" roughness={0.6} />
    </mesh>
    <mesh position={[0, 2.25, 0]} rotation={[0, Math.PI / 4, 0]}>
      <coneGeometry args={[2.05, 1.1, 4]} />
      <meshStandardMaterial color="#2f6f8f" roughness={0.5} />
    </mesh>
    <mesh position={[0, 0.55, 1.01]}>
      <planeGeometry args={[0.6, 1.1]} />
      <meshStandardMaterial color="#2f6f8f" />
    </mesh>
    <mesh position={[0.75, 1.15, 1.01]}>
      <planeGeometry args={[0.5, 0.5]} />
      <meshStandardMaterial color="#7fd1f0" emissive="#7fd1f0" emissiveIntensity={0.4} />
    </mesh>
  </group>
);
export const Car: React.FC<{position?: [number, number, number]; scale?: number; rotation?: [number, number, number]; wheel?: number}> = ({position = [0, 0, 0], scale = 1, rotation = [0, 0, 0], wheel = 0}) => {
  const body = useMemo(() => new RoundedBoxGeometry(3.2, 0.8, 1.6, 3, 0.25), []);
  const cabin = useMemo(() => new RoundedBoxGeometry(1.8, 0.75, 1.45, 3, 0.25), []);
  return (
    <group position={position} scale={scale} rotation={rotation}>
      <mesh geometry={body} position={[0, 0.75, 0]}>
        <meshStandardMaterial color="#f4f5f7" roughness={0.3} metalness={0.15} />
      </mesh>
      <mesh geometry={cabin} position={[-0.15, 1.4, 0]}>
        <meshStandardMaterial color="#9fd9f0" roughness={0.15} metalness={0.2} />
      </mesh>
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <mesh key={`${sx}${sz}`} position={[sx * 1.05, 0.38, sz * 0.8]} rotation={[Math.PI / 2, 0, wheel]}>
            <cylinderGeometry args={[0.38, 0.38, 0.28, 18]} />
            <meshStandardMaterial color="#1d2328" roughness={0.8} />
          </mesh>
        )),
      )}
    </group>
  );
};
export function codeTexture(cracked: boolean) {
  return drawTexture(`code-${cracked}`, 512, 384, (g, w, h) => {
    g.fillStyle = '#f5f8fb';
    g.fillRect(0, 0, w, h);
    g.fillStyle = '#2f6f8f';
    g.fillRect(0, 0, w, 54);
    ['#ff7a59', '#ffd25e', '#5ee0ff'].forEach((c, i) => {
      g.fillStyle = c;
      g.beginPath();
      g.arc(30 + i * 30, 27, 9, 0, Math.PI * 2);
      g.fill();
    });
    g.font = '700 54px monospace';
    g.fillStyle = '#2f6f8f';
    g.fillText('</>', 40, 150);
    const lines = [0.7, 0.5, 0.82, 0.4, 0.62];
    lines.forEach((l, i) => {
      g.fillStyle = i % 2 ? '#9ab8c8' : '#6c95ab';
      g.fillRect(40, 190 + i * 34, (w - 80) * l, 14);
    });
    if (cracked) {
      g.strokeStyle = '#1b1b1b';
      g.lineWidth = 7;
      g.beginPath();
      g.moveTo(w * 0.55, 0);
      g.lineTo(w * 0.48, h * 0.3);
      g.lineTo(w * 0.62, h * 0.5);
      g.lineTo(w * 0.5, h * 0.75);
      g.lineTo(w * 0.58, h);
      g.moveTo(w * 0.62, h * 0.5);
      g.lineTo(w * 0.85, h * 0.6);
      g.stroke();
      g.fillStyle = 'rgba(20,20,20,0.35)';
      g.fillRect(0, 0, w, h);
    }
  });
}
export const SoftBox: React.FC<{position?: [number, number, number]; scale?: number; rotation?: [number, number, number]; cracked?: boolean}> = ({
  position = [0, 0, 0], scale = 1, rotation = [0, 0, 0], cracked = false,
}) => {
  const tex = codeTexture(cracked);
  return (
    <group position={position} scale={scale} rotation={rotation}>
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[3, 2.25, 0.3]} />
        <meshStandardMaterial color="#d9e2e8" />
      </mesh>
      <mesh position={[0, 1.2, 0.16]}>
        <planeGeometry args={[2.9, 2.15]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
};

// ---- メーター（回り続ける維持費） ----
export const Meter: React.FC<{position?: [number, number, number]; scale?: number; needle: number; opacity?: number; color?: string}> = ({
  position = [0, 0, 0], scale = 1, needle, opacity = 1, color = '#ffb347',
}) => {
  if (opacity <= 0.001) return null;
  return (
    <group position={position} scale={scale}>
      <mesh>
        <torusGeometry args={[0.9, 0.08, 10, 48, Math.PI * 1.5]} />
        <meshBasicMaterial color={color} transparent opacity={opacity} toneMapped={false} />
      </mesh>
      {Array.from({length: 10}).map((_, i) => {
        const a = (i / 9) * Math.PI * 1.5;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.72, Math.sin(a) * 0.72, 0]} rotation={[0, 0, a]}>
            <boxGeometry args={[0.16, 0.035, 0.02]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={opacity} />
          </mesh>
        );
      })}
      <group rotation={[0, 0, needle]}>
        <mesh position={[0.32, 0, 0.03]}>
          <boxGeometry args={[0.64, 0.06, 0.02]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={opacity} toneMapped={false} />
        </mesh>
      </group>
      <mesh position={[0, 0, 0.04]}>
        <circleGeometry args={[0.1, 16]} />
        <meshBasicMaterial color="#ffffff" transparent opacity={opacity} />
      </mesh>
    </group>
  );
};

// ---- 電源の記号 ----
export const PowerIcon: React.FC<{position?: [number, number, number]; scale?: number; on: number; crack: number}> = ({position = [0, 0, 0], scale = 1, on, crack}) => {
  const col = new THREE.Color('#9fefff').multiplyScalar(0.25 + on * 1.4);
  return (
    <group position={position} scale={scale}>
      <mesh rotation={[0, 0, Math.PI / 2 + 0.55]}>
        <torusGeometry args={[1.2, 0.17, 12, 64, Math.PI * 2 - 1.1]} />
        <meshBasicMaterial color={col} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.75, 0]}>
        <boxGeometry args={[0.34, 1.3, 0.3]} />
        <meshBasicMaterial color={col} toneMapped={false} />
      </mesh>
      {crack > 0 ? (
        <mesh position={[0.25, 0, 0.2]} rotation={[0, 0, -1.2]} scale={[crack, 1, 1]}>
          <planeGeometry args={[3.2, 0.09]} />
          <meshBasicMaterial color="#05090c" />
        </mesh>
      ) : null}
    </group>
  );
};

// ---- バッテリー ----
export const Battery: React.FC<{position?: [number, number, number]; scale?: number; level: number; opacity?: number}> = ({position = [0, 0, 0], scale = 1, level, opacity = 1}) => {
  const edges = useMemo(() => new THREE.EdgesGeometry(new THREE.BoxGeometry(2.2, 1.0, 0.1)), []);
  if (opacity <= 0.001) return null;
  const col = level > 0.35 ? '#5ef08a' : level > 0.15 ? '#ffc04a' : '#ff4a3a';
  return (
    <group position={position} scale={scale}>
      <mesh>
        <boxGeometry args={[2.2, 1.0, 0.1]} />
        <meshBasicMaterial color="#d9e4ea" transparent opacity={0.25 * opacity} />
      </mesh>
      <mesh position={[1.2, 0, 0]}>
        <boxGeometry args={[0.14, 0.4, 0.1]} />
        <meshBasicMaterial color="#d9e4ea" transparent opacity={opacity} />
      </mesh>
      <mesh position={[-1.0 + level, 0, 0.06]} scale={[Math.max(0.001, level * 2), 1, 1]}>
        <planeGeometry args={[1, 0.78]} />
        <meshBasicMaterial color={col} transparent opacity={opacity} toneMapped={false} />
      </mesh>
      <lineSegments geometry={edges}>
        <lineBasicMaterial color="#ffffff" transparent opacity={opacity} />
      </lineSegments>
    </group>
  );
};
