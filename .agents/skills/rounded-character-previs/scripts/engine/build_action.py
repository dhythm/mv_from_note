"""Bake supplied CMU-compatible joint motion to the approved rounded character.
Called by the project-local front-end in a fresh job directory; does not render.
"""
import bpy,sys,math,json,hashlib
from pathlib import Path
from mathutils import Vector,Quaternion,Matrix
P=Path(__file__).resolve().parent;sys.path.insert(0,str(P))
from refine_skin import refine
from bend_correctives import add_joint_corrective
NAME=sys.argv[sys.argv.index('--action')+1]; CFG=json.loads((P/'actions.json').read_text())[NAME]; OUT=P/NAME;OUT.mkdir(exist_ok=True)
DATA=json.loads((P/'source'/f"{CFG['source']}_sampled.json").read_text());REST=DATA['rest'];FPS=30
start=round(CFG['start']*FPS);SRC=DATA['poses'][start:start+round(CFG['duration']*FPS)];N=len(SRC)
bpy.ops.wm.open_mainfile(filepath=str(P/'assets/approved_character.blend'))
s=bpy.context.scene;o=bpy.data.objects['Rounded Character — continuous surface'];rig=bpy.data.objects['Skinning guide — preliminary']
rest_hash=hashlib.sha256(b''.join(__import__('struct').pack('fff',*v.co) for v in o.data.vertices)).hexdigest()
refine(o,rig)
o.modifiers.remove(o.modifiers['Bend surface correction'])
R={b.name:b.matrix_local.copy() for b in rig.data.bones};Q={n:m.to_quaternion() for n,m in R.items()}
RH={b.name:b.head_local.copy() for b in rig.data.bones};RL={b.name:b.length for b in rig.data.bones}
def vec(p,n):return Vector(p[n]['head'])
def quat(p,n):return Quaternion(p[n]['q'])
def clamp(x,a,b):return max(a,min(b,x))
def smooth(t):t=clamp(t,0,1);return t*t*(3-2*t)
def ranges(mask):
 out=[];start=None
 for i,v in enumerate(mask+[False]):
  if v and start is None:start=i
  if not v and start is not None:out.append((start,i-1));start=None
 return out
human_leg=sum((vec(REST,side+'UpLeg')-vec(REST,side+'Leg')).length+(vec(REST,side+'Leg')-vec(REST,side+'Foot')).length for side in ['Left','Right'])/2
SCALE=(RL['thigh.L']+RL['shin.L'])/human_leg
initial=quat(SRC[0],'Hips')@quat(REST,'Hips').inverted();front=initial@Vector((0,-1,0));yaw=-math.atan2(front.x,-front.y);ALIGN=Quaternion((0,0,1),yaw)
origin=(vec(SRC[0],'Hips')+vec(SRC[-1],'Hips'))/2
mean_z=sum(vec(p,'Hips').z for p in SRC)/N
def delta(p,n):return ALIGN@(quat(p,n)@quat(REST,n).inverted())
def damp(q,gain):
 e=q.to_euler('XYZ');e.x*=gain;e.y*=gain;return e.to_quaternion()
def mapped(p,src,dst,gain=1):
 d=delta(p,src)
 if NAME=='pickup' and dst in ['pelvis','chest','head']:
  # During a deep forward fold, pelvis forward becomes almost vertical.
  # Use the measured feet for stable heading and limit lean for this short torso.
  fronts=[delta(p,side+'Foot')@Vector((0,-1,0)) for side in ['Left','Right']]
  f=fronts[0]+fronts[1];heading=math.atan2(f.x,-f.y);twist=Quaternion((0,0,1),heading)
  swing=twist.inverted()@d
  if swing.w<0:swing.negate()
  lim=math.radians({'pelvis':26,'chest':43,'head':25}[dst]);angle=swing.angle
  swing=Quaternion().slerp(swing,min(gain,lim/max(angle,.0001)))
  return twist@swing@Q[dst]
 return damp(d,gain)@Q[dst]
def xform(head,q):return Matrix.LocRotScale(head,q,Vector((1,1,1)))
def boneend(head,q,n):return head+q@Vector((0,RL[n],0))
def setpose(n,head,q):
 b=rig.pose.bones[n];b.rotation_mode='QUATERNION';b.matrix=xform(head,q);bpy.context.view_layer.update()
