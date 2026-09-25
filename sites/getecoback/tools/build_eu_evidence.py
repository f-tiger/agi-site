#!/usr/bin/env python3
"""Regula Brief checks, migrated to EcoBack's existing evidence-tool area.

Content dates are editorial data, never the build clock. Both visible FAQ and
JSON-LD use the same copy; all processing stays in the browser.
"""
import html
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
BASE = "https://getecoback.com"
COPY = {
    "en": {"home": "Home", "tools": "All tools", "area": "EU product evidence", "contact": "Contact", "privacy": "Privacy", "skip": "Skip to checker", "local": "Free · no uploads · local export", "related": "Related evidence check", "other": "中文", "otherLang": "zh", "overview": "General product evidence check", "share": "Copy page link", "copied": "Page link copied.", "copyError": "Copy the page address from your browser to share it.", "reset": "Start again", "language": "Language", "paid": "The EcoBack storage membership is a separate product and does not buy this evidence service."},
    "zh": {"home": "首页", "tools": "工具总览", "area": "欧盟产品证据", "contact": "联系", "privacy": "隐私政策", "skip": "跳到检查器", "local": "免费使用 · 无需上传 · 本地导出", "related": "相关证据检查", "other": "English", "otherLang": "en", "overview": "通用产品证据检查（英文）", "share": "复制页面链接", "copied": "页面链接已复制。", "copyError": "请复制浏览器地址栏中的页面链接进行分享。", "reset": "重新开始", "language": "语言", "paid": "EcoBack 云存储会员是独立产品，不包含此证据服务。"},
}
SLUGS = {"cbam": "cbam-supplier-data", "eudr": "eudr-geolocation-evidence"}
TAGS = {"en": "en", "zh": "zh-CN"}
esc = lambda s: html.escape(str(s), quote=True)


