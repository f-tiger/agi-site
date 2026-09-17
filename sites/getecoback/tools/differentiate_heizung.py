#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Make each heizung-<N>-qm page answer a different question (2026-09-17).

Why this exists
---------------
Measured, not assumed: `tools/check_duplication.py` reads this family at
**54,0 %** 8-gram Jaccard between siblings after site-wide boilerplate is
removed, against **1,3 %** for two random pages on different topics. The seven
pages shared four identical H2 headings, one identical title pattern, one
identical description pattern and a body that differed only in the numbers:

    Heizung für 10/15/20/25/30/40/50 m²: Watt-Bedarf, Infrarot & Kosten (2026)
    Wie viel Watt für N m²?  ·  Empfohlenes Gerät für N m²  ·  Was kostet …

That is the textbook doorway shape, and it matches what the D1 numbers say:
googlebot crawls the site 249×/7d and sends **0** referrals in 28 days, while
Bing's family (DDG 112 + Bing 71 + Yahoo 18) indexes ~50 of these URLs and
actually converts (`klimaanlage-15-qm` 50 % CTR).

The fix direction is rewriting, never deleting or merging: these URLs carry
Bing's index and the site's only affiliate revenue. `heizung-N-qm` goes first
because it is both the most duplicated family and the one with almost no
traffic to lose.

What "different" means here
---------------------------
Not synonyms. Each size gets the question that is actually different at that
size, and every number used is either already published on the page or
arithmetic on numbers already published on the page:

    10 m²  700 W  0,21 €/h   63 €/Saison  2.800 W frei  → cost is a non-issue;
                                                          the circuit is
    15 m²  1050 W 0,32 €/h   94 €          2.450 W free → home office: 8 heating
                                                          hours, not 5 (151 €)
    20 m²  1400 W 0,42 €/h  126 €          2.100 W free → first three-digit
                                                          season; heat vs damp
    25 m²  1750 W 0,53 €/h  158 €          1.750 W free → one panel stops being
                                                          the normal case
    30 m²  2100 W 0,63 €/h  189 €          1.400 W free → open plan breaks the
                                                          rule of thumb
    40 m²  2800 W 0,84 €/h  252 €            700 W free → Altbau value (4.000 W)
                                                          exceeds one circuit
    50 m²  3500 W 1,05 €/h  315 €              0 W free → exactly the 16 A limit

The circuit headroom (3.500 W − reference load) is the spine of the family: it
is a real, size-dependent number, it is derived from a figure the pages already
carried, and it ends at exactly zero — which is why the 50 m² page reaches a
different recommendation than the 10 m² page instead of the same one with
bigger numbers.

Design constraints this respects
--------------------------------
* `gen_heizung_qm.py` is stale scaffolding — the shipped pages were augmented
  after generation and re-running it wipes ~337 injected element lines (its own
  content file says so, 2026-08-28). So this is an **injector**, in the same
  family as build_structure/build_onpage: idempotent, marker-delimited, safe on
  every deploy. It runs BEFORE build_onpage.py so the TOC is rebuilt from the
  new headings.
* Titles keep the query stem ("Heizung für N m²") because Bing ranks them on it;
  only the tail differs. Changing what earns money to please a search engine
  that sends zero traffic would be a bet with a real downside.
* No new safety claims. The site's rule is to point at the manufacturer and the
  electrician and never assert values — so the electrical parts state the 16 A /
  3.500 W figure the pages already carried, and stop at "ask the electrician".
* Zero fabrication. Every figure below is on the page already or is arithmetic
  on those figures; the selftest re-derives them and fails if a hand-edit drifts.

Run: python3 tools/differentiate_heizung.py            (idempotent)
     python3 tools/differentiate_heizung.py --selftest (zero IO)
