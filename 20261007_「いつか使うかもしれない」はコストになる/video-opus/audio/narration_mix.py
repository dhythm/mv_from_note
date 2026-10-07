"""生成済み音声を配置し、BGMを発話に合わせて下げる。API呼び出しなし。"""
import json,re,subprocess
from pathlib import Path
video=Path(__file__).resolve().parent.parent
folder=video/'audio/narration'
plan=json.loads((video/'audio/narration-plan.json').read_text())
def run(args):
 return subprocess.run(['ffmpeg','-hide_banner','-y',*args],capture_output=True,check=True)
segments=[]
for s in plan['segments']:
 src=folder/'raw'/(s['id']+'.mp3')
 meta=json.loads(src.with_suffix('.json').read_text())
 dur=meta['duration']
 log=run(['-i',str(src),'-af','silencedetect=noise=-45dB:d=0.08','-f','null','-']).stderr.decode()
 starts=[float(x) for x in re.findall(r'silence_start: ([\d.]+)',log)]
 ends=[float(x) for x in re.findall(r'silence_end: ([\d.]+)',log)]
 trim_start=max(0,ends[0]-.04) if starts and starts[0]<.03 and ends else 0
 trim_end=min(dur,starts[-1]+.08) if starts and ends and ends[-1]>=dur-.04 else dur
 start=s['start']
 if s['id']=='p2c': start=16.95
 if s['id']=='p7b': start=72.15
 i=plan['segments'].index(s)
 next_start=plan['segments'][i+1]['start'] if i+1<len(plan['segments']) else 77.9
 if s['id']=='p2b': next_start=16.95
 if s['id']=='p7a': next_start=72.15
 end=min(s['end'],next_start-.12)
 if s['id']=='p7a': end=72.03
 if s['id']=='p7b': end=77.85
 tempo=max(1,(trim_end-trim_start)/(end-start))
 if tempo>1.35: raise RuntimeError(f'{s["id"]}: 読み上げ速度が速すぎます {tempo}')
 dst=folder/(s['id']+'.wav')
 run(['-i',str(src),'-af',f'atrim=start={trim_start}:end={trim_end},asetpts=PTS-STARTPTS,atempo={tempo},afade=t=in:d=0.008,afade=t=out:st={max(0,(trim_end-trim_start)/tempo-.015)}:d=0.015','-ar','44100','-ac','1',str(dst)])
 segments.append({**s,'start':start,'raw_duration':dur,'trim_start':trim_start,'trim_end':trim_end,'tempo':tempo,'actual_end':start+(trim_end-trim_start)/tempo})
 print(s['id'],round(start,2),round(segments[-1]['actual_end'],2),'tempo',round(tempo,3),flush=True)
args=[]
filters=[]
for i,s in enumerate(segments):
 args+=['-i',str(folder/(s['id']+'.wav'))]
 filters.append(f'[{i}:a]adelay={round(s["start"]*1000)}:all=1[a{i}]')
filters.append(''.join(f'[a{i}]' for i in range(len(segments)))+f'amix=inputs={len(segments)}:normalize=0,apad,atrim=duration=78,loudnorm=I=-16:TP=-2:LRA=7,aresample=44100[voice]')
voice=video/'public/narration.wav'
run([*args,'-filter_complex',';'.join(filters),'-map','[voice]','-ac','1',str(voice)])
mix=video/'public/narrated-mix.m4a'
run(['-i',str(video/'public/bgm.mp3'),'-i',str(voice),'-filter_complex','[1:a]asplit=2[sc][voice];[0:a]volume=0.65[bgm];[bgm][sc]sidechaincompress=threshold=0.018:ratio=8:attack=25:release=350[duck];[duck][voice]amix=inputs=2:normalize=0,alimiter=limit=0.891:level=0,atrim=duration=78[mix]','-map','[mix]','-c:a','aac','-b:a','192k',str(mix)])
out=video/'out/itsuka-cost-narrated.mp4'
run(['-i',str(video/'out/itsuka-cost-full.mp4'),'-i',str(mix),'-map','0:v:0','-map','1:a:0','-c','copy','-t','78','-movflags','+faststart',str(out)])
run(['-i',str(out),'-t','10','-c','copy',str(video/'out/review/narration-opening.mp4')])
run(['-i',str(voice),'-t','10','-c:a','libmp3lame','-b:a','192k',str(video/'out/review/narration-opening.mp3')])
(folder/'placement.json').write_text(json.dumps(segments,ensure_ascii=False,indent=2))
plan.update(status='generated_and_mixed',model_id='eleven_multilingual_v2',voice_id='S9yQN3065fl76yl0gxsW',voice_name='Kouichi - Calm Japanese Narrator',generations=17,api_reported_character_cost=sum(int(json.loads((folder/'raw'/(s['id']+'.json')).read_text())['response']['character-cost']) for s in segments),generation_credit_estimate=None)
plan['trial']['generations']=0
plan['trial']['note']='冒頭2フレーズを本編へ再利用。別の試聴生成なし。'
(video/'audio/narration-plan.json').write_text(json.dumps(plan,ensure_ascii=False,indent=2))
print('Done',out)
