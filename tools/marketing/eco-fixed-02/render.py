"""ECO fixed-fee experiment: original infographics, English synthetic voice/captions.
Requires Pillow, numpy, soundfile, onnxruntime, kokoro_onnx and ffmpeg.
Set ECO_OUTPUT and KOKORO_MODEL_DIR to existing local directories.
"""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json,re,subprocess,hashlib
import numpy as np
import soundfile as sf
import onnxruntime as ort
from kokoro_onnx import Kokoro
import os
R=Path(os.environ.get('ECO_OUTPUT', 'eco-fixed-media'));R.mkdir(parents=True,exist_ok=True);W=R/'work';W.mkdir(exist_ok=True)
FONT='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';BOLD='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
BG='#F4F2E9';INK='#153D31';GREEN='#237452';MINT='#D9E9D9';PEACH='#F5CBB0';GRAY='#52635A'
SCENES=[('THE FIXED-FEE TRAP', 'Lower rate. Higher bill.', 'Compare the whole annual cost, not just the price per kWh.', 'A lower electricity unit price can still mean a higher annual bill.', 6, 'hook'), ('INVENTED OFFERS', 'Three cents cheaper?', 'A: EUR 0.30/kWh + EUR 120/year. B: EUR 0.27/kWh + EUR 240/year.', 'In this invented example, A charges thirty cents per kilowatt hour. B charges twenty seven, but doubles the annual fixed fee.', 11, 'inputs'), ('AT 3,500 KWH / YEAR', 'B costs EUR 15 more.', 'A = EUR 1,170. B = EUR 1,185. No bonuses or switching costs.', 'At three thousand five hundred kilowatt hours, A costs eleven seventy euros. B costs eleven eighty five. The cheaper unit rate loses.', 11, 'costs'), ('THE BREAK-EVEN', '4,000 kWh per year', 'EUR 120 extra fixed fee / EUR 0.03 unit saving = 4,000 kWh.', 'The extra fixed fee is one hundred twenty euros. Divide by the three cent saving. Both offers cost the same at four thousand kilowatt hours.', 12, 'saving'), ('USE YOUR OWN BILL', 'Your usage decides.', 'Below 4,000: A costs less. Above 4,000: B costs less.', 'Below that usage, A costs less. Above it, B costs less. These are fictional constant prices, not a savings forecast.', 10, 'terms'), ('FREE TOOL · NO ACCOUNT', 'Compare your two offers.', 'Type the address shown below into your browser.', 'Use your own annual usage and both offers in the free EcoBack electricity workbench. Type the address on screen into your browser.', 11, 'cta')]

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
 if kind in ['inputs','costs']:
  for i,(offer,rate,fixed,total) in enumerate([('A','EUR 0.30/kWh','EUR 120/year','EUR 1,170'),('B','EUR 0.27/kWh','EUR 240/year','EUR 1,185')]):
   x=25+i*500;d.rounded_rectangle((x,20,x+450,590),28,fill=MINT if i==0 else PEACH)
   text(d,(x+28,55),'OFFER '+offer,38,b=True);text(d,(x+28,155),rate,35);text(d,(x+28,235),'+ '+fixed,32)
   text(d,(x+28,340),total,52,b=True);text(d,(x+28,465),'at 3,500 kWh/year',27)
 elif kind=='saving':
  d.rounded_rectangle((25,20,975,610),30,fill=MINT)
  text(d,(70,65),'BREAK-EVEN',38,b=True);text(d,(70,190),'4,000 kWh',98,b=True)
  text(d,(70,370),'A = B = EUR 1,320/year',43);text(d,(70,500),'Constant prices. No bonuses.',30)
 elif kind=='terms':
  for i,label in enumerate(['Below 4,000 kWh: A wins','At 4,000 kWh: same cost','Above 4,000 kWh: B wins']):
   y=25+i*195;d.rounded_rectangle((25,y,975,y+160),25,fill=MINT);text(d,(60,y+50),label,43,b=True)
 else:
  d.rounded_rectangle((25,20,975,610),30,fill=MINT)
  text(d,(70,90),'Compare the total.',70,b=True);text(d,(70,245),'Usage x unit rate',58);text(d,(70,350),'+ annual fixed fee',58)
  text(d,(70,505),'Fictional example, not a supplier quote.',30)
 return im

