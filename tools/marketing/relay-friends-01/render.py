"""Animated marketing cut: original vector animation + real UI, original music + EN voice.
Run capture.mjs first, then this script in the documented local voice environment.
No stock music, copyrighted recordings, generated customer claims or model calls.
"""
import json,hashlib,subprocess,math,functools
import numpy as np
import soundfile as sf
from PIL import Image,ImageDraw
import media_base as r
r.font=functools.lru_cache(maxsize=80)(r.font)
FPS=25

def music():
 sr=44100;n=r.TOTAL*sr;stereo=np.zeros((n,2),dtype=np.float32);rng=np.random.default_rng(47);beat=60/112
 def add(at,dur,freq,amp,kind='bell',pan=0):
  a=int(at*sr);n1=min(int(dur*sr),n-a)
  if n1<=0:return
  t=np.arange(n1)/sr;fade=np.minimum(1,t/.009)*np.exp(-t/(dur*.30))
  if kind=='kick':wave=np.sin(2*np.pi*(45*t+5*(1-np.exp(-t*30))))*np.exp(-t*18)
  elif kind=='hat':wave=rng.normal(0,1,n1)*np.exp(-t*90)
  else:wave=(np.sin(2*np.pi*freq*t)+.2*np.sin(2*np.pi*freq*2*t))*fade
  wave=wave*amp;stereo[a:a+n1,0]+=wave*(1-pan*.35);stereo[a:a+n1,1]+=wave*(1+pan*.35)
 chords=[[60,64,67,71],[57,60,64,67],[53,57,60,64],[55,59,62,67]];arp=[0,2,1,3,2,0,3,1]
 for b in range(int(r.TOTAL/beat)+1):
  chord=chords[(b//8)%4];at=b*beat
  if b%2==0:add(at,.32,0,.13,'kick')
  add(at+.5*beat,.09,0,.018,'hat')
  if b%4==0:add(at,1.5,440*2**((chord[0]-24-69)/12),.055,'bass')
  for half in range(2):
   note=chord[arp[(2*b+half)%8]]+12;add(at+half*beat/2,.5,440*2**((note-69)/12),.028,'bell',(-1 if half else 1)*.7)
 for at in [0,6,13,20,28]:add(at+.08,.16,1046.5,.055);add(at+.18,.2,1568,.035)
 fade=np.minimum(1,np.arange(n)/sr/.35)*np.minimum(1,(n-np.arange(n))/sr/.7);stereo*=fade[:,None];sf.write(r.WORK/'original-music.wav',stereo,sr)
 # Sidechain ducking leaves speech clear. The music master is separately available for the Chinese cut.
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(r.WORK/'original-music.wav'),'-i',str(r.WORK/'narration.m4a'),'-filter_complex','[1:a]asplit=2[v][sc];[0:a][sc]sidechaincompress=threshold=0.012:ratio=8:attack=20:release=300[m];[m][v]amix=inputs=2:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=7[a]','-map','[a]','-ar','48000','-c:a','aac','-b:a','112k',str(r.WORK/'mix-en.m4a')],check=True)
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(r.WORK/'original-music.wav'),'-af','loudnorm=I=-20:TP=-1.5:LRA=7','-ar','48000','-c:a','aac','-b:a','112k',str(r.WORK/'mix-zh.m4a')],check=True)

def hook(lang,t):
 im=Image.new('RGB',(620,610),'#F7F7F8');d=ImageDraw.Draw(im);bob=math.sin(t*3)*7
 # A simple original robot barista and steaming cup, not a rendered product capability.
 d.rounded_rectangle((225,32+bob,390,147+bob),22,fill=r.BLUE);d.line((308,32+bob,308,12+bob),fill=r.BLUE,width=5);d.ellipse((299,4+bob,315,20+bob),fill=r.BLUE)
 eye=2 if int(t*10)%42==0 else 13
 for x in [265,342]:d.ellipse((x-7,80+bob-eye/2,x+7,80+bob+eye/2),fill='white')
 d.arc((282,97+bob,337,124+bob),0,180,fill='white',width=4)
 d.rounded_rectangle((254,190,375,285),12,fill='white',outline=r.INK,width=4);d.arc((357,207,410,267),270,90,fill=r.INK,width=5);d.ellipse((254,179,375,207),fill='#D9E4FF',outline=r.INK,width=3)
 for j in range(3):
  points=[(276+j*29+math.sin(y/13+t*3+j)*6,171-y) for y in range(0,45,3)];d.line(points,fill='#8B9FD4',width=3)
 r.text(d,32,310,'你会怎么选？' if lang=='zh' else 'What would you choose?',28,550,lang,bold=True)
 opts=['A  先问喜欢什么口味','B  让机器人自由发挥'] if lang=='zh' else ['A  Ask their favourite flavour','B  Let the robot improvise']
 for j,txt in enumerate(opts):
  q=max(0,min(1,(t-.12-j*.25)/.5));off=int((1-q)**3*(150 if j==0 else -150));y=365+j*96;selected=t>3.7 and j==0
  d.rounded_rectangle((25+off,y,575+off,y+78),14,fill=r.BLUE if selected else 'white',outline=r.BLUE,width=3)
  r.text(d,44+off,y+20,txt,24,515,lang,'white' if selected else r.INK,True)
 if 3.5<t<4.6:
  rad=int(10+(t-3.5)*38);d.ellipse((544-rad,401-rad,544+rad,401+rad),outline='#7495EA',width=4)
 return im

