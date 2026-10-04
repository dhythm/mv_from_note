import { Config } from "@remotion/cli/config";

// 部品は public/gen/（npm run prep で生成、Git 管理外）
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
