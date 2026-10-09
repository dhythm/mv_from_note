"""経路の事前計算（固定seed）。

assets/type/experience-mask.png（1600x700、白＝「経験」）を格子に分け、白い格子の上に
「試行錯誤の木」を育てる。木の根は「経」の左下（カット6の柱が立つ場所）。各格子には
根からの深さ（掘られる順番）を持たせ、映像側は「現在の深さ」より浅い枝だけを光らせる。

- 枝の行き止まりの一部に × を置く（カット7・9で近接で見せ、カット10の俯瞰でも同じ位置に残る）
- 字形の外側へ少し飛び出して失敗する枝（外の ×）も作る
- 離れた部分（字画の島）は短い「渡り」でつなぐ（細く暗く描く）
- 冒頭〜カット3の「回り道」（舗装帯に沿うジグザグと、行き止まりの寄り道）も同じ座標で定義

出力: src/lib/paths.json
座標: 世界の x = (px - 800) * S, z = (py - 350) * S（俯瞰で画像と同じ向き。上が -z）
"""
import json
import random
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
S = 0.05  # 1px あたりの世界単位
CELL = 14  # 格子 1 マスの px
SEED = 20261009

rng = random.Random(SEED)
mask = np.asarray(Image.open(ROOT / 'tools' / 'experience-mask.png').convert('L'), dtype=np.float32) / 255.0
H, W = mask.shape
gw, gh = W // CELL, H // CELL


def cell_fill(i, j):
    blk = mask[j * CELL:(j + 1) * CELL, i * CELL:(i + 1) * CELL]
    return float(blk.mean())


inside = np.zeros((gh, gw), dtype=bool)
for j in range(gh):
    for i in range(gw):
        inside[j, i] = cell_fill(i, j) > 0.55

NB = [(1, 0), (-1, 0), (0, 1), (0, -1)]


def world(i, j):
    px = (i + 0.5) * CELL
    py = (j + 0.5) * CELL
    return [round((px - 800) * S, 4), round((py - 350) * S, 4)]


# 連結成分
comp = -np.ones((gh, gw), dtype=int)
comps = []
for j in range(gh):
    for i in range(gw):
        if inside[j, i] and comp[j, i] < 0:
            q = deque([(i, j)])
            comp[j, i] = len(comps)
            cells = []
            while q:
                a, b = q.popleft()
                cells.append((a, b))
                for di, dj in NB:
                    x, y = a + di, b + dj
                    if 0 <= x < gw and 0 <= y < gh and inside[y, x] and comp[y, x] < 0:
                        comp[y, x] = len(comps)
                        q.append((x, y))
            comps.append(cells)

# 根: 「経」の左下（糸へんの縦画の下端付近）
root_target = (345 / CELL, 610 / CELL)
all_inside = [(i, j) for j in range(gh) for i in range(gw) if inside[j, i]]
root = min(all_inside, key=lambda c: (c[0] - root_target[0]) ** 2 + (c[1] - root_target[1]) ** 2)
main = comp[root[1], root[0]]

# 島を「渡り」でつなぐ（つながった集合に最も近い島から順に、マンハッタンの直線経路で）
connected = set(comps[main])
bridge = set()
remaining = [k for k in range(len(comps)) if k != main]
while remaining:
    best = None
    for k in remaining:
        for c in comps[k][::2]:
            for d in list(connected)[::3]:
                dist = abs(c[0] - d[0]) + abs(c[1] - d[1])
                if best is None or dist < best[0]:
                    best = (dist, k, c, d)
    _, k, c, d = best
    # d -> c へ L 字で渡す
    x, y = d
    path = []
    while x != c[0]:
        x += 1 if c[0] > x else -1
        path.append((x, y))
    while y != c[1]:
        y += 1 if c[1] > y else -1
        path.append((x, y))
    for p in path:
        if not inside[p[1], p[0]]:
            bridge.add(p)
    connected |= set(comps[k]) | set(path)
    remaining.remove(k)

nodes = set(all_inside) | bridge

# 成長する木（growing tree: 6割は最新、4割はランダムに選ぶ）
parent = {root: None}
active = [root]
order = [root]
while active:
    idx = len(active) - 1 if rng.random() < 0.6 else rng.randrange(len(active))
    cur = active[idx]
    nbs = [(cur[0] + di, cur[1] + dj) for di, dj in NB]
    nbs = [n for n in nbs if n in nodes and n not in parent]
    # 渡りの格子は渡りに沿ってしか進まない（迂回で字形の外を光らせない）
    if not nbs:
        active.pop(idx)
        continue
    n = rng.choice(nbs)
    parent[n] = cur
    order.append(n)
    active.append(n)

assert len(parent) == len(nodes), (len(parent), len(nodes))

# 根からの深さ
children = {n: [] for n in parent}
for n, p in parent.items():
    if p is not None:
        children[p].append(n)
depth = {root: 0}
q = deque([root])
while q:
    a = q.popleft()
    for c in children[a]:
        depth[c] = depth[a] + 1
        q.append(c)
maxd = max(depth.values())

# 行き止まり（葉）。深い葉ほど × を付けやすい
leaves = [n for n in parent if not children[n] and n != root and n not in bridge]
rng2 = random.Random(SEED + 1)
cross = [n for n in leaves if rng2.random() < 0.28]

