"""Build the German writer's messages or validate a draft before German TTS/editing."""
import argparse
import json
from pathlib import Path
import re

import dehum_catalog
import thermostat_catalog
from winter_picks import shortlist

ROOT = Path(__file__).resolve().parents[1]
ROUTES = {'dehum': 'luftentfeuchter-ratgeber', 'thermostat': thermostat_catalog.SLUG}
TIMES = ['00:00-00:03', '00:03-00:18', '00:18-00:26', '00:26-00:32']


def packet(category):
    data = (dehum_catalog if category == 'dehum' else thermostat_catalog).load()
    picks = shortlist(data)
    if len(picks) != 2 or not all(p['url'] for p in picks):
        raise ValueError('Beide Modelle brauchen aktuelle, geprüfte Daten.')
    return {'ziel': 'https://getecoback.com/guide/' + ROUTES[category] + '.html',
            'szenenzeiten': TIMES,
            'produktion': ('Zeige eine durchgehende Handlung. Sprich den Einstieg als einen kurzen Satz. '
                           'Nenne EcoBack als Urheber in caption_de und verwende die genaue Ziel-URL.'),
            'vergleich': data['winter_comparison']['columns'],
            'modelle': [{k: v for k, v in p.items() if k != 'url'} for p in picks]}


def validate(doc, facts):
    def require(ok, error):
        if not ok:
            raise ValueError(error)
    def fields(obj, keys):
        require(isinstance(obj, dict) and set(obj) == set(keys), 'Falsche JSON-Felder')
        for key in keys:
            if key != 'scenes':
                require(isinstance(obj[key], str) and obj[key].strip(), 'Text fehlt: ' + key)
    fields(doc, ['title_de', 'hook_overlay_text', 'spoken_script_de', 'scenes', 'caption_de'])
    require(len(doc['title_de']) <= 55 and len(doc['hook_overlay_text'].split()) <= 6, 'Titel oder Einblendung zu lang')
    spoken = doc['spoken_script_de']
    require(65 <= len(spoken.split()) <= 85, '65–85 gesprochene Wörter erforderlich')
    require(len(re.split(r'[.!?](?:\s|$)', spoken, maxsplit=1)[0].split()) <= 10, 'Hook zu lang')
    require(not re.search(r'herstellerangaben|kein\w* (?:eigener?\w* )?(?:produkt)?test|fehlende daten|affiliate', spoken, re.I), 'Hinweis gehört in caption_de')
    require('getecoback.com' in spoken.lower() and 'kostenlos' in spoken.lower(), 'Gesprochener Verweis auf den kostenlosen Vergleich fehlt')
    require(isinstance(doc['scenes'], list) and len(doc['scenes']) == 4, 'Vier Szenen erforderlich')
    for scene, time in zip(doc['scenes'], TIMES):
        fields(scene, ['time', 'visual_cue', 'subtitle_de'])
        require(scene['time'] == time, 'Szenenzeiten stimmen nicht')
        require(all(1 <= len(line.split()) <= 7 for line in scene['subtitle_de'].splitlines()), 'Untertitelzeile zu lang')
    caption = doc['caption_de']
    require(facts['ziel'] in re.findall(r'https?://[^\s<>]+', caption), 'Falsche Ziel-URL')
    require(all(key in caption.lower() for key in ['ecoback', 'hersteller', 'affiliate']), 'Quellen- oder Werbehinweis fehlt')
    require(len(set(re.findall(r'(?<!\w)#\w+', caption))) == 4 and caption.count('#') == 4, 'Vier unterschiedliche Hashtags erforderlich')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest='action', required=True)
    for name in ['prompt', 'check']:
        cmd = commands.add_parser(name)
        cmd.add_argument('category', choices=ROUTES)
        if name == 'check':
            cmd.add_argument('script', type=Path)
    args = parser.parse_args()
    try:
        facts = packet(args.category)
        if args.action == 'check':
            validate(json.loads(args.script.read_text()), facts)
            print('Skriptstruktur geprüft. Fakten, gesprochenes Deutsch und fertigen Film redaktionell abnehmen.')
        else:
            prompt = (ROOT / 'data/marketing/winter-short-system.de.txt').read_text()
            print(json.dumps([{'role': 'system', 'content': prompt},
                              {'role': 'user', 'content': json.dumps(facts, ensure_ascii=False)}], ensure_ascii=False, indent=2))
    except (ValueError, OSError) as exc:
        parser.exit(1, str(exc) + '\n')


if __name__ == '__main__':
    main()
