# Balkonkraftwerk in Österreich: 0,8 kW, Zählpunkt, Netzbetreiber

> Österreich rechnet nach dem ElWG: 0,8 kW an der Übergabestelle, kein Zählpunkt, kein Marktstammdatenregister. Der Wortlaut und die Unterschiede zu Deutschland.

Canonical (HTML, zitierfähig): https://getecoback.com/guide/balkonkraftwerk-oesterreich.html

Live-Daten auf dieser Seite (stündlich, JavaScript-gerendert, in dieser Markdown-Ansicht nicht enthalten): https://getecoback.com/api/strom

**Kurz:** In Österreich ist ein Balkonkraftwerk eine **Kleinsterzeugungsanlage** nach dem ElWG, wenn seine Maximalkapazität **höchstens 0,8 kW an der Übergabestelle** beträgt — gemessen dort, wo der Strom ins Netz geht, nicht an den Modulen. Für solche Anlagen darf der Netzbetreiber **keinen eigenen Zählpunkt** anlegen (außer du beantragst einen), und du bist von den **Bilanzgruppen- und Erzeugerpflichten** ausgenommen. Ein **Marktstammdatenregister gibt es nicht**; ob dein Netzbetreiber eine Meldung will, steht in seinen Anschlussbedingungen. Und für Mieter gilt nicht § 554 BGB, sondern § 9 MRG.

**Wir sind keine Juristen und keine Elektriker.** Diese Seite gibt den Gesetzestext wieder, so wie er am 18.09.2026 im Rechtsinformationssystem des Bundes (RIS) steht. Sie ist keine Rechtsberatung, und sie ersetzt nicht die Anschlussbedingungen deines Netzbetreibers.

## Was das ElWG sagt — im Wortlaut

Das Elektrizitätswirtschaftsgesetz (ElWG, BGBl. I Nr. 91/2025) hat das alte ElWOG 2010 abgelöst; dessen Bestimmungen sind laut RIS mit 24.12.2025 außer Kraft getreten. Die Definition steht in den Begriffsbestimmungen:

„‚Kleinsterzeugungsanlagen' eine oder mehrere Stromerzeugungseinheiten, deren Maximalkapazität in Summe höchstens 0,8 kW pro Anlage an der Übergabestelle eines Netzbenutzers beträgt;"
§ 7 Ziffer 78 ElWG

Und die Regeln dafür stehen in einem eigenen Paragraphen:

„(1) Netzbetreiber dürfen Kleinsterzeugungsanlagen keinen eigenen Zählpunkt zuordnen. (2) Netzbenutzer, die in ihrer Anlage eine Kleinsterzeugungsanlage betreiben, sind hinsichtlich der Kleinsterzeugungsanlage von den Verpflichtungen gemäß den §§ 11 und 74 Abs. 1 ausgenommen. (3) Abweichend von Abs. 1 ist Netzbenutzern, die in ihrer Anlage eine Kleinsterzeugungsanlage betreiben, auf Antrag ein eigener Zählpunkt zuzuordnen. Auf Kleinsterzeugungsanlagen mit eigenem Zählpunkt ist Abs. 2 nicht anzuwenden."
§ 77 ElWG, Kleinsterzeugungsanlagen

Die beiden Paragraphen, von denen Absatz 2 befreit: § 11 verpflichtet Netzbenutzer, sich einer Bilanzgruppe anzuschließen; § 74 Absatz 1 listet die allgemeinen Pflichten der Erzeuger — Bilanzgruppe, Datenbereitstellung an Netzbetreiber und Bilanzgruppenkoordinator, Fahrpläne bei großen Anlagen. Wer ein Balkonkraftwerk betreibt, ist also im Gesetz kein „Erzeuger" mit diesen Pflichten, solange die Anlage keinen eigenen Zählpunkt hat.

## Die Grenze liegt woanders als in Deutschland

Das ist der Unterschied, den man beim Kauf kennen muss. Das deutsche EEG nennt in § 8 Absatz 5a zwei Zahlen — bis zu 2 kW installierte Modulleistung und bis zu 800 VA Wechselrichterleistung. Das ElWG nennt **eine** Zahl, und zwar **an der Übergabestelle des Netzbenutzers**: 0,8 kW Maximalkapazität in Summe pro Anlage. Was das für ein Set aus dem Handel bedeutet:

| Deutschland (§ 8 Abs. 5a EEG) | Österreich (§ 7 Z 78, § 77 ElWG) |

Wo die Grenze gemessen wird | Modulleistung (2 kW) und Wechselrichter (800 VA) | Übergabestelle ins Netz: 0,8 kW Maximalkapazität |

Registrierung | Marktstammdatenregister bleibt Pflicht | Kein Marktstammdatenregister; Meldung an den Netzbetreiber nach dessen Bedingungen |

Zusätzliche Meldung an den Netzbetreiber | Kann nicht verlangt werden (§ 8 Abs. 5a EEG) | Das Gesetz schweigt dazu; die Anschlussbedingungen des Netzbetreibers gelten |