def worlddir(q):return q@Vector((0,1,0))
# Use the approved subdivided foot surface as the collision/contact envelope.
ev=o.evaluated_get(bpy.context.evaluated_depsgraph_get());em=ev.to_mesh()
COLL={side:[v.co.copy()-RH['foot.'+side] for v in em.vertices if v.co.z<.14 and (v.co.x>0)==(side=='L')] for side in ['L','R']};ev.to_mesh_clear()
FLOOR=.035
base=[]
for i,p in enumerate(SRC):
 root=ALIGN@((vec(p,'Hips')-origin)*SCALE);root.z=.94+(vec(p,'Hips').z-mean_z)*SCALE
 pelvisq=mapped(p,'Hips','pelvis',.72);pelvisD=pelvisq@Q['pelvis'].inverted()
 record={'root':root,'pelvisq':pelvisq,'legs':{}}
 for side,full in [('L','Left'),('R','Right')]:
  hip=root+pelvisD@(RH['thigh.'+side]-RH['pelvis'])
  u=mapped(p,full+'UpLeg','thigh.'+side);l=mapped(p,full+'Leg','shin.'+side)
  knee=boneend(hip,u,'thigh.'+side);ankle=boneend(knee,l,'shin.'+side)
  d=delta(p,full+'Foot');front=d@Vector((0,-1,0));pitch=clamp(math.atan2(-front.z,math.hypot(front.x,front.y)),math.radians(-28),math.radians(58));fyaw=math.atan2(front.x,-front.y)
  record['legs'][side]={'hip':hip,'knee':knee,'raw':ankle,'uq':u,'lq':l,'pitch':pitch,'yaw':fyaw,'source_bend':worlddir(u).angle(worlddir(l))}
 base.append(record)
