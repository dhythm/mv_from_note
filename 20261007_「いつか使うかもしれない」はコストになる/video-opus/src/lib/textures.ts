// キャンバスで作るテクスチャ（文字カード・カード面・本のページ・光・紙）。フォント読込後に一度だけ生成する。
import * as THREE from 'three';
import {TokenStyle} from './copy';

export const FONT = 'NotoJP';

export const C = {
  paper: '#ece7de',
  navy: '#2e3a51',
  navyDeep: '#1c2433',
  navyLine: '#56647d',
  white: '#fbfaf7',
  amber: '#e49a35',
  red: '#c2412f',
};

function toTex(cv: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export type TokenTex = {tex: THREE.CanvasTexture; w: number; h: number};

const PX = 200; // テクスチャ解像度（px／ワールド単位）
const SHADOW_PAD = 0.14; // 影の余白（ワールド単位）

// 語カード: 板＋影＋文字。w,h は板の大きさ（影の余白を含まない）
export function tokenTexture(text: string, style: TokenStyle, size: number): TokenTex {
  const fontPx = size * PX;
  const weight = style === 'body' ? 700 : 900;
  const cv = document.createElement('canvas');
  const ctx = cv.getContext('2d')!;
  ctx.font = `${weight} ${fontPx}px ${FONT}`;
  const tw = ctx.measureText(text).width;
  const padX = fontPx * (style === 'body' ? 0.28 : 0.34);
  const plateW = tw + padX * 2;
  const plateH = fontPx * 1.42;
  const sp = SHADOW_PAD * PX;
  cv.width = Math.ceil(plateW + sp * 2);
  cv.height = Math.ceil(plateH + sp * 2);
  const g = cv.getContext('2d')!;
  const plate = {quote: C.navy, em: C.navy, accent: C.amber, cost: C.red, body: C.white}[style];
  const ink = style === 'body' ? C.navyDeep : C.white;
  g.save();
  g.shadowColor = 'rgba(20,26,40,0.38)';
  g.shadowBlur = sp * 0.55;
  g.shadowOffsetY = sp * 0.28;
  roundRect(g, sp, sp, plateW, plateH, fontPx * 0.12);
  g.fillStyle = plate;
  g.fill();
  g.restore();
  if (style === 'body') {
    g.strokeStyle = 'rgba(46,58,81,0.18)';
    g.lineWidth = Math.max(2, fontPx * 0.02);
    roundRect(g, sp, sp, plateW, plateH, fontPx * 0.12);
    g.stroke();
  }
  g.font = `${weight} ${fontPx}px ${FONT}`;
  g.fillStyle = ink;
  g.textBaseline = 'middle';
  g.textAlign = 'center';
  g.fillText(text, sp + plateW / 2, sp + plateH / 2 + fontPx * 0.04);
  return {tex: toTex(cv), w: plateW / PX, h: plateH / PX};
}

export const tokenTexturePad = SHADOW_PAD;

// カード表面: 濃紺の面にファイル／フォルダなどの簡略アイコン（6種）
export function cardFaceTexture(variant: number, base: string): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 320;
  cv.height = 224;
  const g = cv.getContext('2d')!;
  g.fillStyle = base;
  g.fillRect(0, 0, cv.width, cv.height);
  // 紙の繊維感
  for (let i = 0; i < 900; i++) {
    const x = (Math.sin(i * 91.7 + variant) * 0.5 + 0.5) * cv.width;
    const y = (Math.sin(i * 37.3 + variant * 3) * 0.5 + 0.5) * cv.height;
    g.fillStyle = i % 2 ? 'rgba(255,255,255,0.025)' : 'rgba(0,0,0,0.04)';
    g.fillRect(x, y, 2, 2);
  }
  g.strokeStyle = C.navyLine;
  g.fillStyle = C.navyLine;
  g.lineWidth = 7;
  g.lineCap = 'round';
  const ix = 42;
  const iy = 52;
  switch (variant % 6) {
    case 0: // 文書
      g.strokeRect(ix, iy, 64, 84);
      for (let k = 0; k < 3; k++) g.fillRect(ix + 14, iy + 20 + k * 20, 36, 6);
      break;
    case 1: // フォルダ
      g.beginPath();
      g.moveTo(ix, iy + 18);
      g.lineTo(ix + 30, iy + 18);
      g.lineTo(ix + 38, iy + 6);
      g.lineTo(ix + 78, iy + 6);
      g.lineTo(ix + 78, iy + 78);
      g.lineTo(ix, iy + 78);
      g.closePath();
      g.stroke();
      break;
    case 2: // 画像
      g.strokeRect(ix, iy, 80, 64);
      g.beginPath();
      g.moveTo(ix + 8, iy + 56);
      g.lineTo(ix + 32, iy + 26);
      g.lineTo(ix + 50, iy + 44);
      g.lineTo(ix + 62, iy + 34);
      g.lineTo(ix + 74, iy + 56);
      g.stroke();
      break;
    case 3: // グラフ
      for (let k = 0; k < 4; k++) g.fillRect(ix + k * 20, iy + 70 - (k * 17 + 14), 12, k * 17 + 14);
      break;
    case 4: // データベース
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.ellipse(ix + 38, iy + 12 + k * 26, 36, 11, 0, 0, Math.PI * 2);
        g.stroke();
      }
      break;
    default: // 一覧
      for (let k = 0; k < 4; k++) {
        g.fillRect(ix, iy + k * 20, 10, 10);
        g.fillRect(ix + 20, iy + k * 20 + 2, 56, 6);
      }
  }
  // 右側の行（ファイル名の気配）
  for (let k = 0; k < 4; k++) {
    g.fillStyle = 'rgba(120,135,160,0.45)';
    g.fillRect(150, 64 + k * 26, 120 - (k % 2) * 34, 8);
  }
  return toTex(cv);
}

