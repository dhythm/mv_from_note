// 図の部品（three.js）。紙面・横線・画像・青い経路。影は紙面の後ろに置くぼかした面で、光源は使わない（色は指定どおりに出る）。
// どれも、渡された値から毎フレーム同じ形になる。
import React, {useMemo} from 'react';
import * as THREE from 'three';
import {C, clamp, hashR, lerp, mix} from './kit';

export type V3 = [number, number, number];
export const PLANE = new THREE.PlaneGeometry(1, 1);
const CIRCLE = new THREE.CircleGeometry(0.5, 28);

// ---- 紙面の中身。紙面の左上を原点に、世界の単位で返す ----
export type Bar = {x: number; y: number; w: number; h: number; c: string};
export type Kind = 'dense' | 'wall' | 'point' | 'doc' | 'figure' | 'blank';
export const M = 0.36; // 紙面の余白
export const TH = 0.075; // 横線の太さ
export const HTH = 0.14; // 見出しの太さ
export const PITCH = 0.27;

export function layout(kind: Kind, w: number, h: number, seed = 1): Bar[] {
  const out: Bar[] = [];
  const iw = w - M * 2;
  let y = M;
  const line = (i: number, k = 1) => {
    const ind = [0, 0.1, 0.2][i % 3] * Math.min(1, iw / 6);
    out.push({x: M + ind, y, w: (iw - ind) * hashR(seed * 31 + i * 7, 0.8, 1) * k, h: TH, c: C.line});
    y += PITCH;
  };
  const head = (k: number) => {
    out.push({x: M, y, w: iw * k, h: HTH, c: C.ink});
    y += HTH + 0.2;
  };
  if (kind === 'blank') return out;
  if (kind === 'wall') {
    for (let i = 0; y < h - M - TH; i++) line(i);
  } else if (kind === 'dense') {
    head(hashR(seed, 0.34, 0.52));
    for (let i = 0; y < h - M - TH; i++) line(i);
  } else if (kind === 'point') {
    head(hashR(seed, 0.42, 0.7));
    line(0, 0.92);
    line(1, 0.86);
  } else if (kind === 'figure') {
    head(hashR(seed, 0.42, 0.6));
    out.push({x: M, y: y + 0.05, w: iw * 0.42, h: h - y - M - 0.05, c: C.beige});
    out.push({x: M + iw * 0.5, y: y + 0.12, w: iw * 0.46, h: TH, c: C.line});
    out.push({x: M + iw * 0.5, y: y + 0.12 + PITCH, w: iw * 0.36, h: TH, c: C.line});
  } else if (kind === 'doc') {
    for (let g = 0; g < 3 && y < h - M - 1; g++) {
      head(hashR(seed + g * 5, 0.3, 0.5));
      const n = Math.max(2, Math.floor((h - M * 2) / 3 / PITCH) - 2);
      for (let i = 0; i < n; i++) line(g * 10 + i);
      y += 0.3;
    }
  }
  return out;
}

const texCache = new Map<string, THREE.CanvasTexture>();
function sheetTex(kind: Kind, w: number, h: number, seed: number) {
  const key = `${kind}|${w}|${h}|${seed}`;
  let t = texCache.get(key);
  if (!t) {
    const px = Math.min(180, 2048 / w);
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * px);
    cv.height = Math.round(h * px);
    const g = cv.getContext('2d') as CanvasRenderingContext2D;
    g.fillStyle = C.sheet;
    g.fillRect(0, 0, cv.width, cv.height);
    g.strokeStyle = C.edge;
    g.lineWidth = Math.max(2, px * 0.025);
    g.strokeRect(g.lineWidth / 2, g.lineWidth / 2, cv.width - g.lineWidth, cv.height - g.lineWidth);
    for (const b of layout(kind, w, h, seed)) {
      g.fillStyle = b.c;
      g.fillRect(b.x * px, b.y * px, b.w * px, b.h * px);
    }
    t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    texCache.set(key, t);
  }
  return t;
}

let shadowT: THREE.CanvasTexture | null = null;
const SH_IN = 0.2; // 影の画像のうち、ぼかしに使う縁の割合
function shadowTex() {
  if (!shadowT) {
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g = cv.getContext('2d') as CanvasRenderingContext2D;
    g.filter = 'blur(14px)';
    g.fillStyle = 'rgba(40,30,14,1)';
    g.fillRect(256 * SH_IN, 256 * SH_IN, 256 * (1 - SH_IN * 2), 256 * (1 - SH_IN * 2));
    shadowT = new THREE.CanvasTexture(cv);
  }
  return shadowT;
}

