import energy from './energy.json';

export const FPB = 12; // frames / beat (150BPM @30fps)
export const FPBAR = 48; // frames / bar
export const TOTAL = energy.totalFrames; // 5940

// 場面境界（frames）
export const SCENE_F = [0, 540, 1140, 1920, 2760, 3720, 4350, 5340, 5940];

export const sceneIndex = (f: number) => {
  for (let i = 0; i < 8; i++) {
    if (f < SCENE_F[i + 1]) return i;
  }
  return 7;
};

const at = (arr: number[], f: number) => {
  const i = Math.max(0, Math.min(arr.length - 1, Math.round(f)));
  return arr[i];
};

export const lowEnergy = (f: number) => at(energy.low as number[], f);
export const overall = (f: number) => at(energy.overall as number[], f);
export const kickPulse = (f: number) => at(energy.kickPulse as number[], f);

// 拍内位相 0..1
export const beatPhase = (f: number) => (f % FPB) / FPB;
// 小節内位相 0..1
export const barPhase = (f: number) => (f % FPBAR) / FPBAR;
// 直近の拍頭フレーム
export const lastBeat = (f: number) => Math.floor(f / FPB) * FPB;
