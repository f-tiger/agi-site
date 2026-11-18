# Richtig lüften im Winter: gekippt oder kurz weit auf?

> Lüften bei Regen? Bei 20 °C und 50 % drinnen kann Außenluft mit 5 °C und 90 % trocknen. Bei 14 °C und 95 % bringt sie Feuchte herein. Zwei Rechenbeispiele.

Canonical (HTML, zitierfähig): https://getecoback.com/guide/richtig-lueften-im-winter.html

Live-Daten auf dieser Seite (stündlich, JavaScript-gerendert, in dieser Markdown-Ansicht nicht enthalten): https://getecoback.com/api/feuchte

Sind die Scheiben morgens innen nass? Miss zuerst Raumtemperatur und Luftfeuchte. Eine kalte Scheibe kann beschlagen, auch wenn die übrige Wohnung trocken erscheint.

**Kurze Antwort:** Zum Trocknen hilft Luftaustausch, wenn die Außenluft bei gleicher Temperatur weniger Wasserdampf enthält als die Raumluft. Vergleiche möglichst gleichzeitig gemessene Temperatur und relative Feuchte auf beiden Seiten des Fensters. Die Regenanzeige allein reicht dafür nicht.

## Erst messen: Hilft Lüften gerade gegen Feuchte?
Vier Messwerte statt einer vorschnellen Kaufempfehlung. Nutze möglichst gleichzeitig gemessene Innen- und Außenwerte. Keine Werte zur Hand? Erst messen – keine Schätzung als persönliche Empfehlung.
Fiktives Beispiel ausprobieren

###

Wenn die Feuchte wieder steigt: Temperatur und Feuchte nach dem Wiederaufwärmen erneut messen. Kochen, Duschen, Wäsche und die Nutzung des Raums getrennt notieren. Ein Anstieg allein beweist weder einen Bauschaden noch falsches Lüften.
Eigene Messung auf diesem Gerät speichern
Meine Messreihe: vorher und nachher vergleichenBis zu 30 Messungen bleiben ausschließlich in diesem Browser. Kein Konto, keine Cloud-Synchronisierung. Auf gemeinsam genutzten Geräten anschließend löschen. Nicht ohne Raum- und Nutzungskontext vergleichen.

Messreihe als CSV herunterladen Lokale Messreihe löschen

