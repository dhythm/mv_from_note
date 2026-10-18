// three.js の基本要素。すべて画面と同じ px 単位の平面で、重ね順は renderOrder で明示する
// （背景 0–9 → 後景の看板・文字 10–19 → 道具・接地影 20–29 → キャラクター 30 → 前景の縁・札 40–49 → 主張の文字 60–）。
import React, {createContext, useContext, useMemo} from 'react';
import * as THREE from 'three';
import {C, DEG, H, W, clamp, ease, hash, lerp, prog} from '../lib/anim';

export type Tf = {x?: number; y?: number; z?: number; rx?: number; ry?: number; rz?: number; s?: number; sx?: number; sy?: number};
const pos = (p: Tf): [number, number, number] => [p.x ?? 0, p.y ?? 0, p.z ?? 0];
const rot = (p: Tf): [number, number, number] => [(p.rx ?? 0) * DEG, (p.ry ?? 0) * DEG, (p.rz ?? 0) * DEG];
const scl = (p: Tf): [number, number, number] => [(p.s ?? 1) * (p.sx ?? 1), (p.s ?? 1) * (p.sy ?? 1), 1];

export const G: React.FC<Tf & {children: React.ReactNode}> = ({children, ...p}) => (
  <group position={pos(p)} rotation={rot(p)} scale={scl(p)}>
    {children}
  </group>
);

const Mat: React.FC<{color?: string; opacity?: number; map?: THREE.Texture | null}> = ({color = '#ffffff', opacity = 1, map}) => (
  <meshBasicMaterial color={color} transparent opacity={opacity} depthTest={false} depthWrite={false} toneMapped={false} map={map ?? null} side={THREE.DoubleSide} />
);

// ---- 角丸の板（枠線つき可） ----
function rrPath(p: THREE.Shape | THREE.Path, w: number, h: number, r: number) {
  const x = -w / 2;
  const y = -h / 2;
  r = Math.max(0.01, Math.min(r, w / 2, h / 2));
  p.moveTo(x + r, y);
  p.lineTo(x + w - r, y);
  p.quadraticCurveTo(x + w, y, x + w, y + r);
  p.lineTo(x + w, y + h - r);
  p.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  p.lineTo(x + r, y + h);
  p.quadraticCurveTo(x, y + h, x, y + h - r);
  p.lineTo(x, y + r);
  p.quadraticCurveTo(x, y, x + r, y);
}
const geoCache = new Map<string, THREE.BufferGeometry>();
function rrGeo(w: number, h: number, r: number, border = 0) {
  const k = `${w.toFixed(1)}|${h.toFixed(1)}|${r.toFixed(1)}|${border.toFixed(1)}`;
  let g = geoCache.get(k);
  if (!g) {
    const s = new THREE.Shape();
    rrPath(s, w, h, r);
    if (border > 0 && w > border * 2 && h > border * 2) {
      const hole = new THREE.Path();
      rrPath(hole, w - border * 2, h - border * 2, Math.max(0, r - border));
      s.holes.push(hole);
    }
    g = new THREE.ShapeGeometry(s, 8);
    geoCache.set(k, g);
    if (geoCache.size > 3000) geoCache.clear();
  }
  return g;
}

export const RRect: React.FC<Tf & {w: number; h: number; r?: number; color: string; opacity?: number; border?: number; order?: number}> = ({w, h, r = 12, color, opacity = 1, border = 0, order = 10, ...p}) => {
  if (opacity <= 0.001 || w <= 0 || h <= 0) return null;
  return (
    <mesh geometry={rrGeo(w, h, r, border)} position={pos(p)} rotation={rot(p)} scale={scl(p)} renderOrder={order}>
      <Mat color={color} opacity={opacity} />
    </mesh>
  );
};