def frames():
 for fmt in ['youtube','tiktok']:
  wide=fmt=='youtube';size=(1920,1080) if wide else (1080,1920)
  for i,(tag,title,sub,spoken,sec,kind) in enumerate(SCENES):
   assert not re.search('[\u3400-\u9fff]',tag+title+sub+spoken)
   im=Image.new('RGB',size,BG);d=ImageDraw.Draw(im)
   d.rectangle((0,0,size[0],18),fill=GREEN)
   text(d,(70,64),'ECOBACK',30,GREEN,b=True);text(d,(size[0]-195,64),f'{i+1:02d} / {len(SCENES):02d}',24,GRAY)
   text(d,(70,150),tag,24,GREEN,width=900,b=True)
   text(d,(70,215),title,64 if wide else 68,width=750 if wide else 910,b=True)
   if wide:
    text(d,(70,450),sub,35,width=655);im.paste(artwork(kind).resize((1000,660)),(850,183));box=(60,880,1860,1035);caption_size=36
   else:
    text(d,(70,455),sub,32,width=900);im.paste(artwork(kind).resize((940,620)),(70,650));box=(70,1350,960,1670);caption_size=42
   d=ImageDraw.Draw(im);d.rounded_rectangle(box,20,fill=INK);f=font(caption_size);ls=lines(spoken,f,box[2]-box[0]-55);h=len(ls)*(caption_size+14);assert h<box[3]-box[1]-25
   y=box[1]+(box[3]-box[1]-h)//2
   for line in ls:d.text(((box[0]+box[2]-f.getlength(line))/2,y),line,font=f,fill='white');y+=caption_size+14
   text(d,(70,1044 if wide else 1770),'Illustrative example. No guaranteed savings.' if kind in ['inputs','costs','saving','result'] else 'Free tool · getecoback.com',20,GRAY,width=size[0]-140)
   if kind=='cta':
    d.rectangle((60,600 if wide else 1100,830 if wide else 990,810 if wide else 1285),fill=INK)
    text(d,(80,620 if wide else 1110),'getecoback.com',42,'white',750,True)
    text(d,(80,690 if wide else 1180),'/bill-'+fmt,42,'white',750,True)
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
 (R/'eco-fixed-fee.en.srt').write_text('\n\n'.join(f'{i+1}\n{stamp(s["start"])} --> {stamp(s["end"])}\n{s["text"]}' for i,s in enumerate(records))+'\n')

def render():
 for fmt in ['youtube','tiktok']:
  ls=[]
  for i,s in enumerate(SCENES):ls += [f"file '{W/f'{fmt}-{i:02d}.png'}'",f'duration {s[4]}']
  ls.append(f"file '{W/f'{fmt}-{len(SCENES)-1:02d}.png'}'");(W/f'{fmt}.txt').write_text('\n'.join(ls))
  target=R/f'eco-fixed-fee-{fmt}.mp4'
  subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(W/f'{fmt}.txt'),'-i',str(R/'narration.m4a'),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-profile:v','baseline','-level:v','4.0','-pix_fmt','yuv420p','-r','30','-fps_mode','cfr','-preset','veryfast','-crf','19','-threads','4','-c:a','copy','-disposition:a:0','default','-metadata:s:a:0','language=eng','-t',str(sum(s[4] for s in SCENES)), '-movflags','+faststart',str(target)],check=True)
  print('Saved',target,flush=True)
if __name__=='__main__':
 import sys
 frames()
 if '--render-existing' not in sys.argv:voice()
 render()
