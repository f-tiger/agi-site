#!/usr/bin/env python3
"""Render public/share.png (1200x630) for og:image. Text comes from the live page copy; no claims added."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
root=Path(__file__).resolve().parents[1]
fonts=Path('/usr/share/fonts/truetype/dejavu')
def font(n,bold=False):return ImageFont.truetype(str(fonts/('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')),n)
im=Image.new('RGB',(1200,630),'#f7f9fc');d=ImageDraw.Draw(im);blue='#1549e5';ink='#17243b';muted='#55637b'
d.rectangle((0,0,18,630),fill=blue)
d.text((70,64),'Agent Delivery Lab',font=font(30,True),fill=blue)
d.text((70,108),'verify.agiscorecard.com',font=font(20),fill=muted)
d.text((70,190),'Payment is a step.',font=font(64,True),fill=ink)
d.text((70,268),'Delivery is the test.',font=font(64,True),fill=blue)
for i,line in enumerate(['Inspect x402 payment requirements, check JSON responses','against your acceptance rules, compare payment snapshots.','Free, local checks for agent builders. No wallet, no upload.']):
    d.text((70,392+i*40),line,font=font(26),fill=muted)
d.text((70,552),'An AGI Scorecard experiment - free beta',font=font(20),fill=muted)
out=root/'public'/'share.png';im.save(out,optimize=True);print('wrote',out,out.stat().st_size,'bytes')
