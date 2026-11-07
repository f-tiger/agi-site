"""Editorial roles for existing moisture pages and their category directory.

This is routing policy, not a recommendation engine or a new content inventory.
The caller supplies the existing article catalog; every supplied URL survives.
"""
from collections.abc import Iterable, Mapping
from html import escape
import json
from pathlib import Path
from urllib.parse import urlsplit


DATA_PATH = Path(__file__).resolve().parents[1] / "data/moisture-journeys.json"
_DATA = json.loads(DATA_PATH.read_text(encoding="utf-8"))
ROUTE_META = _DATA["routes"]
CATEGORY_TITLE = _DATA["category"]["title"]
CATEGORY_DESC = _DATA["category"]["description"]
GUIDE_NEXT = {
    route: value["next_steps"] for route, value in ROUTE_META.items()
}
# An exact allowlist. Unreviewed pages keep their existing policy.
COMMERCE_DEFER_SLUGS = frozenset(
    Path(route).stem for route, value in ROUTE_META.items()
    if value["commerce_policy"] == "defer_generic"
)

_STYLE = """<style id="eco-moisture-journeys-style">
.eco-moisture-journeys{color:#1a2733;max-width:100%;overflow-wrap:anywhere}
.eco-moisture-journeys .eco-journey-group{margin:0 0 34px;scroll-margin-top:150px}
.eco-moisture-journeys .eco-journey-nav{display:flex;flex-wrap:wrap;gap:8px;margin:18px 0 30px}
.eco-moisture-journeys .eco-journey-nav a{display:flex;align-items:center;min-height:44px;padding:8px 12px;border:1px solid #b4d0e2;border-radius:7px;background:#fff;font-weight:700;line-height:1.4}
.eco-moisture-journeys h2{font-size:clamp(21px,3vw,27px);line-height:1.3;margin:0 0 10px}
.eco-moisture-journeys h3{font-size:17px;line-height:1.4;margin:0}
.eco-moisture-journeys p{color:#435769;line-height:1.65;margin:8px 0 12px}
.eco-moisture-journeys .eb-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,270px),1fr));gap:14px;margin:16px 0}
.eco-moisture-journeys .eb-card{margin:0;padding:16px;background:#fff;border:1px solid #d6e2ea;border-radius:10px}
.eco-moisture-journeys a{color:#0a4d7a;text-decoration:underline;text-underline-offset:3px}
.eco-moisture-journeys .eb-card h3 a{display:flex;align-items:center;min-height:44px;font-weight:700}
.eco-moisture-journeys .eco-journey-action{display:inline-flex;align-items:center;min-height:44px;padding:8px 12px;border:1px solid #b4d0e2;border-radius:7px;background:#eef6fb;font-weight:700}
.eco-moisture-journeys a:focus-visible,.eco-moisture-journeys summary:focus-visible{outline:3px solid #b66b00;outline-offset:3px}
.eco-moisture-journeys details{margin:28px 0;border-top:1px solid #d6e2ea;padding-top:14px}
.eco-moisture-journeys summary{min-height:44px;padding:10px 0;font-size:18px;font-weight:700;cursor:pointer;color:#1a2733}
.eco-moisture-journeys .eco-journey-tool{padding:12px 16px;border-left:4px solid #0f6ba8;background:#eef6fb}
</style>"""


def _card(article: Mapping[str, str]) -> str:
    """Render an inventory entry without implying area-only sizing or testing."""
    override = _DATA["category"]["card_overrides"].get(article["slug"], {})
    title = override.get("label", article["title"])
    desc = override.get("desc", article["desc"])
    extra = ""
    if action := override.get("action"):
        extra = (f'<a class="eco-journey-action" href="{escape(action["href"], quote=True)}">'
                 f'{escape(action["label"])} →</a>')
    return (
        f'<div class="eb-card" data-journey-article="{escape(article["slug"], quote=True)}">'
        f'<h3><a href="{escape(article["url"], quote=True)}">{escape(title)}</a></h3>'
        f'<p>{escape(desc)}</p>{extra}</div>'
    )


def category_inventory(articles: Iterable[Mapping[str, str]]) -> list[dict[str, str]]:
    """Return the same ordered URL/title pairs as the directory's h3 links.

    Action links and the laundry tool are handoffs, not article inventory.
    Use this for ItemList data so it describes the visible curated order and
    honest card labels, including entries in the expandable archive.
    """
    articles = list(articles)
    by_slug = {article["slug"]: article for article in articles}
    ordered = [by_slug[slug] for group in _DATA["category"]["groups"]
               for slug in group["slugs"] if slug in by_slug]
    used = {article["slug"] for article in ordered}
    ordered.extend(article for article in articles if article["slug"] not in used)
    overrides = _DATA["category"]["card_overrides"]
    return [{"url": article["url"],
             "title": overrides.get(article["slug"], {}).get("label", article["title"])}
            for article in ordered]


