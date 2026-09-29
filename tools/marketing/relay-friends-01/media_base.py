"""Reproducible Relay demo: actual local UI captures, original layout, synthetic EN voice.
No model inference, publication, customer data or third-party music is involved.
Run capture.mjs first. Requires Pillow, kokoro_onnx, onnxruntime, soundfile and ffmpeg.
"""
import os,json,subprocess,hashlib
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import numpy as np
import soundfile as sf
import onnxruntime as ort
from kokoro_onnx import Kokoro
HERE=Path(__file__).resolve().parent;ROOT=HERE.parents[2];OUT=ROOT/'sites/agiscorecard/create-assets/media';WORK=Path(os.getenv('RELAY_MEDIA_WORK','/tmp/relay-marketing'));OUT.mkdir(exist_ok=True);WORK.mkdir(exist_ok=True)
COPY=json.loads((HERE/'content.json').read_text());DURS=[6,7,7,8,8];TOTAL=sum(DURS)
BLUE='#002FA7';INK='#172641';BG='#FFFFFF';MUTED='#5A6476'
ZH='/root/.local/share/fonts/NotoSansSC-700.ttf';EN='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';REG='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
def font(size,lang,bold=False):return ImageFont.truetype(ZH if lang=='zh' else EN if bold else REG,size)
def lines(s,f,w,lang):
 result=[];line='';tokens=list(s) if lang=='zh' else s.split(' ')
 for token in tokens:
  test=line+(' ' if line and lang=='en' else '')+token
  if line and f.getlength(test)>w:result.append(line);line=token
  else:line=test
 if line:result.append(line)
 return result
def text(d,x,y,s,size,width,lang,color=INK,bold=False):
 f=font(size,lang,bold)
 for line in lines(s,f,width,lang):d.text((x,y),line,font=f,fill=color);y+=size+10
 return y

def voice():
 opts=ort.SessionOptions();opts.intra_op_num_threads=4;opts.inter_op_num_threads=1
 models=Path(os.getenv('KOKORO_MODEL_DIR','/tmp/bpj-voice-models'))
 k=Kokoro.from_session(ort.InferenceSession(str(models/'kokoro-v1.0.int8.onnx'),sess_options=opts,providers=['CPUExecutionProvider']),str(models/'voices-v1.0.bin'))
 sr=24000;audio=np.zeros(TOTAL*sr,dtype=np.float32);start=0
 for i,(spoken,sec) in enumerate(zip(COPY['en']['captions'],DURS)):
  raw=WORK/f'voice-{i}.wav'
  if not raw.exists():a,rate=k.create(spoken,voice='af_heart',speed=1.04,lang='en-us');sf.write(raw,a,rate)
  a,rate=sf.read(raw,dtype='float32');factor=max(1,len(a)/rate/(sec-.3));assert factor<1.35,(i,factor)
  fitted=WORK/f'fitted-{i}.wav';subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-af',f'atempo={factor:.5f}','-ar',str(sr),str(fitted)],check=True)
  a,rate=sf.read(fitted,dtype='float32');at=int((start+.1)*sr);audio[at:at+len(a)]=a;start+=sec
 sf.write(WORK/'narration.wav',audio,sr)
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(WORK/'narration.wav'),'-af','loudnorm=I=-16:TP=-1.5:LRA=7','-ar','44100','-c:a','aac','-b:a','80k',str(WORK/'narration.m4a')],check=True)

