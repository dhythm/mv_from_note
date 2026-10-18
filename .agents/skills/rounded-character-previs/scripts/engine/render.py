"""Render an existing scene. The front-end always starts factory-startup Blender."""
import bpy,sys,argparse
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--blend',required=True);p.add_argument('--out-dir',required=True);p.add_argument('--frames',default='1');p.add_argument('--width',type=int,default=960);p.add_argument('--height',type=int,default=540);p.add_argument('--samples',type=int,default=32);p.add_argument('--scene');a=p.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.open_mainfile(filepath=a.blend);s=bpy.data.scenes[a.scene] if a.scene else bpy.context.scene
if bpy.context.window:bpy.context.window.scene=s
out=Path(a.out_dir).resolve();out.mkdir(parents=True,exist_ok=True)
frames=list(range(s.frame_start,s.frame_end+1)) if a.frames=='all' else [int(x) for x in a.frames.split(',')]
if not frames or any(f<s.frame_start or f>s.frame_end for f in frames):raise ValueError('Requested frame outside scene range')
s.render.resolution_x=a.width;s.render.resolution_y=a.height;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.engine='BLENDER_EEVEE';s.eevee.taa_render_samples=a.samples
for scene in bpy.data.scenes:scene.eevee.taa_render_samples=a.samples
for f in frames:
 dst=out/f'frame_{f:04d}.png'
 if dst.exists():raise FileExistsError(dst)
 s.frame_set(f);s.render.filepath=str(dst);bpy.ops.render.render(write_still=True)
print('RENDER_OK',len(frames))
