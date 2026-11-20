# Raumklima-Dimensionierungsdaten als offener Datensatz

> Offene Raumklima-Daten: BTU und Watt je m², Prüfhinweise für Luftfeuchte und Entfeuchter. Keine Literempfehlung allein nach Fläche. CC BY 4.0, JSON und CSV.

Canonical (HTML, zitierfähig): https://getecoback.com/daten.html

Hier stehen die Kühl- und Heiz-Faustregeln der Website sowie Prüfhinweise für Feuchte und Entfeuchter. Eine Raumfläche allein legt keine Entzugsleistung fest. Die Daten mit Einheiten und Grenzen liegen auch als [sizing-data.json](https://getecoback.com/sizing-data.json) vor. Stand der Daten: 2026-11-06.

**Lizenz: CC BY 4.0.**
Nutzung, Veränderung und Weitergabe sind erlaubt, auch kommerziell — die einzige Bedingung ist die Nennung der Quelle. Es ist kein Konto nötig, es gibt keine Abfrage­begrenzung, und es kostet nichts.

## Die Regeln

| Regel | Wert | Einheit |
| --- | --- | --- |
| Kühlleistung je Fläche | 340 | BTU/h je m² |
| Heizleistung je Fläche (gedämmt) | 60–100 | W je m² |
| Prüfsignal bei wiederholt höherer Raumluftfeuchte | 60 | % relative Raumluftfeuchte; keine Schimmelgrenze |
| Obergrenze Monoblock | 13500 | BTU/h |
| Strompreis-Annahme | 0.3 | EUR je kWh |

**Zur Obergrenze:** Oberhalb von rund 13.500 BTU deckt kein tragbarer Monoblock den Raum noch ab; ab dort ist die ehrliche Empfehlung eine Quick-Connect-Splitanlage, nicht ein größeres mobiles Gerät. Quick-Connect-Sets enthalten überwiegend das fluorierte Kältemittel R32 — die Installationsklausel des Anbieters vor dem Kauf lesen.

**Zur Luftfeuchte:** Wiederholt über 60 % relative Raumluftfeuchte ist ein Anlass zum Messen und zur Ursachenprüfung, keine feste Schimmelgrenze. An kalten Oberflächen kann die relative Feuchte höher sein; Werte darunter garantieren keinen Schutz.

**Zu den Liter-Angaben:** Liter/Tag nur zusammen mit der angegebenen Prüftemperatur und Feuchte vergleichen. Die Grundfläche allein bestimmt keine passende Kapazität; kein pauschaler Umrechnungsfaktor.

## Leiter 1 — Kühlleistung nach Raumgröße

| Raumgröße | Kühlleistung | Typischer Raum | Ratgeber |
| --- | --- | --- | --- |
| 10 m² | 5.000–7.000 |  | Seite |
| 15 m² | 7.000–9.000 |  | Seite |
| 20 m² | 9.000 |  | Seite |
| 25 m² | 10.000–12.000 |  | Seite |
| 30 m² | 12.000–13.000 |  | Seite |
| 40 m² | 14.000+ / Split |  | Seite |

## Entfeuchter — Bedingungen vor der Kapazität prüfen

Die folgenden Zeilen ordnen Ratgeber nach Raumfläche zu, nicht Liter pro Tag. Die [Entscheidungshilfe mit Hersteller-Quellen](https://getecoback.com/guide/luftentfeuchter-ratgeber.html#eb-moisture-choice) führt von Messwerten zur nächsten Prüfung.

| Raumgröße | Prüfhinweis statt Kapazitätswert | Typischer Raum | Ratgeber |
| --- | --- | --- | --- |
| 10 m² | Nicht aus der Grundfläche ableitbar: Temperatur, Feuchte und Feuchtelast prüfen | Bad oder kleiner Raum | Seite |
| 15 m² | Nicht aus der Grundfläche ableitbar: Temperatur, Feuchte und Feuchtelast prüfen | Schlaf- oder Arbeitszimmer | Seite |
| 20 m² | Nicht aus der Grundfläche ableitbar: Temperatur, Feuchte und Feuchtelast prüfen | Wohnzimmer oder Schlafzimmer | Seite |
| 25 m² | Nicht aus der Grundfläche ableitbar: Temperatur, Feuchte und Feuchtelast prüfen | größeres Wohnzimmer | Seite |
| 30 m² | Nicht aus der Grundfläche ableitbar: Temperatur, Feuchte und Feuchtelast prüfen | offener Wohnbereich | Seite |
| 40 m² | Nicht aus der Grundfläche ableitbar: Temperatur, Feuchte und Feuchtelast prüfen | Keller oder sehr großer Raum | Seite |

## Leiter 3 — Heizleistung nach Raumgröße

| Raumgröße | Watt | Typischer Raum | Ratgeber |
| --- | --- | --- | --- |
| 10 m² | 600–800 | kleines Büro oder Badezimmer | Seite |
| 15 m² | 900–1.200 | Arbeitszimmer oder kleines Wohnzimmer | Seite |
| 20 m² | 1.200–1.600 | Wohnzimmer oder Schlafzimmer | Seite |
| 25 m² | 1.500–2.000 | größeres Wohnzimmer | Seite |
| 30 m² | 1.800–2.400 | offener Wohnbereich | Seite |
| 40 m² | 2.400–3.200 | sehr großer oder offener Raum | Seite |
| 50 m² | 3.000–4.000 | sehr großer offener Bereich | Seite |

## So zitierst du den Datensatz

CC BY 4.0 verlangt genau eine Sache: die Quelle nennen. Fertig zum Kopieren, für eine Website:

<p>Daten: <a href="https://getecoback.com/daten.html">EcoBack Raumklima-Dimensionierungsdaten</a>,
Stand 2026-11-06, <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></p>
Und als Textzeile, für alles andere:

EcoBack (getecoback.com): EcoBack Raumklima-Dimensionierungsdaten. Stand 2026-11-06. CC BY 4.0. https://getecoback.com/daten.html

## Download

- [https://getecoback.com/sizing-data.json](https://getecoback.com/sizing-data.json) — JSON, vollständig, mit den Hinweistexten

- [https://getecoback.com/sizing-data.csv](https://getecoback.com/sizing-data.csv) — CSV im Langformat (24 Zeilen), direkt in Tabellen­kalkulation und Pandas

Beides ohne Schlüssel, ohne Anmeldung, ohne Abfrage­begrenzung.

**Datenformat 2:** Version 2 ersetzt mould_threshold_rh_percent durch humidity_review_rh_percent: ein Prüfsignal, keine Schimmelgrenze. Die bisherigen dehumidifier_l_per_day-Zeilen und liters_per_day-Textfelder bleiben erhalten, enthalten aber keine aus der Grundfläche abgeleiteten Kapazitäten mehr.

## Woher die Zahlen kommen, und was sie nicht sind

Es sind **Faustregeln und Prüfhinweise**, keine Messwerte und keine Norm. Die Kühl- und Heizwerte stammen aus den Ratgebern dieser Website. Für Entfeuchter müssen Herstellerwerte bei passender Temperatur und Feuchte verglichen werden; die Fläche allein reicht nicht. Wer eine belastbare Auslegung für ein konkretes Gebäude braucht, rechnet nach Norm oder fragt einen Fachbetrieb — dafür sind Faustregeln nicht gedacht.

Wir testen keine Geräte selbst und geben keine Rechtsberatung. Wie wir arbeiten und womit wir Geld verdienen, steht auf [Wie wir empfehlen](https://getecoback.com/wie-wir-empfehlen.html) und [Über uns](https://getecoback.com/ueber-uns.html).

---
Maschinenlesbare Übersicht: https://getecoback.com/for-agents.html · Sizing-Datensatz (CC BY 4.0): https://getecoback.com/sizing-data.json
MCP-Server für Assistenten: https://getecoback.com/mcp
Hinweis: Redaktionelle Einordnung anhand der verlinkten Quellen, keine eigenen Gerätetests. Die Website finanziert sich über Amazon-Affiliate-Links auf den HTML-Seiten — diese Markdown-Ansicht enthält bewusst keine.
