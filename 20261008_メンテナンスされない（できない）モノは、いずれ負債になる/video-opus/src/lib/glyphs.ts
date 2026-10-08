// 文字のテクスチャ（フォント読込後にキャンバスで作り、キャッシュする）。
// 文字は白で描き、材質の色で着色する。黒い柔らかな縁を焼き込み、背景が動いても読めるようにする。
import * as THREE from 'three';

export const FONT = 'NotoJP';
const GLYPH_PX = 160;

function toTex(cv: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.generateMipmaps = true;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.needsUpdate = true;
  return tex;
}

export type Glyph = {tex: THREE.CanvasTexture; adv: number; w: number; h: number};
const glyphCache = new Map<string, Glyph>();

// 1文字。adv は送り幅（em単位）、w/h は板の大きさ（em単位）
export function glyph(ch: string, weight = 900): Glyph {
  const key = `${weight}|${ch}`;
  const hit = glyphCache.get(key);
  if (hit) return hit;
  const px = GLYPH_PX;
  const pad = px * 0.32;
  const cv = document.createElement('canvas');
  const m = cv.getContext('2d')!;
  m.font = `${weight} ${px}px ${FONT}`;
  const adv = Math.max(m.measureText(ch).width, px * 0.3);
  cv.width = Math.ceil(adv + pad * 2);
  cv.height = Math.ceil(px * 1.25 + pad * 2);
  const g = cv.getContext('2d')!;
  g.font = `${weight} ${px}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.shadowColor = 'rgba(0,0,0,0.85)';
  g.shadowBlur = px * 0.14;
  g.fillStyle = '#ffffff';
  g.fillText(ch, cv.width / 2, cv.height / 2 + px * 0.04);
  g.shadowBlur = 0;
  g.fillText(ch, cv.width / 2, cv.height / 2 + px * 0.04);
  const res = {tex: toTex(cv), adv: adv / px, w: cv.width / px, h: cv.height / px};
  glyphCache.set(key, res);
  return res;
}

// 語全体を1枚に（錆・崩落のシェーダー用。縁は焼き込まず、アルファで字形を持つ）
export type WordTex = {tex: THREE.CanvasTexture; w: number; h: number; canvas: HTMLCanvasElement};
const wordCache = new Map<string, WordTex>();
export function wordTexture(text: string, weight = 900, px = 220): WordTex {
  const key = `${weight}|${px}|${text}`;
  const hit = wordCache.get(key);
  if (hit) return hit;
  const lines = text.split('\n');
  const cv = document.createElement('canvas');
  const m = cv.getContext('2d')!;
  m.font = `${weight} ${px}px ${FONT}`;
  const tw = Math.max(...lines.map((l) => m.measureText(l).width));
  const pad = px * 0.3;
  const lh = px * 1.22;
  cv.width = Math.ceil(tw + pad * 2);
  cv.height = Math.ceil(lh * lines.length + pad * 2);
  const g = cv.getContext('2d')!;
  g.font = `${weight} ${px}px ${FONT}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = '#ffffff';
  lines.forEach((l, i) => g.fillText(l, cv.width / 2, pad + lh * (i + 0.5) + px * 0.04));
  const res = {tex: toTex(cv), w: cv.width / px, h: cv.height / px, canvas: cv};
  wordCache.set(key, res);
  return res;
}

// 語の字形の内側から点を決定的に取り出す（粒子の組み替え用）。座標は em 単位で中心原点
export function samplePoints(wt: WordTex, count: number, seed = 1): Float32Array {
  const {canvas} = wt;
  const g = canvas.getContext('2d')!;
  const {width, height} = canvas;
  const data = g.getImageData(0, 0, width, height).data;
  const inside: number[] = [];
  const step = 3;
  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      if (data[(y * width + x) * 4 + 3] > 128) inside.push(x, y);
    }
  }
  const out = new Float32Array(count * 3);
  const n = inside.length / 2;
  const px = width / wt.w;
  for (let i = 0; i < count; i++) {
    // 決定的な散らし方（黄金比の列）
    const j = Math.floor(((i * 0.6180339887 + seed * 0.137) % 1) * n);
    out[i * 3] = (inside[j * 2] - width / 2) / px;
    out[i * 3 + 1] = -(inside[j * 2 + 1] - height / 2) / px;
    out[i * 3 + 2] = 0;
  }
  return out;
}

// 小さな文字列の板（ラベル・番号）
export type LabelOpt = {weight?: number; px?: number; color?: string; bg?: string; radius?: number; padX?: number; padY?: number; font?: string; stroke?: string};
const labelCache = new Map<string, WordTex>();
export function labelTexture(text: string, o: LabelOpt = {}): WordTex {
  const key = JSON.stringify([text, o]);
  const hit = labelCache.get(key);
  if (hit) return hit;
  const px = o.px ?? 96;
  const weight = o.weight ?? 800;
  const font = o.font ?? FONT;
  const cv = document.createElement('canvas');
  const m = cv.getContext('2d')!;
  m.font = `${weight} ${px}px ${font}`;
  const tw = m.measureText(text).width;
  const padX = (o.padX ?? 0.4) * px;
  const padY = (o.padY ?? 0.25) * px;
  cv.width = Math.ceil(tw + padX * 2);
  cv.height = Math.ceil(px * 1.2 + padY * 2);
  const g = cv.getContext('2d')!;
  if (o.bg) {
    const r = (o.radius ?? 0.2) * px;
    g.beginPath();
    g.roundRect(0, 0, cv.width, cv.height, r);
    g.fillStyle = o.bg;
    g.fill();
    if (o.stroke) {
      g.lineWidth = px * 0.06;
      g.strokeStyle = o.stroke;
      g.stroke();
    }
  }
  g.font = `${weight} ${px}px ${font}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = o.color ?? '#ffffff';
  g.fillText(text, cv.width / 2, cv.height / 2 + px * 0.04);
  const res = {tex: toTex(cv), w: cv.width / px, h: cv.height / px, canvas: cv};
  labelCache.set(key, res);
  return res;
}

// 任意の描画関数でテクスチャを作る（画面・値札など）
const drawCache = new Map<string, THREE.CanvasTexture>();
export function drawTexture(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void): THREE.CanvasTexture {
  const hit = drawCache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d')!, w, h);
  const tex = toTex(cv);
  drawCache.set(key, tex);
  return tex;
}
