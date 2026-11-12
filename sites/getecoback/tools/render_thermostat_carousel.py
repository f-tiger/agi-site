#!/usr/bin/env python3
"""Original German photo carousel; no product photos or borrowed test results."""
import hashlib
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
CREATIVE = 'de-thermostat-20261112'
OUT = ROOT / 'site/assets/marketing' / CREATIVE
FONTS = Path('/usr/share/fonts/truetype/open-sans')
INK, BLUE, PALE, GOLD, WHITE = '#142E45', '#075D80', '#EAF4F7', '#F0AD44', '#FFFFFF'
SOURCE = 'https://shop.tado.com/products/smart-radiator-thermostat-x-starter-kit-1'


def font(size, bold=False):
    return ImageFont.truetype(str(FONTS / ('OpenSans-Bold.ttf' if bold else 'OpenSans-Regular.ttf')), size)


def text(draw, xy, value, size, bold=False, fill=INK, spacing=14):
    draw.multiline_text(xy, value, font=font(size, bold), fill=fill, spacing=spacing)


def canvas(index, label):
    im = Image.new('RGB', (1080, 1350), WHITE)
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 1080, 28), fill=BLUE)
    text(d, (78, 78), 'ECOBACK', 30, True, BLUE)
    text(d, (910, 78), f'{index}/4', 30, True, BLUE)
    text(d, (78, 165), label, 29, True, BLUE)
    d.line((78, 1140, 1002, 1140), fill='#CDDFE6', width=2)
    text(d, (78, 1170), 'Werbung · eigener EcoBack-Ratgeber', 27, True)
    text(d, (78, 1215), 'Website mit gekennzeichneten Affiliate-Links.', 25)
    return im, d