"""
import argparse
import glob
import html as htmllib
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
GUIDE = os.path.join(SITE, "guide")
TAG = "getecoback-21"
PRICE_KWH = 0.30
CIRCUIT_W = 3500          # 16 A Schuko, the figure the pages already carried
MARK, MARK_END = "<!--EB_QMDIFF-->", "<!--/EB_QMDIFF-->"

DESC_MAX, TITLE_MAX = 165, 70   # mirrors tools/check_meta.py


def de(n):
    return f"{n:,}".replace(",", ".")


def eur(x):
    return f"{x:.2f}".replace(".", ",")


def amazon(term):
    return f"https://www.amazon.de/s?k={term}&amp;tag={TAG}"


# ---------------------------------------------------------------------------
# The copy. One entry per size; nothing here is templated across sizes except
# the affiliate scaffolding, which check_adlabel and check_faq_parity guard.
# ---------------------------------------------------------------------------
ANGLES = {
 10: {
  "title": "Heizung für 10 m²: 600–800 W und 0,21 € pro Stunde (2026)",
  "desc": ("600–800 W reichen für 10 m². Ein 700-W-Panel kostet rund 0,21 € pro Stunde "
           "und etwa 63 € pro Heizsaison — dazu, was am Stromkreis frei bleibt."),
  "og_title": "10 m² beheizen: 600–800 W",
  "og_desc": "Watt-Bedarf, Stundenkosten und freie Leistung am Stromkreis für ein kleines Büro oder Bad.",
  "h1": "Welche Heizleistung für 10 m²? 600–800 W reichen fast immer",
  "sub": ("700 W, 0,21 € pro Stunde: Bei dieser Raumgröße entscheidet nicht der Verbrauch, "
          "sondern was sonst noch an derselben Leitung hängt."),
  "lead": ("10 m² ist die Größe, bei der sich die Kostenfrage fast von selbst beantwortet. "
           "700 W sind ein Fünftel dessen, was ein normaler Stromkreis trägt, und eine Stunde bei "
           "voller Leistung kostet 0,21 €. Offen bleibt etwas anderes: wie schnell es warm wird — "
           "und was im Bad gleichzeitig mitläuft."),
  "tldr": ("Plane für 10 m² rund <strong>600–800 W</strong> ein (60–100 W pro m² je nach Dämmung). "
           "Ein 700-W-Gerät kostet 0,21 € pro Stunde und über eine ganze Saison etwa 63 €. "
           "Am 16-A-Stromkreis bleiben daneben rund 2.800 W frei."),
  "h2_watt": "600–800 W: warum hier die Untergrenze genügt",
  "p_watt": ("Für 10 m² reichen meist 600–800 W. In gut gedämmten Räumen eher weniger, im Altbau mehr. "
             "Was diese Größe von allen folgenden unterscheidet: Zwischen Neubau- und Altbau-Rechenwert "
             "liegen hier nur 400 W. Bei 50 m² sind es 2.000 W. Die Dämmung ist also der Faktor, der mit "
             "der Fläche wächst — bei 10 m² darfst du dich im Zweifel am oberen Ende bedienen, ohne dass "
             "es ins Geld geht."),
  "p_table": ("Selbst der Altbau-Wert bleibt bei 10 m² unter 1.000 W. Ein einzelnes Panel genügt; "
              "Aufteilen auf mehrere Geräte ist hier kein Thema."),
  "h2_rec": "Panel oder Heizlüfter — was fürs Bad besser passt",
  "p_rec": ("Eine <strong>Infrarotheizung mit rund 700 W</strong> passt für ein kleines Büro oder "
            "Badezimmer. Der Unterschied zum Heizlüfter ist weniger ein Preis- als ein Zeitunterschied: "
            "Der Lüfter macht die Luft schnell warm und kostet im Betrieb mehr, das Panel wärmt Flächen "
            "und Personen und spielt seine Stärke aus, wenn der Raum täglich mehrere Stunden genutzt "
            "wird. Für ein Bad, das morgens zwanzig Minuten warm sein soll, ist der Lüfter die "
            "ehrlichere Wahl."),
  "pro": "✓ Sofort spürbar &nbsp; ✓ Keine Installation",
  "con": "✕ Im Bad auf die Feuchtraum-Angabe des Herstellers achten",
  "p_rec_note": ("Ob ein Gerät im Bad hängen darf, steht in der Feuchtraum-Angabe des Herstellers — "
                 "und im Zweifel beantwortet das der Elektriker, nicht ein Ratgeber. Tiefer im Thema: "
                 "<a href=\"/guide/infrarotheizung-badezimmer.html\">Infrarotheizung im Badezimmer</a>."),
  "h2_kosten": "0,21 € pro Stunde: was 10 m² im Winter kosten",
  "p_kosten_extra": ("Zum Einordnen: Dieselbe Rechnung ergibt für 50 m² rund 315 €, also das Fünffache. "
                     "Bei 10 m² ist elektrisches Zuheizen damit eine Komfortentscheidung, keine "
                     "Budgetfrage. Dreistellig wird die Saison in dieser Reihe erst zwischen 15 m² "
                     "(94 €) und 20 m² (126 €)."),
  "h2_extra": "2.800 W bleiben frei: der Stromkreis bei 10 m²",
  "p_extra": [
    ("Ein normaler Schuko-Stromkreis ist mit 16 A abgesichert, also rund 3.500 W. Ein 700-W-Panel "
     "belegt davon ein Fünftel und lässt etwa <strong>2.800 W</strong> für alles andere frei. Das ist "
     "der größte Spielraum in dieser Reihe — bei 50 m² bleiben rechnerisch null."),
    ("Praktisch heißt das: Kritisch wird nicht das Heizgerät, sondern die Gleichzeitigkeit. Föhn, "
     "Wasserkocher und Heizung auf derselben Leitung sind der Fall, in dem die Sicherung fällt. Hängen "
     "im Bad zusätzlich Waschmaschine oder Trockner, lohnt vorher ein Blick in den Sicherungskasten — "
     "und bei Unsicherheit die Frage an den Elektriker."),
  ],
  "faqs": [
    ("Wie viel Watt Heizleistung brauche ich für 10 m²?",
     "600–800 W, also 60–100 W pro m² je nach Dämmung. Zwischen gut gedämmtem Neubau und Altbau liegen "
     "bei dieser Größe nur 400 W Unterschied — im Zweifel das obere Ende nehmen."),
    ("Was kostet eine Stunde Heizen mit 700 W?",
     "Rund 0,21 € bei 0,30 €/kWh Rechenbasis. Mit Thermostat weniger, weil das Gerät nicht durchgehend läuft."),
    ("Was kostet eine Heizsaison für 10 m²?",
     "Mit 700 W, 5 Heizstunden am Tag, einem Thermostat-Takt von rund 40 Prozent und 150 Heiztagen etwa "
     "63 €. Rechne mit deinem eigenen Arbeitspreis nach: Watt ÷ 1000 × Preis × Stunden × Takt × Tage."),
    ("Reicht eine Infrarotheizung als alleinige Heizung für 10 m²?",
     "Als Zusatz- oder Übergangsheizung ja. Im tiefen Winter als einzige Wärmequelle bleibt eine "
     "Gebäude-Wärmepumpe wirtschaftlicher — bei 63 € pro Saison ist der Unterschied in dieser Größe "
     "allerdings klein."),
    ("Wie viel Leistung bleibt neben dem Heizgerät am Stromkreis frei?",
     "Ein Schuko-Stromkreis mit 16 A trägt rund 3.500 W. Nach 700 W fürs Panel bleiben etwa 2.800 W. "
     "Kritisch ist die Gleichzeitigkeit von Föhn, Wasserkocher und Heizung, nicht das Heizgerät allein."),
  ],
  "cta": ("<strong>Infrarotheizungen um 700 W auf Amazon.de</strong> — auf das Thermostat achten und, "
          "fürs Bad, auf die Feuchtraum-Angabe des Herstellers:"),
  "related": [("/guide/infrarotheizung-badezimmer.html", "Infrarotheizung im Badezimmer →"),
              ("/guide/heizluefter-stromsparend.html", "Heizlüfter stromsparend betreiben →"),
              ("/guide/infrarotheizung-watt-rechner.html", "Watt-Rechner: Leistung für deinen Raum →"),
              ("/guide/schimmel-bad-fugen.html", "Schimmel in den Badfugen →")],
 },

 15: {
  "title": "Heizung für 15 m²: 900–1.200 W fürs Arbeitszimmer (2026)",
  "desc": ("15 m² brauchen 900–1.200 W. Ein 1.050-W-Panel kostet 0,32 € pro Stunde — mit 5 Heizstunden "
           "94 € pro Saison, im Homeoffice mit 8 Stunden rund 151 €."),
  "og_title": "15 m² beheizen: 900–1.200 W",
  "og_desc": "Watt-Bedarf, Stundenkosten und die Homeoffice-Rechnung mit acht Heizstunden am Tag.",
  "h1": "Welche Heizleistung für 15 m²? 900–1.200 W — und die Homeoffice-Rechnung",
  "sub": ("1.050 W, 0,32 € pro Stunde. Wer werktags acht Stunden im Arbeitszimmer sitzt, rechnet mit "
          "anderen Annahmen als der Rest dieser Reihe."),
  "lead": ("15 m² ist fast immer ein Arbeitszimmer oder ein kleines Wohnzimmer. Damit ist es der "
           "einzige Raum in dieser Reihe, dessen Heizung nicht abends läuft, sondern werktags von "
           "morgens bis nachmittags. Das verschiebt die Saisonkosten stärker als jede Dämmfrage, "
           "deshalb steht die Rechnung hier mit zwei Annahmen statt einer."),
  "tldr": ("Für 15 m² sind <strong>900–1.200 W</strong> die richtige Größenordnung. Ein 1.050-W-Gerät "
           "kostet 0,32 € pro Stunde. Bei 5 Heizstunden am Tag sind das rund 94 € pro Saison, bei "
           "8 Stunden Homeoffice rund 151 €."),
  "h2_watt": "900–1.200 W: ein großes Panel oder zwei kleine",
  "p_watt": ("15 m² brauchen rund 900–1.200 W — je nach Dämmung ein größeres Panel oder zwei kleine. "
             "Die Entscheidung dazwischen ist keine Wattfrage, sondern eine Platzfrage. Infrarot wärmt "
             "Flächen und Personen statt Luft und wirkt deshalb vor allem dort, wohin das Panel zeigt. "
             "An einem Schreibtisch, an dem du stundenlang an derselben Stelle sitzt, schlägt ein Panel "
             "in Blickrichtung zwei verteilte Geräte."),
  "p_table": ("Für Altbau-Mietwohnungen wichtig: 1.500 W ist der Rechenwert, nicht zwingend der "
              "Kaufwert. Wird das Zimmer nur tagsüber genutzt, planst du eher auf den mittleren Wert "
              "und gleichst Spitzen über die Laufzeit aus."),
  "h2_rec": "Gerät fürs Arbeitszimmer: worauf es hier ankommt",
  "p_rec": ("Eine <strong>Infrarotheizung mit rund 1.050 W</strong> passt für ein Arbeitszimmer oder "
            "kleines Wohnzimmer. Wichtiger als die letzten hundert Watt ist in diesem Raum das "
            "Thermostat: Ein Gerät, das acht Stunden am Stück verfügbar sein muss, darf nicht acht "
            "Stunden durchlaufen — genau daran hängt der Unterschied zwischen 94 € und 151 € pro Saison."),
  "pro": "✓ Sofort spürbar &nbsp; ✓ Keine Installation",
  "con": "✕ Wirkt vor allem auf Sicht — Panel in Blickrichtung planen",
  "p_rec_note": ("Ob das Panel besser an die Wand oder an die Decke gehört, hängt am Schreibtisch und "
                 "nicht am Raum: <a href=\"/guide/infrarotheizung-decke-oder-wand.html\">Decke oder Wand</a>."),
  "h2_kosten": "0,32 € pro Stunde — und was acht Heizstunden daraus machen",
  "p_kosten_extra": ("<strong>Die Homeoffice-Variante.</strong> Setz statt 5 Heizstunden 8 ein, und "
                     "dieselbe Formel ergibt rund <strong>151 €</strong>: 1.050 W ÷ 1000 × 0,30 € × 8 h "
                     "× 0,4 × 150 Tage. Das sind 57 € Unterschied, allein durch die Nutzungsdauer — mehr, "
                     "als zwischen 15 und 20 m² liegt (32 €). Wer im Arbeitszimmer heizt, rechnet deshalb "
                     "zuerst die Stunden und dann die Quadratmeter."),
  "h2_extra": "Ein Raum warm oder die ganze Wohnung wärmer?",
  "p_extra": [
    ("Die Rechnung oben beantwortet nur die halbe Frage. Die andere Hälfte steht auf deiner "
     "Heizkostenabrechnung: Ein elektrisches Panel im Arbeitszimmer lohnt sich genau dann, wenn es dir "
     "erlaubt, die Zentralheizung für die übrige Wohnung nicht hochzudrehen. Was diese eingesparte "
     "Seite kostet, steht in deinem Vertrag und nicht hier — wir setzen keine Zahl ein, die wir nicht "
     "kennen."),
    ("Was sich sagen lässt: 0,32 € pro Stunde ist der Preis, gegen den du vergleichst. Für Mieter lohnt "
     "vorher <a href=\"/guide/heizkosten-senken-als-mieter.html\">Heizkosten senken als Mieter</a>; mit "
     "deinem eigenen Arbeitspreis rechnet der <a href=\"/guide/stromkosten-rechner.html\">Stromkosten-"
     "Rechner</a>."),
  ],
  "faqs": [
    ("Wie viel Watt brauche ich für ein Arbeitszimmer mit 15 m²?",
     "900–1.200 W, also 60–100 W pro m² je nach Dämmung. Ob das ein Panel oder zwei kleine werden, "
     "entscheidet die Sitzposition, nicht die Wattzahl."),
    ("Was kostet Heizen im Homeoffice mit 1.050 W?",
     "0,32 € pro Stunde bei 0,30 €/kWh Rechenbasis. Bei acht Heizstunden am Tag, einem Takt von rund "
     "40 Prozent und 150 Heiztagen sind das etwa 151 € pro Saison statt 94 € bei fünf Stunden."),
    ("Lohnt sich ein Panel im Arbeitszimmer gegenüber der Zentralheizung?",
     "Es lohnt sich dann, wenn du dafür die übrige Wohnung nicht wärmer stellen musst. Den Gegenwert "
     "kennt nur deine Heizkostenabrechnung; von unserer Seite kommt der Vergleichspreis von 0,32 € pro "
     "Stunde."),
    ("Ein großes Panel oder zwei kleine für 15 m²?",
     "Für einen festen Arbeitsplatz ein Panel in Blickrichtung. Zwei kleinere lohnen erst, wenn der Raum "
     "zwei Zonen hat, die getrennt genutzt werden."),
    ("Wie viel Leistung bleibt bei 15 m² am Stromkreis frei?",
     "Nach 1.050 W bleiben von rund 3.500 W eines 16-A-Stromkreises etwa 2.450 W übrig. Im "
     "Arbeitszimmer mit Rechner, Monitor und Wasserkocher ist das unkritisch."),
  ],
  "cta": ("<strong>Infrarotheizungen um 1.000 W auf Amazon.de</strong> — im Arbeitszimmer zählt vor "
          "allem ein brauchbares Thermostat:"),
  "related": [("/guide/heizkosten-senken-als-mieter.html", "Heizkosten senken als Mieter →"),
              ("/guide/infrarotheizung-decke-oder-wand.html", "Infrarotheizung: Decke oder Wand? →"),
              ("/guide/stromkosten-rechner.html", "Stromkosten mit deinem Tarif rechnen →"),
              ("/guide/heizluefter-stromverbrauch.html", "Heizlüfter: Stromverbrauch im Vergleich →")],
 },

 20: {
  "title": "Heizung für 20 m²: 1.200–1.600 W und 0,42 € pro Stunde",
  "desc": ("20 m² brauchen 1.200–1.600 W. Ein 1.400-W-Panel kostet 0,42 € pro Stunde und rund 126 € pro "
           "Saison — im Schlafzimmer hängt Wärme direkt mit Feuchte zusammen."),
  "og_title": "20 m² beheizen: 1.200–1.600 W",
  "og_desc": "Watt-Bedarf, Stundenkosten und der Zusammenhang von Heizen und Feuchte im Schlafzimmer.",
  "h1": "Welche Heizleistung für 20 m²? 1.200–1.600 W — und der Feuchte-Haken",
  "sub": ("1.400 W, 0,42 € pro Stunde. Im Schlafzimmer ist die Wattfrage schnell beantwortet; die "
          "interessantere ist, was die Wärme mit der Luftfeuchte macht."),
  "lead": ("20 m² ist die Größe, bei der diese Reihe zum ersten Mal dreistellig wird: rund 126 € pro "
           "Heizsaison. Es ist außerdem die Größe, hinter der meistens ein Schlafzimmer oder ein "
           "Wohnzimmer steckt — und dort hängt an der Heizfrage eine zweite, die selten mitgestellt "
           "wird: was die zusätzliche Wärme mit der Luftfeuchtigkeit anstellt."),
  "tldr": ("Für 20 m² solltest du <strong>1.200–1.600 W</strong> einplanen (60–100 W pro m² je nach "
           "Dämmung). Ein 1.400-W-Gerät kostet 0,42 € pro Stunde und rund 126 € pro Saison. Wer ein "
           "Schlafzimmer zuheizt, liest den Abschnitt zur Feuchte besser mit."),
  "h2_watt": "1.200–1.600 W: ab hier lohnt die Aufteilung",
  "p_watt": ("Ab 20 m² sind 1.200–1.600 W sinnvoll. Zwei Panels verteilen die Wärme oft besser als eines "
             "— nicht weil die Wattzahl es verlangt, sondern weil Infrarot Flächen und Personen wärmt "
             "statt Luft und deshalb dort wirkt, wohin es zeigt. Ein Wohnzimmer mit Sofa an der einen "
             "und Esstisch an der anderen Wand hat zwei Zonen, und ein Gerät bedient nur eine davon."),
  "p_table": ("Der Altbau-Wert erreicht hier zum ersten Mal 2.000 W. Ab dieser Marke wird aus einem "
              "Gerät sinnvollerweise ein Paar, weil einzelne Panels dieser Größe im Handel selten sind. "
              "Am Stromkreis ist das unkritisch: Nach dem Referenzwert von 1.400 W bleiben von den rund "
              "3.500 W eines 16-A-Kreises noch 2.100 W frei."),
  "h2_rec": "Gerät fürs Wohn- oder Schlafzimmer",
  "p_rec": ("Eine <strong>Infrarotheizung mit rund 1.400 W</strong>, gern auf zwei Panels verteilt, "
            "passt für ein Wohnzimmer oder Schlafzimmer. Im Schlafzimmer gilt eine Einschränkung, die "
            "man selten liest: Der Raum soll nicht nachts warm sein, sondern morgens. Ein Thermostat mit "
            "Zeitfunktion ist hier wichtiger als die letzten 200 Watt."),
  "pro": "✓ Sofort spürbar &nbsp; ✓ Keine Installation",
  "con": "✕ Wärme ersetzt kein Lüften — sie macht es nötiger",
  "p_rec_note": ("Für das Schlafzimmer im Sommer steht die andere Hälfte der Antwort in "
                 "<a href=\"/guide/beste-tragbare-klimaanlage-schlafzimmer.html\">Klimaanlage fürs "
                 "Schlafzimmer</a>."),
  "h2_kosten": "126 € pro Saison: die erste dreistellige Größe",
  "p_kosten_extra": ("Damit kippt diese Reihe bei 20 m²: 15 m² kosten 94 €, hier sind es 126 €, bei "
                     "30 m² schon 189 €. Ungefähr hier hört elektrisches Zuheizen auf, eine reine "
                     "Komfortentscheidung zu sein. Ab dieser Größe lohnt der Vergleich mit einer "
                     "<a href=\"/guide/klimaanlage-mit-heizfunktion.html\">Klimaanlage mit "
                     "Heizfunktion</a>, die als Wärmepumpe arbeitet und für dieselbe Wärme deutlich "
                     "weniger Strom braucht — in der Anschaffung aber ein Vielfaches kostet."),
  "h2_extra": "Heizen und Feuchte: warum das im Schlafzimmer zusammenhängt",
  "p_extra": [
    ("Wer ein kaltes Schlafzimmer zuheizt, verschiebt nicht nur die Temperatur. Die Feuchtigkeit aus "
     "Atem, Wäsche und Dusche schlägt sich weiterhin an der kältesten Fläche im Raum nieder — "
     "Fensterlaibung, Außenwandecke, die Wand hinter dem Schrank. Wärmer heißt also nicht trockener, "
     "sondern nur: Die kalte Stelle fällt stärker aus dem Rest heraus."),
    ("Praktisch heißt das: Heizen ersetzt kein Lüften, es macht Lüften nötiger. Wie das im Winter ohne "
     "Auskühlen geht, steht in <a href=\"/guide/richtig-lueften-im-winter.html\">Richtig lüften im "
     "Winter</a>; wenn am Fenster schon etwas wächst, in <a href=\"/guide/schimmel-am-fenster.html\">"
     "Schimmel am Fenster</a>. Die passende Gerätegröße für denselben Raum steht in "
     "<a href=\"/guide/luftentfeuchter-20-qm.html\">Luftentfeuchter für 20 m²</a>."),
  ],
  "faqs": [
    ("Wie viel Watt Heizleistung brauche ich für 20 m²?",
     "1.200–1.600 W, also 60–100 W pro m² je nach Dämmung. Im Altbau liegt der Rechenwert bei 2.000 W, "
     "was in der Praxis auf zwei Panels hinausläuft."),
    ("Was kostet Heizen mit 1.400 W pro Stunde und pro Saison?",
     "0,42 € pro Stunde bei 0,30 €/kWh Rechenbasis. Über 5 Heizstunden am Tag, einen Takt von rund "
     "40 Prozent und 150 Heiztagen sind das etwa 126 € — die erste dreistellige Größe in dieser Reihe."),
    ("Wird das Schlafzimmer durch Heizen trockener?",
     "Nein. Die Feuchtigkeit schlägt sich weiterhin an der kältesten Fläche im Raum nieder — "
     "Fensterlaibung, Außenwandecke, die Wand hinter dem Schrank. Heizen ersetzt kein Lüften, es macht "
     "Lüften nötiger."),
    ("Ein Panel oder zwei für 20 m²?",
     "Zwei, sobald der Raum zwei Aufenthaltszonen hat. Infrarot wirkt dort, wohin es zeigt, und ein "
     "Gerät bedient nur eine Zone."),
    ("Lohnt sich bei 20 m² schon eine Klimaanlage mit Heizfunktion?",
     "Sie braucht als Wärmepumpe für dieselbe Wärme deutlich weniger Strom, kostet in der Anschaffung "
     "aber ein Vielfaches. Ab 126 € pro Saison beginnt der Vergleich sich zu lohnen; ausschlaggebend "
     "ist, über wie viele Saisons du rechnest."),
  ],
  "cta": ("<strong>Infrarotheizungen um 1.400 W auf Amazon.de</strong> — fürs Schlafzimmer auf ein "
          "Thermostat mit Zeitfunktion achten:"),
  "related": [("/guide/richtig-lueften-im-winter.html", "Richtig lüften im Winter →"),
              ("/guide/schimmel-am-fenster.html", "Schimmel am Fenster: Ursache und Abhilfe →"),
              ("/guide/luftentfeuchter-20-qm.html", "Luftentfeuchter für 20 m² →"),
              ("/guide/heizdecke-stromverbrauch.html", "Heizdecke: Stromverbrauch im Vergleich →")],
 },

 25: {
  "title": "Heizung für 25 m²: 1.500–2.000 W auf zwei Panels (2026)",
  "desc": ("25 m² brauchen 1.500–2.000 W. Das kostet 0,53 € pro Stunde und rund 158 € pro Saison — und "
           "ist die Größe, ab der ein einzelnes Gerät selten reicht."),
  "og_title": "25 m² beheizen: 1.500–2.000 W",
  "og_desc": "Watt-Bedarf, Stundenkosten und warum bei dieser Größe zwei Panels die Regel sind.",
  "h1": "Welche Heizleistung für 25 m²? Ab hier wird ein Panel zu wenig",
  "sub": ("1.750 W, 0,53 € pro Stunde. Die Zahl ist schnell ausgerechnet — die eigentliche Entscheidung "
          "ist, wie du sie auf den Raum verteilst."),
  "lead": ("Bei 25 m² ändert sich an der Faustformel nichts, an der Umsetzung aber alles. 1.750 W als "
           "ein einzelnes Gerät sind im Handel die Ausnahme; zwei Panels zu je rund 875 W sind die "
           "Regel. Damit wird aus einer Wattfrage eine Platzierungsfrage — und die entscheidet am Ende "
           "darüber, ob sich der Raum warm anfühlt."),
  "tldr": ("Für 25 m² plane <strong>1.500–2.000 W</strong> ein (60–100 W pro m² je nach Dämmung). Das "
           "kostet bei voller Leistung 0,53 € pro Stunde und rund 158 € pro Saison. Rechne mit zwei "
           "Geräten statt einem."),
  "h2_watt": "1.500–2.000 W: die Zahl ist einfach, die Aufteilung nicht",
  "p_watt": ("25 m² benötigen 1.500–2.000 W. Bei hohen Decken oder im Altbau am oberen Ende planen. Die "
             "Faustformel sagt nichts darüber, ob diese Leistung aus einem oder aus zwei Geräten kommt "
             "— und genau das entscheidet hier über das Ergebnis. Infrarot wirkt dort, wohin es zeigt, "
             "und ein Raum dieser Größe hat fast immer mehr als eine Stelle, an der man sich aufhält."),
  "p_table": ("Der Altbau-Wert liegt mit 2.500 W bereits so hoch, dass ein einzelnes Panel dieser Klasse "
              "im Handel kaum zu finden ist. Zwei Geräte sind hier die praktikable, nicht die "
              "luxuriöse Lösung."),
  "h2_rec": "Zwei Panels statt einem: wohin sie gehören",
  "p_rec": ("Für 25 m² sind <strong>rund 1.750 W</strong> die Zielgröße, sinnvoll aufgeteilt auf zwei "
            "Panels an verschiedenen Wänden. Die bessere Aufteilung folgt nicht der Geometrie des Raums, "
            "sondern deiner Nutzung: ein Gerät dort, wo du sitzt, eines dort, wo du stehst oder isst."),
  "pro": "✓ Sofort spürbar &nbsp; ✓ Zonen getrennt schaltbar",
  "con": "✕ Ab hier meist zwei Geräte statt einem",
  "p_rec_note": ("Ob Wand oder Decke die bessere Position ist, steht in "
                 "<a href=\"/guide/infrarotheizung-decke-oder-wand.html\">Decke oder Wand</a>; ein "
                 "konkretes Modell im <a href=\"/guide/schmidbauer-infrarotheizung-test.html\">"
                 "Schmidbauer-Test</a>."),
  "h2_kosten": "0,53 € pro Stunde, 158 € pro Saison",
  "p_kosten_extra": ("Zwei Geräte kosten im Betrieb übrigens nicht mehr als eines mit derselben "
                     "Gesamtleistung: 2 × 875 W ziehen so viel wie 1 × 1.750 W. Teurer wird es nur, wenn "
                     "beide laufen, während du in einer der beiden Zonen sitzt. Getrennte "
                     "Schaltbarkeit ist deshalb bei dieser Raumgröße das eigentliche Sparargument — "
                     "nicht die Effizienz des Geräts."),
  "h2_extra": "1.750 W frei am Stromkreis — genau die Hälfte",
  "p_extra": [
    ("Ein Schuko-Stromkreis mit 16 A trägt rund 3.500 W. Der Referenzwert dieser Seite liegt bei "
     "1.750 W, also exakt bei der Hälfte: Es bleiben <strong>1.750 W</strong> für alles andere frei. "
     "Das ist die Mitte dieser Reihe — bei 10 m² sind es 2.800 W, bei 50 m² null."),
    ("Solange beide Panels an derselben Leitung hängen, teilen sie sich diese Hälfte. Bei zwei Geräten "
     "lohnt deshalb der Blick, ob sie an verschiedenen Stromkreisen sitzen — nicht wegen der "
     "Heizleistung, sondern wegen allem, was sonst noch am selben Kreis hängt. Im Zweifel beantwortet "
     "das der Elektriker."),
  ],
  "faqs": [
    ("Wie viel Watt Heizleistung brauche ich für 25 m²?",
     "1.500–2.000 W, also 60–100 W pro m² je nach Dämmung. Bei hohen Decken oder im Altbau am oberen "
     "Ende planen."),
    ("Ein Panel oder zwei für 25 m²?",
     "Zwei. Ein einzelnes Gerät mit 1.750 W ist im Handel die Ausnahme, und Infrarot wirkt ohnehin nur "
     "dort, wohin es zeigt."),
    ("Verbrauchen zwei Panels mehr Strom als eines?",
     "Nein, 2 × 875 W ziehen so viel wie 1 × 1.750 W. Teurer wird es nur, wenn beide laufen, während du "
     "nur eine der beiden Zonen nutzt — deshalb ist getrennte Schaltbarkeit hier das Sparargument."),
    ("Was kostet eine Heizsaison für 25 m²?",
     "Mit 1.750 W, 5 Heizstunden am Tag, einem Takt von rund 40 Prozent und 150 Heiztagen etwa 158 €. "
     "Rechne mit deinem eigenen Arbeitspreis nach: Watt ÷ 1000 × Preis × Stunden × Takt × Tage."),
    ("Müssen beide Panels an denselben Stromkreis?",
     "Sie dürfen, solange die Summe unter der Belastbarkeit bleibt: Nach 1.750 W bleiben von rund "
     "3.500 W noch 1.750 W frei. Ob die Aufteilung in deiner Wohnung so zulässig ist, beantwortet der "
     "Elektriker."),
  ],
  "cta": ("<strong>Infrarotheizungen für 25 m² auf Amazon.de</strong> — zwei Geräte um je 900 W sind "
          "meist praktischer als ein großes:"),
  "related": [("/guide/infrarotheizung-decke-oder-wand.html", "Infrarotheizung: Decke oder Wand? →"),
              ("/guide/infrarotheizung-standgeraet.html", "Infrarot-Standgerät statt Wandmontage →"),
              ("/guide/schmidbauer-infrarotheizung-test.html", "Schmidbauer Infrarotheizung im Test →"),
              ("/guide/heizkosten-vergleich-rechner.html", "Heizkosten-Vergleich rechnen →")],
 },

 30: {
  "title": "Heizung für 30 m²: 1.800–2.400 W im offenen Wohnbereich",
  "desc": ("30 m² brauchen 1.800–2.400 W, das kostet 0,63 € pro Stunde und rund 189 € pro Saison. Im "
           "offenen Grundriss greift die Faustformel allerdings zu kurz."),
  "og_title": "30 m² beheizen: 1.800–2.400 W",
  "og_desc": "Watt-Bedarf, Saisonkosten und warum offene Grundrisse die Faustformel aushebeln.",
  "h1": "Welche Heizleistung für 30 m²? Wo die Faustformel im offenen Raum aufhört",
  "sub": ("2.100 W, 0,63 € pro Stunde. Die Rechnung stimmt — sie unterstellt aber vier Wände, die ein "
          "offener Wohnbereich nicht hat."),
  "lead": ("Für 30 m² nennt die Faustformel 1.800–2.400 W, und rechnerisch ist das korrekt. Nur steckt "
           "hinter 30 m² fast nie ein geschlossenes Zimmer, sondern ein offener Wohnbereich, der in "
           "Küche oder Flur übergeht. Die Formel stimmt dann weiterhin, ihre Voraussetzung nicht mehr — "
           "und das ist der Grund, warum bei dieser Größe so viele mit der gekauften Leistung "
           "unzufrieden sind."),
  "tldr": ("Für 30 m² plane <strong>1.800–2.400 W</strong> ein, meist auf mehrere Panels verteilt. Das "
           "kostet 0,63 € pro Stunde und rund 189 € pro Saison. In einem offenen Grundriss heizt du "
           "besser nicht die Fläche, sondern die Zonen, in denen du dich aufhältst."),
  "h2_watt": "1.800–2.400 W — für einen Raum, den es so meist nicht gibt",
  "p_watt": ("Für 30 m² plane 1.800–2.400 W, meist auf mehrere Heizpanels verteilt. Die Formel Fläche × "
             "Watt pro Quadratmeter unterstellt einen Raum, der sich thermisch abgrenzen lässt. Ein "
             "offener Wohnbereich tut das nicht: Die Wärme bleibt nicht in den 30 m², die du gemessen "
             "hast, sondern verteilt sich in alles, was daran hängt. Die errechnete Leistung reicht dann "
             "für gleichmäßige Wärme im gesamten Bereich nicht aus."),
  "p_table": ("Bei 30 m² erreicht der Altbau-Wert 3.000 W. Am 16-A-Stromkreis mit rund 3.500 W bleiben "
              "dann nur noch 500 W für alles andere — hier wechselt die Planung vom Gerät zur Leitung."),
  "h2_rec": "Zonen heizen statt Fläche: das Gerät danach aussuchen",
  "p_rec": ("Für 30 m² sind <strong>rund 2.100 W</strong> die Zielgröße, sinnvollerweise auf mehrere "
            "Panels verteilt. Entscheidend ist nicht die Summe, sondern dass sich die Panels einzeln "
            "schalten lassen: Wer abends auf dem Sofa sitzt, muss die Essecke nicht mitheizen. Dass "
            "Infrarot nur dort wirkt, wohin es zeigt, ist im offenen Grundriss ausnahmsweise ein "
            "Vorteil."),
  "pro": "✓ Zonenweise schaltbar &nbsp; ✓ Sofort spürbar",
  "con": "✕ Im offenen Raum wird nur die bestrahlte Zone warm",
  "p_rec_note": ("Was Infrarot grundsätzlich kann und was nicht, steht im "
                 "<a href=\"/guide/infrarotheizung-ratgeber.html\">Infrarotheizung-Ratgeber</a>."),
  "h2_kosten": "189 € pro Saison — und ab wann die Wärmepumpe ins Spiel kommt",
  "p_kosten_extra": ("189 € sind das Dreifache der 10-m²-Seite dieser Reihe (63 €) und noch nicht das "
                     "Ende: Bei 50 m² sind es 315 €. Ab dieser Größenordnung wird der Vergleich mit "
                     "einer <a href=\"/guide/klimaanlage-mit-heizfunktion.html\">Klimaanlage mit "
                     "Heizfunktion</a> interessant. Sie arbeitet als Wärmepumpe und braucht für dieselbe "
                     "Wärme deutlich weniger Strom; die Anschaffung kostet ein Vielfaches, weshalb die "
                     "Rechnung an der Nutzungsdauer hängt und nicht am Stundenpreis."),
  "h2_extra": "Offener Grundriss: was die Faustformel nicht weiß",
  "p_extra": [
    ("Drei Dinge fallen bei offenen Grundrissen aus der Rechnung heraus: die fehlende vierte Wand, die "
     "Deckenhöhe (die Formel rechnet mit Fläche, nicht mit Volumen) und die Luftbewegung zwischen den "
     "Bereichen. Alle drei wirken in dieselbe Richtung — die errechnete Leistung reicht für "
     "gleichmäßige Wärme im ganzen Bereich nicht."),
    ("Die teure Antwort darauf ist, mehr Watt zu kaufen. Die billigere ist, das Ziel zu ändern: nicht "
     "30 m² auf Wohlfühltemperatur, sondern zwei Zonen, in denen du dich tatsächlich aufhältst. Das ist "
     "auch der Grund, warum sich hier mehrere kleine, einzeln schaltbare Geräte besser rechnen als ein "
     "großes."),
  ],
  "faqs": [
    ("Wie viel Watt Heizleistung brauche ich für 30 m²?",
     "1.800–2.400 W, also 60–100 W pro m² je nach Dämmung, meist auf mehrere Heizpanels verteilt."),
    ("Warum reicht die errechnete Leistung im offenen Wohnbereich oft nicht?",
     "Weil die Formel Fläche × Watt pro Quadratmeter einen thermisch abgrenzbaren Raum unterstellt. Bei "
     "offenem Grundriss verteilt sich die Wärme in alles, was daran hängt, und die Deckenhöhe steht in "
     "der Formel gar nicht."),
    ("Mehrere kleine Panels oder ein großes für 30 m²?",
     "Mehrere kleine, wenn sie sich einzeln schalten lassen. Wer abends auf dem Sofa sitzt, muss die "
     "Essecke nicht mitheizen — das ist bei dieser Größe der größte Hebel auf die Betriebskosten."),
    ("Was kostet eine Heizsaison für 30 m²?",
     "Mit 2.100 W, 5 Heizstunden am Tag, einem Takt von rund 40 Prozent und 150 Heiztagen etwa 189 €. "
     "Das ist das Dreifache der 10-m²-Variante dieser Reihe."),
    ("Wie viel bleibt bei 30 m² am Stromkreis frei?",
     "Nach 2.100 W bleiben von rund 3.500 W noch 1.400 W. Beim Altbau-Rechenwert von 3.000 W sind es "
     "nur noch 500 W — dort wechselt die Planung vom Gerät zur Leitung."),
  ],
  "cta": ("<strong>Infrarotheizungen für 30 m² auf Amazon.de</strong> — im offenen Grundriss mehrere "
          "kleine, einzeln schaltbare Geräte statt eines großen:"),
  "related": [("/guide/infrarotheizung-ratgeber.html", "Infrarotheizung: Für wen sie sich lohnt →"),
              ("/guide/klimaanlage-mit-heizfunktion.html", "Klimaanlage mit Heizfunktion →"),
              ("/guide/infrarotheizung-watt-rechner.html", "Watt-Rechner: Leistung für deinen Raum →"),
              ("/guide/richtig-lueften-im-winter.html", "Richtig lüften im Winter →")],
 },

 40: {
  "title": "Heizung für 40 m²: 2.400–3.200 W und zwei Stromkreise",
  "desc": ("40 m² brauchen 2.400–3.200 W, also 0,84 € pro Stunde und rund 252 € pro Saison. Der "
           "Altbau-Rechenwert liegt über dem, was ein Stromkreis trägt."),
  "og_title": "40 m² beheizen: 2.400–3.200 W",
  "og_desc": "Watt-Bedarf, Saisonkosten und warum die Planung hier beim Sicherungskasten anfängt.",
  "h1": "Welche Heizleistung für 40 m²? Zwei Stromkreise, nicht ein Gerät",
  "sub": ("2.800 W, 0,84 € pro Stunde. Bei dieser Größe ist die Wattzahl nicht mehr das Problem, sondern "
          "die Leitung, an der sie hängt."),
  "lead": ("40 m² ist der Punkt, an dem elektrisches Heizen die Steckdose verlässt. Der Referenzwert von "
           "2.800 W lässt an einem 16-A-Stromkreis nur noch 700 W für alles andere frei, und der "
           "Altbau-Rechenwert von 4.000 W liegt bereits über dem, was ein einzelner Kreis mit rund "
           "3.500 W überhaupt trägt. Die Planung beginnt hier nicht im Onlineshop, sondern im "
           "Sicherungskasten."),
  "tldr": ("40 m² sind nur mit mehreren Panels sinnvoll, zusammen <strong>2.400–3.200 W</strong>. Das "
           "kostet 0,84 € pro Stunde und rund 252 € pro Saison. Bei 2.800 W bleiben am 16-A-Stromkreis "
           "nur 700 W frei — die Geräte gehören auf verschiedene Kreise."),
  "h2_watt": "2.400–3.200 W: nur noch als Verbund sinnvoll",
  "p_watt": ("40 m² sind sinnvoll nur mit mehreren Panels zu beheizen (2.400–3.200 W gesamt) — als "
             "alleinige Heizung im tiefen Winter grenzwertig. Ein Einzelgerät dieser Leistungsklasse "
             "gibt es für Wohnräume praktisch nicht, und selbst wenn: Es würde 40 m² nur in seiner "
             "Blickrichtung wärmen. Die Frage lautet hier nicht mehr „welches Gerät“, sondern „wie "
             "viele, wo, und an welchen Leitungen“."),
  "p_table": ("Die dritte Zeile ist die wichtige: 4.000 W für den Altbau liegen über den rund 3.500 W, "
              "die ein 16-A-Stromkreis trägt. Ein Altbau mit 40 m² lässt sich elektrisch also gar nicht "
              "an einer einzigen Leitung beheizen — unabhängig davon, welche Geräte du kaufst."),
  "h2_rec": "Mehrere Geräte, getrennt geschaltet",
  "p_rec": ("Für 40 m² sind <strong>rund 2.800 W</strong> die Zielgröße, verteilt auf mehrere Panels. "
            "Getrennte Schaltbarkeit ist bei dieser Größe kein Komfortmerkmal mehr, sondern die einzige "
            "Art, die Betriebskosten unter Kontrolle zu halten: Alles gleichzeitig laufen zu lassen "
            "kostet 0,84 € pro Stunde."),
  "pro": "✓ Zonenweise steuerbar &nbsp; ✓ Keine Installation am Gerät",
  "con": "✕ Altbau-Rechenwert liegt über einem Stromkreis",
  "p_rec_note": ("Bevor mehr Watt gekauft werden, lohnt die Gegenrechnung im "
                 "<a href=\"/guide/heizkosten-vergleich-rechner.html\">Heizkosten-Vergleich</a>."),
  "h2_kosten": "252 € pro Saison: die Grenze der Zusatzheizung",
  "p_kosten_extra": ("252 € pro Saison sind das Vierfache der 10-m²-Seite dieser Reihe. In dieser "
                     "Größenordnung ist der Vergleich mit einer <a href=\"/guide/klimaanlage-mit-"
                     "heizfunktion.html\">Klimaanlage mit Heizfunktion</a> keine akademische Übung mehr: "
                     "Sie arbeitet als Wärmepumpe, braucht für dieselbe Wärme deutlich weniger Strom und "
                     "kostet in der Anschaffung ein Vielfaches. Ob sich das rechnet, hängt daran, über "
                     "wie viele Saisons du rechnest — nicht am Stundenpreis."),
  "h2_extra": "700 W Rest: warum hier der Sicherungskasten zählt",
  "p_extra": [
    ("Ein Schuko-Stromkreis mit 16 A trägt rund 3.500 W. Nach 2.800 W für die Heizung bleiben "
     "<strong>700 W</strong> — weniger, als die 10-m²-Seite dieser Reihe überhaupt braucht. Auf dieser "
     "Leitung darf neben der Heizung praktisch nichts mehr laufen."),
    ("Die Konsequenz ist keine Kaufentscheidung, sondern eine Installationsfrage: mehrere Panels auf "
     "verschiedene Stromkreise verteilen. Welche Leitungen in deiner Wohnung auf welchen Sicherungen "
     "liegen, steht im Verteilerkasten; ob die Aufteilung so zulässig ist, beantwortet der Elektriker. "
     "Diese Seite nennt dir die Wattzahl, nicht die Elektroplanung."),
  ],
  "faqs": [
    ("Wie viel Watt Heizleistung brauche ich für 40 m²?",
     "2.400–3.200 W gesamt, verteilt auf mehrere Panels. Als alleinige Heizung im tiefen Winter ist das "
     "grenzwertig."),
    ("Passt die Heizung für 40 m² an einen Stromkreis?",
     "Der Referenzwert von 2.800 W passt, lässt aber nur 700 W für alles andere frei. Der "
     "Altbau-Rechenwert von 4.000 W passt nicht mehr: Ein 16-A-Stromkreis trägt rund 3.500 W."),
    ("Was kostet eine Heizsaison für 40 m²?",
     "Mit 2.800 W, 5 Heizstunden am Tag, einem Takt von rund 40 Prozent und 150 Heiztagen etwa 252 €. "
     "Das ist das Vierfache der 10-m²-Variante dieser Reihe."),
    ("Warum getrennt schaltbare Panels statt eines großen Geräts?",
     "Weil alles gleichzeitig 0,84 € pro Stunde kostet. Ein Einzelgerät dieser Leistungsklasse gibt es "
     "für Wohnräume ohnehin praktisch nicht, und es würde nur in seiner Blickrichtung wärmen."),
    ("Lohnt sich bei 40 m² eine Klimaanlage mit Heizfunktion?",
     "Sie braucht als Wärmepumpe für dieselbe Wärme deutlich weniger Strom, kostet in der Anschaffung "
     "aber ein Vielfaches. Bei 252 € elektrischen Saisonkosten hängt die Antwort daran, über wie viele "
     "Saisons du rechnest."),
  ],
  "cta": ("<strong>Infrarotheizungen für große Räume auf Amazon.de</strong> — mehrere Panels, getrennt "
          "schaltbar, auf verschiedene Stromkreise verteilt:"),
  "related": [("/guide/klimaanlage-mit-heizfunktion.html", "Klimaanlage mit Heizfunktion →"),
              ("/guide/heizkosten-vergleich-rechner.html", "Heizkosten-Vergleich rechnen →"),
              ("/guide/heizung-tauschen-oder-warten-gmodg.html", "Heizung tauschen oder warten? →"),
              ("/guide/strom-sparen-haushalt.html", "Strom sparen im Haushalt →")],
 },

 50: {
  "title": "Heizung für 50 m²: 3.000–4.000 W — hier endet die Steckdose",
  "desc": ("50 m² brauchen 3.000–4.000 W. Der Referenzwert von 3.500 W ist exakt die Grenze eines "
           "16-A-Stromkreises. Kosten: 1,05 € pro Stunde, rund 315 € pro Saison."),
  "og_title": "50 m² beheizen: 3.000–4.000 W",
  "og_desc": "Watt-Bedarf, 315 € pro Saison und warum elektrisch hier nur als Zonenheizung trägt.",
  "h1": "Welche Heizleistung für 50 m²? Hier endet die Steckdose",
  "sub": ("3.500 W, 1,05 € pro Stunde. Das ist exakt die Grenze eines 16-A-Stromkreises — und das "
          "Fünffache dessen, was 10 m² kosten."),
  "lead": ("50 m² ist die letzte Größe dieser Reihe und die einzige, bei der die Antwort lautet: "
           "elektrisch eher nicht. Der Referenzwert von 3.500 W trifft genau die Belastungsgrenze eines "
           "16-A-Stromkreises, es bleibt rechnerisch nichts übrig, und eine Stunde bei voller Leistung "
           "kostet 1,05 € — fünfmal so viel wie bei 10 m². Als Zonenheizung bleibt Infrarot trotzdem "
           "sinnvoll. Als Dauerlösung nicht."),
  "tldr": ("50 m² heizt du elektrisch nur mit mehreren Panels (<strong>3.000–4.000 W</strong> gesamt). "
           "Das kostet 1,05 € pro Stunde und rund 315 € pro Saison. 3.500 W sind zugleich die Grenze "
           "eines einzelnen 16-A-Stromkreises — als Dauerheizung ist eine Wärmepumpe wirtschaftlicher."),
  "h2_watt": "3.000–4.000 W: rechnerisch möglich, praktisch die Grenze",
  "p_watt": ("50 m² heizt du elektrisch nur mit mehreren Panels (3.000–4.000 W gesamt) — als Dauerlösung "
             "ist hier eine Wärmepumpe wirtschaftlicher; Infrarot bleibt Zonen- oder Zusatzheizung. Die "
             "Faustformel liefert die Zahl weiterhin brav, sagt aber nichts darüber, ob sich diese Zahl "
             "noch anschließen und bezahlen lässt. Bei 50 m² ist genau das die eigentliche Antwort."),
  "p_table": ("Schon der Neubau-Wert von 3.000 W schöpft einen 16-A-Stromkreis fast aus, der "
              "Altbau-Wert von 5.000 W liegt weit darüber. Der Abstand zwischen beiden beträgt 2.000 W "
              "— fünfmal so viel wie bei 10 m² (400 W). Bei dieser Größe entscheidet die Dämmung über "
              "die Machbarkeit, nicht nur über die Rechnung."),
  "h2_rec": "Als Zonenheizung sinnvoll, als Dauerheizung nicht",
  "p_rec": ("Für 50 m² liegt die Zielgröße bei <strong>rund 3.500 W</strong>, zwingend auf mehrere "
            "Panels verteilt. Die ehrliche Empfehlung lautet allerdings, das Ziel zu verkleinern: ein "
            "bis zwei Panels für die Zone, in der du dich abends aufhältst, statt 50 m² auf "
            "Wohlfühltemperatur. Der Rest ist eine Aufgabe für die Gebäudeheizung."),
  "pro": "✓ Als Zonenheizung sofort spürbar",
  "con": "✕ Als Dauerheizung teuer: rund 315 € pro Saison",
  "p_rec_note": ("Wenn ohnehin die Gebäudeheizung zur Debatte steht: "
                 "<a href=\"/guide/heizung-tauschen-oder-warten-gmodg.html\">Heizung tauschen oder "
                 "warten?</a>"),
  "h2_kosten": "1,05 € pro Stunde: das Fünffache von 10 m²",
  "p_kosten_extra": ("315 € pro Saison gegen 63 € bei 10 m² — dieselbe Technik, dieselbe Rechenbasis, "
                     "der fünffache Betrag. Deshalb endet diese Reihe bei 50 m² mit einer anderen "
                     "Empfehlung als bei 10 m²: Nicht die Technik wird schlechter, die Fläche wird "
                     "größer. Für den Vergleich mit einer <a href=\"/guide/klimaanlage-mit-"
                     "heizfunktion.html\">Klimaanlage mit Heizfunktion</a> ist das die Größenordnung, in "
                     "der er sich überhaupt zu rechnen lohnt — mit deinen Nutzungsjahren, im "
                     "<a href=\"/guide/heizkosten-vergleich-rechner.html\">Heizkosten-Vergleich</a>."),
  "h2_extra": "0 W übrig: der Stromkreis ist die harte Grenze",
  "p_extra": [
    ("Ein Schuko-Stromkreis mit 16 A trägt rund 3.500 W. Der Referenzwert dieser Seite liegt bei genau "
     "3.500 W. Es bleibt also rechnerisch <strong>nichts</strong> für alles andere übrig — zum "
     "Vergleich: bei 10 m² sind es 2.800 W, bei 25 m² 1.750 W, bei 40 m² 700 W. 50 m² ist das Ende "
     "dieser Skala."),
    ("Daraus folgt nicht „geht nicht“, sondern „nicht an einer Leitung“. Mehrere Panels auf "
     "verschiedene Stromkreise zu verteilen ist der übliche Weg; ob dein Verteilerkasten das hergibt, "
     "beantwortet der Elektriker. Diese Seite liefert die Wattzahl, nicht die Elektroplanung — und bei "
     "50 m² ist die Wattzahl der kleinere Teil der Frage."),
  ],
  "faqs": [
    ("Wie viel Watt Heizleistung brauche ich für 50 m²?",
     "3.000–4.000 W gesamt, zwingend auf mehrere Panels verteilt. Als Dauerlösung ist eine Wärmepumpe "
     "hier wirtschaftlicher; Infrarot bleibt Zonen- oder Zusatzheizung."),
    ("Passen 3.500 W an einen normalen Stromkreis?",
     "Sie treffen genau die Grenze: Ein Schuko-Stromkreis mit 16 A trägt rund 3.500 W, es bleibt "
     "rechnerisch nichts für alles andere übrig. Mehrere Panels gehören deshalb auf verschiedene "
     "Stromkreise — ob das dein Verteilerkasten hergibt, beantwortet der Elektriker."),
    ("Was kostet eine Heizsaison für 50 m²?",
     "Mit 3.500 W, 5 Heizstunden am Tag, einem Takt von rund 40 Prozent und 150 Heiztagen etwa 315 € — "
     "das Fünffache der 10-m²-Variante dieser Reihe (63 €)."),
    ("Kann man 50 m² allein mit Infrarot heizen?",
     "Rechnerisch ja, wirtschaftlich nein. Sinnvoll bleibt ein bis zwei Panels für die Zone, in der du "
     "dich abends aufhältst; den Rest übernimmt die Gebäudeheizung."),
    ("Warum kostet dieselbe Technik bei 50 m² fünfmal so viel wie bei 10 m²?",
     "Weil die Leistung mit der Fläche wächst und der Strompreis derselbe bleibt: 3.500 W statt 700 W "
     "bei 0,30 €/kWh Rechenbasis ergeben 1,05 € statt 0,21 € pro Stunde."),
  ],
  "cta": ("<strong>Infrarotheizungen für große Räume auf Amazon.de</strong> — bei 50 m² als "
          "Zonenheizung planen, nicht als Ersatz für die Gebäudeheizung:"),
  "related": [("/guide/klimaanlage-mit-heizfunktion.html", "Klimaanlage mit Heizfunktion →"),
              ("/guide/heizung-tauschen-oder-warten-gmodg.html", "Heizung tauschen oder warten? →"),
              ("/guide/heizkosten-senken-als-mieter.html", "Heizkosten senken als Mieter →"),
              ("/guide/stromvergleich-check.html", "Stromtarif vergleichen →")],
 },
}


# ---------------------------------------------------------------------------
# Rendering
# ---------------------------------------------------------------------------
def figures(e):
    """Every number the copy is allowed to use, derived from the entry alone."""
    qm, wref = e["qm"], e["wref"]
    return {
        "qm": qm, "wref": wref, "wref_de": de(wref), "watt": e["watt"], "raumtyp": e["raumtyp"],
        "kosten_h": eur(round(wref / 1000 * PRICE_KWH, 2)),
        "saison": de(round(wref / 1000 * PRICE_KWH * 5 * 0.4 * 150)),
        "headroom": de(CIRCUIT_W - wref),
        "w_gut": de(int(round(qm * 60 / 10) * 10)),
        "w_mittel": de(int(round(qm * 80 / 10) * 10)),
        "w_schlecht": de(int(round(qm * 100 / 10) * 10)),
    }


def render_body(e, a):
    f = figures(e)
    qm = f["qm"]
    cell = 'style="padding:7px 6px;border-bottom:1px solid #eef2f5;"'
    last = 'style="padding:7px 6px;"'
    head = 'style="text-align:left;padding:7px 6px;border-bottom:2px solid #e4ebf0;"'
    faq_html = "\n  ".join(f"<p><strong>{q}</strong><br>{ans}</p>" for q, ans in a["faqs"])
    related = "\n    ".join(f'<a href="{h}">{t}</a>' for h, t in a["related"])
    extra = "\n  ".join(f"<p>{p}</p>" for p in a["p_extra"])
    return f"""
  <h2>{a['h2_watt']}</h2>
  <p>{a['p_watt']}</p>

  <h3>Watt nach Dämmstandard für {qm} m²</h3>
  <table style="width:100%;border-collapse:collapse;margin:10px 0 16px;font-size:14.5px;">
    <tr><th {head}>Dämmung</th><th {head}>Rechenwert</th><th {head}>für {qm} m²</th></tr>
    <tr><td {cell}>Gut (Neubau, gedämmt)</td><td {cell}>60 W/m²</td><td {cell}><strong>{f['w_gut']} W</strong></td></tr>
    <tr><td {cell}>Mittel (Bestand)</td><td {cell}>80 W/m²</td><td {cell}><strong>{f['w_mittel']} W</strong></td></tr>
    <tr><td {last}>Schlecht (Altbau)</td><td {last}>100 W/m²</td><td {last}><strong>{f['w_schlecht']} W</strong></td></tr>
  </table>
  <p>Die Tabelle ist dieselbe Rechnung wie im <a href="/guide/infrarotheizung-watt-rechner.html">Watt-Rechner</a>: Fläche × Wert je Dämmstandard. {a['p_table']}</p>

  <h2>{a['h2_rec']}</h2>
  <div class="rec">
    <span class="badge">Infrarotheizung · {f['watt']} W</span>
    <p style="margin:6px 0 0;font-size:11px;color:#8a99a6;">Anzeige · Affiliate-Link — für dich derselbe Preis</p>
    <p style="margin:8px 0 4px;">{a['p_rec']} Wir testen nicht selbst; die Auswahl fasst öffentliche Tests zusammen.</p>
    <p style="margin:4px 0 8px;font-size:13.5px;"><span style="color:#177245;">{a['pro']}</span> &nbsp; <span style="color:#9a3412;">{a['con']}</span></p>
    <a style="display:inline-block;background:#f59e0b;color:#1a2733;font-weight:800;padding:9px 16px;border-radius:8px;text-decoration:none;font-size:14px;" href="{amazon(e['suchbegriff'])}" target="_blank" rel="sponsored noopener">Preis auf Amazon.de ansehen →</a>
  </div>
  <p>{a['p_rec_note']}</p>

  <h2>{a['h2_kosten']}</h2>
  <p>Ein {f['wref_de']}-W-Gerät kostet bei voller Leistung rund <strong>{f['kosten_h']} € pro Stunde</strong> (0,30 €/kWh Rechenbasis). Mit Thermostat läuft es nicht durchgehend — realistisch liegst du je nach Zieltemperatur bei 40–70 % davon. Spartipps im <a href="/guide/klimaanlage-stromkosten.html">Stromkosten-Ratgeber</a>.</p>
  <p><strong>Und über eine ganze Saison?</strong> Mit 5 Heizstunden am Tag, einem Thermostat-Takt von rund 40 Prozent und 150 Heiztagen landest du bei etwa <strong>{f['saison']} €</strong>. Das sind ausdrücklich Annahmen, keine Messung — setz deine eigenen Zahlen ein: {f['wref_de']} W ÷ 1000 × 0,30 € × 5 h × 0,4 × 150 Tage.</p>
  <p>{a['p_kosten_extra']}</p>

  <h2>{a['h2_extra']}</h2>
  {extra}

  <h2>Häufige Fragen</h2>
  {faq_html}

  <div class="cta-box">
    <p style="margin:0 0 6px;font-size:11px;color:#8a99a6;">Anzeige · Affiliate-Link — für dich derselbe Preis</p>
    <p style="margin-bottom:12px;">{a['cta']}</p>
    <a class="btn" href="{amazon('infrarotheizung+mit+thermostat')}" target="_blank" rel="sponsored noopener">Infrarotheizungen ansehen →</a>
  </div>

  <div class="related">
    <strong>Weitere Ratgeber</strong>
    {related}
  </div>
