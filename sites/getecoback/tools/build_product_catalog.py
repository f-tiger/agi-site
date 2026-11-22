#!/usr/bin/env python3
"""Build the reviewed German multi-category product directory without network I/O.

Merchant destinations are derived only from reviewed model queries and the site's
fixed DE tag. Evidence survives a commerce withdrawal; unknown is never a price,
stock promise, test score or verified recommendation.
"""
from __future__ import annotations

import argparse
import datetime as dt
from html import escape
import json
import hashlib
from pathlib import Path
import re
from urllib.parse import urlencode

from agent_sources import citation_url
from filter_finder_de_sources import BINDINGS as FILTER_CARE_MODELS
from build_agent_md import to_markdown
import storage_veto

ROOT = Path(__file__).resolve().parents[1]
ROUTE = '/produkte.html'
CANONICAL = 'https://getecoback.com' + ROUTE
TITLE = 'Haushaltsgeräte nach Aufgabe und Modell vergleichen | EcoBack'
DESCRIPTION = 'Vergleiche konkrete Haushaltsgeräte nach Aufgabe und genauer Variante: mit Herstellerquellen, Grenzen und passenden Modellsuchen für Deutschland.'
SLUG = re.compile(r'[a-z0-9]+(?:-[a-z0-9]+)*')
PRODUCT_FIELDS = ('id', 'category', 'name', 'brand', 'variant', 'role', 'facts',
                  'limit', 'source', 'source_label', 'query', 'checked', 'status')
FORBIDDEN = {'asin', 'tag', 'affiliate_tag', 'merchant_url', 'affiliate_url', 'price', 'rating', 'stock'}


# These comparisons have their own reviewed catalogs and merchant eligibility.
# Only their editorial entry points belong in this directory.
SPECIALIST_GUIDES = (
    ('Luftentfeuchter', '/guide/luftentfeuchter-ratgeber.html#eb-models',
     'Ist dein Keller dauerhaft feucht? Erst messen und die Ursache klären. Bei Bedarf Tankbetrieb und Schlauchablauf vergleichen.',
     'Raumfeuchte Feuchtigkeit feuchter Keller Luftentfeuchtung Meaco Bosch Dry'),
    ('Luftbefeuchter', '/guide/luftbefeuchter-ratgeber.html#modelle-vergleichen',
     'Trockene Luft gemessen? Vergleiche manuelle Stufen mit einstellbarem Feuchteziel und prüfe, welche Filter du wechseln musst.',
     'Raumfeuchte Luftbefeuchtung trockene Raumluft Hygrostat Stadler Form Oskar little O-060 Beurer'),
    ('Ersatzteile für Luftbefeuchter', '/guide/luftbefeuchter-ratgeber.html#ersatzteile-zuordnen',
     'Welches Teil passt zu deinem Gerät? Gleiche die Modellkennung mit den Filtermatten O-030, dem Ersatzfilter 110005 oder den Kalkpads 163141 ab.',
     'Zubehör Ersatzteile Ersatzfilter Filtermatten Kalkpads O-030 110005 163141 Stadler Form Beurer'),
    ('Heizkörperthermostate', '/guide/smarte-heizkoerperthermostate-lohnen-sich.html#thermostat-start',
     'Willst du Heizzeiten einstellen? Prüfe zuerst dein Ventil und ob das gewählte Thermostat eine passende Zentrale braucht.',
     'Heizung Heizkörper regeln Thermostat Ventiladapter Smart Home tado Bosch FRITZ'),
    ('Saugroboter', '/guide/saugroboter-kaufberatung.html#modelle-vergleichen',
     'Soll ein Roboter die Räume selbstständig reinigen? Miss die Türschwellen und den Platz für die Station, bevor du die Wischfunktion wählst.',
     'Staubsaugerroboter Wischroboter Türschwelle Teppich Dreame D10 Plus Gen 2 L10s Ultra Gen 2 Roborock Saros 10R'),
    ('Saugwischer', '/guide/saugwischer-kaufberatung.html#modelle-vergleichen',
     'Willst du Hartboden von Hand saugen und wischen? Prüfe die Freigabe für feuchte Reinigung und plane Zeit für Tank und Walze ein.',
     'Wischsauger Nasswischen Bodenfreigabe Parkett Tineco S7 FlashDry Dreame H14 Pro Roborock F25 XT'),
)

PART_GUIDES = (
    ('Miele-Staubsaugerbeutel', '#miele-staubsaugerbeutel', 'bodenstaubsauger',
     'Staubbeutel Staubsaugerbeutel HyClean GN FJM TU CO 12421170 12421180 12557060 12557080 Guard S1 L1 M1 Classic Compact Complete C1 C2 C3'),
    ('Kärcher-Saugdüse 170 mm', '#kaercher-170mm-saugduese', 'fenstersauger',
     'Absaugdüse WV 2 3 4-4 5 6 8 WV2 WV3 WV4-4 WV5 WV6 WV8 2.633-112.0 2.633-605.0 2.633-512.0 2.633-532.0 26331120 26336050 26335120 26335320'),
    ('Kaffeevollautomat-Wasserfilter', '#kaffee-wasserfilter', '',
     'Ersatzfilter Philips EP2220/10 EP2231/40 AquaClean CA6903/10 Bosch VeroCafe TIE20301 Intenza TCZ7003 TCZ7033 DeLonghi Magnifica S ECAM22.110.B DLSC002'),
    ('Trotec TTK 70 HEPA-Filter', '/guide/trotec-luftentfeuchter-test.html#ttk70-hepa-filter', '',
     'Ersatzfilter HEPA Plus 7710000024 7710000077 7710000080'),
    ('Ersatzfilter für Luftreiniger', '/ersatzfilter.html#finder', 'luftreiniger',
     'Beurer LR 401 69309 Levoit Core 300S Originalfilter'),
)

