#!/bin/zsh
# 指定秒のスチルを描いて一覧画像にする: tools/stills.sh <sheet名> <t1,t2,...> [scale]
set -e
cd "$(dirname "$0")/.."
mkdir -p out/review/old
for f in out/review/still_*.png(N); do mv "$f" out/review/old/; done
node render.mjs stills "${3:-0.5}" "$2" 2>&1 | grep -iE "error|fail" || true
.venv/bin/python tools/sheet.py --cols 4 --w 480 "out/review/$1.png" out/review/still_*.png
