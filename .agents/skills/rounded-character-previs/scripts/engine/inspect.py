import bpy,sys,json,math,hashlib,struct,argparse
import numpy as np
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--blend',required=True);parser.add_argument('--audit',required=True);parser.add_argument('--output',required=True);args=parser.parse_args(sys.argv[sys.argv.index('--')+1:])
P=Path(args.output).resolve().parent;P.mkdir(parents=True,exist_ok=True)
for name in ['shot']:
 out=P;bpy.ops.wm.open_mainfile(filepath=args.blend);s=bpy.context.scene;o=bpy.data.objects['Rounded Character — continuous surface'];r=bpy.data.objects['Rounded Humanoid — deformation rig'];audit=json.loads(Path(args.audit).read_text());dg=bpy.context.evaluated_depsgraph_get()

 for mod in o.modifiers:
  if mod.type=='SUBSURF':mod.levels=mod.render_levels
 keys=o.data.shape_keys;act=keys.animation_data.action;keys.animation_data.action=None
 for k in keys.key_blocks:k.value=0
 r.data.pose_position='REST';bpy.context.view_layer.update();e=o.evaluated_get(dg);m=e.to_mesh();co=np.empty(len(m.vertices)*3);m.vertices.foreach_get('co',co);co=co.reshape(-1,3);footids={side:np.where((co[:,2]<.14)&((co[:,0]>0)==(side=='L')))[0] for side in ['L','R']};armids=np.where((np.abs(co[:,0])>.34)&(co[:,2]>1.25)&(co[:,2]<1.62))[0];e.to_mesh_clear();r.data.pose_position='POSE';keys.animation_data.action=act
 proj=np.array(s.camera.calc_matrix_camera(dg,x=s.render.resolution_x,y=s.render.resolution_y))@np.array(s.camera.matrix_world.inverted());data=[];maxerr=0
 for f in range(1,s.frame_end+1):
  s.frame_set(f);bpy.context.view_layer.update();e=o.evaluated_get(dg);m=e.to_mesh();v=np.empty(len(m.vertices)*3);m.vertices.foreach_get('co',v);v=v.reshape(-1,3);h=np.column_stack([v,np.ones(len(v))]);pr=h@proj.T;screen=pr[:,:2]/pr[:,3:4]*.5+.5;bbox=[float(screen[:,0].min()),float(screen[:,0].max()),float(screen[:,1].min()),float(screen[:,1].max())];margin=min(bbox[0],1-bbox[1],bbox[2],1-bbox[3]);feet={}
  for side in ['L','R']:
   expected=np.array(audit['animation'][f-1]['feet'][side]['ankle']);err=float(np.linalg.norm(np.array(r.pose.bones['foot.'+side].head)-expected));maxerr=max(maxerr,err);feet[side]={'stance':audit['animation'][f-1]['feet'][side]['contact'],'min_clearance':float(v[footids[side],2].min()-.035),'ankle_error':err}
  hd=r.pose.bones['head'].matrix@r.data.bones['head'].matrix_local.inverted();local=(h[armids]@np.array(hd.inverted()).T)[:,:3];ell=(local-np.array([0,0,2.025]))/np.array([.385,.355,.385]);gap=float((np.linalg.norm(ell,axis=1).min()-1)*.355)
  data.append({'frame':f,'camera_bbox':bbox,'camera_margin':margin,'feet':feet,'head_arm_envelope_gap':gap,'mesh_min_z':float(v[:,2].min())});e.to_mesh_clear()
 support=[x['min_clearance'] for f in data for x in f['feet'].values() if x['stance']];report={'evaluation_subdivision':'render','frames':len(data),'min_camera_margin':min(x['camera_margin'] for x in data),'support_floor_range':[min(support),max(support)],'max_foot_target_error':maxerr,'min_head_arm_envelope_gap':min(x['head_arm_envelope_gap'] for x in data),'rest_hash':hashlib.sha256(b''.join(struct.pack('fff',*v.co) for v in o.data.vertices)).hexdigest(),'frames_data':data,'limits':'Kinematic contact; head/arm gap uses conservative ellipsoid envelope, not exact mesh collision or dynamics.'};Path(args.output).write_text(json.dumps(report,indent=2));print(name,json.dumps({k:v for k,v in report.items() if k!='frames_data'}),flush=True)
