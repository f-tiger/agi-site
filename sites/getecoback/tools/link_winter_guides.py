#!/usr/bin/env python3
"""Attach the authored winter paths after generic chrome; no new nav category."""
from pathlib import Path
import re
SITE=Path(__file__).resolve().parents[1]/'site'
TARGETS={
 'index.html':('/winter-energiesparen.html','Dein Wintercheck: einstellen, messen, entscheiden','Heizkörper, Zugluft, Warmwasser und Beleuchtung: passende nächste Schritte statt pauschaler Sparversprechen.'),
 'wohnen.html':('/winter-energiesparen.html','Wohnung auf den Winter vorbereiten','Sieben konkrete Aufgaben mit drei kostenlosen Kostenrechnern.'),
 'wohnkosten-werkstatt.html':('/guide/duschen-kosten-rechner.html','Auch Warmwasser kostet Energie','Duschzeit, gemessenen Durchfluss und deinen Tarif vergleichen.'),
 'tools.html':('/winter-energiesparen.html','Winterrechner nach Aufgabe finden','Thermostat-Amortisation, Duschkosten und Lichterketten mit eigenen Annahmen rechnen.'),
 'guide/heizkosten-senken-als-mieter.html':('/guide/smarte-heizkoerperthermostate-lohnen-sich.html','Thermostatwechsel konkret prüfen','Anschluss, Tagesablauf, Kaufpreis und laufende Kosten vor einer Entscheidung abgleichen.'),
 'guide/infrarotheizung-thermostat.html':('/guide/nachtabsenkung-heizung.html','Zeitplan passend zum Heizsystem wählen','Nachtabsenkung und die Trägheit verschiedener Heizsysteme getrennt beurteilen.'),
 'guide/thermovorhang-ratgeber.html':('/guide/fenster-zugluft-mietwohnung.html','Erst klären, woher die Kälte kommt','Undichte Fuge oder kalte Scheibe? Die Ursache entscheidet über die Maßnahme.'),
 'guide/heizdecke-stromverbrauch.html':('/guide/homeoffice-warm-bleiben.html','Wärme am Arbeitsplatz sinnvoll kombinieren','Persönliche Wärme und ausreichende Raumtemperatur sind unterschiedliche Aufgaben.'),
 'guide/strom-sparen-haushalt.html':('/guide/lichterkette-stromkosten.html','Winterbeleuchtung samt Timer durchrechnen','Auch der zusätzliche Timer-Eigenverbrauch gehört in die Rechnung.'),
 'guide/richtig-lueften-im-winter.html':('/guide/nachtabsenkung-heizung.html','Absenken, ohne die Raumfeuchte zu vergessen','Gebäude, Heizsystem und Komfort am Morgen gemeinsam prüfen.'),
 'guide/luftbefeuchter-ratgeber.html':('/winter-energiesparen.html','Raumklima und Winterkosten zusammen betrachten','Heizungsregelung, Lüften und Messen kommen vor einem weiteren Gerät.'),
 'strommess-protokoll.html':('/guide/lichterkette-stromkosten.html','Gemessene Watt in Winterkosten übersetzen','Beleuchtungsdauer und Timer-Eigenverbrauch gegenüberstellen.')}
def main():
 from build_winter_guides import PAGES
 from demand_tools import inject
 for slug in [*PAGES, 'winter-energiesparen']:
  p=SITE/('winter-energiesparen.html' if slug=='winter-energiesparen' else 'guide/'+slug+'.html')
  p.write_text(inject(p.read_text(),slug))
 for name,(url,title,desc) in TARGETS.items():
  p=SITE/name;s=p.read_text();s=re.sub(r'<!--EB_WINTER_LINK-->.*?<!--/EB_WINTER_LINK-->\n?','',s,flags=re.S)
  block=f'<!--EB_WINTER_LINK--><aside style="max-width:1000px;margin:24px auto;padding:20px;border-left:5px solid #376548;background:#edf3e6;box-sizing:border-box;"><strong><a href="{url}">{title}</a></strong><p>{desc}</p></aside><!--/EB_WINTER_LINK-->\n'
  if name=='index.html':
   marker='<!--/EB_HOUSEHOLD_LINK-->'
   if marker not in s:raise ValueError('Homepage household entry missing')
   s=s.replace(marker,marker+'\n'+block,1)
  else:
   match=re.search(r'</article>|</main>|</body>',s)
   if not match:raise ValueError(name)
   s=s[:match.start()]+block+s[match.start():]
  p.write_text(s)
 print('Winter paths linked from',len(TARGETS),'existing entries.')
if __name__=='__main__':main()
