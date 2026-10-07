"""標準ライブラリのみで編集用SVGと状態データを再生成する。"""
from pathlib import Path
import json
from html import escape
P=Path(__file__).resolve().parent
C={'bg':'#f7f6f3','ink':'#3a3a3a','bar':'#4a5a6a','extra':'#8a5a4a','warn':'#c45c3a','done':'#3a5a4a','line':'#d0cec8'}
# 営業日や工数の実測値ではない。時点の前後関係を表す説明用モデル。
MODEL={'units':'説明用の時間位置。実測日付・進捗率・工数ではない','now':4,'deadline':7,
 'completed':[0,4],'original_remaining':[4,6],'additional':[4,6],
 'replanned_remaining':[6,8],'downstream':[8,10],
 'progress_example':'原稿の7割。横幅の比率とは対応させない'}
(P/'schedule-model.json').write_text(json.dumps(MODEL,ensure_ascii=False,indent=2)+'\n')

def text(id,x,y,s,size=32,fill=None,weight=600):
 return f'<text id="{id}" x="{x}" y="{y}" font-size="{size}" font-weight="{weight}" fill="{fill or C["ink"]}">{escape(s)}</text>'
def rect(id,x,y,w,h,fill,opacity=1):
 return f'<rect id="{id}" x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{fill}" opacity="{opacity}"/>'
def line(id,x,y,xx,yy,color=None,dash=False):
 return f'<path id="{id}" d="M{x} {y} L{xx} {yy}" fill="none" stroke="{color or C["line"]}" stroke-width="3"'+(' stroke-dasharray="10 8"' if dash else '')+'/>'
def group(id,content):return f'<g id="{id}">{content}</g>'
def svg(name,title,sub,content,foot):
 body=rect('background',0,0,1280,720,C['bg'])+text('headline',64,103,title,44)+text('subheadline',64,151,sub,24,weight=400)+content+text('footer',64,660,foot,23,weight=400)
 (P/(name+'.svg')).write_text('<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720"><g font-family="Hiragino Sans,Noto Sans JP,sans-serif">'+body+'</g></svg>\n')
def axis(deadline=False):
 s=line('axis',240,215,1140,215)
 for i in range(11):
  x=240+86*i
  s+=line(f'grid-{i}',x,215,x,575)+text(f'time-{i}',x-8,200,str(i),18,weight=400)
 s+=text('time-unit',240,600,'時間位置（説明用）',19,weight=400)
 s+=line('now-line',584,215,584,575,C['ink'],True)+text('now-label',552,244,'現在',20)
 if deadline:s+=line('deadline-line',842,215,842,575,C['warn'],True)+text('deadline-label',850,244,'期限',22,C['warn'])
 return group('timeline',s)
def bar(id,label,start,end,row,color):
 y=280+row*76
 return group(id,text(id+'-label',64,y+29,label,25)+rect(id+'-shape',240+86*start,y,86*(end-start),42,C[color]))
def gantt(name,title,sub,variant,foot,deadline=False):
 s=axis(deadline)
 if variant=='initial':
  s+=bar('work','実施中',0,6,0,'bar')+bar('downstream','後工程',6,8,2,'bar')
  s+=bar('added','追加',4,6,1,'extra')
 elif variant=='shift':
  s+=rect('original-position',240,280,516,42,'none')
  s+=f'<rect id="original-outline" x="240" y="280" width="516" height="42" rx="8" fill="none" stroke="{C["ink"]}" stroke-dasharray="8 6"/>'
  s+=bar('shifted-work','実施中',2,8,0,'bar')+bar('added','追加',4,6,1,'extra')+bar('shifted-downstream','後工程',8,10,2,'bar')
 elif variant=='split':
  s+=bar('completed','完了部分',0,4,0,'done')+bar('added','追加',4,6,1,'extra')
  s+=group('floating-remaining',text('floating-label',800,283,'残りを分離',24)+rect('floating-shape',790,300,172,42,C['bar']))
  s+=f'<path id="insert-path" d="M876 350 C1050 400 900 450 810 450" fill="none" stroke="{C["warn"]}" stroke-width="4" stroke-dasharray="8 6"/>'
 elif variant=='insert':
  s+=bar('completed','完了部分',0,4,0,'done')+bar('added','追加',4,6,1,'extra')+bar('remaining','残作業',6,8,2,'bar')+bar('downstream','後工程',8,10,3,'bar')
 svg(name,title,sub,group('schedule',s),foot)
