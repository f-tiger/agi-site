# -*- coding: utf-8 -*-
"""Generate /advertise — the inbound sponsorship funnel (media-kit page).
Methodology: hosted media kit + specific audience + 3 tiers + contact path
(beehiiv / SponsorGap / Wellput standard). All numbers on the page must stay
HONEST — update as real metrics grow; never inflate."""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from gen_lib import STYLE, GTAG, FAVICON, SITE, OUT

UPD = "July 11, 2026"

BODY = """<p>The AGI Scorecard reaches people actively researching one question: <strong>when is AGI actually coming, and who is right about it?</strong> Readers arrive through high-intent searches ("will AGI arrive by 2027", "Musk vs Altman AGI", "is AI a bubble") and through AI assistants citing our verdicts — a precisely-targeted audience of AI-curious professionals, investors, researchers, and builders.</p>
<h2>What sponsors get</h2>
<p>We are early and growing — which is exactly the moment sponsorship is cheapest. Per industry research, a small, high-intent niche audience routinely outperforms large general lists for sponsor ROI. Current footprint:</p>
<table><thead><tr><th>Asset</th><th>Status</th></tr></thead><tbody>
<tr><td>Indexed pages (GEO-optimized)</td><td class="nowrap">~97 across 9 languages</td></tr>
<tr><td>Weekly AGI progress briefing</td><td class="nowrap">Published on beehiiv</td></tr>
<tr><td>Audience intent</td><td>AGI timelines, AI benchmarks, AI investment risk</td></tr>
<tr><td>Machine-readable dataset</td><td class="nowrap"><a href="/data.json">data.json</a> (CC BY 4.0, cited by AI assistants)</td></tr>
</tbody></table>
<h2>Placements</h2>
<table><thead><tr><th>Tier</th><th>What you get</th></tr></thead><tbody>
<tr><td class="nowrap"><strong>Briefing lead sponsor</strong></td><td>Top slot in the weekly AGI progress briefing — logo, 2–3 sentences, one link.</td></tr>
<tr><td class="nowrap"><strong>Site placement</strong></td><td>A clearly-labeled sponsor card on our highest-traffic verdict pages for 30 days.</td></tr>
<tr><td class="nowrap"><strong>Text mention</strong></td><td>A one-line classified in the briefing — the lowest-friction way to test the audience.</td></tr>
</tbody></table>
<h2>Introductory rates (first 10 sponsors)</h2>
<table><thead><tr><th>Placement</th><th>Intro rate</th></tr></thead><tbody>
<tr><td>Text mention (one-line classified in the briefing)</td><td class="nowrap"><strong>$50</strong></td></tr>
<tr><td>Briefing lead sponsor (top slot: logo + 2–3 sentences + link)</td><td class="nowrap"><strong>$100</strong></td></tr>
<tr><td>Site placement (labeled sponsor card on top verdict pages, 30 days)</td><td class="nowrap"><strong>$150</strong></td></tr>
</tbody></table>
<p>These are deliberately below the $100–$400 range typical for B2B-professional niche newsletters — early sponsors take the audience-size risk, so they pay the floor and <strong>lock these rates for 6 months</strong> as we grow. Live metrics (subscriber count, open rate) are shared before any commitment; we will never quote numbers we can't show.</p>
<h2>Founding Sponsor — one-week offer</h2>
<p><strong>$99 founding bundle (first 3 sponsors only):</strong> briefing lead sponsor slot <em>plus</em> a 30-day labeled site placement <em>plus</em> a permanent "Founding sponsor" credit on our <a href="/about">About page</a>. Founding sponsors also lock intro rates for 12 months. When the three slots are gone, this offer is gone.</p>
<h2>Who should sponsor</h2>
<p>AI tools and infrastructure, research products, finance/markets products with an AI thesis, newsletters seeking cross-promotion, and hiring teams looking for AI-obsessed readers. We decline sponsors that conflict with the scorecard's independence — sponsorship never influences verdicts, and every placement is clearly labeled.</p>
<h2>Get in touch</h2>
<p>Subscribe to the <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=advertise_page" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'advertise_page'});">weekly briefing</a> and reply to any issue with the subject "Sponsorship" — replies land directly in our inbox and we answer within a few days. This page is the live media kit; numbers here update as the audience grows.</p>"""

html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
{GTAG}
{FAVICON}
<title>Advertise on The AGI Scorecard — Reach AGI-Focused Readers</title>
<meta name="description" content="Sponsor the AGI Scorecard: a weekly briefing and 97-page site reaching a high-intent audience researching AGI timelines. Introductory rates for early sponsors.">
<link rel="canonical" href="{SITE}/advertise">
<meta property="og:site_name" content="The AGI Scorecard">
<meta property="og:title" content="Advertise on The AGI Scorecard">
<meta property="og:description" content="Reach a high-intent audience researching AGI timelines, benchmarks, and AI investment risk.">
<meta property="og:type" content="website">
<meta property="og:url" content="{SITE}/advertise">
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
  <div class="eyebrow">Sponsorship</div>
  <h1>Advertise on The AGI Scorecard</h1>
  <div class="updated">Last updated: {UPD} · Live media kit — numbers update as we grow</div>
{BODY}
</article>
<footer>AGI Scorecard · Independent tracker of <a href="https://situational-awareness.ai" style="color:var(--muted);">Situational Awareness</a> · Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · <a href="/privacy" style="color:var(--muted);">Privacy</a> · <a href="/advertise" style="color:var(--muted);">Advertise</a></footer>
</body>
</html>"""

with open(os.path.join(OUT, "advertise.html"), "w", encoding="utf-8") as f:
    f.write(html)
print(f"wrote advertise.html ({len(html)} b)")
