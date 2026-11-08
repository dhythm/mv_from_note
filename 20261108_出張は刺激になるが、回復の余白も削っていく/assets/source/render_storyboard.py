"""Render editable, deterministic composition diagrams; not final video frames."""
from pathlib import Path
import json, sys, re
from PIL import Image, ImageDraw, ImageFont, ImageOps
P=Path(__file__).resolve().parents[2]
C=json.loads((P/'assets/source/cuts.json').read_text())
F='/System/Library/Fonts/ヒラギノ角ゴシック W6.ttc'
R='/System/Library/Fonts/ヒラギノ角ゴシック W3.ttc'
BG='#F6F3EC'; INK='#1C1915'; OCH='#E07A2F'; GRAY='#D6CEC0'; GREEN='#2F6F62'
checks=[]
def font(n,b=True):return ImageFont.truetype(F if b else R,n)
def txt(im,text,x,y,size=40,fill=INK,bold=True,maxwidth=None):
 if re.search(r'はじめ|おわり|インサート中|^[0-9０-９]+\s*[/／]|^第.+章',text):raise ValueError('Production label inside image: '+text)
 d=ImageDraw.Draw(im)
 while maxwidth and d.textbbox((0,0),text,font=font(size,bold))[2]>maxwidth:size-=1
 box=d.textbbox((x,y),text,font=font(size,bold));d.text((x,y),text,font=font(size,bold),fill=fill)
 checks.append({'text':text,'box':box,'size':size})
 return box