### Wann ein Gerät überhaupt infrage kommt
Bleibt erhöhte Feuchte trotz geeigneter Maßnahmen bestehen, zuerst die Ursache klären. Vergleiche danach Einsatztemperatur, Geräusch, Entwässerung und Strombedarf; die Raumfläche allein reicht nicht. [Kauf oder Nichtkauf prüfen](https://getecoback.com/guide/luftentfeuchter-ratgeber.html#eb-moisture-choice) · [Betriebskosten berechnen](https://getecoback.com/guide/luftentfeuchter-dauerbetrieb-stromkosten.html).
Rechenweg und GrenzenMagnus-Näherung über Wasser: eₛ(T) = 6,112 × exp(17,62 × T / (243,12 + T)); Außenluft bei Innentemperatur: 100 × eₛ(T außen) × rF außen / 100 / eₛ(T innen). Gleicher Luftdruck angenommen. Unter 0 °C ist die Näherung gegenüber Eis ungenauer. Ein Abstand von mehr als fünf Prozentpunkten ist eine vorsichtige Entscheidungsregel, keine Sicherheitsgrenze. Luftwechsel, Feuchtenachschub, Wandtemperaturen und Sensorfehler werden nicht modelliert. Das Ergebnis diagnostiziert keinen Schimmel und garantiert weder Trocknung noch Heizkostenersparnis.
Fachlicher Hintergrund: [Verbraucherzentrale: Heizen und Lüften](https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/heizen-und-lueften-so-gehts-richtig-10426) (geprüft am 04.11.2026). Raumwerte werden nicht an die Statistik übertragen; gezählt werden nur feste Aktionen, sofern Statistik erlaubt ist.
Ohne JavaScript: Temperatur und Feuchte innen und außen notieren, Feuchtequellen prüfen und den verlinkten Lüftungsratgeber nutzen. Aus einem einzelnen Prozentwert folgt kein Gerätekauf.

## Entscheidend ist die kalte Ecke, nicht der Raum

Das Hygrometer im Regal misst die Luft in der Raummitte. Dort wächst kein Schimmel. Er wächst an der kältesten Fläche im Raum: an der Fensterlaibung, am Sturz, in der Außenwandecke, hinter dem Kleiderschrank.

Der Grund ist, dass sich relative Luftfeuchte immer auf die Temperatur bezieht. Dieselbe Luft ist, abgekühlt, näher an der Sättigung. Deshalb kann Raumluft mit einem völlig unauffälligen Wert in der Raummitte an einer kalten Fläche bereits im kritischen Bereich ankommen:

- Raumluft mit **20 °C und 50 % relativer Feuchte** — angenehm, am Hygrometer nichts zu sehen — erreicht an einer **14 °C kalten Wandfläche rund 73 %**.

- Sporen keimen ab etwa **70–80 % relativer Feuchte direkt an der Oberfläche**, und die ist damit überschritten.

- Bei **20 °C und 60 %** liegt der Taupunkt bei rund **12 °C**: Jede Fläche, die kälter ist, sammelt flüssiges Wasser, nicht nur Feuchte.

Ein stundenlang gekipptes Fenster kann Rahmen und Laibung auskühlen. An einer kalten Fläche kann sich Feuchte halten. Eine einzelne Messung weist die Ursache von Flecken am Rahmen nicht nach.

## Wann trocknet Außenluft die Wohnung?

Regen draußen und hohe relative Luftfeuchte schließen eine Trocknungswirkung nicht aus. Rechne die Außenluft auf die Temperatur des Zimmers um und vergleiche mit dem gemessenen Innenwert.

| Draußen | Tatsächlich enthaltenes Wasser | Dieselbe Luft bei 20 °C drinnen |
| --- | --- | --- |
| −5 °C bei 90 % rF | ≈ 3,1 g/m³ | ≈ 16 % rF |
| 0 °C bei 80 % rF | ≈ 3,9 g/m³ | ≈ 21 % rF |
| 5 °C bei 80 % rF | ≈ 5,4 g/m³ | ≈ 30 % rF |
| 10 °C bei 80 % rF | ≈ 7,5 g/m³ | ≈ 42 % rF |

Gerechnet mit der Magnus-Formel für den Sättigungsdampfdruck, der üblichen Näherung in der Bauphysik. Relative Feuchte ist das Verhältnis des tatsächlich vorhandenen Wasserdampfs zu dem, was die Luft bei dieser Temperatur aufnehmen könnte — erwärmt man Luft, ohne Wasser zuzugeben, sinkt dieses Verhältnis: Außenluft mit 0 °C und 80 % behält ihren Dampfdruck und liegt bei 20 °C drinnen bei rund 21 %. Die Spalte in Gramm pro Kubikmeter ist, was diese Außenluft physikalisch mit sich trägt. Nachrechnen ausdrücklich erwünscht — [so arbeiten wir](https://getecoback.com/wie-wir-empfehlen.html#nachrechnen).

Zwei Rechenbeispiele mit derselben Raumluft: **20 °C und 50 % relative Feuchte**.

- **Draußen 5 °C und 90 %:** Auf 20 °C erwärmt hat die Außenluft rund **34 %** relative Feuchte. Der Luftaustausch kann Feuchte aus dem Zimmer abführen.

- **Draußen 14 °C und 95 %:** Bei 20 °C entspricht das rund **65 %**. Für dieses Zimmer bringt der Luftaustausch mehr Feuchte herein.

Die Rechnung vergleicht zwei Luftproben bei gleichem Druck. Wie sich das ganze Zimmer verändert, hängt auch von Luftwechsel, feuchter Wäsche und kalten Flächen ab. Lüftungsanlagen nach Anleitung betreiben und vorgesehene Zu- und Abluftöffnungen frei halten. Bei dauerhaft nassen Stellen oder Leckagen die Ursache klären. [Verbraucherzentrale: Heizen und Lüften](https://www.verbraucherzentrale.de/wissen/energie/strom-sparen/heizen-und-lueften-so-gehts-richtig-10426).

Bleibt die Wäsche drinnen, vergleiche die [Kosten für dieselbe vollständig getrocknete Ladung](https://getecoback.com/waeschetrockner-oder-luftentfeuchter.html#laundry-check) mit deinem Tarif. Genügen Wäscheständer und Lüftung, kannst du sie weiter nutzen.

## Die eigene kalte Stelle prüfen

Mit einem Infrarot-Thermometer die kälteste Stelle suchen, die zu finden ist — Laibung, Außenwandecke, die Wand hinter einem Möbelstück — und die drei Zahlen hier eintragen.

Kondensiert es an dieser Wand?

Raumtemperatur (°C)
Raumfeuchte (% rF)
Kälteste Fläche (°C)

Fläche prüfen

Läuft im Browser, es wird nichts übertragen. Beantwortet genau eine Frage: ob die heutige Raumluft an dieser Fläche sicher ist. Warum die Fläche kalt ist — Wärmebrücke, fehlende Dämmung — kann die Rechnung nicht sagen.

## Die vier Zahlen, die man behalten sollte

- **40–60 % rF** in der Raummitte: Achte zusätzlich auf kalte Flächen und Kondenswasser.

- **60–70 %**: Grauzone, beobachten — vor allem der Morgenwert.

- **Wiederholt über 70 %**: Feuchtequellen und Luftaustausch prüfen. Zum Trocknen nur dann zusätzliche Außenluft nutzen, wenn der Vergleich mit der Raumluft dafür spricht.

- **Unter 16 °C** im Schlafzimmer: Kühlt dieselbe Luft ab, steigt ihre relative Feuchte. Ob an einer kalten Wand Kondenswasser entsteht, hängt auch vom Feuchtegehalt und der Oberflächentemperatur ab.

Das Gegenteil gibt es auch: Zeigt das Hygrometer in der Frostperiode dauerhaft unter 40 %, ist die Luft zu trocken. Was das Gegenmittel im Betrieb kostet, steht in der [Rechnung zum Luftbefeuchter-Stromverbrauch](https://getecoback.com/guide/luftbefeuchter-stromverbrauch.html).

## Die Routine, die das Kippen ersetzt

- **Wenn sich das Fenster sicher weit öffnen lässt, kurz stoßlüften.** Fünf bis zehn Minuten können ein Ausgangspunkt sein. Wind, Fenstergröße und Querlüftung beeinflussen den Luftwechsel. Nach dem Schließen prüfen, wie sich die Raumfeuchte bei wieder vergleichbarer Temperatur entwickelt.

- **Thermostat währenddessen herunterdrehen**, danach wieder auf. Sonst heizt das Ventil brav die Straße mit.

- **Bei Duschen, Kochen und Wäschetrocknen den Feuchteeintrag begrenzen.** Nutze eine vorhandene Abluftanlage wie vorgesehen. Für zusätzliches Fensterlüften zum Trocknen vergleiche die Luft drinnen und draußen.

- **Möbel an Außenwänden mit Abstand stellen.** Ein Schrank direkt an der kalten Wand macht sich seine eigene kalte Stelle; dieser Fehlermodus steht ausführlich unter [Schimmel an der Wand kommt wieder](https://getecoback.com/guide/schimmel-wand-kommt-wieder.html).

Ehrliche Grenze: Nichts davon repariert eine Fläche, die aus baulichen Gründen kalt ist. Bleibt eine Stelle dauerhaft deutlich kälter als der Rest derselben Wand, rettet sie kein Lüftungsplan — das ist ein Gespräch mit der Eigentümerseite und kein Einkaufsproblem. Wir sind keine Bausachverständigen, und diese Seite ist keine Rechtsberatung zum Mietverhältnis.

## Dasselbe Fenster, ein halbes Jahr früher

In der anderen Jahreshälfte ist die Kippstellung nicht der Gegner, sondern der Weg, den Abluftschlauch aus einem Fenster zu bekommen, das nie dafür gedacht war. Anderer Job, andere Hardware: [Klimaanlage am Kippfenster abdichten](https://getecoback.com/guide/klimaanlage-kippfenster.html).

## Was tatsächlich hilft — in dieser Reihenfolge

Als Amazon-Partner verdient EcoBack an qualifizierten Verkäufen. Die Links unten sind Affiliate-Links — für dich derselbe Preis.

Anzeige Sortiert danach, wie oft es wirklich die Antwort ist:

- **Ein Hygrometer mit Min/Max-Speicher** — vor allem anderen. Es hält den Nachtwert fest, den man nie selbst sieht, und ist der Unterschied zwischen Wissen und Raten. Hygrometer mit Min/Max auf Amazon.de →

- **Ein Infrarot-Thermometer** kann helfen, die Temperatur an einer kalten Wandstelle zu messen. Infrarot-Thermometer auf Amazon.de →

- **Ein Luftentfeuchter mit Hygrostat**, aber erst, wenn Lüften und Quellenkontrolle nicht reichen — er hält den Raum unter einem eingestellten Wert und arbeitet nachts weiter, wenn Lüften nicht geht. Nach Raumgröße: [20 m²](https://getecoback.com/guide/luftentfeuchter-20-qm.html) · [30 m²](https://getecoback.com/guide/luftentfeuchter-30-qm.html) · [40 m²](https://getecoback.com/guide/luftentfeuchter-40-qm.html).

Die Reihenfolge ist Absicht. Ein Luftentfeuchter, der vor einem Hygrometer für 10 Euro gekauft wird, läuft gegen ein Problem an, das niemand gemessen hat — und in einem Raum, dessen eigentlicher Fehler eine 12 °C kalte Wand ist, läuft er praktisch dauerhaft.

## Fragen, die wirklich gestellt werden

### Ist ein dauerhaft gekipptes Fenster im Winter schlecht?

Ein lange gekipptes Fenster kann Rahmen und Laibung abkühlen. Bei geeigneter Außenluft kann kurzes weites Öffnen Feuchte abführen. Fenstergröße, Wind und Querlüftung beeinflussen, wie lange das dauert. Bei einer Lüftungsanlage die für das Haus vorgesehene Betriebsweise beachten.

### Macht Lüften im Winter die Wohnung nicht feuchter, weil es draußen kalt und nass ist?

Das hängt von beiden Luftmassen ab. Miss drinnen und draußen Temperatur und relative Feuchte. Liegt die auf Raumtemperatur umgerechnete Außenfeuchte unter dem Innenwert, kann Lüften Feuchte abführen. Ist sie höher, führt Lüften mehr Wasserdampf zu.

### Mein Hygrometer zeigt 50 Prozent, warum ist trotzdem Schimmel in der Ecke?

Weil das Hygrometer die Raummitte misst und Schimmel an der kältesten Fläche wächst. Raumluft mit 20 Grad und 50 Prozent relativer Feuchte erreicht an einer 14 Grad kalten Wand etwa 73 Prozent, und das liegt bereits im Bereich, in dem Sporen keimen. Entscheidend ist die Feuchte an der kalten Stelle, nicht der Mittelwert im Raum.

### Wie lange soll ich lüften, und kühlt die Wohnung dabei aus?

Fünf bis zehn Minuten sind ein möglicher Ausgangspunkt bei weit geöffnetem Fenster im Winter. Die nötige Dauer hängt von Wind, Öffnung und Feuchtenachschub ab. Bei wieder vergleichbarer Raumtemperatur nachmessen. Bleibt die Feuchte hoch, zuerst die Ursache und die vorgesehene Lüftung prüfen.

**Passende Ratgeber**
[Klimaanlage am Kippfenster abdichten (der Sommerjob)](https://getecoback.com/guide/klimaanlage-kippfenster.html)
[Fenster beschlagen von innen: 3 Ursachen, 1 Diagnose](https://getecoback.com/guide/fenster-beschlagen-innen.html)
[Schimmel an der Wand kommt wieder](https://getecoback.com/guide/schimmel-wand-kommt-wieder.html)
[Luftentfeuchter gegen Schimmel: was er kann und was nicht](https://getecoback.com/guide/luftentfeuchter-gegen-schimmel.html)

---
Maschinenlesbare Übersicht: https://getecoback.com/for-agents.html · Sizing-Datensatz (CC BY 4.0): https://getecoback.com/sizing-data.json
MCP-Server für Assistenten: https://getecoback.com/mcp
Hinweis: Redaktionelle Einordnung anhand der verlinkten Quellen, keine eigenen Gerätetests. Die Website finanziert sich über Amazon-Affiliate-Links auf den HTML-Seiten — diese Markdown-Ansicht enthält bewusst keine.
