"""Original 26-second real-UI demo. Keep rendered media outside the Git repository."""
from pathlib import Path
import os,json,subprocess,hashlib
import numpy as np
import soundfile as sf
import onnxruntime as ort
from kokoro_onnx import Kokoro
from PIL import Image,ImageDraw,ImageFont
OUT=Path(os.environ.get('ECO_MEDIA_OUT','/tmp/eco-laundry-03'));META=json.loads((OUT/'capture.json').read_text());TOTAL=26
SCENES=[(0,4,'LOW WATTS. HIGHER BILL?','Low watts can still mean a higher drying bill.'),(4,10,'250 W × 8 h = 2 kWh','Two hundred fifty watts for eight hours uses two kilowatt hours. This dryer uses one point five.'),(10,17,'4 HOURS CHANGES THE RESULT','Cut the runtime to four hours, and the comparison flips.'),(17,21,'SAME LOAD. SAME DRYNESS.','Compare the same amount of equally dry laundry.'),(21,26,'TRY YOUR OWN NUMBERS','Try your own numbers at the address on screen.')]
opts=ort.SessionOptions();opts.intra_op_num_threads=4;opts.inter_op_num_threads=1;models=Path(os.environ.get('ECO_VOICE_MODELS','/tmp/growth-models'));k=Kokoro.from_session(ort.InferenceSession(str(models/'kokoro.onnx'),sess_options=opts,providers=['CPUExecutionProvider']),str(models/'voices.bin'));sr=24000;narration=np.zeros(TOTAL*sr,dtype=np.float32)
for i,(a,b,title,spoken) in enumerate(SCENES):
 raw=OUT/f'voice-{i}.wav'
 if not raw.exists():samples,rate=k.create(spoken,voice='af_heart',speed=1.06,lang='en-us');sf.write(raw,samples,rate)
 samples,rate=sf.read(raw);factor=max(1,len(samples)/rate/(b-a-.25));assert factor<1.35,(i,factor);fitted=OUT/f'voice-fit-{i}.wav';subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-af',f'atempo={factor:.6f}','-ar',str(sr),str(fitted)],check=True);samples,_=sf.read(fitted);start=int((a+.08)*sr);narration[start:start+len(samples)]=samples
# Original synthesized 112 BPM plucked pattern, no third-party recording.
music=np.zeros(TOTAL*sr);beat=60/112
for i,t0 in enumerate(np.arange(0,TOTAL,beat/2)):
 n=min(int(.7*sr),len(music)-int(t0*sr));t=np.arange(n)/sr;freq=[261.63,329.63,392,523.25,293.66,349.23,440,587.33][i%8];music[int(t0*sr):int(t0*sr)+n]+=.025*(np.sin(2*np.pi*freq*t)+.2*np.sin(4*np.pi*freq*t))*np.exp(-8*t)
for t0 in np.arange(0,TOTAL,beat):
 n=min(int(.15*sr),len(music)-int(t0*sr));t=np.arange(n)/sr;music[int(t0*sr):int(t0*sr)+n]+=.018*np.sin(2*np.pi*(75*t-80*t*t))*np.exp(-24*t)
fade=np.minimum(1,np.minimum(np.arange(len(music))/sr/.25,(len(music)-np.arange(len(music)))/sr/.5));sf.write(OUT/'mix.wav',np.clip((narration*.88+music)*fade,-.97,.97),sr)
bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';regular='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def wrap(d,text,x,y,size,width,font=regular,fill='#183d4a'):
 f=ImageFont.truetype(font,size);line=''
 for word in text.split():
  trial=(line+' '+word).strip()
  if f.getlength(trial)>width and line:d.text((x,y),line,font=f,fill=fill);y+=size+8;line=word
  else:line=trial
 d.text((x,y),line,font=f,fill=fill);return y+size+8
for channel in ['youtube','tiktok']:
 filters=[f'[0:v]trim=start={META["offset"]}:duration={TOTAL},setpts=PTS-STARTPTS,scale=648:864,fps=25[ui]',f'color=c=0xf3f8fb:s=720x1280:r=25:d={TOTAL}[bg]','[bg][ui]overlay=24:218[base]'];inputs=['-i',META['path']]
 for i,(a,b,title,spoken) in enumerate(SCENES):
  im=Image.new('RGBA',(720,1280),(0,0,0,0));d=ImageDraw.Draw(im);d.rectangle((0,0,720,9),fill='#087ca7');wrap(d,'ECOBACK / LAUNDRY COST CHECK',28,37,20,620,font=bold,fill='#075f88');wrap(d,title,27,84,41,620,font=bold);wrap(d,'Real tool · Fictional example · Equal dryness assumed',28,188,18,640,fill='#486572');d.rectangle((23,217,673,1083),outline='#b7d1df',width=2)
  caption=['250 W can use more energy over a longer run.','8 hours: €0.70 vs €0.53 per load','4 hours: €0.35 vs €0.53 per load','Different dryness? No fair winner.','Type getecoback.com/dry-'+channel][i]
  wrap(d,caption,28,1103,27,625,font=bold);wrap(d,'AI narration · Original music · Direct electricity only',28,1222,17,630,fill='#486572');p=OUT/f'overlay-{channel}-{i}.png';im.save(p);inputs+=['-loop','1','-i',str(p)];previous='base' if i==0 else 'v'+str(i-1);filters.append(f'[{previous}][{i+1}:v]overlay=0:0:enable=\'gte(t,{a})*lt(t,{b})\'[v{i}]')
 inputs+=['-i',str(OUT/'mix.wav')];video=OUT/f'eco-laundry-{channel}.mp4';subprocess.run(['ffmpeg','-v','error','-y',*inputs,'-filter_complex',';'.join(filters),'-map','[v4]','-map','6:a','-t',str(TOTAL),'-c:v','libx264','-preset','veryfast','-profile:v','baseline','-pix_fmt','yuv420p','-crf','22','-threads','4','-c:a','aac','-b:a','128k','-ar','48000','-af','loudnorm=I=-16:TP=-1.5:LRA=7','-movflags','+faststart',str(video)],check=True)
def stamp(sec):return f'00:00:{sec:02d},000'
(OUT/'eco-laundry.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(a)} --> {stamp(b)}\n{s}' for i,(a,b,_,s) in enumerate(SCENES)))
(OUT/'manifest.json').write_text(json.dumps({'seconds':TOTAL,'dimensions':'720x1280','source':META['source'],'music':'Original synthesized 112 BPM score','voice':'Kokoro af_heart synthetic English','outputs':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in OUT.glob('eco-laundry-*.mp4')},'captions':SCENES},indent=2));print('Rendered two platform CTA variants',flush=True)
