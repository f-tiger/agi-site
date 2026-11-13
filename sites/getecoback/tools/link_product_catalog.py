"""Expose the validated multi-category selection from existing German entries."""
from pathlib import Path
import re
from build_product_catalog import load
ROOT = Path(__file__).resolve().parents[1]
MARKER = 'EB_PRODUCT_CATALOG_ENTRY'

def inject(text, data):
    clean = re.sub(r'<!--'+MARKER+r'-->.*?<!--/'+MARKER+r'-->\s*', '', text, flags=re.S)
    count, categories = len(data['products']), len(data['categories'])
    block = (f'<!--{MARKER}--><p data-product-catalog-entry style="padding:12px 16px;border-radius:10px;background:#f2f7fa;color:#173f5f;line-height:1.6">'
             f'<a href="/produkte.html" style="color:#124f75;font-weight:700">{count} Haushaltsgeräte in {categories} Kategorien ansehen →</a> '
             f'Mit passenden Auswahlhilfen, genauen Varianten und Herstellerquellen.</p><!--/{MARKER}-->')
    h1 = re.search(r'</h1>', clean, re.I)
    if h1 is None:
        raise ValueError('Product discovery requires an authored heading')
    return clean[:h1.end()] + block + clean[h1.end():]

def build(root=ROOT):
    root = Path(root);data=load(root/'data/product-catalog.json');changed=0
    for route in ['index.html','wohnen.html','tools.html']:
        p=root/'site'/route;t=p.read_text();result=inject(t,data)
        if result!=t:p.write_text(result);changed+=1
    return changed

if __name__ == '__main__':
    print(f'Product catalog discovery: {build()} existing entries updated')
