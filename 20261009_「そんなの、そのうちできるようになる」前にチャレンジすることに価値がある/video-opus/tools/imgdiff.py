"""2枚の画像の差: 画素ごとの最大チャンネル差が 64 を超える画素の割合（ロゴの形の位置ずれを検出）と平均差。"""
import json
import sys

import numpy as np
from PIL import Image

a = np.asarray(Image.open(sys.argv[1]).convert('RGB'), dtype=np.int16)
b = np.asarray(Image.open(sys.argv[2]).convert('RGB'), dtype=np.int16)
d = np.abs(a - b).max(axis=2)
print(json.dumps({'diff_ratio': round(float((d > 64).mean()), 5), 'mean_abs': round(float(d.mean()), 3)}))
