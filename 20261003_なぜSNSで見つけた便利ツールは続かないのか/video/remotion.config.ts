import { Config } from "@remotion/cli/config";

// 静止画は企画ディレクトリの assets/ をそのまま使う（コピーしない）
Config.setPublicDir("../assets");
Config.setVideoImageFormat("jpeg");