def put(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    if not path.exists() or path.read_text() != content:
        path.write_text(content)


def route(topic, lang):
    return f"/{lang}/agents/{SLUGS[topic]}.html"


def select(name, label, options):
    opts = "".join(f'<option value="{esc(v)}">{esc(text)}</option>' for v, text in options)
    return f'<label class="evidence-field" for="{name}"><span>{esc(label)}</span><select id="{name}" name="{name}">{opts}</select></label>'


def render(t):
    topic, lang = t["topic"], t["lang"]
    c = COPY[lang]
    other_topic = "eudr" if topic == "cbam" else "cbam"
    url = BASE + route(topic, lang)
    home = "/en/" if lang == "en" else "/"
    overview = "/en/agents/compliance.html"
    schema = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": url, "name": t["title"], "description": t["description"], "url": url, "inLanguage": TAGS[lang], "dateModified": t["modified"], "citation": [s[0] for s in t["sources"]]},
        {"@type": "FAQPage", "@id": url + "#faq", "mainEntity": [{"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in t["faqs"]]},
        {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": i + 1, "name": name, "item": item} for i, (name, item) in enumerate([(c["home"], BASE + home), (c["tools"], BASE + "/tools.html"), (t["title"], url)])]},
    ]}
    alternates = "\n".join(f'<link rel="alternate" hreflang="{TAGS[l]}" href="{BASE + route(topic, l)}">' for l in ("en", "zh")) + f'\n<link rel="alternate" hreflang="x-default" href="{BASE + route(topic, "en")}">'
    planning = ""
    if topic == "eudr":
        planning = f'<fieldset><legend>{esc(t["deadlineTitle"])}</legend>{select("product-scope", t["productScopeLabel"], t["productScopes"])}{select("size", t["sizeLabel"], t["sizes"])}<p id="deadline" class="notice">{esc(t["deadlineUnknown"])}</p>{select("commodity", t["commodityLabel"], t["commodities"])}<p class="muted small">{esc(t["scopeNote"])}</p></fieldset>'
    choices = [("unknown", t["unknown"]), ("yes", t["yes"]), ("no", t["no"])]
    questions = "\n".join(select(id, question, choices) for id, question, _ in t["items"])
    faqs = "\n".join(f'<details><summary>{esc(q)}</summary><p>{esc(a)}</p></details>' for q, a in t["faqs"])
    sources = "".join(f'<li><a href="{esc(u)}">{esc(label)}</a></li>' for u, label in t["sources"])
    data = dict(t, **{k: c[k] for k in ["copied", "copyError"]})
    payload = json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    ld = json.dumps(schema, ensure_ascii=False, separators=(",", ":")).replace("<", "\\u003c")
    related_title = ("EUDR plot evidence" if other_topic == "eudr" else "CBAM supplier handoff") if lang == "en" else ("EUDR 地块证据预检" if other_topic == "eudr" else "CBAM 供应商交接检查")
    request = t.get('request')
    request_entry = (f'<a class="btn btn-secondary" href="#supplier-request">{"Free supplier request template" if lang == "en" else "免费供应商补件模板"}</a>' if request else '')
    request_path = f'/downloads/cbam-supplier-request-{lang}.txt'
    request_section = ''
    if request:
        request_section = f'''<section class="panel" id="supplier-request"><h2>{esc(request['title'])}</h2><p>{esc(request['intro'])}</p><ol class="steps">{''.join('<li><strong>'+esc(title)+'</strong><p>'+esc(body)+'</p></li>' for title,body in request['steps'])}</ol><p><a href="{esc(t['sources'][-1][0])}">{esc(t['sources'][-1][1])}</a></p><a id="supplier-template" class="btn btn-primary" href="{request_path}" download>{esc(request['download'])}</a><p class="small muted">{esc(request['note'])}</p></section>'''
    scope_contact = (f'<a class="btn btn-outline" href="/kontakt.html">{esc(t["scopeContact"])}</a><p class="small muted">{esc(t["scopeContactNote"])}</p>' if t.get('scopeContact') else '')
    pricing_cta = f'<a class="btn btn-primary" href="#checker">{esc(t["checkTitle"])}</a>'
    if scope_contact:
        pricing_cta = f'<div class="actions">{pricing_cta}{scope_contact}</div>'
    body = f'''<!doctype html>
<html lang="{TAGS[lang]}"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{esc(t['title'])} | EcoBack</title>
<meta name="description" content="{esc(t['description'])}">
<link rel="canonical" href="{url}">
{alternates}
<link rel="alternate" type="text/markdown" href="{url[:-5]}.md">
<meta property="og:type" content="website"><meta property="og:site_name" content="EcoBack">
<meta property="og:title" content="{esc(t['title'])}"><meta property="og:description" content="{esc(t['description'])}"><meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary"><meta name="theme-color" content="#0a4d7a">
<link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="stylesheet" href="/css/eu-evidence.css">
<script type="application/ld+json">{ld}</script>
<script id="checker-data" type="application/json">{payload}</script><script src="/js/eu-evidence.js" defer></script>
</head><body>
<a class="skip-link" href="#checker">{c['skip']}</a>
<nav class="eb-nav"><div class="eb-nav-in"><a class="eb-logo" href="{home}">❄️ EcoBack</a><div class="eb-links"><a href="/tools.html">{c['tools']}</a><a href="#sources">{esc(t['sourcesTitle'])}</a><a href="{route(topic, c['otherLang'])}" lang="{TAGS[c['otherLang']]}" hreflang="{TAGS[c['otherLang']]}">{c['other']}</a></div></div></nav>
<header class="hero"><div class="wrap"><p class="evidence-label">{c['area']}</p><h1>{esc(t['title'])}</h1><p>{esc(t['intro'])}</p><div class="actions"><a class="btn btn-gold" href="#checker">{esc(t['checkTitle'])}</a>{request_entry}<span class="hero-note">{c['local']}</span></div></div></header>
<main class="wrap">
<nav class="breadcrumbs" aria-label="Breadcrumb"><a href="{home}">{c['home']}</a><span> / </span><a href="/tools.html">{c['tools']}</a><span> / {topic.upper()}</span></nav>
<p class="small muted">{esc(t['checked'])}</p>
<div class="evidence-grid">
<section class="panel" id="checker"><h2>{esc(t['checkTitle'])}</h2><p class="muted">{esc(t['privacy'])}</p>
<form id="evidence-check">{planning}<fieldset><legend class="sr-only">{esc(t['checkTitle'])}</legend>{questions}</fieldset>
<div class="actions"><button class="btn btn-primary" type="submit">{esc(t['run'])}</button><button class="btn btn-outline" type="reset">{c['reset']}</button></div></form>
<noscript><p class="notice">{'Enable JavaScript for the interactive checker, or follow the supplier steps on this page.' if lang == 'en' else '请开启 JavaScript 使用检查器，也可以按照本页的交接步骤逐项核对。'}</p></noscript>
<section id="result" class="result" aria-live="polite" tabindex="-1"><h3>{esc(t['resultTitle'])}</h3><p id="summary">{esc(t['empty'])}</p><ol id="gaps"></ol><p id="limit" class="small muted" hidden>{esc(t['limit'])}</p><button class="btn btn-secondary" type="button" id="download" hidden>{esc(t['download'])}</button></section></section>
<aside class="evidence-aside"><section class="panel"><h2>{esc(t['explainTitle'])}</h2><p>{esc(t['explain'])}</p><a href="{t['sources'][0 if topic == 'cbam' else 1][0]}">{esc(t['sourcesTitle'])}</a><h3>{esc(t['nextTitle'])}</h3><ol class="steps">{''.join('<li>'+esc(x)+'</li>' for x in t['next'])}</ol><p class="notice">{esc(t['boundary'])}</p></section>
<section class="panel related"><h2>{c['related']}</h2><a href="{route(other_topic,lang)}">{related_title}</a><a href="{overview}">{c['overview']}</a><button class="btn btn-outline" id="share" type="button">{c['share']}</button><p id="share-status" class="small" role="status"></p></section></aside></div>
{request_section}<section class="faq" id="faq"><h2>{esc(t['faqTitle'])}</h2>{faqs}</section>
<section class="panel" id="pricing"><h2>{esc(t['offerTitle'])}</h2><p>{esc(t['offer'])}</p><p class="small muted">{c['paid']}</p>{pricing_cta}</section>
<section class="sources" id="sources"><h2>{esc(t['sourcesTitle'])}</h2><ul>{sources}</ul><p class="small muted">{esc(t['disclaimer'])}</p></section>
</main><footer class="eb-footer"><div class="wrap"><strong>EcoBack</strong><p>{esc(t['disclaimer'])}</p><a href="/tools.html">{c['tools']}</a> · <a href="/datenschutz.html">{c['privacy']}</a> · <a href="/kontakt.html">{c['contact']}</a></div></footer>
</body></html>
'''
    md = [f'# {t["title"]}', url, t['checked'], t['intro'], t['boundary'], '## '+t['checkTitle'], t['privacy']]
    if topic == 'eudr':
        md += [t['deadlineUnknown'], t['deadline2026'], t['deadline2027'], t['deadlineAdded'], t['scopeNote']]
    for _, q, action in t['items']:
        md += ['- '+q, '  '+action]
    md += ['## '+t['nextTitle'], *['- '+x for x in t['next']], '## '+t['faqTitle']]
    for q,a in t['faqs']:
        md += ['### '+q,a]
    if request:
        md += ['## '+request['title'],request['intro'],*['### '+title+'\n\n'+body for title,body in request['steps']], '['+request['download']+']('+BASE+request_path+')', request['note']]
    md += [t['offer'],c['paid'],'## '+t['sourcesTitle'],*['- ['+label+']('+u+')' for u,label in t['sources']],t['disclaimer']]
    return body, '\n\n'.join(md)+'\n'


def discovery(path, lang):
    """A focused entry on existing homes/workbench/compliance, without new nav tiers."""
    if not path.exists():
        return
    en = lang == 'en'
    title = 'Free CBAM & EUDR evidence checks' if en else 'CBAM & EUDR: kostenlose Nachweis-Checks'
    desc = 'Check CBAM supplier handoffs and download a free request template, or prepare EUDR plot evidence. English and Chinese; no account or upload.' if en else 'CBAM-Lieferantendaten prüfen und eine kostenlose Anfragevorlage herunterladen oder EUDR-Flächennachweise vorbereiten. Auf Englisch und Chinesisch, ohne Konto oder Upload.'
    links = ''.join(f'<a href="{route(topic,l)}" lang="{TAGS[l]}" style="color:#0f6ba8;font-weight:700;margin-right:18px;display:inline-block;padding:8px 0">{topic.upper()} · {"English" if l=="en" else "中文"}</a>' for topic in ('cbam','eudr') for l in ('en','zh'))
    block = f'<!--eco-evidence:start--><section id="eu-evidence-tools" style="max-width:1080px;margin:26px auto;padding:0 20px"><div style="background:#fff;border:1px solid #dce7ed;border-left:4px solid #2ea86b;border-radius:12px;padding:20px"><h2 style="font-size:22px;color:#0a4d7a;margin:0 0 8px">{title}</h2><p style="color:#5b6b78;margin:0 0 8px">{desc}</p><div>{links}</div></div></section><!--eco-evidence:end-->'
    h = path.read_text()
    h = re.sub(r'\n?<!--eco-evidence:start-->.*?<!--eco-evidence:end-->', '', h, flags=re.S)
    # Keep the home page's first H2 in place: the household-link injector uses it.
    anchor = '<!--/EB_HOMETABLE-->' if path == SITE/'index.html' else '</header>'
    if anchor not in h:
        raise ValueError(f'Missing discovery anchor in {path}')
    h = h.replace(anchor, anchor+'\n'+block, 1)
    put(path,h)


def main():
    for path in sorted((ROOT / 'data/eu-evidence').glob('*.json')):
        t = json.loads(path.read_text())
        body,md = render(t)
        target = SITE / route(t['topic'],t['lang']).lstrip('/')
        put(target,body)
        put(target.with_suffix('.md'),md)
        if t.get('request'):
            template = '\n\n'.join([t['title'],t['checked'],BASE+route(t['topic'],t['lang']),*t['request']['template'],t['sourcesTitle'],*['%s\n%s'%(label,url) for url,label in t['sources']]])+'\n'
            put(SITE/'downloads'/f'cbam-supplier-request-{t["lang"]}.txt',template)
    for p, lang in [('index.html','de'),('en/index.html','en'),('pro-werkzeuge.html','de'),('agents/compliance.html','de'),('en/agents/compliance.html','en')]:
        discovery(SITE/p,lang)
    print('EU evidence: CBAM + EUDR, English + Chinese, native EcoBack pages and discovery links')


if __name__ == '__main__':
    main()
