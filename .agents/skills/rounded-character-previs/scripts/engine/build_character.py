"""Original rounded humanoid, built locally from quad lofts; no downloaded model.
Run only in a separate Blender: --background --factory-startup --python this.py
"""
import bpy, math, json, argparse, sys
from pathlib import Path
from mathutils import Vector
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--out-dir',type=Path,required=True);parser.add_argument('--render',action='store_true');args=parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
P=args.out_dir.resolve();P.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
verts=[];faces=[];tags={};joint_groups={}
def vertex(co,tag):
 i=len(verts);verts.append(tuple(co));tags[i]=tag;return i
def bridge(a,b):
 assert len(a)==len(b)
 for j in range(len(a)):faces.append((a[j],a[(j+1)%len(a)],b[(j+1)%len(b)],b[j]))
N=32
# Torso narrows at the waist, broadens at shoulders, then flows into a short neck.
levels=[(.98,.24,.145),(1.05,.25,.15),(1.15,.232,.145),(1.28,.21,.14),
        (1.37,.22,.14),(1.45,.23,.14),(1.53,.225,.135),
        (1.57,.185,.12),(1.60,.10,.085),(1.64,.064,.064)]
rings=[]
for z,rx,ry in levels:
 rings.append([vertex((rx*math.cos(j*math.tau/N),ry*math.sin(j*math.tau/N),z),'torso') for j in range(N)])
holes={1:set([29,30,31,0,1,2]),-1:set([13,14,15,16,17,18])}
for k in range(len(rings)-1):
 for j in range(N):
  if k in [4,5] and any(j in h for h in holes.values()):continue
  faces.append((rings[k][j],rings[k][(j+1)%N],rings[k+1][(j+1)%N],rings[k+1][j]))
# Seamless head: spherical rings continue directly from the neck.
previous=rings[-1]
for ang in [-72,-60,-45,-30,-15,0,15,30,45,60,72,82]:
 a=math.radians(ang);z=2.025+.385*math.sin(a);rx=.385*math.cos(a);ry=.355*math.cos(a)
 r=[vertex((rx*math.cos(j*math.tau/N),ry*math.sin(j*math.tau/N),z),'head') for j in range(N)]
 bridge(previous,r);previous=r
top=vertex((0,0,2.41),'head')
for j in range(N):faces.append((previous[j],previous[(j+1)%N],top))
# A shared crotch seam bifurcates the torso into two connected quad leg tubes.
inner=[]
for i in range(1,16):
 t=i/16;inner.append(vertex((0,.145*math.cos(math.pi*t),.98-.065*math.sin(math.pi*t)),'crotch'))
bottom=rings[0]
leg_top={1:[bottom[j%32] for j in range(24,41)]+inner,
         -1:[bottom[j] for j in range(8,25)]+list(reversed(inner))}
for side in [1,-1]:
 previous=leg_top[side]
 # At both knee and ankle multiple rings support a gradual skinned bend.
 params=[(.91,.132,.108,.12,0),(.84,.133,.108,.117,0),(.73,.133,.099,.105,0),
         (.64,.133,.089,.094,0),(.60,.133,.087,.091,0),(.56,.133,.086,.091,0),
         (.48,.133,.086,.093,0),(.35,.133,.081,.087,0),(.24,.133,.07,.077,0),
         (.18,.133,.069,.084,-.012),(.135,.133,.085,.125,-.046),(.075,.133,.099,.156,-.065),
         (.035,.133,.099,.156,-.065)]
 for z,cx,rx,ry,cy in params:
  rr=[]
  for j in range(N):
   # Order of left tube is reversed around its outer side.
   a=(-math.pi/2+j*math.tau/N) if side==1 else (math.pi/2+j*math.tau/N)
   rr.append(vertex((side*cx+rx*math.cos(a),cy+ry*math.sin(a),z),'leg.L' if side==1 else 'leg.R'))
  bridge(previous,rr);previous=rr
 # Flat foot sole, a quad grid fan terminating at two gentle poles.
 center=vertex((side*.133,-.065,.035),'sole')
 for j in range(N):faces.append((previous[(j+1)%N],previous[j],center))
