#!/bin/sh
# 指定した秒の静止画を書き出して一覧にする（検品用。output/ へ）
# 使い方: sh scripts/stills.sh Proto name 0.5 3.9 ...
comp=$1; name=$2; shift 2
out=../../output/opus-video/check/$name
mkdir -p "$out"
frames=""
for s in "$@"; do frames="$frames $(python3 -c "print(round($s*24))")"; done
for f in $frames; do
  npx remotion still src/index.ts "$comp" "$out/f$(printf %05d $f).png" --frame=$f --scale=0.5 --log=error >/dev/null 2>&1 || echo "fail $f"
done
ls "$out"/f*.png | head -100 > /dev/null
ffmpeg -y -loglevel error -pattern_type glob -i "$out/f*.png" -vf "tile=4x$(( ($# + 3) / 4 )):padding=4" -frames:v 1 "$out/sheet.png"
echo "$out/sheet.png"