APPLIANCE_EVIDENCE = '''
<section class="pc-method" id="spuelmaschine-einbaumasse">
<h2>Passt ein Einbaugeschirrspüler auch bei geöffneter Tür?</h2>
<p>Miss die Nische an mehreren Stellen und notiere den kleinsten nutzbaren Querschnitt. Halte die Gerätefront, die 90° geöffnete Tür und eine zusätzlich ausgezogene Schublade getrennt fest. Vergleiche Tiefen vom selben Bezugspunkt und notiere Vorsprünge, gegenüberliegende Schranktüren und den verbleibenden Durchgang.</p>
<p>Das deutsche Datenblatt für Bosch SBV4EBX00D nennt 865 × 598 × 550 mm (H × B × T) als Gerätemaße, 865–925 × 600 × 550 mm als Nischenmaß und 1.200 mm Tiefe bei 90° geöffneter Tür. Bosch führt das Modell als nicht mehr verfügbar. Diese Daten helfen bei der Bestandsprüfung oder bei einem Gebrauchtangebot mit passender Kennung.</p>
<p>Die Anleitung für SBV4EBX00D/48 zeigt verschiedene Montagesituationen. Gleiche die vollständige Modellkennung, die Bezugskante und die passende Zeichnung für Front und Sockel ab. Fehlt diese Zuordnung, bleibt der Platzbedarf offen. Maße allein klären keine Anschlüsse oder Montage.</p>
<p>Herstellerquellen Deutschland, gelesen am <time datetime="2026-11-20">20.11.2026</time>. <a href="https://media3.bosch-home.com/Documents/specsheet/de-DE/SBV4EBX00D.pdf">Bosch Datenblatt SBV4EBX00D</a> · <a href="https://www.bosch-home.com/de/de/product/SBV4EBX00D">Bosch Modellseite</a> · <a href="https://www.bosch-home.com/de/de/productservice/SBV4EBX00D-48">Bosch Service SBV4EBX00D/48</a> · <a href="https://media3.bsh-group.com/Documents/9001902376_A.pdf">Montagezeichnung 9001902376_A</a>.</p>
</section>
<section class="pc-method" id="waeschesaeule-zubehoer">
<h2>Welcher Verbindungssatz passt zu Waschmaschine und Trockner?</h2>
<p>Prüfe zuerst die Modellkennungen, Baureihen und den genauen Verbindungssatz. Miss die verfügbare Höhe an der niedrigsten Stelle und halte den Platz für eine geöffnete Tür oder eine ausgezogene Ablage fest. Die Außenmaße eines Zubehörs und die endgültige Einbauhöhe stehen in unterschiedlichen Unterlagen.</p>
<ul>
<li>Miele WTV 512 (9351790) misst 120 mm und gehört zur T1 White Edition. WTV 511 (9351780) misst 120 mm und wird für T1 Chrome Edition oder T1 Classic angegeben. Beide haben eine Schublade. Die jeweiligen Miele-Seiten nennen WTZH und WTW als Ausnahmen bei den Waschmaschinen.</li>
<li>Miele WTV 501 (9256130) misst 25 mm und wird für T1 Chrome Edition oder T1 Classic angegeben. Die Produktseite schließt W 1000 und WTZH aus. W 3000, W 5000 und W Classic werden mit gerader Blende angegeben. Die Anleitung der WTV 511 und 512 behandelt auf Seite 13 den Zustand der Abdeckung nach der Demontage. Prüfe beim Gebrauchtkauf, welche Teile tatsächlich vorliegen.</li>
<li>Die Bosch-Anleitung für WQG241001 nennt WTZ27410 und WTZ27400 mit ausziehbarer Arbeitsplatte, eine geeignete Waschmaschine desselben Herstellers mit gleicher Breite und Tiefe sowie den Ausschluss eines Podests für die Säule. Die Zubehörseiten nennen eine Waschmaschinen-Arbeitsplattentiefe über 55 cm. WTZ27410 wird mit 35 × 593 × 556 mm angegeben, WTZ27400 mit 42 × 595 × 574 mm (H × B × T).</li>
<li>Die Anleitung nennt für WQG241001 einen Gerätekörper von 842 × 598 × 613 mm, eine Tiefe von 648 mm bei geschlossener und 1.096 mm bei geöffneter Tür. Dieselbe Anleitung führt WTZ1110 separat als Zubehör für den Kondensatablauf auf.</li>
</ul>
<p>Prüfe den Lieferumfang und die Bezugskanten der Messung. Fehlende Angaben zu Auszug, Belastung oder Kombination bleiben offen. Bei unklarer Kombination kommen getrennte Aufstellung oder Rückfrage beim Hersteller in Frage.</p>
<p>Herstellerquellen Deutschland, gelesen am <time datetime="2026-11-20">20.11.2026</time>. <a href="https://www.miele.de/product/9351790/wasch-trocken-verbindungssatz-wtv-512">Miele WTV 512</a> · <a href="https://www.miele.de/product/9351780/wasch-trocken-verbindungssatz-wtv-511">Miele WTV 511</a> · <a href="https://www.miele.de/product/9256130/wasch-trocken-verbindungssatz-wtv-501">Miele WTV 501</a> · <a href="https://media.miele.com/downloads/c9/e5/00_56D762FF8C918420E10080000AB5C9E5.pdf">Miele Anleitung für WTV 511 und 512</a> · <a href="https://media3.bosch-home.com/Documents/9001984634_A.pdf">Bosch WQG241001 Anleitung, Seiten 6, 27 und 48</a> · <a href="https://www.bosch-home.com/de/de/product/WTZ27410">Bosch WTZ27410</a> · <a href="https://www.bosch-home.com/de/de/product/WTZ27400">Bosch WTZ27400</a>.</p>
</section>
<section class="pc-method" id="dunstabzug-umluft-zubehoer">
<h2>Welches Umluftset oder welcher Ersatzfilter gehört zur Dunstabzugshaube?</h2>
<p>Notiere die volle E-Nummer, den Aufbau und die Nummer des bereits verbauten Sets. Beim Wechsel von Abluft zu Umluft brauchst du die Angaben zum kompletten Set. Für einen Filterwechsel brauchst du die Angaben zum eingebauten Halter und zum Ersatzfilter. Ein Filter aus dem Zubehörverzeichnis ist noch kein vollständiges Set.</p>
<p>Das deutsche Bosch-Datenblatt zur DWB66BC50 nennt auf höchster Normalstufe 621 m³/h und 69 dB(A) re 1 pW im Abluftbetrieb. Für die angegebene Clean Air Plus-Konfiguration stehen dort 422 m³/h und eine Schallleistung von 74 dB(A) re 1 pW. Die Zahlen gelten für die benannte Betriebsart und Ausstattung. Ein Datenblattwert beschreibt nicht den Schalldruck in deiner Küche.</p>
<p>Das Blatt nennt 600 mm Gerätebreite und 500 mm Tiefe. Es unterscheidet die Gerätehöhe bei Abluft (635–965 mm), die allgemein bezeichnete Umluftzeile (635–1075 mm), Clean Air Plus innen am Kamin (833–1163 mm) und außen (703 mm). Nutze die Zeichnung und miss vom selben Bezugspunkt. Vergleiche die dokumentierten Bedingungen, bevor du eine passende Bauhöhe ableitest.</p>
<p>Der deutsche Bosch-Katalog 2024/25 führt für die DWB66BC50 DWZ1DX1I4 (Clean Air Standard), DWZ1DX1I6 (Clean Air Plus innen) und DWZ1FX5C6 (Clean Air Plus außen). Bosch führt DWZ1DX1I6 unter der Artikelnummer 17004061 mit Filterhalter, Clean Air Plus-Filter, Schlauch, zwei Schellen und Befestigungsmaterial. DZZ0XX0P0 und DZZ1XX1B6 sind als Ersatzfilter aufgeführt. In der jeweiligen Zubehörzuordnung stimmen die Listen für DZZ1XX1B6 und DWZ1DX1I6 nicht vollständig überein. Prüfe die Verbindung über die volle E-Nummer und das tatsächliche Set. Die Angabe zur Spülmaschinenreinigung gehört zum Metallfettfilter. Für DZZ1XX1B6 nennt die Zubehörseite 12–18 Monate.</p>
<p>Miele beschreibt DKF 12-R, Artikel 10271450, als einzelnen regenerierbaren Geruchsfilter. DKF 16-P, Artikel 11762660, umfasst zwei DKF 12-P und ist für die angegebene DA 7006 D dokumentiert. Für DKF 12-R nennt Miele Regeneration im Abstand von sechs Monaten und eine angegebene Nutzungsdauer von drei Jahren. Für DKF 16-P nennt Miele einen Wechselabstand von sechs Monaten. Die Zeitangaben gehören zu den jeweiligen Filtern und Bedingungen. Ein angebotenes Set oder eine allgemeine Empfehlung belegt noch keine Passung.</p>
<p>Herstellerquellen Deutschland, gelesen am <time datetime="2026-11-20">20.11.2026</time>. <a href="https://media3.bosch-home.com/Documents/specsheet/de-DE/DWB66BC50.pdf">Bosch DWB66BC50 Datenblatt</a> · <a href="https://media3.bosch-home.com/Documents/25665283_EBG_Handbuch_Linie_2024_2025_150dpi_ePaper.pdf">Bosch Zubehörkatalog 2024/25</a> · <a href="https://www.bosch-home.com/de/de/product/kochen-backen/kochzubehoer-backzubehoer/dunstabzugshauben/startersets-umluftbetrieb/DWZ1DX1I6">Bosch DWZ1DX1I6</a> · <a href="https://www.bosch-home.com/de/de/product/kochen-backen/kochzubehoer-backzubehoer/dunstabzugshauben/aktivkohlefilter/DZZ1XX1B6">Bosch DZZ1XX1B6</a> · <a href="https://www.miele.de/product/10271450/regenerierbarer-longlife-airclean-geruchsfilter-dkf-12-r">Miele DKF 12-R</a> · <a href="https://www.miele.de/product/11762660/active-airclean-geruchsfilter-mit-aktivkohle-dkf-16-p">Miele DKF 16-P</a>.</p>
</section>

<section class="pc-method" id="backofen-vollauszug-belege">
<h2>Welcher Vollauszug passt zum Backofen und wie viele Paare sind enthalten?</h2>
<p>Vergleiche zuerst Modellkennung, Baureihe und die benötigten Ebenen. Halte die bestätigten Zubehörteile und Paarzahlen getrennt von den gewünschten Ebenen fest. Prüfe vor einem Ersatzkauf auch den tatsächlichen Lieferumfang.</p>
<p>Das deutsche Bosch-Datenblatt HEZ638370 nennt fest zugeordnete Vollauszüge auf den Ebenen 1, 2 und 3 für passende 60-cm-Backöfen mit Pyrolyse. Backwagen, Dampfgaren und reine Mikrowellenanwendungen fallen außerhalb der benannten Fälle. Eine zugesagte Gerätekombination setzt die Prüfung der vollständigen E-Nummer voraus.</p>
<ul>
<li>Miele HFC 72 (9520670) ist ein Paar für H 6000 und H 7000 Backöfen mit Pyrolyse; die Produktseite benennt PyroFit ausdrücklich.</li>
<li>Miele HFC 70 (9520650) ist ein Paar für H 6000/H 7000 und DGC 6000/DGC 7000. HFC 70-C (10581490) ist ein Paar für H 2000. Prüfe den Reinigungshinweis der konkreten Kombination. Eine fehlende Angabe lässt die Frage offen.</li>
<li>Das deutsche Angebot H 2861 BP (12144610) führt ein Paar HFC 70-C, ein Paar Aufnahmegitter und je ein HBB 71, HUBB 71 und Rost auf. Die Anleitung des H 2861 BP schließt auf Seite 101 das Zubehör dieses Geräts, darunter FlexiClip-Auszüge, Aufnahmegitter und Rost, bei der Pyrolyse aus. Für andere Kombinationen gilt die jeweilige Anleitung. Die Seiten 23 und 42 unterscheiden die Position der HFC 70-C von der Ebene des Garguts. Die Tabellen ab Seite 90 kennzeichnen Werte mit und ohne HFC 70-C als +HFC und -HFC.</li>
</ul>
<p>Für die Platzfrage miss geöffnete Tür, vorstehendes Zubehör und Durchgang am gleichen Bezug. Die Beobachtung ordnet Bewegungsraum ein. Belastbarkeit und Freigaben ergeben sich aus der passenden Anleitung.</p>
<p>Herstellerquellen Deutschland, gelesen am <time datetime="2026-11-20">20.11.2026</time>. <a href="https://media3.bosch-home.com/Documents/specsheet/de-DE/HEZ638370.pdf">Bosch HEZ638370</a> · <a href="https://www.miele.de/product/9520670/original-miele-flexiclip-vollauszuege-pyrofit-hfc-72">Miele HFC 72</a> · <a href="https://www.miele.de/product/9520650/original-miele-flexiclip-vollauszuege-hfc-70">Miele HFC 70</a> · <a href="https://www.miele.de/product/10581490/original-miele-flexiclip-vollauszuege-hfc-70-c">Miele HFC 70-C</a> · <a href="https://www.miele.de/product/12144610/backofen-h-2861-bp-edelstahl-cleansteel">Miele H 2861 BP und Lieferumfang</a> · <a href="https://media.miele.com/downloads/85/93/00_C7F12828C43B1FD0A7F0508AFEC78593.pdf">Miele H 2861 BP Anleitung, Seite 101</a>.</p>
</section>

<section class="pc-method" id="luftgeraete-rollen">
<h2>Passt ein Rollensatz oder Rollwagen zum vorhandenen Luftgerät?</h2>
<p>Halte Gerätekennung, Zubehörnummer und Lieferumfang getrennt fest. Die deutschsprachige Anleitung 3PDE690982-1 für Daikin MC80ZVM nennt KKS080B41 als separat erhältlichen Satz mit vier Rollen. BAFT501A bezeichnet einen anderen Zubehörtyp. Die Geräteabmessungen 630 × 315 × 315 mm beziehen sich auf die angegebene Geräteausführung. Die Anleitung weist 9,8 kg Gerätegewicht und zwei Tragegriffe aus. Sie liefert an dieser Stelle keine Maße des Geräts mit montierten Rollen.</p>
<p>Venta führt Artikel 6060 (ausgewählte Produktnummer 6060500) als einzelnen separaten Rollwagen. Der Fließtext nennt unter anderem Original Connect AH530, AH535, AH550 und AH555. Die Tabelle nennt stattdessen unter anderem LW24, LW24 Plus, LW44 und LW44 Plus. Die LW25- und LW45-Gruppen kommen in beiden Angaben vor. Wenn deine genaue Modellkennung nur in einem Teil der Seite erscheint, kläre die Passung vor dem Kauf beim Hersteller. Eine Liste ersetzt keinen bestätigten Lieferumfang oder eine Nutzerbeobachtung am konkreten Gerät.</p>
<p>Miss für einen vorhandenen Aufbau den vollständigen Bewegungsraum, die tatsächlich genutzte Fläche und beide Zustände vor und nach der Platzänderung. Dokumentiere Anforderungen an Untergrund, Schlauch und Stromführung nach der Anleitung. Ein Zubehörmaß allein erlaubt kein Urteil über Tragfähigkeit, Kippsicherheit oder Schwellen.</p>
<p>Herstellerquellen Deutschland, gelesen am <time datetime="2026-11-20">20.11.2026</time>. <a href="https://www.daikin.de/content/dam/document-library/operation-manuals/airp/air-purifiers/mc80z/MC80Z_Operation%20manual_3PDE690982-1_German.pdf">Daikin MC80ZVM deutsche Bedienungsanleitung</a> · <a href="https://www.venta-air.com/Rollwagen-fuer-Venta-Luftbefeuchter/6060">Venta 6060 Produktbeschreibung und technische Daten</a>.</p>
</section>

<section class="pc-method" id="induktionsgeschirr-kochzonen">
<h2>Welche vorhandene Pfanne passt auf welche Induktionszone?</h2>
<p>Miss die tatsächlich aufliegende Bodenfläche. Der Nenndurchmesser am oberen Rand und der in der Kochzonentabelle angegebene Bodendurchmesser sind verschiedene Größen. Tefal nennt für die deutsche Duetto-Pfanne A70404 beziehungsweise A7040463 mit 24 cm Nenndurchmesser einen Induktionsboden von 175 mm.</p>
<p>Für das deutsche Miele KM 7464 FR (11022890) nennt die Anleitung M.-Nr. 11 163 871 in der Kochzonentabelle auf Seite 43 vorne links 140–190 mm und hinten links 100–160 mm für runde Böden. Rechts steht für eine einzelne PowerFlex-Zone 150–230 mm, für die verbundene Zone 220–230 mm. Bei rechteckigem Geschirr unterscheidet die Tabelle 150–230 × 150–190 mm und 220–230 × 220–390 mm (Breite × Tiefe). Vergleiche die gemessene Fläche und die tatsächlich gewählte Zone. Die gesamte markierte Kochfläche ist kein Mindestmaß für jedes Geschirr.</p>
<p>Die Miele-Hilfe zur Anzeige u unterscheidet fehlendes, ungeeignetes, zu kleines und auf der Zone nicht richtig platziertes Geschirr. Halte den beobachteten Zustand und die gewählte Bedienart getrennt fest. Zeitwahl, Abschaltfunktion und Booster betreffen verschiedene Vorgänge. Die Anleitung beschreibt auf den Seiten 46 und 55 die zusammengehörigen Zonen und deren Priorisierung. Auf den Seiten 49 und 56 beschreibt sie getrennte Zeitfunktionen und eine maximale Booster-Zeit von 15 Minuten. Ein Maßvergleich belegt keine Wärmeverteilung und keinen Defekt.</p>
<p>Herstellerquellen Deutschland, gelesen am <time datetime="2026-11-20">20.11.2026</time>. <a href="https://www.miele.de/product/11022890/herdunabhangiges-induktionskochfeld-km-7464-fr">Miele KM 7464 FR</a> · <a href="https://media.miele.com/downloads/0d/c6/04_C7F12828E3FE1FE0BB8C547A67460DC6.pdf">Miele Anleitung 11 163 871, Kochzonentabelle</a> · <a href="https://www.miele.de/support/customer-assistance/kochfelder-1180/alle_kategorien/u_in_der_anzeige-92670027531">Miele Hilfe zur Anzeige u</a> · <a href="https://www.tefal.de/bedienungsanleitungen/kochgeschirr/toepfe-und-pfannen-mit-griff-aus-edelstahl/duetto-pfanne-24-cm-a70404/csp/2100120570">Tefal Duetto A70404 und Induktionsboden</a>.</p>
</section>

<section class="pc-method" id="geschirrspueler-ecofeedback-ende">
<h2>Was zeigt der Geschirrspüler vor der Wahl und nach Programmende?</h2>
<p>Die deutsche Anleitung G7673de-002 für Miele G 7673 SCVi AutoDos E (12338510) beschreibt in EcoFeedback auf den Seiten 43–44 Balken für die Verbrauchsprognose vor dem Start und nach dem abgeschlossenen Programm die angezeigten Verbrauchswerte des Durchgangs. Die Prognose hängt unter anderem an Programm, Extras, Beladung und Bedingungen. Beim Ausschalten werden die angezeigten Ist-Werte des einzelnen Programms gelöscht. Erfasse diese Werte rechtzeitig. Seite 42 führt Betriebsstunden, Zyklen, Gesamtverbrauch, Typenschild und Software getrennt auf. Die Gesamtverbrauchsansicht und eine externe Messung haben eigene Bezugszeiträume. Die Werkseinstellungen und eine vorhandene WLAN-Rücksetzung werden separat behandelt.</p>
<p>Auf Seite 66 beschreibt die Anleitung Ende als Programmmeldung. Ein geschlossenes Gerät kann am Ende langsam optisch blinken. Die Anzeige erlischt später, während ein Trocknungsgebläse noch laufen kann. Schalte Anzeige, Türereignis, Lüfter und dokumentiertes Programmende bei der eigenen Beobachtung nicht gleich. Seite 67 beschreibt das automatische Ausschalten nach 10 Minuten mit Ausnahmen unter anderem für Programm und Fehler.</p>
<p>Die allgemeine AutoOpen-Hilfe nennt Programme, die schon vor Ablauf der Restzeit öffnen. Die separate QuickPowerWash-Hilfe beschreibt einen eigenen Ablauf mit Ende/AutoOpen und nennt eine mögliche Verzögerung bei eingeschaltetem, unberührtem Gerät. Behandele ein beobachtetes Öffnen nur mit genau zugeordnetem Programm und passenden Markern als Evidenz.</p>
<p>Herstellerquellen Deutschland, gelesen am <time datetime="2026-11-20">20.11.2026</time>. <a href="https://www.miele.de/product/12338510/vollintegrierter-geschirrspueler-g-7673-scvi-autodos-e-obsidianschwarz">Miele G 7673 SCVi AutoDos E</a> · <a href="https://media.miele.com/downloads/c0/11/02_C7F128281BA21FD0A0E8671DD96BC011.pdf">Miele Anleitung G7673de-002</a> · <a href="https://www.miele.de/support/customer-assistance/geschirrspuelen-1184/alle_kategorien/tuer_oeffnet_automatisch_bei_programmende-96372666635">Miele AutoOpen erklären</a> · <a href="https://www.miele.de/support/customer-assistance/geschirrspuelen-1184/alle_kategorien/tuer_oeffnet_nicht_automatisch_quickpowerwash-92939853195">Miele QuickPowerWash und AutoOpen</a>.</p>
</section>

<section class="pc-method" id="tischgeschirrspueler-eco-belege">
<h2>Reicht ein Tischgeschirrspüler für die tatsächlich anfallende Ladung?</h2>
<p>Das deutsche Datenblatt für Bosch SKS62E32EU nennt sechs Maßgedecke, Klasse F sowie für Eco 50 einen Labelwert von 61 kWh pro 100 Zyklen, 8,0 l je Durchgang und 3 Stunden 55 Minuten. Die deutsche Modellseite nennt 0,613 kWh je Eco-Zyklus. Auf dem Datenblatt steht außerdem 49 dB(A) re 1 pW, Geräuschklasse C. Die Schallleistung am Gerät und der Schalldruck am eigenen Sitzplatz haben unterschiedliche Bezugsgrößen.</p>
<p>Maßgedecke beschreiben eine standardisierte Ladung. Prüfe eigene Teller, Schalen und größere Teile anhand belegter Ladenutzung, einschließlich benötigter weiterer Durchgänge. Die Programmliste und die Optionen VarioSpeed und ExtraTrocknen erlauben weder die Übernahme von Eco-Werten noch die Annahme einer passenden Programm-Option-Kombination. Vergleiche ein vorhandenes und ein mögliches kleineres Gerät bei derselben tatsächlich gereinigten Menge und mit denselben Bewertungsgrenzen.</p>
<p>Herstellerquellen Deutschland, gelesen am <time datetime="2026-11-20">20.11.2026</time>. <a href="https://media3.bosch-home.com/Documents/specsheet/de-DE/SKS62E32EU.pdf">Bosch SKS62E32EU deutsches Datenblatt</a> · <a href="https://www.bosch-home.com/de/de/product/SKS62E32EU">Bosch SKS62E32EU deutsche Modellseite mit Eco-Einzelwert</a>.</p>
</section>

<section class="pc-method" id="airfryer-einzelkoerbe-und-backform">
<h2>Passt ein einzelnes Stück oder eine Backform in den richtigen Airfryer-Korb?</h2>
<p>Philips Deutschland nennt für den NA352/00 zwei getrennte Körbe mit 6 und 3 l. Die Summe beschreibt den gesamten Stauraum beider Körbe, keinen einzelnen Korb. Synchronisieren betrifft den programmierten Endzeitpunkt. Copy ist eine andere Funktion. Aus einem Timerende folgt kein belegter tatsächlicher Zustand des Inhalts.</p>
<p>Die deutsche Philips-Hilfe führt für die genannten Modelle NA350/351/352 ein maximales rechteckiges äußeres Formmaß von 18 × 9 cm für den kleinen und 17 × 18 cm für den großen Korb sowie eine Höhe von 7 cm auf. Die Form und die frei bleibenden Seiten sind getrennt zu betrachten. Das HD9945-Set nennt die Hilfe für den großen Korb dieser Modelle. Philips führt HD9945/01 in der Unterstützung für den NA352/00 als Form mit neun Silikonförmchen. HD9920/00 ist separat als Grillrost mit fünf Spießen aufgeführt. Daraus ergibt sich keine Korbzuordnung für dieses Zubehör. Die NA35x-Kurzanleitung zeigt die MAX-Markierung jeweils am ausgewählten Korb. Halte Typenschild, Zubehörsuffix, Korbzuordnung und Füllbeobachtung getrennt fest.</p>
<p>Für den HD9875/90 bezeichnet Philips die 8,3 l als Volumen der gesamten Pfanne. Die Angabe von 2 kg bezieht sich in der Produktbeschreibung auf tiefgekühlte Pommes frites. Die Werte unterscheiden sich in Messgröße, Bauteil und Art der Beladung. Eine beobachtete passende Menge für andere Inhalte bleibt eine separate Frage.</p>
<p>Herstellerquellen Deutschland, gelesen am <time datetime="2026-11-20">20.11.2026</time>. <a href="https://www.philips.de/c-p/NA352_00/3000-series-dual-basket-airfryer">Philips NA352/00 und Korbgrößen</a> · <a href="https://www.philips.de/c-p/NA352_00/3000-series-dual-basket-airfryer/support">Philips NA352/00 Zubehör</a> · <a href="https://dam.versuni.com/m/11ba80be418a7f33/original/NA35x-Quick-Start-Guide.pdf">Philips NA35x Markierung und Timerfunktionen</a> · <a href="https://www.philips.de/c-f/XC000015318/welche-art-von-backform-kann-ich-im-philips-airfryer-verwenden/1000">Philips Hilfe zu Backformen und Modellgruppen</a> · <a href="https://acc.philips.de/c-p/HD9875_90/connected-airfryer-xxl-serie-7000">Philips HD9875/90 Pfannen- und Gewichtsangaben</a>.</p>
</section>

<section id="kaffeevollautomat-pflege-und-kauf" aria-labelledby="kaffeevollautomat-pflege-und-kauf-heading">
  <h2 id="kaffeevollautomat-pflege-und-kauf-heading">Milchsystem, Wasserfilter und Pflege bei Kaffeevollautomaten vergleichen</h2>
  <h3 id="kaffee-wasserfilter" style="scroll-margin-top:210px">Welcher Wasserfilter passt zu meinem Kaffeevollautomaten?</h3>
  <ul>
    <li><strong>Philips EP2220/10 und EP2231/40:</strong> Die Modellblätter für <a href="https://www.documents.philips.com/assets/20210904/3ea44c9845d84f26818ead990053f95e.pdf">EP2220/10</a> und <a href="https://www.download.p4c.philips.com/files/e/ep2231_40/ep2231_40_pss_deuat.pdf">EP2231/40</a> nennen AquaClean. Philips führt <a href="https://acc.philips.de/c-p/CA6903_10/kalk-und-wasserfilter"><strong>AquaClean CA6903/10</strong></a> für die Serie 2200.</li>
    <li><strong>Bosch VeroCafe TIE20301:</strong> Das <a href="https://media3.bsh-group.com/Documents/specsheet/de-DE/TIE20301.pdf">Bosch-Datenblatt</a> führt BRITA Intenza <strong>TCZ7003</strong> oder <strong>TCZ7033</strong> als Sonderzubehör. Prüfe Artikelnummer und Stückzahl im Angebot.</li>
    <li><strong>De’Longhi Magnifica S ECAM22.110.B:</strong> Der <a href="https://www.delonghi.com/de-de/s/ECAM22.110.B">De’Longhi-Modellservice</a> führt <strong>DLSC002</strong>. Die <a href="https://dls.delonghigroup.com/files/docs/5/DE-57132C9061.pdf">deutsche Anleitung</a> beschreibt die Filterverwendung in Abschnitt 8.</li>
  </ul>
  <p>Vergleiche Typenschild und Artikelnummer auf der Packung. Bei unbekannter Modellendung, einer anderen Filterkennung oder einer widersprüchlichen Händlerangabe warte mit dem Kauf und prüfe die Angaben beim Hersteller. Diese Modellzuordnungen gelten für den deutschen Markt.</p>
  <p>Die Modellzuordnung klärt den passenden Artikel. Ob der Filter eingesetzt und aktiviert ist, prüfst du separat am Gerät. Passe die Wasserhärte und gegebenenfalls den Filtermodus nach der Anleitung an. Wenn du ohne optionalen Filter arbeiten möchtest, richte die Maschine dafür nach Anleitung ein und halte die Pflegehinweise ein. Dafür brauchst du keinen Ersatzfilter.</p>
  <p>Herstellerangaben für Deutschland geprüft am <time datetime="2026-11-22">22.11.2026</time>.</p>
  <!--EB_COFFEE_FILTER_SHARE--><p><a href="https://www.reddit.com/submit?url=https%3A%2F%2Fgetecoback.com%2Fprodukte.html%23kaffee-wasserfilter&amp;title=Welcher%20Wasserfilter%20passt%20zu%20meinem%20Kaffeevollautomaten%3F" rel="noreferrer" style="display:inline-flex;align-items:center;min-height:44px">Auf Reddit teilen</a></p><!--/EB_COFFEE_FILTER_SHARE-->
  <p>Prüfe vor dem Kauf die volle Modellkennung. Philips EP2231/40 hat einen zweiteiligen LatteGo-Milchbehälter, EP2220/10 einen klassischen Milchaufschäumer. Beim Bosch TIE20301 wird die Milch laut Produktblatt in die Tasse gefüllt. Für hohe Gläser nennt Bosch bis zu 13&nbsp;cm. Prüfe ein eigenes Glas zusätzlich mit Griff und geradem Einsetzweg. Für beide Philips-Modelle ist eine Doppeltasse Kaffee ausgewiesen. Die Angaben führen keine Doppeltasse Milch auf.</p>
  <p>Philips nennt AquaClean bei diesen beiden Geräten im Lieferumfang. Bosch nennt BRITA Intenza TCZ7003 oder TCZ7033 beim TIE20301 als Sonderzubehör. De’Longhi führt DLSC002 für die Magnifica S ECAM22.110.B. Ein bestätigter beigelegter Originalfilter kann anders aussehen als das separat angebotene Teil. Bei Gebrauchtware oder einem Händlerbundle den konkreten Lieferumfang prüfen. Wer keinen optionalen Filterbetrieb wünscht, braucht dafür keinen Filterkauf einzuplanen. Die Pflege nach Herstelleranleitung bleibt Teil des Betriebs.</p>
  <p>Orange blinkendes AquaClean kann den Erstgebrauch, einen verbrauchten Filter oder einen Hinweis nach der Entkalkung anzeigen. Blau bestätigt die Aktivierung. Bei fehlender Anzeige und unbekannter Vorgeschichte zuerst die Aktivierungsvoraussetzungen im Handbuch klären. Philips nennt 95&nbsp;l durch den Filter sowie einen Wechsel spätestens nach drei Monaten. Tassen allein erfassen Spülvorgänge nicht vollständig. De’Longhi nennt für den eingesetzten Filter zwei Monate bei normaler Nutzung und höchstens drei Wochen bei Nichtgebrauch. An der eindeutig identifizierten De’Longhi-Entkalkungsleuchte signalisiert Blinken die Aufforderung, Dauerlicht das gestartete Programm.</p>
  <p>Automatisches Spülen der Maschine, Pflegen der Milchteile, Reinigen der Brühgruppe und Entkalken sind eigene Vorgänge. Beim TIE20301 kombiniert Calc’nClean zwei Aufgaben. Die Bosch-Liste führt TCZ8001A für die Reinigung und TCZ8002A zum Entkalken separat. Philips schreibt für die Brühgruppe wöchentliche Wasserpflege und monatlich einen passenden Kaffeefettlöser aus. De’Longhi nennt für die Magnifica S mindestens eine Reinigung pro Monat ohne Reinigungsmittel an der Brühgruppe. Das konkrete Programm und die Pflege der herausnehmbaren Teile im Handbuch prüfen.</p>
  <p>Auch die Bedienung kann einen Neukauf überflüssig machen. Die geprüften Philips-2200-Modelle können vorgemahlenen Kaffee einzeln ausgeben und die größte Getränkemengenstufe je Getränk speichern. Beim Philips-Kaffeesatzbehälter kann eine Leerung im ausgeschalteten Zustand die Anzeige stehen lassen. Die Bedienfeldoption für Signaltöne umfasst keine Töne für Ein/Aus und Start/Stopp. Herstellerangaben zum Menü belegen keine tatsächliche Lautstärke, unabhängige Fehlerursache oder passende Benutzung eines anderen Modells.</p>
  <p>Herstellerquellen gelesen am 20.11.2026. <a href="https://www.delonghi.com/de-de/s/ECAM22.110.B">De’Longhi ECAM22.110.B Modellservice</a> · <a href="https://dls.delonghigroup.com/files/docs/5/DE-57132C9061.pdf">De’Longhi Bedienungsanleitung, Abschnitte 2.4, 8, 11, 13 und 14</a> · <a href="https://www.delonghi.com/de-de/faqs/DELONGHI/a/585643">De’Longhi Filterausführungen</a> · <a href="https://acc.philips.de/c-p/EP2231_40/series-2200-kaffeevollautomat/support">Philips Handbuchzugang EP2231/40</a> · <a href="https://acc.philips.de/c-p/EP2220_10/series-2200-kaffeevollautomat/support">Philips Handbuchzugang EP2220/10</a> · <a href="https://www.download.p4c.philips.com/files/e/ep2231_40/ep2231_40_pss_deuat.pdf">Philips Datenblatt EP2231/40</a> · <a href="https://www.documents.philips.com/assets/20210904/3ea44c9845d84f26818ead990053f95e.pdf">Philips Datenblatt EP2220/10</a> · <a href="https://media3.bsh-group.com/Documents/specsheet/de-DE/TIE20301.pdf">Bosch Datenblatt TIE20301</a>.</p>
</section>
<section id="geschirrspueler-wasserhaerte-reiniger" aria-labelledby="geschirrspueler-wasserhaerte-reiniger-titel">
  <h2 id="geschirrspueler-wasserhaerte-reiniger-titel">Wasserhärte, Salz, Klarspüler und Reiniger für den Geschirrspüler prüfen</h2>
  <p>Nutze die deutsche Anleitung zur genauen Modellkennung. Wenn der Versorger nur „weich“, „mittel“ oder „hart“ nennt, erfrage die Zahl und Einheit für deine Versorgungszone. Der Härtebereich nach § 9 WRMG hilft bei der Einordnung. Für die Gerätestufe zählt der tatsächliche Zulauf, bei vorhandener zentraler Enthärtung also deren passende Ausgangsseite. <a href="https://www.gesetze-im-internet.de/wrmg/__9.html">§ 9 WRMG</a> · <a href="https://media.miele.com/downloads/c0/11/02_C7F128281BA21FD0A0E8671DD96BC011.pdf">Miele G7673de-002, Seiten 25 und 32</a></p>
  <h3>Härtewert und Packungsgrenze prüfen</h3>
  <p>Beim deutschen Bosch SBV4EBX00D umfasst die höchste gedruckte Härtestufe H07 31–50 °dH oder 5,5–8,9 mmol/l. Beim deutschen SKS62E32EU gilt H:07 für 31–35 °dH oder 5,5–6,2 mmol/l. Lies die Spalte in der Einheit des Belegs. Liegt der Wert zwischen gedruckten Zeilen oder außerhalb, kläre den Modellbezug. Für den Miele G 7673 SCVi AutoDos E nennt die Anleitung bei bestätigten Schwankungen am gleichen Zulauf den höchsten gemeldeten Wert, beispielsweise 15 °dH bei 10–15 °dH. Die Werkseinstellung beträgt 14 °dH und der dokumentierte Enthärterbereich reicht bis 70 °dH. <a href="https://media3.bsh-group.com/Documents/9001790760_C.pdf">Bosch SBV4EBX00D, Seiten 24–25</a> · <a href="https://media3.bosch-home.com/Documents/9001707727_A.pdf">Bosch SKS62E32EU, Seiten 22–23</a> · <a href="https://media.miele.com/downloads/c0/11/02_C7F128281BA21FD0A0E8671DD96BC011.pdf">Miele G7673de-002, Seiten 25–26 und 32</a></p>
  <p>Für einen Kombireiniger mit Salzersatz müssen Packung und Gerätevorgabe denselben Härtewert abdecken. Die beiden Bosch-Anleitungen nennen dafür höchstens 21 °dH. Miele nennt beim G 7673 den Kombireiniger-Fall unter 21 °dH. Ist das konkrete Produkt nur bis 18 °dH beschriftet, liegt ein Zulaufwert von 21 °dH außerhalb des Packungsfalls. Davon getrennt nennen beide Bosch-Geräte 0–6 °dH als eigenen Weichwasserfall ohne Spezialsalz. Miele nennt dafür ständig unter 5 °dH. <a href="https://media3.bsh-group.com/Documents/9001790760_C.pdf">Bosch SBV4EBX00D, Seiten 24–26 und 28–29</a> · <a href="https://media3.bosch-home.com/Documents/9001707727_A.pdf">Bosch SKS62E32EU, Seiten 22–25 und 26–28</a> · <a href="https://media.miele.com/downloads/c0/11/02_C7F128281BA21FD0A0E8671DD96BC011.pdf">Miele G7673de-002, Seiten 26–27 und 60</a></p>
  <h3>Erste Salzfüllung, Fach und Mangelanzeige</h3>
  <p>Salz, Klarspüler und manuell dosierter Geschirrspülreiniger haben jeweils ihr eigenes Fach. Bei bereits eingefülltem falschem Mittel hilft die Anleitung oder der Kundendienst zum genauen Modell. Der SBV4EBX00D nennt Spezialsalz für Geschirrspüler und schließt Salztabletten und Speisesalz aus. Miele nennt für dieses Modell möglichst grobkörniges Regeneriersalz oder anderes reines Siedesalz. Vor seiner ersten Salzfüllung nennt Miele etwa 1,5 l Wasser im Salzbehälter. Beide Bosch-Anleitungen beschreiben die vollständige Wasserfüllung des Behälters bei der ersten Inbetriebnahme. <a href="https://media3.bsh-group.com/Documents/9001790760_C.pdf">Bosch SBV4EBX00D, Seiten 16 und 25–30</a> · <a href="https://media3.bosch-home.com/Documents/9001707727_A.pdf">Bosch SKS62E32EU, Seiten 15–16 und 23–29</a> · <a href="https://media.miele.com/downloads/c0/11/02_C7F128281BA21FD0A0E8671DD96BC011.pdf">Miele G7673de-002, Seiten 27–29 und 63–64</a></p>
  <p>Beide Bosch-Handbücher ordnen das Salzeinfüllen unmittelbar vor dem Programmstart ein. Miele nennt dagegen nach Salzfüllung oder nach Öffnen des Salzbehälterdeckels sein eigenes Programm „Salz ausspülen“ ohne Spülgut. Beim G 7673 kann die Salzmangelmeldung direkt nach dem Nachfüllen weiter sichtbar sein, wenn die erforderliche Konzentration noch nicht erreicht ist. Bei einem Wechsel zu Solo-Reiniger sind Salz, Klarspüler und die eventuell ausgeblendeten Mangelanzeigen getrennt zu prüfen. Ein stummes Display allein bescheinigt keinen Vorrat. <a href="https://media3.bsh-group.com/Documents/9001790760_C.pdf">Bosch SBV4EBX00D, Seite 25</a> · <a href="https://media3.bosch-home.com/Documents/9001707727_A.pdf">Bosch SKS62E32EU, Seite 23</a> · <a href="https://media.miele.com/downloads/c0/11/02_C7F128281BA21FD0A0E8671DD96BC011.pdf">Miele G7673de-002, Seiten 27–29, 40 und 60</a></p>
  <p>Bei vergleichbaren Läufen nennen die Hersteller weniger Klarspüler als möglichen Prüfweg bei abwischbaren Schlieren und mehr bei Wasserflecken. Leere Vorratsbehälter, Reinigerreste und blockierte Reinigerfächer können weitere Hinweise liefern. Der SBV4EBX00D zeigt Stufen mit r05 als Werkseinstellung und r00 für aus. Der SKS62E32EU zeigt r:04 als Werkseinstellung und r:00 für aus. Beim G 7673 ist die Vorgabe von 0 bis 6 ml einstellbar, ab Werk 3 ml. Die automatische Abgabe kann darüber liegen. Bosch-Stufen und Miele-Sollwerte belegen keine gemessene Abgabemenge. <a href="https://media3.bsh-group.com/Documents/9001790760_C.pdf">Bosch SBV4EBX00D, Seiten 26–27 und 49–50</a> · <a href="https://media3.bosch-home.com/Documents/9001707727_A.pdf">Bosch SKS62E32EU, Seiten 25–26</a> · <a href="https://media.miele.com/downloads/c0/11/02_C7F128281BA21FD0A0E8671DD96BC011.pdf">Miele G7673de-002, Seiten 33 und 99–100</a></p>
  <h3>Packungsdosis, Programm und Dosiervorgang</h3>
  <p>Halte das Reinigeretikett neben die passende Anleitung. Miele nennt beim manuellen Fach höchstens 50 ml Füllmenge. Bei fehlender anderer Packungsangabe nennt die Anleitung je nach Verschmutzung 20–30 ml oder einen Tab. Bosch nennt beim SBV4EBX00D 20–25 ml bei normaler Verschmutzung und zeigt die Fachmarken 15, 25 und 50 ml. Eine Fachmarke ist keine Dosiermenge. Gramm und Milliliter kannst du ohne belegte Produktspezifikation nicht austauschen. <a href="https://media.miele.com/downloads/c0/11/02_C7F128281BA21FD0A0E8671DD96BC011.pdf">Miele G7673de-002, Seiten 60 und 63–64</a> · <a href="https://media3.bsh-group.com/Documents/9001790760_C.pdf">Bosch SBV4EBX00D, Seiten 28–30</a></p>
  <p>Beim Miele G 7673 die aktive automatische PowerDisk-Dosierung und das manuelle Fach nach bestätigtem AutoDos-Zustand unterscheiden. Für die Meldung „PowerDisk leer“ beschreibt die Anleitung Wechsel oder Deaktivierung. Die Dosierung hängt vom Programm ab, in Auto auch von der Verschmutzung. Weniger kann die Disk-Nutzung verlängern und die Reinigungsleistung senken, mehr verkürzt die Disk-Nutzung und kann das Spülergebnis ändern. Daraus ergibt sich keine Zyklenprognose für zu Hause. <a href="https://media.miele.com/downloads/c0/11/02_C7F128281BA21FD0A0E8671DD96BC011.pdf">Miele G7673de-002, Seiten 25, 33, 61–64 und 95</a></p>
  <p>Wenn nach Programmende ein Tab-Rest sichtbar ist, sammle Hinweise zum verwendeten Programm, zum Zustand des Reinigerfachs und zu erkennbaren Blockaden. Bosch nennt eine mögliche zu kurze Auflösedauer bei verkürzten Programmen. Miele nennt diesen Fall für manche Tabs im QuickPowerWash. Eine separate Tab-Auffangschale nur dort prüfen, wo sie beim konkreten Gerät dokumentiert ist. Beim SBV4EBX00D empfiehlt Bosch Flüssigreiniger für verkürzte Programme ohne Vorspülen und beschreibt dafür die Bedingungen ohne maschinelles Vorspülen und ohne Zeitvorwahl. <a href="https://media3.bsh-group.com/Documents/9001790760_C.pdf">Bosch SBV4EBX00D, Seiten 16, 28–31 und 50</a> · <a href="https://media3.bosch-home.com/Documents/9001707727_A.pdf">Bosch SKS62E32EU, Seiten 27–29 und 42</a> · <a href="https://media.miele.com/downloads/c0/11/02_C7F128281BA21FD0A0E8671DD96BC011.pdf">Miele G7673de-002, Seiten 63–64 und 97</a></p>
  <h3>Spülgut, Beobachtungen und Zusatzverbrauch</h3>
  <p>Streife grobe Reste ab. Das Vorspülen von Hand unter fließendem Wasser ist laut UBA im Alltag vermeidbar. Bosch beschreibt starkes Vorreinigen als möglichen Einfluss auf das sensorisch gesteuerte Programm. Bei älteren oder empfindlichen Gläsern, Dekor, Holzgriffen oder nicht hitzebeständigem Kunststoff zählen die Materialangabe und die schriftliche Angabe des Geschirrherstellers. Bosch unterscheidet beim kompakten Gerät nachträglich festgestellte Glastrübung und abwischbare Beläge. Miele beschreibt mögliche Kunststoffverfärbungen durch Naturfarbstoffe etwa aus Tomaten und Karotten. Einzelne Beobachtungen ergeben keine sichere Ursache. <a href="https://www.umweltbundesamt.de/umwelttipps-fuer-den-alltag/geschirrspueler-im-eco-programm-wasser-strom-sparen">UBA, zuletzt aktualisiert 17.04.2026</a> · <a href="https://media3.bsh-group.com/Documents/9001790760_C.pdf">Bosch SBV4EBX00D, Seiten 18, 31 und 49</a> · <a href="https://media3.bosch-home.com/Documents/9001707727_A.pdf">Bosch SKS62E32EU, Seiten 29–30 und 41–45</a> · <a href="https://media.miele.com/downloads/c0/11/02_C7F128281BA21FD0A0E8671DD96BC011.pdf">Miele G7673de-002, Seiten 45–46 und 101</a></p>
  <p>Beim Miele G 7673 bleibt das separat aktivierte zweite Zwischenspülen bis zur Abschaltung wirksam, mit ECO als Ausnahme. Der Hersteller weist auf möglichen Mehrverbrauch ohne Literangabe für diese Einstellung hin. Beim deutschen Bosch SKS62E32EU passen die dokumentierten 8 l in Eco 50 und Werkshärte 13–16 °dH zur Laborzeile mit Regeneration nach fünf Spülgängen. Diese nennt maximal zusätzlich vier Minuten, 2,5 l und 0,03 kWh. Die 9-l-Zeile betrifft eine andere Gerätevariante. Ohne passende Prüfbedingungen gibt es daraus keine Vorhersage für den einzelnen Haushalt. <a href="https://media.miele.com/downloads/c0/11/02_C7F128281BA21FD0A0E8671DD96BC011.pdf">Miele G7673de-002, Seiten 41 und 75</a> · <a href="https://media3.bosch-home.com/Documents/9001707727_A.pdf">Bosch SKS62E32EU, Seiten 24–25</a> · <a href="https://media3.bosch-home.com/Documents/specsheet/de-DE/SKS62E32EU.pdf">Bosch SKS62E32EU, deutsches Produktdatenblatt</a></p>
  <p>Der Blaue Engel DE-UZ 201 betrifft Maschinengeschirrspülmittel einschließlich Klarspüler für den erfassten Einsatz. Gleiche exakten Produktnamen und Anbieter mit dem aktuellen Verzeichnis ab. Die Zertifizierung beantwortet weder die Härte- und Dosisfrage am Zulauf noch die Eignung für ein bestimmtes Gerät. Wenn ein vorhandenes Mittel zu Gerät, Programm und zulässiger Härte passt, braucht es keine Neuanschaffung. <a href="https://www.blauer-engel.de/de/produktwelt/maschinengeschirrspuelmittel">Blauer Engel DE-UZ 201, Ausgabe 2022</a> · <a href="https://produktinfo.blauer-engel.de/uploads/criteriafile/de/204/DE-UZ%20201-202201-de-Kriterien-V4.pdf">Vergabekriterien</a> · <a href="https://www.umweltbundesamt.de/themen/chemikalien/wasch-reinigungsmittel/umweltbewusst-waschen-reinigen/geschirrspueltabs">Umweltbundesamt, Geschirrspültabs</a></p>
  <p>Deutsche Geräteunterlagen, gelesen am 20.11.2026. Miele G 7673 SCVi AutoDos E, Produktnummer 12338510, G7673de-002, M.-Nr. 12 780 570 / 02 / 002. Bosch SBV4EBX00D, 9001790760_C. Bosch SKS62E32EU, 9001707727_A. <a href="https://www.miele.de/product/12338510/vollintegrierter-geschirrspueler-g-7673-scvi-autodos-e-obsidianschwarz">Miele Produktseite Deutschland</a></p>
</section>
<section id="bodenstaubsauger-belege" aria-labelledby="bodenstaubsauger-belege-titel">
  <h2 id="bodenstaubsauger-belege-titel">Miele Bodenstaubsauger: Beutel und Filter am vorhandenen Gerät prüfen</h2>
  <p>Schreib vor einer Ersatzbestellung die vollständige Modellbezeichnung vom Gerät ab. Notiere separat, welcher Beutel und welcher Filter jetzt eingesetzt sind. Die folgenden Beispiele beziehen sich auf deutsche Herstellerunterlagen, gelesen am 20. November 2026.</p>

  <h3 id="miele-staubsaugerbeutel" style="scroll-margin-top:210px">Welcher Staubsaugerbeutel passt zu meinem Miele?</h3>
  <p><strong>Compact C2 braucht FJM, Complete C2 braucht GN.</strong> Steht im Angebot oder auf deiner Notiz nur „C2“, prüfe die vollständige Modellbezeichnung am Typenschild und warte bis dahin mit der Bestellung. Bei Guard S1 und L1 nennt Miele TU, bei Guard M1 CO.</p>
  <table>
    <thead><tr><th scope="col">Modellreihe</th><th scope="col">Gelisteter Beutel</th><th scope="col">Gelisteter HEPA-Abluftfilter zur Auswahl</th></tr></thead>
    <tbody>
      <tr><th scope="row">Classic C1</th><td>GN</td><td>SF-HA 30-1</td></tr>
      <tr><th scope="row">Complete C1</th><td>FJM</td><td>SF-HA 30-1</td></tr>
      <tr><th scope="row">Complete C2 und C3</th><td>GN</td><td>SF-HA 50-1</td></tr>
      <tr><th scope="row">Compact C1 und C2</th><td>FJM</td><td>SF-HA 50-1</td></tr>
      <tr><th scope="row">Guard S1 und L1</th><td>TU</td><td>SF-HA 50-1</td></tr>
      <tr><th scope="row">Guard M1</th><td>CO</td><td>SF-HA 50-1</td></tr>
    </tbody>
  </table>
  <p>Der Filter in der Tabelle steht als Zubehör in der Herstellerauswahl. Zum Beispiel nennt das deutsche Produktblatt des Guard L1 Nordicblau 12558870 serienmäßig AirClean. Complete C3 12031650 nennt AirClean und Complete C3 Cat &amp; Dog 10653390 Active AirClean. Vergleiche die Materialnummer und lies danach den aktuell eingebauten Typ ab. Für zwei Sauger im Haushalt kann derselbe Beuteltyp zu unterschiedlichen gelisteten Abluftteilen gehören. <a href="https://www.miele.de/c/staubsaugerbeutel-und-filter-10520.htm">Deutsche Miele-Teileauswahl</a> · <a href="https://www.miele.de/product/12785370/hepa-airclean-filter-sf-ha-30-1">SF-HA 30-1</a> · <a href="https://www.miele.de/product/12785390/hepa-airclean-filter-sf-ha-50-1">SF-HA 50-1</a> · <a href="https://www.miele.de/product/12558870/bodenstaubsauger-mit-beutel-guard-l1-nordicblau">Guard L1 12558870</a> · <a href="https://media.miele.com/downloads/e-/de/FS_12031650_DED_DE-de-DE.pdf">Complete C3 12031650</a> · <a href="https://media.miele.com/downloads/e-/de/FS_10653390_DED_DE-de-DE.pdf">Complete C3 Cat &amp; Dog 10653390</a>.</p>
  <p>Gleiche bei einer 4er-Packung die genaue Miele-Materialnummer und den angegebenen Inhalt ab. Die deutschen Produktseiten führen folgende Beispiele auf:</p>
  <ul>
    <li><a href="https://www.miele.de/product/12421170/4-staubsaugerbeutel-gn-hyclean-pure">GN HyClean Pure 12421170</a> für Complete C2, Complete C3 und Classic C1. Miele nennt 4 Beutel, 1 Motorschutzfilter und 1 Abluftfilter.</li>
    <li><a href="https://www.miele.de/product/12421180/4-staubsaugerbeutel-fjm-hyclean-pure">FJM HyClean Pure 12421180</a> für Complete C1, Compact C1 und Compact C2. Miele nennt 4 Beutel, 1 Motorschutzfilter und 1 Abluftfilter.</li>
    <li><a href="https://www.miele.de/product/12557060/4-staubsaugerbeutel-tu-hyclean-pure">TU HyClean Pure 12557060</a> für Guard S1 und Guard L1. Miele nennt 4 Beutel und 1 AirClean Abluftfilter.</li>
    <li><a href="https://www.miele.de/product/12557080/4-staubsaugerbeutel-co-hyclean-pure">CO HyClean Pure 12557080</a> für Guard M1. Miele nennt 4 Beutel und 1 AirClean Abluftfilter.</li>
  </ul>
  <p><a href="https://www.miele.de/product/12498270/16-staubsaugerbeutel-zum-vorteilspreis-gn-xxl-hyclean-pure">GN XXL 12498270</a> enthält 16 Beutel, 4 Motorschutzfilter und 4 Abluftfilter. Eine beiliegende Ablufteinlage und die separat in der Tabelle gelistete HEPA-Kassette sind unterschiedliche Teile. Prüfe den eingebauten Abluftfilter und die vorgesehene Halterung, bevor du ein Teil austauschst.</p>
  <p>Wenn dein Vorrat an passenden, unbenutzten und unbeschädigten Beuteln reicht, brauchst du keinen Nachkauf. Entleere volle Einwegbeutel nicht zur weiteren Nutzung. Zähle passende Filter getrennt, bevor du eine Packung bestellst. Herstellerangaben für Deutschland geprüft am <time datetime="2026-11-22">22. November 2026</time>. <a href="https://media.miele.com/downloads/10/76/00_C7F128282CE91FE199B027081E511076.pdf">Beutelhinweise im dokumentierten Guard L1 HS22</a>.</p>
  <!--EB_MIELE_BAG_SHARE--><p><a href="https://www.reddit.com/submit?url=https%3A%2F%2Fgetecoback.com%2Fprodukte.html%23miele-staubsaugerbeutel&amp;title=Welcher%20Staubsaugerbeutel%20passt%20zu%20meinem%20Miele%3F" rel="noreferrer" style="display:inline-flex;align-items:center;min-height:44px">Auf Reddit teilen</a></p><!--/EB_MIELE_BAG_SHARE-->

  <h3>Wechselanzeige, Ursache und Guard L1 HS22</h3>
  <ul>
    <li>Die Beutelanzeige reagiert auf Mischstaub. Feiner Staub kann die Poren früh zusetzen. Haare und Fusseln können den Beutel schon prall füllen, bevor die Anzeige reagiert. Für die dokumentierte HS22-Prüfung gehören eine umschaltbare Bodendüse, maximale Saugstufe und eine vom Boden abgehobene Düse zusammen. Prüfe nur bestätigte Bedingungen der passenden Anleitung. <a href="https://www.miele.de/support/customer-assistance/bodenstaubsauger_mit_oder_ohne_beutel-1194/alle_kategorien/staubsaugerbeutel_wechselanzeige_zeigt_vollen_staubsaugerbeutel_an-92374394507">Miele zu frühem Wechselhinweis</a> · <a href="https://www.miele.de/support/customer-assistance/bodenstaubsauger_mit_oder_ohne_beutel-1194/alle_kategorien/staubsaugerbeutel_wechselanzeige_zeigt_leeren_staubsaugerbeutel_an-92264372107">Miele zu später Beutelanzeige</a> · <a href="https://media.miele.com/downloads/10/76/00_C7F128282CE91FE199B027081E511076.pdf">HS22 13 114 040, S. 14–15 und 18</a>.</li>
    <li>Am bestätigten HS22 gehört die TU-Halteplatte beidseitig in ihre Führung. Die Sperrklinke muss einrasten. Einen blockierten Deckel nicht erzwingen. Der Lifetime-Motorschutzfilter dieser Anleitung bleibt Teil des Geräts und ist trocken zu pflegen. Dazu die eigene HS22-Ausführung abgleichen, statt den Motorschutz aus einem anderen Beutelpaket zu übernehmen. <a href="https://media.miele.com/downloads/10/76/00_C7F128282CE91FE199B027081E511076.pdf">HS22 13 114 040, S. 15 und 18–21</a>.</li>
    <li>Eine AirClean-Einlage benötigt im hier dokumentierten HS22 das passende Gitter. Eine freigegebene Abluftkassette nimmt dessen Rolle ein. Der Hersteller sieht einen Abluftfilter zur selben Zeit vor. Die Geräte-Wechselanzeige des dokumentierten HS22 erinnert nach ungefähr 50 Betriebsstunden und lässt sich laut Anleitung nur bei leuchtendem Hinweis zurücksetzen. Ein schmaler roter Anfang eines aktivierten timestrip am Filter und ein vollständig roter Filterstreifen sind unterschiedliche Zustände. Benutze den timestrip-Beleg nur für ausgewiesene Ausführungen. <a href="https://media.miele.com/downloads/10/76/00_C7F128282CE91FE199B027081E511076.pdf">HS22 13 114 040, S. 14–15 und 19–20</a> · <a href="https://www.miele.de/support/customer-assistance/bodenstaubsauger_mit_oder_ohne_beutel-1194/alle_kategorien/reinigungsleistung_nimmt_ab_staubsauger_mit_beutel-92265764619">Miele zu Filtern und Zeiten</a>.</li>
    <li>Die Baureihenübersicht unterscheidet die App-Registrierung für Zubehör und Anleitungen von aktiver Vernetzung mit Wechselmeldungen beim L1 Comfort. Prüfe die genaue Ausführung und die tatsächliche Verbindung. Beim HS22 sind die Aufnahme für Saugpausen auf einer ebenen Fläche und die Aufnahme an der Unterseite zur Aufbewahrung getrennt. Zwei Stellungen der passenden kombinierten Fugen-/Polsterdüse ersparen unter Umständen einen zusätzlichen Aufsatz. Die Anleitung beschreibt die separate Rohrposition des Saugpinsels für den Comfort-Handgriff 2.0. <a href="https://www.miele.de/de/m/die-neue-guard-baureihe-auf-einen-blick-7424.htm">Miele Guard-Baureihenübersicht</a> · <a href="https://media.miele.com/downloads/10/76/00_C7F128282CE91FE199B027081E511076.pdf">HS22 13 114 040, S. 16–17</a>.</li>
    <li>Bei einem abrupt beobachteten Leistungsverlust nach sperrigem Material den betroffenen Saugweg und ungewöhnliche Gehäusewärme als getrennte Hinweise notieren. Auf dichtem, geeignetem Kurzflor kann die luftgetriebene TurboTeQ STB 305-3 allein dort langsamer werden. Gleiche Symptome an anderen geeigneten Flächen separat dokumentieren. Bei ungewöhnlicher Wärme oder beschädigten Teilen nicht weiter testen. <a href="https://www.miele.de/support/customer-assistance/bodenstaubsauger_mit_oder_ohne_beutel-1194/alle_kategorien/reinigungsleistung_nimmt_ab_staubsauger_mit_beutel-92265764619">Miele Fehlersuche zum Luftweg und zur Saugwirkung</a> · <a href="https://media.miele.com/downloads/48/7a/04_C7F12828660B1FD09CBB7CF230ED487A.pdf">TurboTeQ STB 305-3, Originalanleitung</a>.</li>
  </ul>

  <h3>Boost CX1 Cat &amp; Dog PowerLine 11602420: beutelloses System</h3>
  <p>Bei diesem deutschen Boost CX1 zählt die sichtbare Max-Markierung am Staubbehälter. Laut Anleitung HS20 12 837 480 sind Feinstaubfilter CX FSF, seine aufliegende Filtermatte, Vorfilter, Filterrahmen und Abluftfilter SF-HA 60 unterschiedliche Teile. Beim Feinstaubfilter und der Matte gilt für die Nasspflege an den dokumentierten Flächen kaltes Wasser ohne Spülmittel oder Spülbürste und mindestens 24 Stunden Trocknung für beide. Die trockene Matte hat ihre weiche Seite oben und eine sichtbare Entnahmeöse. Für den Vorfilter oder Filtereinsatz nennt die Anleitung ein Reinigungswerkzeug und für Rahmen beziehungsweise Seitenklappe ein leicht feuchtes Tuch mit mildem Spülmittel bei Bedarf. Bei der passenden umschaltbaren Bodendüse kann ein eindeutig abgenutzter Fadenheber separat ersetzt werden. <a href="https://www.miele.de/product/11602420/bodenstaubsauger-ohne-beutel-boost-cx1-cat-und-dog-powerline-obsidianschwarz">Boost CX1 11602420</a> · <a href="https://media.miele.com/downloads/0a/3d/00_C7F12828EA7E1FD083C4AF3F279F0A3D.pdf">HS20 12 837 480, S. 16–19</a>.</p>
  <p>Arbeite bei Sichtkontrollen nach dem Abschalten und Trennen vom Netz an den vom Hersteller vorgesehenen zugänglichen Teilen. Wenn Modell, Zustand oder Teil nicht eindeutig sind, halte die fehlende Information fest, bevor du etwas bestellst.</p>
</section>
<section class="pc-method" id="philips-dampfbuegelgeraete-de-belege">
  <h2>Philips Azur DST7040/80 und PerfectCare PSG7140/70: Dampf, Wasser und Pflege</h2>
  <p>Geprüft am <time datetime="2026-11-20">20. November 2026</time>. Vergleiche die vollständige Kennung am Gerät und bei Ersatzteilen die aufgedruckte Artikelnummer. Die deutsche Produktseite und das mehrsprachige Handbuch behandeln unterschiedliche Teile des Vergleichs.</p>
  <h3>Azur DST7040/80: Wasser und Quick Calc Release</h3>
  <ul>
    <li>Das Datenblatt zur Variante /80 nennt 300&nbsp;ml Nenn-Tankvolumen, bis zu 50&nbsp;g/min kontinuierlichen Dampf, einen Dampfstoß bis 250&nbsp;g und die Tropfstopp-Funktion. Die MAX-Markierung am eigenen Tank ist ein gesonderter Füllbezug. Das Wasser im Behälter, die Dampfmenge und eine beobachtete Arbeitszeit sind verschiedene Angaben.</li>
    <li>Die deutsche DST7040-Anleitung nennt Leitungswasser. Bei hartem Wasser empfiehlt sie gleiche Mengen Leitungswasser und destilliertes oder demineralisiertes Wasser. Parfüm, Trocknerkondensat, Essig, Stärke, Entkalkungsmittel, Bügelzusätze und chemisch enthärtetes Wasser sind ausgeschlossen. Bei ungeklärter Herkunft die Flüssigkeit zuerst eindeutig bestimmen.</li>
    <li>Wasserspray und Dampfstoß haben unterschiedliche Bedienelemente. Dauerhaftes Halten des Dampfstoßauslösers in senkrechter Position erzeugt laut Anleitung keinen gleichmäßigen Dampf. Bei Inaktivität nennt die Anleitung eine automatische Abschaltung nach mehr als 30 Sekunden auf der Bügelsohle beziehungsweise acht Minuten auf der Standfläche. Restwärme und der Zustand des Exemplars müssen unabhängig davon beurteilt werden.</li>
    <li>Die Anleitung empfiehlt für Quick Calc Release ein Intervall von einem bis drei Monaten und nennt braune Flecken oder braunes Wasser als gesonderten Anlass zur Kontrolle. Bei hartem Wasser empfiehlt sie häufigere Pflege ohne eigenen Zahlenwert. Für die Sohle nennt sie ein feuchtes Tuch und schließt Scheuerschwämme, Essig sowie andere Chemikalien aus. Der Aufbewahrungsabschnitt nennt außerdem das Entleeren von verbleibendem Wasser.</li>
  </ul>
  <h3>PerfectCare PSG7140/70: Wassertank, Handteil, Anzeige und Teileliste</h3>
  <ul>
    <li>Der abnehmbare 1.800-ml-Tank ist laut deutscher Produktseite während des Gebrauchs nachfüllbar. Philips nennt bis zu zwei Stunden Verwendung. Gemessene Nettozeiten und eigene Nachfüllvorgänge beantworten gesondert, wie lange ein eigener Durchgang dauert. Die dokumentierte Möglichkeit zum Nachfüllen sagt nichts über einen ununterbrochenen Dampfausstoß dabei aus.</li>
    <li>Die technischen Daten nennen bis zu 120&nbsp;g/min gleichmäßigen Dampf, bis zu 600&nbsp;g Dampfstoß und maximal 8,0&nbsp;bar. Für das Handteil stehen dort 0,8&nbsp;kg, für Handteil und Basis 3,85&nbsp;kg und für das Gesamtgewicht mit Verpackung 5,3&nbsp;kg. Die Gesamtlänge des Schlauchs beträgt 1,7&nbsp;m. Die freie Nutzlänge am eigenen Arbeitsplatz ist gesondert festzustellen.</li>
    <li>Der Bewegungssensor ist Teil des beschriebenen automatischen Dampfausstoßes. Die Produktseite führt eine Trageverriegelung, eine Wasserstandsanzeige und die Entkalkungserinnerung auf. Der Kurzname Easy De-Calc steht im Produkttext, Easy De-Calc Plus in den technischen Daten desselben Geräts. Für PSG7140/70 listet Philips den abnehmbaren Tank CP2030/02 und die Auffangkappe CP2029/05. Bei Gebrauchtangeboten und Ersatzteilen Zustand, Zuordnung und Lieferumfang des einzelnen Angebots prüfen.</li>
    <li>Die Fußnote von Philips ordnet die beworbenen bis zu 30&nbsp;Prozent Energieeinsparung dem Normalmodus gegenüber MAX desselben Geräts unter dem genannten Bezug IEC&nbsp;60331-1 zu. Eigene Stromkosten brauchen eigene Verbrauchsdaten.</li>
    <li>Falls die verlinkte westeuropäische Handbuchrevision dem konkreten Gerät zugeordnet ist, führt sie das dauerhaft leuchtende Bereitschaftssignal getrennt von der Meldung bei niedrigem Wasserstand auf. Für die Aufbewahrung unterscheidet sie das Schlauchfach vom Klettverschluss am Kabel. Für eine andere Revision die Geräteunterlagen beim Hersteller abgleichen.</li>
  </ul>
  <aside>
    <h3>Herstellerunterlagen</h3>
    <ul>
      <li><a href="https://www.home.id/de-DE/DST7040">Versuni Deutschland: Geräteunterlagen zu DST7040</a></li>
      <li><a href="https://ot-dam.versuni.com/adaptivemedia/rendition?id=c23feb03942aa27d2d04f2cc0ab5dfefca7ad367">Philips DST7000 Bedienungsanleitung mit DST7040 im deutschen Abschnitt</a></li>
      <li><a href="https://www.documents.philips.com/assets/20221203/953954635d7d47f9b150af600125d8d2.pdf">Philips Datenblatt zur Variante DST7040/80 (englisch)</a></li>
      <li><a href="https://www.philips.de/p-p/PSG7140_70/perfectcare-7000-series-dampfbuegelstation">Philips Deutschland: PSG7140/70 mit Spezifikationen und Zubehörliste</a></li>
      <li><a href="https://www.home.id/de-DE/PSG7140">Versuni Deutschland: Geräteunterlagen zu PSG7140</a></li>
      <li><a href="https://dam.versuni.com/m/4466b01bbea5bd6/original/PerfectCare-7000-series_WEU_-17993-_user-manual.pdf">Philips PerfectCare 7000 Bedienungsanleitung, westeuropäische Ausgabe</a></li>
    </ul>
  </aside>
</section>
<section id="stabmixer-belege" aria-labelledby="stabmixer-belege-heading">
  <h2 id="stabmixer-belege-heading">Stabmixer-Zubehör prüfen: Kupplung, Becher, Mengen und Reinigung</h2>
  <p><strong>Vor einem Nachkauf das Typenschild und den konkreten Aufsatz abgleichen.</strong> Beim Bosch ErgoMixx gehört der Index hinter dem Schrägstrich zur E-Nr. Bei Braun können zwei 500-ml-Zerkleinerer unterschiedliche Kupplungen und Messer haben. Ein passender Anschluss beantwortet weder die Mengenfrage noch die Frage nach der richtigen Reinigung.</p>
  <h3>Bosch ErgoMixx: Set, Mixfuß und Frischhaltezubehör</h3>
  <ul>
    <li>Die deutsche <a href="https://www.bosch-home.com/de/de/productservice/MSM67170-02">Bosch Service-Seite für MSM67170/02</a> ordnet Geräte- und Zubehörunterlagen zu. Das <a href="https://media3.bsh-group.com/Documents/specsheet/de-DE/MSM67170.pdf">deutsche MSM67170-Datenblatt</a> führt Universalzerkleinerer, Ice-Crush-Messer und Schneebesen als Setbestandteile. Das <a href="https://media3.bsh-group.com/Documents/8001152528_B.pdf">Zubehörhandbuch zum MSM6</a> beschreibt das Eis-Crush-Messer für den Zerkleinerer L. Als optimale Portion nennt es 4–6 Würfel mit höchstens 100 g insgesamt. XL mit Vario-Zubehör hat eine eigene Anleitung.</li>
    <li>Die <a href="https://www.bosch-home.com/de/de/productservice/MS6CA4150-02">Bosch Service-Seite für MS6CA4150/02</a> verweist auf die passende Anleitung. Das <a href="https://media3.bsh-group.com/Documents/specsheet/de-DE/MS6CA4150.pdf">deutsche MS6CA4150-Datenblatt</a> nennt einen Mix-/Messbecher mit 600 ml, Zerkleinerer mit 500 ml Nutzvolumen, Schneebesen und zwei Deckel. Diese beiden Gefäßrollen bleiben getrennt. Gebrauchtes Zubehör anhand seines tatsächlichen Inhalts prüfen.</li>
    <li>Die <a href="https://www.bosch-home.com/de/de/productservice/MS6CB61V1-01">Bosch Service-Seite für MS6CB61V1/01</a> ordnet das <a href="https://media3.bsh-group.com/Documents/8001160141_A.pdf">Fresh-Zubehörhandbuch</a> zu. Das <a href="https://media3.bsh-group.com/Documents/specsheet/de-DE/MS6CB61V1.pdf">deutsche MS6CB61V1-Datenblatt</a> nennt die mitgelieferte rechteckige Vakuumbox mit 1,2 l in der Lieferliste und die Frischhaltedose mit 1,0 l auf Seite 2. Vor einer Kapazitätsentscheidung die Kennzeichnung der konkreten Box prüfen. Für die VitaMaxx Flasche MMZV0BT1 und die runden Behälter MMZV0SB0, MMZV0SB1 und MMZV0SB2 nennt Bosch die Kompatibilität ausdrücklich.</li>
  </ul>
  <p>Die <a href="https://media3.bsh-group.com/Documents/8001057006_B.pdf">Bosch Geräteanleitung zum MSM6</a> und die <a href="https://media3.bsh-group.com/Documents/8001159548_B.pdf">Geräteanleitung zum MS6</a> trennen Pürieren von gekochtem Gemüse und Hacken von rohen Zwiebeln, Knoblauch oder Kräutern. Für andere geeignete hohe Mixgefäße gilt ein ebener Boden, der Zerkleinerertopf ist für den Mixfuß ausgeschlossen. Zuvor kochende Zutaten auf 80 °C oder weniger abkühlen lassen und einen Topf vorher von der Kochstelle nehmen. Nach dem Reinigen den Mixfuß in der genannten Abtropfposition trocknen lassen. Zur Abschaltung bei der Nutzung des MSM67170 nennt Bosch ungefähr eine Stunde Abkühlen. Wiederholte Störungen mit dem Hersteller klären.</p>
  <p>Beim Fresh-Behälter beschreibt Bosch die sich nach innen wölbende Anzeige. Beim Zip-Beutel beschreibt es, wie er sich an den Inhalt legt, und verweist bei austretender Flüssigkeit auf die Max-Linie. Daraus folgt keine Haltbarkeitsangabe. Nach rohem Fleisch, Fisch oder Geflügel rät Bosch davon ab, den Zip-Beutel wiederzuverwenden. Andere zur Wiederverwendung vorgesehene Originalbeutel sorgfältig reinigen und vollständig trocknen lassen.</p>
  <h3>Braun MultiQuick: 500 ml allein belegt weder Kupplung noch Eis-Eignung</h3>
  <div class="table-scroll">
    <table>
      <caption>Genau zugeordnete Braun Unterlagen, geprüft am 20. November 2026</caption>
      <thead><tr><th scope="col">Deutsche Anleitung</th><th scope="col">500-ml-Zerkleinerer</th><th scope="col">Eis laut Abschnitt C</th></tr></thead>
      <tbody>
        <tr><th scope="row"><a href="https://www.braunhousehold.com/de-de/s/4191-MQ5235WH">MultiQuick 5 Vario MQ 5235 WH</a></th><td>ca, EasyClick und Wellenschnitt</td><td>Nur bc mit eigenem Eismesser. Das Familienhandbuch belegt keinen Kit-Lieferumfang.</td></tr>
        <tr><th scope="row"><a href="https://www.braunhousehold.com/de-de/s/MQ7035XBI">MultiQuick 7 MQ 7035 XBI</a></th><td>mc, EasyClick Plus und gerader Anschluss</td><td>mc mit eigenem Eismesser.</td></tr>
      </tbody>
    </table>
  </div>
  <p>Der <a href="https://www.braunhousehold.com/de-de/c/essenszubereitung/stabmixer/stabmixeraufsatze-und--zubehor">deutsche Braun Zubehörkatalog</a> nennt Wellenschnitt für MQ30BK und MQ30WH. MQS230BK ist für geradlinige Motoreinheiten. Für ca im MQ-5235-WH-Handbuch und mc im MQ-7035-XBI-Handbuch zeigt Abschnitt C höchstens 60 Sekunden Laufzeit und 180 Sekunden Pause. Die Zutatenzeile und die Max-Markierung gelten zusätzlich. Bei starker Vibration oder sinkender Drehzahl den Betrieb unterbrechen. Braun zeigt ein durchgestrichenes Mikrowellensymbol beim Zerkleinerertopf.</p>
  <p>Die mc-Tabelle für den MQ 7035 XBI nennt für Parmesan und Karotten je 200 g mit der gezeigten Stückgröße von 2 cm, für Kräuter 30 g. Die Markierung am eigenen Behälter zusätzlich beachten. Abschnitt A zeigt einen eingetauchten Pürierfuß und 70 °C. Eine allgemeine Mindestmenge in Millilitern steht dort nicht. Die Abbildung hilft beim Einordnen einer kleinen Portion im zugehörigen Becher.</p>
  <p>Abschnitt B beschreibt den Doppelrührbesen des MQ 7035 XBI für leichte Rühraufgaben und Kartoffelpüree. Schwere Knetaufgaben und der mitgelieferte Becher Nr. 5 sind dafür ausgeschlossen. Braun zeigt unterschiedliche runde und sechskantige Markierungen an der Aufnahme.</p>
  <h3>Reinigung und Wechsel nach dem Gebrauch</h3>
  <p>Den Aufsatz nach vollständigem Stillstand und Netztrennung entsprechend der Anleitung wechseln. Bosch nennt für Motor- und Getriebeteile feuchtes Abwischen. Bei Braun unterscheiden sich der Getriebedeckel von ca oder mc und der einfache hc-Deckel: Die Piktogramme in Abschnitt F beim MQ 5235 WH und Abschnitt D beim MQ 7035 XBI zeigen für den Getriebedeckel Handreinigung unter fließendem Wasser und schließen den Geschirrspüler aus. Schüssel sowie zugeordneter Deckel ohne Getriebe stehen in der Gruppe mit Geschirrspülersymbol. Antriebs- und Rührgetriebe feucht abwischen. Für andere Ausführungen die eigene Anleitung lesen.</p>
  <p>Herstellerangaben für die verlinkten deutschen Ausführungen und Anleitungen, geprüft am 20. November 2026. EcoBack hat die Geräte nicht selbst getestet. Für eine schon vorhandene passende Ausführung reicht oft die Prüfung des Zubehörs. Wenn Modell, Kupplung, Gefäßrolle oder Beleg unklar sind, die Auswahl zurückstellen.</p>
</section>
<section class="pc-method" id="mikrowelle-bosch-bfl524-belege">
  <h2>Einbau-Mikrowelle: Platz, Leistung und Geschirr getrennt prüfen</h2>
  <p>Das deutsche Datenblatt der Bosch BFL524MS0 nennt 382 × 594 × 317 mm für das Gerät, 201 × 308 × 282 mm für den Garraum und 365 × 560 × 300 mm für die Nische (H × B × T). Die technische Zeichnung bleibt maßgeblich. Für ein Gefäß auch Türdurchlass, Stellhöhe und freien Drehraum mit Deckel und Griffen prüfen. Die 25,5 cm Glas-Drehteller sind eine Zubehörgröße. Bei rechteckiger Außenform ist der Abstand von gegenüberliegenden Ecken eine konservative Drehhülle um die Mitte.</p>
  <p>BFL524MS0 ist eine Solo-Mikrowelle. Bosch führt die ähnliche BEL524MS0 mit Grill getrennt. Vor einer Ersatzteilbestellung am vorhandenen Gerät die vollständige E-Nr einschließlich Index prüfen. Ein Teller mit demselben Durchmesser belegt noch keine passende Aufnahme.</p>
  <p>800 W Mikrowellenleistung und 1.270 W elektrischer Anschlusswert bezeichnen verschiedene Größen. Das Datenblatt nennt bei längerem Betrieb eine Reduzierung bis auf 600 W ohne einen genauen Zeitpunkt. In der Anleitung 9001610906_F stehen maximal einstellbare 30 Minuten bei 800 W, 60 Minuten bei 600 W und 99 Minuten bei 90, 180 oder 360 W. Verbrauch beim Gebrauch anhand tatsächlicher Messwerte beurteilen.</p>
  <p>AutoPilot kennt vier Auftau- und drei Garprogramme. Das Handbuch ordnet jeder Kombination eine Lebensmittelgruppe und einen Gewichtsbereich zu. Die Garprogramme sehen einen Deckel vor, die Auftauprogramme offenes Geschirr. Gerundete Anzeige und gewogene Portion getrennt festhalten. Das Memory speichert nur eine manuelle Stufe und kein Automatikprogramm. Ein Zwischensignal kann eine Handlung während des Programms ankündigen; der Kühllüfter kann nach Ablauf nachlaufen. Ein Demo-Modus kann Anzeige und Tasten bedienbar erscheinen lassen, ohne zu garen.</p>
  <p>Die Anleitung unterscheidet die Zwischenreinigung leichter Rückstände von den Pflegehinweisen für Garraum, Gerätefront, Türscheibe und Bedienfeld. Bei ungeklärtem sichtbarem Türschaden, fehlendem oder beschädigtem Drehteller die Nutzung vorerst pausieren und die passende Anleitung oder den Service prüfen. Kondenswasser nach Gebrauch von Feuchte an unbekannter Stelle unterscheiden. Bei Geschirr die Freigabe für Korpus, Deckel und Dekor getrennt belegen.</p>
  <p>Primärquellen Deutschland, gelesen am <time datetime="2026-11-20">20.11.2026</time>. <a href="https://media3.bosch-home.com/Documents/specsheet/de-DE/BFL524MS0.pdf">Bosch BFL524MS0 Datenblatt</a> · <a href="https://media3.bsh-group.com/Documents/9001610906_F.pdf">Bosch Anleitung 9001610906_F</a> · <a href="https://www.bosch-home.com/de/de/productservice/BFL524MS0-11">Bosch BFL524MS0/11 Service und Ersatzteile</a> · <a href="https://www.bosch-home.com/de/de/product/kundensortimente/BEL524MS0">Bosch BEL524MS0 Grillmodell</a></p>
</section>
<section class="pc-method" id="beurer-kuechenwaagen-gebrauch">
  <h2>Küchenwaage: Messbereich, Tara und Anzeige richtig einordnen</h2>
  <p>Die Beurer KS 34 XL Black (70311) hat eine Glaswiegefläche; die 70312 ist eine getrennt dokumentierte Edelstahlausführung. Für die 70311 nennt Beurer 15 kg Tragkraft, 1 g Einteilung und g, kg, oz und lb:oz als Einheiten. Die verlinkte Anleitung nennt 5 bis 15.000 g als Wiegebereich. Die Einteilung ist kein Nachweis absoluter Messgenauigkeit. Beim Tarieren bleibt die Masse des Gefäßes als Last auf der Waage.</p>
  <p>Hold hält einen abgewogenen Wert sichtbar, wenn ein größerer Gegenstand das Display verdeckt. Die deutsche Produktseite nennt keinen Messwertspeicher und keine Kalibrierfunktion. Das Magic-LED-Display erscheint bei Messung. Ob eine Lagerung passt, anhand der lichten Schubladenmaße und der Außenmaße von 20 × 26,3 × 2 cm prüfen.</p>
  <p>Die Anleitung nennt ein feuchtes Tuch, gegebenenfalls mit etwas Spülmittel. Abspülen und Eintauchen sind ausgeschlossen. Bei unsteten Anzeigen festen, ebenen Stand und ein mögliches starkes elektromagnetisches Umfeld getrennt erfassen. Für die 70311 nennt das deutsche Datenblatt vier AAA-Zellen mit 1,5 V. Vermeide einen gemischten Batteriesatz und beachte die Herstellergrenzen für die Aufbewahrung. Die Anleitung nennt keinen gewerblichen Einsatz.</p>
  <p>Verpacktes und unverpacktes Gewicht getrennt lesen. Die aktuelle 70311-Seite nennt 1.007 g verpackt und 779 g ohne Verpackung; das ältere Datenblatt nennt ungefähr 725 g Produktgewicht. Bei knapper Gewichtsgrenze das konkrete Gerät selbst wiegen.</p>
  <p>Herstellerquellen Deutschland, gelesen am <time datetime="2026-11-20">20.11.2026</time>. <a href="https://www.beurer.com/de/p/70311/">Beurer KS 34 XL Black 70311</a> · <a href="https://www.beurer.com/de/p/70312/">Beurer KS 34 Stainless Steel</a> · <a href="https://pim.beurer.com/images/attribut/703.11_KS34_2018-09-05_02_DS_DE_BEU.pdf">Beurer 703.11 Datenblatt</a> · <a href="https://res.cloudinary.com/beurer/image/upload/v1785412383/stibo-live/70311-13_KS34_2026-07-21_07_IM1_BEU.pdf">Beurer KS 34 Gebrauchsanleitung 07</a>.</p>
</section>
<section id="wasserkocher-bosch-twk8613p" aria-labelledby="wasserkocher-bosch-twk8613p-heading">
  <h2 id="wasserkocher-bosch-twk8613p-heading">Bosch TWK8613P im Haushalt prüfen</h2>
  <p>Bosch nennt beim TWK8613P 1,5&nbsp;l Nennvolumen und Stufen für 70, 80, 90&nbsp;°C und kochendes Wasser. Vor Gebrauch die ablesbaren MIN- und MAX-Markierungen, das eingesetzte Kalksieb und den geschlossenen Deckel prüfen. Die Anleitung beschreibt frisches, kaltes, stilles Wasser als Kanneninhalt. Der Kessel gehört auf seine zugeordnete Basis. Die gleiche 360-Grad-Beschreibung reicht für die Zuordnung einer anderen Basis nicht aus. Den Service anhand der vollständigen E-Nummer mit Suffix aufrufen.</p>
  <p>In der zugeordneten TWK86-Anleitung blinkt beim Heizen die eingestellte Temperatur, während eine erreichte Stufe leuchtet. Ein höherer Sollwert lässt sich während des Heizens wählen. Beim Abheben und Zurückstellen setzt der bisherige Heizvorgang laut Anleitung nicht automatisch fort. Keep Warm muss vor dem automatischen Heizende gewählt werden und hält im aktivierten Modus 30 Minuten. Die Anzeige belegt keine gemessene Temperatur im Wasser.</p>
  <p>Die Anleitung nennt beaufsichtigten Betrieb, eine Höhenlage bis 2000&nbsp;m, Belüftung, keinen Betrieb im Schrank und mindestens fünf Minuten Abkühlen nach jedem Gebrauch. Bei täglicher Verwendung empfiehlt Bosch Entkalken in kürzeren Abständen. Eine feste Tageszahl ist dort nicht angegeben. Kanne, Basis und Leitung gehören nicht in die Spülmaschine. Die Anleitung beschreibt Kondenswasser an der Basis. Wasserstelle, Verschütten und sichtbaren Schaden getrennt abklären. Das doppelwandige Gehäuse steht für reduzierte Außentemperatur, konkrete Temperaturen an berührten Stellen bleiben von diesem Merkmal offen.</p>
  <p>Herstellerquellen gelesen am 20.11.2026. <a href="https://media3.bosch-home.com/Documents/specsheet/de-DE/TWK8613P.pdf">Deutsches Datenblatt Bosch TWK8613P</a> · <a href="https://www.bosch-home.com/de/de/product/fruehstueck/wasserkocher/TWK8613P">Bosch-Modellseite</a> · <a href="https://media3.bosch-home.com/Documents/8001267842_A.pdf">TWK86 Gebrauchsanleitung, deutscher Abschnitt S. 6–9</a> · <a href="https://www.bosch-home.com/de/de/productservice/TWK8613P-01">Modellservice TWK8613P/01</a> · <a href="https://www.bosch-home.com/de/de/productservice/TWK8613P-02">Modellservice TWK8613P/02</a> · <a href="https://media3.bosch-home.com/Documents/18940060_d_CO51_Bosch_Kleing_2021_Web.pdf">Bosch-Katalog, Nennvolumen auf S. 33</a>.</p>
</section>
<section id="bosch-tat8613-toaster-belege" aria-labelledby="bosch-tat8613-toaster-titel">
  <h2 id="bosch-tat8613-toaster-titel">Bosch TAT8613: Röstschlitze, Brötchenaufsatz und Bedienung prüfen</h2>
  <p>Bosch listet für den deutschen TAT8613 zwei Röstschlitze und einen integrierten, versenkbaren Brötchenaufsatz. Die Zahl der Schlitze belegt keine Innenmaße für dicke Brotscheiben. Für lose Ersatzteile zählt die vollständige E-Nummer vom Typenschild und eine dazu passende Herstellerzuordnung. Die Geräteausstattung allein belegt keinen losen Aufsatz als passendes Ersatzteil. <a href="https://www.bosch-home.com/de/de/product/TAT8613">Bosch Produktseite Deutschland</a> · <a href="https://www.bosch-home.com/de/de/productservice/TAT8613-01">Bosch Service für TAT8613/01</a> · <a href="https://media3.bosch-home.com/Documents/specsheet/de-DE/TAT8613.pdf">Bosch Datenblatt TAT8613</a></p>
  <p>Für Brötchen nennt die Anleitung den ausgefahrenen Aufsatz und maximal Stufe 2, angezeigt durch 1 und 3. Sie schließt gleichzeitiges Toasten im Schacht, Alufolie auf dem Aufsatz und tropfendes Aufbackgut aus. Der Aufsatz ist für die dokumentierte normale Benutzung vorgesehen. <a href="https://media3.bosch-home.com/Documents/9001690573_A.pdf">Bosch Gebrauchsanleitung TAT861, 9001690573_A, deutsche Seiten 2–5</a></p>
  <p>Für kaltes Brot oder Toast zum bloßen Wiederaufwärmen gibt es das Aufwärmsymbol. Bei gefrorenem Toast nennt Bosch die gewünschte Stufe zusammen mit der Auftautaste. Die Anleitung gruppiert trockenes Toastbrot bei Stufen 1–5, feuchteres Grau- und Vollkornbrot bei 6–7 und dickes Schwarzbrot bei 8–9. Für eine statt zwei Scheiben nennt sie einen kleineren Röstgrad und rät zu goldgelber Bräunung. Die Stufen sagen kein konkretes Ergebnis oder Minutenwert voraus. <a href="https://media3.bosch-home.com/Documents/9001690573_A.pdf">Bosch Gebrauchsanleitung, deutsche Seiten 4–5</a></p>
  <p>In der Einstellanzeige stehen benachbarte ungerade Zahlen für ihre Zwischenstufe, etwa 3 und 5 für Stufe 4. Im laufenden Betrieb zeigen die Ziffern Fortschritt. Die Auswahl kann nach Ausschalten, Ausstecken und Stromausfall gespeichert bleiben. Automatisches Anheben kennzeichnet das Ende, STOP den manuellen Abbruch und High Lift hilft bei der Entnahme kleiner Scheiben. <a href="https://media3.bosch-home.com/Documents/9001690573_A.pdf">Bosch Gebrauchsanleitung, deutsche Seite 4</a></p>
  <p>Die Krümelschublade muss für den Betrieb eingesetzt sein. Erst nach vollständigem Abkühlen und Ziehen des Netzsteckers die herausgenommene Schublade abwischen, Krümel unter dem Aufsatz gemäß Anleitung mit einem harten Pinsel entfernen und das Außengehäuse feucht abwischen. Die Anleitung schließt Eintauchen, Spülmaschine, Dampfreiniger und Grill- oder Backofenspray aus. Bei einem gebrauchten Gerät zuerst die Ausstattung prüfen und vorhandenes, passendes Zubehör weiter verwenden. <a href="https://media3.bosch-home.com/Documents/9001690573_A.pdf">Bosch Gebrauchsanleitung, deutsche Seiten 2 und 4–5</a></p>
  <p>Deutsche Bosch-Unterlagen 9001690573_A und Produktdaten des TAT8613, geprüft am 20.11.2026.</p>
</section>
<section class="pc-method" id="fenstersauger-belege" aria-labelledby="fenstersauger-belege-title">
  <h2 id="fenstersauger-belege-title">Fenstersauger prüfen: Abziehlippen und Gebrauch</h2>
  <p>Für wenige Scheiben kann der vorhandene Einwascher mit Abzieher genügen. Kommt das Wasser regelmäßig von innen zurück, zuerst <a href="/guide/fenster-beschlagen-innen.html#fenstersauger-gegen-kondenswasser">Raumluft und Innenscheibe messen</a>.</p>
  <p><a href="#kaercher-fenstersauger-einsatz-und-hinweise">Kärcher im Gebrauch prüfen</a> · <a href="#bosch-glassvac-einsatz-und-pflege">Bosch GlassVAC einsetzen und pflegen</a></p>
  <h3 id="fenstersauger-duesenbreite">Welche Saugdüse kommt für ein schmales Glasfeld infrage?</h3>
  <p>Miss die lichte Breite an der engsten Stelle zwischen Rahmen und Sprossen. Ziehe die Reserve ab, die du auf beiden Seiten lassen möchtest. Bei 170 mm Glasbreite und 5 mm Reserve je Seite bleiben 160 mm. Unter den vier dokumentierten Paketen bleibt allein der 133-mm-Saugkopf des Bosch GlassVAC unter dieser Breite.</p>
  <form class="pc-window-width" data-window-width-check hidden>
    <div class="pc-window-measurements">
      <label>Engste freie Glasbreite (mm)<input name="lichte_breite_mm" type="number" inputmode="decimal" min="1" max="5000" step="any" required></label>
      <label>Reserve je Seite (mm)<input name="spiel_pro_seite_mm" type="number" inputmode="decimal" min="0" max="1000" step="any" value="0" required></label>
      <label>Vorhandene kompatible Düse (mm, optional)<input name="vorhandene_duese_mm" type="number" inputmode="decimal" min="0" max="3000" step="any"></label>
    </div>
    <label class="pc-window-opt"><input name="kauf_geplant" type="checkbox"> Ich möchte neue Sets vergleichen, wenn meine vorhandene Düse nicht infrage kommt.</label>
    <button type="submit">Düsenbreite prüfen</button>
    <p data-window-width-status role="status"></p>
    <ul data-window-width-options hidden></ul>
  </form>
  <div class="pc-table-scroll" role="region" aria-label="Düsenbreiten der deutschen Fenstersauger-Pakete" tabindex="0">
    <table data-window-width-table>
      <caption>Dokumentierte Düsen- und Saugkopfbreiten</caption>
      <thead><tr><th scope="col">Deutsches Paket</th><th scope="col">Nennbreiten</th></tr></thead>
      <tbody>
        <tr><th scope="row"><a href="#produkt-kaercher-wv2-multi">Kärcher WV 2 Plus Multi Edition, 1.633-662.0</a><br><small>Quelle: <a href="https://www.karcher.com/de/de/home-and-garden/produkte/wv-2-plus-multi-edition-p16336620">Kärcher WV 2 Produktseite</a></small></th><td>280 mm</td></tr>
        <tr><th scope="row"><a href="#produkt-kaercher-wv3-precision">Kärcher WV 3 Comfort Precision+ Black, 1.633-698.0</a><br><small>Quelle: <a href="https://www.karcher.com/de/de/home-and-garden/produkte/wv-3-comfort-precision-black-p16336980">Kärcher WV 3 Produktseite</a></small></th><td>170 mm / 280 mm</td></tr>
        <tr><th scope="row"><a href="#produkt-kaercher-wv8-signature">Kärcher WV 8 Signature Line, 1.633-785.0</a><br><small>Quelle: <a href="https://www.karcher.com/de/de/home-and-garden/produkte/wv-8-signature-line-p16337850">Kärcher WV 8 Produktseite</a></small></th><td>170 mm / 280 mm</td></tr>
        <tr><th scope="row"><a href="#produkt-bosch-glassvac-set">Bosch GlassVAC Set, 06008B7000</a><br><small>Quelle: <a href="https://www.bosch-diy.com/de/de/p/glassvac-06008b7000">Bosch GlassVAC Set Produktseite</a></small></th><td>133 mm / 266 mm</td></tr>
      </tbody>
    </table>
  </div>
  <p>Die Nennbreite dient der Vorauswahl. Prüfe am Fenster auch die tatsächliche Außenbreite von Saugkopf und Gehäuse sowie Hindernisse beim Ansetzen und Kippen. Reicht dein vorhandener Abzieher oder ein Tuch, kannst du es weiterverwenden.</p>
  <p><strong>Wasser bleibt an der Unterkante?</strong> Setze ein vorhandenes, ausgeschaltetes Gerät trocken an. Prüfe, ob der Kopf bis unten am Glas anliegt oder ob Gehäuse und Fensterbank zuerst anstoßen. Für die verbleibenden Tropfen am Rand genügt ein sauberes Tuch. Bei einem neuen Set vor dem Kauf die tatsächlichen Kopfmaße und den Platz zum Ansetzen klären.</p>
  <p>Gleiche beim Bosch-Angebot die Bestellnummer oder EAN ab. Das Set 06008B7000 (EAN 3165140920148) enthält laut Bosch den großen und den kleinen Saugkopf. Beim <a href="https://www.bosch-diy.com/de/de/p/glassvac-solo-plus-06008b7200">GlassVAC Solo Plus 06008B7200</a> (EAN 3165140976374) listet Bosch im Lieferumfang nur den großen Saugkopf. Ist das Angebot nicht eindeutig, lass dir vor dem Kauf den kleinen Saugkopf bestätigen.</p>
  <p>Die Bosch-Maße stehen in der <a href="https://www.bosch-diy.com/storage/de-de/glassvac-100045834-original-pdf-396340-de-de.pdf">deutschen Originalanleitung F 016 L81 778 auf Seite 4</a>. <a href="#modelle-fenstersauger">Fenstersauger-Modelle und Lieferumfang vergleichen</a>.</p>
  <h3 id="kaercher-170mm-saugduese" style="scroll-margin-top:210px">Welche 170-mm-Saugdüse passt zu meinem Kärcher Fenstersauger?</h3>
  <p>Entscheidend sind die genaue Geräteausführung und die Teilenummer der vollständigen Saugdüse. Kärcher führt für diese Düsen dieselbe Nennbreite von 170 mm und unterschiedliche Kompatibilitätslisten für Deutschland.</p>
  <ul>
    <li><strong>WV 2 Plus Multi Edition:</strong> <strong>2.633-112.0</strong>.</li>
    <li><strong>WV 3 Comfort Precision+ Black:</strong> <strong>2.633-605.0</strong>.</li>
    <li><strong>WV 4-4 Plus:</strong> <strong>2.633-512.0</strong> (gelb). Der Titel der weißen Düse enthält „WV 4-4“. In der konkreten Geräteliste der weißen Düse steht WV 4-4 Plus nicht. Lass diese Zuordnung bei Bedarf vor dem Kauf bestätigen.</li>
    <li><strong>WV 5 Ultra Care:</strong> <strong>2.633-532.0</strong> (weiß).</li>
    <li><strong>WV 6 Plus:</strong> <strong>2.633-512.0</strong> (gelb) und <strong>2.633-532.0</strong> (weiß) sind gelistet.</li>
    <li><strong>WV 6 + KV 4:</strong> <strong>2.633-512.0</strong> (gelb).</li>
    <li><strong>WV 6 + KV 4 Premium:</strong> <strong>2.633-532.0</strong> (weiß).</li>
    <li><strong>WV 8 Signature Line:</strong> <strong>2.633-532.0</strong> (weiß).</li>
  </ul>
  <p>Steht im Angebot nur „WV 6“ oder ist das Set anders benannt, lies die genaue Kennung am Gerät ab. Prüfe die Teilenummer am Angebot und lass den Lieferumfang separat bestätigen. Die Kompatibilitätsliste sagt, welche ganze Düse zugeordnet ist. Ob eine schmale Düse oder lose Ersatzlippen in einem konkreten Set beiliegen, hängt vom Lieferumfang ab.</p>
  <p>Wenn nur die Lippe abgenutzt ist, prüfe zuerst <a href="#fenstersauger-abziehlippen">die Abziehlippe für die vorhandene Originaldüse</a>. Warte mit dem Kauf, solange Geräteausführung, Düse oder Teilenummer offen sind. Reicht die vorhandene Düse, ein Abzieher oder ein Tuch, kannst du es weiterverwenden.</p>
  <p>Deutsche Kärcher-Listen geprüft am <time datetime="2026-11-22">22. November 2026</time>. <a href="https://www.karcher.com/de/de/home-and-garden/produkte/absaugduese-schmal-fuer-wv-2-wv-5-p26331120">Saugdüse 2.633-112.0</a> · <a href="https://www.karcher.com/de/de/home-and-garden/produkte/schmale-absaugduese-170-mm-wv-1-go-wv-1-compact-wv-2-universal-wv-3-comfort-p26336050">Saugdüse 2.633-605.0</a> · <a href="https://www.karcher.com/de/de/home-and-garden/produkte/absaugduese-schmal-170-mm-gelb-fuer-wv-6-p26335120">Saugdüse 2.633-512.0</a> · <a href="https://www.karcher.com/de/de/home-and-garden/produkte/absaugduese-schmal-170-mm-weiss-fuer-wv-4-4-wv-5-ultra-wv-6-wv-7-wv-8-p26335320">Saugdüse 2.633-532.0</a>.</p>
  <!--EB_NOZZLE_SHARE--><p><a href="https://www.reddit.com/submit?url=https%3A%2F%2Fgetecoback.com%2Fprodukte.html%23kaercher-170mm-saugduese&amp;title=Welche%20170-mm-Saugd%C3%BCse%20passt%20zu%20meinem%20K%C3%A4rcher%20Fenstersauger%3F" rel="noreferrer" style="display:inline-flex;align-items:center;min-height:44px">Auf Reddit teilen</a></p><!--/EB_NOZZLE_SHARE-->
  <h3 id="fenstersauger-abziehlippen">170-mm-Abziehlippen am genauen Gerät zuordnen</h3>
  <p>Die gleiche Breite reicht für die Ersatzteilwahl nicht aus. Prüfe die vollständige Modellkennung am Gerät, die verwendete schmale Originaldüse und die Teilenummer im Angebot.</p>
  <ul>
    <li>Für den Kärcher WV 3 Comfort Precision+ Black (1.633-698.0) führt der Hersteller die schwarze Abziehlippe 2.633-104.0 in der <a href="https://www.karcher.com/de/de/home-and-garden/produkte/wv-abziehlippen-schwarz-170-mm-p26331040">deutschen Kompatibilitätsliste</a>.</li>
    <li>Für den Kärcher WV 8 Signature Line (1.633-785.0) führt er die schmale Abziehlippe 2.633-513.0 in der <a href="https://www.karcher.com/de/de/home-and-garden/produkte/wv-4-4-wv-5-ultra-wv-6-wv-7-wv-8-abziehlippen-170-mm-p26335130">entsprechenden Kompatibilitätsliste</a>.</li>
  </ul>
  <p>Für die gekreuzten Kombinationen liefern diese Listen keinen Beleg. Stelle die Bestellung zurück, wenn die Originaldüse oder Teilenummer offen ist. Deutsche Herstellerlisten geprüft am <time datetime="2026-11-20">20. November 2026</time>.</p>
</section>
<section id="kaercher-fenstersauger-einsatz-und-hinweise" class="pc-card" aria-labelledby="kaercher-fenstersauger-einsatz-titel">
  <h3 id="kaercher-fenstersauger-einsatz-titel">Kärcher-Fenstersauger vor dem Kauf und beim Einsatz prüfen</h3>
  <p>Vergleiche die Artikelnummer am Gerät oder an der Verpackung mit der deutschen Produktseite. Die folgenden Hinweise gehören zu diesen Geräteausführungen und den dort verlinkten Anleitungen. Stand 20.11.2026.</p>
  <ul>
    <li><a href="https://www.karcher.com/de/de/home-and-garden/produkte/wv-2-plus-multi-edition-p16336620">WV 2 Plus Multi Edition, 1.633-662.0</a>. Der zugeordnete <a href="https://dp6jru56judg7.cloudfront.net/BTA/000/BTA-5548307-000-05.pdf">Sicherheitshinweis, S. 3</a> nennt höchstens 25 ml Flüssigkeit für die beschriebene Nutzung. Für eine verschüttete Flüssigkeit zuerst ein geeignetes Tuch oder einen Wischer verwenden.</li>
    <li><a href="https://www.karcher.com/de/de/home-and-garden/produkte/wv-3-comfort-precision-black-p16336980">WV 3 Comfort Precision+ Black, 1.633-698.0</a> und <a href="https://www.karcher.com/de/de/home-and-garden/produkte/wv-8-signature-line-p16337850">WV 8 Signature Line, 1.633-785.0</a>. Der <a href="https://dp6jru56judg7.cloudfront.net/BTA/000/BTA-6001552-000-02.pdf">gemeinsam verlinkte Sicherheitshinweis, S. 3</a> nennt 40 ml. Das Tankvolumen ist in den Produktdaten separat aufgeführt.</li>
    <li><strong>Blinkmuster ablesen.</strong> Blinkfolgen und Betriebszustand gehören zusammen. Beim WV 3 beschreibt die Tabelle bei schnellem Blinken während des Ladens einen Ladevorgang, der gerade nicht möglich ist. Beim WV 8 verweist zweimal kurzes Blinken aller LEDs mit anschließender langer Pause und ausgeschaltetem Motor auf eine zu hohe oder zu niedrige Akkutemperatur. Lass das Gerät auf eine für Wohnräume übliche Temperatur kommen. Bei unklarem Muster die Anleitung oder den Kundendienst nutzen. <a href="https://dp6jru56judg7.cloudfront.net/BTA/000/BTA-6001552-000-02.pdf">Kärcher, LED-Codes auf S. 4–5</a></li>
    <li><strong>Akkutausch einordnen.</strong> Die Produktseiten des WV 3 und WV 8 beschreiben einen Tausch im Servicefall. Wenn ein im Betrieb wechselbarer Reserveakku kaufentscheidend ist, die Freigabe für das genaue Gerät vor dem Kauf separat erfragen.</li>
    <li><strong>Reiniger und Fläche prüfen.</strong> Die auf den Produktseiten verlinkten Sicherheitshinweise sehen üblichen Glas- beziehungsweise Fensterreiniger vor und schließen Spiritus und Schaumreiniger aus. Beim WV 3 und WV 8 nennt Kärcher außerdem sehr warme, kalte, heiße oder gefrorene Flächen als ungeeignet. Den Mikrofaser-Wischbezug auf empfindlichem Hochglanz zuerst unauffällig ausprobieren. <a href="https://dp6jru56judg7.cloudfront.net/BTA/000/BTA-6001552-000-02.pdf">Kärcher, Hinweise auf S. 2–3</a></li>
  </ul>
</section>
<section class="pc-method" id="bosch-glassvac-einsatz-und-pflege" aria-labelledby="bosch-glassvac-einsatz-und-pflege-titel">
  <h2 id="bosch-glassvac-einsatz-und-pflege-titel">Bosch GlassVAC im Haushalt einsetzen und pflegen</h2>
  <p>Diese Hinweise beziehen sich auf das deutsche Bosch GlassVAC Set 06008B7000 und die zugehörige Originalanleitung F 016 L81 778. Prüfe beim vorhandenen Gerät die Kennzeichnung und die passende Anleitung.</p>
  <ul>
    <li><strong>Flüssigkeit und Oberfläche.</strong> Der Fenstersauger ist für Flüssigkeit auf glatten, nicht porösen Flächen wie Glas, Spiegeln und Fliesen gedacht. Für trockenen Staub, poröse Flächen sowie heißes Wasser oder brennbare Flüssigkeiten ist dieser Einsatz ausgeschlossen.</li>
    <li><strong>Nach Frost zuerst die Temperatur am Ladeort messen.</strong> Bosch empfiehlt 0 bis +45 °C als Umgebungstemperatur beim Laden. Eine frostige Nacht sagt dir nicht, welche Temperatur jetzt am Ladeort herrscht. Für die Lagerung nennt Bosch −20 bis +50 °C. Unter −5 °C das Gerät nicht einschalten. Bei Temperaturen unter 0 °C ist die Leistung eingeschränkt.</li>
    <li><strong>Schmutzwassertank spülen.</strong> Nimm den Saugkopf ab. Fülle sauberes warmes, nicht heißes Wasser bis zur Max-Markierung durch die Öffnung des Saugkopfs ein. Zum Abgießen dient der Ablassverschluss. Tauche das Gerät nicht in Wasser ein.</li>
    <li><strong>Streifen und sichtbare Schäden.</strong> Bosch nennt bei echten Streifen sowohl eine beschädigte Lippe als auch ungeeigneten Anpressdruck als mögliche Ursachen. Kosmetische Flecken oder Linien am Kunststoff begründen allein keinen Ersatzkauf.</li>
    <li><strong>Wasseraustritt lokalisieren.</strong> Ist der separate Sprühkopf lose, prüfe ihn anhand der Montageabbildung E. Bei fortbestehendem Austritt am Sauggerät selbst schalte es aus und frage beim Service nach. Das Gehäuse bleibt geschlossen.</li>
  </ul>
  <p>Quellen geprüft am <time datetime="2026-11-20">20.11.2026</time>. <a href="https://www.bosch-diy.com/de/de/p/glassvac-06008b7000">Deutsche Bosch-Produktseite zum Set 06008B7000</a> · <a href="https://www.bosch-diy.com/storage/de-de/glassvac-100045834-original-pdf-396340-de-de.pdf">Bosch Originalanleitung F 016 L81 778, S. 3–6 (PDF)</a>.</p>
</section>
'''


