#!/bin/zsh
# 試作3区間 × BGM 3案（A/B/H）の音付き比較動画を作る
set -e
cd "$(dirname "$0")/.."
for v in A B H; do
  tools/mux.sh out/review/proto-a-silent.mp4 0 audio/bgm_$v.wav out/review/proto-a-cut01-04_bgm$v.mp4
  tools/mux.sh out/review/proto-b-silent.mp4 64 audio/bgm_$v.wav out/review/proto-b-cut07-08_bgm$v.mp4
  tools/mux.sh out/review/proto-c-silent.mp4 104 audio/bgm_$v.wav out/review/proto-c-cut09-11_bgm$v.mp4
done
