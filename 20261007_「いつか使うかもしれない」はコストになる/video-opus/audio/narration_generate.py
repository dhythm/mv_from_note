import json,urllib.request,urllib.error,sys,subprocess
from pathlib import Path
video=Path(__file__).resolve().parent.parent
root=video.parent.parent
plan=json.loads((video/'audio/narration-plan.json').read_text())
key=None
for line in (root/'.env').read_text().splitlines():
 name,sep,value=line.strip().partition('=')
 if name in ('ELEVENLABS_API_KEY','ElevenLabsAPIKey') and sep: key=value.strip().strip('\"\'')
if not key: raise SystemExit('APIキーが見つかりません')
voice='S9yQN3065fl76yl0gxsW'
model='eleven_multilingual_v2'
folder=video/'audio/narration/raw'
folder.mkdir(parents=True,exist_ok=True)
limit=int(sys.argv[1]) if len(sys.argv)>1 else len(plan['segments'])
for i,s in enumerate(plan['segments'][:limit]):
 dst=folder/(s['id']+'.mp3'); meta=dst.with_suffix('.json')
 if dst.exists(): print(s['id'],'already generated',flush=True); continue
 body={'text':s['text'],'model_id':model,'voice_settings':{'stability':0.6,'similarity_boost':0.75,'style':0.15,'use_speaker_boost':True,'speed':1.05},'seed':20261007}
 if i: body['previous_text']=plan['segments'][i-1]['text']
 if i+1<len(plan['segments']): body['next_text']=plan['segments'][i+1]['text']
 req=urllib.request.Request('https://api.elevenlabs.io/v1/text-to-speech/'+voice+'?output_format=mp3_44100_192',data=json.dumps(body,ensure_ascii=False).encode(),headers={'xi-api-key':key,'Content-Type':'application/json'},method='POST')
 try:
  with urllib.request.urlopen(req,timeout=120) as r:
   data=r.read(); headers={k:r.headers.get(k) for k in ['request-id','character-cost','content-type']}
 except urllib.error.HTTPError as e:
  print('HTTP',e.code,e.read().decode().replace(key,'[REDACTED]')[:500]); sys.exit(1)
 dst.write_bytes(data)
 duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(dst)]))
 meta.write_text(json.dumps({'id':s['id'],'voice_id':voice,'voice_name':'Kouichi - Calm Japanese Narrator','body':body,'response':headers,'duration':duration},ensure_ascii=False,indent=2))
 print(s['id'],len(s['text']),'characters',duration,'seconds',headers,flush=True)
