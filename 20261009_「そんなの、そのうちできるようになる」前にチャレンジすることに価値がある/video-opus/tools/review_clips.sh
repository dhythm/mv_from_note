#!/bin/zsh
# 確認用の区間動画（完成版から切り出し・音つき）と、同じ映像に BGM 3案を重ねた比較
set -e
cd "$(dirname "$0")/.."
F=out/challenge-full.mp4
mkdir -p out/review/final
cut() { ffmpeg -v error -y -ss "$2" -i "$F" -t "$3" -c:v libx264 -crf 18 -c:a aac -b:a 256k "out/review/final/$1.mp4"; echo "$1"; }
cut review-open-00-24 0 24
cut review-mid-54-90 54 36
cut review-late-96-123 96 27.5
cut review-logo-115-123 115 8.5
# BGM 比較（同じ完成映像）
for v in A B H; do
  for r in "open 0 24" "mid 64 24" "end 104 19.5"; do
    set -- ${=r}
    ffmpeg -v error -y -ss "$2" -t "$3" -i "$F" -ss "$2" -t "$3" -i audio/bgm_$v.wav -map 0:v -map 1:a -c:v libx264 -crf 20 -c:a aac -b:a 256k "out/review/final/bgm$v-$1.mp4"
    echo "bgm$v-$1"
  done
done
