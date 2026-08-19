# Sollte getecoback.com auf Tool-Abo umstellen? — Prüfung 2026-08-14

Anlass: Nach ~40 Tagen im 180-Tage-Fenster ist **noch kein Amazon-Verkauf** verbucht
(Owner-Beobachtung; das PartnerNet-Dashboard ist die einzige Quelle dafür und liegt
nicht in dieser Umgebung). Frage: Auf ein Tool-/Widget-Abo umstellen?

## 1. Executive Summary

**Empfehlung: nicht umstellen — aber nicht aus Loyalität zum Affiliate-Modell, sondern
weil beide Modelle mit den aktuellen Zahlen ununterscheidbar sind.**

Die entscheidende Zahl ist nicht „0 Verkäufe". Sie ist: **`/widgets.html`,
`/fuer-betriebe.html`, `/tools.html` und `/mcp.html` haben zusammen null Seitenaufrufe
— nie einen einzigen.** Jedes B2B-Signal (`embed_copy`, `b2b_intent`, `lead_intent`,
`outbound_choice`) steht bei 0, aber das ist **kein Nein des Marktes**, sondern die
Aussage, dass das Angebot nie gesehen wurde. Ein Wechsel auf ein Modell mit *null*
Datenpunkten, weg von einem Modell mit ~50 Datenpunkten, wäre ein Rückschritt in der
Erkenntnis, kein Fortschritt.

Extern spricht die Preisrecherche zusätzlich gegen das 19–49 €/Monat-Preisschild.

## 2. Key Findings

### 2.1 Der Markt für einbettbare Rechner ist bereits kostenlos oder billig

| Anbieter | Preis | Was er kann |
|---|---|---|
| involve.me | $5 / $14 / $44 pro Monat | generischer Rechner-Baukasten, Lead-Mails |
| ConvertCalculator | ab ~$18/Monat | generisch, Branding-Entfernung im höheren Tarif |
| Calconic | Gratis-Tarif mit Branding, bezahlt ab ~$19 | generisch |
| Outgrow | ab $55/Monat | Rechner **mit Lead-Generierung**, CRM-Anbindung |
| solaranlage-tipps.de, pv-berechnung.de, solar.red | **kostenlos** | fertige deutsche Solar-/Strom-Rechner zum Einbetten |

Zwei Schlüsse daraus. Erstens: In genau unserer Nische (deutsche Energie-Rechner zum
Einbetten) ist der **Marktpreis null** — mehrere Seiten verschenken das, weil es
Linkbait ist. Genau dafür haben wir unsere Widgets auch gebaut. Zweitens: Der einzige
Anbieter mit deutlich höherem Preis (Outgrow, $55) verkauft nicht „Rechner", sondern
**Leads**. Das ist das Feature, für das bezahlt wird.

**Und das ist das Unangenehme:** Unser Konfigurator gibt genau dieses Feature bereits
kostenlos her — „Ergebnis-Button auf die eigene Kontaktseite" ist Lead-Erfassung. Wir
haben das Bezahlbare verschenkt und das Kostenlose (die Rechenlogik) behalten.

Zahlungsbereitschaft ist grundsätzlich da: Für Handwerker-Websites werden 2026 allein
für Wartung **ab 75 €/Monat** angesetzt. Das Budget existiert — nur nicht für etwas,
das nebenan gratis steht.

### 2.2 Intern ist nichts getestet worden — auch nicht das, was ich für getestet hielt

Erhoben aus D1 (gesamte Zeitreihe, CI ausgeschlossen):

| Signal | Wert | Lesart |
|---|---|---|
| `page_view` auf /widgets.html, /fuer-betriebe.html, /tools.html, /mcp.html | **0** | Das Angebot wurde nie aufgerufen |
| `embed_copy` | 0 | kein Ablehnungssignal — siehe Zeile darüber |
| `b2b_intent`, `lead_intent`, `outbound_choice`, `subscribe`, `share`, `mcp_install_click` | je 0 | dito |
| `widget_view` | 4 | Widget-Seiten selbst, keine Fremddomain |
| `affiliate_click` | ~40 in 9 Tagen, Klickrate 30–46 % an guten Tagen | einziger Kanal mit echten Beobachtungen |

Die Seiten sind **nicht** unauffindbar: alle vier stehen in der sitemap.xml und sind
aus 65–148 Seiten im Footer verlinkt. Sie bekommen keinen Besuch, weil die Website
insgesamt ~25 Seitenaufrufe pro Tag hat und niemand davon nach einem B2B-Angebot sucht.

### 2.3 „Kein Verkauf" ist bei diesem Klickvolumen die Erwartung, nicht die Anomalie

~50 Klicks, **alle auf Amazon-Suchergebnisseiten** statt auf Produktseiten (ASIN-Sperre
via PA-API, siehe `docs/amazon-asin-howto.md`). Selbst mit lehrbuchmäßigen
Conversion-Raten liegt der Erwartungswert bei **unter einer Bestellung**. Für 3 Verkäufe
braucht es grob **150–300 Klicks**. Das Modell ist an dieser Stelle nicht widerlegt —
es ist unterprüft.

