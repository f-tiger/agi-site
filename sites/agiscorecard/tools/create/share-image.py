"""Render exact typographic share cards. Requires Pillow and a local CJK font."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
import os
root=Path(__file__).resolve().parents[2]
font=Path(os.environ.get('RELAY_CJK_FONT','/root/.local/share/fonts/NotoSansSC-700.ttf'))
for lang in ['en','zh']:
 im=Image.new('RGB',(1200,630),'white');d=ImageDraw.Draw(im)
 def text(x,y,s,size,color='#172641'):
  f=ImageFont.truetype(str(font if lang=='zh' else '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'),size);d.text((x,y),s,font=f,fill=color)
 d.rectangle((0,0,1200,10),fill='#002fa7')
 text(65,50,'接力' if lang=='zh' else 'Relay',32,'#002fa7')
 text(65,148,'你的想法，' if lang=='zh' else 'Your idea.',72)
 text(65,250,'朋友的下一步。' if lang=='zh' else 'Their next move.',72)
 text(65,425,'创作 · 游玩 · 改编' if lang=='zh' else 'Create. Play. Remix.',30,'#002fa7')
 text(65,553,'agiscorecard.com/'+('zh/create' if lang=='zh' else 'create'),22,'#5a6476')
 for x,y,s in [(920,145,'1'),(1040,255,'2'),(920,365,'3')]:
  d.ellipse((x-35,y-35,x+35,y+35),outline='#002fa7',width=3);text(x-12,y-22,s,30,'#002fa7')
 d.line((945,171,1015,230),fill='#002fa7',width=3);d.line((1015,280,945,340),fill='#002fa7',width=3)
 im.save(root/'share'/('relay-'+lang+'.png'))
