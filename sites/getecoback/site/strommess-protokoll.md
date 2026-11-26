# Stromverbrauch messen: Protokoll und Jahreskosten | EcoBack

> Gemessene Kilowattstunden statt Typenschild-Watt: Verbrauch auf Betriebstage hochrechnen, Messprotokoll herunterladen und Stromfresser prüfen.

Canonical (HTML, zitierfähig): https://getecoback.com/strommess-protokoll.html

Die EcoBack Haushaltswerkstatt
Finde große Verbraucher mit einer nachvollziehbaren Messung. Rechne deinen beobachteten Verbrauch hoch und halte die Annahmen fest.
[Mit eigenen Werten rechnen](https://getecoback.com/strommess-protokoll.html#calculator) EcoBack Redaktion · 19. September 2026

**Energie** 1,2 kWh im Beispiel
**Zeit** 48 Stunden gemessen
**Vergleichswert** 0,6 kWh je 24 Stunden

## Mit deinen Werten rechnen
Die vorbelegten Zahlen sind frei gewählte Rechenbeispiele, keine Produktmessungen oder aktuellen Stromtarife. Ersetze sie durch deine Werte.
Noch kein kWh-Messwert? Prüfe [Messbereich und Anzeigeauflösung](https://getecoback.com/strommess-protokoll.html#kleine-lasten-messen) deines Steckdosenmessgeräts. Für die Messung per App kannst du auf unserer Schwesterseite The Doll Scout Messsteckdosen mit und ohne Matter vergleichen.
Beispiel: 1,2 kWh in 48 Stunden = 0,6 kWh pro Tag. Bei 365 vergleichbaren Betriebstagen: 219 kWh und 76,65 € im Jahr.
Eingaben werden lokal im Browser verarbeitet und nicht gespeichert oder als Messwerte übertragen. Ein Rechenaufruf wird ohne Eingabewerte gezählt.
Für eigene Berechnungen ist JavaScript nötig. Der Rechenweg und das Beispiel darunter funktionieren auch ohne JavaScript.

## Kleine Standby-Lasten messen: Was bedeuten 0 W und 0,00 kWh?

**Prüfe zuerst die untere Messgrenze des konkreten Geräts.** 0 W ist eine momentane Leistungsanzeige. 0,00 kWh ist der abgelesene kumulierte Zählerstand. Wenn das Messgerät die kleine Last nicht zuverlässig erfasst, kann auch nach langer Zeit 0 stehen.

**Messdauer planen:** Anzeigeschritt in kWh × gewünschte Schritte × 1.000 ÷ erwartete konstante Leistung in W. Bei 0,5 W und einem Anzeigeschritt von 0,01 kWh sind das rechnerisch 20 Stunden für einen Schritt und 60 Stunden für drei. Vorausgesetzt, das Messgerät erfasst 0,5 W und integriert durchgehend. Ein kleinerer Anzeigeschritt allein verspricht keine bessere Genauigkeit.

**Unveränderte Anzeige einordnen:** Bleibt der kumulierte Zähler bei einem Schritt von 0,01 kWh fünf Stunden lang unverändert, liegt die erfasste mittlere Leistung rechnerisch unter etwa 2 W. Das setzt eine dokumentierte Erfassung dieser Last, eine durchlaufende Messung ohne Reset und das passende Anzeigeverhalten voraus. Zusätzlicher Messfehler ist in der Grenze nicht enthalten. Prüfe außerdem, ob die App einen Kalendertag oder ein rollendes Zeitfenster zeigt.

### Zwei Herstellerangaben richtig lesen

- [Brennenstuhl PM 231 E, Artikel 1506600](https://www.brennenstuhl.com/de-DE/produkte/reise-steckdosenadapter/primera-line-energiemessgeraet-pm-231-e): Der [Hersteller-Service](https://service.brennenstuhl.com/hc/de/articles/8867312023453) nennt einen Leistungsbereich von 0,2 bis 3.600 W, eine Genauigkeit von ±1 % oder ±0,2 W sowie unter 0,5 W eigenen Verbrauch ohne benannten Betriebszustand. Der untere Bereichswert und der mögliche Fehler sind verschiedene Angaben.

- [TP-Link Tapo P110 V1, deutsche Einzelpackung](https://www.tp-link.com/de/home-networking/smart-plug/tapo-p110/v1%20%281-pack%29/): Die technischen Daten nennen für die Steckdose selbst 0,64 W bei geöffnetem Relais und 1,64 W als Maximalwert bei geschlossenem Relais. Eine Messuntergrenze für die angeschlossene Last gibt diese Produktseite nicht an. Aus dem Eigenverbrauch lässt sich die Messuntergrenze nicht ablesen.

**Erst ausleihen, dann bei Bedarf auswählen:** Frag deine örtliche Bibliothek nach einem Strommessgerät. Das [Umweltbundesamt beschreibt den kostenlosen Verleih in teilnehmenden Bibliotheken](https://www.umweltbundesamt.de/themen/klima-energie/energiesparen/energiesparen-im-haushalt/energiesparpaket-in-bibliotheken). Lass dir vorab Modell und Eignung für kleine Lasten bestätigen. Mit einem verlässlichen kWh-Messwert kannst du [oben die Kosten berechnen](https://getecoback.com/strommess-protokoll.html#calculator).

Herstellerangaben und Verleihhinweis am 26. November 2026 geprüft. Rechenbeispiele und veröffentlichte Spezifikationen, keine eigenen Gerätetests.

## Ein Messplan für drei verschiedene Geräte

| Gerät | Was du misst | Warum die Momentaufnahme täuscht |
| --- | --- | --- |
| Kühlschrank | Mehrere vollständige Tage im üblichen Alltag | Der Kompressor läuft nicht durchgehend; Türöffnungen und Raumtemperatur verändern den Verbrauch. |
| Entfeuchter | Einen typischen Betriebstag bei notierter Feuchte und Zielvorgabe | Hygrostat und wechselnde Feuchtelast verändern die Laufzeit. |
| Trockner | Einen vollständigen Durchgang einschließlich Abkühlphase | Einzelne Lastspitzen sagen wenig über die Energie je Wäscheladung. |

## So füllst du das Protokoll aus

- Notiere Gerät, Datum und normalen Einsatz. Keine Seriennummer oder Adresse erforderlich.
- Nutze nur ein für den Anschluss und die Last geeignetes Messgerät gemäß Herstelleranleitung. Keine Arbeiten an offenen Leitungen oder fest angeschlossenen Geräten.
- Lies die Differenz des kWh-Zählers und die verstrichene Zeit ab. Wiederhole bei ungewöhnlicher Nutzung oder anderen Jahreszeiten.
- Trage oben deine realistischen Betriebstage ein. Bei Geräten mit einzelnen Zyklen ist ein Vergleich pro vollständiger Nutzung sinnvoller als eine 24-Stunden-Hochrechnung.
[Messprotokoll herunterladen](https://getecoback.com/downloads/haushalt-messprotokoll.csv)

## Formel und Unsicherheit
kWh je 24 Stunden = gemessene kWh ÷ Messstunden × 24. Jahreskosten = Tagesverbrauch × Betriebstage × Strompreis. Kurze Messungen, ein leerer Kühlschrank oder ungewöhnliche Außentemperaturen ergeben keine belastbare Jahresprognose. Der Rechner verlängert nur deinen beobachteten Durchschnitt.

## Wann lohnt sich ein neues Gerät?
Ein hoher Verbrauch ist ein Anlass zum Prüfen, kein automatischer Kaufgrund. Erst Nutzung und Wartung ansehen, dann beim [Austauschrechner](https://getecoback.com/geraete-austausch-rechner.html) Anschaffung und Stromkosten gemeinsam rechnen. Weitere Maßnahmen: [Strom sparen im Haushalt](https://getecoback.com/guide/strom-sparen-haushalt.html).

## Dein nächster Schritt
[Zur Haushaltswerkstatt](https://getecoback.com/wohnkosten-werkstatt.html) · [Wie wir empfehlen](https://getecoback.com/wie-wir-empfehlen.html)

## Welcher Messwert gehört zu Aus, Bereitschaft oder vernetzter Bereitschaft?

Halte Uhrzeit, Anzeige, Hauptfunktion, laufende Abkühlung und nachgewiesene Netzwerkreaktivierung getrennt fest. Eine einfache Statusleuchte kann etwas anderes bedeuten als eine ständig angezeigte Uhr. Ein WLAN-Symbol allein belegt keine Reaktivierung über ein externes Netzwerksignal. Ein noch laufender Hauptvorgang gehört zu einer eigenen Beobachtung.

Das deutsche Herstellerblatt für Miele H 7460 BP Edelstahl/CleanSteel (11105690) nennt 0,3 W für Aus, 0,8 W für Bereitschaft und 2 W für vernetzte Bereitschaft. Es nennt drei zugehörige automatische Umschaltangaben von jeweils 20 Minuten. Diese Werte sind Ausgangspunkte zur Zuordnung eines beobachteten Zustands. Die drei Zeitangaben sind keine aufeinanderfolgenden Abschnitte.

Die EU-Verordnung 2023/826 gilt seit dem 9. Mai 2025. Der deutsche Stand vom 24. November 2025 unterscheidet in Artikel 2 und den Anhängen die Zustände und Produktgruppen. Für erfasste Geräte nennt Anhang III für Aus 0,50 W und ab dem 9. Mai 2027 0,30 W, für einfache Reaktivierungsbereitschaft 0,50 W, für kontinuierliche Informations- oder Statusanzeige 0,80 W und für vernetzte Bereitschaft ohne HiNA 2,00 W. Für bestimmte HiNA-Geräte gelten andere Zeilen. Nicht vernetzte Kaffeemaschinen haben nach Art der Kanne oder Gerätegruppe besondere Umschaltzeiten von 5, 40 oder 30 Minuten. Prüfe dafür den exakten Geltungsfall. Haushaltsgeschirrspüler und Wäschegeräte unter eigenen Ökodesign-Regeln brauchen ihre jeweils passende Grundlage.

Beurteile bei eigenen Messungen die passende Betriebsart, die tatsächliche Beobachtungsdauer und den Bedarf an der genutzten Funktion. Ein Gerätevergleich braucht kompatible Zustände. Eine einzelne Haushaltsmessung ist keine Konformitätsprüfung.

Quellen, gelesen am 20.11.2026. [Miele H 7460 BP 11105690](https://www.miele.de/product/11105690/backofen-h-7460-bp-edelstahl-cleansteel) · [Miele deutsches Produktblatt](https://media.miele.com/downloads/e-/de/FS_11105690_DED_DE-de-DE.pdf) · [EU 2023/826, Artikel 2 und Anhänge](https://eur-lex.europa.eu/eli/reg/2023/826/oj/deu/pdf) · [Deutsches Original als PDF beim EU-Publikationsamt](https://publications.europa.eu/resource/cellar/7ab9b082-dd82-11ed-a05c-01aa75ed71a1.0004.01/DOC_1) · [EU 2025/2262, Änderungsverordnung](https://eur-lex.europa.eu/eli/reg/2025/2262/oj/deu/pdf). Konsolidierter Lesestand CELEX 02023R0826-20251124.

---
Maschinenlesbare Übersicht: https://getecoback.com/for-agents.html · Sizing-Datensatz (CC BY 4.0): https://getecoback.com/sizing-data.json
MCP-Server für Assistenten: https://getecoback.com/mcp
Hinweis: Redaktionelle Einordnung anhand der verlinkten Quellen, keine eigenen Gerätetests. Die Website finanziert sich über Amazon-Affiliate-Links auf den HTML-Seiten — diese Markdown-Ansicht enthält bewusst keine.