def box(im,rect,state,details=False,compact=False):
 x,y,w,h=rect; a,g=state;d=ImageDraw.Draw(im); aw=round(w*a);gw=round(w*g)
 d.rectangle((x,y,x+w,y+h),fill='#FFFCF6')
 d.rectangle((x,y,x+aw,y+h),fill=OCH)
 d.rectangle((x+aw,y,x+aw+gw,y+h),fill=GRAY)
 d.rectangle((x,y,x+w,y+h),outline=INK,width=3)
 if aw+gw<w-2:d.line((x+aw+gw,y,x+aw+gw,y+h),fill=GREEN,width=4)
 if compact:
  txt(im,'得たもの',x+16,y+20,22,maxwidth=aw-25)
  if w-aw-gw>90:txt(im,'余白',x+aw+gw+10,y+24,22,fill=GREEN,maxwidth=w-aw-gw-15)
 else:
  txt(im,'得られたもの',x+18,y+18,24,maxwidth=aw-30)
  if gw>125:txt(im,'移動・予定',x+aw+14,y+18,22,maxwidth=gw-25)
  if w-aw-gw>110:
   txt(im,'回復の余白',x+aw+gw+12,y+h//2-15,26,fill=GREEN,maxwidth=w-aw-gw-20)
  if details and h>150:
   for j,s in enumerate(details):txt(im,s,x+22,y+70+j*49,29,maxwidth=aw-42)
 return (x+aw+gw,y)

only_cut=int(sys.argv[1]) if len(sys.argv)>1 else None
for name in ([] if only_cut else ['family-time','rest-before-exhaustion','drink-in-moderation']):
 src=Image.open(P/f'assets/broll/{name}.png').convert('RGB')
 ImageOps.fit(src,(1920,1080),method=Image.Resampling.LANCZOS).save(P/f'assets/broll/{name}.webp',quality=93)

for c in C:
 if only_cut and c['n']!=only_cut:continue
 for stage in ['start','end']:
  n=c['n'];end=stage=='end';state=c['state'][end]
  im=Image.new('RGB',(1280,720),BG);d=ImageDraw.Draw(im);checks=[]
  # Labels here describe the metaphor, not percentages or a scientific measurement.
  if n==1:
   txt(im,'刺激は、得られる。',70,105,64 if end else 55)
   txt(im,'余白は、失われる。',220 if end else 150,205,64 if end else 55)
   txt(im,'自分のキャパ',74,338,24)
   box(im,(74,387,1130,226),state)
  elif n==2:
   txt(im,'得られるものの、内訳。',70,110,54)
   txt(im,'自分のキャパ',74,237,24)
   box(im,(74,282,1130,334),state,['学び。','新しい出会い。'] if end else ['学び。'])
  elif n==3:
   txt(im,'楽しいのに、',70,118,47)
   txt(im,'体が重い。',70 if not end else 105,215,77 if end else 65)
   txt(im,'自分のキャパ',74,385,24)
   box(im,(74,431,1130,174),state)
  elif n==4:
   txt(im,'自分のキャパ',74,160,24)
   box(im,(74,210,590,395),state,['学び','出会い','縁'] if end else ['学び','出会い'])
   txt(im,'得られた',714,197,48)
   txt(im,'ものは、',714,263,48)
   txt(im,'残る。',704 if end else 724,376,98 if end else 82)
  elif n==5:
   txt(im,'予定は、続く。',70,111,62)
   txt(im,'手元は、止まる。',240 if end else 150,213,62)
   txt(im,'自分のキャパ',74,342,24)
   box(im,(74,387,1130,168),state)
   if end:
    txt(im,'やれたはずのこと',770,583,22,bold=False)
    d.rectangle((940,626,1200,685),outline=GREEN,width=2)
    txt(im,'いつもの作業',960,637,26)
   else:
    # A possible activity lives in the remaining free region before being displaced.
    txt(im,'いつもの作業',1036,483,22)
  elif n==6:
   txt(im,'日常は、',70,108,52)
   txt(im,'待ってくれない。',70,207,77)
   txt(im,'自分のキャパ',74,364,24)
   box(im,(74,410,1130,174),state)
   txt(im,'翌日',800 if end else 1010,603,43)
   txt(im,'やれたはずのこと',74,633,22,bold=False)
  elif n in [7,8,9]:
   # These are the shots BEFORE and AFTER the full-screen insert.
   # The illustration itself is exported separately as the third storyboard state.
   if n==7:
    txt(im,'使える時間は、',68,132,45)
    if end:
     txt(im,'自分だけの',184,220,76,maxwidth=950)
     txt(im,'ものではない。',276,307,76,maxwidth=930)
   elif n==8:
    if not end:
     txt(im,'疲れてからでは、',68,133,49)
     txt(im,'遅い。',300,228,86)
    else:
     txt(im,'予防が、先。',130,205,94,maxwidth=1050)
   else:
    if not end:txt(im,'飲みすぎない。',100,179,80,maxwidth=1080)
    else:
     txt(im,'溜めない。',130,150,94,maxwidth=1050)
     txt(im,'それでも、無理はする。',530,343,43,maxwidth=680)
   txt(im,'自分のキャパ',74,477,22)
   box(im,(74,521,1130,90),state,compact=True)
   if n==7:txt(im,'やれたはずのこと・使えたはずの時間',74,651,24,bold=False)
  else:
   box(im,(891,64,311,78),state,compact=True)
   lines=c['words']
   for i,s in enumerate(lines):txt(im,s,70+i*35,168+i*95,43 if i<3 else (58 if end else 50),maxwidth=1130-i*35)
  failures=[b for b in checks if b['box'][0]<40 or b['box'][1]<25 or b['box'][2]>1240 or b['box'][3]>700]
  if failures:raise RuntimeError((n,stage,failures))
  for i,a in enumerate(checks):
   for b in checks[i+1:]:
    aa,bb=a['box'],b['box']
    if min(aa[2],bb[2])>max(aa[0],bb[0]) and min(aa[3],bb[3])>max(aa[1],bb[1]):
     raise RuntimeError(('text overlap',n,stage,a['text'],b['text']))
  im.save(P/f'assets/storyboard/cut-{n:02d}-{stage}.webp',quality=93)
# Full-screen inserts carry only the existing illustration, no labels or diagram.
for c in C:
 if 'asset' not in c or (only_cut and c['n']!=only_cut):continue
 asset=Image.open(P/f'assets/broll/{c["asset"]}.webp')
 ImageOps.fit(asset,(1280,720),method=Image.Resampling.LANCZOS).save(P/f'assets/storyboard/cut-{c["n"]:02d}-insert.webp',quality=93)
# Compact overview of all end compositions for human QA.
imgs=[Image.open(P/f'assets/storyboard/cut-{n:02d}-end.webp').resize((384,216)) for n in range(1,12)]
canvas=Image.new('RGB',(1152,864),'#ffffff')
for i,img in enumerate(imgs):canvas.paste(img,((i%3)*384,(i//3)*216))
canvas.save(P/'assets/storyboard/overview.webp',quality=91)
print('Storyboard frames rendered without production labels; full-screen inserts exported; bounds and overlaps passed')
