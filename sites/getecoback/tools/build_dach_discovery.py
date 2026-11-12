#!/usr/bin/env python3
"""Link verified DACH buying paths from existing household entry points."""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parents[1]
PAGES = ('wohnen.html', 'rechner.html', 'tools.html', 'guide/tineco-saugt-nicht-mehr.html')
BLOCK = '''<!--EB_DACH_BUYING--><aside id="dach-kaufhilfe" aria-labelledby="dach-kaufhilfe-title" style="max-width:980px;margin:24px auto;padding:20px;border:1px solid #bdd1dd;border-radius:12px;background:#f3f8fb">
<h2 id="dach-kaufhilfe-title">Vom Wohnungs-Check zur passenden Auswahl</h2>
<p><a href="/guide/smarte-heizkoerperthermostate-lohnen-sich.html#eb-thermostat-products">Heizkörperthermostat: Ventil, Zentrale und vollständiges Set prüfen</a></p>
<p><a href="/guide/saugwischer-kaufberatung.html">Saugwischer: Bodenfreigabe, Pflegeaufwand und konkrete Modelle vergleichen</a></p>
<p>Erst die Bedingungen zu Hause klären. Wenn das vorhandene Gerät genügt, ist kein Neukauf nötig. Händlerangebote und Lieferung am eigenen Standort prüfen.</p>
</aside><!--/EB_DACH_BUYING-->'''

def inject(text):
    text = re.sub(r'\s*<!--EB_DACH_BUYING-->.*?<!--/EB_DACH_BUYING-->\s*', '', text, flags=re.S)
    for anchor in ('</article>', '</main>', '</body>'):
        if anchor in text:
            return text.replace(anchor, '\n' + BLOCK + '\n' + anchor, 1)
    raise ValueError('No content anchor')

if __name__ == '__main__':
    for name in PAGES:
        path = ROOT / 'site' / name
        path.write_text(inject(path.read_text()))
    print(f'DACH buying discovery: {len(PAGES)} existing entry points')
