# -*- coding: utf-8 -*-
"""GAMIFICATION/DISCOVERY page: forecaster-leaderboard. "Who's winning the AGI
bet?" — a ranked, shareable board of the public forecasters vs their called
dates. All positions are real (from data.json forecaster_timelines); zero
invented data. Carries a share row (x_share/challenge_share) to feed the
fission loop, and funnels to the Thesis Tracker + AGI-type test."""
import gen_lib as g

DATE = "2026-07-20"
SCORE = "62.5"

capsule = ('<span class="verdict">Nobody has won yet — but the boldest callers are already on the clock.</span> '
           'Elon Musk (end of 2026) and <strong>Leopold Aschenbrenner (2027)</strong> are furthest out on a limb; '
           'the median expert sits around <strong>2030</strong>, and a 2,778-person researcher survey lands at 2047. '
           f'The only thing that settles it is evidence — and as of mid-2026 the AGI-2027 Thesis Tracker reads '
           f'<strong>{SCORE}/100</strong>, with the defining milestone (AI autonomously doing AI research) still undemonstrated.')

body = """<h2>The leaderboard: who called AGI soonest</h2>
<p>Ranked by how soon each public forecaster says AGI arrives. Soonest date = boldest bet = first to face the verdict. Every position below is a real, on-the-record call — see each name's page for the source.</p>
<table><thead><tr><th>#</th><th>Forecaster</th><th>The call</th><th>Effective deadline</th></tr></thead><tbody>
<tr><td>1</td><td><strong>Elon Musk</strong> (xAI)</td><td>AGI by end of 2026</td><td class="nowrap v-open">Dec 2026 — boldest</td></tr>
<tr><td>2</td><td><strong>Dario Amodei</strong> (Anthropic)</td><td>&ldquo;Powerful AI&rdquo; possibly 2026&ndash;27</td><td class="nowrap v-open">2026&ndash;27</td></tr>
<tr><td>3</td><td><strong>Leopold Aschenbrenner</strong></td><td>AGI by 2027</td><td class="nowrap v-open">Jan 1, 2028 &mdash; what this site tracks</td></tr>
<tr><td>4</td><td><strong>Sam Altman</strong> (OpenAI)</td><td>Near-term; superintelligence &ldquo;a few thousand days&rdquo;</td><td class="nowrap v-pending">~early 2030s</td></tr>
<tr><td>5</td><td><strong>Demis Hassabis</strong> (DeepMind)</td><td>~50% by 2030</td><td class="nowrap v-pending">2030</td></tr>
<tr><td>6</td><td><strong>Samotsvety</strong> forecasters</td><td>~28% by 2030</td><td class="nowrap v-pending">2030 (bearish)</td></tr>
<tr><td>7</td><td><strong>Metaculus</strong> community</td><td>25% by 2029 &middot; 50% by 2033</td><td class="nowrap v-pending">2033 median</td></tr>
<tr><td>8</td><td><strong>Andrej Karpathy</strong></td><td>&ldquo;About a decade out&rdquo;</td><td class="nowrap v-pending">~2035</td></tr>
<tr><td>9</td><td><strong>AI researcher survey</strong> (n=2,778)</td><td>50% by 2047</td><td class="nowrap v-pending">2047</td></tr>
</tbody></table>
<div class="sharebox" style="margin:1.5rem 0; padding:1.15rem 1.3rem; background:var(--bg2); border:1px solid rgba(124,106,245,.28); border-radius:12px;">
  <p style="margin:0 0 0.7rem; font-weight:600; font-size:14px;">Who do you think wins the AGI bet? Put someone on the spot.</p>
  <button class="btn" onclick="shareX()" style="cursor:pointer;">Share on &#120143;</button>
  <button class="btn sec" onclick="copyLink()" style="cursor:pointer;">Copy the leaderboard link</button>
  <span id="copied" style="display:none; font-size:13px; color:var(--accent); margin-left:8px;">Copied!</span>
</div>
<h2>So who's actually winning?</h2>
<p>None of them &mdash; not yet. No system has autonomously run AI research end-to-end, the milestone every one of these calls implicitly depends on. What has happened is that the <em>inputs</em> stayed on the aggressive forecasters' trend line: knowledge-work capability (~83% GDPval), agentic coding (~80% SWE-Bench Pro), and compute (~0.5 OOM/yr) all kept climbing. That is why the soonest callers aren't out yet &mdash; and why the <a href="/will-agi-arrive-2027">AGI-by-2027</a> verdict stays Open rather than Wrong.</p>
<h2>Report cards: the three boldest, graded</h2>
<p>The three soonest callers, each graded against the same mid-2026 evidence — and each shareable on its own.</p>
<div class="repcards" style="display:grid; gap:10px; margin:1rem 0 1.5rem;">
  <div style="border:1px solid var(--border); border-radius:12px; padding:14px 16px;">
    <p style="margin:0; font-weight:700;">🚀 Elon Musk — AGI by end of 2026</p>
    <p style="margin:4px 0 8px; font-size:14px; color:var(--muted);">Five months left on the boldest public call. The capability inputs keep climbing (~83% GDPval, ~80% SWE-Bench Pro), but the defining milestone — autonomous AI research — is still undemonstrated. Verdict: the clock, not the trend, is his enemy.</p>
    <button class="btn sec" style="cursor:pointer; font-size:13px;" onclick="shareCard('musk','Elon Musk called AGI by end of 2026. Five months left, and the defining milestone is still undemonstrated. The evidence scoreboard reads __SCORE__/100.')">Share this card on &#120143;</button>
  </div>
  <div style="border:1px solid var(--border); border-radius:12px; padding:14px 16px;">
    <p style="margin:0; font-weight:700;">⏱️ Leopold Aschenbrenner — AGI by 2027</p>
    <p style="margin:4px 0 8px; font-size:14px; color:var(--muted);">The thesis this site grades line by line: 3 of 8 predictions on track, 1 wrong (open source didn't fade), the rest open. The auditable Thesis Tracker reads <strong>__SCORE__/100</strong> — resolves January 1, 2028.</p>
    <button class="btn sec" style="cursor:pointer; font-size:13px;" onclick="shareCard('aschenbrenner','Aschenbrenner\\u2019s AGI-2027 thesis, graded against evidence: 3 on track, 1 wrong, the rest open \\u2014 __SCORE__/100 with 18 months to run.')">Share this card on &#120143;</button>
  </div>
  <div style="border:1px solid var(--border); border-radius:12px; padding:14px 16px;">
    <p style="margin:0; font-weight:700;">📊 Demis Hassabis — ~50% by 2030</p>
    <p style="margin:4px 0 8px; font-size:14px; color:var(--muted);">The measured-bull position: this decade, but past the 2027 focal point. So far the evidence sits exactly in his window — strong task capability, unproven autonomy. The forecast hardest to falsify soon, and hardest to beat.</p>
    <button class="btn sec" style="cursor:pointer; font-size:13px;" onclick="shareCard('hassabis','Hassabis says ~50% odds of AGI by 2030. On current evidence \\u2014 strong capability, unproven autonomy \\u2014 his window is the one to beat.')">Share this card on &#120143;</button>
  </div>
</div>
<h2>The one scoreboard that moves with the evidence</h2>
<p>A leaderboard of opinions is fun; a leaderboard of <em>evidence</em> is the point. Our AGI-2027 Thesis Tracker rolls all eight tracked predictions into a single auditable score &mdash; currently <strong>__SCORE__/100</strong> &mdash; that moves only when a verdict changes, not when someone tweets. It is the closest thing to a live referee for the bets above. It resolves by <strong>January 1, 2028</strong>.</p>
<script>
function sText(){return "Who's winning the AGI bet? Musk says 2026, Aschenbrenner 2027, most experts ~2030. The evidence scoreboard says __SCORE__/100 so far.";}
function sUrl(){return "https://agiscorecard.com/forecaster-leaderboard";}
function shareX(){gtag('event','x_share',{label:'forecaster_leaderboard'});window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(sText()+' \\ud83d\\udc47')+'&url='+encodeURIComponent(sUrl()),'_blank');}
function copyLink(){gtag('event','challenge_share',{label:'forecaster_leaderboard'});navigator.clipboard.writeText(sUrl()).then(function(){var c=document.getElementById('copied');c.style.display='inline';setTimeout(function(){c.style.display='none'},2000);});}
function shareCard(slug,text){gtag('event','x_share',{label:'report_'+slug});window.open('https://twitter.com/intent/tweet?text='+encodeURIComponent(text+' \\ud83d\\udc47')+'&url='+encodeURIComponent(sUrl()),'_blank');}
</script>""".replace("__SCORE__", SCORE)

