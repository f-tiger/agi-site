# -*- coding: utf-8 -*-
"""One-off: generate /about and /privacy (E-E-A-T + ad-network prerequisites)."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from gen_lib import STYLE, GTAG, FAVICON, SITE, OUT

UPD = "July 10, 2026"


def shell(slug, title, desc, h1, eyebrow, body):
    url = f"{SITE}/{slug}"
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
{GTAG}
{FAVICON}
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="{url}">
<meta property="og:site_name" content="The AGI Scorecard">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="website">
<meta property="og:url" content="{url}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
{STYLE}
</style>
</head>
<body>
<header>
  <a href="/" class="logo"><span class="logo-dot"></span>AGI Scorecard</a>
  <a href="/" class="back-link">← Live scorecard</a>
</header>
<article>
  <div class="eyebrow">{eyebrow}</div>
  <h1>{h1}</h1>
  <div class="updated">Last updated: {UPD}</div>
{body}
</article>
<footer>AGI Scorecard · Independent tracker of <a href="https://situational-awareness.ai" style="color:var(--muted);">Situational Awareness</a> · Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · <a href="/privacy" style="color:var(--muted);">Privacy</a></footer>
</body>
</html>"""


ABOUT_BODY = """<p>The AGI Scorecard is an independent, continuously updated tracker that grades the major predictions from Leopold Aschenbrenner's June 2024 essay <em>Situational Awareness: The Decade Ahead</em> against real-world AI progress.</p>
<h2>Why this site exists</h2>
<p>AGI forecasts are usually debated in the abstract — bold claims get attention when made and are quietly forgotten when due. This scorecard does the unglamorous part: it wrote down every major, checkable prediction from one influential document, attached a pre-registered condition that would flip each verdict, and grades them in public as evidence arrives.</p>
<h2>Methodology</h2>
<ul>
<li><strong>Verdicts are one of four grades:</strong> On track, Wrong, Open, or Pending — each with the reasoning and evidence stated on its page.</li>
<li><strong>Pre-registered flip conditions:</strong> every verdict states in advance what evidence would change it, so grading can't quietly move the goalposts.</li>
<li><strong>Public evidence only:</strong> verdicts rest on published benchmarks, retrospectives, and documented public statements — never private information or invented figures.</li>
<li><strong>Updates as reality changes:</strong> when a frontier release or a resolution date moves a verdict, the scorecard and the affected pages are updated, and the change is noted in the homepage changelog.</li>
</ul>
<h2>Independence</h2>
<p>This site is not affiliated with any AI lab, with Leopold Aschenbrenner, or with Situational Awareness LP. It holds no position for or against the essay's thesis: three of its predictions currently grade On track and one grades Wrong, and both facts get equal billing.</p>
<h2>Contact</h2>
<p>The best way to reach the maintainers is by replying to any issue of the <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=site" target="_blank" rel="noopener">weekly briefing</a> — replies land directly in our inbox.</p>"""

PRIVACY_BODY = """<p>This page explains what data agiscorecard.com collects and how it is used. The short version: this is a static informational site with no accounts, no comments, and no data sold to anyone.</p>
<h2>Analytics</h2>
<p>We use <strong>Google Analytics 4</strong> to understand aggregate traffic — which pages are visited, roughly where visitors come from, and which site features are used. GA4 sets cookies and collects pseudonymous usage data (such as page views, approximate location at city level, and device type). We do not use this data to identify individuals. You can opt out with the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener">Google Analytics opt-out browser add-on</a> or by blocking analytics cookies in your browser.</p>
<h2>Newsletter</h2>
<p>The weekly briefing is operated on <strong>beehiiv</strong>. If you subscribe, your email address is stored by beehiiv and used solely to send the newsletter; every issue includes a one-click unsubscribe link. See <a href="https://www.beehiiv.com/privacy" target="_blank" rel="noopener">beehiiv's privacy policy</a> for details of their processing.</p>
<h2>Hosting</h2>
<p>The site is served via <strong>Cloudflare</strong>, which may process standard technical request data (IP addresses, request logs) to deliver and secure the site, per <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noopener">Cloudflare's privacy policy</a>.</p>
<h2>Advertising</h2>
<p>The site currently shows no advertising. If that changes, this policy will be updated first, and any advertising partner's required disclosures will be added here before ads are served.</p>
<h2>Your rights</h2>
<p>Depending on your jurisdiction (e.g. GDPR, CCPA), you may have rights to access or delete personal data. For newsletter data, use the unsubscribe link or contact beehiiv. For analytics, data is pseudonymous; blocking cookies prevents collection going forward.</p>
<h2>Contact</h2>
<p>Questions about this policy: reply to any issue of the <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=site" target="_blank" rel="noopener">weekly briefing</a>.</p>"""

pages = [
    ("about", "About the AGI Scorecard — Methodology & Independence",
     "What the AGI Scorecard is, how verdicts are graded with pre-registered flip conditions, and why it's independent of every AI lab.",
     "About the AGI Scorecard", "About", ABOUT_BODY),
    ("privacy", "Privacy Policy — AGI Scorecard",
     "What data agiscorecard.com collects (GA4 analytics, beehiiv newsletter), how it's used, and your opt-out options.",
     "Privacy policy", "Legal", PRIVACY_BODY),
]

for slug, title, desc, h1, eyebrow, body in pages:
    html = shell(slug, title, desc, h1, eyebrow, body)
    with open(os.path.join(OUT, slug + ".html"), "w", encoding="utf-8") as f:
        f.write(html)
    print(f"wrote {slug}.html ({len(html)} b) title={len(title)} desc={len(desc)}")