def frame(lang,fmt,i):
 wide=fmt=='wide';w,h=(1280,720) if wide else (720,1280);im=Image.new('RGB',(w,h),BG);d=ImageDraw.Draw(im)
 d.rectangle((0,0,w,10),fill=BLUE);text(d,40,35,'接力' if lang=='zh' else 'Relay',30,w-80,lang,BLUE,True)
 title=COPY[lang]['sceneTitles'][i];text(d,40,100,title,42 if wide else 43,550 if wide else 635,lang,bold=True)
 if i<4:
  shot=Image.open(WORK/f'{lang}-{i}.png').convert('RGB');box=(655,70,590,495) if wide else (45,285,630,645)
  shot.thumbnail((box[2],box[3]),Image.Resampling.LANCZOS);im.paste(shot,(box[0]+(box[2]-shot.width)//2,box[1]+(box[3]-shot.height)//2))
  text(d,40,300 if wide else 935,'编辑示例 · 手动试玩与改写' if lang=='zh' else 'Editorial starter • real play and edit',20,550 if wide else 640,lang,MUTED)
 else:
  text(d,40,300 if wide else 340,'你的想法，朋友的下一步。' if lang=='zh' else 'Your idea. Their next move.',32,1100 if wide else 630,lang,bold=True)
  text(d,40,390 if wide else 510,'agiscorecard.com',45,1100 if wide else 640,lang,BLUE,True)
  text(d,40,452 if wide else 575,'/zh/create' if lang=='zh' else '/create',42,1100 if wide else 640,lang,BLUE,True)
  text(d,40,525 if wide else 730,'免费实验版 · AI 有调用额度' if lang=='zh' else 'Free beta • limited AI requests',24,1100 if wide else 640,lang,MUTED)
 caption=COPY[lang]['captions'][i];y=585 if wide else 1005;d.rounded_rectangle((30,y-12,w-30,h-53),14,fill='#F0F3FA');end=text(d,50,y,caption,25 if wide else 27,w-100,lang);assert end<h-53,(lang,fmt,i,end)
 text(d,40,h-37,'中文字幕 · 无配音' if lang=='zh' else 'Synthetic English voice • no customer-result claims',15,w-80,lang,MUTED)
 target=WORK/f'{lang}-{fmt}-{i}.png';im.save(target);return target

def render():
 voice();manifest=[]
 for lang,fmt in [('en','vertical'),('en','wide'),('zh','vertical')]:
  frames=[frame(lang,fmt,i) for i in range(5)];concat=WORK/f'{lang}-{fmt}.txt';seq=[]
  for p,d in zip(frames,DURS):seq.extend([f"file '{p}'",f'duration {d}'])
  seq.append(f"file '{frames[-1]}'");concat.write_text('\n'.join(seq))
  target=OUT/f'relay-{lang}-{fmt}.mp4';cmd=['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(concat)]
  if lang=='en':cmd+=['-i',str(WORK/'narration.m4a')]
  cmd+=['-c:v','libx264','-profile:v','baseline','-pix_fmt','yuv420p','-r','25','-fps_mode','cfr','-preset','veryfast','-crf','25','-threads','4']
  if lang=='en':cmd+=['-c:a','copy']
  cmd+=['-t',str(TOTAL),'-movflags','+faststart',str(target)];subprocess.run(cmd,check=True)
  subprocess.run(['ffmpeg','-v','error','-i',str(target),'-f','null','-'],check=True)
  if fmt=='vertical':Image.open(frames[0]).save(OUT/f'relay-{lang}-poster.jpg',quality=85)
  manifest.append({'file':target.name,'bytes':target.stat().st_size,'duration_seconds':TOTAL,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'language':lang,'audio':'synthetic English narration' if lang=='en' else 'no audio'})
  thumb=Image.new('RGB',(900,320 if fmt=='wide' else 640),'white')
  for i,p in enumerate(frames):
   a=Image.open(p);a.thumbnail((180,thumb.height));thumb.paste(a,(i*180,0))
  thumb.save(WORK/f'{lang}-{fmt}-contact.jpg',quality=90)
  print(target.name,target.stat().st_size,flush=True)
 for lang in ['en','zh']:
  def stamp(n):return f'00:{int(n)//60:02d}:{int(n)%60:02d}.000'
  at=0;v=['WEBVTT',''];s=[]
  for i,(line,d) in enumerate(zip(COPY[lang]['captions'],DURS)):
   v.extend([f'{stamp(at)} --> {stamp(at+d)}',line,'']);s.extend([str(i+1),f'{stamp(at)} --> {stamp(at+d)}'.replace('.',','),line,'']);at+=d
  (OUT/f'relay-{lang}.vtt').write_text('\n'.join(v));(OUT/f'relay-{lang}.srt').write_text('\n'.join(s))
 (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2))
if __name__=='__main__':render()