# Arms grow from 16-edge side openings rather than intersecting separate solids.
for side in [1,-1]:
 js=[(29+i)%32 for i in range(7)] if side==1 else [13+i for i in range(7)]
 boundary=[rings[4][j] for j in js]+[rings[5][js[-1]],rings[6][js[-1]]]+[rings[6][j] for j in js[-2::-1]]+[rings[5][js[0]]]
 previous=boundary
 angles=[math.atan2(verts[i][2]-1.45,verts[i][1]) for i in boundary]
 params=[(.29,.083,.083,0),(.35,.079,.077,0),(.43,.074,.072,0),(.53,.068,.067,0),
         (.585,.065,.064,0),(.62,.064,.063,0),(.655,.063,.062,0),(.72,.061,.059,0),
         (.81,.054,.051,0),(.89,.046,.044,0),(.925,.048,.04,-.006),
         (.97,.067,.039,-.015),(1.035,.066,.035,-.015),(1.09,.045,.027,-.01),(1.115,.016,.014,-.005)]
 for x,ry,rz,cy in params:
  rr=[vertex((side*x,cy+ry*math.cos(a),1.45+rz*math.sin(a)),'arm.L' if side==1 else 'arm.R') for a in angles]
  bridge(previous,rr);previous=rr
 tip=vertex((side*1.12,-.005,1.45),'hand')
 for j in range(len(previous)):faces.append((previous[j],previous[(j+1)%len(previous)],tip))
used=sorted({i for face in faces for i in face}); remap={old:new for new,old in enumerate(used)}
verts=[verts[i] for i in used]; tags={remap[i]:tags[i] for i in used}; faces=[tuple(remap[i] for i in face) for face in faces]
mesh=bpy.data.meshes.new('Original continuous quad surface');mesh.from_pydata(verts,[],faces);mesh.update()
obj=bpy.data.objects.new('Rounded Character — continuous surface',mesh);bpy.context.collection.objects.link(obj)
bpy.context.view_layer.objects.active=obj;obj.select_set(True)
# Recalculate consistency globally, including the mirrored limb winding.
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
for poly in mesh.polygons:poly.use_smooth=True
sub=obj.modifiers.new('Smooth silhouette / editable quad cage','SUBSURF');sub.levels=2;sub.render_levels=3
obj['design']='Original local model inspired by broad shape characteristics of supplied reference; no purchased or downloaded product geometry.'
obj['topology']='One connected closed surface. Quad torso/shoulder/crotch/limb flow, dense bend-support rings at elbows/knees; triangle fans only at skull crown, hand tips and soles.'
obj['scope']='Static appearance review. No walking animation; no production rig claim.'
mat=bpy.data.materials.new('Soft porcelain white');mat.diffuse_color=(.82,.84,.86,1);mat.use_nodes=True
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Base Color'].default_value=(.82,.84,.86,1);bs.inputs['Roughness'].default_value=.57
obj.data.materials.append(mat)
# Skinning preparation: named anatomical vertex groups, smoothly blended around joints.
def assign(i,weights):
 for name,w in weights.items():
  if w<1e-7:continue
  group=obj.vertex_groups.get(name) or obj.vertex_groups.new(name=name);group.add([i],w,'REPLACE')
def blend(v,c,width):return max(0,min(1,(v-c+width)/(2*width)))
for i,(x,y,z) in enumerate(verts):
 tag=tags[i]
 if tag.startswith('arm.') or tag=='hand':
  side='L' if x>0 else 'R';t=blend(abs(x),.62,.09);hand=blend(abs(x),.92,.055)
  shoulder=blend(abs(x),.285,.065)
  assign(i,{'chest':1-shoulder,'upper_arm.'+side:shoulder*(1-t),'forearm.'+side:shoulder*t*(1-hand),'hand.'+side:shoulder*t*hand})
 elif tag.startswith('leg.') or tag=='sole':
  side='L' if x>0 else 'R';t=blend(z,.60,.10);foot=1-blend(z,.17,.055)
  hip=1-blend(z,.93,.09)
  assign(i,{'pelvis':1-hip,'thigh.'+side:hip*t,'shin.'+side:hip*(1-t)*(1-foot),'foot.'+side:hip*(1-t)*foot})
 elif tag=='head' or z>1.60:
  t=blend(z,1.67,.06);assign(i,{'chest':1-t,'head':t})
 else:
  t=blend(z,1.23,.20);assign(i,{'pelvis':1-t,'chest':t})
