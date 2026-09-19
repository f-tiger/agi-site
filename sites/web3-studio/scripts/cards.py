from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

fontroot=Path('/usr/share/fonts/truetype/dejavu')
def font(n,bold=False):return ImageFont.truetype(str(fontroot/('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')),n)
def wrapped(draw,text,f,width):
    lines=[];line=''
    for word in text.split():
        test=(line+' '+word).strip()
        if draw.textlength(test,font=f)>width and line:lines.append(line);line=word
        else:line=test
    if line:lines.append(line)
    return lines
for c in json.loads(Path('dist/cards.json').read_text()):
    im=Image.new('RGB',(1200,630),'#ffffff');d=ImageDraw.Draw(im);accent=c['color']
    d.rectangle((0,0,18,630),fill=accent);d.rounded_rectangle((52,45,105,101),radius=9,fill=accent)
    d.line((65,60,90,60,90,84,65,84,65,60),fill='white',width=2);d.line((70,69,85,69),fill='white',width=2);d.line((70,76,82,76),fill='white',width=2)
    d.text((124,54),c['name'],font=font(30,True),fill='#233146')
    titlefont=font(49,True);lines=wrapped(d,c['topic'],titlefont,1070)
    for i,line in enumerate(lines[:3]):d.text((60,138+i*60),line,font=titlefont,fill='#233146')
    top=342
    d.line((60,top-18,1130,top-18),fill='#d5deeb',width=2)
    for i,m in enumerate(c['metrics']):
        x=60+i*555;value=str(m['value']);vf=font(38,True)
        while d.textlength(value,font=vf)>505 and vf.size>19:vf=font(vf.size-1,True)
        d.text((x,top),value,font=vf,fill=accent)
        for j,line in enumerate(wrapped(d,m['label'],font(19),490)[:2]):d.text((x,top+56+j*24),line,font=font(19),fill='#536277')
    d.text((60,468),'Fictional examples. Local processing. Free beta.',font=font(21),fill='#536277')
    d.rectangle((60,528,1140,590),fill='#f4f7fc');d.text((78,545),c['host'],font=font(24,True),fill=accent)
    dest=Path('dist')/('' if c['id']=='hub' else c['id']);im.save(dest/'share.png',optimize=True)
Path('dist/cards.json').unlink()
