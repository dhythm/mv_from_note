// 共有の色・時間割・レイアウト定数。すべての動きはフレームから決める。
// 時間は 30fps を前提にフレーム換算した値。

export const FPS = 30;
export const WIDTH = 1280;
export const HEIGHT = 720;
export const DURATION = 115 * FPS; // 3450 frames

// 配色: 暖色の紙地にインク。意見は二色、役割は共通のスレート一色に統一する。
export const COLOR = {
  paper: "#efe8da",
  paperEdge: "#e3dac6",
  ink: "#2b2e31",
  inkSoft: "#6d7378",
  line: "#cabfa8",
  // 二つの声（役割へ引き継がない）
  voiceL: "#b0603e", // メンテできない派（左）
  voiceR: "#3d7a84", // AIに任せ派（右）
  // 役割の二層は共通のスレート一色。濃淡は上下の位置差だけ。
  slate: "#42596b",
  slateUp: "#4d6b80",
  slateLo: "#39505f",
  // 補助
  calm: "#5c8a6a", // 軽いもの（問題ない）
  heavy: "#b0603e", // 重いもの（怖い）
  amber: "#cf9340", // 関与の光・強調
  chip: "#6f8698",
} as const;

// シーン境界（フレーム）。references / plan の時間割に対応。
export const SCENES = {
  question: [0, 420], // 0:00–0:14
  cause1: [420, 900], // 0:14–0:30
  cause2: [900, 1230], // 0:30–0:41
  pivot: [1230, 1710], // 0:41–0:57
  method1: [1710, 2130], // 0:57–1:11
  method2: [2130, 2730], // 1:11–1:31
  conclusion: [2730, 3450], // 1:31–1:55
} as const;

// 動画窓の区間（フレーム）。plan 準拠。
export const VIDEO_A = [1380, 1530]; // 0:46–0:51
export const VIDEO_B = [2580, 2730]; // 1:26–1:31

// 二層プラットフォームの幾何。転換の着地点＝後半の定位置。
export const LAYER = {
  cx: WIDTH / 2,
  upY: 285,
  loY: 475,
  w: 470,
  h: 140,
  r: 18,
} as const;

// フォント
export const FONT = "Noto Sans JP";