// ---- 円・輪 ----
const ringCache = new Map<string, THREE.BufferGeometry>();
function ringGeo(inner: number, outer: number, start: number, len: number) {
  const k = `${inner.toFixed(1)}|${outer.toFixed(1)}|${start.toFixed(3)}|${len.toFixed(3)}`;
  let g = ringCache.get(k);
  if (!g) {
    g = new THREE.RingGeometry(inner, outer, 96, 1, start, len);
    ringCache.set(k, g);
    if (ringCache.size > 3000) ringCache.clear();
  }
  return g;
}
export const Ring: React.FC<Tf & {r: number; width: number; color: string; opacity?: number; arc?: number; start?: number; order?: number}> = ({r, width, color, opacity = 1, arc = 1, start = 90, order = 10, ...p}) => {
  if (opacity <= 0.001 || arc <= 0.001 || r <= 0) return null;
  return (
    <mesh geometry={ringGeo(Math.max(0, r - width / 2), r + width / 2, start * DEG, Math.min(1, arc) * Math.PI * 2)} position={pos(p)} rotation={rot(p)} scale={scl(p)} renderOrder={order}>
      <Mat color={color} opacity={opacity} />
    </mesh>
  );
};
const discGeo = new THREE.CircleGeometry(1, 64);
export const Disc: React.FC<Tf & {r: number; color: string; opacity?: number; order?: number}> = ({r, color, opacity = 1, order = 10, ...p}) => {
  if (opacity <= 0.001 || r <= 0) return null;
  const s = scl(p);
  return (
    <mesh geometry={discGeo} position={pos(p)} rotation={rot(p)} scale={[r * s[0], r * s[1], 1]} renderOrder={order}>
      <Mat color={color} opacity={opacity} />
    </mesh>
  );
};

