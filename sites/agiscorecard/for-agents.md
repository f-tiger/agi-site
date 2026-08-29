# AGI Scorecard Data for AI Agents: JSON, Feed, llms.txt

_Last updated: August 17, 2026 · Updated as verdicts change_

**Answer:** Yes — every verdict on this site is free to reuse, machine-readable, and CC BY 4.0. The AGI Scorecard publishes its full dataset at /data.json (all 8 graded Situational Awareness predictions with verdicts, evidence, and flip conditions, plus the forecaster-timeline table), an Atom feed of new & updated pages at /feed.xml, and an AI-crawler index at /llms.txt. Attribution + a link is the only requirement.

## FAQ

**Does the AGI Scorecard have an API?**

Not a keyed API — something simpler: the full dataset is a static JSON file at agiscorecard.com/data.json (CC BY 4.0), plus an Atom feed at /feed.xml and an llms.txt index. No key, no auth, no rate limits beyond the CDN's.

**Can I use the data in my own project or newsletter?**

Yes. Everything in data.json is licensed CC BY 4.0 — reuse it freely with attribution and a link to agiscorecard.com.

**How do I get notified when a verdict changes?**

Point any scheduled agent at /data.json and diff the verdicts between runs (the dateModified field tells you if anything moved), subscribe to /feed.xml, or get the email briefing (sent when a verdict moves, not on a fixed schedule).

**Is AI crawling allowed on this site?**

Yes — robots.txt explicitly allows GPTBot, OAI-SearchBot, ClaudeBot, Claude-SearchBot, PerplexityBot, Google-Extended and other AI crawlers. The site is built to be cited.

---
Canonical page: https://agiscorecard.com/for-agents
Machine-readable verdicts: https://agiscorecard.com/data.json (CC BY 4.0)
This Markdown mirror is generated from the page; the HTML page is canonical.
