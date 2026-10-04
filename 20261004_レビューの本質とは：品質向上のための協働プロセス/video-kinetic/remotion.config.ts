import { Config } from "@remotion/cli/config";

// 音声（score.wav）は npm run audio で output/opus-kinetic/public/ に生成する（Git 管理外）
Config.setPublicDir("../../output/opus-kinetic/public");
Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(92);
