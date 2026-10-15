"""Deterministic, editable scene assets; run through Blender MCP.

The flow is illustrative choreography, not measured throughput or a physics simulation.
The review pulse is identical in the before and backlog clips (45 frames).
"""
import bpy
import math
import random
from pathlib import Path
from mathutils import Vector

ROOT = Path('/Users/yuta.okada/local/dev/mv_from_note/20261015_AIで作る時間は減ったのに、なぜ見る時間は増えるのか/assets/blender')
for folder in ('scenes', 'stills', 'renders', 'preview'):
    (ROOT / folder).mkdir(parents=True, exist_ok=True)
FPS = 30

def material(name, color, metallic=0.0, roughness=0.4, emission=0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Metallic'].default_value = metallic
    p.inputs['Roughness'].default_value = roughness
    if emission:
        p.inputs['Emission Color'].default_value = (*color, 1)
        p.inputs['Emission Strength'].default_value = emission
    return m

def box(name, location, scale, mat, bevel=0.06):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    o=bpy.context.object; o.name=name; o.dimensions=scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    o.data.materials.append(mat)
    if bevel:
        m=o.modifiers.new('Machined soft edges','BEVEL'); m.width=bevel; m.segments=3
        o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
    return o

def key(o, f, loc=None, scale=None):
    if loc is not None: o.location=loc; o.keyframe_insert('location',frame=f)
    if scale is not None:
        if o.type=='MESH' and o.name.startswith(('Output ','Queued output ','Inspected output ','Continuing output ','Judgement returned ')) and f>1:
            o.scale=(0,0,0) if scale==(1,1,1) else (1,1,1)
            o.keyframe_insert('scale',frame=f-1)
        o.scale=scale; o.keyframe_insert('scale',frame=f)

def camera_key(cam, frame, position, target, lens=45):
    cam.location=position
    cam.rotation_euler=(Vector(target)-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.keyframe_insert('location',frame=frame)
    cam.keyframe_insert('rotation_euler',frame=frame)
    cam.data.lens=lens;cam.data.keyframe_insert('lens',frame=frame)

def area(name, loc, power, size, color, target=(0,0,0)):
    d=bpy.data.lights.new(name,'AREA'); d.energy=power;d.shape='DISK';d.size=size;d.color=color
    o=bpy.data.objects.new(name,d);bpy.context.collection.objects.link(o);o.location=loc
    o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()

def setup(name, seconds):
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    s=bpy.context.scene;s.name=name;s.frame_start=1;s.frame_end=round(seconds*FPS)
    s.render.engine='BLENDER_EEVEE';s.render.resolution_x=1920;s.render.resolution_y=1080;s.render.resolution_percentage=100
    s.render.fps=FPS;s.render.image_settings.file_format='PNG';s.render.image_settings.color_mode='RGB'
    s.render.film_transparent=False
    s.render.use_file_extension=True
    s.world.color=(.04,.04,.04);s.world.use_nodes=True
    s.world.node_tree.nodes['Background'].inputs[0].default_value=(.018,.028,.048,1)
    s.world.node_tree.nodes['Background'].inputs[1].default_value=.35
    s.view_settings.view_transform='AgX'
    mats={
        'floor':material(name+' / slate',(.026,.043,.069),.35,.3),
        'steel':material(name+' / graphite',(.075,.11,.145),.7,.29),
        'blue':material(name+' / output',(.025,.42,.66),.65,.22),
        'light':material(name+' / aqua',(.09,.76,.92),.35,.24,3),
        'amber':material(name+' / exception',(.94,.31,.035),.55,.3),
        'white':material(name+' / ceramic',(.69,.76,.78),.3,.32),
        'black':material(name+' / rubber',(.025,.035,.042),.15,.55),
    }
    box('STAGE',(0,0,-.3),(200,200,.4),mats['floor'],0)
    area('KEY',(0,-4,13),2800,9,(.75,.85,1))
    area('EDGE',(1,7,8),4000,7,(.35,.68,1))
    area('WARM',(-9,-1,5),1400,6,(1,.66,.37))
    bpy.ops.object.camera_add();cam=bpy.context.object;cam.name='CAMERA';s.camera=cam
    cam.data.clip_end=300
    # Import the actual CC0 Blendkit asset (including its geometry nodes).
    with bpy.data.libraries.load(str(ROOT/'source/conveyor-cc0.blend'),link=False) as (src,dst):
        dst.objects=[n for n in src.objects if n=='Conveyor Belt (Animated & Procedural)']
    belt=dst.objects[0];bpy.context.collection.objects.link(belt);belt.name='BLENDKIT / Conveyor CC0'
    belt.location=(-3,0,.65);belt.rotation_euler.z=-math.pi/2
    mod=next(m for m in belt.modifiers if m.type=='NODES')
    mod.properties.inputs.Input_2.value=12.
    mod.properties.inputs.Input_3.value=3.2
    mod.properties.inputs.Input_4.value=1.
    # Retain asset geometry while unifying its shading with the film.
    for node in mod.node_group.nodes:
        if node.bl_idname=='GeometryNodeSetMaterial':
            old=node.inputs['Material'].default_value
            node.inputs['Material'].default_value=mats['black'] if old and 'rubber' in old.name.lower() else mats['steel']
    for x in (-8,-4,0,2):
        box('Support', (x,0,.22),(.25,2.7,.65),mats['steel'])
    for y in (-1.74,1.74):
        box('RUNWAY EDGE',(-2.5,y,.65),(13,.075,.09),mats['light'],.025)
    box('OUTPUT runway',(5.2,0,.67),(5.0,1.2,.15),mats['black'])
    for y in (-.65,.65):
        box('OUTPUT edge',(5.2,y,.66),(5.0,.05,.06),mats['light'],.02)
    bpy.ops.mesh.primitive_uv_sphere_add(segments=20,ring_count=12,radius=.24,location=(0,0,-10))
    master=bpy.context.object;mesh=master.data;mesh.materials.append(mats['blue'])
    for p in mesh.polygons:p.use_smooth=True
    bpy.data.objects.remove(master,do_unlink=True)
    return s,cam,mats,mesh

def ball(name,mesh):
    o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);return o

def gate(x,mats,label='REVIEW',width=3.65):
    for y in (-width/2,width/2):
        box(label+' / column',(x,y,1.7),(.4,.28,2.6),mats['steel'])
        box(label+' / light',(x-.23,y,1.7),(.035,.13,2.35),mats['light'],.02)
    box(label+' / header',(x,0,3.0),(.4,width+.28,.32),mats['steel'])
    bar=box(label+' / constant review pulse',(x,0,2.78),(.08,width-.2,.06),mats['light'],.02)
    for f in range(1,bpy.context.scene.frame_end+46,45):
        key(bar,f,scale=(1,1,1));key(bar,f+6,scale=(1,.23,1));key(bar,f+14,scale=(1,1,1))
    return bar

def save(s,name,still_frame):
    # Even spacing in production; ease only the cinematic camera movement.
    for o in s.objects:
        if not o.name.startswith(('Output ','Queued output ','Inspected output ','Continuing output ','Judgement returned ')):
            continue
        if not o.animation_data or not o.animation_data.action:
            continue
        for layer in o.animation_data.action.layers:
            for strip in layer.strips:
                for bag in strip.channelbags:
                    for fc in bag.fcurves:
                        for point in fc.keyframe_points:
                            point.interpolation='CONSTANT' if fc.data_path=='scale' else 'LINEAR'
    s.frame_set(still_frame)
    s.render.filepath=str(ROOT/'renders'/name/'frame_')
    (ROOT/'renders'/name).mkdir(exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'scenes'/f'{name}.blend'))
    return str(ROOT/'scenes'/f'{name}.blend')

