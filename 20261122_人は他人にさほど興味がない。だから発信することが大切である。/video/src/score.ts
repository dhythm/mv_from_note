// 全体の設計図: 各カットの世界原点・カメラキー・カット間の速い振り・Seedance動画インサート区間。
// すべて時刻 T から決まる純関数。
import type {CamKey} from './cam';
import {E_WHIP, H, W, clamp, inOut, out3, prog, wobble} from './kit';
import {at, D, S} from './timeline';

// 画面 px → 世界座標（距離 16・fov 34° の平面。1080px = 9.79 単位）
export const WORLD_H = 2 * 16 * Math.tan((34 * Math.PI) / 360); // 9.786
export const PX = WORLD_H / H;
export const wx = (px: number) => (px - W / 2) * PX;
export const wy = (py: number) => (H / 2 - py) * PX;

// 各カットの世界原点（距離を大きく離して他カットの図が映り込まないようにする）
export const POS: Record<string, [number, number]> = {
  '01': [0, 0],
  '02': [0, 0],     // 01 → 02 は同じ点の列でシームレスに接続
  '03': [44, 0],
  '04': [44, -26],
  '05': [88, -26],
  '06': [132, -26],
  '07': [132, 4],
};

// Seedance 2.5 Flash 動画インサートの正確な区間（グローバル秒）
export type ClipDef = {
  id: string;
  file: string;
  start: number;
  end: number;
  fadeIn: number;
  fadeOut: number;
  wipeIn?: 'none' | 'left' | 'right' | 'up';
  wipeOut?: 'none' | 'left' | 'right' | 'down';
  /** 文字が乗るエリアに極薄い紙色ベールを敷く CSS グラデーション */
  veil?: string;
  /** 映像の明るさ/色調を本編の紙色 #F4F0E6 と調和させるフィルタ */
  filter?: string;
  /** クリップ再生中にゆっくりしたスケール運動を足すか */
  zoom?: [number, number];
};

export const CLIPS: ClipDef[] = [
  {
    // 01 導入: 紙カードが流れ1枚が琥珀の光で寄る (0:00.0–0:05.05)
    id: '01_cards',
    file: 'cut01_paper_stream.mp4',
    start: at('01', 0),
    end: at('01', 5.05),
    fadeIn: 0,
    fadeOut: 0.35,
    wipeIn: 'none',
    wipeOut: 'left',
    veil: 'linear-gradient(12deg, rgba(244,240,230,0.72) 0%, rgba(244,240,230,0.34) 44%, rgba(244,240,230,0.04) 76%)',
    filter: 'brightness(1.06) contrast(0.96) saturate(0.95)',
    zoom: [1.0, 1.04],
  },
  {
    // 02 見せ場: 大勢が素通りする中、藍のコートの1人が光の前で立ち止まる
    id: '02_stops',
    file: 'cut02_one_stops.mp4',
    start: at('02', 5.10),
    end: at('02', 11.10),
    fadeIn: 0.35,
    fadeOut: 0.42,
    wipeIn: 'left',
    wipeOut: 'left',
    veil: 'linear-gradient(110deg, rgba(244,240,230,0.52) 0%, rgba(244,240,230,0.18) 45%, rgba(244,240,230,0.02) 72%)',
    filter: 'brightness(1.08) contrast(0.98) saturate(1.04)',
    zoom: [1.0, 1.05],
  },
  {
    // 03 留保: 朝の街とカフェでみんな自分の生活に集中している
    id: '03_busy',
    file: 'cut03_busy_lives.mp4',
    start: at('03', 5.55),
    end: at('03', 10.60),
    fadeIn: 0.36,
    fadeOut: 0.42,
    wipeIn: 'left',
    wipeOut: 'right',
    veil: 'linear-gradient(90deg, rgba(244,240,230,0.78) 0%, rgba(244,240,230,0.48) 48%, rgba(244,240,230,0.06) 80%)',
    filter: 'brightness(1.04) contrast(0.96) saturate(0.92)',
    zoom: [1.02, 1.06],
  },
  {
    // 05 根拠: 明るい窓辺のテーブルで信頼できる2人が静かに相談する
    id: '05_consult',
    file: 'cut05_consult.mp4',
    start: at('05', 7.10),
    end: at('05', 13.10),
    fadeIn: 0.38,
    fadeOut: 0.42,
    wipeIn: 'left',
    wipeOut: 'left',
    veil: 'linear-gradient(90deg, rgba(244,240,230,0.76) 0%, rgba(244,240,230,0.34) 32%, rgba(244,240,230,0.04) 60%)',
    filter: 'brightness(1.05) contrast(0.97) saturate(0.95)',
    zoom: [1.0, 1.05],
  },
  {
    // 07 結論: 朝日の差す紙色デスクで自分の言葉を迷わず書き続ける手元
    id: '07_words',
    file: 'cut07_own_words.mp4',
    start: at('07', 9.55),
    end: at('07', 15.10),
    fadeIn: 0.40,
    fadeOut: 0.55,
    wipeIn: 'left',
    wipeOut: 'none',
    veil: 'linear-gradient(175deg, rgba(244,240,230,0.78) 0%, rgba(244,240,230,0.52) 52%, rgba(244,240,230,0.10) 85%)',
    filter: 'brightness(1.06) contrast(0.97) saturate(0.96)',
    zoom: [1.0, 1.03],
  },
];

