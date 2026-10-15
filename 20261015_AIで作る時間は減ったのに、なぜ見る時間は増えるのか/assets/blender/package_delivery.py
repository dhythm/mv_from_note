from pathlib import Path
import json, subprocess, zipfile
ROOT=Path(__file__).resolve().parent
manifest=json.loads((ROOT/'manifest.json').read_text())
assert len(manifest)==4, 'All four clips must be complete before packaging'
for item in manifest:
    path=ROOT/item['file']
    subprocess.run(['ffmpeg','-v','error','-xerror','-i',str(path),'-f','null','-'],check=True)
    # Keep only stills used by the plan or video preview.
    stills = [('poster', item['seconds'] * .8)]
    if path.stem in ('08_backlog', '15_feedback_loop'):
        stills.append(('end', item['seconds'] - 1/30))
    for tag, t in stills:
        output=ROOT/'stills'/f'{path.stem}-{tag}.webp'
        subprocess.run(['ffmpeg','-v','error','-y','-ss',str(t),'-i',str(path),'-frames:v','1','-vf','scale=1280:-1','-quality','90',str(output)],check=True)
        assert output.exists()
    item['strict_decode_check']='pass'
(ROOT/'manifest.json').write_text(json.dumps(sorted(manifest,key=lambda x:x['file']),ensure_ascii=False,indent=2))
out=ROOT.parent/'blender-materials.zip'
with zipfile.ZipFile(out,'w') as archive:
    for p in sorted(ROOT.rglob('*')):
        rel=p.relative_to(ROOT)
        if not p.is_file() or any(part in ('renders','__pycache__') for part in rel.parts): continue
        if rel.suffix in ('.blend1','.png','.log'): continue
        if rel.parts[0]=='preview' and rel.suffix not in ('.html',): continue
        archive.write(p,Path('blender')/rel,compress_type=zipfile.ZIP_STORED if p.suffix=='.mp4' else zipfile.ZIP_DEFLATED)
print('PACKAGE_READY',out,out.stat().st_size)