## 3. Implications

1. **Der Engpass ist nicht das Geschäftsmodell, sondern die Anzahl der Beobachtungen.**
   Bei 25 Aufrufen/Tag lässt sich *kein* Monetarisierungsmodell prüfen — weder Abo noch
   Affiliate. Wer bei dieser Datenlage das Modell wechselt, tauscht eine halb geprüfte
   Hypothese gegen eine ungeprüfte.
2. **Ein Widget-Abo zu 19–49 €/Monat ist gegen Gratis-Alternativen schwer verkäuflich.**
   Falls dieser Weg je verfolgt wird, dann nicht als „Rechner-Miete", sondern über das,
   was Outgrow verkauft: qualifizierte Leads.
3. **Das dritte Strategie-Redesign in zehn Tagen wäre selbst das Risiko.** 08-05 wurde
   auf B2B umgeschwenkt (nie ausgeführt), 08-13 auf Link-Ziele + B2B (Ausführung beim
   Owner), jetzt Tool-Abo. Nicht ausgeführte Pivots kosten mehr als ein mittelmäßiger,
   aber laufender Plan.

## 4. Risks & Counterarguments

- **Gegenargument:** Vielleicht kommen die 150–300 Klicks nie. — Berechtigt. Deshalb
  unten ein Datum, an dem das Affiliate-Modell fällt, statt es unbegrenzt laufen zu lassen.
- **Gegenargument:** Das Abo braucht keinen Traffic, es braucht 3 Kunden. — Stimmt, aber
  der erste Kontakt muss in Deutschland telefonisch oder per Brief erfolgen (Kaltmail
  ist nach § 7 UWG unzulässig), und Zahlungsabwicklung (Stripe o. Ä.) verlangt KYC.
  **Beides liegt beim Owner.** Ein Abo-Modell ist damit nicht „weniger blockiert" als
  das jetzige, sondern anders blockiert.
- **Unsicherheit:** Verkaufszahlen sind Owner-Beobachtung; diese Umgebung sieht sie nicht.
  Sollte die PartnerNet-Zahlungs-/Steuerangabe unvollständig sein, würden Verkäufe
  ohnehin nicht zugerechnet — das ist die billigste Prüfung von allen.

## 5. Recommendation

**Nicht umstellen. Stattdessen dem laufenden Modell einen fairen, terminierten Test geben.**

1. **Weiter auf Reichweite** (das Einzige, was ohne Owner läuft): Inhalte, EN-Ausbau,
   Herbst-/Heizen-Cluster. EN konvertiert mit Abstand am besten und hat 27 statt 103 Seiten.
2. **Vorregistrierte Widerlegung — Datum statt Gefühl:** Wenn bis **2026-10-15** kumuliert
   **≥200 Affiliate-Klicks** erreicht sind und weiterhin **0 Verkäufe** verbucht wurden,
   ist die Conversion-Annahme widerlegt und das Affiliate-Modell wird aufgegeben. Werden
   die 200 Klicks bis dahin *nicht* erreicht, ist die Reichweite widerlegt — dann ist der
   richtige Schluss ebenfalls ein Wechsel, aber aus dem anderen Grund.
3. **Tool-Abo bleibt liegen, nicht begraben.** Wieder aufnehmen, sobald ein echtes Signal
   existiert: `embed_copy ≥ 3` oder eine fremde Domain in `widget_view`. Vorher ist jede
   weitere Stunde daran Arbeit an einem Angebot, das noch niemand gesehen hat.
4. **Owner-Aktionen, unverändert und nach Aufwand sortiert:** PartnerNet-Zahlungsdaten
   prüfen (2 Minuten, entscheidet ob Verkäufe überhaupt zählen) → ASINs eintragen
   (10 Minuten, verdoppelt plausibel die Conversion je Klick) → erst danach die Frage,
   ob 20 telefonische B2B-Kontakte gewollt sind.

## 6. Sources

- involve.me, „10 Best Online Calculator Builders in 2026" — https://www.involve.me/blog/best-calculator-builders
- Outgrow, „Best Calculator Builders for Lead Generation 2026" — https://outgrow.co/blog/best-calculator-builders-lead-generation-2026
- Capterra, Calconic Pricing 2026 — https://www.capterra.com/p/184774/Calconic/pricing/
- Solaranlage-Tipps, kostenlose Solar-Rechner-Widgets — https://www.solaranlage-tipps.de/widgets
- PV-Berechnung.de (kostenfrei, ohne Registrierung) — https://www.pv-berechnung.de/
- BlackForest-WebCraft, „Handwerker-Website Kosten 2026" — https://blackforest-webcraft.de/blog/handwerker-website-kosten-2026/
- Eigene Daten: Cloudflare D1 `ecoback-events`, Abfragen vom 2026-08-14 (siehe
  `docs/analytics-first-party-d1.md` für die Abfragen)
