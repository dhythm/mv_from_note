import { loadFont } from "@remotion/fonts";
import { staticFile, delayRender, continueRender, cancelRender } from "remotion";
import { FONT } from "./theme";

// ローカルの Noto Sans JP 可変フォントを読み込む。外部取得に頼らない。
const handle = delayRender("load-noto-sans-jp");

loadFont({
  family: FONT,
  url: staticFile("NotoSansJP.ttf"),
})
  .then(() => continueRender(handle))
  .catch((err) => cancelRender(err));
