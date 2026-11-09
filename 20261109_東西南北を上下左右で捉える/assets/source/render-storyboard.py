"""Compose storyboard diagrams from unchanged supplied raster assets and native SVG shapes."""
from pathlib import Path
import html, json, subprocess, unicodedata, base64, re, math
from PIL import ImageFont

ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'assets/source'; IMG=ROOT/'assets/images'; OUT=ROOT/'assets/storyboard'
FONT=next(p for p in Path('/System/Library/Fonts').glob('*.ttc') if unicodedata.normalize('NFC',p.name)=='ヒラギノ角ゴシック W6.ttc')
INK='#1a1a1a'; RED='#b42318'; BLUE='#1d4e89'; GRAY='#5c5854'
checks=[]
def svg(body,w=1280,h=720):
    return f'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="{w}" height="{h}" viewBox="0 0 {w} {h}">{body}</svg>'
def pic(name,x,y,w,h):
    return f'<image x="{x}" y="{y}" width="{w}" height="{h}" xlink:href="../images/{name}" preserveAspectRatio="none"/>'
def rect(x,y,w,h,c,stroke='none',sw=0,rx=0,opacity=1):
    return f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="{rx}" fill="{c}" fill-opacity="{opacity}" stroke="{stroke}" stroke-width="{sw}"/>'
def line(x,y,a,b,c=BLUE,width=3):
    return f'<path d="M{x} {y}L{a} {b}" fill="none" stroke="{c}" stroke-width="{width}"/>'
class Frame:
    def __init__(self,name):
        self.name=name; self.body=pic('map-paper-curl.png',0,0,1280,720); self.texts=[]; self.pawns=[]
    def text(self,t,x,y,size=44,color=INK,anchor='start'):
        f=ImageFont.truetype(str(FONT),size)
        width=f.getlength(t); left=x-(width/2 if anchor=='middle' else width if anchor=='end' else 0)
        box=(left,y-size,left+width,y+size*.17)
        self.texts.append({'text':t,'box':box})
        self.body+=f'<text x="{x}" y="{y}" font-family="Hiragino Sans" font-weight="600" font-size="{size}" fill="{color}" text-anchor="{anchor}">{html.escape(t)}</text>'
    def pawn(self,x,y,size=30):
        self.body+=rect(x-size/2,y-size/2,size,size,'#f26b1d','#fffaf0',3,5)
        self.pawns.append((x-size/2,y-size/2,x+size/2,y+size/2))
    def map(self,x,y,size,angle=0,pawn=(.5,.6),north=True):
        pivot=pawn if pawn else (.5,.5)
        self.body+=f'<g transform="rotate({angle} {x+size*pivot[0]} {y+size*pivot[1]})">'+pic('rpg-map.png',x,y,size,size)+rect(x,y,size,size,'none',BLUE,3)+'</g>'
        if north:
            if angle==90:self.text('北',x+size+65,y+size*pivot[1]+10,30,BLUE)
            else:self.text('北',x+size/2,y-18,30,BLUE,'middle')
        if pawn:self.pawn(x+size*pawn[0],y+size*pawn[1])
    def board(self,x,y,w=390,h=330,angle=0,pawn=(.5,.5),north='北',color=BLUE):
        b=rect(x,y,w,h,'#d9e6f5' if color==BLUE else '#e8e2d6',color,3,opacity=.42)
        for i in (1,2):b+=line(x+w*i/3,y,x+w*i/3,y+h,color)+line(x,y+h*i/3,x+w,y+h*i/3,color)
        b+=line(x,y,x+w,y,color,7)
        self.body+=f'<g transform="rotate({angle} {x+w/2} {y+h/2})">{b}</g>'
        if north:
            if angle:
                rad=math.radians(angle)
                nx=x+w/2+math.sin(rad)*(h/2+46)
                ny=y+h/2-math.cos(rad)*(h/2+46)
                self.text(north,nx,ny+10,30,color,'middle')
            else:self.text(north,x+w/2,y-20,30,color,'middle')
        if pawn:self.pawn(x+w*pawn[0],y+h*pawn[1])
    def save(self):
        errors=[]
        def overlap(a,b):return min(a[2],b[2])>max(a[0],b[0]) and min(a[3],b[3])>max(a[1],b[1])
        for i,t in enumerate(self.texts):
            a=t['box']
            if a[0]<64 or a[1]<48 or a[2]>1216 or a[3]>672:errors.append('safe area: '+t['text'])
            if overlap(a,(1120,580,1280,720)):errors.append('paper curl overlap: '+t['text'])
            for u in self.texts[i+1:]:
                if overlap(a,u['box']):errors.append('text overlap: '+t['text']+' / '+u['text'])
            for b in self.pawns:
                if overlap(a,b):errors.append('pawn overlap: '+t['text'])
        file=SRC/(self.name+'.svg');file.write_text(svg(self.body))
        temp=SRC/(self.name+'.png')
        # librsvg rejects parent-directory image references; embed only for rendering.
        rendered=re.sub(r'../images/([^\"]+)',lambda m:'data:image/png;base64,'+base64.b64encode((IMG/m[1]).read_bytes()).decode(),svg(self.body))
        subprocess.run(['rsvg-convert','-o',str(temp)],input=rendered.encode(),check=True)
        subprocess.run(['magick',str(temp),'-quality','92',str(OUT/(self.name+'.webp'))],check=True)
        temp.unlink()
        checks.append({'frame':self.name,'errors':errors,'texts':self.texts})

