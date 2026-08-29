# Add a Live AGI Tracker to Your AI Agent (One Command)

_Last updated: July 11, 2026 · Updated as verdicts change_

**Answer:** Yes — one command adds a live AGI-progress checker to your agent. The agi-scorecard skill teaches Claude Code (or any SKILL.md-compatible agent) to fetch this site’s graded Situational Awareness verdicts from /data.json, answer AGI-timeline questions from live data, and alert you when a verdict flips. No API key — the dataset is a static CC BY 4.0 file on a CDN.

## FAQ

**How do I add the AGI Scorecard to Claude Code?**

Run one command: mkdir -p ~/.claude/skills/agi-scorecard && curl -fsSL -o ~/.claude/skills/agi-scorecard/SKILL.md https://agiscorecard.com/skill.md — then ask your agent about AGI progress or type /agi.

**Does the skill need an API key?**

No. It reads the site's static data.json file (CC BY 4.0) — no key, no auth, no rate-limit dance. Telegram/email delivery, if you want it, uses whatever your own agent platform provides.

**How do verdict-change alerts work?**

The skill keeps the last copy of data.json locally and diffs the verdicts on each run. When a prediction flips (say Open → On track), it reports one line with the change; when nothing moved, it stays silent.

**Which agents does it work with?**

Any agent that loads SKILL.md-style skills — Claude Code natively, and OpenClaw or similar via their skills folder. Any tool that can fetch a URL can use the underlying /data.json directly.

---
Canonical page: https://agiscorecard.com/skill
Machine-readable verdicts: https://agiscorecard.com/data.json (CC BY 4.0)
This Markdown mirror is generated from the page; the HTML page is canonical.
