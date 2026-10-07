import json,urllib.request,urllib.error,subprocess
from pathlib import Path
v=Path(__file__).resolve().parent.parent
root=v.parent.parent
plan=json.loads((v/'audio/narration-plan.json').read_text())
key=None
for line in (root/'.env').read_text().splitlines():
 name,sep,value=line.strip().partition('=')
 if name in ('ELEVENLABS_API_KEY','ElevenLabsAPIKey') and sep: key=value.strip().strip('\"\'')
if not key: raise SystemExit('APIキーが見つかりません')
folder=v/'audio/narration/revision-v2'; folder.mkdir(parents=True,exist_ok=True)
for cut in range(1,8):
 text=''.join(s['text'] for s in plan['segments'] if s['cut']==cut)
 if cut==1: text=text.replace('」そう','」。そう')
 if cut==2: text=text.replace('」。','」。')
 body={'text':text,'model_id':'eleven_v4','language_code':'ja','voice_settings':{'stability':0.6,'similarity_boost':0.75},'seed':20261007}
 dst=folder/f'cut-{cut}.mp3'
 if dst.exists(): print('reuse',cut,flush=True);continue
 req=urllib.request.Request('https://api.elevenlabs.io/v1/text-to-speech/S9yQN3065fl76yl0gxsW?output_format=mp3_44100_192',data=json.dumps(body,ensure_ascii=False).encode(),headers={'xi-api-key':key,'Content-Type':'application/json'},method='POST')
 try:
  with urllib.request.urlopen(req,timeout=120) as r:
   data=r.read();headers={k:r.headers.get(k) for k in ['request-id','character-cost','content-type']}
 except urllib.error.HTTPError as e:
  print('HTTP',e.code,e.read().decode().replace(key,'[REDACTED]')[:500]);raise SystemExit(1)
 dst.write_bytes(data)
 dur=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',str(dst)]))
 dst.with_suffix('.json').write_text(json.dumps({'cut':cut,'voice_id':'S9yQN3065fl76yl0gxsW','body':body,'response':headers,'duration':dur},ensure_ascii=False,indent=2))
 print(cut,round(dur,3),'seconds',headers,flush=True)
