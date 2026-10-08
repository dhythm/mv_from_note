"""確認用: スチルを時刻順に並べた一覧画像を作る。 python tools/sheet.py out.png still1.png still2.png ..."""
import subprocess
import sys
from pathlib import Path

out = sys.argv[1]
files = sorted(sys.argv[2:], key=lambda p: float(Path(p).stem.replace('still_', '').replace('_', '.')))
cols = 3
rows = (len(files) + cols - 1) // cols
args = ['ffmpeg', '-y', '-loglevel', 'error']
for f in files:
    args += ['-i', f]
labels = []
for i, f in enumerate(files):
    t = Path(f).stem.replace('still_', '').replace('_', '.')
    labels.append(f'[{i}:v]scale=640:360,drawtext=text=\'{t}s\':x=10:y=10:fontsize=26:fontcolor=yellow:box=1:boxcolor=black@0.6[v{i}]')
pad = len(files)
while pad < rows * cols:
    labels.append(f'color=black:s=640x360:d=1[v{pad}]')
    pad += 1
layout = '|'.join(f'{(i % cols) * 640}_{(i // cols) * 360}' for i in range(rows * cols))
fc = ';'.join(labels) + ';' + ''.join(f'[v{i}]' for i in range(rows * cols)) + f'xstack=inputs={rows * cols}:layout={layout}'
subprocess.run(args + ['-filter_complex', fc, '-frames:v', '1', out], check=True)
print(out)
