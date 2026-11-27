"""声の語の時刻を引く: .venv/bin/python tools/when.py <区切りid> <語> [<語> ...] → その語の頭と終わり（区切りの頭からの秒）"""
import json
import sys
from pathlib import Path

w = json.loads((Path(__file__).resolve().parents[1] / 'audio' / 'voice' / 'words.json').read_text())[sys.argv[1]]
text = ''.join(c[0] for c in w['chars'])
for q in sys.argv[2:]:
    i = text.find(q)
    print(q, 'なし' if i < 0 else f"{w['chars'][i][1]:.2f}-{w['chars'][i + len(q) - 1][2]:.2f}")
