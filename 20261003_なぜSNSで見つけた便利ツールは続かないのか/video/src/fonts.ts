import { loadFont as loadSans } from "@remotion/google-fonts/NotoSansJP";
import { loadFont as loadMincho } from "@remotion/google-fonts/ShipporiMincho";

// 日本語フォントは unicode-range ごとに分割されるので、太さは最小限にする
export const sans = loadSans("normal", { weights: ["500", "900"], subsets: ["japanese", "latin"] }).fontFamily;
export const mincho = loadMincho("normal", { weights: ["600"], subsets: ["japanese", "latin"] }).fontFamily;

export const INK = "#1f1c19";
export const PAPER = "#f6f1e8";

export const AMBER = "rgba(242,184,75,0.8)";
export const INDIGO = "rgba(120,140,235,0.8)";
export const RED = "#d0443a";
