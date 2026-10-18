import bpy,math
from mathutils import Vector

def smooth(v,c,w):
 t=max(0,min(1,(v-c+w)/(2*w)));return t*t*(3-2*t)

def refine(obj,rig,preserve=True):
 """Narrow anatomical weight transitions; keep every approved rest vertex intact."""
 arm=obj.modifiers.get('Preliminary skinning / preserve volume')
 arm.name='Anatomical skinning';arm.use_deform_preserve_volume=preserve
 names={g.index:g.name for g in obj.vertex_groups}
 def assign(v,weights):
  for g in list(v.groups):obj.vertex_groups[g.group].remove([v.index])
  for n,w in weights.items():
   if w>1e-9:
    g=obj.vertex_groups.get(n) or obj.vertex_groups.new(name=n);g.add([v.index],w,'REPLACE')
 jointgroup=obj.vertex_groups.get('Joint surface relaxation') or obj.vertex_groups.new(name='Joint surface relaxation')
 for v in obj.data.vertices:
  x,y,z=v.co;groupnames=[names[g.group] for g in v.groups if g.group in names]
  isarm=any(n.startswith(('upper_arm.','forearm.','hand.')) for n in groupnames)
  isleg=any(n.startswith(('thigh.','shin.','foot.')) for n in groupnames)
  if isarm:
   side='L' if x>0 else 'R';el=smooth(abs(x),.62,.042);hand=smooth(abs(x),.92,.04);shoulder=smooth(abs(x),.285,.065)
   assign(v,{'chest':1-shoulder,'upper_arm.'+side:shoulder*(1-el),'forearm.'+side:shoulder*el*(1-hand),'hand.'+side:shoulder*el*hand})
   fac=max(0,1-abs(abs(x)-.62)/.16)
  elif isleg:
   side='L' if x>0 else 'R';knee=smooth(z,.60,.045);foot=1-smooth(z,.17,.045);hip=1-smooth(z,.99,.11)
   assign(v,{'pelvis':1-hip,'thigh.'+side:hip*knee,'shin.'+side:hip*(1-knee)*(1-foot),'foot.'+side:hip*(1-knee)*foot})
   fac=max(0,1-abs(z-.60)/.15)
  elif z<1.10:
   hip=1-smooth(z,.99,.11);left=smooth(x,0,.10)
   assign(v,{'pelvis':1-hip,'thigh.L':hip*left,'thigh.R':hip*(1-left)})
   fac=0
  else:fac=0
  if fac>0:jointgroup.add([v.index],fac,'REPLACE')
 # Corrective smoothing compensates local folding against the unchanged rest surface.
 mod=obj.modifiers.get('Bend surface correction') or obj.modifiers.new('Bend surface correction','CORRECTIVE_SMOOTH')
 mod.factor=.65;mod.iterations=8;mod.smooth_type='LENGTH_WEIGHTED';mod.rest_source='ORCO';mod.vertex_group=jointgroup.name
 bpy.context.view_layer.objects.active=obj
 while list(obj.modifiers).index(mod)>1:bpy.ops.object.modifier_move_up(modifier=mod.name)
 # Rebind only the hip fork using Blender's volumetric bone-heat solution.
 # Height-only paint produced a crease at the bifurcating crotch; heat follows topology.
 names={g.index:g.name for g in obj.vertex_groups}
 original=[{names[g.group]:g.weight for g in v.groups if names[g.group] in rig.data.bones} for v in obj.data.vertices]
 bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);rig.hide_set(False);rig.select_set(True);bpy.context.view_layer.objects.active=rig
 bpy.ops.object.parent_set(type='ARMATURE_AUTO',keep_transform=True)
 names={g.index:g.name for g in obj.vertex_groups}
 automatic=[{names[g.group]:g.weight for g in v.groups if names[g.group] in rig.data.bones} for v in obj.data.vertices]
 for v in obj.data.vertices:
  t=max(0,1-abs(v.co.z-.98)/.22);t=t*t*(3-2*t)
  weights={n:original[v.index].get(n,0)*(1-t)+automatic[v.index].get(n,0)*t for n in rig.data.bones.keys()}
  for g in obj.vertex_groups:
   if g.name in rig.data.bones:g.remove([v.index])
  for n,w in weights.items():
   if w>1e-8:obj.vertex_groups[n].add([v.index],w,'REPLACE')
 rig.hide_set(True);rig.select_set(False);obj.select_set(True);bpy.context.view_layer.objects.active=obj
 rig.name='Rounded Humanoid — deformation rig'
 rig['status']='Refined anatomical weights and localized bend correction. No dynamics simulation.'
 return mod

def static_test(rig):
 # Forearm world Z hinges and sagittal knee bends expose the silhouette and surface.
 for name,axis,ang in [('forearm.L',2,-1.57),('forearm.R',2,-1.57),('shin.L',0,1.40),('thigh.L',0,-.28)]:
  b=rig.pose.bones[name];b.rotation_mode='XYZ';b.rotation_euler[axis]=ang
 bpy.context.view_layer.update()
