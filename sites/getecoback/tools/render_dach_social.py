#!/usr/bin/env python3
"""Original source-independent topic illustrations for the DACH buyer paths."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'site/assets/social'
FONTS = Path('/usr/share/fonts/truetype/open-sans')
BLUE, INK, PALE = '#075D80', '#142E45', '#EAF4F7'


def font(size, bold=False):
    return ImageFont.truetype(str(FONTS / ('OpenSans-Bold.ttf' if bold else 'OpenSans-Regular.ttf')), size)


def base():
    im = Image.new('RGB', (1200, 630), 'white')
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 1200, 20), fill=BLUE)
    d.text((64, 56), 'ECOBACK', font=font(30, True), fill=BLUE)
    d.line((64, 534, 1136, 534), fill='#CDDFE6', width=2)
    d.text((64, 560), 'getecoback.com', font=font(27, True), fill=BLUE)
    d.text((750, 566), 'Schematische Darstellung', font=font(22), fill=INK)
    return im, d


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    im, d = base()
    d.multiline_text((64, 162), 'Passt das\nThermostat?', font=font(72, True), fill=INK, spacing=4)
    d.text((64, 395), 'Ventil · System · Gesamtkosten', font=font(34), fill=INK)
    d.rounded_rectangle((765, 150, 1136, 485), radius=32, fill=PALE)
    for x in [800, 847, 894]:
        d.rounded_rectangle((x, 235, x+35, 385), radius=12, outline=BLUE, width=5)
    d.line((930, 310, 980, 310), fill=BLUE, width=9)
    d.rounded_rectangle((974, 267, 1100, 353), radius=20, outline=BLUE, width=5)
    d.text((1012, 270), '?', font=font(55, True), fill=BLUE)
    im.save(OUT / 'thermostat-v1.png', optimize=True)

    im, d = base()
    d.multiline_text((64, 162), 'Saugwischer:\nPasst er zum Alltag?', font=font(58, True), fill=INK, spacing=12)
    d.multiline_text((64, 370), 'Boden prüfen.\nPflegezeit mitrechnen.', font=font(34), fill=INK, spacing=8)
    d.rounded_rectangle((765, 150, 1136, 485), radius=32, fill=PALE)
    d.line((970, 200, 970, 300), fill=BLUE, width=11)
    d.line((945, 200, 995, 200), fill=BLUE, width=11)
    d.rounded_rectangle((920, 281, 1020, 410), radius=26, outline=BLUE, width=6)
    d.rounded_rectangle((865, 406, 1075, 442), radius=12, outline=BLUE, width=6)
    d.line((810, 458, 1100, 458), fill=BLUE, width=3)
    d.ellipse((802, 199, 876, 273), outline=BLUE, width=4)
    d.line((839, 214, 839, 238, 855, 246), fill=BLUE, width=4)
    im.save(OUT / 'floorcare-v1.png', optimize=True)
    print('Rendered thermostat-v1.png and floorcare-v1.png at 1200x630')


if __name__ == '__main__':
    main()