// 図の層のカメラキー列
export const CAM: CamKey[] = [
  // 01: 点の列へ戻ったあと右から左へ滑らかにトラッキング
  {at: at('01', 0), p: [0, 0, 16], t: [0, 0, 0], fov: 34, roll: 0},
  {at: at('01', 5.0), p: [1.8, 0.2, 16.4], t: [1.2, 0.1, 0], fov: 34, roll: 0},
  {at: at('01', 10.6), p: [-0.4, 0.0, 15.6], t: [-0.4, 0.0, 0], fov: 34, roll: -0.4},
  {at: at('01', D['01']), p: [-1.4, -0.3, 15.2], t: [-1.0, -0.2, 0], fov: 34, roll: 0.3},

  // 02: 素通り → 10.9s から大きな藍の点へ3秒かけてゆっくりドリーイン
  {at: at('02', 1.8), p: [-0.6, -0.4, 15.8], t: [-0.4, -0.3, 0], fov: 34, roll: -0.3},
  {at: at('02', 5.1), p: [0.4, -0.5, 15.2], t: [0.2, -0.4, 0], fov: 34, roll: 0.2},
  {at: at('02', 10.9), p: [-0.8, 0.0, 15.8], t: [-0.8, 0.0, 0], fov: 34, roll: 0.3},
  {at: at('02', 14.0), p: [-1.4, 0.0, 12.6], t: [-1.4, 0.0, 0], fov: 32, roll: -0.3, e: out3},

  // 02 → 03: 速い横振り
  {at: at('03', 0.28), p: [44.0, 0.1, 15.6], t: [44.0, 0.0, 0], fov: 34, roll: 0, e: E_WHIP},
  // 03: 点の層を少し引き、余白が画面の半分を超えるところまで見せる
  {at: at('03', 5.5), p: [44.5, -0.2, 17.0], t: [44.2, -0.1, 0], fov: 35, roll: 0.3},
  {at: at('03', 10.8), p: [43.2, -0.5, 18.6], t: [43.0, -0.4, 0], fov: 36, roll: -0.3},
  {at: at('03', D['03'] - 0.32), p: [43.0, -0.8, 19.0], t: [43.0, -0.6, 0], fov: 36, roll: 0},

  // 03 → 04: 下へクレーンダウンしながら 04 の線の下へ
  {at: at('04', 0.30), p: [44.0, -26.8, 15.4], t: [44.0, -26.6, 0], fov: 34, roll: 0, e: E_WHIP},
  {at: at('04', 4.3), p: [43.8, -27.2, 14.6], t: [43.8, -26.8, 0], fov: 33, roll: -0.5},
  {at: at('04', 7.8), p: [43.9, -27.0, 15.2], t: [43.9, -26.7, 0], fov: 34, roll: -0.2},
  // 04 後半: 線の下の丸から線の上へクレーンアップ！
  {at: at('04', 9.2), p: [44.6, -25.4, 15.6], t: [44.5, -25.6, 0], fov: 34, roll: 0.3, e: out3},
  {at: at('04', D['04'] - 0.32), p: [45.6, -25.4, 15.0], t: [45.2, -25.6, 0], fov: 34, roll: 0},

  // 04 → 05: 右へ速い横振り
  {at: at('05', 0.28), p: [88.6, -26.0, 15.8], t: [88.4, -26.0, 0], fov: 34, roll: 0, e: E_WHIP},
  {at: at('05', 4.4), p: [89.0, -26.4, 15.0], t: [88.6, -26.3, 0], fov: 33, roll: 0.4},
  {at: at('05', 13.0), p: [89.4, -26.2, 15.8], t: [89.0, -26.1, 0], fov: 34, roll: 0.3},
  // 05 後半: 右下の点から弧に沿って左へパン
  {at: at('05', 15.8), p: [87.4, -25.8, 14.8], t: [87.6, -25.9, 0], fov: 33, roll: -0.3, e: out3},

  // 05 → 06: 右へ速い横振り
  {at: at('06', 0.28), p: [132.0, -26.0, 15.8], t: [132.0, -26.0, 0], fov: 34, roll: 0, e: E_WHIP},
  // 06: 斜線方向へ少しパンして三段が読める幅へ戻す
  {at: at('06', 6.8), p: [132.8, -25.5, 14.8], t: [132.5, -25.6, 0], fov: 33, roll: -0.6},
  {at: at('06', 8.2), p: [131.8, -26.0, 16.0], t: [131.8, -26.0, 0], fov: 34, roll: 0.3, e: out3},
  {at: at('06', 14.0), p: [132.2, -26.2, 16.4], t: [132.0, -26.1, 0], fov: 34, roll: -0.2},
  {at: at('06', D['06'] - 0.32), p: [132.4, -26.0, 16.6], t: [132.2, -26.0, 0], fov: 34, roll: 0},

  // 06 → 07: 上へ速い振り
  {at: at('07', 0.28), p: [132.0, 4.4, 15.6], t: [132.0, 4.2, 0], fov: 34, roll: 0, e: E_WHIP},
  {at: at('07', 6.8), p: [131.4, 4.5, 14.8], t: [131.6, 4.3, 0], fov: 33, roll: -0.4},
  {at: at('07', 9.5), p: [132.0, 4.0, 16.2], t: [132.0, 4.0, 0], fov: 35, roll: 0.2},
  // 07 結びの3秒: 図の層を少し寄る
  {at: at('07', 14.6), p: [132.0, 4.0, 16.0], t: [132.0, 4.0, 0], fov: 34, roll: 0},
  {at: at('07', D['07']), p: [132.0, 4.0, 13.8], t: [132.0, 4.0, 0], fov: 32, roll: 0.3, e: inOut},
];