# Hidden guide armature is editable, but the reviewed mesh remains in T pose.
arm=bpy.data.armatures.new('Anatomical skinning guide');rig=bpy.data.objects.new('Skinning guide — preliminary',arm);bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;obj.select_set(False);rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
def bone(name,a,b,parent=None):
 e=arm.edit_bones.new(name);e.head=a;e.tail=b
 if parent:e.parent=arm.edit_bones[parent]
 return e
bone('pelvis',(0,0,.94),(0,0,1.20));bone('chest',(0,0,1.20),(0,0,1.62),'pelvis');bone('head',(0,0,1.62),(0,0,2.25),'chest')
for sign,side in [(1,'L'),(-1,'R')]:
 bone('upper_arm.'+side,(sign*.23,0,1.45),(sign*.62,0,1.45),'chest')
 bone('forearm.'+side,(sign*.62,0,1.45),(sign*.92,0,1.45),'upper_arm.'+side)
 bone('hand.'+side,(sign*.92,0,1.45),(sign*1.11,-.01,1.45),'forearm.'+side)
 bone('thigh.'+side,(sign*.133,0,.96),(sign*.133,0,.60),'pelvis')
 bone('shin.'+side,(sign*.133,0,.60),(sign*.133,0,.17),'thigh.'+side)
 bone('foot.'+side,(sign*.133,0,.17),(sign*.133,-.20,.08),'shin.'+side)
bpy.ops.object.mode_set(mode='OBJECT');rig.hide_render=True;rig.hide_set(True);rig['status']='Preliminary guide and smooth initial weights. Requires deformation review and weight refinement before animation.'
deform=obj.modifiers.new('Preliminary skinning / preserve volume','ARMATURE');deform.object=rig;deform.use_deform_preserve_volume=True
bpy.context.view_layer.objects.active=obj;obj.select_set(True);rig.select_set(False)
# Move armature before subdivision so the coarse deformation cage remains editable.
bpy.ops.object.modifier_move_up(modifier=deform.name)
# Matte studio with soft contact shadow.
floor_mat=bpy.data.materials.new('Warm light gray');floor_mat.diffuse_color=(.67,.69,.72,1);floor_mat.use_nodes=True;floor_mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.67,.69,.72,1);floor_mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=.8
bpy.ops.mesh.primitive_plane_add(size=200);floor=bpy.context.object;floor.name='Studio ground';floor.location.z=.035;floor.data.materials.append(floor_mat)
scene=bpy.context.scene;scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.63,.68,.75,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.18
def aim(o,target):o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
for name,loc,power,size in [('Large key',(-3,-4,6),650,2.5),('Fill',(4,-2,3.5),85,3),('Rim',(1,3,5),180,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;aim(o,(0,0,1.2))
for name,loc,ortho in [('Front orthographic',(0,-7,1.22),2.95),('Three quarter',(4,-6,3.05),3.15)]:
 bpy.ops.object.camera_add(location=loc);c=bpy.context.object;c.name=name;c.data.type='ORTHO';c.data.ortho_scale=ortho;aim(c,(0,0,1.22))
scene.render.engine='BLENDER_EEVEE';scene.eevee.taa_render_samples=32
scene.render.resolution_x=1200;scene.render.resolution_y=1200;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='AgX'
scene.camera=bpy.data.objects['Three quarter'];scene.render.filepath='//character_three_quarter.png'
bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
for screen in bpy.data.screens:
 for area in screen.areas:
  if area.type=='VIEW_3D':area.spaces.active.region_3d.view_perspective='CAMERA'
bpy.ops.wm.save_as_mainfile(filepath=str(P/'rounded_character.blend'))
for cam,name in ([('Front orthographic','character_front.png'),('Three quarter','character_three_quarter.png')] if args.render else []):
 scene.camera=bpy.data.objects[cam];scene.render.filepath=str(P/name);bpy.ops.render.render(write_still=True)
print('CHARACTER_COMPLETE',len(verts),len(faces))
