# The AGI Scorecard

**[agiscorecard.com](https://agiscorecard.com)** — an independent scorecard grading every major prediction from Leopold Aschenbrenner's 2024 essay *Situational Awareness* against real-world evidence, with a pre-registered condition that would flip each verdict.

[![AGI-2027 Thesis Tracker](https://agiscorecard.com/badge/thesis-tracker.svg)](https://agiscorecard.com/progress-index)
[![AGI by 2027](https://agiscorecard.com/badge/agi-2027.svg)](https://agiscorecard.com/will-agi-arrive-2027)
[![Situational Awareness scorecard](https://agiscorecard.com/badge/scorecard.svg)](https://agiscorecard.com/)

Two years in (mid-2026): **3 predictions on track, 1 wrong, 2 open, 2 too early.** The headline "AGI by 2027" claim resolves by **January 1, 2028**.

## The differentiator: one auditable number

Most AGI trackers give you a vibe or a wall of takes. This one distills the whole bet into a single **[AGI-2027 Thesis Tracker](https://agiscorecard.com/progress-index)** score (currently **62.5/100**) — a transparent mean of the 8 graded verdicts that moves *only* when evidence changes, with a public formula and history. No competitor publishes one trackable index of the 2027 bet.

## Free, machine-readable data (CC BY 4.0)

Built to be cited and reused — no API key, no auth:

| Endpoint | What it is |
|---|---|
| **[/data.json](https://agiscorecard.com/data.json)** | All 8 graded predictions (verdict, evidence, primary sources, flip conditions) + the Thesis Tracker score. CC BY 4.0. |
| **[/index-history.json](https://agiscorecard.com/index-history.json)** | Thesis Tracker score time series. |
| **[/feed.xml](https://agiscorecard.com/feed.xml)** | Atom feed of new & updated pages. |
| **[/llms.txt](https://agiscorecard.com/llms.txt)** | Curated page index for LLMs. |
| **[/for-agents](https://agiscorecard.com/for-agents)** | Docs for plugging the data into any agent or digest. |

### Add it to your AI agent (one command)

```bash
mkdir -p ~/.claude/skills/agi-scorecard && curl -fsSL -o ~/.claude/skills/agi-scorecard/SKILL.md https://agiscorecard.com/skill.md
```

Your agent then answers AGI-timeline questions from live data and can alert you when a verdict flips. Docs: **[/skill](https://agiscorecard.com/skill)**.

### Embed a live verdict badge

Drop the current state of the AGI bet into any README — the badges above auto-update when a verdict changes. Copy-paste markdown at **[/badge](https://agiscorecard.com/badge)**.

## Languages

Full coverage in English + Chinese (`/cn`, `/zh/*`), with core pages also in Spanish, Japanese, Portuguese, German, French, Korean, and Italian.

## Development

Static site, no build step. Regenerate derived files and validate before shipping:

```bash
python3 tools/gen_feed.py     # rebuild feed.xml
python3 tools/gen_badges.py   # rebuild /badge/*.svg from data.json
python3 tools/gen_index.py    # recompute the Thesis Tracker + /progress-index
python3 tools/validate.py     # must print OK (JSON-LD, links, sitemap, FAQ parity)
```

## Deployment

Pushing to `main` **auto-deploys to Cloudflare**. Extension-less clean URLs (e.g. `/was-aschenbrenner-right`, `/cn`, `/progress-index`) map from the corresponding `.html` files.

## License

Content and dataset: **CC BY 4.0** — reuse and remix freely with attribution and a link to [agiscorecard.com](https://agiscorecard.com). Not affiliated with any AI lab.
