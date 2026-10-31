#!/usr/bin/env python3
"""Link the US filter finder from related owned pages without adding a pop-up."""
from pathlib import Path
import re

SITE = Path(__file__).resolve().parents[1] / 'site'
MARKER = 'EB_FILTER_FINDER_ENTRY'
ENTRIES = {
    'en/index.html': ('Already own a Levoit air purifier?',
                      'Find the original replacement filter for your exact US model. Compare dated manufacturer evidence before opening a store search.',
                      'Find my replacement filter'),
    'guide/luftreiniger-ratgeber.html': ('Levoit-Ersatzfilter für US-Modelle',
                      'Unser englischer Filter-Finder ordnet genaue US-Modellnamen den Herstellerangaben zu. Die Zuordnung gilt nicht automatisch für deutsche Modellvarianten.',
                      'Zum US-Filter-Finder (Englisch)'),
}

def main():
    for name, (title, description, label) in ENTRIES.items():
        path = SITE / name
        source = path.read_text(encoding='utf-8')
        source = re.sub(rf'\s*<!--{MARKER}-->.*?<!--/{MARKER}-->\s*', '\n', source, flags=re.S)
        block = (f'<!--{MARKER}--><aside style="max-width:980px;margin:28px auto;padding:24px;'
                 'border:1px solid #c9d4d5;border-left:4px solid #1f6666;border-radius:12px;background:#f3f7f5">'
                 f'<h2>{title}</h2><p>{description}</p>'
                 f'<a href="/en/filter-finder.html">{label} →</a></aside><!--/{MARKER}-->')
        anchor = next((candidate for candidate in ('</article>', '</main>', '<!--EB_FOOTER-->', '<footer', '</body>') if candidate in source), None)
        if anchor is None:
            raise ValueError(f'No editorial insertion point in {name}')
        path.write_text(source.replace(anchor, '\n'+block+'\n'+anchor, 1), encoding='utf-8')
    print('Filter finder: 2 relevant owned entry points linked.')

if __name__ == '__main__':
    main()
