import React, {useMemo} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {useCurrentFrame} from 'remotion';
import {FPS, ease, prog} from '../lib/anim';
import {cameraPose} from '../lib/camera';
import {CARDS, ROW_Y, beamAlpha, beamX, cardPose} from '../lib/cards';
import {PAGE_H, PAGE_W, bookPose} from '../lib/book';
import {C, beamTexture, cardFaceTexture, glowTexture, pageTexture, paperTexture} from '../lib/textures';
import {TextRig} from './TextRig';

const SHADES = ['#2e3a51', '#34415a', '#3b4862', '#283247'];
const AMBER = new THREE.Color(C.amber);

function useCardMaterials() {
  return useMemo(() => {
    const faces = new Map<string, THREE.CanvasTexture>();
    const sides = SHADES.map((s) => new THREE.MeshStandardMaterial({color: s, roughness: 0.85}));
    return CARDS.map((d) => {
      const key = `${d.variant}-${d.shade}`;
      if (!faces.has(key)) faces.set(key, cardFaceTexture(d.variant, SHADES[d.shade]));
      const front = new THREE.MeshStandardMaterial({map: faces.get(key)!, roughness: 0.8, emissive: AMBER, emissiveIntensity: 0});
      const side = sides[d.shade];
      // Box の面順: +x, -x, +y, -y, +z(表), -z
      return [side, side, side, side, front, side] as THREE.Material[];
    });
  }, []);
}

const Cards: React.FC<{t: number}> = ({t}) => {
  const mats = useCardMaterials();
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 0.035), []);
  return (
    <>
      {CARDS.map((d, i) => {
        const p = cardPose(d, t);
        if (!p.visible) return null;
        (mats[i][4] as THREE.MeshStandardMaterial).emissiveIntensity = p.lit * 1.3;
        return (
          <mesh
            key={d.i}
            geometry={geo}
            material={mats[i]}
            position={[p.x, p.y, p.z]}
            rotation={[p.rx, p.ry, p.rz]}
            scale={[p.w, p.h, 1]}
            castShadow
            receiveShadow
          />
        );
      })}
    </>
  );
};

const Book: React.FC<{t: number}> = ({t}) => {
  const m = useMemo(() => {
    const edge = new THREE.MeshStandardMaterial({color: '#d9d4ca', roughness: 0.9});
    const plain = new THREE.MeshStandardMaterial({color: C.white, roughness: 0.9});
    const asset = new THREE.MeshStandardMaterial({map: pageTexture('資産', C.navy), roughness: 0.85, emissive: AMBER, emissiveIntensity: 0});
    const assetCover = new THREE.MeshStandardMaterial({map: pageTexture('資産', C.navy), roughness: 0.85});
    const debt = new THREE.MeshStandardMaterial({map: pageTexture('負債', C.red), roughness: 0.85});
    return {
      left: [edge, edge, edge, edge, asset, plain] as THREE.Material[],
      right: [edge, edge, edge, edge, debt, assetCover] as THREE.Material[],
      asset,
      glow: glowTexture('#f2a640'),
    };
  }, []);
  const geo = useMemo(() => new THREE.BoxGeometry(PAGE_W, PAGE_H, 0.05), []);
  const b = bookPose(t);
  if (b.scale <= 0.001) return null;
  (m.asset as THREE.MeshStandardMaterial).emissiveIntensity = b.assetGlow * 0.22;
  const glow = Math.max(b.glow, b.assetGlow * 0.7);
  return (
    <>
      {glow > 0.01 ? (
        <>
          {/* 光は紙のすぐ上に置き、カードの隙間からだけ見えるようにする */}
          <mesh position={[b.x, b.y, -0.22]} renderOrder={1}>
            <planeGeometry args={[7, 7]} />
            <meshBasicMaterial map={m.glow} transparent opacity={glow * 0.7} depthWrite={false} toneMapped={false} />
          </mesh>
        </>
      ) : null}
      <group position={[b.x, b.y, b.z]} rotation={[b.rx, b.ry, b.rz]} scale={b.scale}>
        <group rotation={[0, b.leftAngle, 0]}>
          <mesh geometry={geo} material={m.left} position={[-PAGE_W / 2, 0, 0]} castShadow receiveShadow />
        </group>
        <group position={[0, 0, 0.06]} rotation={[0, b.rightAngle, 0]}>
          <mesh geometry={geo} material={m.right} position={[PAGE_W / 2, 0, 0]} castShadow receiveShadow />
        </group>
      </group>
    </>
  );
};

// 棚の線（整列の土台）。左右へ描き出される
const ShelfLines: React.FC<{t: number}> = ({t}) => {
  const k = ease.outQuint(prog(t, 49.6, 51.2));
  if (k <= 0) return null;
  return (
    <>
      {ROW_Y.map((y, r) => (
        <mesh key={r} position={[0, y - 0.66, 0.2]} scale={[21.5 * k, 1, 1]} receiveShadow castShadow>
          <boxGeometry args={[1, 0.055, 0.3]} />
          <meshStandardMaterial color={C.navyDeep} roughness={0.7} />
        </mesh>
      ))}
    </>
  );
};

// RAG の走査光: 左から右へ進み、途中で止まって明滅する
const Beam: React.FC<{t: number}> = ({t}) => {
  const tex = useMemo(() => beamTexture(), []);
  const a = beamAlpha(t);
  if (a <= 0.001) return null;
  const x = beamX(t);
  const trailW = x + 13;
  return (
    <group position={[0, 0, 1.1]}>
      <mesh position={[x, 0, 0]} renderOrder={6}>
        <planeGeometry args={[0.9, 8.6]} />
        <meshBasicMaterial map={tex} transparent opacity={a} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {trailW > 0 ? (
        <mesh position={[x - trailW / 2, 0, -0.05]} renderOrder={5}>
          <planeGeometry args={[trailW, 7.6]} />
          <meshBasicMaterial color={C.amber} transparent opacity={0.025 * a} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
        </mesh>
      ) : null}
    </group>
  );
};

const Background: React.FC = () => {
  const tex = useMemo(() => paperTexture(), []);
  return (
    <mesh position={[0, 0, -0.3]} receiveShadow>
      <planeGeometry args={[220, 220]} />
      <meshStandardMaterial map={tex} roughness={1} />
    </mesh>
  );
};

export const Scene: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const cam = cameraPose(t);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  // カメラはフレームから求めた姿勢をそのまま適用（積み上げなし）。描画前に確定させるため render 中に設定する
  camera.position.copy(cam.pos);
  camera.quaternion.copy(cam.quat);
  camera.fov = cam.fov;
  camera.near = 0.1;
  camera.far = 400;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  return (
    <>
      <color attach="background" args={[C.paper]} />
      <ambientLight intensity={1.55} />
      <hemisphereLight args={['#ffffff', '#c9c2b6', 0.6]} />
      <directionalLight
        position={[-7, 10, 18]}
        intensity={2.1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-near={1}
        shadow-camera-far={60}
        shadow-bias={-0.0004}
        shadow-radius={6}
      />
      <Background />
      <Cards t={t} />
      <Book t={t} />
      <ShelfLines t={t} />
      <Beam t={t} />
      <TextRig cam={cam} />
    </>
  );
};
