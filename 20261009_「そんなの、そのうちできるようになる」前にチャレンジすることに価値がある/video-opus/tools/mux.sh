#!/bin/zsh
# 区間動画に BGM の同じ区間を重ねる: tools/mux.sh <無音の区間動画> <開始秒> <wav> <出力>
set -e
cd "$(dirname "$0")/.."
dur=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$1")
ffmpeg -v error -y -i "$1" -ss "$2" -t "$dur" -i "$3" -map 0:v -map 1:a -c:v copy -c:a aac -b:a 256k -shortest "$4"
echo "$4"
