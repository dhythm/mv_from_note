"""一回限りの書き換え: 各カットの外側の group を Stage に置き換える（安全域計算のため）。"""
import re
from pathlib import Path

d = Path(__file__).resolve().parent.parent / 'src' / 'components' / 'cuts'
for f in sorted(d.glob('C*.tsx')):
    s = f.read_text()
    if '<Stage ' in s:
        continue
    s2 = s.replace('<group position={[s.x, 0, 0]}>', '<Stage x={s.x}>').replace('<group position={[s.x, 0.9, 0]}>', '<Stage x={s.x} y={0.9}>')
    idx = s2.rfind('    </group>\n  );\n};')
    assert idx >= 0, f
    s2 = s2[:idx] + '    </Stage>\n  );\n};' + s2[idx + len('    </group>\n  );\n};'):]
    s2 = s2.replace("import {KText} from '../KText';", "import {KText} from '../KText';\nimport {Stage} from '../Stage';", 1)
    assert s2.count('<Stage') == 1 and "import {Stage}" in s2, f
    f.write_text(s2)
    print('updated', f.name)
