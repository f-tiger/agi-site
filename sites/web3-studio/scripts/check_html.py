from pathlib import Path
from html.parser import HTMLParser
import re, json
from urllib.parse import urlparse
from PIL import Image
class Page(HTMLParser):
    def __init__(self):
        super().__init__(); self.ids=[];self.labels=[];self.links=[];self.headings=0
    def handle_starttag(self,tag,attrs):
        a=dict(attrs)
        if 'id' in a:self.ids.append(a['id'])
        if tag=='label' and 'for' in a:self.labels.append(a['for'])
        if tag in ['a','script','link']:self.links.append(a.get('href',a.get('src','')))
        if tag=='h1':self.headings+=1
root=Path('dist');checked=0; titles=set()
for f in root.rglob('*.html'):
    p=Page();p.feed(f.read_text());assert len(p.ids)==len(set(p.ids)),f'{f}: duplicate IDs'
    assert p.headings==1,f'{f}: one primary heading required'
    assert all(x in p.ids for x in p.labels),f'{f}: label without target'
    for link in p.links:
        if not link or link.startswith(('https://','http://','mailto:')):continue
        if link.startswith('#'):assert link[1:] in p.ids,(f,link);continue
        path=link.split('#')[0].split('?')[0]
        if path in ['/openapi.json','/api/v1/profiles','/mcp','/api/research','/api/market','/api/briefs','/updates.xml']:continue
        if path=='/':path='/index.html'
        assert (f.parent/path.lstrip('/')).exists() or (root/path.lstrip('/')).exists(),(f,link)
    if 'data-site="hub"' not in f.read_text() and f.name=='index.html' and f.parent!=root:
        app=Path('public/app.mjs').read_text()
        refs=set(re.findall(r"\$\('([^']+)'\)",app))-{'fingerprint','fingerprint-result'}
        assert refs<=set(p.ids),f'{f}: missing JS targets {refs-set(p.ids)}'
    text=f.read_text();title=re.search(r'<title>(.*?)</title>',text).group(1)
    assert title not in titles,(f,'duplicate title');titles.add(title)
    canonical=re.search(r'rel="canonical" href="([^"]+)"',text).group(1)
    expected='/' if f.name=='index.html' else '/'+f.name
    assert urlparse(canonical).path==expected,(f,canonical)
    assert f'<meta property="og:url" content="{canonical}">' in text,(f,'og:url differs from canonical')
    assert re.search(r'<meta property="og:image" content="https://[^/]+/share.png">',text),(f,'share image')
    for data in re.findall(r'<script type="application/ld\+json">(.*?)</script>',text):
        graph=json.loads(data)['@graph']
        for entity in graph:
            assert 'aggregateRating' not in entity
            if entity['@type']=='WebPage':assert entity['url']==canonical
            if entity['@type']=='FAQPage':
                for q in entity['mainEntity']:assert q['name'].replace('&','&amp;') in text,(f,q['name'])
    with Image.open(f.parent/'share.png') as image:assert image.size==(1200,630)
    checked+=1
print(f'PASS: {checked} HTML pages — unique IDs, labels, primary headings, local links and app targets.')