# 字形の外へ飛び出して失敗する枝（2〜3マス）。外側に面した格子から
outs = []
edge_cells = [n for n in all_inside if any((n[0] + di, n[1] + dj) not in nodes for di, dj in NB)]
rng3 = random.Random(SEED + 2)
rng3.shuffle(edge_cells)
used = set()
for c in edge_cells:
    if len(outs) >= 34:
        break
    dirs = [(di, dj) for di, dj in NB if (c[0] + di, c[1] + dj) not in nodes]
    if not dirs:
        continue
    di, dj = rng3.choice(dirs)
    L = rng3.choice([2, 2, 3])
    pts = [(c[0] + di * k, c[1] + dj * k) for k in range(1, L + 1)]
    if any(p in nodes or p in used or not (0 <= p[0] < gw and 0 <= p[1] < gh) for p in pts):
        continue
    # 近くの飛び出しと重ならないように
    if any(abs(p[0] - u[0]) + abs(p[1] - u[1]) < 3 for p in pts for u in used):
        continue
    used |= set(pts)
    outs.append({'from': world(*c), 'pts': [world(*p) for p in pts], 'd0': depth[c]})

# 映像側が使う辺の一覧: [x0,z0,x1,z1, d(子の深さ), kind] kind 0=字形 1=渡り
edges = []
for n, p in parent.items():
    if p is None:
        continue
    a = world(*p)
    b = world(*n)
    kind = 1 if (n in bridge or p in bridge) else 0
    # 格子の角ばりをわずかに崩す（固定seedのずれ）
    edges.append([a[0], a[1], b[0], b[1], depth[n], kind])

# カメラが追う枝: 根から「験」の右側の深い葉へ（カット7・9・10の前進で使う）
def path_to(n):
    out = []
    while n is not None:
        out.append(n)
        n = parent[n]
    return out[::-1]

deep_leaves = sorted(leaves, key=lambda n: -depth[n])
# カット7: 根から近い中くらいの深さの葉、カット9: 中盤の葉、カット10: 最深
def pick(lo, hi, prefer_x):
    cand = [n for n in leaves if lo <= depth[n] <= hi]
    return min(cand, key=lambda n: abs(n[0] - prefer_x * gw))

follow = {
    'c7': [world(*c) for c in path_to(pick(int(maxd * 0.18), int(maxd * 0.3), 0.22))],
    'c9': [world(*c) for c in path_to(pick(int(maxd * 0.42), int(maxd * 0.6), 0.55))],
    'c10': [world(*c) for c in path_to(deep_leaves[0])],
}

# 冒頭の回り道（舗装帯 z=ROAD_Z に沿って東へジグザグ、途中で南へ寄り道して行き止まり）。
ROAD_Z = 25.0
rx, rz = world(*root)
detour = [
    [-74.0, 26.5], [-70.0, 21.8], [-65.5, 28.4], [-61.0, 22.6], [-57.5, 29.2],  # ここまでカット1〜2
    [-53.0, 23.0], [-50.0, 31.5], [-47.5, 35.5],  # 南への寄り道 → 行き止まり ×（カット3）
    [-50.0, 31.5], [-44.0, 21.0], [-39.0, 28.0], [-34.0, 20.5], [-29.5, 26.0],
    [rx - 2.0, 19.5], [rx, 16.6], [rx, rz + 0.8],
]
data = {
    'seed': SEED,
    'scale': S,
    'cell': CELL * S,
    'grid': [gw, gh],
    'root': world(*root),
    'maxDepth': maxd,
    'edges': edges,
    'cross': [world(*c) + [depth[c]] for c in cross],
    'outs': outs,
    'follow': follow,
    'detour': detour,
    'detourDeadEnd': 7,
    'roadZ': ROAD_Z,
    'stats': {'cells': len(nodes), 'bridge': len(bridge), 'islands': len(comps), 'leaves': len(leaves), 'cross': len(cross), 'outs': len(outs)},
}
(ROOT / 'src' / 'lib' / 'paths.json').write_text(json.dumps(data, separators=(',', ':')))
print(json.dumps(data['stats']), 'maxDepth', maxd, 'root', data['root'])

# 確認用の俯瞰画像（深さで色分け）
img = Image.new('RGB', (W, H), (20, 18, 16))
from PIL import ImageDraw
dr = ImageDraw.Draw(img)
for e in edges:
    x0 = e[0] / S + 800; y0 = e[1] / S + 350; x1 = e[2] / S + 800; y1 = e[3] / S + 350
    c = int(80 + 175 * e[4] / maxd)
    dr.line([x0, y0, x1, y1], fill=(c, 255, 26) if e[5] == 0 else (90, 90, 90), width=4)
for c in cross:
    x, y = world(*c); x = x / S + 800; y = y / S + 350
    dr.line([x - 6, y - 6, x + 6, y + 6], fill=(255, 80, 80), width=3); dr.line([x - 6, y + 6, x + 6, y - 6], fill=(255, 80, 80), width=3)
for o in outs:
    pts = [o['from']] + o['pts']
    dr.line([(p[0] / S + 800, p[1] / S + 350) for p in pts], fill=(255, 160, 60), width=3)
img.save(ROOT / 'out' / 'review' / 'paths-preview.png')