// 紙面の後ろの影
export const Shadow: React.FC<{w: number; h: number; op?: number; lift?: number}> = ({w, h, op = 1, lift = 1}) =>
  op <= 0.01 ? null : (
    <mesh geometry={PLANE} position={[0.1 * lift, -0.16 * lift, -0.05]} scale={[(w + 0.3 * lift) / (1 - SH_IN * 2), (h + 0.3 * lift) / (1 - SH_IN * 2), 1]} renderOrder={-1}>
      <meshBasicMaterial map={shadowTex()} transparent opacity={0.2 * op} depthWrite={false} toneMapped={false} />
    </mesh>
  );

// 色の面。p は中心
export const Rect: React.FC<{p: V3; w: number; h: number; c: string; op?: number; rz?: number; fog?: boolean}> = ({p, w, h, c, op = 1, rz = 0, fog = true}) =>
  op <= 0.004 || w <= 0.0005 || h <= 0.0005 ? null : (
    <mesh geometry={PLANE} position={p} rotation={[0, 0, rz]} scale={[w, h, 1]}>
      <meshBasicMaterial color={c} transparent={op < 1} opacity={op} depthWrite={op >= 1} toneMapped={false} fog={fog} side={THREE.DoubleSide} />
    </mesh>
  );

// 紙面（中身は絵として貼る）。p は中心
export const Sheet: React.FC<{p: V3; w: number; h: number; kind?: Kind; seed?: number; r?: V3; s?: number | V3; op?: number; shadow?: number; children?: React.ReactNode}> = ({p, w, h, kind = 'dense', seed = 1, r = [0, 0, 0], s = 1, op = 1, shadow = 1, children}) => {
  if (op <= 0.004) return null;
  const sc: V3 = typeof s === 'number' ? [s, s, s] : s;
  return (
    <group position={p} rotation={r} scale={sc}>
      <Shadow w={w} h={h} op={op * shadow} />
      <mesh geometry={PLANE} scale={[w, h, 1]}>
        <meshBasicMaterial map={sheetTex(kind, w, h, seed)} transparent={op < 1} opacity={op} depthWrite={op >= 1} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
      {children}
    </group>
  );
};

// 横線の集まり（中心の座標で渡す。紙面の中でも、紙面なしでも使う）
export type BarC = {x: number; y: number; w: number; h: number; c: string; op?: number; z?: number};
export const Bars: React.FC<{items: BarC[]; z?: number}> = ({items, z = 0.012}) => (
  <>
    {items.map((b, i) => (
      <Rect key={i} p={[b.x, b.y, z + (b.z ?? 0)]} w={b.w} h={b.h} c={b.c} op={b.op ?? 1} />
    ))}
  </>
);

// 左上原点の中身 → 中心の座標（紙面 w×h の中）
export const centered = (bars: Bar[], w: number, h: number): BarC[] => bars.map((b) => ({x: -w / 2 + b.x + b.w / 2, y: h / 2 - b.y - b.h / 2, w: b.w, h: b.h, c: b.c}));
// 二つの中身のあいだ（本数は同じ）
export const lerpBars = (a: Bar[], b: Bar[], k: number): Bar[] => a.map((p, i) => ({x: lerp(p.x, b[i].x, k), y: lerp(p.y, b[i].y, k), w: lerp(p.w, b[i].w, k), h: lerp(p.h, b[i].h, k), c: p.c === b[i].c ? p.c : mix(p.c, b[i].c, k)}));

// 画像の面。p は中心
export const Pic: React.FC<{tex: THREE.Texture; p: V3; w: number; h: number; r?: V3; s?: number; op?: number; shadow?: number; children?: React.ReactNode}> = ({tex, p, w, h, r = [0, 0, 0], s = 1, op = 1, shadow = 1, children}) =>
  op <= 0.004 ? null : (
    <group position={p} rotation={r} scale={[s, s, s]}>
      <Shadow w={w} h={h} op={op * shadow} lift={1.4} />
      <mesh geometry={PLANE} scale={[w, h, 1]}>
        <meshBasicMaterial map={tex} transparent={op < 1} opacity={op} depthWrite={op >= 1} toneMapped={false} fog={false} side={THREE.DoubleSide} />
      </mesh>
      {children}
    </group>
  );

