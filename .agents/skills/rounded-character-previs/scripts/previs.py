#!/usr/bin/env python3
"""Project-local rounded-character previs tools. Requires existing Blender/ffmpeg only."""
import argparse,hashlib,json,os,shutil,subprocess,sys
from pathlib import Path
BASE=Path(__file__).resolve().parent.parent
ENGINE=BASE/'scripts/engine';ASSETS=BASE/'assets'

def binary(value,env,default):
 value=value or os.environ.get(env) or shutil.which(default)
 if not value:raise ValueError(f'Pass --{default} or set {env}; no software is installed automatically')
 return str(value)
def blender(a,script,arguments):
 exe=binary(a.blender,'BLENDER_BIN','blender');subprocess.run([exe,'--background','--factory-startup','--python',str(script),'--',*map(str,arguments)],check=True)
def fresh(path):
 path=Path(path).expanduser().resolve();path.mkdir(parents=True,exist_ok=False);return path
def main():
 p=argparse.ArgumentParser(description=__doc__);sub=p.add_subparsers(dest='command',required=True)
 q=sub.add_parser('check',help='Verify bundled asset hashes without GPU work')
 q=sub.add_parser('new',help='Copy an approved editable scene; no Blender or rendering');q.add_argument('--out-dir',required=True);q.add_argument('--template',choices=['walk','character'],default='walk')
 q=sub.add_parser('rebuild-character',help='Recreate the approved quad model; saves only by default');q.add_argument('--out-dir',required=True);q.add_argument('--render',action='store_true');q.add_argument('--blender')
 q=sub.add_parser('sample',help='Sample CMU/cgspeed BVH at 30 fps; no download');q.add_argument('--bvh',required=True);q.add_argument('--output',required=True);q.add_argument('--scale',type=float,default=.07);q.add_argument('--blender')
 q=sub.add_parser('retarget',help='Adapt measured joint data to the approved body; no render');q.add_argument('--motion-json',default=str(ASSETS/'walk_sampled.json'));q.add_argument('--source-label',help='Provenance label retained in the action audit');q.add_argument('--out-dir',required=True);q.add_argument('--kind',choices=['standard','bend','overhead'],default='standard');q.add_argument('--start',type=float,default=0);q.add_argument('--duration',type=float,default=2.4);q.add_argument('--camera',type=float,nargs=3,default=[5,-6,2.8]);q.add_argument('--ortho-scale',type=float,default=5.55);q.add_argument('--blender')
 q=sub.add_parser('render',help='Render a saved blend; default is one lightweight frame');q.add_argument('--blend',required=True);q.add_argument('--out-dir',required=True);q.add_argument('--frames',default='1',help='Comma-separated frames, or all');q.add_argument('--width',type=int,default=960);q.add_argument('--height',type=int,default=540);q.add_argument('--samples',type=int,default=32);q.add_argument('--scene');q.add_argument('--blender')
 q=sub.add_parser('inspect',help='Measure every frame at final subdivision; not a visual verdict');q.add_argument('--blend',required=True);q.add_argument('--audit',required=True);q.add_argument('--output',required=True);q.add_argument('--blender')
 q=sub.add_parser('assemble',help='Create editable scene strips from a JSON shot manifest');q.add_argument('--manifest',required=True);q.add_argument('--output',required=True);q.add_argument('--blender')
 q=sub.add_parser('encode',help='Encode contiguous PNG frames to H.264 MP4');q.add_argument('--frames-dir',required=True);q.add_argument('--prefix',default='frame_');q.add_argument('--output',required=True);q.add_argument('--fps',type=int,default=30);q.add_argument('--ffmpeg')
 a=p.parse_args()
 if a.command=='check':
  rows=json.loads((ASSETS/'manifest.json').read_text())
  for row in rows:
   f=ASSETS/row['file']
   if not f.is_file() or hashlib.sha256(f.read_bytes()).hexdigest()!=row['sha256']:raise ValueError('Asset hash mismatch: '+str(f))
  print('ASSETS_OK',len(rows),sum(x['bytes'] for x in rows));return
 if a.command=='new':
  out=fresh(a.out_dir);src=ASSETS/('approved_walk.blend' if a.template=='walk' else 'approved_character.blend');shutil.copyfile(src,out/'scene.blend')
  if a.template=='walk':shutil.copyfile(ASSETS/'walk_audit.json',out/'retarget_audit.json')
  print(out/'scene.blend');return
 if a.command=='rebuild-character':
  out=fresh(a.out_dir);args=['--out-dir',out]+(['--render'] if a.render else []);blender(a,ENGINE/'build_character.py',args);return
 if a.command=='sample':
  dest=Path(a.output).expanduser().resolve()
  if dest.exists():raise FileExistsError(dest)
  blender(a,ENGINE/'sample.py',['--bvh',Path(a.bvh).expanduser().resolve(),'--output',dest,'--scale',a.scale]);return
 if a.command=='retarget':
  a.motion_json=str(Path(a.motion_json).expanduser().resolve());data=json.loads(Path(a.motion_json).read_text());count=len(data['poses']);fps=data.get('fps',30)
  if fps!=30:raise ValueError('This measured-contact retargeter requires 30 fps sampled data')
  if a.start<0 or a.duration<.2 or round((a.start+a.duration)*30)>count:raise ValueError('Requested segment must fit source and contain at least six frames')
  out=fresh(a.out_dir);(out/'assets').mkdir();(out/'source').mkdir();shutil.copyfile(ASSETS/'approved_character.blend',out/'assets/approved_character.blend');shutil.copyfile(a.motion_json,out/'source/motion_sampled.json')
  for f in ['build_action.py','refine_skin.py','bend_correctives.py']:shutil.copyfile(ENGINE/f,out/f)
  name={'standard':'action','bend':'pickup','overhead':'stretch'}[a.kind]
  provenance=a.source_label or data.get('source') or ('CMU 07_01; selected source starts at sample 10' if Path(a.motion_json)==ASSETS/'walk_sampled.json' else 'User-supplied joint data; provenance not recorded')
  cfg={name:{'source':'motion','provenance':provenance,'start':a.start,'duration':a.duration,'label':{'standard':'Measured action','bend':'Bend and rise','overhead':'Stretch'}[a.kind],'camera':a.camera,'scale':a.ortho_scale}};(out/'actions.json').write_text(json.dumps(cfg,indent=2));blender(a,out/'build_action.py',['--action',name]);print(out/name/(name+'.blend'));return
 if a.command=='render':
  out=fresh(a.out_dir);args=['--blend',Path(a.blend).expanduser().resolve(),'--out-dir',out,'--frames',a.frames,'--width',a.width,'--height',a.height,'--samples',a.samples]
  if a.scene:args+=['--scene',a.scene]
  blender(a,ENGINE/'render.py',args);return
 if a.command=='inspect':
  dest=Path(a.output).expanduser().resolve()
  if dest.exists():raise FileExistsError(dest)
  blender(a,ENGINE/'inspect.py',['--blend',Path(a.blend).expanduser().resolve(),'--audit',Path(a.audit).expanduser().resolve(),'--output',dest]);return
 if a.command=='assemble':
  dest=Path(a.output).expanduser().resolve()
  if dest.exists():raise FileExistsError(dest)
  blender(a,ENGINE/'assemble.py',['--manifest',Path(a.manifest).expanduser().resolve(),'--output',dest]);return
 if a.command=='encode':
  folder=Path(a.frames_dir).expanduser().resolve();dest=Path(a.output).expanduser().resolve();frames=sorted(folder.glob(a.prefix+'[0-9][0-9][0-9][0-9].png'));numbers=[int(f.stem[len(a.prefix):]) for f in frames]
  if not numbers or numbers!=list(range(numbers[0],numbers[-1]+1)):raise ValueError('Encoding requires a contiguous frame sequence; sparse pose checks are not a movie')
  if dest.exists():raise FileExistsError(dest)
  dest.parent.mkdir(parents=True,exist_ok=True);subprocess.run([binary(a.ffmpeg,'FFMPEG_BIN','ffmpeg'),'-v','error','-framerate',str(a.fps),'-start_number',str(numbers[0]),'-i',str(folder/(a.prefix+'%04d.png')),'-c:v','libx264','-preset','medium','-crf','18','-pix_fmt','yuv420p','-an','-movflags','+faststart',str(dest)],check=True);print(dest)
if __name__=='__main__':
 try:main()
 except (ValueError,FileNotFoundError,FileExistsError,subprocess.CalledProcessError) as exc:print('previs:',exc,file=sys.stderr);sys.exit(1)