gantt('01-added-task','日付は埋まった。そこへ、追加。','担当者の希望日を並べただけでは、足りない。','initial','まず文字を読み、追加バーの割り込みを追う。')
gantt('02-blanket-shift','進んだ分まで、右へ？','破線は元の位置。影響対象を一律にずらした案。','shift','これは説明不足の案。すべての延期を否定するものではない。')
s=group('dependency-chain',rect('upstream',90,300,260,80,C['bar'])+text('upstream-text',120,351,'受け渡し',32,C['bg'])+line('dependency-one',350,340,490,340,C['warn'])+rect('next',490,300,260,80,C['bar'])+text('next-text',540,351,'後工程',32,C['bg'])+line('dependency-two',750,340,890,340,C['warn'])+rect('final',890,300,260,80,C['bar'])+text('final-text',940,351,'完了',32,C['bg']))
s+=group('acceptable',text('acceptable-label',90,457,'許容できる → 日付はそのまま',31,C['done']))
s+=group('buffer',text('buffer-label',90,523,'後ろも遅れる → バッファを検討',31)+rect('buffer-space',740,474,120,66,C['warn'],.15)+text('buffer-caption',757,517,'余白',26,C['warn']))
svg('03-delay-impact','遅れたら、何が起きる？','リスクを聞いてから、日付と余白を考える。',s,'品質が下がるほど前倒しするなら、本人と相談する。')
s=''
for id,y,title,blocks,labels in [('grounded',300,'理由がわかる短縮',['done','done'],['作業','検証']),('risky',475,'検証を削る短縮',['bar','warn'],['作業','検証減'])]:
 s+=text(id+'-title',80,y-30,title,30)
 s+=group(id,rect(id+'-work',80,y,210,66,C[blocks[0]])+rect(id+'-verification',300,y,210,66,C[blocks[1]],.3 if id=='risky' else 1)+text(id+'-work-label',143,y+44,labels[0],28,C['bg'])+text(id+'-verification-label',350,y+44,labels[1],28,C['ink'] if id=='risky' else C['bg'])+text(id+'-duration',600,y+44,'4週 → 2週',42)+text(id+'-result',920,y+43,'問題ない' if id=='grounded' else 'リスク',36,C['done'] if id=='grounded' else C['warn']))
svg('04-shortening-cases','同じ2週間でも、中身が違う。','説明用の対比。具体工程や短縮効果の実例ではない。',s,'工程・余白・検証を順に見せ、最後に二例を比較する。')
gantt('05-split-work','完了部分を残し、残りを分ける。','原稿の7割は説明用。期間幅の比率とは対応しない。','split','この状態は変形途中。残作業を追加タスクの後ろへ運ぶ。')
gantt('06-readable-record','記録は読める。でも、期限は？','完了 → 追加 → 残作業。期限の問題は残っている。','insert','分割は唯一の正解ではない。納期解決・顧客承認も意味しない。',True)
s=line('shared-deadline',640,235,640,540,C['warn'],True)+text('deadline-title',565,215,'期限を基準に',25,C['warn'])
for id,x,title in [('plan-a',80,'期限内に終える案'),('plan-b',700,'代わりの案')]:
 s+=group(id,rect(id+'-panel',x,270,500,225,C['line'],.35)+text(id+'-title',x+28,322,title,34)+text(id+'-risk',x+28,385,'課題・リスクを示す',29)+text(id+'-feasibility',x+28,448,'実行できる手札を確認',27))
s+=text('staff-check',80,548,'人を増やすなら、先に社内でアサイン可否を確認。',27)+text('decision-request',300,598,'関係者に、判断を求める。',40)
svg('07-options-risks','案とリスクをそろえる。','具体的な短縮効果・人数・費用・承認結果は付け足さない。',s,'この図は判断の構造。承認済みの記号や架空の効果を出さない。')
s=group('starting-point',text('starting-title',80,285,'日付の集合',36)+rect('old-a',80,323,250,38,C['bar'],.45)+rect('old-b',150,379,250,38,C['bar'],.45)+text('starting-caption',80,475,'スタート地点',34))
s+=group('read-risk',text('risk-title',655,285,'リスクを読む',38)+rect('final-completed',650,325,130,38,C['done'])+rect('final-extra',790,381,110,38,C['extra'])+rect('final-remaining',910,437,150,38,C['bar'])+text('replan-title',655,522,'組み替え、判断を求める',33))
s+=text('conclusion',200,599,'初めて、スケジュールになる。',44)
svg('08-conclusion','成功したら、PMのおかげでもある。','文字とバーの構図を再編しながら、結びへ。',s,'日付の裏のリスクを読み、成功する形に組み替える。')
manifest={'canvas':[1280,720],'fps':30,'source':'原稿とplan.md。すべてローカルの作画。外部生成なし','cost':0,'status':'静止状態の編集用素材。アニメーション・可読性・音楽同期は試作で確認する','files':[{'file':f.name,'scene':i+1,'editable':'SVGのid付きg要素・text・path・rect','role':'配置見本兼編集元。SVG画像の切替だけで本編を作らない'} for i,f in enumerate(sorted(P.glob('0*.svg')))]}
(P/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
