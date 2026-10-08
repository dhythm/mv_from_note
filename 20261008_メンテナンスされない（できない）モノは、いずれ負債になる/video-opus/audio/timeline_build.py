"""ナレーション実尺と文字時刻から、映像・音楽が共有するタイムライン src/lib/timeline.json を作る（API利用なし）。

- カットの開始 = 前カットの発話終了 + 余韻(tail)。発話開始 = カット開始 + lead。
- 要点(phrase)は送信文の部分文字列。文字単位の時刻から開始・終了の絶対秒を求める。
- 各発話の終わりまで、そのカットの画を保つ（発話中に次の論点へ進めない）。
"""
import json
from pathlib import Path

here = Path(__file__).resolve().parent
root = here.parent
plan = json.loads((here / 'narration-plan.json').read_text())

PRE = 0.6
LEAD = 0.25
TAIL = {1: 0.6, 2: 0.7, 3: 2.0, 4: 1.2, 5: 0.8, 6: 1.0, 7: 0.8, 8: 1.0, 9: 1.2, 10: 4.2}
BPM = 124
BAR = 4 * 60 / BPM

PHRASES = {
    1: {'q': '今のまま？', 'field': '手入れをやめた畑', 'run': '止まらずに荒れていく'},
    2: {'bike': '乗らない自転車', 'rust': '錆びつき', 'car': '車はバッテリーが上がる', 'appl': '久しぶりに通電した家電', 'broke': 'その場で壊れることもある'},
    3: {'a': '何もしないのは', 'b': '現状維持じゃない', 'c': '劣化への', 'd': 'カウントダウンだ'},
    4: {'sw': 'ソフトウェアも同じだ', 'env': '環境は日々変わり', 'lib': 'ライブラリは古くなり', 'vul': '脆弱性が見つかる',
        'inv': 'でも形がないから', 'see': '錆びは見えない', 'ok': '放っておいても平気だと', 'illu': '錯覚してしまう',
        'real': '実際は', 'rot': '見えないところで腐食が進んでいる'},
    5: {'ai': 'エーアイで作れるなら', 'waste': '保守費は無駄だ', 'voice': 'そんな声もある', 'self': '自分たちで作ること自体は',
        'great': '素晴らしい挑戦だ', 'but': 'ただ', 'keep': '作ったあとも手入れを続けなければ', 'broke': 'すぐに使えなくなる',
        'premise': 'その前提を、見落としてはいけない'},
    6: {'pta': 'ピーティーエーや理事会', 'maker': '詳しい人が', 'tool': '善意で便利なツールを作る', 'change': 'でも役員が替われば',
        'who': '誰が直せるの？', 'debt': '担い手のいない仕組みは', 'debt2': '後任の負債になる', 'need': '必要なのは',
        'fall': '自分が倒れても', 'help': '誰かの助けで回せる', 'std': '標準化された仕組みだ'},
    7: {'buy': '家も、車も', 'upkeep': '買った瞬間から維持費がかかる', 'old': '買い切りの古いソフトは', 'os': 'オーエスが更新されると',
        'fail': '起動できなくなることもある', 'wish0': '一度買えばずっと使える', 'wish': 'は買い手の願望だ', 'cost': '手入れには、手間とお金がかかる'},
    8: {'once': '一度の支払いで', 'life': '生涯保証', 'but': 'でも、使われるほど', 'load': 'サーバーとサポートの負担は増えていく',
        'only': '提供する側だけが消耗する仕組みは', 'nolast': '続かない', 'fall': '事業者が倒れれば', 'gone': '保証も消える',
        'hurt': 'いちばん困るのは', 'user': 'データを預けた利用者だ'},
    9: {'both': '提供する側も、使う側も', 'bal': '続けられるバランス', 'pay': '払った対価が', 'time': '人の時間になり',
        'fix': '点検と修繕になって', 'tool': '道具を明日も動かす', 'notonly': '保守費は、相手を儲けさせるためだけじゃない',
        'ins': '自分の道具を守る、保険でもある'},
    10: {'all': '土地も、道具も、ソフトウェアも', 'wild': '手入れを怠れば荒れていく', 'pay': '手入れに、正当な対価を払う',
         'q': 'それが、自分を守る、いちばんの近道ではないだろうか'},
}

cuts = []
t = PRE
for c in plan['cuts']:
    n = c['cut']
    rec = json.loads((here / 'narration' / 'v4' / f'cut-{n:02d}.json').read_text())
    al = rec['alignment']
    chars = ''.join(al['characters'])
    assert chars == c['text'], f'cut {n}: alignment text mismatch'
    start = t
    voice = start + LEAD
    # 末尾の句点の伸びは発話に含めない
    speech_end = al['character_end_times_seconds'][len(chars.rstrip('。？')) - 1]
    phrases = {}
    for k, s in PHRASES[n].items():
        i = chars.find(s)
        assert i >= 0, f'cut {n}: phrase {s} not found'
        j = i + len(s) - 1
        phrases[k] = [round(voice + al['character_start_times_seconds'][i], 3),
                      round(voice + al['character_end_times_seconds'][j], 3)]
    end = voice + speech_end + TAIL[n]
    cuts.append({'cut': n, 'start': round(start, 3), 'voice': round(voice, 3), 'voiceDur': round(rec['duration'], 3),
                 'speechEnd': round(voice + speech_end, 3), 'end': round(end, 3), 'p': phrases})
    t = end

total = round(t, 3)
frames = int(round(total * 30))
out = {'fps': 30, 'total': total, 'frames': frames, 'bpm': BPM, 'bar': BAR, 'cuts': cuts}
(root / 'src' / 'lib' / 'timeline.json').write_text(json.dumps(out, ensure_ascii=False, indent=1))
for c in cuts:
    print(c['cut'], c['start'], c['voice'], c['speechEnd'], c['end'])
print('total', total, 'frames', frames)
