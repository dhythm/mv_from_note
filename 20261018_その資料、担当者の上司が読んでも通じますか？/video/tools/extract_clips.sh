#!/bin/sh
# 採用動画3本（企画側の透過WebM）を 1 コマずつの透過PNGにする（three.js のテクスチャとしてフレーム単位で読むため）。
# 透過を保つため VP9 のデコーダを入力の前に明示する。出力: public/clips/<id>/NNNN.png（0 始まり）。Git 管理外。
set -eu
cd "$(dirname "$0")/.."
src=../assets/video
for id in handoff question reader; do
  rm -rf "public/clips/$id"
  mkdir -p "public/clips/$id"
  ffmpeg -v error -y -c:v libvpx-vp9 -i "$src/$id-alpha.webm" -start_number 0 "public/clips/$id/%04d.png"
  echo "$id $(ls public/clips/$id | wc -l | tr -d ' ') frames"
done
