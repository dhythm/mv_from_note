"""Export screen-space anchors so typography can follow the moving camera."""
import bpy, json
from pathlib import Path
from mathutils import Vector
from bpy_extras.object_utils import world_to_camera_view
ROOT=Path(__file__).resolve().parent
(ROOT/'tracks').mkdir(exist_ok=True)
for name in ['07_before','08_backlog','13_quality_gates','15_feedback_loop']:
    bpy.ops.wm.open_mainfile(filepath=str(ROOT/'scenes'/f'{name}.blend'))
    scene=bpy.context.scene
    anchors={o.name:Vector(o.location) for o in scene.objects if o.name.endswith(' / header') or o.name=='SPECIFICATION board'}
    if name=='15_feedback_loop': anchors['SPECIFICATION']=Vector((-8,2.1,2.0))
    rows=[]
    for f in range(scene.frame_start,scene.frame_end+1):
        scene.frame_set(f)
        points={}
        for label,p in anchors.items():
            v=world_to_camera_view(scene,scene.camera,p)
            points[label]={'x':round(v.x,6),'y':round(1-v.y,6),'visible':v.z>0 and 0<=v.x<=1 and 0<=v.y<=1}
        rows.append({'frame':f,'time':round((f-1)/scene.render.fps,6),'anchors':points})
    (ROOT/'tracks'/f'{name}.json').write_text(json.dumps({'coordinate_system':'normalized; x left=0 right=1; y top=0 bottom=1','fps':30,'frames':rows},ensure_ascii=False))
    print('TRACKS_EXPORTED',name,flush=True)
