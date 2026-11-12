#!/usr/bin/env python3
"""Original German robot-fit photo carousel; does not schedule any post."""
import hashlib
import json
from pathlib import Path
from PIL import ImageDraw
from render_thermostat_carousel import canvas, text, BLUE, INK, PALE

ROOT = Path(__file__).resolve().parents[1]
CREATIVE = 'de-robot-fit-20261112'
OUT = ROOT/'site/assets/marketing'/CREATIVE
SOURCES = [
    {'url': 'https://de.roborock.com/pages/roborock-saros-10r', 'supports': 'Manufacturer distinguishes double-threshold capability; maxima and conditions are model-specific.'},
    {'url': 'https://support.roborock.com/hc/en-us/articles/43407403865369-Where-should-I-position-Saros-10R', 'supports': 'Dock placement requires reserved floor and height space; no universal dimensions inferred.'},
]


def save(im, name):
    p = OUT/name
    im.save(p, quality=94, optimize=True, subsampling=0)
    return {'path': f'/assets/marketing/{CREATIVE}/{name}', 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    media=[]
    im,d=canvas(1,'SAUGROBOTER-KAUF')
    text(d,(78,245),'Hohe\nTürschwelle?',94,True,spacing=5)
    text(d,(78,515),'Miss Form und Höhe.',48,True,BLUE)
    for x,label in [(78,'Eine Stufe'),(560,'Zwei Stufen')]:
        d.rounded_rectangle((x,650,x+442,985),radius=24,fill=PALE)
        text(d,(x+35,680),label,35,True)
    d.line((110,870,260,870,260,800,480,800),fill=BLUE,width=9)
    d.line((600,900,720,900,720,850,825,850,825,800,960,800),fill=BLUE,width=9)
    text(d,(78,1030),'Skizzen · kein Nachweis der Überwindbarkeit',27)
    media.append(save(im,'01-threshold.jpg'))

    im,d=canvas(2,'01 / DIE SCHWELLE')
    text(d,(78,245),'Jede Kante\nseparat messen.',74,True)
    text(d,(78,475),'Höhe jeder Stufe\nAbstand zwischen den Stufen\nForm der Kante',42,spacing=24)
    d.rounded_rectangle((78,735,1002,1010),radius=24,fill=PALE)
    d.line((120,940,360,940,360,865,610,865,610,790,950,790),fill=BLUE,width=9)
    for x,y1,y2 in [(320,865,940),(570,790,865)]:
        d.line((x,y1,x,y2),fill='#9B4326',width=4)
        d.line((x-12,y1,x+12,y1),fill='#9B4326',width=4)
        d.line((x-12,y2,x+12,y2),fill='#9B4326',width=4)
    d.line((375,980,595,980),fill='#9B4326',width=4)
    d.line((375,967,375,993),fill='#9B4326',width=4)
    d.line((595,967,595,993),fill='#9B4326',width=4)
    text(d,(78,1045),'Einzel- und Doppelschwellen getrennt vergleichen.',26)
    media.append(save(im,'02-measure.jpg'))

    im,d=canvas(3,'02 / DIE STATION')
    text(d,(78,245),'Die Station\nbraucht Platz.',78,True)
    text(d,(78,475),'Grundfläche und Zufahrt prüfen.\nPlatz zum Entnehmen der Behälter\nnach Modellanleitung einplanen.',39,spacing=23)
    d.rounded_rectangle((78,735,1002,1010),radius=24,fill=PALE)
    d.rounded_rectangle((420,785,650,945),radius=18,outline=BLUE,width=6)
    d.rounded_rectangle((450,805,520,920),radius=8,outline=BLUE,width=4)
    d.rounded_rectangle((550,805,620,920),radius=8,outline=BLUE,width=4)
    d.line((535,970,535,1020),fill='#9B4326',width=7)
    d.polygon([(535,1040),(520,1017),(550,1017)],fill='#9B4326')
    text(d,(78,1060),'Keine pauschalen Abstände für alle Modelle.',26)
    media.append(save(im,'03-dock.jpg'))

    im,d=canvas(4,'03 / DER MODELLVERGLEICH')
    text(d,(78,245),'Erst prüfen,\ndann vergleichen.',76,True)
    text(d,(78,490),'Schwelle · Möbel · Teppich\nStation · Pflegeaufwand',42,True,spacing=25)
    d.rounded_rectangle((78,690,1002,905),radius=24,fill=PALE)
    text(d,(108,730),'Hersteller-Maxima sind keine\nZusage für deine Wohnung.\nBedingungen und Anleitung mitlesen.',35,spacing=13)
    text(d,(78,955),'Wohnungscheck und Modellquellen:',32)
    text(d,(78,1015),'getecoback.com/robot-tiktok',42,True,BLUE)
    media.append(save(im,'04-guide.jpg'))

    manifest={
        'creative_id':CREATIVE,'campaign':'eco-dach-robot-01','format':'photo_carousel','language':'de','brand_id':'7132930','channel':'tiktok',
        'source_checked':'2026-11-12','reviewed':False,'publication_state':'prepared_not_scheduled',
        'receipt_location':'This creative has not been submitted. Read the latest ECO release receipt and Metricool queue before considering scheduling.',
        'landing_url':'https://getecoback.com/robot-tiktok',
        'canonical_destination':'https://getecoback.com/guide/saugroboter-kaufberatung.html?utm_source=tiktok&utm_medium=social&utm_campaign=eco-dach-robot-01#wohnung-pruefen',
        'title':'Hohe Türschwelle? Miss Form und Höhe.',
        'caption':'Werbung · eigener EcoBack-Ratgeber\n\nHohe Türschwelle? Vor dem Saugroboter-Kauf Form und Höhe messen:\n1. Jede einzelne Stufe, den Abstand zwischen Stufen und die Kantenform notieren. Eine Doppelschwelle ist nicht dieselbe Hürde wie eine einzelne hohe Stufe.\n2. Für die Station Grundfläche, Zufahrt und Platz zum Entnehmen der Behälter nach der genauen Modellanleitung prüfen.\n3. Hersteller-Maxima mit ihren Bedingungen lesen. Sie sind keine Zusage für deine Wohnung. Auch Möbel, Teppiche und Pflegeaufwand gehören zum Vergleich.\n\nWohnungscheck und Modellquellen: getecoback.com/robot-tiktok\n\nQuellen: Roborock Saros 10R Produktseite und Aufstellhinweise, geprüft am 12.11.2026. Originale Skizzen, kein eigener Gerätetest und keine pauschale cm-Zusage. Die Website enthält gekennzeichnete Affiliate-Links.\n\n#Saugroboter #Türschwelle #Kaufberatung',
        'sources':[dict(x,checked_at='2026-11-12') for x in SOURCES], 'media':media,
        'distribution_limits':{'max_new_creatives_per_run':1,'max_new_creatives_per_7_days':2,'no_repeat_days':30},
        'distribution_decision':{'state':'hold_prepared','reason':'Existing ECO posts on November 12 and 14 occupy the current cadence; no positive prior photo reach evidence. Do not add a third forward post in this release.', 'earliest_window_after':'2026-11-19T18:30:00+01:00','next_review_slot':'2026-11-20T18:30:00+01:00','review_slot_is_not_a_schedule':True,'required_before_send':['Review actual results of the two pending ECO posts','Recheck rolling seven-day queue and 30-day creative deduplication','Verify live landing, source facts, campaign and every media hash','Stay within the existing bounded pilot; no cadence increase']},
        'measurement':'Platform reported reach, tagged arrivals and affiliate clicks are separate from orders and settled commission. Missing or unsupported photo metrics remain unknown.'
    }
    target=ROOT/'data/marketing'/f'{CREATIVE}.json'
    target.write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps({'manifest':str(target),'media':media},ensure_ascii=False))


if __name__=='__main__':
    main()
