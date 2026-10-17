#!/usr/bin/env python3
"""Verify UK generation in a temporary site, never mutate unrelated pages."""
import contextlib
import io
from pathlib import Path
import tempfile
import unittest
import build_uk_opportunities as build

class UKCareGeneration(unittest.TestCase):
 def test_existing_routes_are_idempotent_and_keep_sources_and_no_js_example(self):
  original=build.SITE
  with tempfile.TemporaryDirectory() as directory:
   try:
    build.SITE=Path(directory)
    routes=['index.html','en/index.html',build.HUB,build.COMPARE]+['en/guide/'+slug+'.html' for slug in ['dehumidifier-drying-clothes-cost','heated-airer-vs-dehumidifier','desiccant-vs-compressor-dehumidifier','rising-damp-penetrating-damp-or-condensation','keep-warm-working-from-home','draughty-windows-rented-home']]
    for route in routes:
     p=build.SITE/route;p.parent.mkdir(parents=True,exist_ok=True);p.write_text('<html><body><header>Existing page</header><main>Preserve this content.</main></body></html>')
    with contextlib.redirect_stdout(io.StringIO()):build.main()
    first={p.relative_to(build.SITE):p.read_text() for p in build.SITE.rglob('*.html')}
    with contextlib.redirect_stdout(io.StringIO()):build.main()
    self.assertEqual(first,{p.relative_to(build.SITE):p.read_text() for p in build.SITE.rglob('*.html')})
    self.assertEqual(set(map(str,first)),set(routes))
    html=first[Path(build.COMPARE)]
    self.assertEqual(html.count('id="meaco-care"'),1)
    for value in ['£39.99','£59.98','£29.99','17 October 2026','not a current stock promise','not a guaranteed filter lifespan','This is not verification for 20L','dehumidifying alone it is optional','<form hidden>','<noscript>','/assets/meaco-care.mjs','/assets/meaco-care.css']:
     self.assertIn(value,html)
    self.assertIn('/'+build.COMPARE+'#meaco-care',first[Path(build.HUB)])
    self.assertNotIn('/assets/meaco-care.mjs',first[Path(build.HUB)])
    for text in [html,first[Path(build.HUB)]]:
     self.assertNotIn('ui.awin.com',text)
     self.assertNotIn('amazon.',text)
   finally:build.SITE=original

if __name__=='__main__':unittest.main()
