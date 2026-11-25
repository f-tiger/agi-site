"""An answer-first measurement flow on two existing German guides."""
import hashlib,re
from pathlib import Path
PATHS={'luftfeuchtigkeit-senken','richtig-lueften-im-winter'}
ROOT=Path(__file__).resolve().parents[1]

def ventilation_effect():
 fields=''
 for when,label in [('before','Vor dem Lüften'),('after','Nach dem Wiederaufwärmen')]:
  fields+=f'''<fieldset><legend>{label}</legend>
  <label>Raumtemperatur (°C)<input name="{when}_c" type="number" required min="0" max="40" step="0.1" inputmode="decimal"></label>
  <label>Relative Raumfeuchte (%)<input name="{when}_rh_pct" type="number" required min="1" max="100" step="0.1" inputmode="decimal"></label></fieldset>'''
 rev=hashlib.sha256((ROOT/'site/assets/ventilation-effect.mjs').read_bytes()).hexdigest()[:12]
 return f'''<!--ECO_VENTILATION_EFFECT-->
<section id="lueften-vorher-nachher" aria-labelledby="lueften-vorher-nachher-titel">
  <style>#lueften-vorher-nachher{{scroll-margin-top:150px}}#lueften-vorher-nachher label{{display:block;margin:.4rem 0}}#lueften-vorher-nachher input[type=number]{{display:block;width:min(100%,16rem);min-height:44px;box-sizing:border-box;font:inherit}}#lueften-vorher-nachher button{{min-height:44px;font:inherit}}</style>
  <h2 id="lueften-vorher-nachher-titel">Hat Lüften Feuchte abgeführt? Vorher und nachher messen</h2>
  <p>Miss Raumtemperatur und relative Luftfeuchte vor dem Lüften und nach dem Wiederaufwärmen. Verwende dasselbe Gerät am selben Ort und warte auf stabile Werte. Vergleiche in Gramm Wasser pro Kubikmeter (g/m³), weil sich Prozentwerte mit der Temperatur ändern.</p>
  <p><strong>Rechenbeispiel:</strong> Bei 20 °C sinkt die relative Feuchte von 60 % vor dem Lüften auf 50 % danach. Das sind rechnerisch 1,72 g/m³ weniger Wasser in der Raumluft am Messpunkt.</p>
  <form data-ventilation-effect hidden inert aria-label="Raumfeuchte vor und nach dem Lüften vergleichen">
   {fields}
   <label><input name="same_position" type="checkbox"> Gleiches Gerät, gleicher Messort und beide Messwerte stabil.</label>
   <button type="submit">Messwerte vergleichen</button>
   <p role="status"></p>
  </form>
  <p>Die Magnus-Näherung beschreibt die Änderung am Messpunkt. Neue Feuchtequellen, feuchte Wände und Messunsicherheit bleiben offen. Vergleichbare Werte fehlen? Erst erneut messen. Bei wiederkehrender Nässe oder sichtbaren Schäden <a href="/guide/luftfeuchtigkeit-senken.html">Feuchteursache prüfen</a>. Aus diesem Vergleich allein folgt keine Kaufentscheidung.</p>
  <p>Zum Nachlesen: <a href="https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/heizen-und-lueften-so-gehts-richtig-10426">Verbraucherzentrale über Heizen, Lüften und Messgeräte</a>.</p>
</section>
<script type="module" src="/assets/ventilation-effect.mjs?v={rev}"></script>
<!--/ECO_VENTILATION_EFFECT-->
'''