"""


def visible(s):
    v = re.sub(r'<script\b.*?</script>', ' ', s, flags=re.S)
    v = re.sub(r'<style\b.*?</style>', ' ', v, flags=re.S)
    return htmllib.unescape(re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', v)))


def sub_once(s, pattern, repl, what, path):
    """Replace exactly once, or fail loudly. A silent no-op here would leave a
    half-rewritten page that still reads as a doorway — worse than not running."""
    new, n = re.subn(pattern, lambda _m: repl, s, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f"differentiate_heizung: {os.path.basename(path)}: "
                         f"anchor not found for {what} — page shape changed, refusing to guess")
    return new


def apply_page(s, e, a, path="<memory>"):
    f = figures(e)
    qm = f["qm"]
    body = render_body(e, a)

    s = sub_once(s, r"<title>.*?</title>", f"<title>{a['title']}</title>", "title", path)
    s = sub_once(s, r'<meta name="description" content=".*?">',
                 f'<meta name="description" content="{a["desc"]}">', "description", path)
    s = sub_once(s, r'<meta property="og:title" content=".*?">',
                 f'<meta property="og:title" content="{a["og_title"]}">', "og:title", path)
    s = sub_once(s, r'<meta property="og:description" content=".*?">',
                 f'<meta property="og:description" content="{a["og_desc"]}">', "og:description", path)
    s = sub_once(s, r"<h1>.*?</h1>\s*<p>.*?</p>",
                 f"<h1>{a['h1']}</h1>\n    <p>{a['sub']}</p>", "h1 + subline", path)
    s = sub_once(s, r'<div class="tldr">.*?</div>',
                 f'<div class="tldr"><strong>Kurz gesagt:</strong> {a["tldr"]}</div>', "tldr", path)

    # lead paragraph: the first <p> after the updated badge, before the disclosure
    m = re.search(r'<!--/EB_UPDATED-->\s*\n?\s*<p>.*?</p>', s, re.S)
    if not m:
        raise SystemExit(f"differentiate_heizung: {os.path.basename(path)}: lead paragraph not found")
    s = s[:m.start()] + f"<!--/EB_UPDATED-->\n  <p>{a['lead']}</p>" + s[m.end():]

    # main body: everything the generator owned, between the model shelf and </article>
    start = s.find("<!--/EB_MODELS-->")
    end = s.find("</article>")
    if start < 0 or end < 0 or end < start:
        raise SystemExit(f"differentiate_heizung: {os.path.basename(path)}: body region not found")
    start += len("<!--/EB_MODELS-->")
    # build_onpage runs after this one and gives every <h2> a slug id. Carrying
    # those ids over for headings whose text is unchanged is what makes a quiet
    # deploy report "0 rewritten" instead of rewriting all seven files every time
    # — the log line is then a real signal rather than noise.
    ids = {text: hid for _lvl, hid, text
           in re.findall(r'<h([23]) id="([^"]+)">(.*?)</h[23]>', s[start:end], re.S)}
    body = re.sub(r"<h([23])>(.*?)</h\1>",
                  lambda m: (f'<h{m.group(1)} id="{ids[m.group(2)]}">{m.group(2)}</h{m.group(1)}>'
                             if m.group(2) in ids else m.group(0)), body, flags=re.S)
    s = s[:start] + "\n" + MARK + body + MARK_END + "\n" + s[end:]

    # JSON-LD: Article headline/description and the FAQ set, kept in lockstep with
    # the visible copy (check_faq_parity compares them verbatim).
    def fix_ld(m):
        d = json.loads(m.group(1))
        for node in d.get("@graph", [d]):
            if node.get("@type") == "Article":
                node["headline"] = a["title"]
                node["description"] = a["desc"]
            elif node.get("@type") == "FAQPage":
                node["mainEntity"] = [
                    {"@type": "Question", "name": q,
                     "acceptedAnswer": {"@type": "Answer", "text": visible(ans).strip()}}
                    for q, ans in a["faqs"]]
        return ('<script type="application/ld+json">'
                + json.dumps(d, ensure_ascii=False) + "</script>")

    s, n = re.subn(r'<script type="application/ld\+json">(\{.*?"@graph".*?\})</script>',
                   fix_ld, s, count=1, flags=re.S)
    if n != 1:
        raise SystemExit(f"differentiate_heizung: {os.path.basename(path)}: @graph JSON-LD not found")
    assert str(qm) in a["title"], "title must keep the room size (Bing ranks on it)"
    return s


# ---------------------------------------------------------------------------
# Selftest — must be able to go red
# ---------------------------------------------------------------------------
STUB = """<!DOCTYPE html><html lang="de"><head><title>OLD</title>
<meta name="description" content="OLD">
<meta property="og:title" content="OLD"><meta property="og:description" content="OLD">
<script type="application/ld+json">{"@context":"https://schema.org","@graph":[
{"@type":"Article","headline":"OLD","description":"OLD"},
{"@type":"FAQPage","mainEntity":[{"@type":"Question","name":"OLD","acceptedAnswer":{"@type":"Answer","text":"OLD"}}]}]}</script>
</head><body><header><div class="wrap"><a href="/">x</a><h1>OLD H1</h1>
    <p>OLD SUB</p></div></header><div class="wrap"><article><!--EB_UPDATED--><p>badge</p><!--/EB_UPDATED-->
  <p>OLD LEAD</p>
  <div class="disclosure">d</div>
  <div class="tldr">OLD TLDR</div>
