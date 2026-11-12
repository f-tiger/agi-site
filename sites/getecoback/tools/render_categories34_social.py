#!/usr/bin/env python3
"""Original robot and humidifier topic previews; no borrowed device photos."""
from render_dach_social import base, font, OUT, BLUE, INK, PALE


def main():
    OUT.mkdir(parents=True,exist_ok=True)
    im,d=base()
    d.multiline_text((64,160),'Passt der\nSaugroboter?',font=font(68,True),fill=INK,spacing=8)
    d.multiline_text((64,390),'Schwellen und Station\nvor dem Kauf prüfen.',font=font(32),fill=INK,spacing=6)
    d.rounded_rectangle((765,150,1136,485),radius=32,fill=PALE)
    d.ellipse((810,225,1000,365),outline=BLUE,width=6)
    d.ellipse((875,250,925,286),outline=BLUE,width=5)
    d.line((800,425,935,425,935,390,1045,390,1045,355,1105,355),fill=BLUE,width=6)
    im.save(OUT/'robot-v1.png',optimize=True)

    im,d=base()
    d.multiline_text((64,160),'Zu trockene\nLuft?',font=font(70,True),fill=INK,spacing=8)
    d.multiline_text((64,390),'Messen. Bauart und\nPflegeaufwand prüfen.',font=font(32),fill=INK,spacing=6)
    d.rounded_rectangle((765,150,1136,485),radius=32,fill=PALE)
    d.rounded_rectangle((830,260,1070,430),radius=28,outline=BLUE,width=6)
    d.rounded_rectangle((890,300,1010,365),radius=10,outline=BLUE,width=4)
    d.text((919,308),'rF',font=font(34,True),fill=BLUE)
    for x,y in [(880,213),(940,195),(1000,213)]:
        d.arc((x,y,x+30,y+50),180,360,fill=BLUE,width=5)
    im.save(OUT/'humidifier-v1.png',optimize=True)
    print('Rendered robot-v1.png and humidifier-v1.png at1200x630')


if __name__=='__main__':
    main()
