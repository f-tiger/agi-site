#!/usr/bin/env python3
"""Render EcoBack's original schematic preview illustrations (authoring only).

Requires Pillow and DejaVu Sans. Committed PNGs are verified, not re-rendered,
in CI; no browser, remote image, customer input or paid service is involved.
Run after editing data/social-previews.json, then inspect all four images.
"""
from pathlib import Path
import json
import math

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DATA = json.loads((ROOT / "data/social-previews.json").read_text())
SCALE = 2
INK = "#123449"
BLUE = "#0f6ba8"
LIGHT = "#d9edf6"
GREEN = "#2a7d72"
AMBER = "#e4a850"
BG = "#f7fafc"
WHITE = "#ffffff"


def font(size, bold=False):
    face = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    return ImageFont.truetype(f"/usr/share/fonts/truetype/dejavu/{face}", size * SCALE)


class Canvas:
    def __init__(self):
        self.image = Image.new("RGB", (1200 * SCALE, 630 * SCALE), BG)
        self.draw = ImageDraw.Draw(self.image)

    def line(self, points, fill=INK, width=5):
        self.draw.line([(x * SCALE, y * SCALE) for x, y in points], fill=fill,
                       width=width * SCALE, joint="curve")

    def box(self, box, fill=WHITE, outline=None, radius=12, width=4):
        self.draw.rounded_rectangle(tuple(v * SCALE for v in box), radius=radius * SCALE,
                                    fill=fill, outline=outline, width=width * SCALE)

    def ellipse(self, box, fill=WHITE, outline=None, width=4):
        self.draw.ellipse(tuple(v * SCALE for v in box), fill=fill,
                          outline=outline, width=width * SCALE)

    def polygon(self, points, fill, outline=None, width=3):
        self.draw.polygon([(x * SCALE, y * SCALE) for x, y in points], fill=fill,
                          outline=outline, width=width * SCALE)

    def text(self, xy, text, size=23, fill=INK, bold=False):
        self.draw.text(tuple(v * SCALE for v in xy), text, font=font(size, bold), fill=fill)

    def arrow(self, x1, y1, x2, y2, fill=BLUE):
        self.line([(x1, y1), (x2, y2)], fill, 5)
        angle = math.atan2(y2-y1, x2-x1)
        pts = [(x2, y2)] + [(x2-17*math.cos(angle+a), y2-17*math.sin(angle+a))
                            for a in (-0.45, 0.45)]
        self.polygon(pts, fill)

    def drop(self, x, y, size=25, color=BLUE):
        self.polygon([(x, y-size), (x-size*.75, y+size*.25),
                      (x+size*.75, y+size*.25)], color)
        self.ellipse((x-size*.75, y-size*.1, x+size*.75, y+size*1.4), color)

    def thermometer(self, x, y, height=145):
        self.box((x-16, y, x+16, y+height), WHITE, INK, radius=16)
        self.ellipse((x-30, y+height-35, x+30, y+height+25), LIGHT, INK)
        self.line([(x, y+height-8), (x, y+height*.45)], BLUE, 10)
        self.ellipse((x-14, y+height-21, x+14, y+height+7), BLUE)
        for i in range(4):
            self.line([(x+27, y+20+i*24), (x+43, y+20+i*24)], INK, 3)

    def device(self, x, y, size=1):
        self.box((x, y, x+112*size, y+165*size), WHITE, INK, radius=20)
        for i in range(4):
            self.line([(x+22*size, y+(27+i*12)*size),
                       (x+90*size, y+(27+i*12)*size)], BLUE, 3)
        self.box((x+18*size, y+105*size, x+94*size, y+148*size), LIGHT, radius=8)
        self.drop(x+56*size, y+121*size, 9*size)

    def sheet(self, x, y, w=150, h=170):
        self.box((x, y, x+w, y+h), WHITE, INK, radius=7)
        for i, length in enumerate((.61, .75, .52, .68)):
            self.line([(x+25, y+38+i*30), (x+length*w, y+38+i*30)], BLUE, 5)
        self.ellipse((x+w-42, y+h-51, x+w-15, y+h-24), GREEN)


