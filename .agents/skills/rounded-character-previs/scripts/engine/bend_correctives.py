"""Pose-space joint surface fairing. Changes skin shape, never authors a gait."""
import bpy,math
from mathutils import Vector,Quaternion

def skin_dq(v,obj,rig):
 terms=[]
 for g in v.groups:
  name=obj.vertex_groups[g.group].name
  if name in rig.pose.bones:
   m=rig.pose.bones[name].matrix@rig.data.bones[name].matrix_local.inverted()
   q=m.to_quaternion();t=m.translation;d=Quaternion((0,*t))@q
   terms.append((g.weight,q,Quaternion(tuple(x*.5 for x in d))))
 ref=terms[0][1];rq=[0.]*4;dq=[0.]*4
 for w,q,d in terms:
  sign=1 if q.dot(ref)>=0 else -1
  for k in range(4):rq[k]+=w*sign*q[k];dq[k]+=w*sign*d[k]
 norm=math.sqrt(sum(x*x for x in rq));q=Quaternion(tuple(x/norm for x in rq));d=Quaternion(tuple(x/norm for x in dq))
 tr=d@q.conjugated();return q,Vector((2*tr.x,2*tr.y,2*tr.z))

def add_joint_corrective(obj,rig,name='Joint pose corrective'):
 if not obj.data.shape_keys:obj.shape_key_add(name='Basis')
 key=obj.shape_key_add(name=name)
 bone_groups={g.index:g.name for g in obj.vertex_groups if g.name in rig.data.bones}
 expected={}
 for v in obj.data.vertices:
  groupnames=[bone_groups[g.group] for g in v.groups if g.group in bone_groups]
  x,y,z=v.co;side='L' if x>0 else 'R'
  if any(n.startswith(('upper_arm.','forearm.','hand.')) for n in groupnames) and abs(abs(x)-.62)<.14:
   upper='upper_arm.'+side;lower='forearm.'+side;axis=Vector((1 if x>0 else -1,0,0));J0=Vector((.62 if x>0 else -.62,0,1.45));band=.14
  elif any(n.startswith(('thigh.','shin.','foot.')) for n in groupnames) and abs(z-.60)<.15:
   upper='thigh.'+side;lower='shin.'+side;axis=Vector((0,0,-1));J0=Vector((.133 if x>0 else -.133,0,.60));band=.15
  else:continue
  D1=rig.pose.bones[upper].matrix@rig.data.bones[upper].matrix_local.inverted();D2=rig.pose.bones[lower].matrix@rig.data.bones[lower].matrix_local.inverted()
  q1=D1.to_quaternion();q2=D2.to_quaternion();a=q1@axis;b=q2@axis;theta=a.angle(b)
  if theta<math.radians(1):continue
  s=(v.co-J0).dot(axis);u=(s/band+1)/2
  if not 0<=u<=1:continue
  J=rig.pose.bones[lower].head
  A=J-a*band;B=J+b*band;C=A+a*(2*band/3);D=B-b*(2*band/3)
  center=A*(1-u)**3+C*(3*(1-u)**2*u)+D*(3*(1-u)*u*u)+B*u**3
  tangent=((C-A)*(3*(1-u)**2)+(D-C)*(6*(1-u)*u)+(B-D)*(3*u*u)).normalized()
  q=q1.slerp(q2,u);rotation=(q@axis).rotation_difference(tangent)@q
  radial=v.co-J0-axis*s;desired=center+rotation@radial
  skinrot,translation=skin_dq(v,obj,rig)
  alpha=max(0,min(1,(theta-math.radians(1))/math.radians(14)));alpha=alpha*alpha*(3-2*alpha)
  desired=(skinrot@v.co+translation)*(1-alpha)+desired*alpha
  key.data[v.index].co=skinrot.conjugated()@(desired-translation)
  expected[v.index]=desired
 key.value=1
 return key,expected

def verify_expected(obj,expected):
 bpy.context.view_layer.update();e=obj.evaluated_get(bpy.context.evaluated_depsgraph_get());m=e.to_mesh()
 # Verification of inverse DQ precedes subdivision; callers may disable subdivision.
 err=max(((m.vertices[i].co-v).length for i,v in expected.items()),default=0);e.to_mesh_clear();return err