faqs = [
    ("Who predicts AGI the soonest?",
     "Elon Musk has been the most aggressive, calling AGI by the end of 2026, followed by Leopold Aschenbrenner (2027) and Dario Amodei (“powerful AI” around 2026–27). The median expert forecast clusters around 2030, and a 2,778-person AI-researcher survey puts 50% odds at 2047."),
    ("Who is winning the AGI bet in 2026?",
     "Nobody has won yet. No system has autonomously conducted AI research end-to-end — the milestone these forecasts depend on — so even the soonest calls (Musk 2026, Aschenbrenner 2027) remain open, not resolved. The AGI-2027 Thesis Tracker reads %s/100 as of mid-2026." % SCORE),
    ("What is the average expert prediction for AGI?",
     "The center of expert opinion sits around 2030–2033: Demis Hassabis (~50% by 2030), the Metaculus community (50% by 2033), and Samotsvety forecasters (~28% by 2030). Longer-horizon estimates like Andrej Karpathy's “about a decade out” and the 2,778-person survey's 50%-by-2047 pull the tail later."),
    ("How is the AGI forecaster leaderboard scored?",
     "It's ranked by how soon each forecaster says AGI arrives — soonest date first, because the boldest bet faces the verdict earliest. All positions are real, on-the-record public calls. The actual evidence is tracked separately by the auditable AGI-2027 Thesis Tracker."),
]
related = [
    ("/will-agi-arrive-2027", "Will AGI arrive by 2027?"),
    ("/who-is-leopold-aschenbrenner", "Who is Leopold Aschenbrenner?"),
    ("/altman-vs-amodei-agi", "Altman vs Amodei on AGI"),
    ("/progress-index", "The AGI-2027 Thesis Tracker"),
]

