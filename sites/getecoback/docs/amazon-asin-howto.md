# Von der Suchseite auf die Produktseite — 10 Minuten, einmalig

## Warum das die größte Einzelverbesserung ist

Stand 2026-08-13: **40 von 40 gemessenen Affiliate-Klicks landen auf einer Amazon-
Suchergebnisseite**, keiner auf einer Produktseite. Das ist kein Versehen, sondern die
Folge einer Kette: Produktlinks brauchen die ASIN, ASINs sauber zu beziehen braucht
PA-API, und PA-API wird erst nach den ersten drei Verkäufen freigeschaltet. Also linkt
die Seite bisher per Modellnamen-Suche — ehrlich, aber teuer.

Was es kostet: Der Leser klickt in dem Moment, in dem er kaufen will, und landet auf
einer Liste. Er muss ein zweites Mal auswählen und ein zweites Mal klicken. Jeder
Zwischenschritt an dieser Stelle halbiert die Conversion grob — und das 24-Stunden-
Cookie läuft ab dem ersten Klick, nicht ab der Produktseite.

Das ist der einzige große Hebel, der **kein zusätzlicher Traffic** ist. Alles andere
(mehr Inhalte, bessere Rankings) dauert Monate; das hier dauert zehn Minuten.

## Was zu tun ist

Für jedes Modell einmal die Produktseite auf amazon.de öffnen und die ASIN ablesen —
sie steht in der URL zwischen `/dp/` und dem nächsten `/`, und außerdem unten in den
Produktdetails („ASIN"). Sie sieht immer so aus: **B0XXXXXXXX** (B + 9 Zeichen).

Beispiel: `https://www.amazon.de/dp/B08CXHW9WL/ref=...` → ASIN ist `B08CXHW9WL`.

Dann in `tools/build_structure.py` in der Tabelle `MODEL_ASIN` den leeren String
durch die ASIN ersetzen:

```python
MODEL_ASIN = {
    "De'Longhi Pinguino PAC EX105": "B08CXHW9WL",   # <- so
    "Comfee MPPH-09CRN7": "",                        # <- noch offen, bleibt Suchlink
    ...
}
```

Beim nächsten Deploy ersetzt der Injektor alle Karten, Top-Pills und Exit-Prompts
dieses Modells automatisch durch `amazon.de/dp/<ASIN>?tag=getecoback-21`.

## Sicherheitsnetze

- **Leer lassen ist erlaubt.** Ein leeres Feld heißt „wissen wir nicht" — die Seite
  fällt automatisch auf den bisherigen Suchlink zurück. Nichts geht kaputt, wenn nur
  die Hälfte gefüllt ist.
- **Falsches Format wird ignoriert.** Nur `B` + 9 Zeichen (Großbuchstaben/Ziffern)
  wird akzeptiert; alles andere fällt ebenfalls auf die Suche zurück.
- **Nicht raten.** Eine erfundene ASIN führt auf ein fremdes oder totes Produkt —
  schlimmer als die Suchseite. Lieber leer lassen.
- **Modell nicht mehr lieferbar?** ASIN wieder auf `""` setzen; der Suchlink findet
  dann den Nachfolger.

## Was danach messbar sein muss

`affiliate_click` bleibt gleich, aber das Ziel ändert sich. Die Kontrolle:

```sql
SELECT SUM(CASE WHEN json_extract(meta,'$.link_url') LIKE '%/dp/%' THEN 1 ELSE 0 END) produktseite,
       SUM(CASE WHEN json_extract(meta,'$.link_url') LIKE '%/s?k=%' THEN 1 ELSE 0 END) suchseite
FROM ev WHERE name='affiliate_click' AND day >= date('now','-28 day');
```

Erwartung nach dem Befüllen: Der Anteil `produktseite` steigt auf den Anteil der
Klicks, die auf benannte Modelle entfallen. Ob daraus mehr Verkäufe werden, zeigt
allein das PartnerNet-Dashboard — das ist die einzige Zahl, die diese Seite nicht
selbst messen kann.