def before():
    s,cam,m,mesh=setup('07_before',11)
    gate(3.2,m)
    for i in range(12):
        o=ball(f'Output {i:03d}',mesh);start=1+i*45
        key(o,1,loc=(-10,0,.98),scale=(0,0,0));key(o,start,loc=(-9,0,.98),scale=(1,1,1))
        key(o,start+75,loc=(3.2,0,.98));key(o,start+105,loc=(7,0,.98))
        key(o,start+106,scale=(0,0,0))
    camera_key(cam,1,(6,-14,7),(-2,0,.9),43)
    camera_key(cam,165,(9,-15,8),(-1,0,.9),45)
    camera_key(cam,330,(12,-16,10),(0,0,.8),47)
    return save(s,'07_before',165)

def backlog():
    s,cam,m,mesh=setup('08_backlog',16)
    gate(3.2,m)
    box('QUEUE platform',(.4,0,.67),(5.0,3.2,.15),m['black'])
    slots=[]
    for layer in range(5):
        for xi in range(8-layer):
            for yi in range(6-layer):
                slots.append((2.6-xi*.49-layer*.245,-1.25+yi*.49+layer*.245,1.0+layer*.40))
    for i in range(112):
        o=ball(f'Queued output {i:03d}',mesh);start=1+i*3
        pos=slots[i]
        key(o,1,loc=(-10,0,.98),scale=(0,0,0));key(o,start,loc=(-9,0,.98),scale=(1,1,1))
        key(o,start+38,loc=(-3,0,1.03))
        key(o,start+52,loc=(pos[0]-.7,pos[1],pos[2]+.8))
        key(o,start+62,loc=pos)
        # A steady trickle is processed while most of the arriving work waits.
        if i%15==0:
            leave=start+90
            key(o,leave,loc=pos);key(o,leave+18,loc=(3.2,0,1.05));key(o,leave+48,loc=(7,0,1.05));key(o,leave+49,scale=(0,0,0))
    camera_key(cam,1,(-3,-10,4),(-2,0,1),43)
    camera_key(cam,200,(7,-12,7),(0,0,1.1),45)
    camera_key(cam,390,(11,-15,10),(0,0,1.2),48)
    # Final 3 seconds: fixed camera location, lens-only zoom out.
    camera_key(cam,480,(11,-15,10),(0,0,1.2),35)
    return save(s,'08_backlog',440)