html = g.build(
    slug="forecaster-leaderboard",
    title="AGI Forecaster Leaderboard: Who Called It Soonest",
    desc="Who's winning the AGI bet? Musk says 2026, Aschenbrenner 2027, most experts ~2030 — a ranked board of every public AGI forecaster vs the date they called.",
    og_title="Who's winning the AGI bet?",
    eyebrow="The AGI bet",
    h1="AGI forecaster leaderboard: who's winning the bet?",
    capsule=capsule, body_html=body, faqs=faqs, related=related,
)

html = html.replace("Last updated: June 30, 2026", "Last updated: July 20, 2026")
html = html.replace('"datePublished": "2026-06-30", "dateModified": "2026-06-30"',
                    f'"datePublished": "{DATE}", "dateModified": "{DATE}"')
html = html.replace(
    '<div class="updated">Last updated: July 20, 2026 · Updated as verdicts change</div>',
    '<div class="updated">Last updated: July 20, 2026 · Updated as verdicts change</div>\n'
    '  <div class="byline" style="font-size:12px;color:var(--muted);margin:-0.9rem 0 1.5rem;">'
    'By the AGI Scorecard team · <a href="/about">methodology &amp; independence</a></div>')
crumb = ('<script type="application/ld+json">{"@context": "https://schema.org", "@type": "BreadcrumbList", '
         '"itemListElement": [{"@type": "ListItem", "position": 1, "name": "AGI Scorecard", "item": "https://agiscorecard.com/"}, '
         '{"@type": "ListItem", "position": 2, "name": "AGI questions, answered", "item": "https://agiscorecard.com/agi-questions"}, '
         '{"@type": "ListItem", "position": 3, "name": "AGI forecaster leaderboard", "item": "https://agiscorecard.com/forecaster-leaderboard"}]}</script>\n')
i = html.index('<script type="application/ld+json">')
html = html[:i] + crumb + html[i:]
# Tracker funnel card right after the capsule
html = html.replace('</div>\n<h2>The leaderboard',
    '''</div>
  <a href="/progress-index" onclick="gtag('event','index_click',{location:'forecaster_leaderboard'});" style="display:flex; align-items:center; gap:14px; margin:0 0 1.75rem; padding:1rem 1.3rem; background:var(--bg2); border:1px solid rgba(124,106,245,.28); border-radius:12px; text-decoration:none;">
    <span style="font-size:2rem; font-weight:700; color:var(--accent); line-height:1;">__SCORE__</span>
    <span style="line-height:1.3;"><span style="display:block; font-weight:600; color:var(--text); font-size:14px;">The evidence scoreboard: AGI-2027 Thesis Tracker</span><span style="display:block; font-size:12.5px; color:var(--muted);">One auditable score that referees every bet on this page →</span></span>
  </a>
<h2>The leaderboard'''.replace("__SCORE__", SCORE))
# AGI-type test funnel + subscribe CTA before </article>
html = html.replace(
    '  </div>\n</article>',
    '''  </div>
  <div class="cta" style="margin-top:1rem;">
    <p style="margin:0;font-weight:600;">Which forecaster do you side with? Find your AGI type.</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">A 30-second test maps you onto the timeline — bull, bear, or somewhere between.</p>
    <a href="/agi-test" onclick="gtag('event','agi_test_click',{location:'forecaster_leaderboard'});">Take the 30-second AGI test &rarr;</a>
  </div>
  <div class="cta" style="margin-top:1rem; background:var(--bg2); border:1px solid var(--border);">
    <p style="margin:0;font-weight:600;">Get the weekly AGI progress briefing</p>
    <p style="margin:6px 0 0;font-size:13px;color:var(--muted);">We tell you when a forecaster's call moves from Open toward Won or Wrong — as the Tracker shifts. Free, no hype.</p>
    <a href="https://agiscorecard.beehiiv.com/subscribe?utm_source=agiscorecard&utm_medium=deep_page" target="_blank" rel="noopener" onclick="gtag('event','subscribe_click',{location:'deep_page'});">Subscribe free &rarr;</a>
  </div>
</article>''')
html = html.replace(
    'Not affiliated with any lab</footer>',
    'Not affiliated with any lab · <a href="/about" style="color:var(--muted);">About</a> · '
    '<a href="/privacy" style="color:var(--muted);">Privacy</a> · '
    '<a href="/advertise" style="color:var(--muted);">Advertise</a></footer>')

open(f"{g.OUT}/forecaster-leaderboard.html", "w").write(html)
print("forecaster-leaderboard.html written")
