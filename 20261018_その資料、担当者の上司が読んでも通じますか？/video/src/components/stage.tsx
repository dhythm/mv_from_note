// 舞台: カメラ（画面全体の移動・ロール・拡縮）と、世界・HUD（主張の文字）・画面固定（帯・ワイプ）の3つの座標系。
// どれも同じ three.js のシーンにあり、カメラの姿勢はフレーム時刻だけから決まる。
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {DEG, H, clamp} from '../lib/anim';
import {HudCtx, HudT} from './prims';

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

// ---- 採用動画（企画側の透過WebM 3本）。1 コマずつの透過PNGをテクスチャにする ----
// 原本は 1280×720・24fps・6秒（144コマ）。基本は 1.5 倍速（企画書「使用する動画素材」）。
export const CLIP_FPS = 24;
export const CLIPS = {
  handoff: {frames: 144},
  question: {frames: 144},
  reader: {frames: 144},
} as const;
export type ClipId = keyof typeof CLIPS;
// 素材の画の中の人物の高さ（頭頂〜足元）は、原本 720px 中およそ 464px
export const CLIP_FIGURE = 464 / 720;

// ---- 共通キャラクター参照から切り出した10姿勢（tools/crop_sprites.py の出力と同じ値） ----
export const SPRITES = {
  'staff-neutral': {w: 158, h: 396, headX: 78},
  'staff-give': {w: 308, h: 399, headX: 80},
  'staff-read': {w: 177, h: 389, headX: 89},
  'staff-ask': {w: 251, h: 396, headX: 171},
  'staff-think': {w: 220, h: 392, headX: 59},
  'boss-neutral': {w: 158, h: 396, headX: 78},
  'boss-give': {w: 308, h: 394, headX: 80},
  'boss-read': {w: 177, h: 391, headX: 89},
  'boss-ask': {w: 251, h: 397, headX: 171},
  'boss-think': {w: 220, h: 395, headX: 59},
} as const;
export type SpriteId = keyof typeof SPRITES;

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
        if (texCache.size > 40) {
          const first = texCache.keys().next().value as string;
          if (!first.includes('/sprites/')) {
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
const ImgPlane: React.FC<{url: string; w: number; h: number; x?: number; y?: number; z?: number; opacity?: number; order?: number}> = ({url, w, h, x = 0, y = 0, z = 0, opacity = 1, order = 30}) => {
  const tex = useFrameTexture(url);
  if (!tex || opacity <= 0.001) return null;
  return (
    <mesh geometry={plane} position={[x, y, z]} scale={[w, h, 1]} renderOrder={order}>
      <meshBasicMaterial map={tex} transparent opacity={opacity} depthTest={false} depthWrite={false} toneMapped={false} />
    </mesh>
  );
};
// 素材のコマ f（0 始まり、原本 24fps のコマ番号）を幅 w で描く。中心が (0,0)。範囲外は端のコマで止める（ループしない）
export const ClipPlane: React.FC<{id: ClipId; f: number; w: number; z?: number; opacity?: number; order?: number}> = ({id, f, w, ...p}) => {
  const i = clamp(Math.floor(f + 1e-6), 0, CLIPS[id].frames - 1);
  return <ImgPlane url={staticFile(`clips/${id}/${String(i).padStart(4, '0')}.png`)} w={w} h={(w * 9) / 16} {...p} />;
};
// 人物スプライト。足元の中央（頭の中心の真下）が (0,0)、人物の高さ h
export const SpritePlane: React.FC<{id: SpriteId; h: number; z?: number; opacity?: number; order?: number}> = ({id, h, ...p}) => {
  const m = SPRITES[id];
  const k = h / m.h;
  return <ImgPlane url={staticFile(`sprites/${id}.png`)} w={m.w * k} h={h} x={(m.w / 2 - m.headX) * k} y={h / 2} {...p} />;
};
