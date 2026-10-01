"""Real-interface demo, original synthesized music and synthetic English narration.
MP4s stay outside the repository. Requires the local Kokoro/Pillow/FFmpeg environment.
"""
from pathlib import Path
import os,json,subprocess,hashlib
import numpy as np
import soundfile as sf
import onnxruntime as ort
from kokoro_onnx import Kokoro
from PIL import Image,ImageDraw,ImageFont
OUT=Path(os.environ.get('MENTOR_MEDIA_OUT','/tmp/mentor-report-01'));META=json.loads((OUT/'capture.json').read_text());DURS=[6,6,7,7,8];TOTAL=sum(DURS)
COPY=[('An $800 mistake.','This report is eight hundred dollars too high. Can you spot why?'),('The cancelled row.','A cancelled order is still in the total. Work Mentor flags the mismatch.'),('Fix it. Check it.','Fix that number. Check orders, refunds, channel revenue, growth, and the claim.'),('Now change the data.','Then try new data without hints. Repeating an answer is not the same as learning.'),('Your turn.','Practice free at A G I Scorecard dot com slash mentor. Optional cloud history is paid.')]
MODEL=Path(os.environ.get('MENTOR_VOICE_MODELS','/tmp/growth-models'));opts=ort.SessionOptions();opts.intra_op_num_threads=4;opts.inter_op_num_threads=1
k=Kokoro.from_session(ort.InferenceSession(str(MODEL/'kokoro.onnx'),sess_options=opts,providers=['CPUExecutionProvider']),str(MODEL/'voices.bin'))
sr=24000;narration=np.zeros(TOTAL*sr,dtype=np.float32);at=0;captions=[]
for i,((title,spoken),seconds) in enumerate(zip(COPY,DURS)):
 raw=OUT/f'voice-{i}.wav'
 if not raw.exists():a,rate=k.create(spoken,voice='af_heart',speed=1.06,lang='en-us');sf.write(raw,a,rate)
 a,rate=sf.read(raw);factor=max(1,len(a)/rate/(seconds-.35));assert factor<1.35,(i,factor)
 fitted=OUT/f'voice-fit-{i}.wav';subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-af',f'atempo={factor:.5f}','-ar',str(sr),str(fitted)],check=True);a,_=sf.read(fitted);start=int((at+.1)*sr);narration[start:start+len(a)]=a;captions.append((at,at+seconds,spoken));at+=seconds
# Original 108-BPM mallet/arpeggio score and subdued beat. No third-party recording.
length=TOTAL*sr;music=np.zeros(length);beat=60/108
for i,t0 in enumerate(np.arange(0,TOTAL,beat/2)):
 notes=[261.63,329.63,392,493.88,293.66,369.99,440,554.37];freq=notes[(i//8%2)*4+i%4];n=min(int(.8*sr),length-int(t0*sr));tt=np.arange(n)/sr;tone=(np.sin(2*np.pi*freq*tt)+.25*np.sin(2*np.pi*freq*2*tt))*np.exp(-7*tt)*.032;music[int(t0*sr):int(t0*sr)+n]+=tone
for t0 in np.arange(0,TOTAL,beat):
 n=min(int(.17*sr),length-int(t0*sr));tt=np.arange(n)/sr;music[int(t0*sr):int(t0*sr)+n]+=.024*np.sin(2*np.pi*(72*tt-65*tt**2))*np.exp(-25*tt)
mix=np.clip(narration*.84+music,-.96,.96);sf.write(OUT/'mix.wav',mix,sr)
bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';reg='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def draw_wrap(d,text,x,y,size,width,font=reg,fill='#18191d'):
 f=ImageFont.truetype(font,size);line=''
 for word in text.split():
  v=(line+' '+word).strip()
  if f.getlength(v)>width and line:d.text((x,y),line,font=f,fill=fill);y+=size+9;line=word
  else:line=v
 if line:d.text((x,y),line,font=f,fill=fill)
 return y+size+9
at=0;filters=[f'[0:v]trim=start={META["offset"]}:duration={TOTAL},setpts=PTS-STARTPTS,scale=648:749,fps=25[ui]','color=c=white:s=720x1280:r=25:d=34[bg]','[bg][ui]overlay=36:260[base]']
inputs=['-i',META['path']]
for i,((title,spoken),seconds) in enumerate(zip(COPY,DURS)):
 im=Image.new('RGBA',(720,1280),(0,0,0,0));d=ImageDraw.Draw(im);d.rectangle((0,0,720,10),fill='#002fa7');draw_wrap(d,'WORK MENTOR / '+str(i+1).zfill(2),40,47,21,640,fill='#002fa7',font=bold);draw_wrap(d,title,38,105,49,645,font=bold);draw_wrap(d,'Real interface · Fictional practice data',40,214,20,640,fill='#595d68');d.rectangle((35,259,685,1010),outline='#d8dbe4',width=2);draw_wrap(d,spoken.replace('A G I Scorecard dot com slash mentor','agiscorecard.com/mentor'),40,1040,26,630,font=bold);draw_wrap(d,'AI narration · Original music · Free practice',40,1224,17,640,fill='#595d68');p=OUT/f'overlay-{i}.png';im.save(p);inputs+=['-loop','1','-i',str(p)];previous='base' if i==0 else 'v'+str(i-1);filters.append(f'[{previous}][{i+1}:v]overlay=0:0:enable=\'between(t,{at},{at+seconds})\'[v{i}]');at+=seconds
inputs+=['-i',str(OUT/'mix.wav')];video=OUT/'work-mentor-report-demo.mp4';cmd=['ffmpeg','-v','error','-y',*inputs,'-filter_complex',';'.join(filters),'-map','[v4]','-map','6:a','-t',str(TOTAL),'-c:v','libx264','-preset','veryfast','-profile:v','baseline','-pix_fmt','yuv420p','-crf','22','-threads','4','-c:a','aac','-b:a','128k','-af','loudnorm=I=-16:TP=-1.5:LRA=7','-movflags','+faststart',str(video)];subprocess.run(cmd,check=True)
def stamp(sec):return f'00:{int(sec)//60:02d}:{int(sec)%60:02d},000'
(OUT/'work-mentor-report-demo.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(a)} --> {stamp(b)}\n{s}' for i,(a,b,s) in enumerate(captions)))
(OUT/'manifest.json').write_text(json.dumps({'video':video.name,'seconds':TOTAL,'sha256':hashlib.sha256(video.read_bytes()).hexdigest(),'dimensions':'720x1280','source':META['source'],'music':'Original 108 BPM synthesized score','voice':'Kokoro af_heart synthetic English','captions':captions},indent=2));print(video,flush=True)