def save(im, name):
    p = OUT / name
    im.save(p, quality=94, optimize=True, subsampling=0)
    return {'path': f'/assets/marketing/{CREATIVE}/{name}', 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()}


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    media = []
    im, d = canvas(1, 'THERMOSTAT-KAUF')
    text(d, (78, 245), 'Passt es\nwirklich?', 104, True, spacing=4)
    text(d, (78, 535), '3 Checks vor dem Bestellen', 43)
    for y, n, label in [(665, '01', 'Ventil'), (805, '02', 'System'), (945, '03', 'Gesamtkosten')]:
        d.rounded_rectangle((78, y, 1002, y+112), radius=20, fill=PALE)
        text(d, (105, y+22), n, 44, True, BLUE)
        text(d, (225, y+22), label, 44, True)
    media.append(save(im, '01-fit.jpg'))

    im, d = canvas(2, '01 / DAS VENTIL')
    text(d, (78, 245), 'Gewinde allein\nreicht nicht.', 75, True)
    text(d, (78, 475), 'Ventil identifizieren.\nAdapter für dein genaues\nThermostatmodell prüfen.', 44, spacing=22)
    d.rounded_rectangle((78, 760, 1002, 1008), radius=24, fill=PALE)
    for x in [130, 195, 260, 325]:
        d.rounded_rectangle((x, 815, x+44, 945), radius=15, outline=BLUE, width=6)
    d.line((370, 875, 500, 875), fill=BLUE, width=12)
    d.ellipse((480, 834, 560, 914), outline=BLUE, width=6)
    d.rounded_rectangle((560, 809, 775, 939), radius=25, outline=BLUE, width=6)
    text(d, (610, 838), '?', 59, True, BLUE)
    text(d, (78, 1040), 'Prinzipbild · kein Montage- oder Passungsnachweis', 26)
    media.append(save(im, '02-valve.jpg'))

    im, d = canvas(3, '02 / DEIN SYSTEM')
    text(d, (78, 245), 'X ist nicht V3+.', 80, True)
    text(d, (78, 390), 'tado° X und V3+ sind laut Hersteller\nnicht miteinander kompatibel.', 41, spacing=20)
    for x, label in [(78, 'tado° X'), (620, 'V3+')]:
        d.rounded_rectangle((x, 610, x+382, 795), radius=22, fill=PALE)
        text(d, (x+58, 666), label, 52, True, BLUE)
    d.line((500, 678, 580, 748), fill='#9B4326', width=10)
    d.line((580, 678, 500, 748), fill='#9B4326', width=10)
    text(d, (78, 875), 'Vorhandene Bridge und gewünschtes\nModell gemeinsam prüfen.', 41, spacing=20)
    text(d, (78, 1050), 'Quelle: tado° Shop · geprüft am 12.11.2026', 26)
    media.append(save(im, '03-system.jpg'))

    im, d = canvas(4, '03 / DIE GESAMTKOSTEN')
    text(d, (78, 245), 'Mehr als der\nThermostatkopf.', 75, True)
    labels = ['Anzahl der Heizkörper', 'Zentrale / Border Router', 'Passende Adapter', 'Optionale Abos']
    for y, label in zip([505, 600, 695, 790], labels):
        d.ellipse((80, y+16, 104, y+40), fill=GOLD)
        text(d, (137, y), label, 43, True)
    text(d, (78, 935), 'Kosten und Modellquellen prüfen:', 34)
    text(d, (78, 1000), 'getecoback.com/thermostat-tiktok', 38, True, BLUE)
    media.append(save(im, '04-cost.jpg'))

    manifest = {
        'creative_id': CREATIVE, 'campaign': 'eco-dach-thermostat-01',
        'format': 'photo_carousel', 'language': 'de', 'brand_id': '7132930', 'channel': 'tiktok',
        'source_checked': '2026-11-12', 'reviewed': False,
        'publication_state': 'prepared_not_scheduled',
        'receipt_location': 'Release PR delivery update and Metricool readback; reconcile before retrying.',
        'landing_url': 'https://getecoback.com/thermostat-tiktok',
        'canonical_destination': 'https://getecoback.com/guide/smarte-heizkoerperthermostate-lohnen-sich.html?utm_source=tiktok&utm_medium=social&utm_campaign=eco-dach-thermostat-01#eb-thermostat-products',
        'title': 'Thermostat-Kauf: drei Checks vor dem Bestellen',
        'caption': 'Werbung · eigener EcoBack-Ratgeber\n\nPasst das smarte Heizkörperthermostat wirklich?\n1. Ventil bestimmen und den Adapter für das genaue Modell prüfen. Die Gewindegröße allein ist kein Passungsnachweis.\n2. Vorhandene Bridge und neue Generation abgleichen: tado° X und V3+ sind laut Hersteller nicht miteinander kompatibel.\n3. Die Gesamtkosten zählen: Anzahl der Heizkörper, nötige Zentrale, Adapter und optionale Abos.\n\nKosten und Modellquellen prüfen: getecoback.com/thermostat-tiktok\n\nQuelle zum Generationenvergleich: tado° Shop, geprüft am 12.11.2026. Kein eigener Gerätetest und keine pauschale Sparzusage. Die Website enthält gekennzeichnete Affiliate-Links.\n\n#Heizkörperthermostat #SmartHome #Heizkosten',
        'sources': [{'url': SOURCE, 'checked_at': '2026-11-12', 'supports': 'tado X / V3+ incompatibility and kit contents'}],
        'media': media,
        'distribution_limits': {'max_new_creatives_per_run': 1, 'max_new_creatives_per_7_days': 2, 'no_repeat_days': 30},
        'proposed_publication': {'Europe/Berlin': '2026-11-14T18:30:00+01:00', 'Asia/Shanghai': '2026-11-15T01:30:00+08:00'},
        'measurement': 'Reach, tagged visits and affiliate clicks are distinct from orders and settled commission; no backend receipt inferred from campaign registration.'
    }
    target = ROOT / 'data/marketing' / f'{CREATIVE}.json'
    target.write_text(json.dumps(manifest, ensure_ascii=False, indent=2)+'\n')
    print(json.dumps({'manifest': str(target), 'media': media}, ensure_ascii=False))


if __name__ == '__main__':
    main()