def draw_climate(c):
    c.ellipse((262, 231, 937, 570), LIGHT)
    c.box((397, 321, 805, 531), WHITE, INK, radius=1)
    c.polygon([(367, 323), (601, 218), (835, 323)], WHITE, INK, 6)
    c.box((514, 357, 623, 454), LIGHT, BLUE, radius=2)
    c.line([(568, 357), (568, 454)], BLUE, 4)
    c.line([(514, 404), (623, 404)], BLUE, 4)
    c.box((684, 372, 759, 531), BG, INK, radius=2)
    c.thermometer(296, 347, 125)
    c.drop(898, 356, 35)
    c.box((865, 434, 950, 490), WHITE, INK, radius=12)
    c.text((883, 449), "%", 26, BLUE, True)
    c.box((455, 485, 551, 550), WHITE, INK, radius=12)
    c.text((473, 501), "kWh", 20, BLUE, True)


def draw_comparison(c):
    for x in (105, 445, 785):
        c.box((x, 252, x+310, 522), LIGHT, radius=35)
    c.thermometer(215, 290, 145)
    c.drop(315, 362, 26)
    c.sheet(523, 286)
    c.device(880, 288)
    c.arrow(382, 383, 475, 383)
    c.arrow(722, 383, 815, 383)
    c.text((197, 478), "Messen", 25, bold=True)
    c.text((554, 478), "Prüfen", 25, bold=True)
    c.text((852, 478), "Vergleichen", 25, bold=True)


def draw_cellar(c):
    c.box((120, 300, 722, 539), LIGHT, INK, radius=1)
    c.line([(85, 300), (757, 300)], INK, 8)
    for x in range(90, 740, 40):
        c.line([(x, 280), (x+22, 280)], GREEN, 3)
    c.box((175, 320, 289, 366), WHITE, BLUE, radius=2)
    c.thermometer(390, 344, 126)
    c.device(547, 356, .83)
    c.sheet(885, 287, 165, 195)
    c.arrow(739, 402, 854, 402)
    c.text((849, 503), "Betriebsgrenzen", 23, bold=True)
    c.text((296, 548), "Raumtemperatur", 23, bold=True)


def draw_laundry(c):
    c.ellipse((75, 260, 594, 548), LIGHT)
    c.line([(139, 365), (444, 365)], INK, 7)
    c.line([(179, 365), (392, 527)], INK, 6)
    c.line([(405, 365), (192, 527)], INK, 6)
    c.box((194, 337, 263, 436), WHITE, BLUE, radius=3)
    c.box((297, 337, 386, 463), WHITE, BLUE, radius=3)
    c.line([(310, 350), (310, 447)], LIGHT, 5)
    c.drop(470, 296, 20)
    c.drop(519, 339, 14)
    c.device(634, 315)
    c.box((862, 295, 1039, 484), WHITE, INK, radius=14)
    c.ellipse((888, 353, 1013, 467), LIGHT, BLUE, 5)
    c.ellipse((902, 367, 999, 453), WHITE, BLUE, 3)
    c.ellipse((1007, 313, 1021, 327), BLUE)
    c.line([(879, 322), (965, 322)], INK, 4)
    c.line([(692, 500), (692, 535), (951, 535), (951, 500)], BLUE, 4)
    c.box((769, 502, 876, 561), WHITE, INK, radius=9)
    c.text((787, 516), "kWh", 25, BLUE, True)


DRAW = {"climate": draw_climate, "comparison": draw_comparison,
        "cellar": draw_cellar, "laundry": draw_laundry}


def main():
    for key, card in DATA["cards"].items():
        c = Canvas()
        c.box((0, 0, 1200, 12), BLUE, radius=0)
        c.text((64, 37), "EcoBack", 24, BLUE, True)
        c.text((64, 91), card["heading"], 53, bold=True)
        c.text((66, 164), card["description"], 27)
        DRAW[key](c)
        c.text((64, 591), "getecoback.com", 17, BLUE)
        c.text((899, 591), "Schematische Darstellung", 16, "#526b7b")
        out = ROOT / "site" / card["image"].lstrip("/")
        out.parent.mkdir(parents=True, exist_ok=True)
        c.image.resize((1200, 630), Image.Resampling.LANCZOS).save(out, optimize=True)
        print(f"{out.relative_to(ROOT)}: {out.stat().st_size} bytes")


if __name__ == "__main__":
    main()