def inject(html,slug):
 if slug not in PATHS:return html
 html=re.sub(r'<!--ECO_MOISTURE_CHECK-->.*?<!--/ECO_MOISTURE_CHECK-->\n?','',html,flags=re.S)
 # These pages answer a ventilation question before discussing a purchase.
 for marker in ('EB_QUICKPICK','EB_TOPPICK','EB_STICKY'):
  html=re.sub(r'<!--'+marker+r'-->.*?<!--/'+marker+r'-->\n?','',html,flags=re.S)
 fields=''
 for name,label,lo,hi in [('inside','Innen: Temperatur (°C)',0,40),('rh','Innen: relative Feuchte (%)',1,100),('outside','Außen: Temperatur (°C)',-30,45),('outRh','Außen: relative Feuchte (%)',1,100)]:
  fields+=f'<label>{label}<input name="{name}" type="number" min="{lo}" max="{hi}" step="0.1" required inputmode="decimal"></label>'
 version=hashlib.sha256((ROOT/'site/assets/moisture-check.mjs').read_bytes()).hexdigest()[:12]
 block='''<!--ECO_MOISTURE_CHECK--><style>#moisture-check [hidden]{display:none!important}#moisture-check label{display:block;min-width:0}#moisture-check input[type=number]{display:block;width:100%;box-sizing:border-box;padding:10px;font:inherit}#moisture-check button{padding:12px;margin:8px 4px 8px 0;min-height:44px;font:inherit;cursor:pointer}#moisture-check :focus-visible{outline:3px solid #147d79;outline-offset:3px}#moisture-check h3{font-size:1.1rem;line-height:1.5}</style><section id="moisture-check" aria-labelledby="moisture-title" style="padding:20px;margin:24px 0;border:2px solid #147d79;border-radius:12px;background:#f4faf8;color:#173c39"><h2 id="moisture-title">Erst messen: Hilft Lüften gerade gegen Feuchte?</h2><p>Vier Messwerte statt einer vorschnellen Kaufempfehlung. Nutze möglichst gleichzeitig gemessene Innen- und Außenwerte. Keine Werte zur Hand? Erst messen – keine Schätzung als persönliche Empfehlung.</p><form data-js hidden style="display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:16px">'''+fields+'''<label><input name="damage" type="checkbox"> Nasse Wand, Leck oder sichtbarer Schimmel</label><button type="submit">Meine Messwerte prüfen</button></form><button data-js hidden type="button" data-example>Fiktives Beispiel ausprobieren</button><div data-output tabindex="-1" aria-live="polite" hidden><h3 data-verdict></h3><p data-number></p><p>Wenn die Feuchte wieder steigt: Temperatur und Feuchte nach dem Wiederaufwärmen erneut messen. Kochen, Duschen, Wäsche und die Nutzung des Raums getrennt notieren. Ein Anstieg allein beweist weder einen Bauschaden noch falsches Lüften.</p><button data-js hidden type="button" data-save disabled>Eigene Messung auf diesem Gerät speichern</button></div><details><summary>Meine Messreihe: vorher und nachher vergleichen</summary><p>Bis zu 30 Messungen bleiben ausschließlich in diesem Browser. Kein Konto, keine Cloud-Synchronisierung. Auf gemeinsam genutzten Geräten anschließend löschen. Nicht ohne Raum- und Nutzungskontext vergleichen.</p><ol data-history></ol><button data-js hidden type="button" data-export>Messreihe als CSV herunterladen</button> <button data-js hidden type="button" data-clear>Lokale Messreihe löschen</button></details><p data-status role="status"></p><h3>Wann ein Gerät überhaupt infrage kommt</h3><p>Bleibt erhöhte Feuchte trotz geeigneter Maßnahmen bestehen, zuerst die Ursache klären. Vergleiche danach Einsatztemperatur, Geräusch, Entwässerung und Strombedarf; die Raumfläche allein reicht nicht. <a href="/guide/luftentfeuchter-ratgeber.html#eb-moisture-choice">Kauf oder Nichtkauf prüfen</a> · <a href="/guide/luftentfeuchter-dauerbetrieb-stromkosten.html">Betriebskosten berechnen</a>.</p><details><summary>Rechenweg und Grenzen</summary><p>Magnus-Näherung über Wasser: eₛ(T) = 6,112 × exp(17,62 × T / (243,12 + T)); Außenluft bei Innentemperatur: 100 × eₛ(T außen) × rF außen / 100 / eₛ(T innen). Gleicher Luftdruck angenommen. Unter 0 °C ist die Näherung gegenüber Eis ungenauer. Ein Abstand von mehr als fünf Prozentpunkten ist eine vorsichtige Entscheidungsregel, keine Sicherheitsgrenze. Luftwechsel, Feuchtenachschub, Wandtemperaturen und Sensorfehler werden nicht modelliert. Das Ergebnis diagnostiziert keinen Schimmel und garantiert weder Trocknung noch Heizkostenersparnis.</p></details><p>Fachlicher Hintergrund: <a href="https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/heizen-und-lueften-so-gehts-richtig-10426">Verbraucherzentrale: Heizen und Lüften</a> (geprüft am 04.11.2026). Raumwerte werden nicht an die Statistik übertragen; gezählt werden nur feste Aktionen, sofern Statistik erlaubt ist.</p><noscript><p>Ohne JavaScript: Temperatur und Feuchte innen und außen notieren, Feuchtequellen prüfen und den verlinkten Lüftungsratgeber nutzen. Aus einem einzelnen Prozentwert folgt kein Gerätekauf.</p></noscript></section><script type="module" src="/assets/moisture-check.mjs?v='''+version+'''"></script><!--/ECO_MOISTURE_CHECK-->\n'''
 # Before both model recommendations and any article h2/tool form.
 article=re.search(r'<article\b[^>]*>',html); start=article.end() if article else 0
 candidates=[m.start() for m in re.finditer(r'<!--EB_MODELS-->|<h2\b',html) if m.start()>=start]
 if not candidates:raise ValueError('Missing article anchor: '+slug)
 pos=min(candidates)
 if slug=='richtig-lueften-im-winter':
  block=block.replace('<form data-js hidden', '<p><a href="#lueften-vorher-nachher">Schon gelüftet? Vorher und nachher vergleichen</a></p><form data-js hidden',1)
  html=re.sub(r'<!--ECO_VENTILATION_EFFECT-->.*?<!--/ECO_VENTILATION_EFFECT-->\n?','',html,flags=re.S)
  target=html.index('<h2 id="dasselbe-fenster-ein-halbes-jahr-frueher">')
  html=html[:target]+ventilation_effect()+html[target:]
 return html[:pos]+block+html[pos:]
