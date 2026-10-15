"""Render approved scene settings, encode, verify, then remove expendable frames."""
from pathlib import Path
import subprocess, json, time
from concurrent.futures import ThreadPoolExecutor, as_completed
ROOT=Path(__file__).resolve().parent
BLENDER='/Applications/Blender.app/Contents/MacOS/Blender'
clips={'07_before':330,'08_backlog':480,'13_quality_gates':480,'15_feedback_loop':360}
def render_clip(name,count):
    print('RENDER_START',name,flush=True)
    with (ROOT/'renders'/f'{name}.log').open('w') as log:
        subprocess.run([BLENDER,'-b','--factory-startup','-t','8','--python',str(ROOT/'render_assets.py'),'--',name,'full'],stdout=log,stderr=subprocess.STDOUT,check=True)
    frames=ROOT/'renders'/name
    if len(list(frames.glob('frame_*.png')))!=count:
        raise RuntimeError('Frame count mismatch: '+name)
    out=ROOT/f'{name}.mp4'
    subprocess.run(['ffmpeg','-y','-framerate','30','-start_number','1','-i',str(frames/'frame_%04d.png'),'-c:v','libx264','-preset','slow','-crf','17','-pix_fmt','yuv420p','-movflags','+faststart',str(out),'-loglevel','error'],check=True)
    metadata=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(out)]))
    v=next(s for s in metadata['streams'] if s['codec_type']=='video')
    assert (v['width'],v['height'],v['r_frame_rate'],int(v['nb_frames']))==(1920,1080,'30/1',count)
    subprocess.run(['ffmpeg','-v','error','-i',str(out),'-f','null','-'],check=True)
    entry={'file':out.name,'width':v['width'],'height':v['height'],'fps':v['r_frame_rate'],'frames':int(v['nb_frames']),'seconds':float(v['duration']),'bytes':out.stat().st_size,'decode_check':'pass'}
    for frame in frames.glob('frame_*.png'):frame.unlink()
    print('ENCODE_VERIFIED',name,entry,flush=True)
    return entry
manifest=[]
with ThreadPoolExecutor(max_workers=2) as pool:
    jobs=[pool.submit(render_clip,name,count) for name,count in clips.items()]
    for job in as_completed(jobs):
        manifest.append(job.result())
        (ROOT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
print('ALL_DONE',flush=True)