<!--EB_MODELS--><div>shelf</div><!--/EB_MODELS-->
  <h2>OLD H2</h2><p>old</p>
</article></div></body></html>"""


def selftest():
    ok = True

    def ck(cond, msg):
        nonlocal ok
        if not cond:
            print(f"❌ selftest: {msg}")
            ok = False

    data = json.load(open(os.path.join(ROOT, "tools", "content_heizung_qm.json"), encoding="utf-8"))
    entries = {e["qm"]: e for e in data["entries"]}
    ck(set(entries) == set(ANGLES), f"one angle per size; missing {set(entries) ^ set(ANGLES)}")

    # 1. Meta fits the SERP gate (same bounds as check_meta.py).
    for qm, a in ANGLES.items():
        ck(len(a["title"]) <= TITLE_MAX, f"{qm} m²: title {len(a['title'])} > {TITLE_MAX}")
        ck(len(a["desc"]) <= DESC_MAX, f"{qm} m²: description {len(a['desc'])} > {DESC_MAX}")
        ck(f"{qm} m²" in a["title"], f"{qm} m²: title must keep the query stem")

    # 2. The whole point: nothing may be shared across siblings. Compare with the
    #    room size stripped out, so "… für 20 m²" vs "… für 30 m²" counts as equal.
    def strip_n(x):
        return re.sub(r"\d+([.,]\d+)?", "#", x)

    for field in ("title", "desc", "h1", "h2_watt", "h2_rec", "h2_kosten", "h2_extra", "lead", "tldr"):
        seen = {}
        for qm, a in ANGLES.items():
            key = strip_n(a[field])
            if key in seen:
                ck(False, f"{field}: {qm} m² and {seen[key]} m² are the same once numbers are removed")
            seen[key] = qm

    # 3. Every figure in the copy is derived, not typed from memory. This is the
    #    assertion that goes red when someone edits a number by hand.
    for qm, a in ANGLES.items():
        f = figures(entries[qm])
        blob = " ".join([a["lead"], a["tldr"], a["sub"], a["title"], a["desc"]]
                        + [a[k] for k in ("p_watt", "p_table", "p_rec", "p_kosten_extra")]
                        + a["p_extra"] + [x for pair in a["faqs"] for x in pair])
        ck(f"{f['kosten_h']} €" in blob, f"{qm} m²: hourly cost {f['kosten_h']} € not stated anywhere")
        ck(f"{f['saison']} €" in blob, f"{qm} m²: season cost {f['saison']} € not stated anywhere")
        headroom_word = "nichts" if entries[qm]["wref"] == CIRCUIT_W else f"{f['headroom']} W"
        ck(headroom_word in blob,
           f"{qm} m²: circuit headroom ({headroom_word}) not stated — that is the family's spine")
        # Every € figure in the copy must belong to the family's own derived set.
        # The four extras are the 15 m² home-office variant and its differences,
        # each spelled out with its formula on that page:
        #   1.050 W ÷ 1000 × 0,30 € × 8 h × 0,4 × 150 d = 151 €; 151−94 = 57; 126−94 = 32.
        family_eur = {figures(x)["kosten_h"] for x in entries.values()} | \
                     {figures(x)["saison"] for x in entries.values()} | \
                     {eur(PRICE_KWH), "151", "57", "32"}
        for hit in re.findall(r"(\d+(?:[.,]\d+)?)\s*€", blob):
            ck(hit in family_eur, f"{qm} m²: '{hit} €' is not a figure this family derives")

    # 4. Rendering is idempotent and does not lose the FAQ/JSON-LD parity.
    e20 = entries[20]
    once = apply_page(STUB, e20, ANGLES[20])
    twice = apply_page(once, e20, ANGLES[20])
    ck(once == twice, "second run must be a no-op (idempotent injector)")
    vtxt = visible(once)
    ld = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', once, re.S).group(1))
    faq = [n for n in ld["@graph"] if n["@type"] == "FAQPage"][0]
    ck(len(faq["mainEntity"]) == 5, "5 FAQ entries in JSON-LD")
    for it in faq["mainEntity"]:
        ck(it["name"] in vtxt, f"FAQ question not visible: {it['name'][:50]}")
        ck(" ".join(it["acceptedAnswer"]["text"].split()) in vtxt,
           f"FAQ answer not visible verbatim: {it['name'][:50]}")
    ck(once.count("<h2>") >= 4, "build_onpage needs >=4 h2 to build a TOC")
    # Wrapping the body in an EB_ marker puts both affiliate blocks under
    # check_adlabel's denylist — the label has to sit at the ad, not only in the
    # disclosure box at the top of the article. check_adlabel found this the
    # first time the injector ran; asserting it here keeps it found.
    for blk in re.findall(r'<div class="(?:rec|cta-box)">.*?</div>', once, re.S):
        ck("Anzeige" in blk, "every affiliate block needs its own Werbekennzeichnung")
    ck("OLD LEAD" not in vtxt and "OLD TLDR" not in vtxt and "OLD H1" not in once,
       "old copy must be gone, not appended")

    # 5. A page whose shape changed must fail loudly, never silently half-apply.
    try:
        apply_page(STUB.replace("<!--/EB_MODELS-->", ""), e20, ANGLES[20])
        ck(False, "missing body anchor must raise, not pass")
    except SystemExit:
        pass

    print("✅ differentiate_heizung selftest passed "
          "(meta bounds / no shared copy / derived figures only / idempotent / FAQ parity / fails loudly)"
          if ok else "")
    return 0 if ok else 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()
    if args.selftest:
        sys.exit(selftest())

    data = json.load(open(os.path.join(ROOT, "tools", "content_heizung_qm.json"), encoding="utf-8"))
    n = 0
    for e in data["entries"]:
        a = ANGLES.get(e["qm"])
        if not a:
            print(f"  no angle for {e['qm']} m² — skipped (add one before shipping the page)")
            continue
        path = os.path.join(GUIDE, f"heizung-{e['qm']}-qm.html")
        if not os.path.exists(path):
            continue
        s = open(path, encoding="utf-8").read()
        new = apply_page(s, e, a, path)
        if new != s:
            open(path, "w", encoding="utf-8").write(new)
            n += 1
    print(f"differentiate_heizung: {n} page(s) rewritten, "
          f"{len(glob.glob(os.path.join(GUIDE, 'heizung-*-qm.html')))} in the family")


if __name__ == "__main__":
    main()
