#!/usr/bin/env python3
"""Attach private-by-default scenario sharing to public tools after all generators."""
from pathlib import Path
import hashlib,re,json
from build_tools_hub import discover
ROOT=Path(__file__).resolve().parents[1];SITE=ROOT/'site'
assets=['tool-experience.mjs','tool-experience.css']
version=hashlib.sha256(b''.join((SITE/'assets'/n).read_bytes() for n in assets)).hexdigest()[:12]
paths={u.lstrip('/') for u in discover()}
for prefix in ['', 'en/', 'it/']:
 for tool in ['billlens','appliancepayback','homeenergy-log']:
  p=prefix+'workbench/'+tool+'.html'
  if (SITE/p).exists():paths.add(p)
block=f'<!--EB_TOOL_EXPERIENCE--><link rel="stylesheet" href="/assets/tool-experience.css?v={version}"><script type="module" src="/assets/tool-experience.mjs?v={version}"></script><!--/EB_TOOL_EXPERIENCE-->'
for name in sorted(paths):
 p=SITE/name;t=p.read_text();t=re.sub(r'\n*<!--EB_TOOL_EXPERIENCE-->.*?<!--/EB_TOOL_EXPERIENCE-->\s*','\n',t,flags=re.S)
 if 'noindex' in t[:4000]:continue
 if 'name="twitter:card"' not in t:
  card='summary_large_image' if 'property="og:image"' in t else 'summary'
  t=t.replace('</head>',f'<meta name="twitter:card" content="{card}">\n</head>',1)
 t=t.replace('</head>',block+'\n</head>',1)
 p.write_text(t)
print(f'Attached scenario/share experience to {len(paths)} public tool pages; no private/member pages.')
