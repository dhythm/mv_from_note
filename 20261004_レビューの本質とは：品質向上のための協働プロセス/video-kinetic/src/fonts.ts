import { loadFont as loadSans } from "@remotion/google-fonts/NotoSansJP";
import { loadFont as loadMincho } from "@remotion/google-fonts/ShipporiMincho";

// 要約・つなぎ・ラベルはゴシック、原稿からの引用は明朝。
export const sans = loadSans("normal", { weights: ["400", "700", "900"], subsets: ["japanese", "latin"] }).fontFamily;
export const mincho = loadMincho("normal", { weights: ["500", "800"], subsets: ["japanese", "latin"] }).fontFamily;