def render_next_steps(route: str, *, country_actions: bool = False) -> str:
    """Render the single owned handoff used by generic and country builders.

    Country guides retain their existing click-action attribute; generic pages
    use the same links and reasons without acquiring country tracking.
    """
    steps = GUIDE_NEXT.get(route)
    if not steps:
        return ""
    heading = "Next step" if route.startswith('/en/') else "Dein nächster Schritt"
    country_attr = ' data-country-action="guide"' if country_actions else ''
    items = ''.join(
        '<li style="margin:12px 0">'
        f'<a href="{escape(item["href"], quote=True)}"{country_attr} '
        'style="display:inline-flex;align-items:center;min-height:44px;color:#0a4d7a;font-weight:700">'
        f'{escape(item["label"])}</a>'
        f'<p style="margin:3px 0 0;color:#34495b">{escape(item["why"])}</p></li>'
        for item in steps
    )
    return (
        '<!--EB_RELATED--><nav id="eb-journey-next" class="eb-related" '
        f'aria-label="{heading}" '
        'style="margin:26px 0 8px;padding:18px;background:#fff;border:1px solid #d0dfe9;border-radius:12px">'
        f'<h2 style="font-size:20px;color:#0a4d7a">{heading}</h2>'
        f'<ul style="padding-left:20px">{items}</ul></nav><!--/EB_RELATED-->'
    )


def category_content(articles: Iterable[Mapping[str, str]]) -> str:
    """Return air-category body, without article/header/footer wrappers.

    Inputs use build_structure.collect_articles() fields: slug/url/title/desc.
    The curated lanes select only entries present in that catalog. Everything
    else remains a normal, server-rendered link inside native details. Unknown
    future articles are therefore preserved without being silently endorsed.
    """
    articles = list(articles)
    by_slug = {article["slug"]: article for article in articles}
    if len(by_slug) != len(articles):
        raise ValueError("Duplicate guide slugs in air-quality inventory")
    for article in articles:
        target = urlsplit(article["url"])
        if target.scheme not in ("", "https") or target.netloc not in ("", "getecoback.com"):
            raise ValueError("Air-quality inventory must contain existing site URLs")

    sections = []
    task_links = []
    used = set()
    for group in _DATA["category"]["groups"]:
        selected = [by_slug[slug] for slug in group["slugs"] if slug in by_slug]
        if not selected:
            continue
        # Use the editorial group's own wording. The air-purification group
        # names its distinct task after the colon rather than "Andere Aufgabe".
        label, _, detail = group["title"].partition(': ')
        if group["id"] == 'partikel-filtern':
            label = detail or label
        task_links.append(f'<a href="#{escape(group["id"], quote=True)}">{escape(label)}</a>')
        used.update(article["slug"] for article in selected)
        title_id = f'{group["id"]}-title'
        content = ''.join(_card(article) for article in selected)
        tool = ""
        if action := group.get("tool"):
            tool = (f'<p class="eco-journey-tool"><a class="eco-journey-action" '
                    f'href="{escape(action["href"], quote=True)}">{escape(action["label"])} →</a>'
                    f'<br>{escape(action["why"])}</p>')
        sections.append(
            f'<section class="eco-journey-group" id="{group["id"]}" aria-labelledby="{title_id}">'
            f'<h2 id="{title_id}">{escape(group["title"])}</h2>'
            f'<p>{escape(group["intro"])}</p><div class="eb-cards">{content}</div>{tool}</section>'
        )

    remaining = [article for article in articles if article["slug"] not in used]
    archive = ""
    if remaining:
        archive = (
            '<details id="weitere-luftqualitaet-ratgeber">'
            f'<summary>Weitere Ratgeber zu Luftqualität ({len(remaining)})</summary>'
            '<p>Hier findest du weitere Situationen, Gerätefamilien und Raumgrößen. '
            'Eine Fläche allein bestimmt keine passende Literleistung; '
            'Temperatur, Feuchtelast und Herstellerbedingungen gehören zum Vergleich.</p>'
            '<div class="eb-cards">' + ''.join(_card(article) for article in remaining) + '</div></details>'
        )
    return (
        _STYLE + '<div class="eco-moisture-journeys" id="eb-air-decisions">'
        '<p>Wähle die Hilfe für deine aktuelle Frage. Messung, Kaufentscheidung und '
        'die Pflege eines vorhandenen Geräts sind unterschiedliche Schritte. '
        'Alle Hilfen sind ohne Konto nutzbar.</p>'
        + ('<nav class="eco-journey-nav" aria-label="Direkt zur Aufgabe">'
           + ''.join(task_links) + '</nav>' if task_links else '')
        + ''.join(sections) + archive + '</div>'
    )