# Native vector control icon. All states share geometry and a transparent canvas.
path='M200 70H312V200H442V312H312V442H200V312H70V200H200Z'
for state in ('neutral','up','right'):
    body=f'<path d="{path}" transform="translate(0 10)" fill="#20272d" stroke="#20272d" stroke-width="16" stroke-linejoin="round"/>'
    body+=f'<path d="{path}" fill="#525e68" stroke="#26313b" stroke-width="12" stroke-linejoin="round"/>'
    if state=='up':body+=rect(208,80,96,120,BLUE,rx=5)
    if state=='right':body+=rect(312,208,120,96,BLUE,rx=5)
    body+='<circle cx="256" cy="256" r="39" fill="#303d47" stroke="#667681" stroke-width="3"/>'
    for rotation in (0,90,180,270):
        body+=f'<path d="M256 104L234 139H278Z" fill="#e3e8e7" transform="rotate({rotation} 256 256)"/>'
    file=IMG/f'dpad-{state}.svg';file.write_text(svg(body,512,512))
    subprocess.run(['rsvg-convert',str(file),'-o',str(IMG/f'dpad-{state}.png')],check=True)

for n in range(1,11):
  for end in (False,True):
    f=Frame(f'cut-{n:02}-'+('end' if end else 'start'))
    if n==1:
        f.text('地図、回してますか？',80,126,66)
        f.map(400,225,410,90 if end else 0)
    elif n==2:
        f.text('上に行く。' if end else '北に行く、',80,237,76,RED if end else GRAY)
        if not end:f.text('じゃない。',80,333,60,GRAY)
        f.map(690,190,390,pawn=(.5,.38 if end else .6),north=False)
        if end:
            f.text('北＝上',885,150,30,BLUE,'middle'); f.text('南＝下',885,635,30,BLUE,'middle')
            f.text('西＝左',650,398,25,BLUE,'end');f.text('東＝右',1100,398,25,BLUE)
        else:f.text('北',885,150,30,BLUE,'middle')
    elif n==3:
        if end:
            f.text('回る派',80,130,38,GRAY);f.text('進行方向が、上。',80,190,40,GRAY)
            f.text('回らない派',690,130,38);f.text('北が、上。',690,190,48,RED)
            f.board(110,315,330,250,90,color='#8a7c6c')
            f.board(730,300,350,320,pawn=(.5,1/6))
        else:
            f.text('回る派',80,145,55,GRAY);f.text('進行方向が、上。',80,222,46,GRAY)
            f.board(650,330,350,260,25,color='#8a7c6c')
    elif n==4:
        f.text('動くのは、自分。' if end else '地図は、回さない。',80,130,60,RED if end else INK)
        f.board(435,250,440,365,pawn=(5/6,1/6) if end else (.5,.5),north='北＝上' if end else '北')
        if end:f.text('東＝右',910,450,36,BLUE)
    elif n==5:
        f.text('右を押せば、東。' if end else '上を押せば、北。',80,130,60,RED)
        f.body+=pic('dpad-right.png' if end else 'dpad-up.png',90,255,365,365)
        f.map(700,230,385,pawn=(.72,.38) if end else (.5,.38),north=False)
        f.text('北',892,205,30,BLUE,'middle')
        if end:f.text('東',1110,400,30,BLUE)
    elif n==6:
        f.text('8割以上',80,240,96)
        f.text('回した方が、',80,330,40,GRAY);f.text('使いやすい。',80,387,40,GRAY)
        if end:
            f.board(795,170,235,175,24,pawn=None,color='#8a7c6c')
            f.board(810,455,230,170,pawn=(.5,.5))
            f.text('少数派らしい。',80,500,38,GRAY)
        else:f.board(775,265,310,290)
        f.text('江戸川大学・2015',80,640,26,GRAY)
    elif n==7:
        if end:
            f.text('前',580,350,235,GRAY);f.text('方角ではなくなる。',530,470,40,GRAY)
            f.board(110,440,250,175,pawn=(.5,1/6))
        else:
            f.text('上は、前。',80,220,72,GRAY);f.board(720,310,300,230,25,color='#8a7c6c')
    elif n==8:
        f.text('江東区の、上。',80,125,60)
        f.body+=rect(470,230,390,170,'#d9e6f5',BLUE,3,opacity=.5 if end else .12)+rect(470,420,390,170,'#f6e3d4',BLUE,3,opacity=.6)
        f.text('江東区',510,520,46)
        if end:
            f.text('墨田区',510,330,46);f.pawn(805,312)
            f.text('東京の左',90,395,30,GRAY);f.text('千葉の右下',940,550,30,GRAY)
        else:f.pawn(805,510)
        f.text('頭の中の配置',80,640,26,GRAY)
    elif n==9:
        if end:
            f.text('固定した地図を、',80,225,48,RED);f.text('呼び出す。',80,320,67,RED)
            f.text('地下では、私も失う。',80,555,30,GRAY)
            f.board(790,310,285,255,pawn=(.5,1/6))
            f.body+='<path d="M780 625H900V650H1100" fill="none" stroke="#c9c2b8" stroke-width="8"/>'
        else:
            f.text('仮説です。',80,190,74,GRAY);f.text('全員の話ではない。',80,270,38,GRAY)
            f.board(880,150,220,170)
            f.body+='<path d="M720 610V470H655L775 350L895 470H830V610Z" fill="#c9c2b8"/>'
            f.text('前',775,550,50,GRAY,'middle')
    elif n==10:
        if end:
            f.text('痛いほどわかる。',80,240,57);f.text('少し、誇らしい。',80,330,58,RED)
        else:f.text('わかる人には、',80,250,60)
        f.board(805,315,285,285,pawn=(.5,1/6) if end else (.5,.5))
    f.save()
(SRC/'storyboard-check.json').write_text(json.dumps({'canvas':[1280,720],'safe':[64,48,1216,672],'font':str(FONT),'scope':'SVG text layout estimates / text-text and text-pawn. Raster art, diagram lines, intended overlaps excluded. No animation check.','frames':checks},ensure_ascii=False,indent=2))
print(json.dumps({c['frame']:c['errors'] for c in checks if c['errors']},ensure_ascii=False))