def date(value):
    if not isinstance(value, str) or not re.fullmatch(r'\d{4}-\d{2}-\d{2}', value):
        raise ValueError('Expected exact ISO calendar date')
    return dt.date.fromisoformat(value)


def normalized(value):
    return ' '.join(value.casefold().split())


def validate(data):
    if not isinstance(data, dict) or type(data.get('version')) is not int or data['version'] != 1:
        raise ValueError('Unsupported product catalog version')
    if data.get('market') != 'DE' or type(data.get('max_age_days')) is not int or data['max_age_days'] != 90:
        raise ValueError('Catalog requires reviewed DE market and 90-day evidence boundary')
    published = date(data.get('published'))
    modified = date(data.get('modified'))
    if modified < published:
        raise ValueError('Modified date precedes publication')
    categories, products = data.get('categories'), data.get('products')
    if not isinstance(categories, list) or not categories or not isinstance(products, list) or not products:
        raise ValueError('A reviewed catalog cannot be empty')
    category_ids, category_names, ids, models, queries = set(), set(), set(), set(), set()
    veto = storage_veto.load()
    for category in categories:
        if not isinstance(category, dict) or any(not isinstance(category.get(k), str) or not category[k].strip() for k in ('id', 'name', 'intro', 'no_purchase')):
            raise ValueError('Missing category identity or decision guidance')
        key = category['id']
        if not SLUG.fullmatch(key) or key in category_ids or normalized(category['name']) in category_names:
            raise ValueError('Invalid or duplicate category identity')
        if storage_veto.is_storage(category['id'] + ' ' + category['name'], veto):
            raise ValueError('Storage/PV categories are excluded')
        guide = category.get('buying_guide')
        if guide is not None:
            if (not isinstance(guide, dict) or
                any(not isinstance(guide.get(k), str) or not guide[k].strip() for k in ('question', 'answer')) or
                not isinstance(guide.get('steps'), list) or len(guide['steps']) != 3 or
                any(not isinstance(step, str) or not step.strip() for step in guide['steps'])):
                raise ValueError('Invalid category buying guide')
        category_ids.add(key); category_names.add(normalized(category['name']))
    for product in products:
        if not isinstance(product, dict) or any(not isinstance(product.get(k), str) or not product[k].strip() for k in PRODUCT_FIELDS):
            raise ValueError('Missing reviewed product fields')
        if FORBIDDEN.intersection(product):
            raise ValueError('Merchant, price, stock and rating fields are not catalog inputs')
        key, model, query = product['id'], normalized(product['brand'] + ' ' + product['name']), normalized(product['query'])
        if not SLUG.fullmatch(key) or key in ids or model in models or query in queries:
            raise ValueError('Invalid or duplicate exact model identity')
        if product['category'] not in category_ids:
            raise ValueError('Unknown product category')
        if product['status'] not in {'verified', 'unverified', 'conflict', 'stale', 'pending'}:
            raise ValueError('Unknown evidence status')
        date(product['checked'])
        if not citation_url(product['source']):
            raise ValueError('Unreviewed official source: ' + product['id'])
        if storage_veto.is_storage(' '.join(product[k] for k in ('id', 'category', 'brand', 'name', 'variant', 'query')), veto):
            raise ValueError('Storage/PV products are excluded')
        ids.add(key); models.add(model); queries.add(query)
    if any(not any(p['category'] == c for p in products) for c in category_ids):
        raise ValueError('Category has no reviewed product')
    return data


