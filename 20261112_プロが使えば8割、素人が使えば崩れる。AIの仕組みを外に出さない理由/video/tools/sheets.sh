#!/bin/zsh
# 全編のコマ一覧（目視用）: tools/sheets.sh <動画> <間隔秒>  → out/review/s_<開始>.png
PY=${PY:-python3}
V=$1; STEP=${2:-1}
$PY tools/strip.py $V 0 45 $STEP out/review/s_0.png
$PY tools/strip.py $V 45 90 $STEP out/review/s_45.png
$PY tools/strip.py $V 90 129.5 $STEP out/review/s_90.png
