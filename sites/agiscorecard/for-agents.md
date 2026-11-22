# AGI Scorecard Data for AI Agents: JSON, Feed, llms.txt

_Last updated: October 1, 2026 · Updated as verdicts change_

**Answer:** Yes — every verdict on this site is free to reuse, machine-readable, and CC BY 4.0. The AGI Scorecard publishes its full dataset at /data.json (all 8 graded Situational Awareness predictions with verdicts, evidence, sources and, for each, a written flip condition, a resolution date, a watch item or the stated blocker, plus the forecaster-timeline table), an Atom feed of new & updated pages at /feed.xml, and an AI-crawler index at /llms.txt. Attribution + a link is the only requirement.

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

## Native MCP

Agents that speak the Model Context Protocol can skip fetching files entirely: https://agiscorecard.com/mcp is a Streamable-HTTP MCP endpoint (POST JSON-RPC, no auth, free tier) exposing nine read-only tools: get_portfolio_returns (dated twelve-stock returns versus SPY, QQQ and TQQQ; October 2 close baseline; source freshness and optional daily history), get_thesis_tracker (score + full history), get_verdicts (all 8 predictions with evidence, sources and — where one is written — the flip condition, plus independent_grades: how independent public graders scored the same predictions, quoted verbatim), get_agi_consensus (the cross-venue AGI consensus board: Polymarket, Kalshi, Manifold, Metaculus on "AGI before year Y", median, spread, recompute formula), get_invest_positions (the Invest dataset), get_claim_ledger (the AI Gold Rush ledger of graded money claims — and a validator/reader for any site's /claimledger.json per the Claim Ledger Protocol), get_sunwatch_track_record (the SunWatch market-call ledger — editorial market judgments with outcome labels and an evidence audit; not a verified prospective trading-return record), search_mcp_catalog (search the public MCP directory by task and connection type), and search_site (every page on this site and its invest/compass sub-sites). The server is listed in the official MCP Registry (https://registry.modelcontextprotocol.io/v0/servers?search=agiscorecard) as com.agiscorecard/agi-scorecard. Add it to Claude Code with:

Explore the MCP directory (https://agiscorecard.com/agents/) or read its JSON snapshot (https://agiscorecard.com/mcp-directory-assets/catalog.json). Catalog search returns publisher links and the scope of verification. Use those links to connect to the publisher directly.
