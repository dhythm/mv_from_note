// 舞台: カメラ（画面全体の移動・ロール・拡縮）と、世界・HUD（主張の文字）・画面固定（帯・ワイプ）の3つの座標系。
// どれも同じ three.js のシーンにあり、カメラの姿勢はフレーム時刻だけから決まる。
import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import * as THREE from 'three';
import {useThree} from '@react-three/fiber';
import {cancelRender, continueRender, delayRender, staticFile} from 'remotion';
import {C, DEG, H, clamp, lerp} from '../lib/anim';
import {Disc, HudCtx, HudT, RRect} from './prims';
import m1 from '../../public/mascot/m1.json';
import m2 from '../../public/mascot/m2.json';
import m3a from '../../public/mascot/m3a.json';
import m3b from '../../public/mascot/m3b.json';

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
      {spec.screen}
    </OnCamera>
  </>
);

// ---- 切り抜いたマスコット（連番 WebP を 1 コマずつテクスチャにする） ----
type Track = {top: number; bottom: number; cx: number; lx: number; ly: number; rx: number; ry: number};
type Meta = {frames: number; crop: number[]; track: Track[]};
export const CLIPS = {m1, m2, m3a, m3b} as unknown as Record<'m1' | 'm2' | 'm3a' | 'm3b', Meta>;
export type ClipId = keyof typeof CLIPS;

const median = (a: number[]) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
const stats = new Map<ClipId, {h: number; cx: number; bottom: number}>();
function clipStats(id: ClipId) {
  let s = stats.get(id);
  if (!s) {
    const tr = CLIPS[id].track;
    s = {h: median(tr.map((e) => e.bottom - e.top)), cx: median(tr.map((e) => e.cx)), bottom: median(tr.map((e) => e.bottom))};
    stats.set(id, s);
  }
  return s;
}

// 足元 foot（世界座標）と全身高 height から、素材の画素 (u,v) → 世界座標
export function mascotMap(id: ClipId, foot: [number, number], height: number) {
  const st = clipStats(id);
  const s = height / st.h;
  const [, , cw, ch] = CLIPS[id].crop;
  return {
    s,
    w: cw * s,
    h: ch * s,
    center: [foot[0] + (cw / 2 - st.cx) * s, foot[1] + (st.bottom - ch / 2) * s] as [number, number],
    toWorld: (u: number, v: number): [number, number] => [foot[0] + (u - st.cx) * s, foot[1] + (st.bottom - v) * s],
  };
}

// 手先（画面左側の手＝キャラクターの右手）の位置。前後 n コマの平均でちらつきを抑える
export function handLeft(id: ClipId, f: number, n = 3): [number, number] {
  const tr = CLIPS[id].track;
  let su = 0;
  let sv = 0;
  let c = 0;
  for (let i = -n; i <= n; i++) {
    const e = tr[clamp(Math.round(f) + i, 0, tr.length - 1)];
    su += e.lx;
    sv += e.ly;
    c++;
  }
  return [su / c, sv / c];
}
export function handRight(id: ClipId, f: number, n = 3): [number, number] {
  const tr = CLIPS[id].track;
  let su = 0;
  let sv = 0;
  let c = 0;
  for (let i = -n; i <= n; i++) {
    const e = tr[clamp(Math.round(f) + i, 0, tr.length - 1)];
    su += e.rx;
    sv += e.ry;
    c++;
  }
  return [su / c, sv / c];
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
        // 古いテクスチャを捨てる（GPU メモリを抑える）
        if (texCache.size > 24) {
          const first = texCache.keys().next().value as string;
          texCache.get(first)?.dispose();
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
    const h = delayRender(`mascot ${url}`, {timeoutInMilliseconds: 60000});
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
  return state?.tex ?? null;
}

const plane = new THREE.PlaneGeometry(1, 1);
export const Mascot: React.FC<{id: ClipId; frame: number; foot: [number, number]; height: number; z?: number; opacity?: number; order?: number; shadow?: number}> = ({id, frame, foot, height, z = 0, opacity = 1, order = 30, shadow = 0.2}) => {
  const f = clamp(Math.round(frame), 0, CLIPS[id].frames - 1);
  const tex = useFrameTexture(staticFile(`mascot/${id}/${String(f).padStart(4, '0')}.webp`));
  const m = mascotMap(id, foot, height);
  const tr = CLIPS[id].track[f];
  const [fx] = m.toWorld(tr.cx, tr.bottom);
  return (
    <group>
      {/* 接地影（原本の床影は除いてあり、編集で作る） */}
      <Disc r={1} sx={height * 0.42} sy={height * 0.055} x={fx} y={foot[1] + 2} z={z} color={C.ink} opacity={shadow * opacity} order={24} />
      {tex && opacity > 0.001 && (
        <mesh geometry={plane} position={[m.center[0], m.center[1], z]} scale={[m.w, m.h, 1]} renderOrder={order}>
          <meshBasicMaterial map={tex} transparent opacity={opacity} depthTest={false} depthWrite={false} toneMapped={false} />
        </mesh>
      )}
    </group>
  );
};

// ---- 道具（角丸の本体・溝・つまみ） ----
export const Tool: React.FC<{x: number; y: number; z?: number; s?: number; rz?: number; knob: number; glow?: number; order?: number; w?: number; h?: number; color?: string; opacity?: number; extraRow?: number}> = ({x, y, z = 0, s = 1, rz = 0, knob, glow = 0, order = 22, w = 150, h = 84, color = C.apricot, opacity = 1, extraRow = 0}) => {
  const tw = w * 0.6;
  const kx = -tw / 2 + clamp(knob) * tw;
  const row2 = clamp(extraRow);
  const hh = lerp(h, h * 1.6, row2);
  return (
    <group position={[x, y, z]} rotation={[0, 0, rz * DEG]} scale={[s, s, 1]}>
      <RRect w={w + 18 * glow} h={hh + 18 * glow} r={22 + 9 * glow} color={C.terra} opacity={0.45 * glow * opacity} order={order} />
      <RRect w={w} h={hh} r={20} color={color} opacity={opacity} order={order} />
      <RRect w={w} h={hh} r={20} color={C.ink} border={5} opacity={opacity} order={order + 1} />
      <group position={[0, (hh - h) / 2, 0]}>
        <RRect w={tw} h={7} r={3.5} color={C.ink} opacity={opacity} order={order + 1} />
        <Disc r={13} x={kx} color={glow > 0.5 ? C.terra : C.ink} opacity={opacity} order={order + 2} />
        <Disc r={5} x={kx} color={C.kinari} opacity={opacity * glow} order={order + 3} />
      </group>
      {row2 > 0 && (
        <group position={[0, -(hh - h) / 2 - 6 * (1 - row2), 0]}>
          <RRect w={tw * row2} h={7} r={3.5} color={C.ink} opacity={opacity * row2} order={order + 1} />
          <Disc r={11 * row2} x={tw * 0.25} color={C.terra} opacity={opacity * row2} order={order + 2} />
        </group>
      )}
    </group>
  );
};