def render():
 r.voice();print('Narration ready',flush=True);music();print('Original score and ducked mix ready',flush=True)
 manifest=[]
 for lang,fmt in [('en','vertical'),('en','wide'),('zh','vertical')]:
  bases=[Image.open(r.frame(lang,fmt,i)).convert('RGB') for i in range(5)];w,h=bases[0].size;target=r.OUT/f'relay-{lang}-{fmt}.mp4';wide=fmt=='wide';box=(655,70,590,495) if wide else (45,285,630,645)
  cmd=['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{w}x{h}','-r',str(FPS),'-i','pipe:0','-i',str(r.WORK/f'mix-{lang}.m4a'),'-c:v','libx264','-profile:v','baseline','-pix_fmt','yuv420p','-preset','veryfast','-crf','25','-threads','4','-c:a','copy','-t',str(r.TOTAL),'-movflags','+faststart',str(target)]
  proc=subprocess.Popen(cmd,stdin=subprocess.PIPE);scene=0;start=0;thumbs=[]
  for f in range(r.TOTAL*FPS):
   sec=f/FPS
   while sec>=start+r.DURS[scene]:start+=r.DURS[scene];scene+=1
   t=sec-start;im=bases[scene].copy()
   if scene==0:
    art=hook(lang,t);art.thumbnail((box[2],box[3]),Image.Resampling.LANCZOS);ImageDraw.Draw(im).rectangle((box[0],box[1],box[0]+box[2],box[1]+box[3]),fill='white');im.paste(art,(box[0]+(box[2]-art.width)//2,box[1]+(box[3]-art.height)//2))
   elif scene<4:
    # Pan gently across the actual screenshot without moving subtitles or claiming a live AI run.
    region=bases[scene].crop((box[0],box[1],box[0]+box[2],box[1]+box[3]));scale=1+.028*min(t/3,1);region=region.resize((round(region.width*scale),round(region.height*scale)),Image.Resampling.BILINEAR);dx=(region.width-box[2])//2;dy=(region.height-box[3])//2;im.paste(region.crop((dx,dy,dx+box[2],dy+box[3])),(box[0],box[1]))
   else:
    d=ImageDraw.Draw(im);y=660 if not wide else 510
    # Animated relay nodes illustrate create → play → remix, not popularity or traffic.
    if not wide:
     d.rectangle((40,655,650,722),fill='white')
     for j in range(3):
      x=90+j*230;active=int(t*1.3)%3==j;d.ellipse((x-16,670,x+16,702),fill=r.BLUE if active else '#D8E3FF')
      if j<2:d.line((x+28,686,x+202,686),fill='#8CA7EC',width=4)
   d=ImageDraw.Draw(im);d.rectangle((0,0,int(w*(sec+.04)/r.TOTAL),10),fill=r.BLUE)
   # Short directional transitions answer the edit; no full-frame flashes.
   if scene>0 and t<.24:
    q=1-(1-t/.24)**3;canvas=Image.new('RGB',(w,h),'white');canvas.paste(im,(int((1-q)*65),0));im=canvas
   if f in [25,175,350,525,775]:thumbs.append(im.copy())
   if f==25 and fmt=='vertical':im.save(r.OUT/f'relay-{lang}-poster.jpg',quality=87)
   proc.stdin.write(im.tobytes())
  proc.stdin.close();assert proc.wait()==0
  subprocess.run(['ffmpeg','-v','error','-i',str(target),'-f','null','-'],check=True)
  sheet=Image.new('RGB',(900,320 if wide else 640),'white')
  for i,a in enumerate(thumbs):a.thumbnail((180,sheet.height));sheet.paste(a,(180*i,0))
  sheet.save(r.WORK/f'{lang}-{fmt}-contact.jpg',quality=92)
  manifest.append({'file':target.name,'bytes':target.stat().st_size,'duration_seconds':r.TOTAL,'fps':FPS,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'language':lang,'audio':'original score, click sounds'+(', synthetic English narration with ducking' if lang=='en' else ', no narration'),'motion':'animated robot, steam, choice reveals, selection ring, screen pans, transitions, relay dots'})
  print(target.name,target.stat().st_size,flush=True)
 for lang in ['en','zh']:
  def stamp(n):return f'00:{int(n)//60:02d}:{int(n)%60:02d}.000'
  at=0;v=['WEBVTT',''];s=[]
  for i,(line,dur) in enumerate(zip(r.COPY[lang]['captions'],r.DURS)):
   v.extend([f'{stamp(at)} --> {stamp(at+dur)}',line,'']);s.extend([str(i+1),f'{stamp(at)} --> {stamp(at+dur)}'.replace('.',','),line,'']);at+=dur
  (r.OUT/f'relay-{lang}.vtt').write_text('\n'.join(v));(r.OUT/f'relay-{lang}.srt').write_text('\n'.join(s))
 (r.OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
if __name__=='__main__':render()
