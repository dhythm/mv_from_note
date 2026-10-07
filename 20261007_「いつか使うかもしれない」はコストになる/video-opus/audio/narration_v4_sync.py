"""v4既存波形の前半だけを再配置。再生成・速度加工・API利用なし。"""
import hashlib,json,subprocess,wave
from pathlib import Path
v=Path(__file__).resolve().parent.parent
plan=json.loads((v/'audio/narration-v4-sync-plan.json').read_text())
record=json.loads((v/plan['source_record']).read_text())
with wave.open(str(v/plan['source_voice']),'rb') as f:
 params=f.getparams();original=f.readframes(f.getnframes())
assert params.nchannels==1 and params.sampwidth==2
sr=params.framerate; frame_bytes=params.nchannels*params.sampwidth
pos=lambda t: round(t*sr)*frame_bytes
keep=pos(plan['preserve_from_seconds'])
output=bytearray(len(original));output[keep:]=original[keep:]
checks=[]
previous_end=0
for s in plan['segments']:
 placement=record['placements'][s['cut']-1]
 source_start=round(placement['start']*1000)/1000
 chunks=[original[pos(source_start+a):pos(source_start+b)] for a,b in s['source_ranges']]
 clip=b''.join(chunks)
 start=pos(s['target_start']);end=start+len(clip)
 assert start>=previous_end, f'overlap {s["id"]}'
 assert end<=keep, f'後半へ侵入 {s["id"]}'
 output[start:end]=clip
 assert bytes(output[start:end])==clip
 checks.append({'id':s['id'],'start':start/frame_bytes/sr,'end':end/frame_bytes/sr,'source_ranges':s['source_ranges'],'speech_samples_unchanged':True})
 previous_end=end
voice=v/'public/narration-v4-synced.wav'
with wave.open(str(voice),'wb') as f:
 f.setparams(params);f.writeframes(output)
assert output[keep:]==original[keep:]
def run(args):
 return subprocess.run(['ffmpeg','-hide_banner','-y',*args],capture_output=True,check=True)
mix=v/'public/narrated-mix-v4-synced.m4a'
run(['-i',str(v/'public/bgm.mp3'),'-i',str(voice),'-filter_complex','[1:a]asplit=2[sc][voice];[0:a]volume=0.65[bgm];[bgm][sc]sidechaincompress=threshold=0.018:ratio=8:attack=25:release=350[duck];[duck][voice]amix=inputs=2:normalize=0,alimiter=limit=0.891:level=0,atrim=duration=78[mix]','-map','[mix]','-c:a','aac','-b:a','192k',str(mix)])
out=v/'out/itsuka-cost-narrated-v4-synced.mp4'
run(['-i',str(v/'out/itsuka-cost-full.mp4'),'-i',str(mix),'-map','0:v:0','-map','1:a:0','-c','copy','-t','78','-movflags','+faststart',str(out)])
run(['-i',str(out),'-t','44','-c','copy',str(v/'out/review/narration-v4-synced-first-half.mp4')])
report={'method':plan['method'],'api_calls':0,'speed_processing':False,'preserved_voice_samples_from_seconds':44,'preserved_voice_samples_sha256':hashlib.sha256(output[keep:]).hexdigest(),'duration':len(output)/frame_bytes/sr,'segments':checks,'listening_review':'映像・発話の再生による聴感確認は未実施。既存音声の無音検出と画面表示時刻から配置。'}
(v/'audio/narration-v4-sync-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False,indent=2))