// 青い経路。点の列をなめらかにつなぎ、k0〜k1 の区間だけを帯として描く（線が描かれていく）。両端は丸い。
const SEG = 220;
export const Ribbon: React.FC<{pts: V3[]; k0?: number; k1?: number; width?: number; color?: string; op?: number; tension?: number; closed?: boolean; caps?: boolean}> = ({pts, k0 = 0, k1 = 1, width = 0.14, color = C.blue, op = 1, tension = 0.5, closed = false, caps = true}) => {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array((SEG + 1) * 2 * 3), 3));
    const idx: number[] = [];
    for (let i = 0; i < SEG; i++) idx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    g.setIndex(idx);
    return g;
  }, []);
  const a = clamp(k0);
  const b = clamp(k1);
  if (b - a < 0.0015 || op <= 0.004 || pts.length < 2) return null;
  const curve = new THREE.CatmullRomCurve3(
    pts.map((p) => new THREE.Vector3(...p)),
    closed,
    'catmullrom',
    tension,
  );
  curve.arcLengthDivisions = 400;
  const pos = geo.getAttribute('position') as THREE.BufferAttribute;
  const P = new THREE.Vector3();
  const T = new THREE.Vector3();
  let head: V3 = [0, 0, 0];
  let tail: V3 = [0, 0, 0];
  for (let i = 0; i <= SEG; i++) {
    const u = lerp(a, b, i / SEG);
    curve.getPointAt(u, P);
    curve.getTangentAt(u, T);
    const n = Math.hypot(T.x, T.y) || 1;
    const nx = (-T.y / n) * width * 0.5;
    const ny = (T.x / n) * width * 0.5;
    pos.setXYZ(i * 2, P.x + nx, P.y + ny, P.z);
    pos.setXYZ(i * 2 + 1, P.x - nx, P.y - ny, P.z);
    if (i === 0) tail = [P.x, P.y, P.z];
    if (i === SEG) head = [P.x, P.y, P.z];
  }
  pos.needsUpdate = true;
  const mat = <meshBasicMaterial color={color} transparent={op < 1} opacity={op} depthWrite={op >= 1} toneMapped={false} side={THREE.DoubleSide} />;
  return (
    <>
      <mesh geometry={geo} frustumCulled={false}>
        {mat}
      </mesh>
      {caps && !closed ? (
        <>
          <mesh geometry={CIRCLE} position={head} scale={[width, width, 1]}>
            {mat}
          </mesh>
          <mesh geometry={CIRCLE} position={tail} scale={[width, width, 1]}>
            {mat}
          </mesh>
        </>
      ) : null}
    </>
  );
};

// 角の丸い折れ線の点列（経路の角を作る）。pts の各角を半径 r で丸める
export function rounded(pts: [number, number][], r: number, z = 0, per = 5): V3[] {
  const out: V3[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (i === 0 || i === pts.length - 1) {
      out.push([p[0], p[1], z]);
      continue;
    }
    const a = pts[i - 1];
    const b = pts[i + 1];
    const la = Math.hypot(a[0] - p[0], a[1] - p[1]);
    const lb = Math.hypot(b[0] - p[0], b[1] - p[1]);
    const rr = Math.min(r, la / 2, lb / 2);
    const s: [number, number] = [p[0] + ((a[0] - p[0]) / la) * rr, p[1] + ((a[1] - p[1]) / la) * rr];
    const e: [number, number] = [p[0] + ((b[0] - p[0]) / lb) * rr, p[1] + ((b[1] - p[1]) / lb) * rr];
    for (let k = 0; k <= per; k++) {
      const u = k / per;
      const x = (1 - u) * (1 - u) * s[0] + 2 * u * (1 - u) * p[0] + u * u * e[0];
      const y = (1 - u) * (1 - u) * s[1] + 2 * u * (1 - u) * p[1] + u * u * e[1];
      out.push([x, y, z]);
    }
  }
  return out;
}

// 枠（四辺を順に描く）。p は中心。k: 0→1
export const Frame: React.FC<{p: V3; w: number; h: number; k: number; width?: number; color?: string; op?: number}> = ({p, w, h, k, width = 0.07, color = C.blue, op = 1}) => {
  if (k <= 0.001) return null;
  const x0 = p[0] - w / 2;
  const x1 = p[0] + w / 2;
  const y0 = p[1] - h / 2;
  const y1 = p[1] + h / 2;
  const per = 2 * (w + h);
  const edges: [number, number, number, number][] = [
    [x0, y1, x1, y1],
    [x1, y1, x1, y0],
    [x1, y0, x0, y0],
    [x0, y0, x0, y1],
  ];
  let done = 0;
  const out: React.ReactNode[] = [];
  edges.forEach(([ax, ay, bx, by], i) => {
    const len = Math.hypot(bx - ax, by - ay);
    const f = clamp((k * per - done) / len);
    done += len;
    if (f <= 0) return;
    const ex = lerp(ax, bx, f);
    const ey = lerp(ay, by, f);
    const horiz = ay === by;
    out.push(<Rect key={i} p={[(ax + ex) / 2, (ay + ey) / 2, p[2]]} w={horiz ? Math.abs(ex - ax) + width : width} h={horiz ? width : Math.abs(ey - ay) + width} c={color} op={op} fog={false} />);
  });
  return <>{out}</>;
};