// カット間の速い振り（モーションブラー用）
const WHIPS: {t: number; dur: number; ax: 'x' | 'y'; amp: number}[] = [
  {t: at('01', 5.05), dur: 0.42, ax: 'x', amp: 20},
  {t: at('02', 5.10), dur: 0.36, ax: 'x', amp: 16},
  {t: at('02', 11.10), dur: 0.38, ax: 'x', amp: 16},
  {t: at('03', 0), dur: 0.56, ax: 'x', amp: 24},
  {t: at('04', 0), dur: 0.58, ax: 'y', amp: 22},
  {t: at('05', 0), dur: 0.56, ax: 'x', amp: 24},
  {t: at('06', 0), dur: 0.56, ax: 'x', amp: 24},
  {t: at('07', 0), dur: 0.58, ax: 'y', amp: 22},
];

export function whip(T: number): {n: number; ax: 'x' | 'y'} {
  let n = 0;
  let ax: 'x' | 'y' = 'x';
  for (const w of WHIPS) {
    const k = prog(T, w.t - w.dur / 2, w.t + w.dur / 2);
    if (k > 0 && k < 1) {
      const v = Math.sin(Math.PI * k) * w.amp;
      if (v > n) {
        n = v;
        ax = w.ax;
      }
    }
  }
  return {n, ax};
}

// 語の層全体の控えめな呼吸（静止感をなくす。字形は崩さない）
export function layerBreath(T: number) {
  return {
    dx: wobble(T, 11, 6.2) * 5.5,
    dy: wobble(T, 17, 5.1) * 3.5,
    r: wobble(T, 23, 8.3) * 0.22,
    s: 1 + wobble(T, 29, 7.4) * 0.006,
  };
}

// アクティブな動画クリップの重みとクリップ状態
export function clipState(T: number, c: ClipDef) {
  if (T < c.start - 0.05 || T > c.end + 0.05) return null;
  const localT = clamp(T - c.start, 0, c.end - c.start);
  const kIn = c.fadeIn > 0 ? out3(prog(T, c.start, c.start + c.fadeIn)) : 1;
  const kOut = c.fadeOut > 0 ? inOut(prog(T, c.end - c.fadeOut, c.end)) : 0;
  const vis = clamp(kIn * (1 - kOut));
  return {localT, kIn, kOut, vis};
}
