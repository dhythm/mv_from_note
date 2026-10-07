// 配色・安全域・キャンバス仕様（assets/layout-notes.md 準拠）
export const W = 1280;
export const H = 720;
export const FPS = 30;

export const COLORS = {
  bg: '#f7f6f3',
  bgDeep: '#efece6',
  ink: '#3a3a3a',
  inkSoft: '#6b6b6b',
  grid: '#dcd8d0',
  gridStrong: '#cfc9bf',
  bar: '#4a5a6a',
  bar2: '#5a6a7a',
  add: '#c45c3a',
  addDeep: '#8a5a4a',
  done: '#3a5a4a',
  deadline: '#b23a2e',
  ghost: '#b8b2a8', // 元位置の細線
};

export const SAFE = {top: 56, side: 64, bottom: 48};

// ガント基準ゾーン
export const ZONE = {x0: 160, x1: 1120, y0: 180, y1: 620};

// 説明用の時間軸（schedule-model.json）: unit 0..10 -> x
export const UNIT = 96; // px / unit = (1120-160)/10
export const unitX = (u: number) => ZONE.x0 + u * UNIT;

export const FONT = 'NotoSansJP';