Eigener Zähler / Zählpunkt | — | Darf nicht zugeordnet werden, außer auf Antrag (dann entfallen die Ausnahmen) |

Mieterrecht | § 554 BGB: Anspruch auf Erlaubnis, Steckersolar ausdrücklich genannt | § 9 MRG: Anzeige, zwei Monate, sieben Bedingungen — Steckersolar nicht genannt |

Praktische Lesart, keine Rechtsauskunft: Ein Set, das in Deutschland als 800-VA-Balkonkraftwerk verkauft wird, speist an der Übergabestelle höchstens 0,8 kW ein und passt damit in die österreichische Definition. Ein Set mit mehr Modulleistung ist dabei kein Problem, solange die Einspeisung begrenzt bleibt — die Zahl, die zählt, ist die am Netz. Wer einen Speicher dahinter hängt, ändert daran nichts, solange die Übergabestelle bei 0,8 kW bleibt; was ein Speicher am Balkon bringt, rechnet der [Speicher-Rechner](https://getecoback.com/guide/balkonspeicher-rechner.html) — die Physik ist auf beiden Seiten der Grenze dieselbe.

## Zählpunkt: warum du meist keinen willst

Absatz 1 klingt wie eine Einschränkung, ist aber die Vereinfachung: Ohne eigenen Zählpunkt ist das Balkonkraftwerk für das Netz unsichtbar, dein Zähler läuft langsamer, fertig. Absatz 3 erlaubt einen eigenen Zählpunkt auf Antrag — und schaltet damit Absatz 2 aus, du wirst also zum Erzeuger mit Bilanzgruppe und Datenpflichten. Das ergibt Sinn, wenn Einspeisung gezählt und abgerechnet werden soll; für die 0,8 kW eines Balkonkraftwerks, die tagsüber den Kühlschrank und den Router tragen, ist es der teurere Weg zu einem Ergebnis, das man nicht braucht. Was der Strom wert ist, der nicht selbst verbraucht wird, sagt § 77 nicht; ohne Zählpunkt wird er schlicht nicht gezählt.

## Melden: was das Gesetz sagt — und was nicht

Das ist der Punkt, an dem wir nicht mehr behaupten als der Text hergibt. Das ElWG definiert die Kleinsterzeugungsanlage, verbietet den eigenen Zählpunkt und befreit von zwei Pflichtkatalogen. **Eine eigene Meldepflicht für Kleinsterzeugungsanlagen haben wir im Gesetzestext nicht gefunden.** Das heißt nicht, dass du nichts melden musst: Wie eine Anlage an das Netz angeschlossen wird, regeln die Anschlussbedingungen und technischen Regeln des jeweiligen Netzbetreibers, und die können eine Meldung mit Formular vorsehen. Die ehrliche Anleitung ist deshalb kurz: **Vor dem Einstecken beim Netzbetreiber nachfragen, ob und wie er die Anlage gemeldet haben will.** Das kostet eine E-Mail und erspart die Diskussion hinterher.

## Mieter: § 9 MRG statt § 554 BGB

Unser Ratgeber [Balkonkraftwerk als Mieter](https://getecoback.com/guide/balkonkraftwerk-mieter-recht.html) erklärt den deutschen Anspruch aus § 554 BGB. In Österreich gibt es diesen Anspruch nicht in dieser Form. Das Mietrechtsgesetz arbeitet mit einem Verfahren: Der Hauptmieter zeigt eine wesentliche Veränderung dem Vermieter an, schweigt der zwei Monate, gilt das als Zustimmung, und ablehnen darf er nur, wenn eine von sieben Bedingungen fehlt. Ob ein Balkonkraftwerk als „der Senkung des Energieverbrauchs dienende Ausgestaltung" nach § 9 Absatz 2 gilt — dann wäre das wichtige Interesse per Gesetz gegeben —, ist eine Auslegungsfrage, zu der wir nichts behaupten. Der ganze Paragraph mit Wortlaut steht in [Mietwohnung in Österreich: § 9 MRG erklärt](https://getecoback.com/guide/klimaanlage-mietwohnung-oesterreich.html); die Frage, ob die Befestigung überhaupt eine Veränderung ist, entschärft oft schon eine [Halterung ohne Bohren](https://getecoback.com/guide/balkonkraftwerk-ohne-bohren.html).

## Was auf beiden Seiten der Grenze gleich bleibt

- **Die Physik.** Ausrichtung, Verschattung und Verbrauchsprofil entscheiden über den Ertrag, nicht das Gesetz — der [Standort-Check](https://getecoback.com/guide/balkonkraftwerk-standort-check.html) und der [Lohnt-sich-Rechner](https://getecoback.com/guide/balkonkraftwerk-lohnt-sich-rechner.html) rechnen mit kWh, die keine Staatsgrenze kennen. Trag den österreichischen Arbeitspreis von deiner Rechnung ein; die Regulierungsbehörde E-Control nennt 22 bis 35 Cent je kWh als übliche Spanne für Haushalte (Newsletter 3/2026).

- **Das Netzsignal.** Wer wissen will, wann der Börsenstrom billig ist: der [Strompreis-Radar](https://getecoback.com/guide/strompreis-radar.html) zeigt EPEX-Preise, die für Österreich und Deutschland aus demselben Markt kommen.

- **Der Stromausfall.** Ein netzgekoppeltes Balkonkraftwerk speist bei Stromausfall nichts — es muss sich abschalten. Warum, und was ein Speicher dann kann und nicht kann, steht in [Stromausfall: Was eine Powerstation wirklich schafft](https://getecoback.com/guide/stromausfall-heizen.html).

## Häufige Fragen

### Wie viel Leistung darf ein Balkonkraftwerk in Österreich haben?

Das ElWG definiert Kleinsterzeugungsanlagen als eine oder mehrere Stromerzeugungseinheiten, deren Maximalkapazität in Summe höchstens 0,8 kW pro Anlage an der Übergabestelle eines Netzbenutzers beträgt. Die Grenze liegt also an der Übergabestelle ins Netz, nicht an der Modulleistung — anders als in Deutschland, wo das EEG 2 kW Modulleistung und 800 VA Wechselrichterleistung nennt.

### Bekomme ich in Österreich einen eigenen Zähler für das Balkonkraftwerk?

Nicht automatisch: Nach § 77 Absatz 1 ElWG dürfen Netzbetreiber Kleinsterzeugungsanlagen keinen eigenen Zählpunkt zuordnen. Absatz 3 erlaubt es auf Antrag — dann entfällt aber die Ausnahme von den Erzeuger- und Bilanzgruppenpflichten aus Absatz 2. Für ein Balkonkraftwerk, das den eigenen Verbrauch senken soll, ist der eigene Zählpunkt in der Regel nicht das, was man will.

### Muss ich das Balkonkraftwerk in Österreich anmelden?

Ein Marktstammdatenregister wie in Deutschland gibt es in Österreich nicht. Das ElWG nimmt Kleinsterzeugungsanlagen von den Pflichten der §§ 11 und 74 Absatz 1 aus — Bilanzgruppe und allgemeine Erzeugerpflichten. Ob und wie dein Netzbetreiber eine Meldung der Anlage verlangt, steht in seinen Anschlussbedingungen; im Gesetzestext selbst haben wir keine eigene Meldepflicht für diese Anlagen gefunden. Frag beim Netzbetreiber nach dem Formular, bevor du einsteckst.

### Gilt § 554 BGB für Mieter in Österreich?

Nein. Das BGB ist deutsches Recht. In Österreich regelt § 9 Mietrechtsgesetz, was ein Hauptmieter an der Wohnung verändern darf — mit Anzeige an den Vermieter, einer Zwei-Monats-Frist und sieben Bedingungen. Ob ein Balkonkraftwerk als „der Senkung des Energieverbrauchs dienende Ausgestaltung“ gilt, ist eine Auslegungsfrage, die vor der Anzeige mit Mietervereinigung oder Arbeiterkammer zu klären ist.

### Was passiert mit dem Strom, den ich nicht selbst verbrauche?

Er fließt ins Netz. Ohne eigenen Zählpunkt für die Anlage wird er nicht gesondert gezählt und nicht vergütet — genau deshalb ist ein Balkonkraftwerk in Österreich wie in Deutschland dann sinnvoll, wenn es tagsüber laufenden Verbrauch deckt. Unser Rechner zeigt, wie viel davon bei deinem Verbrauchsprofil hängen bleibt.

**Quellen, im Wortlaut nachlesbar.** Alle Gesetzeszitate stammen aus dem Rechtsinformationssystem des Bundes, Fassung vom 18.09.2026:
Elektrizitätswirtschaftsgesetz (ElWG), konsolidiert — dort § 7 Z 78, § 11, § 74 und § 77;
die deutschen Vergleichswerte aus § 8 EEG;
die Strompreisspanne von E-Control (Newsletter 3/2026).
Förderungen für Balkonkraftwerke sind in Österreich Sache von Bund, Ländern und Gemeinden und ändern sich jährlich — wir nennen hier bewusst keine Beträge, weil wir keine amtliche Übersicht gefunden haben, auf die wir verlinken könnten. Wir sind keine Juristen; der Wortlaut im RIS ist immer aktueller als jede Zusammenfassung, auch als diese.

---
Maschinenlesbare Übersicht: https://getecoback.com/for-agents.html · Sizing-Datensatz (CC BY 4.0): https://getecoback.com/sizing-data.json
MCP-Server für Assistenten: https://getecoback.com/mcp
Hinweis: EcoBack testet nicht selbst; Empfehlungen fassen öffentliche Tests zusammen. Die Website finanziert sich über Amazon-Affiliate-Links auf den HTML-Seiten — diese Markdown-Ansicht enthält bewusst keine.
