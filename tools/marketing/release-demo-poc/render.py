"""Fixed demo template: real UI recording, Kokoro voice, original score, captions.
No AI video generation, remote model call, stock recording or synthetic product UI.
Reuses the existing BPJ voice/FFmpeg approach; this module is a narrow POC.
"""
from pathlib import Path
import argparse, functools, hashlib, json, math, os, subprocess
import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFont
import onnxruntime as ort
from kokoro_onnx import Kokoro

FPS=24
BG='#0B1626'; INK='#F3F6FB'; MUTED='#A6B7CC'; BLUE='#6B9CFF'; GREEN='#86DFC3'
def run(cmd): subprocess.run(cmd,check=True)
def sha(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def stamp(s):
 n=round(s*1000); return f'{n//3600000:02d}:{n//60000%60:02d}:{n//1000%60:02d},{n%1000:03d}'
@functools.lru_cache(maxsize=100)
def font(size,bold=False): return ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans'+('-Bold' if bold else '')+'.ttf',size)
def lines(s,f,w):
 result=[]; line=''
 for word in s.split():
  candidate=(line+' '+word).strip()
  if line and f.getlength(candidate)>w: result.append(line);line=word
  else:line=candidate
 if line:result.append(line)
 return result

def put(d,xy,s,size,width,color=INK,bold=False,gap=8):
 x,y=xy;f=font(size,bold)
 for line in lines(s,f,width):d.text((x,y),line,font=f,fill=color);y+=size+gap
 return y

def audio(cfg,out):
 modeldir=Path(os.environ['KOKORO_MODEL_DIR']);opts=ort.SessionOptions();opts.intra_op_num_threads=2;opts.inter_op_num_threads=1
 model=Kokoro.from_session(ort.InferenceSession(str(modeldir/'kokoro-v1.0.onnx'),sess_options=opts,providers=['CPUExecutionProvider']),str(modeldir/'voices-v1.0.bin'))
 sr=24000;total=cfg['duration_seconds'];voice=np.zeros(total*sr,dtype=np.float32);timings=[]
 for i,s in enumerate(cfg['scenes']):
  samples,rate=model.create(s['narration'],voice=cfg['voice'],speed=1.02,lang='en-us');assert rate==sr and len(samples)>0 and np.isfinite(samples).all()
  raw=out/f'voice-{i}.wav';sf.write(raw,samples,rate);factor=max(1,len(samples)/sr/(s['duration']-.65));assert factor<=1.25,('speech too long',i,factor)
  fitted=out/f'fitted-{i}.wav';run(['ffmpeg','-v','error','-y','-i',str(raw),'-af',f'atempo={factor:.6f}',str(fitted)])
  a,rate=sf.read(fitted,dtype='float32');start=s['at']+.18;end=start+len(a)/sr;assert end<s['at']+s['duration']-.2
  voice[round(start*sr):round(start*sr)+len(a)]=a
  timings.append({'scene':i,'start':start,'end':end,'text':s['narration'],'raw_seconds':len(samples)/sr,'atempo':factor})
 sf.write(out/'narration.wav',voice,sr)
 # Original 104 BPM synthesis, no sampled or third-party music/recording.
 rng=np.random.default_rng(20261007);music=np.zeros((total*sr,2),np.float32);beat=60/104
 def note(at,dur,freq,amp,pan=0):
  a=round(at*sr);n=min(round(dur*sr),len(music)-a)
  if n<=0:return
  t=np.arange(n)/sr;env=np.minimum(t/.018,1)*np.exp(-t/(dur*.28));v=(np.sin(2*np.pi*freq*t)+.16*np.sin(2*np.pi*freq*2*t))*env*amp
  music[a:a+n,0]+=v*(1-pan*.3);music[a:a+n,1]+=v*(1+pan*.3)
 chords=[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,67]]
 for b in range(math.ceil(total/beat)):
  c=chords[(b//8)%4];at=b*beat
  if b%2==0:note(at,.65,440*2**((c[0]-24-69)/12),.04)
  note(at,.62,440*2**((c[b%4]+12-69)/12),.014,(-1)**b*.65)
 fade=np.minimum(1,np.arange(len(music))/sr/.4)*np.minimum(1,(len(music)-np.arange(len(music)))/sr/.8);music*=fade[:,None];sf.write(out/'original-music.wav',music,sr)
 run(['ffmpeg','-v','error','-y','-i',str(out/'original-music.wav'),'-i',str(out/'narration.wav'),'-filter_complex','[1:a]asplit=2[v][sc];[0:a][sc]sidechaincompress=threshold=0.01:ratio=8:attack=20:release=300[m];[m][v]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=7[a]','-map','[a]','-ar','48000',str(out/'mix.wav')])
 (out/'captions.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(t["start"])} --> {stamp(t["end"])}\n{t["text"]}' for i,t in enumerate(timings))+'\n')
 (out/'narration-timing.json').write_text(json.dumps(timings,indent=2));return timings

def render(cfg,cap,out,timings):
 records=[]
 for fmt,wh in [('landscape',(1280,720)),('portrait',(720,1280))]:
  wide=fmt=='landscape';w,h=wh;box=(456,112,784,498) if wide else (36,294,648,789);x,y,bw,bh=box
  meta=json.loads((cap/fmt/'capture.json').read_text());inputs=['-ss',str(meta['offset']),'-i',str(cap/fmt/'capture.webm')];filters=[f'[0:v]trim=duration=28,setpts=PTS-STARTPTS,fps={FPS},scale={bw}:{bh},pad={w}:{h}:{x}:{y}:color={BG}[base]'];previous='base'
  for i,s in enumerate(cfg['scenes']):
   im=Image.new('RGBA',wh,BG);d=ImageDraw.Draw(im);d.rectangle((x,y,x+bw-1,y+bh-1),fill=(0,0,0,0));d.rounded_rectangle((x-2,y-2,x+bw+2,y+bh+2),12,outline='#263F60',width=2)
   put(d,(36,28),'BPJ / PROPOSALDECK',16,w-72,BLUE,True);put(d,(w-125,30),f'{i+1:02d} / 05',13,100,MUTED)
   put(d,(36,110 if wide else 82),s['label'],14,w-72,GREEN,True)
   end=put(d,(34,153 if wide else 122),s['heading'],43 if wide else 46,365 if wide else 650,INK,True,10)
   if wide:put(d,(36,end+28),'Native PPTX export\nFictional demonstration',19,360,MUTED)
   put(d,(36,669 if wide else 1216),'Real local UI · Synthetic English voice · Original music',12 if wide else 11,w-72,MUTED)
   put(d,(36,694 if wide else 1240),'Creation + export: free  /  Cloud save: separate membership',11,w-72,MUTED)
   # Long final frame is the actual exported artifact rendered by LibreOffice.
   if i==4:
    slide=Image.open(cap/fmt/'render/slide-1.png').convert('RGB');slide.thumbnail((bw,bh),Image.Resampling.LANCZOS);d.rectangle((x,y,x+bw,y+bh),fill='#E9EFF7');im.paste(slide,(x+(bw-slide.width)//2,y+(bh-slide.height)//2));put(d,(x+14,y+14),'EXPORTED FILE · OPENED IN LIBREOFFICE',12,bw-28,'#173456',True)
   p=out/f'overlay-{fmt}-{i}.png';im.save(p);inputs+=['-loop','1','-framerate','24','-threads','1','-i',str(p)];filters.append(f'[{previous}][{i+1}:v]overlay=0:0:enable=\'gte(t,{s["at"]})*lt(t,{s["at"]+s["duration"]})\'[scene{i}]');previous=f'scene{i}'
  # Caption overlays are synchronized to generated speech, never a whole paragraph for a whole scene.
  for i,t in enumerate(timings):
   im=Image.new('RGBA',wh,(0,0,0,0));d=ImageDraw.Draw(im);cx,cy,cw=(40,615,1200) if wide else (36,1101,648);size=24 if wide else 26;ls=lines(t['text'],font(size,True),cw-28);assert len(ls)<=2,(fmt,t['text']);height=len(ls)*(size+8)+20;d.rounded_rectangle((cx,cy,cx+cw,cy+height),10,fill='#142942');
   for j,line in enumerate(ls):d.text((cx+(cw-font(size,True).getlength(line))/2,cy+8+j*(size+8)),line,font=font(size,True),fill=INK)
   p=out/f'caption-{fmt}-{i}.png';im.save(p);inputs+=['-loop','1','-framerate','24','-threads','1','-i',str(p)];idx=6+i;filters.append(f'[{previous}][{idx}:v]overlay=0:0:enable=\'between(t,{t["start"]:.4f},{t["end"]:.4f})\'[caption{i}]');previous=f'caption{i}'
  inputs+=['-i',str(out/'mix.wav')];video=out/f'proposal-demo-{fmt}.mp4'
  cmd=['ffmpeg','-v','error','-y',*inputs,'-filter_complex',';'.join(filters),'-map',f'[{previous}]','-map','11:a','-t','28','-c:v','libx264','-preset','veryfast','-profile:v','baseline','-pix_fmt','yuv420p','-crf','23','-threads','2','-filter_complex_threads','1','-c:a','aac','-b:a','128k','-movflags','+faststart',str(video)];run(cmd)
  probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(video)]));vs=[s for s in probe['streams'] if s['codec_type']=='video'];a=[s for s in probe['streams'] if s['codec_type']=='audio'];assert len(vs)==len(a)==1 and (vs[0]['width'],vs[0]['height'])==wh and abs(float(probe['format']['duration'])-28)<.12
  run(['ffmpeg','-v','error','-i',str(video),'-f','null','-']);probe['format']['filename']=video.name;(out/f'{fmt}-ffprobe.json').write_text(json.dumps(probe,indent=2))
  for sec in [1,7,12,18,24]:run(['ffmpeg','-v','error','-y','-ss',str(sec),'-i',str(video),'-frames:v','1',str(out/f'{fmt}-{sec:02d}.jpg')])
  records.append({'file':video.name,'sha256':sha(video),'bytes':video.stat().st_size,'width':w,'height':h,'duration':float(probe['format']['duration']),'full_decode':'passed','audio':a[0]['codec_name'],'config_captions':[t['text'] for t in timings]})
 return records

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('config');p.add_argument('capture');p.add_argument('output');p.add_argument('--stage',choices=['audio','render','all'],default='all');args=p.parse_args();out=Path(args.output);out.mkdir(parents=True,exist_ok=True);cfg=json.loads(Path(args.config).read_text())
 if args.stage in ['audio','all']:audio(cfg,out)
 if args.stage in ['render','all']:
  timings=json.loads((out/'narration-timing.json').read_text());records=render(cfg,Path(args.capture),out,timings);(out/'media.json').write_text(json.dumps(records,indent=2));print('Two videos rendered and fully decoded.')
