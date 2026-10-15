import bpy, sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent
args=sys.argv[sys.argv.index('--')+1:]
name=args[0]; mode=args[1] if len(args)>1 else 'still'
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'scenes'/f'{name}.blend'))
s=bpy.context.scene
if hasattr(s,'eevee'):
    s.eevee.taa_render_samples=32
if mode=='still':
    s.render.resolution_percentage=60
    s.render.filepath=str(ROOT/'stills'/f'{name}.png')
    bpy.ops.render.render(write_still=True)
else:
    if mode=='probe':
        s.render.resolution_percentage=50
        s.frame_start=300;s.frame_end=480
    elif mode=='motion':
        s.render.resolution_percentage=50
        s.frame_start=90;s.frame_end=149
    else:
        s.render.resolution_percentage=100
    folder=ROOT/('preview' if mode in ('probe','motion') else 'renders')/(name+'-motion' if mode=='motion' else name)
    folder.mkdir(exist_ok=True)
    if mode=='full':
        completed=sorted(folder.glob('frame_*.png'))
        if completed:
            s.frame_start=int(completed[-1].stem.split('_')[-1])+1
    s.render.filepath=str(folder/'frame_')
    if s.frame_start<=s.frame_end:
        bpy.ops.render.render(animation=True)