// 本のページ（資産／負債）
export function pageTexture(text: string, ink: string): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 640;
  cv.height = 864;
  const g = cv.getContext('2d')!;
  g.fillStyle = C.white;
  g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = 'rgba(46,58,81,0.12)';
  g.lineWidth = 6;
  g.strokeRect(26, 26, cv.width - 52, cv.height - 52);
  g.font = `900 210px ${FONT}`;
  g.fillStyle = ink;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, cv.width / 2, cv.height / 2 + 6);
  return toTex(cv);
}

// 柔らかい光（加算合成用の放射グラデーション）
export function glowTexture(color: string): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 256;
  cv.height = 256;
  const g = cv.getContext('2d')!;
  const grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grd.addColorStop(0, color);
  grd.addColorStop(0.35, color + '88');
  grd.addColorStop(1, color + '00');
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  return toTex(cv);
}

// 走査線（RAG の検索の光）: 中央が明るい縦帯
export function beamTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 128;
  cv.height = 8;
  const g = cv.getContext('2d')!;
  const grd = g.createLinearGradient(0, 0, 128, 0);
  grd.addColorStop(0, 'rgba(228,154,53,0)');
  grd.addColorStop(0.5, 'rgba(255,214,150,1)');
  grd.addColorStop(1, 'rgba(228,154,53,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 8);
  return toTex(cv);
}

// 紙の地
export function paperTexture(): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 512;
  const g = cv.getContext('2d')!;
  g.fillStyle = C.paper;
  g.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 6000; i++) {
    const x = (Math.sin(i * 12.9898) * 43758.5453) % 1;
    const y = (Math.sin(i * 78.233) * 12345.6789) % 1;
    g.fillStyle = i % 3 ? 'rgba(120,110,95,0.035)' : 'rgba(255,255,255,0.06)';
    g.fillRect(Math.abs(x) * 512, Math.abs(y) * 512, 2, 2);
  }
  const tex = toTex(cv);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(12, 12);
  return tex;
}
