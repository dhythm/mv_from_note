#!/bin/sh
# 採用動画4本（企画側の Blender 素材）を 1 コマずつの JPEG にする（three.js のテクスチャとしてフレーム単位で読むため）。
# 出力: public/clips/<id>/NNNN.jpg（0 始まり）。再生成できるので Git 管理外。
set -eu
cd "$(dirname "$0")/.."
src=../assets/blender
for id in 07_before 08_backlog 13_quality_gates 15_feedback_loop; do
  mkdir -p "public/clips/$id"
  ffmpeg -v error -y -i "$src/$id.mp4" -q:v 3 -start_number 0 "public/clips/$id/%04d.jpg"
  echo "$id $(ls public/clips/$id | wc -l) frames"
done
mkdir -p public/stills
for s in 08_backlog-end 15_feedback_loop-end; do
  ffmpeg -v error -y -i "$src/stills/$s.webp" -q:v 2 "public/stills/$s.jpg"
done
