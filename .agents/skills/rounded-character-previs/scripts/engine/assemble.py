"""Append editable shot scenes and assemble camera scene strips, no movie references."""
import bpy,sys,argparse,json
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--manifest',required=True);p.add_argument('--output',required=True);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);mf=Path(a.manifest).resolve();dst=Path(a.output).resolve()
if dst.exists():raise FileExistsError(dst)
shots=json.loads(mf.read_text());bpy.ops.wm.read_factory_settings(use_empty=True);master=bpy.context.scene;master.name='MASTER — previs';master.render.fps=30;master.render.resolution_x=1920;master.render.resolution_y=1080;master.render.resolution_percentage=100;ed=master.sequence_editor_create();cursor=1
for spec in shots:
 path=Path(spec['blend']);path=path if path.is_absolute() else mf.parent/path
 with bpy.data.libraries.load(str(path),link=False) as (src,out):out.scenes=list(src.scenes)
 scene=next(s for s in out.scenes if s.camera);scene.name='SHOT — '+spec['name']
 if scene.render.fps!=30 or scene.render.fps_base!=1:raise ValueError('Resample shots to 30 fps before assembling')
 scene.frame_start=spec.get('frame_start',scene.frame_start);scene.frame_end=spec.get('frame_end',scene.frame_end)
 strip=ed.strips.new_scene(spec['name'],scene,channel=1,frame_start=cursor);strip.scene_input='CAMERA';strip.frame_final_duration=scene.frame_end-scene.frame_start+1;cursor+=strip.frame_final_duration
master.frame_start=1;master.frame_end=cursor-1;master.frame_set(1);master.render.use_sequencer=True
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.type='SEQUENCE_EDITOR'
dst.parent.mkdir(parents=True,exist_ok=True);bpy.ops.wm.save_as_mainfile(filepath=str(dst));print('ASSEMBLED',cursor-1,dst)
