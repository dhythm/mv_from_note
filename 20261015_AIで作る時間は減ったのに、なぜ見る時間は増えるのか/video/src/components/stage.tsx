// 舞台: カメラ（画面全体の移動・ロール・拡縮）と、世界・HUD（主張の文字）・画面固定（帯・ワイプ）の3つの座標系。
// どれも同じ three.js のシーンにあり、カメラの姿勢はフレーム時刻だけから決まる。
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {DEG, H, clamp} from '../lib/anim';
import {HudCtx, HudT} from './prims';
import t07 from '../../../assets/blender/tracks/07_before.json';
import t08 from '../../../assets/blender/tracks/08_backlog.json';
import t13 from '../../../assets/blender/tracks/13_quality_gates.json';
import t15 from '../../../assets/blender/tracks/15_feedback_loop.json';

export const FOV = 40;
export const D = H / 2 / Math.tan((FOV / 2) * DEG);

export type Cam = {x: number; y: number; roll: number; zoom: number};
export type StageSpec = {
  bg: string;
  cam: Cam;
  hud: HudT;
  world: React.ReactNode;
  hudNodes?: React.ReactNode;
  screen?: React.ReactNode;
};

// 世界の点（z=wz）→ 画面の px（中央原点・y 上向き）
export function worldToScreen(cam: Cam, wx: number, wy: number, wz = 0): [number, number] {
  const k = (D / (D - wz)) * cam.zoom;
  const dx = (wx - cam.x) * k;
  const dy = (wy - cam.y) * k;
  const c = Math.cos(cam.roll * DEG);
  const s = Math.sin(cam.roll * DEG);
  return [dx * c - dy * s, dx * s + dy * c];
}

const CameraRig: React.FC<{cam: Cam; bg: string}> = ({cam, bg}) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const scene = useThree((s) => s.scene);
  camera.position.set(cam.x, cam.y, D);
  camera.rotation.set(0, 0, -cam.roll * DEG);
  camera.zoom = cam.zoom;
  camera.near = 1;
  camera.far = 30000;
  camera.fov = FOV;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  scene.background = new THREE.Color(bg);
  return null;
};

// カメラに貼り付いた層（ズームを打ち消し、1 単位 = 画面 1px）
const OnCamera: React.FC<{cam: Cam; children: React.ReactNode}> = ({cam, children}) => (
  <group position={[cam.x, cam.y, D]} rotation={[0, 0, -cam.roll * DEG]}>
    <group position={[0, 0, -D]} scale={[1 / cam.zoom, 1 / cam.zoom, 1]}>
      {children}
    </group>
  </group>
);

export const Stage: React.FC<{spec: StageSpec; t: number}> = ({spec, t}) => (
  <>
    <CameraRig cam={spec.cam} bg={spec.bg} />
    {spec.world}
    <OnCamera cam={spec.cam}>
      <group position={[spec.hud.x, spec.hud.y, 0]} rotation={[0, 0, spec.hud.roll * DEG]} scale={[spec.hud.s, spec.hud.s, 1]}>
        <HudCtx.Provider value={{hud: spec.hud, t}}>{spec.hudNodes}</HudCtx.Provider>
      </group>
      <HudCtx.Provider value={{hud: {x: 0, y: 0, roll: 0, s: 1}, t}}>{spec.screen}</HudCtx.Provider>
    </OnCamera>
  </>
);

// ---- 採用動画（企画側の Blender 素材）。1 コマずつの JPEG をテクスチャにする ----
export const CLIPS = {
  '07_before': {frames: 330, track: t07},
  '08_backlog': {frames: 480, track: t08},
  '13_quality_gates': {frames: 480, track: t13},
  '15_feedback_loop': {frames: 360, track: t15},
} as const;
export type ClipId = keyof typeof CLIPS;
type Anchor = {x: number; y: number; visible: boolean};

