#!/bin/sh
# 書き出した動画の検品：仕様・音声・無音/静止/黒の検出、カット境界の前後と重要な瞬間のフレーム一覧。
# 使い方: sh scripts/inspect.sh ../../output/opus-video/mouichido-mekuru.mp4 名前
set -e
in=$1; name=$2
out=../../output/opus-video/check/$name
mkdir -p "$out"
echo "== 仕様"
ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,r_frame_rate,sample_rate,channels,duration -of compact "$in"
echo "== 音量（EBU R128）"
ffmpeg -hide_banner -nostats -i "$in" -af ebur128=peak=true -f null - 2>&1 | grep -E "^\s+(I|LRA|Peak):" || true
echo "== 黒画面（0.5秒以上）"
ffmpeg -hide_banner -nostats -i "$in" -vf "blackdetect=d=0.5:pix_th=0.08" -an -f null - 2>&1 | grep -o "black_start.*" || echo "なし"
echo "== 静止（3秒以上、ほぼ変化なし）"
ffmpeg -hide_banner -nostats -i "$in" -vf "freezedetect=n=0.0008:d=3" -an -f null - 2>&1 | grep -oE "freeze_(start|duration|end): [0-9.]+" | paste - - - || echo "なし"
echo "== 無音（2秒以上、-60dB）"
ffmpeg -hide_banner -nostats -i "$in" -af "silencedetect=n=-60dB:d=2" -vn -f null - 2>&1 | grep -oE "silence_(start|end): [0-9.]+" | paste - - || echo "なし"
