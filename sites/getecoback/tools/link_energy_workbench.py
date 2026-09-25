#!/usr/bin/env python3
"""Contextual entrances from existing pages; replace in place on rebuild."""
from pathlib import Path
import json,re,html,runpy
ROOT=Path(__file__).resolve().parents[1];SITE=ROOT/'site';copy=json.loads((ROOT/'data/energy-workbench.json').read_text())
# Render final pages after the general site injectors; each tool owns its UI.
runpy.run_path(str(ROOT/'tools/build_energy_workbench.py'),run_name='__main__')
targets={'de':['index.html','tools.html','wohnkosten-werkstatt.html','rechner.html','guide/stromkosten-rechner.html','guide/strom-sparen-haushalt.html','guide/stromvergleich-check.html'],'en':['en/index.html','en/solution-calculator.html'],'fr':['fr/calculateur.html'],'es':['es/calculadora.html'],'it':['it/index.html','it/calcolatore.html']}
for lang,paths in targets.items():
 t=copy[lang];block=f'<!--EB_ENERGY_WORKBENCH--><aside style="margin:24px auto;padding:20px;max-width:1000px;border-left:5px solid #075f88;background:#eff7fb;"><strong><a href="/{t["path"]}">{html.escape(t["title"])}</a></strong><p style="margin:6px 0 0;">{html.escape(t["intro"])}</p></aside><!--/EB_ENERGY_WORKBENCH-->\n'
 for name in paths:
  p=SITE/name;s=p.read_text()
  if '<!--EB_ENERGY_WORKBENCH-->' in s:s=re.sub(r'<!--EB_ENERGY_WORKBENCH-->.*?<!--/EB_ENERGY_WORKBENCH-->\n?',lambda _:block,s,flags=re.S)
  elif name=='index.html' and '<!--EB_TOPPICK-->' in s:s=s.replace('<!--EB_TOPPICK-->',block+'<!--EB_TOPPICK-->',1)
  else:
   s,n=re.subn(r'(<h2\b)',lambda m:block+m[1],s,count=1)
   assert n==1,name
  p.write_text(s)
print('Electricity workbench linked from 13 existing pages.')