def quality():
    s,cam,m,mesh=setup('13_quality_gates',16)
    for j,x in enumerate((-4,0,3.2)):
        gate(x,m,f'CHECK {j+1}')
    # Upstream specification fixture, distinct from downstream tests.
    box('SPECIFICATION board',(-8,2.4,2.3),(1.6,.12,2.8),m['steel'])
    for j in range(5):box('SPEC / constraint',(-8,2.30,1.5+j*.38),(1.15,.04,.07),m['light'],.01)
    for i in range(40):
        o=ball(f'Inspected output {i:03d}',mesh);start=1+i*10
        key(o,1,loc=(-10,0,.98),scale=(0,0,0));key(o,start,loc=(-9,0,.98),scale=(1,1,1))
        key(o,start+45,loc=(-4,0,.98));key(o,start+75,loc=(0,0,.98))
        if i%6==0:
            o.data=mesh.copy();o.data.materials.clear();o.data.materials.append(m['amber'])
            key(o,start+90,loc=(0,-2.6,1.4));key(o,start+112,loc=(-4,-3.4,1.05))
            key(o,start+140,loc=(-8,-2,1.05));key(o,start+160,scale=(0,0,0))
        else:
            key(o,start+105,loc=(3.2,0,.98));key(o,start+135,loc=(7,0,.98));key(o,start+136,scale=(0,0,0))
    box('REVISION return path',(-4,-3.4,.6),(8,.6,.12),m['steel'])
    camera_key(cam,1,(7,-13,7),(1,0,1),45)
    camera_key(cam,190,(-11,-10,7),(-6,0,1.3),47)
    camera_key(cam,340,(-8,-17,11),(-2,0,1),44)
    camera_key(cam,480,(10,-18,12),(-1,0,1),42)
    return save(s,'13_quality_gates',340)

def feedback():
    s,cam,m,mesh=setup('15_feedback_loop',12)
    gate(3.2,m)
    # Visible feedback path forms an open loop back to the specification stage.
    curve=bpy.data.curves.new('Feedback route','CURVE');curve.dimensions='3D';curve.bevel_depth=.04;curve.bevel_resolution=3
    pts=[(3,-1,1),(4,-3,1.2),(1,-5,1.5),(-4,-5,1.5),(-8,-3,1.2),(-8,0,1)]
    spline=curve.splines.new('BEZIER');spline.bezier_points.add(len(pts)-1)
    for p,co in zip(spline.bezier_points,pts):p.co=co;p.handle_left_type='AUTO';p.handle_right_type='AUTO'
    path=bpy.data.objects.new('FEEDBACK path',curve);bpy.context.collection.objects.link(path);curve.materials.append(m['amber'])
    for i in range(26):
        o=ball(f'Continuing output {i:03d}',mesh);start=i*12+1
        key(o,1,loc=(-10,0,.98),scale=(0,0,0));key(o,start,loc=(-9,0,.98),scale=(1,1,1))
        key(o,start+95,loc=(3.2,0,.98));key(o,start+120,loc=(7,0,.98));key(o,start+121,scale=(0,0,0))
    for i in range(4):
        o=ball(f'Judgement returned {i:03d}',mesh);o.data=mesh.copy();o.data.materials.clear();o.data.materials.append(m['amber'])
        start=20+i*65
        key(o,1,loc=pts[0],scale=(0,0,0));key(o,start,loc=pts[0],scale=(1,1,1))
        for j,p in enumerate(pts):key(o,start+j*15,loc=p)
        key(o,start+90,scale=(0,0,0))
    for j in range(5):
        o=box('SPEC refinement',(-8,2.1,1+j*.38),(1.4,.10,.13),m['light'])
        key(o,1,scale=(.2,1,1));key(o,75+j*35,scale=(.2,1,1));key(o,105+j*35,scale=(1,1,1))
    camera_key(cam,1,(7,-12,6),(2,-.5,1),44)
    camera_key(cam,160,(-1,-15,11),(-2,-1,1),42)
    camera_key(cam,360,(12,-19,15),(-2,-1,1),39)
    return save(s,'15_feedback_loop',280)

files=[before(),backlog(),quality(),feedback()]
print('SCENES_SAVED',files)