# Detect measured support using toe and heel-proxy speeds; preserve event timing.
CONTACT={};SPEED={};INTERVAL={};TARGET={};FOOT_D={}
for side,full in [('L','Left'),('R','Right')]:
 toes=[ALIGN@vec(p,full+'ToeBase') for p in SRC]
 heels=[ALIGN@vec(p,full+'Foot')+(delta(p,full+'Foot')@Vector((0,.05,-.04))) for p in SRC]
 def speed(points,i):return (points[min(N-1,i+1)]-points[max(0,i-1)]).length*FPS/(min(N-1,i+1)-max(0,i-1))
 speeds=[min(speed(toes,i),speed(heels,i)) for i in range(N)]
 mask=[v<.95 for v in speeds]
 # A planted foot must be released during a recorded turn rather than locking yaw.
 for j in range(1,N-1):
  ya=base[j-1]['legs'][side]['yaw'];yb=base[j+1]['legs'][side]['yaw'];dy=(yb-ya+math.pi)%(2*math.pi)-math.pi
  if abs(dy)*FPS/2>1.2:mask[j]=False
 for i in range(1,N-1):
  if mask[i-1] and mask[i+1]:mask[i]=True
 for a,b in ranges(mask):
  if b-a<3:
   for i in range(a,b+1):mask[i]=False
 CONTACT[side]=mask;SPEED[side]=speeds;INTERVAL[side]=ranges(mask)
 targets=[None]*N;rotations=[None]*N
 def footrot(i,fixyaw=None):
  p=base[i]['legs'][side];return Quaternion((0,0,1),p['yaw'] if fixyaw is None else fixyaw)@Quaternion((1,0,0),p['pitch'])
 # Flat reference toe point and matching heel point support a continuous rocker.
 toe=Vector((0,-.212,-.135));heel=Vector((0,.084,-.135))
 for a,b in INTERVAL[side]:
  candidates=list(range(a+(b-a)//4,b-(b-a)//4+1));ref=min(candidates,key=lambda i:abs(base[i]['legs'][side]['pitch']))
  fyaw=base[ref]['legs'][side]['yaw'];flat=Quaternion((0,0,1),fyaw)
  anchor=base[ref]['legs'][side]['raw']+flat@toe
  for i in range(a,b+1):
   q=footrot(i,fyaw);pitch=base[i]['legs'][side]['pitch'];pivot=toe if pitch>=0 else heel
   ground=anchor+flat@(pivot-toe);target=ground-q@pivot
   target.z=FLOOR-min((q@v).z for v in COLL[side])
   targets[i]=target;rotations[i]=q
 # Recorded swing path plus smooth endpoint offsets; no authored step cycle.
 for a,b in ranges([not x for x in mask]):
  prev=a-1 if a>0 else None;nxt=b+1 if b<N-1 else None
  off0=targets[prev]-base[prev]['legs'][side]['raw'] if prev is not None else (targets[nxt]-base[nxt]['legs'][side]['raw'] if nxt is not None else Vector((0,0,0)))
  off1=targets[nxt]-base[nxt]['legs'][side]['raw'] if nxt is not None else off0
  for i in range(a,b+1):
   t=(i-a+1)/(b-a+2);w=smooth(t);q=footrot(i)
   target=base[i]['legs'][side]['raw']+off0*(1-w)+off1*w
   clearance=.015*math.sin(math.pi*t)**2
   minz=FLOOR-min((q@v).z for v in COLL[side])+clearance
   target.z=max(target.z,minz);targets[i]=target;rotations[i]=q
 TARGET[side]=targets;FOOT_D[side]=rotations
# Fit root height to measured knee flexion and fixed stance feet; retain root XY/bob.
heights=[]
for i in range(N):
 candidates=[]
 for side in ['L','R']:
  if CONTACT[side][i]:
   leg=base[i]['legs'][side];l1=RL['thigh.'+side];l2=RL['shin.'+side];dist=math.sqrt(l1*l1+l2*l2+2*l1*l2*math.cos(leg['source_bend']))
   target=TARGET[side][i];sep=Vector((leg['hip'].x-target.x,leg['hip'].y-target.y,0)).length
   h=target.z+math.sqrt(max(.05,dist*dist-sep*sep))-(leg['hip'].z-base[i]['root'].z)
   candidates.append(h)
 heights.append(sum(candidates)/len(candidates) if candidates else base[i]['root'].z)
heights=[sum(heights[max(0,i-1):min(N,i+2)])/len(heights[max(0,i-1):min(N,i+2)]) for i in range(N)]
def solve_leg(hip,ankle,kneeref,l1,l2,forward):
 v=ankle-hip;d=v.length;v.normalize();d=clamp(d,abs(l1-l2)+1e-5,l1+l2-.0005)
 a=(l1*l1-l2*l2+d*d)/(2*d);h=math.sqrt(max(0,l1*l1-a*a))
 pole=kneeref-hip-v*(kneeref-hip).dot(v);forward=forward.copy();forward-=v*forward.dot(v)
 if pole.length<.001 or pole.dot(forward)<0:pole=forward
 pole.normalize();return hip+v*a+pole*h
def alignbone(rawq,direction):return worlddir(rawq).rotation_difference(direction.normalized())@rawq
audit=[];all_head=[];last_rotation={}
for i,p in enumerate(SRC):
 s.frame_set(i+1);r=base[i];root=r['root'].copy();root.z=heights[i];q=r['pelvisq'];D=q@Q['pelvis'].inverted()
 # Avoid overextension in either leg after support cleanup.
 for side in ['L','R']:
  hip=root+D@(RH['thigh.'+side]-RH['pelvis']);t=TARGET[side][i];maxlen=(RL['thigh.'+side]+RL['shin.'+side])*.998
  xy=Vector((hip.x-t.x,hip.y-t.y,0)).length
  if xy<maxlen:root.z=min(root.z,t.z+math.sqrt(maxlen*maxlen-xy*xy)-(hip.z-root.z))
 setpose('pelvis',root,q)
 chesthead=root+D@(RH['chest']-RH['pelvis']);chestq=mapped(p,'Spine','chest',.72);setpose('chest',chesthead,chestq)
 chestD=chestq@Q['chest'].inverted();headhead=chesthead+chestD@(RH['head']-RH['chest']);headq=mapped(p,'Head','head',.60);setpose('head',headhead,headq)
 item={'frame':i+1,'root':list(root),'feet':{},'head':list(headhead)}
 all_head.append(headhead)
 for side,full,sign in [('L','Left',1),('R','Right',-1)]:
  hip=root+D@(RH['thigh.'+side]-RH['pelvis']);target=TARGET[side][i]
  kneeref=r['legs'][side]['knee']+root-r['root'];knee=solve_leg(hip,target,kneeref,RL['thigh.'+side],RL['shin.'+side],D@Vector((0,-1,0)))
  uq=alignbone(r['legs'][side]['uq'],knee-hip);lq=alignbone(r['legs'][side]['lq'],target-knee)
  setpose('thigh.'+side,hip,uq);setpose('shin.'+side,knee,lq);fq=FOOT_D[side][i]@Q['foot.'+side];setpose('foot.'+side,target,fq)
  shoulder=chesthead+chestD@(RH['upper_arm.'+side]-RH['chest'])
  out=Quaternion(chestD@Vector((0,1,0)),-sign*math.radians(4));aq=out@mapped(p,full+'Arm','upper_arm.'+side);eq=out@mapped(p,full+'ForeArm','forearm.'+side)
  # Preserve measured timing, widening overhead arm paths for the large head.
  clearance_angle=0.0
  if NAME=='stretch':
   headD=rig.pose.bones['head'].matrix@R['head'].inverted();inv=headD.inverted()
   def clearance(angle):
    rot=Quaternion(chestD@Vector((0,1,0)),sign*angle);aa=rot@aq;ee=rot@eq;el=boneend(shoulder,aa,'upper_arm.'+side);wr=boneend(el,ee,'forearm.'+side);tip=wr+(ee@Q['forearm.'+side].inverted())@Vector((sign*.18,-.01,0));points=[]
    for A,B in [(shoulder,el),(el,wr),(wr,tip)]:
     points.extend(A.lerp(B,j/8) for j in range(9))
    gap=100
    for point in points:
     v=inv@point-Vector((0,0,2.025));g=math.sqrt((v.x/.385)**2+(v.y/.355)**2+(v.z/.385)**2)
     gap=min(gap,(g-1)*.355)
    return gap
   if clearance(0)<.11:
    lo=0;hi=math.radians(35)
    for _ in range(14):
     mid=(lo+hi)/2
     if clearance(mid)<.11:lo=mid
     else:hi=mid
    clearance_angle=hi;rot=Quaternion(chestD@Vector((0,1,0)),sign*hi);aq=rot@aq;eq=rot@eq
  setpose('upper_arm.'+side,shoulder,aq);elbow=boneend(shoulder,aq,'upper_arm.'+side);setpose('forearm.'+side,elbow,eq)
  item.setdefault('arm_clearance_degrees',{})[side]=math.degrees(clearance_angle)
  handhead=boneend(elbow,eq,'forearm.'+side);handq=(eq@Q['forearm.'+side].inverted())@Q['hand.'+side];setpose('hand.'+side,handhead,handq)
  item['feet'][side]={'contact':CONTACT[side][i],'ankle':list(target),'yaw':FOOT_D[side][i].to_euler().z,'source_contact_speed':SPEED[side][i],'knee_degrees':math.degrees(worlddir(uq).angle(worlddir(lq)))}
 for b in rig.pose.bones:
  if b.name in last_rotation and b.rotation_quaternion.dot(last_rotation[b.name])<0:b.rotation_quaternion.negate()
  last_rotation[b.name]=b.rotation_quaternion.copy()
  b.keyframe_insert('location',frame=i+1);b.keyframe_insert('rotation_quaternion',frame=i+1);b.keyframe_insert('scale',frame=i+1)
 # Fair the joint surface at this measured pose. Keys are editable pose correctives.
 if o.data.shape_keys:
  for k in o.data.shape_keys.key_blocks:k.value=0
 key,expected=add_joint_corrective(o,rig,f'Bend correction {i+1:03d}')
 key.value=0;key.keyframe_insert('value',frame=i);key.value=1;key.keyframe_insert('value',frame=i+1);key.value=0;key.keyframe_insert('value',frame=i+2)
 audit.append(item)
def curves(a):
 for l in a.layers:
  for st in l.strips:
   for cb in st.channelbags:yield from cb.fcurves
for action in bpy.data.actions:
 for fc in curves(action):
  for k in fc.keyframe_points:k.interpolation='LINEAR'
rig.hide_set(True);rig['source']=CFG.get('provenance','Supplied CMU-compatible motion')+'; body-proportion adaptation + support-aware foot cleanup, not physics simulation'
o['scope']='User-approved original rest surface; retargeted measured human action with pose-space skin correction.'
assert rest_hash==hashlib.sha256(b''.join(__import__('struct').pack('fff',*v.co) for v in o.data.vertices)).hexdigest()
s.frame_start=1;s.frame_end=N;s.render.fps=FPS;s.name=CFG['label']
cam=bpy.data.objects['Three quarter'];cam.location=CFG['camera'];target=Vector((0,0,1.18));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.ortho_scale=CFG['scale'];s.camera=cam
s.render.engine='BLENDER_EEVEE';s.render.resolution_x=1920;s.render.resolution_y=1080;s.render.resolution_percentage=100 if '--final' in sys.argv else 50
folder=OUT/('frames_final' if '--final' in sys.argv else 'frames_preview');folder.mkdir(exist_ok=True)
s.render.filepath=str(folder/(NAME+'_'));s.render.image_settings.file_format='PNG'
s['README']='See rounded-character-previs/references/workflow.md. Approved rest vertex positions preserved. Source timing from CMU; see per-action audit. Baked bone keys + per-frame pose correctives. Contact kinematics, no dynamics simulation.'
(OUT/'retarget_audit.json').write_text(json.dumps({'fps':FPS,'frames':N,'duration':N/FPS,'source':CFG.get('provenance','CMU '+CFG['source']),'source_start_seconds':CFG['start'],'leg_translation_scale':SCALE,'contact_intervals':INTERVAL,'rest_vertex_hash':rest_hash,'animation':audit},indent=2))
s.frame_set(1)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/f'{NAME}.blend'))
print('RETARGET_DONE',SCALE,INTERVAL)