// ---- 文字（キャンバスで描いた字をテクスチャにする） ----
export const FONT = 'NotoJP';
const TEX_SCALE = 2.5; // 拡大しても滲まないように 2.5 倍で描く
const texCache = new Map<string, {tex: THREE.CanvasTexture; w: number; h: number}>();
let measureCtx: CanvasRenderingContext2D | null = null;
export function measure(text: string, size: number, weight: number) {
  if (!measureCtx) measureCtx = document.createElement('canvas').getContext('2d');
  const ctx = measureCtx!;
  ctx.font = `${weight} ${size}px ${FONT}`;
  return ctx.measureText(text).width;
}
export function textTex(text: string, size: number, weight: number, color: string) {
  const k = `${text}|${size}|${weight}|${color}`;
  let e = texCache.get(k);
  if (!e) {
    const w = Math.ceil(measure(text, size, weight) + size * 0.2);
    const h = Math.ceil(size * 1.45);
    const cv = document.createElement('canvas');
    cv.width = Math.ceil(w * TEX_SCALE);
    cv.height = Math.ceil(h * TEX_SCALE);
    const ctx = cv.getContext('2d')!;
    ctx.scale(TEX_SCALE, TEX_SCALE);
    ctx.font = `${weight} ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, w / 2, h / 2 + size * 0.04);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    e = {tex, w, h};
    texCache.set(k, e);
  }
  return e;
}
const unitPlane = new THREE.PlaneGeometry(1, 1);

export const Txt: React.FC<Tf & {text: string; size: number; weight?: number; color: string; opacity?: number; order?: number; align?: 'center' | 'left'}> = ({text, size, weight = 800, color, opacity = 1, order = 60, align = 'center', ...p}) => {
  if (opacity <= 0.001) return null;
  const e = textTex(text, size, weight, color);
  const s = scl(p);
  const ox = align === 'left' ? e.w / 2 - size * 0.1 : 0;
  return (
    <group position={pos(p)} rotation={rot(p)} scale={s}>
      <mesh geometry={unitPlane} position={[ox, 0, 0]} scale={[e.w, e.h, 1]} renderOrder={order}>
        <Mat map={e.tex} opacity={opacity} />
      </mesh>
    </group>
  );
};

// ---- 画面へ貼り付く文字層（HUD）の変形。文字の画面外検査にも使う ----
export type HudT = {x: number; y: number; roll: number; s: number};
export const HudCtx = createContext<{hud: HudT; t: number}>({hud: {x: 0, y: 0, roll: 0, s: 1}, t: 0});
export function hudToScreen(h: HudT, x: number, y: number): [number, number] {
  const c = Math.cos(h.roll * DEG);
  const s = Math.sin(h.roll * DEG);
  return [h.x + h.s * (x * c - y * s), h.y + h.s * (x * s + y * c)];
}
export function screenToHud(h: HudT, sx: number, sy: number): [number, number] {
  const dx = (sx - h.x) / h.s;
  const dy = (sy - h.y) / h.s;
  const c = Math.cos(-h.roll * DEG);
  const s = Math.sin(-h.roll * DEG);
  return [dx * c - dy * s, dx * s + dy * c];
}
const SAFE_X = W / 2 - W * 0.05;
const SAFE_Y = H / 2 - H * 0.05;

// ---- キネティックな文（1 文字ずつの登場・読む間の揺れ・退場） ----
export type InStyle = 'flip' | 'slam' | 'drop' | 'rise' | 'spin';
export type OutStyle = 'fly' | 'sink' | 'burst' | 'none';
export type CharState = {x: number; y: number; z: number; rx: number; ry: number; rz: number; s: number; op: number};
export type KLineProps = {
  lines: string[];
  size: number;
  weight?: number;
  color?: string;
  x: number;
  y: number;
  align?: 'left' | 'center';
  t0: number;
  t1: number;
  inStyle?: InStyle;
  outStyle?: OutStyle;
  inDur?: number;
  outDur?: number;
  stagger?: number;
  seed?: number;
  order?: number;
  lineGap?: number;
  // 強調: [行, 文字] → 倍率と色
  emph?: (li: number, ci: number) => {scale?: number; color?: string} | null;
  // 各文字の追加の動き（読む間の配置替えなど）
  extra?: (c: {li: number; ci: number; i: number; n: number; x: number; y: number; t: number}) => Partial<CharState>;
  wave?: number;
};

export function layoutLines(p: KLineProps) {
  const weight = p.weight ?? 800;
  const gap = p.lineGap ?? 1.24;
  const out: {ch: string; li: number; ci: number; x: number; y: number; size: number; color: string}[] = [];
  let y = 0;
  p.lines.forEach((line, li) => {
    const chars = Array.from(line);
    const sizes = chars.map((_, ci) => p.size * (p.emph?.(li, ci)?.scale ?? 1));
    const lineSize = Math.max(...sizes);
    const widths = chars.map((ch, ci) => measure(ch, sizes[ci], weight));
    const total = widths.reduce((a, b) => a + b, 0);
    let x = p.align === 'center' ? -total / 2 : 0;
    y -= li === 0 ? lineSize * 0.5 : lineSize * gap * 0.5;
    chars.forEach((ch, ci) => {
      out.push({ch, li, ci, x: x + widths[ci] / 2, y: y + (lineSize - sizes[ci]) * -0.0, size: sizes[ci], color: p.emph?.(li, ci)?.color ?? p.color ?? C.ink});
      x += widths[ci];
    });
    y -= lineSize * gap * 0.5;
  });
  return out;
}

export const KLine: React.FC<KLineProps> = (p) => {
  const {hud, t} = useContext(HudCtx);
  const items = useMemo(() => layoutLines(p), [p.lines.join('\n'), p.size, p.weight, p.align, p.color]); // eslint-disable-line react-hooks/exhaustive-deps
  if (t < p.t0 - 0.05 || t > p.t1 + 0.05) return null;
  const n = items.length;
  const inDur = p.inDur ?? 0.32;
  const outDur = p.outDur ?? 0.22;
  const stagger = p.stagger ?? Math.min(0.035, 0.5 / Math.max(1, n));
  const seed = p.seed ?? 1;
  const inStyle = p.inStyle ?? 'flip';
  const outStyle = p.outStyle ?? 'fly';
  const wave = p.wave ?? 1;
  const check = typeof window !== 'undefined' && (window as unknown as {__CHECK?: boolean}).__CHECK;
  return (
    <>
      {items.map((it, i) => {
        const r = hash(seed * 97 + i * 13.1);
        const r2 = hash(seed * 31 + i * 7.7);
        const ki = ease.out(prog(t, p.t0 + i * stagger, p.t0 + i * stagger + inDur));
        const kiRaw = prog(t, p.t0 + i * stagger, p.t0 + i * stagger + inDur);
        const ko = outStyle === 'none' ? 0 : ease.in(prog(t, p.t1 - outDur - (n - 1 - i) * 0.008, p.t1 - (n - 1 - i) * 0.008));
        const st: CharState = {x: it.x, y: it.y, z: 0, rx: 0, ry: 0, rz: 0, s: 1, op: 1};
        // 登場
        const u = 1 - ki;
        if (inStyle === 'flip') {
          st.rx = -95 * u;
          st.y += -40 * u;
          st.op = clamp(kiRaw * 2.2);
        } else if (inStyle === 'slam') {
          const kb = ease.outBack(kiRaw, 2.2);
          st.s *= lerp(3.2, 1, clamp(kb, 0, 1.2));
          st.z += 260 * u;
          st.op = clamp(kiRaw * 3);
        } else if (inStyle === 'drop') {
          const kb = ease.outBack(kiRaw, 2.6);
          st.y += 160 * (1 - kb);
          st.rz += (r - 0.5) * 60 * u;
          st.op = clamp(kiRaw * 3);
        } else if (inStyle === 'rise') {
          st.y += -90 * u;
          st.rz += (r - 0.5) * 30 * u;
          st.op = clamp(kiRaw * 2.5);
        } else if (inStyle === 'spin') {
          st.rz += 200 * u * (r > 0.5 ? 1 : -1);
          st.s *= lerp(0.2, 1, ki);
          st.op = clamp(kiRaw * 2.5);
        }
        // 読む間も止めない: 文字ごとの波
        st.y += wave * 4 * Math.sin(t * 5.2 + i * 0.55 + seed);
        st.rz += wave * 2.2 * Math.sin(t * 3.1 + i * 0.9 + seed * 2);
        if (p.extra) {
          const e = p.extra({li: it.li, ci: it.ci, i, n, x: it.x, y: it.y, t});
          st.x += e.x ?? 0;
          st.y += e.y ?? 0;
          st.z += e.z ?? 0;
          st.rx += e.rx ?? 0;
          st.ry += e.ry ?? 0;
          st.rz += e.rz ?? 0;
          st.s *= e.s ?? 1;
          st.op *= e.op ?? 1;
        }
        // 退場
        if (ko > 0) {
          if (outStyle === 'fly') {
            st.x += (220 + 260 * r) * ko;
            st.y += (r2 - 0.3) * 260 * ko;
            st.rz += (r - 0.5) * 140 * ko;
            st.z += 200 * ko;
          } else if (outStyle === 'sink') {
            st.y -= 140 * ko;
            st.rx += 80 * ko;
          } else if (outStyle === 'burst') {
            const a = r * Math.PI * 2;
            st.x += Math.cos(a) * 380 * ko;
            st.y += Math.sin(a) * 300 * ko;
            st.rz += (r2 - 0.5) * 300 * ko;
            st.s *= 1 + ko;
          }
          st.op *= 1 - ko;
        }
        if (check && ki >= 1 && ko <= 0 && st.op > 0.9) {
          const half = (it.size * st.s) / 2;
          for (const [dx, dy] of [[-half, -half], [half, -half], [half, half], [-half, half]]) {
            const [sx, sy] = hudToScreen(hud, p.x + st.x + dx, p.y + st.y + dy);
            if (Math.abs(sx) > SAFE_X || Math.abs(sy) > SAFE_Y) {
              console.log(`BOUNDS t=${t.toFixed(2)} "${p.lines.join('')}" ch=${it.ch} screen=(${sx.toFixed(0)},${sy.toFixed(0)})`);
              break;
            }
          }
        }
        return <Txt key={i} text={it.ch} size={it.size} weight={p.weight ?? 800} color={it.color} x={p.x + st.x} y={p.y + st.y} z={st.z} rx={st.rx} ry={st.ry} rz={st.rz} s={st.s} opacity={st.op} order={p.order ?? 60} />;
      })}
    </>
  );
};

// 文の中の特定の文字の HUD 座標（輪の行き先などに使う）
export function charPos(p: KLineProps, li: number, ci: number): [number, number] {
  const items = layoutLines(p);
  const it = items.find((e) => e.li === li && e.ci === ci);
  return it ? [p.x + it.x, p.y + it.y] : [p.x, p.y];
}

// ---- 線分（p1 から p2 へ k の割合まで伸びる）と矢印 ----
export const Seg: React.FC<{x1: number; y1: number; x2: number; y2: number; w?: number; color: string; k?: number; k0?: number; opacity?: number; order?: number; z?: number; head?: number}> = ({x1, y1, x2, y2, w = 4, color, k = 1, k0 = 0, opacity = 1, order = 20, z = 0, head = 0}) => {
  const a = clamp(k0);
  const b = clamp(k);
  if (b - a <= 0.001 || opacity <= 0.001) return null;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) * (b - a);
  const ang = Math.atan2(dy, dx);
  const sx = x1 + dx * a;
  const sy = y1 + dy * a;
  const ex = x1 + dx * b;
  const ey = y1 + dy * b;
  return (
    <>
      <mesh geometry={unitPlane} position={[(sx + ex) / 2, (sy + ey) / 2, z]} rotation={[0, 0, ang]} scale={[len, w, 1]} renderOrder={order}>
        <Mat color={color} opacity={opacity} />
      </mesh>
      {head > 0 && b > 0.98 && (
        <>
          <mesh geometry={unitPlane} position={[ex - Math.cos(ang - 0.6) * head * 0.5, ey - Math.sin(ang - 0.6) * head * 0.5, z]} rotation={[0, 0, ang - 0.6]} scale={[head, w, 1]} renderOrder={order}>
            <Mat color={color} opacity={opacity} />
          </mesh>
          <mesh geometry={unitPlane} position={[ex - Math.cos(ang + 0.6) * head * 0.5, ey - Math.sin(ang + 0.6) * head * 0.5, z]} rotation={[0, 0, ang + 0.6]} scale={[head, w, 1]} renderOrder={order}>
            <Mat color={color} opacity={opacity} />
          </mesh>
        </>
      )}
    </>
  );
};

// 折れ線（全長に対する k の割合まで描く）
export const Poly: React.FC<{pts: [number, number][]; w?: number; color: string; k?: number; opacity?: number; order?: number; z?: number; head?: number}> = ({pts, w = 4, color, k = 1, opacity = 1, order = 20, z = 0, head = 0}) => {
  const lens = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
  const total = lens.reduce((a, b) => a + b, 0);
  let remain = clamp(k) * total;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < lens.length && remain > 0; i++) {
    const kk = Math.min(1, remain / lens[i]);
    const last = kk < 1 || i === lens.length - 1;
    out.push(<Seg key={i} x1={pts[i][0]} y1={pts[i][1]} x2={pts[i + 1][0]} y2={pts[i + 1][1]} w={w} color={color} k={kk} opacity={opacity} order={order} z={z} head={last ? head : 0} />);
    remain -= lens[i];
  }
  return <>{out}</>;
};

// ---- 縦方向のグラデーションの板（映像の上で文字を読みやすくする陰） ----
const gradCache = new Map<string, THREE.CanvasTexture>();
function gradTex(color: string, dir: 'down' | 'up' | 'left' | 'right') {
  const k = `${color}|${dir}`;
  let tex = gradCache.get(k);
  if (!tex) {
    const cv = document.createElement('canvas');
    cv.width = 4;
    cv.height = 256;
    const ctx = cv.getContext('2d')!;
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 4, 256);
    tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    gradCache.set(k, tex);
  }
  return tex;
}
export const Shade: React.FC<Tf & {w: number; h: number; color?: string; dir?: 'down' | 'up' | 'left' | 'right'; opacity?: number; order?: number}> = ({w, h, color = 'rgba(248,250,251,1)', dir = 'down', opacity = 1, order = 40, ...p}) => {
  if (opacity <= 0.001) return null;
  const extra = dir === 'up' ? 180 : dir === 'left' ? 90 : dir === 'right' ? -90 : 0;
  const swap = dir === 'left' || dir === 'right';
  return (
    <mesh geometry={unitPlane} position={pos(p)} rotation={[0, 0, ((p.rz ?? 0) + extra) * DEG]} scale={swap ? [h, w, 1] : [w, h, 1]} renderOrder={order}>
      <Mat map={gradTex(color, dir)} opacity={opacity} />
    </mesh>
  );
};

// ---- 線の上を走る小さなタグ（追従ラベル） ----
export const Pin: React.FC<{label: string; x: number; y: number; tx?: number; ty?: number; size?: number; color?: string; fill?: string; opacity?: number; order?: number; s?: number; rz?: number}> = ({label, x, y, tx, ty, size = 30, color = C.teal, fill = C.card, opacity = 1, order = 46, s = 1, rz = 0}) => {
  if (opacity <= 0.001) return null;
  const w = measure(label, size, 700) + size * 1.2;
  const h = size * 1.7;
  const lx = tx ?? x;
  const ly = ty ?? y;
  return (
    <>
      {(tx !== undefined || ty !== undefined) && <Seg x1={x} y1={y} x2={lx} y2={ly} w={2} color={color} opacity={0.8 * opacity} order={order - 1} />}
      {(tx !== undefined || ty !== undefined) && <Disc r={6} x={x} y={y} color={color} opacity={opacity} order={order - 1} />}
      <group position={[lx, ly, 0]} rotation={[0, 0, rz * DEG]} scale={[s, s, 1]}>
        <RRect w={w} h={h} r={8} color={fill} opacity={opacity} order={order} />
        <RRect w={w} h={h} r={8} color={color} border={2} opacity={opacity} order={order + 1} />
        <Txt text={label} size={size} weight={700} color={color} opacity={opacity} order={order + 2} />
      </group>
    </>
  );
};
