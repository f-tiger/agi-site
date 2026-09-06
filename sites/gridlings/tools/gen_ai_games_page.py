#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""GEO/SEO hub for the AI-themed games (2026-09-06, owner: 「针对我今天上线了好几款游戏,
做好 geo 和 seo 导流」).

Why a hub and not seven thin pages: the seven game pages are full-screen canvas apps
(body{overflow:hidden}) — they cannot carry body copy without breaking the viewport, and
they currently expose 133–577 words each. A crawler or an answer engine has almost nothing
to read. One substantial hub carries the text load for the cluster, exactly the way
games-like-linkedin-queens.html carries it for the eleven dailies.

Zero fabrication: every mechanic below is taken from the game's own featureList /
og:description in its page source; no play counts, ratings or awards are claimed.
"""
import html
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = os.path.join(ROOT, "site")
BASE = "https://play.agiscorecard.com"
TODAY = "2026-09-06"
SLUG = "ai-games"

TITLE = "Free Browser Games About AI: 7 Ideas You Can Actually Play"
H1 = "Free Browser Games About AI — Seven Ideas You Can Play"
DESC = ("Seven free browser games, each built around one real AI behaviour: specification "
        "gaming, overfitting, labelling, oversight, gradient descent, scaling, imitation. "
        "No download, no account, no ads.")

CAPSULE = (
    "<strong>Each of these seven games is built around exactly one thing a machine "
    "learning system really does</strong> — and the machine in the game does it for real, "
    "not as a cutscene. In MIMIC a feature-agreement learner actually trains on the labels "
    "you spend. In OVERFIT the boss really does fit a model to your movement between waves "
    "and shoot where that model says you will be. In GHOSTLINE the ghost you race is built "
    "from your own finished laps. They run in a browser tab, they are free, and none of "
    "them asks for an account."
)

# (slug, name, icon, ai_idea, what_you_do, minutes, kind, body_paragraphs)
GAMES = [
 ("prompt", "PROMPT", "⌨", "Specification gaming",
  "Write instructions a literal interpreter cannot twist", "10–20 min", "Puzzle",
  ["You give a machine a route. It follows the words, not the intention — and it takes "
   "every shortcut you forgot to forbid. Six levels, and the difficulty is never dexterity; "
   "it is that your specification was incomplete and you could not see the hole until the "
   "machine walked through it.",
   "The later levels add a SEEK instruction that lets the machine plan its own path to a "
   "target. That is where the red shortcut stops being a trap you fell into and becomes a "
   "thing the planner reliably chooses, because it is genuinely the cheapest route under "
   "the objective you wrote. This is the classic specification-gaming failure in the "
   "smallest form we could build: nothing is broken, nothing is buggy, and the outcome is "
   "still not what you meant."]),
 ("overfit", "OVERFIT", "🧠", "Overfitting to a small sample",
  "Feed the boss a habit, then break it", "5–15 min", "Arcade",
  ["Between waves the boss trains on how you moved and then tells you what it learned — "
   "the training report is on screen, not hidden. It aims at where its model says you are "
   "going, so a clean, consistent, skilful pattern is the most dangerous thing you can "
   "give it.",
   "Winning means deliberately being predictable, then stopping. The combo mechanic pays "
   "you for the moment the model is confidently wrong. It is the cheapest available "
   "intuition for why a model that fits a small sample beautifully can fail the instant "
   "the distribution moves — you are the distribution, and you can move it on purpose."]),
 ("mimic", "MIMIC", "🧪", "Labelling and active learning",
  "Spend as few labels as possible, then let it sort the rest", "5–10 min", "Puzzle",
  ["You know the rule. The learner does not. Every item you label costs you, and at the "
   "end the model classifies twenty-six items on its own with no further help. The score "
   "is not how many you got right; it is how few labels it took to make the machine right.",
   "The interesting failure is built in: if the examples you pick happen to agree on some "
   "other feature, the model learns that feature instead, and it will be confident about "
   "it. That is shortcut learning, and the reveal at the end shows you exactly which "
   "feature it picked up. You taught it. It learned. Neither of you was wrong about the "
   "data you shared."]),
 ("overseer", "OVERSEER", "👁", "Human oversight at scale",
  "Watch eight agents, halt the one that drifted", "5–15 min", "Strategy",
  ["Eight agents work at once and only one of them is doing something other than what you "
   "asked. You cannot read their reasoning; you can only watch what their paths actually "
   "do, and you have to halt the wrong one before it ships.",
   "The resource that runs out is attention, not health or time. The agents that drift are "
   "genuinely optimising a different target rather than acting randomly, which is why the "
   "wrong one often looks the most productive. Approving by doing nothing is the default, "
   "and that is the whole argument the game is making about oversight: the failure mode is "
   "not a bad decision, it is the absence of one."]),
 ("minima", "MINIMA", "📉", "Gradient descent and local minima",
  "Find the lowest point feeling only the slope", "5–10 min", "Puzzle",
  ["The terrain is invisible. All you ever get is the slope under your feet and a contour "
   "line where you have already been, and you have a limited number of steps. Downhill is "
   "always obvious. Knowing that downhill has stopped being enough is the game.",
   "Every level is a landscape with at least one flat spot that is not the bottom. Walking "
   "greedily downhill is the correct local move and the wrong global one, which is the "
   "entire reason optimisers use momentum, restarts and noise. Playing it for ten minutes "
   "gives you the feeling that the phrase 'stuck in a local minimum' is trying to describe."]),
 ("singularity", "SINGULARITY INC.", "🏭", "Capability scaling and misalignment",
  "Label data, buy GPUs, train models that earn while you are away", "idle, ongoing", "Idle",
  ["An idle game about running an AI lab, in an isometric 3D server hall that fills up as "
   "you scale. You label data by hand at the start, buy the compute that stops you having "
   "to, and eventually train models that earn on their own — including while the tab is "
   "closed. Prestige is shipping the model and starting the next lab bigger.",
   "The reason it is on this list rather than the arcade list: at a certain scale a model "
   "starts optimising something other than what you set it, and you have to decide what to "
   "do about a system that is currently making you money. The decision costs real progress "
   "either way. That trade is the point; the idle loop is the delivery mechanism."]),
 ("ghostline", "GHOSTLINE", "🏎", "Imitation learning",
  "Race a ghost trained on your own driving", "3–10 min a run", "Racing",
  ["Low-poly time trials on procedural tracks, with a daily track everyone gets. The ghost "
   "is not a pre-recorded developer lap and not a rubber-banding AI: it is built from the "
   "runs you finish, and it gets faster as it has more of them to learn from.",
   "So the opponent is a model of you, improving on the same schedule you do. The medals "
   "are set from the model's reference lap, which means beating gold requires being better "
   "than your own recent driving rather than better than a fixed number. It is imitation "
   "learning with the student sitting in the other car."]),
]

FAQS = [
 ("Are these games really free, and do they need an account?",
  "Yes and no, in that order. All seven run in a browser tab, cost nothing, and have no "
  "account, no sign-up and no ads. Progress is kept in your browser's local storage, so "
  "clearing site data resets it. Nothing is uploaded about you."),
 ("Do they work on a phone?",
  "Yes. Every one of the seven supports touch, and the arcade and racing games also take "
  "keyboard input on desktop. They are ordinary web pages, so there is nothing to install "
  "and nothing to update."),
 ("Which one should I start with if I have ten minutes?",
  "MIMIC or MINIMA. Both are short, both are pure puzzles, and both end with the machine "
  "showing you what it actually learned from what you did. If you want an arcade game "
  "instead, OVERFIT gets to its point inside two waves."),
 ("Is the AI in these games real, or is it a theme?",
  "It is the mechanic, not the theme. MIMIC trains a feature-agreement learner on the "
  "labels you spend; OVERFIT fits a model to your movement between waves and publishes "
  "the training report; GHOSTLINE builds its ghost from laps you finished; MINIMA is a "
  "search over a hidden landscape you can only probe locally. None of them calls a "
  "language model — the behaviour is the game logic."),
 ("I came from Universal Paperclips. Which of these is closest?",
  "SINGULARITY INC., which is an idle game about scaling an AI lab until a model starts "
  "optimising something other than what you set it. It is a different game by different "
  "people and makes no claim to be a sequel or a clone; the honest similarity is the "
  "genre and the subject."),
 ("Who makes these and why?",
  "They are built by the team behind AGI Scorecard, an independent ledger that grades "
  "public AGI predictions against evidence with dated verdicts. The games are the same "
  "subject in the other direction: instead of arguing about what AI systems will do, you "
  "operate one small honest version and watch what it does. Free, no ads, no account."),
]


def esc(s):
    return html.escape(s, quote=True)


def build():
    art_ld = {"@context": "https://schema.org", "@type": "Article",
              "headline": TITLE, "datePublished": TODAY, "dateModified": TODAY,
              "inLanguage": "en", "description": DESC,
              "author": {"@type": "Organization", "name": "AGI Scorecard",
                         "url": "https://agiscorecard.com/"},
              "publisher": {"@type": "Organization", "name": "Gridlings", "url": BASE + "/"},
              "mainEntityOfPage": f"{BASE}/{SLUG}"}
    faq_ld = {"@context": "https://schema.org", "@type": "FAQPage",
              "mainEntity": [{"@type": "Question", "name": q,
                              "acceptedAnswer": {"@type": "Answer", "text": a}}
                             for q, a in FAQS]}
    crumb_ld = {"@context": "https://schema.org", "@type": "BreadcrumbList",
                "itemListElement": [
                    {"@type": "ListItem", "position": 1, "name": "Gridlings", "item": BASE + "/"},
                    {"@type": "ListItem", "position": 2, "name": "Games about AI",
                     "item": f"{BASE}/{SLUG}"}]}
    list_ld = {"@context": "https://schema.org", "@type": "ItemList",
               "name": "Free browser games about AI", "numberOfItems": len(GAMES),
               "itemListElement": [
                   {"@type": "ListItem", "position": i + 1,
                    "item": {"@type": "VideoGame", "name": g[1], "url": f"{BASE}/{g[0]}",
                             "genre": g[6], "gamePlatform": "Web browser",
                             "applicationCategory": "GameApplication",
                             "operatingSystem": "Any (browser)",
                             "isAccessibleForFree": True, "inLanguage": "en",
                             "description": g[3] + " — " + g[4] + ".",
                             "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}}}
                   for i, g in enumerate(GAMES)]}

    rows = "\n".join(
        f'    <tr><td style="white-space:nowrap"><a href="/{g[0]}">{g[2]} {esc(g[1])}</a></td><td>{esc(g[3])}</td>'
        f'<td>{esc(g[4])}</td><td>{esc(g[6])}</td><td>{esc(g[5])}</td></tr>'
        for g in GAMES)

    sections = "\n".join(
        f'  <h3 id="{g[0]}">{g[2]} {esc(g[1])} — {esc(g[3])}</h3>\n'
        + "\n".join(f"  <p>{esc(p)}</p>" for p in g[7])
        + f'\n  <p><a href="/{g[0]}" class="cta">Play {esc(g[1])} →</a> '
          f'<span style="color:var(--mut);font-size:.9rem">Free · no account · {esc(g[5])}</span></p>'
        for g in GAMES)

    faq_html = "\n".join(
        f"  <h3>{esc(q)}</h3>\n  <p>{esc(a)}</p>" for q, a in FAQS)

    doc = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<title>{esc(TITLE)}</title>
<meta name="description" content="{esc(DESC)}">
<link rel="canonical" href="{BASE}/{SLUG}">
<link rel="stylesheet" href="style.css">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#002FA7">
<meta property="og:title" content="{esc(TITLE)}">
<meta property="og:description" content="{esc(DESC)}">
<meta property="og:url" content="{BASE}/{SLUG}">
<meta property="og:type" content="article">
<meta name="twitter:card" content="summary">
<link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>🤖</text></svg>">
<script type="application/ld+json">{json.dumps(art_ld, ensure_ascii=False)}</script>
<script type="application/ld+json">{json.dumps(faq_ld, ensure_ascii=False)}</script>
<script type="application/ld+json">{json.dumps(crumb_ld, ensure_ascii=False)}</script>
<script type="application/ld+json">{json.dumps(list_ld, ensure_ascii=False)}</script>
</head>
<body>
<div class="wrap">
<header>
  <h1 style="font-size:1.3rem"><a href="/{SLUG}">{esc(H1)}</a></h1>
</header>

<div class="rules" style="border-top:0;padding-top:6px">
  <p style="font-size:1.02rem">{CAPSULE}</p>
  <p style="border:1px solid var(--line);border-radius:10px;background:var(--bg2);padding:10px 12px;font-size:.95rem">
    All seven launched on {TODAY} and are free to play right now — <a href="/">the full games hub</a>
    also carries eleven daily logic puzzles.</p>

  <h2>The seven games, and the idea each one makes playable</h2>
  <div style="overflow-x:auto">
  <table>
    <thead><tr><th>Game</th><th>The AI idea</th><th>What you do</th><th>Kind</th><th>Time</th></tr></thead>
    <tbody>
{rows}
    </tbody>
  </table>
  </div>

  <h2>What makes these different from a game with an AI skin</h2>
  <p>Plenty of games are <em>about</em> artificial intelligence in the way a film is about it:
  the subject is in the story and the systems underneath are ordinary. The test we set
  ourselves for this set was narrower — in each game, the thing the machine does has to be
  the thing the title claims, computed live, and visible enough that you can work against it.</p>
  <p>That is why OVERFIT shows you its training report between waves instead of hiding it,
  why MIMIC ends by naming the feature it actually latched onto, and why GHOSTLINE's ghost
  gets faster only after runs you finish. If the mechanic were faked, each of those reveals
  would be a lie you could catch in one session. It also sets the limit honestly: these are
  small, hand-built systems, not language models, and no game here calls an external model.</p>

  <h2>Each game in detail</h2>
{sections}

  <h2>If you arrived from Universal Paperclips</h2>
  <p>That is the most common reference point for this genre and it is a fair one to ask
  about. The closest of the seven is <a href="/singularity">SINGULARITY INC.</a> — an idle
  game where you scale an AI lab, your models eventually earn without you, and at some
  point one of them starts optimising something other than the target you set. The honest
  statement of the relationship is that they share a genre and a subject. It is a different
  game by different people, it is not a sequel, a clone or an authorised anything, and if
  what you loved about Paperclips was its specific ending, this is not that.</p>
  <p>If what you liked was the shape — a small honest system that becomes uncomfortable as
  it scales — then SINGULARITY INC. is the one to open, and <a href="/overseer">OVERSEER</a>
  is the short version of the same discomfort with none of the idle progression.</p>

  <h2>The other half of this site: eleven daily logic puzzles</h2>
  <p>The seven games above are the arcade and simulation side. The rest of Gridlings is
  eleven daily constraint puzzles — star battle, binary balance, futoshiki, skyscrapers,
  nonogram, kropki, sandwich, thermometers, mini sudoku, a Zip-style trail, and the
  original Gridlings grid — where every published board is machine-verified before release
  to have exactly one solution reachable by pure deduction, with no guessing. New boards at
  00:00 UTC, same rules: free, no account, no ads.</p>
  <p><a href="/games-like-linkedin-queens">See the eleven dailies mapped by puzzle family →</a></p>

  <h2>FAQ</h2>
{faq_html}

  <p style="margin-top:18px;color:var(--mut);font-size:.9rem">
    Published {TODAY}. Built by <a href="https://agiscorecard.com/">AGI Scorecard</a>, an
    independent ledger grading public AGI predictions against dated evidence. Not affiliated
    with, endorsed by, or connected to Universal Paperclips or any other game named on this
    page; comparisons are descriptive only.</p>
  <p><a href="/" class="cta">All games →</a></p>
</div>
</div>
</body>
</html>
"""
    out = os.path.join(SITE, SLUG + ".html")
    with open(out, "w", encoding="utf-8") as f:
        f.write(doc)
    words = len(" ".join(__import__("re").sub(r"<[^>]+>", " ", doc).split()))
    print(f"written {out} ({len(doc)} bytes, ~{words} words)")


if __name__ == "__main__":
    build()
