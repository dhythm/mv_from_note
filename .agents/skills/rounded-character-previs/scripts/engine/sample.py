"""Sample CMU/cgspeed humanoid BVH at 30 fps, excluding its inserted T-pose."""
import bpy,sys,argparse,json,re,math
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--bvh',required=True);p.add_argument('--output',required=True);p.add_argument('--scale',type=float,default=.07);a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);dest=Path(a.output).resolve()
if dest.exists():raise FileExistsError(dest)
text=Path(a.bvh).read_text();frames=int(re.search(r'Frames:\s*(\d+)',text).group(1));dt=float(re.search(r'Frame Time:\s*([.\d]+)',text).group(1));bpy.ops.wm.read_factory_settings(use_empty=True);s=bpy.context.scene;s.render.fps=30;bpy.ops.preferences.addon_enable(module='io_anim_bvh');bpy.ops.import_anim.bvh(filepath=a.bvh,global_scale=a.scale,axis_forward='-Z',axis_up='Y',use_fps_scale=True,update_scene_fps=False,frame_start=1);r=bpy.context.object
names=['Hips','Spine','Spine1','Head']+[side+n for side in ['Left','Right'] for n in ['UpLeg','Leg','Foot','ToeBase','Arm','ForeArm','Hand']]
missing=[n for n in names if n not in r.pose.bones]
if missing:raise ValueError('Expected CMU bone names: '+str(missing))
def data():return {n:{'head':list(r.matrix_world@r.pose.bones[n].head),'tail':list(r.matrix_world@r.pose.bones[n].tail),'q':list((r.matrix_world@r.pose.bones[n].matrix).to_quaternion())} for n in names}
s.frame_set(1);rest=data();poses=[]
for i in range(math.floor((frames-2)*dt*30)):
 f=1+dt*30+i;s.frame_set(int(f),subframe=f-int(f));poses.append(data())
dest.parent.mkdir(parents=True,exist_ok=True);dest.write_text(json.dumps({'rest':rest,'poses':poses,'fps':30,'source':Path(a.bvh).name,'source_frame_time':dt,'source_start':2}));print('SAMPLED',len(poses),dest)
