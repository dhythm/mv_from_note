#!/bin/sh
# 手の出入り・差し替えの前後 ±4 フレームを、最終の動画からコマ送りで一覧にする（検品用）
# 使い方: sh scripts/stepcheck.sh  （npm run hands の結果を使う）
set -e
out=../../output/opus-video/check/step-final
rm -rf "$out"; mkdir -p "$out"
npm run -s hands > "$out/events.txt"
awk '/== proto/{m="proto"} /== film/{m="film"} /^[0-9]/{print m, $1}' "$out/events.txt" | while read m t; do
  if [ "$m" = film ]; then file=../../output/opus-video/mouichido-mekuru.mp4; off=5; else file=../../output/opus-video/proto-c08-c11.mp4; off=0; fi
  s=$(python3 -c "print(max(0, $t + $off - 4/24))")
  ffmpeg -y -loglevel error -ss "$s" -t 0.375 -i "$file" -vf "scale=480:-1,tile=9x1:padding=2" -frames:v 1 "$out/${m}_$t.png"
done
ls "$out" | wc -l
