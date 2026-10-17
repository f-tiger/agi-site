#!/usr/bin/env python3
"""Keep reviewed care/fit tools discoverable; never derive copy from trend text."""
import re
from pathlib import Path

SITE = Path(__file__).resolve().parents[1] / 'site'
MARKER = 'EB_UPKEEP_DISCOVERY'
DE = '''<section id="upkeep-tools" aria-labelledby="upkeep-tools-heading" style="max-width:980px;margin:24px auto;padding:20px;border:1px solid #d4e2dd;border-radius:16px;background:#f4f8f6;color:#203a32"><h2 id="upkeep-tools-heading">Pflegen, prüfen, passend kaufen</h2><p>Ein vorhandenes Gerät pflegen oder die Wohnung gezielt verbessern: wenige Auswahlen, nachvollziehbare Grenzen und auch eine Antwort ohne Neukauf.</p><ul><li><a href="/guide/tineco-saugt-nicht-mehr.html#upkeep-check">Tineco: reinigen, prüfen oder zum Service?</a> — Modell und Symptom zuerst.</li><li><a href="/guide/thermovorhang-ratgeber.html#upkeep-check">Thermovorhang: passt er vor Tür oder Fenster?</a> — Heizung, Öffnungsweg und Zugluft beachten.</li><li><a href="/en/guide/12l-vs-20l-dehumidifier-uk.html#meaco-care" lang="en">UK: Meaco filter fit and upkeep cost</a> — englische Hilfe zu Modell und Folgekosten.</li></ul></section>'''
EN = '''<section id="upkeep-tools" aria-labelledby="upkeep-tools-heading" style="max-width:980px;margin:24px auto;padding:20px;border:1px solid #d4e2dd;border-radius:16px;background:#f4f8f6;color:#203a32"><h2 id="upkeep-tools-heading">Care for the appliance you have</h2><p>Check the exact model before replacing a filter. Guidance includes a no-purchase option and dated cost assumptions.</p><p><a href="/en/guide/12l-vs-20l-dehumidifier-uk.html#meaco-care">Meaco: does the filter fit, and do you need it?</a></p><p><a href="/en/guide/uk-damp-and-heating-decisions.html">More UK damp, laundry and heating decisions</a></p></section>'''

def inject(text, block):
    pattern = rf'\s*<!--{MARKER}-->.*?<!--/{MARKER}-->\s*'
    text = re.sub(pattern, '\n', text, flags=re.S)
    anchor = '</main>' if '</main>' in text else '</body>'
    return text.replace(anchor, f'\n<!--{MARKER}-->{block}<!--/{MARKER}-->\n' + anchor, 1)

def main():
    for path, body in [('index.html', DE), ('tools.html', DE), ('rechner.html', DE), ('en/index.html', EN)]:
        target = SITE / path
        text = target.read_text()
        result = inject(text, body)
        assert inject(result, body) == result, path
        target.write_text(result)
    print('Reviewed upkeep tools linked from homepage, tool hub and existing calculator.')

if __name__ == '__main__':
    main()
