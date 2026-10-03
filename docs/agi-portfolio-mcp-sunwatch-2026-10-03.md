# Portfolio MCP and SunWatch delivery — release evidence

2026-10-03. Owner request:「可以变成工具或mcp，然后接入到我的sunwatch的tg机器人提醒」。Scope and adversarial self-checks are recorded in the tracker implementation note and SunWatch PROMPTS.md.

- Public tool: `get_portfolio_returns` at `https://agiscorecard.com/mcp`; optional `include_history: true`.
- Same read model: `https://agiscorecard.com/api/portfolio`, optional `?history=1`.
- Existing official registry entry verified: `com.agiscorecard/agi-scorecard`, remote `https://agiscorecard.com/mcp`. No duplicate server registration. Mirror documentation updated at commit `5badd22785a306c853ac8e7532f70549481ec298`.
- AGI changes: `f595010207c8e26e06b8e8aedc9f7b1702495652` plus dynamic-route check `d4fbf49ced928e59bc489f7a4304dbd593aff78a`; preserved subsequent concurrent main changes.
- SunWatch release: `181ca49b9b8bb9a46faa7aba5cfffe49ca572d81`, active branch `claude/sun-yuchen-investment-research-yzz9mx`. SQLite Durable Object deployed, existing cron retained. Only configured owner channel receives these notices. Credentials were never copied to AGI or mirror repositories.

## Live evidence

Public HTTP and MCP agreed on cohort `social-basket-2026-10-02-close`, entry/as-of `2026-10-02`, twelve stock rows and three benchmark rows. This is the initial close baseline: cumulative returns are 0%, not observed outperformance.

First owner Telegram acknowledgement: **2026-10-03T07:48:57.586Z**. Its message ID is stored in private durable state, omitted here. Immediate repeated check returned `sent: 0`, `reason: unchanged`. Owner commands: `/portfolio`, `/portfolio_pause`, `/portfolio_resume`; verified webhook secret, private chat and configured owner ID required. No subscriber broadcast or trading instruction.

SunWatch workflow **37107489038**, latest job **111159159349**, completed successfully after AGI API publication. First attempt deployed SunWatch but stopped at the upstream API check while AGI was still publishing; rerun inspected the existing successful Telegram receipt and did not send a deployment message.

AGI workflow **37107273888** deployed current main and passed portfolio arithmetic/API tests and EN/ZH browser flows. A separate, concurrent fleet analytics change failed its post-deploy assertion (`Analytics frame must exclude injected third-party beacons`). This is not recorded as an entirely green AGI pipeline. The portfolio endpoints and actual SunWatch delivery were verified independently after deployment. Earlier builds correctly stopped at the missing dynamic-route declaration and at the main-branch movement guard; neither overwrote the live site.

IndexNow submitted only changed canonical `/for-agents`: HTTP **200**, **2026-10-03T07:50:59.388Z**. Receipt means accepted submission; indexing and AI citation impact remain unknown. No new scheduled submission or recurring ChatGPT task was created.

## Operating behavior and limits

Existing 30-minute checks send the first baseline, each new complete close record, and genuine same-date financial corrections. Fetch timestamp changes are silent. Invalid, incomplete, expired or rolled-back inputs cannot fabricate a 0% result. A source incident gets a 25-minute grace, one warning and one recovery notice. Confirmed Telegram message receipt precedes durable acknowledgement. A crash between external acknowledgement and persistence can still duplicate; this is not an exactly-once guarantee.

Free public API/tool access and owner-only notifications are verified. No public paid-alert subscription was enabled, and no new subscriptions, verified revenue or growth uplift are claimed. Existing paid research-record storage is unchanged.

Technical references: https://core.telegram.org/bots/api#sendmessage ; https://developers.cloudflare.com/durable-objects/api/state/ ; https://modelcontextprotocol.io/specification/2025-11-25/server/tools .
