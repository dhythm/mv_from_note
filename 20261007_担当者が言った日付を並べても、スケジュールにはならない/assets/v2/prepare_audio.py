"""元音源を保持して205秒の仮編集を再生成する。試聴・拍合わせは別途必要。"""
from pathlib import Path
import subprocess
p=Path(__file__).resolve().parent
subprocess.run(['ffmpeg','-y','-v','error','-i',str(p.parent/'bgm.mp3'),'-filter_complex',
 '[0:a]asplit=2[a][b];[a]atrim=start=0:end=174,asetpts=PTS-STARTPTS[first];[b]atrim=start=143:end=175,asetpts=PTS-STARTPTS[repeat];[first][repeat]acrossfade=d=1:c1=tri:c2=tri,afade=t=out:st=202:d=3[out]',
 '-map','[out]','-c:a','libmp3lame','-b:a','128k',str(p/'bgm-205s-draft.mp3')],check=True)
