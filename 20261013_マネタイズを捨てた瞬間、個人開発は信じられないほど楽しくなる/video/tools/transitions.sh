#!/bin/sh
# 場面間の点検: 境目の前後を 0.1 秒刻みで切り出した一覧を out/review/trans-<開始秒>.png に作る
# 使い方: sh tools/transitions.sh out/final.mp4
set -eu
src="$1"
mkdir -p out/review
for s in 4.6 10.7 13.9 19.3 20.6 26.1 31.7 34.2 38.7 42.8 44.6; do
  ffmpeg -v error -y -ss "$s" -i "$src" -t 1.2 -vf "fps=10,scale=320:180,drawtext=text='%{pts\\:hms}':x=4:y=4:fontsize=14:fontcolor=white:box=1:boxcolor=black,tile=6x2" -frames:v 1 "out/review/trans-$s.png"
done