def load(path=ROOT / 'data/product-catalog.json'):
    return validate(json.loads(Path(path).read_text(encoding='utf-8')))


def eligible(product, data, today):
    age = (today - date(product['checked'])).days
    return product['status'] == 'verified' and 0 <= age <= data['max_age_days']


def render(data, today=None):
    data = validate(data)
    today = today or dt.datetime.now(dt.timezone.utc).date()
    esc = lambda value: escape(str(value), quote=True)
    # Every published product group must have its matching practical check.
    # A missing helper is a build error, never an empty feature placeholder.
    from product_category_tools import render_tool
    from product_category_comparison import render_comparison
    groups = []
    for category in data['categories']:
        cards = []
        for product in data['products']:
            if product['category'] != category['id']:
                continue
            if eligible(product, data, today):
                url = 'https://www.amazon.de/s?' + urlencode({'k': product['query'], 'tag': 'getecoback-21'})
                merchant = f'<p class="pc-commerce"><a href="{esc(url)}" target="_blank" rel="sponsored nofollow noopener">Modellsuche bei Amazon.de →</a><small>Anzeige · Suche, keine feste Produktseite. Genaue Variante, Gesamtpreis und Lieferung beim Händler prüfen.</small></p>'
            else:
                merchant = '<p class="pc-commerce pc-paused">Händlersuche pausiert: Quellenprüfung ausstehend. Die Angaben unten sind der dokumentierte Stand, keine aktuelle Kaufempfehlung.</p>'
            care_link = (f'<p class="pc-care"><a href="/ersatzfilter.html#{esc(product["id"])}">Ersatzfilter zuordnen &amp; Pflege notieren →</a></p>'
                         if product['id'] in FILTER_CARE_MODELS else '')
            cards.append(f'''<section class="pc-card" id="produkt-{esc(product['id'])}" data-product-card data-category="{esc(category['id'])}">
<h3>{esc(product['name'])}</h3><p class="pc-brand">{esc(product['brand'])} · {esc(product['variant'])}</p>
<p><strong>Aufgabe:</strong> {esc(product['role'])}</p><p>{esc(product['facts'])}</p>
<p class="pc-limit"><strong>Vor dem Kauf:</strong> {esc(product['limit'])}</p>
<p class="pc-source">Quelle: <a href="{esc(product['source'])}" target="_blank" rel="noopener">{esc(product['source_label'])}</a> · geprüft am <time datetime="{esc(product['checked'])}">{date(product['checked']).strftime('%d.%m.%Y')}</time>.</p>
{merchant}{care_link}</section>''')
        comparison = render_comparison(category['id'], data['products'], category.get('buying_guide'))
        tool = render_tool(category['id'])
        if not isinstance(tool, str) or not tool.strip():
            raise ValueError('Missing category tool: ' + category['id'])
        groups.append(f'''<section class="pc-category" id="kategorie-{esc(category['id'])}" data-product-category="{esc(category['id'])}">
<h2>{esc(category['name'])} <span class="pc-category-count">{len(cards)} Modelle</span></h2>
<p>{esc(category['intro'])}</p><p class="pc-no-purchase"><strong>Vorhandenes weiter nutzen?</strong> {esc(category['no_purchase'])}</p>
<p class="pc-buyer-routes"><a href="#modelle-{esc(category['id'])}">Direkt die {len(cards)} Modelle vergleichen ↓</a> <a href="#pc-tool-{esc(category['id'])}">Erst die passende Auswahlhilfe nutzen ↓</a></p>
{comparison}{tool}<h3 class="pc-model-heading" id="modelle-{esc(category['id'])}">{esc(category['name'])}: Modelle und Kaufgrenzen</h3><div class="pc-grid">{''.join(cards)}</div></section>''')
    nav = ''.join(f'<a href="#kategorie-{esc(c["id"])}" data-category-link="{esc(c["id"])}">{esc(c["name"])}</a>' for c in data['categories'])
    guide_items = ''.join(
        f'<li data-specialist-guide data-search-terms="{esc(keywords)}">'
        f'<a href="{esc(target)}">{esc(name)}</a> <p>{esc(question)}</p></li>'
        for name, target, question, keywords in SPECIALIST_GUIDES
    )
    part_links = ''.join(
        f'<li><a href="{esc(target)}" data-part-guide data-category="{esc(category)}" data-search-terms="{esc(terms)}">'
        f'{esc(name)}</a></li>'
        for name, target, category, terms in PART_GUIDES
    )
    options = ''.join(f'<option value="{esc(c["id"])}">{esc(c["name"])}</option>' for c in data['categories'])
    css_version = hashlib.sha256((ROOT / 'site/assets/product-catalog.css').read_bytes()).hexdigest()[:12]
    script_version = hashlib.sha256((ROOT / 'site/assets/product-catalog.mjs').read_bytes()).hexdigest()[:12]
    tool_version = hashlib.sha256((ROOT / 'site/assets/product-category-tools.mjs').read_bytes()).hexdigest()[:12]
    count = len(data['products'])
    published, modified = data['published'], data['modified']
    graph = {'@context': 'https://schema.org', '@type': 'CollectionPage', 'name': TITLE,
             'description': DESCRIPTION, 'url': CANONICAL, 'inLanguage': 'de-DE',
             'datePublished': published, 'dateModified': modified,
             'publisher': {'@type': 'Organization', 'name': 'EcoBack', 'url': 'https://getecoback.com/'},
             'mainEntity': {'@type': 'ItemList', 'numberOfItems': count,
                            'itemListElement': [{'@type': 'ListItem', 'position': n, 'name': p['name'], 'url': CANONICAL + '#produkt-' + p['id']} for n, p in enumerate(data['products'], 1)]}}
    structured = json.dumps(graph, ensure_ascii=False, separators=(',', ':')).replace('<', '\\u003c')
    return f'''<!doctype html>
<html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{TITLE}</title><meta name="description" content="{DESCRIPTION}"><link rel="canonical" href="{CANONICAL}">
<link rel="alternate" type="text/markdown" href="https://getecoback.com/produkte.md"><link rel="alternate" hreflang="de" href="{CANONICAL}">
<meta property="og:type" content="website"><meta property="og:title" content="{TITLE}"><meta property="og:description" content="{DESCRIPTION}"><meta property="og:url" content="{CANONICAL}">
<link rel="stylesheet" href="/assets/product-catalog.css?v={css_version}"><script type="module" src="/assets/product-catalog.mjs?v={script_version}"></script><script type="module" src="/assets/product-category-tools.mjs?v={tool_version}"></script>
<script type="application/ld+json">{structured}</script></head><body>
<main class="pc-page"><article data-product-directory><header class="pc-header"><p><a href="/">EcoBack</a> / Produkte</p>
<h1>Haushaltsgeräte: konkrete Modelle für deine Aufgabe</h1><p class="pc-lead">{count} konkrete Modelle in {len(data['categories'])} Produktgruppen. Vergleiche Einsatz, genaue Variante und Grenzen anhand der Herstellerquellen — ohne Testnoten oder Preisrangliste.</p>
<p class="pc-disclosure">Als Amazon-Partner verdient EcoBack an qualifizierten Käufen. Händlersuchen sind als Anzeige gekennzeichnet. Keine eigenen Gerätetests; Herstellerangaben sind keine Leistungszusage für dein Zuhause.</p>
<p class="pc-dates">Veröffentlicht: <time datetime="{published}">{date(published).strftime('%d.%m.%Y')}</time> · Inhalt geändert: <time datetime="{modified}">{date(modified).strftime('%d.%m.%Y')}</time>. Der Quellenstand steht an jedem Modell.</p></header>
<section id="ersatzteile-pruefen" class="pc-part-guides" aria-labelledby="pc-part-guides-heading">
<h2 id="pc-part-guides-heading">Ersatzteile nach Modell prüfen</h2>
<p>Halte die vollständige Modellnummer vom Typenschild oder die Teilenummer bereit.</p>
<ul class="pc-part-links">{part_links}</ul></section>
<nav class="pc-categories" aria-label="Produktgruppen und Kaufhilfen">{nav}<a class="pc-guide-jump" href="#kaufhilfen">Zu den {len(SPECIALIST_GUIDES)} Kaufhilfen ↓</a></nav>
<form class="pc-filters" id="product-filters" role="search" hidden><label for="product-query">Modelle und Kaufhilfen durchsuchen<input id="product-query" type="search" maxlength="100" autocomplete="off" placeholder="Zum Beispiel: Luftbefeuchter, Bosch, Parkett"></label>
<label for="product-category">Produktgruppe<select id="product-category"><option value="">Alle Produktgruppen</option>{options}</select></label><button type="reset">Filter zurücksetzen</button>
<p class="pc-filter-note">Die Suche läuft nur in diesem Browser. Dein Suchtext wird nicht übertragen.</p>
<p id="product-filter-empty" hidden>Keine passenden Modelle oder Kaufhilfen gefunden. Ändere die Suche oder setze die Filter zurück.</p></form>
<p id="product-filter-status" role="status" aria-live="polite">{count} Modelle in {len(data['categories'])} Produktgruppen.</p>
<ul class="pc-part-links" data-part-results aria-label="Passende Ersatzteil-Hinweise" hidden></ul>
<section class="pc-guides" id="kaufhilfen" data-specialist-guides aria-labelledby="pc-guides-heading">
<h2 id="pc-guides-heading">Kaufhilfen für Raumklima, Heizung und Böden</h2>
<ul>{guide_items}</ul></section>
{''.join(groups)}
{APPLIANCE_EVIDENCE}
<section class="pc-method" id="auswahlmethode"><h2>Was diese Auswahl leistet</h2><p>Die Gruppen zeigen unterschiedliche Aufgaben und konkrete Modelle, keine vollständige Marktübersicht. Herstellerdaten und genaue Varianten stehen bei jedem Gerät. Wir haben diese Geräte nicht selbst getestet. Eine Händlersuche bestätigt weder ein bestimmtes Angebot noch Verfügbarkeit oder einen Preis.</p><p>Quellen älter als 90 Tage, zukünftige Prüfdaten oder offene Widersprüche pausieren die Händlersuche. Die zuletzt dokumentierten Fakten bleiben nachvollziehbar. Zubehör, regionale Ausführung und die passende Anleitung am konkreten Angebot prüfen. Ein funktionierendes vorhandenes Gerät muss nicht ersetzt werden.</p></section>
</article></main><footer class="pc-footer"><a href="/wie-wir-empfehlen.html">Unsere Methode</a> · <a href="/datenschutz.html">Datenschutz</a> · <a href="/impressum.html">Impressum</a></footer></body></html>\n'''


def build(root=ROOT, today=None):
    root = Path(root)
    data = load(root / 'data/product-catalog.json')
    output = render(data, today)
    site = root / 'site'
    if site.is_symlink():
        raise ValueError('Refusing symlink site root')
    site.mkdir(parents=True, exist_ok=True)
    html_path = site / 'produkte.html'
    md_path = site / 'produkte.md'
    markdown = to_markdown(output, ROUTE, 'de')
    if re.search(r'https?://(?:www\.)?amazon\.|tag=getecoback-21', markdown, re.I):
        raise ValueError('Merchant link leaked into machine-readable text')
    for path, text in ((html_path, output), (md_path, markdown)):
        if path.is_symlink():
            raise ValueError('Refusing symlink output')
        if not path.exists() or path.read_text(encoding='utf-8') != text:
            path.write_text(text, encoding='utf-8')
    return {'products': len(data['products']), 'categories': len(data['categories']),
            'merchant_searches': sum(eligible(p, data, today or dt.datetime.now(dt.timezone.utc).date()) for p in data['products'])}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--root', type=Path, default=ROOT)
    parser.add_argument('--today', type=date)
    args = parser.parse_args()
    print(json.dumps(build(args.root, args.today), ensure_ascii=False))
