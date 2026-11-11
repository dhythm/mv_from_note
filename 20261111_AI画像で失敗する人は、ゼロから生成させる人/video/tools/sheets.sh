#!/bin/zsh
# 全編のコマ一覧（目視用）: tools/sheets.sh <動画> <間隔秒>  → out/review/s_<開始>.png
PY=${PY:-python3}
V=$1; STEP=${2:-1}
$PY tools/strip.py $V 0 38 $STEP out/review/s_0.png
$PY tools/strip.py $V 38 76 $STEP out/review/s_38.png
$PY tools/strip.py $V 76 112 $STEP out/review/s_76.png
$PY tools/strip.py $V 112 147.3 $STEP out/review/s_112.png
