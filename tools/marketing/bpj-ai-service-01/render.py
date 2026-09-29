"""BPJ AI-service experiment: original infographics, English synthetic voice/captions.
Requires Pillow, numpy, soundfile, onnxruntime, kokoro_onnx and ffmpeg.
Set BPJ_OUTPUT and KOKORO_MODEL_DIR to existing local directories.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,re,subprocess,hashlib
import numpy as np
import soundfile as sf
import onnxruntime as ort
from kokoro_onnx import Kokoro
import os
R=Path(os.environ.get('BPJ_OUTPUT', '/workspace/scratch/031696b11ddb/bpj-ai-service-media'));R.mkdir(parents=True,exist_ok=True);W=R/'work';W.mkdir(exist_ok=True)
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
BG='#FFF7ED';INK='#292524';GREEN='#C2410C';MINT='#FFEDD5';PEACH='#FED7AA';GRAY='#57534E'
SCENES=[('AI SIDE-HUSTLE IDEA', 'Make money with AI?', 'Start with one deliverable: a product-video starter pack.', 'Want to make money with AI? Start with a product video starter pack.', 6, 'hook'), ('A CONCRETE OFFER', '3 clips. 3 openings.', 'Use product images you own or have permission to edit.', 'Offer three short product clips with different openings. Start with images you own or have permission to edit.', 9, 'inputs'), ('AI HELPS WITH THE DRAFT', 'Write 3 truthful hooks.', 'Prompt: use only verified product facts. Then review every line.', 'Ask an AI writing tool for three hooks using only verified product facts. Review every claim before using it.', 10, 'costs'), ('ASSEMBLE IN BPJ', 'Turn assets into versions.', 'The free editor arranges your media. AI footage is made elsewhere.', 'In BPJ, replace the example images, edit the openings, and check the layout. Generate any new AI footage in your chosen tool.', 11, 'saving'), ('YOUR DELIVERY CHECKLIST', 'Clips + captions + backup', 'Confirm format, usage rights and one agreed revision before quoting.', 'Export the clips, matching captions, and a project backup. Agree on format, usage rights, and revision scope before quoting.', 10, 'terms'), ('TRY THE WORKING EXAMPLE', 'Build your first sample.', 'A service idea to test. Finding paying clients still takes work.', 'Try the free BPJ video studio. This is a service idea to test, not proven earnings. Finding paying clients still takes work.', 11, 'cta')]

def font(n,b=False):return ImageFont.truetype(BOLD if b else FONT,n)
def lines(text,f,maxw):
 out=[];line=''
 for word in text.split():
  trial=(line+' '+word).strip()
  if line and f.getlength(trial)>maxw:out.append(line);line=word
  else:line=trial
 if line:out.append(line)
 return out
def text(d,xy,s,size,color=INK,width=850,b=False,spacing=12):
 x,y=xy;f=font(size,b)
 for line in lines(s,f,width):d.text((x,y),line,font=f,fill=color);y+=size+spacing
 return y
def artwork(kind):
 im=Image.new('RGB',(1000,660),BG);d=ImageDraw.Draw(im)
 items={
 'hook':['PRODUCT-VIDEO PACK','3 opening options','Captions + editable backup'],
 'inputs':['ONE SET OF ASSETS','Opening A: product detail','Opening B: everyday task','Opening C: use case'],
 'costs':['CHECK THE AI DRAFT','Use only supplied facts','Remove invented benefits','Approve every claim'],
 'saving':['BPJ WORKFLOW','Replace example images','Edit text and frame size','Review before exporting'],
 'terms':['PROPOSED CLIENT PACK','3 short clips','3 matching subtitle files','1 local project backup'],
 'cta':['START WITH A SAMPLE','Explore the working example','Use your own product assets','Test a clearly scoped offer']
 }[kind]
 d.rounded_rectangle((25,20,975,625),30,fill=MINT)
 y=65
 for i,line in enumerate(items):
  y=text(d,(65,y),line,43 if i==0 else 49,INK,860,i==0)+42
 return im

def frames():
 for fmt in ['youtube','tiktok']:
  wide=fmt=='youtube';size=(1920,1080) if wide else (1080,1920)
  for i,(tag,title,sub,spoken,sec,kind) in enumerate(SCENES):
   assert not re.search('[\u3400-\u9fff]',tag+title+sub+spoken)
   im=Image.new('RGB',size,BG);d=ImageDraw.Draw(im)
   d.rectangle((0,0,size[0],18),fill=GREEN)
   text(d,(70,64),'BPJ / AI WORKFLOWS',30,GREEN,b=True);text(d,(size[0]-195,64),f'{i+1:02d} / {len(SCENES):02d}',24,GRAY)
   text(d,(70,150),tag,24,GREEN,width=900,b=True)
   text(d,(70,215),title,64 if wide else 68,width=750 if wide else 910,b=True)
   if wide:
    text(d,(70,450),sub,35,width=655);im.paste(artwork(kind).resize((1000,660)),(850,183));box=(60,880,1860,1035);caption_size=36
   else:
    text(d,(70,455),sub,32,width=900);im.paste(artwork(kind).resize((940,620)),(70,650));box=(70,1350,960,1670);caption_size=42
   d=ImageDraw.Draw(im);d.rounded_rectangle(box,20,fill=INK);f=font(caption_size);ls=lines(spoken,f,box[2]-box[0]-55);h=len(ls)*(caption_size+14);assert h<box[3]-box[1]-25
   y=box[1]+(box[3]-box[1]-h)//2
   for line in ls:d.text(((box[0]+box[2]-f.getlength(line))/2,y),line,font=f,fill='white');y+=caption_size+14
   text(d,(70,1044 if wide else 1770),'Illustrative service idea. No earnings guarantee.' if kind in ['inputs','costs','saving','result'] else 'BPJ video studio · Free local editing',20,GRAY,width=size[0]-140)
   if kind=='cta':
    d.rectangle((60,600 if wide else 1100,830 if wide else 990,810 if wide else 1285),fill=INK)
    text(d,(80,620 if wide else 1110),'baipiaoji.com',42,'white',750,True)
    text(d,(80,690 if wide else 1180),'/en/video/',42,'white',750,True)
   im.save(W/f'{fmt}-{i:02d}.png')
  tw,th=(480,270) if wide else (270,480);sheet=Image.new('RGB',(tw*4,th*2),BG)
  for i in range(len(SCENES)):sheet.paste(Image.open(W/f'{fmt}-{i:02d}.png').resize((tw,th)),((i%4)*tw,(i//4)*th))
  sheet.save(R/f'{fmt}-contact-sheet.jpg',quality=94)

def voice():
 opts=ort.SessionOptions();opts.intra_op_num_threads=4;opts.inter_op_num_threads=1
 model=Kokoro.from_session(ort.InferenceSession(str(Path(os.environ.get('KOKORO_MODEL_DIR','/tmp/bpj-voice-models'))/'kokoro-v1.0.int8.onnx'),sess_options=opts,providers=['CPUExecutionProvider']),str(Path(os.environ.get('KOKORO_MODEL_DIR','/tmp/bpj-voice-models'))/'voices-v1.0.bin'))
 sr=24000;total=sum(s[4] for s in SCENES);audio=np.zeros(int((total+.1)*sr),dtype=np.float32);start=0;records=[]
 for i,(_,_,_,spoken,sec,_) in enumerate(SCENES):
  raw=W/f'voice-{i:02d}.wav'
  if not raw.exists():a,rate=model.create(spoken,voice='af_heart',speed=1.02,lang='en-us');sf.write(raw,a,rate)
  a,rate=sf.read(raw,dtype='float32');assert rate==sr;factor=max(1,len(a)/sr/(sec-.4));assert factor<=1.25,(i,factor)
  fitted=W/f'fitted-{i:02d}.wav';subprocess.run(['ffmpeg','-v','error','-y','-i',str(raw),'-af',f'atempo={factor:.6f}',str(fitted)],check=True)
  a,rate=sf.read(fitted,dtype='float32');offset=int((start+.15)*sr);audio[offset:offset+len(a)]=a;records.append({'scene':i+1,'start':start,'end':start+sec,'speech_end':start+.15+len(a)/sr,'text':spoken});start+=sec;print('Voice',i+1,flush=True)
 sf.write(W/'narration.wav',audio,sr)
 subprocess.run(['ffmpeg','-v','error','-y','-i',str(W/'narration.wav'),'-af','loudnorm=I=-16:TP=-1.5:LRA=7','-ar','44100','-ac','1','-c:a','aac','-b:a','160k',str(R/'narration.m4a')],check=True)
 (R/'narration-timing.json').write_text(json.dumps(records,indent=2))
 def stamp(x):return f'{int(x)//3600:02d}:{int(x)//60%60:02d}:{int(x)%60:02d},{round(x%1*1000):03d}'
 (R/'bpj-ai-service.en.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(s["start"])} --> {stamp(s["end"])}\n{s["text"]}' for i,s in enumerate(records))+'\n')

def render():
 for fmt in ['youtube','tiktok']:
  ls=[]
  for i,s in enumerate(SCENES):ls += [f"file '{W/f'{fmt}-{i:02d}.png'}'",f'duration {s[4]}']
  ls.append(f"file '{W/f'{fmt}-{len(SCENES)-1:02d}.png'}'");(W/f'{fmt}.txt').write_text('\n'.join(ls))
  target=R/f'bpj-ai-service-{fmt}.mp4'
  subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(W/f'{fmt}.txt'),'-i',str(R/'narration.m4a'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-profile:v','baseline','-level:v','4.0','-pix_fmt','yuv420p','-r','30','-fps_mode','cfr','-preset','veryfast','-crf','19','-threads','4','-c:a','copy','-disposition:a:0','default','-metadata:s:a:0','language=eng','-t',str(sum(s[4] for s in SCENES)), '-movflags','+faststart',str(target)],check=True)
  print('Saved',target,flush=True)
if __name__=='__main__':
 import sys
 frames()
 if '--render-existing' not in sys.argv:voice()
 render()
