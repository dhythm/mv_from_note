#!/bin/zsh
# 全編のコマ一覧（目視用）: tools/sheets.sh <動画> <間隔秒>  → out/review/s_<開始>.png
PY=${PY:-.venv/bin/python}
V=$1; STEP=${2:-1}
$PY tools/strip.py $V 0 36 $STEP out/review/s_0.png
$PY tools/strip.py $V 36 73 $STEP out/review/s_36.png
$PY tools/strip.py $V 73 112 $STEP out/review/s_73.png
$PY tools/strip.py $V 112 133.8 $STEP out/review/s_112.png
