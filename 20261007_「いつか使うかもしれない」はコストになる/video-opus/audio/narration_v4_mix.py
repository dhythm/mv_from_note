"""v4の場面単位の原音を速度加工せず配置。API呼び出しなし。"""
from pathlib import Path
import subprocess,json
v=Path(__file__).resolve().parent.parent
folder=v/'audio/narration/revision-v2'
boundaries=[0,10,22,34,44,54,66,78]
def run(args):
 return subprocess.run(['ffmpeg','-hide_banner','-y',*args],capture_output=True,check=True)
args=[];filters=[];placements=[]
for i in range(7):
 src=folder/f'cut-{i+1}.mp3';meta=json.loads(src.with_suffix('.json').read_text())
 dur=meta['duration']; start=min(boundaries[i]+.3,boundaries[i+1]-.15-dur)
 if start<boundaries[i]: raise RuntimeError(f'cut {i+1}: 発話が場面より長い')
 if i==0: start=.9
 args+=['-i',str(src)]
 filters.append(f'[{i}:a]adelay={round(start*1000)}:all=1[a{i}]')
 placements.append({'cut':i+1,'start':start,'end':start+dur,'duration':dur,'tempo':1,'body':meta['body'],'response':meta['response']})
filters.append(''.join(f'[a{i}]' for i in range(7))+'amix=inputs=7:normalize=0,apad,atrim=duration=78,loudnorm=I=-16:TP=-2:LRA=7,aresample=44100[voice]')
voice=v/'public/narration-v4.wav'
run([*args,'-filter_complex',';'.join(filters),'-map','[voice]','-ac','1',str(voice)])
mix=v/'public/narrated-mix-v4.m4a'
run(['-i',str(v/'public/bgm.mp3'),'-i',str(voice),'-filter_complex','[1:a]asplit=2[sc][voice];[0:a]volume=0.65[bgm];[bgm][sc]sidechaincompress=threshold=0.018:ratio=8:attack=25:release=350[duck];[duck][voice]amix=inputs=2:normalize=0,alimiter=limit=0.891:level=0,atrim=duration=78[mix]','-map','[mix]','-c:a','aac','-b:a','192k',str(mix)])
out=v/'out/itsuka-cost-narrated-v4.mp4'
run(['-i',str(v/'out/itsuka-cost-full.mp4'),'-i',str(mix),'-map','0:v:0','-map','1:a:0','-c','copy','-t','78','-movflags','+faststart',str(out)])
run(['-i',str(out),'-t','10','-c','copy',str(v/'out/review/narration-opening-v4.mp4')])
record={'model_id':'eleven_v4','language_code':'ja','voice_id':'S9yQN3065fl76yl0gxsW','successful_full_generations':7,'successful_trial_generations':1,'full_cost':sum(int(p['response']['character-cost']) for p in placements),'trial_cost':7,'status':'ユーザー試聴待ち・自然さ未判定','speed_processing':False,'placements':placements}
(folder/'production-record.json').write_text(json.dumps(record,ensure_ascii=False,indent=2))
print(json.dumps(record,ensure_ascii=False,indent=2))