// 追従座標（正規化。左上 (0,0)、右下 (1,1)）。f は素材の 0 始まりのコマ
export function anchorAt(id: ClipId, name: string, f: number): Anchor | null {
  const fr = (CLIPS[id].track as unknown as {frames: {anchors: Record<string, Anchor>}[]}).frames;
  const e = fr[clamp(Math.round(f), 0, fr.length - 1)].anchors[name];
  return e ?? null;
}
// パネル（中心 0,0・幅 w）の中の座標へ。ラベルはパネルと同じ親座標に置く
export function anchorLocal(id: ClipId, name: string, f: number, w: number): [number, number, boolean] {
  const a = anchorAt(id, name, f);
  if (!a) return [0, 0, false];
  const h = (w * 9) / 16;
  return [(a.x - 0.5) * w, (0.5 - a.y) * h, a.visible && a.x > 0.02 && a.x < 0.98 && a.y > 0.02 && a.y < 0.98];
}

const texCache = new Map<string, THREE.Texture>();
function loadTex(url: string) {
  const hit = texCache.get(url);
  if (hit) return Promise.resolve(hit);
  return new Promise<THREE.Texture>((resolve, reject) => {
    new THREE.TextureLoader().load(
      url,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.anisotropy = 4;
        texCache.set(url, tex);
        if (texCache.size > 16) {
          const first = texCache.keys().next().value as string;
          if (!first.includes('/stills/')) {
            texCache.get(first)?.dispose();
          }
          texCache.delete(first);
        }
        resolve(tex);
      },
      undefined,
      reject,
    );
  });
}

// 画像の読み込みが終わってから R3F に描かせ、その後でフレームの書き出しを進める
function useFrameTexture(url: string) {
  const advance = useThree((s) => s.advance);
  const [state, setState] = useState<{url: string; tex: THREE.Texture} | null>(null);
  const handle = useRef<number | null>(null);
  useLayoutEffect(() => {
    let alive = true;
    const h = delayRender(`texture ${url}`, {timeoutInMilliseconds: 60000});
    handle.current = h;
    loadTex(url)
      .then((tex) => {
        if (alive) setState({url, tex});
        else continueRender(h);
      })
      .catch((err) => cancelRender(err));
    return () => {
      alive = false;
      if (handle.current === h) {
        continueRender(h);
        handle.current = null;
      }
    };
  }, [url]);
  useEffect(() => {
    if (state && state.url === url && handle.current !== null) {
      advance(performance.now());
      const h = handle.current;
      handle.current = null;
      requestAnimationFrame(() => continueRender(h));
    }
  }, [state, url, advance]);
  return state && state.url === url ? state.tex : (state?.tex ?? null);
}

const plane = new THREE.PlaneGeometry(1, 1);
const ImgPlane: React.FC<{url: string; w: number; z?: number; opacity?: number; order?: number}> = ({url, w, z = 0, opacity = 1, order = 8}) => {
  const tex = useFrameTexture(url);
  if (!tex || opacity <= 0.001) return null;
  return (
    <mesh geometry={plane} position={[0, 0, z]} scale={[w, (w * 9) / 16, 1]} renderOrder={order}>
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};
// 素材のコマ f（0 始まり、等速なら f = 経過秒 × 30）を幅 w で描く
export const ClipPlane: React.FC<{id: ClipId; f: number; w: number; z?: number; opacity?: number; order?: number}> = ({id, f, ...p}) => {
  const i = clamp(Math.floor(f + 1e-6), 0, CLIPS[id].frames - 1);
  return <ImgPlane url={staticFile(`clips/${id}/${String(i).padStart(4, '0')}.jpg`)} {...p} />;
};
export const StillPlane: React.FC<{name: '08_backlog-end' | '15_feedback_loop-end'; w: number; z?: number; opacity?: number; order?: number}> = ({name, ...p}) => <ImgPlane url={staticFile(`stills/${name}.jpg`)} {...p} />;
