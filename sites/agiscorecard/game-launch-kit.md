# Game launch kit — /future-bet distribution (robots-disallowed working file)

Goal: seed the first distribution nodes for **The Future Bet** (`/future-bet`) so
it spreads without depending on Reddit (which auto-removes new-domain link posts).
Game URL: `https://agiscorecard.com/future-bet`
Embed URL: `https://agiscorecard.com/future-bet?embed=1`
Everything below is copy-paste ready. Owner action ≈ 30–45 min total.

## The one rule that prevents bans everywhere
Never post a bare link. Lead with a **hook + your own result grid**, put the link
second. Pure-link drops are what spam filters kill — on every platform, not just
Reddit. Post as a human sharing something they made, reply to comments, done.

Measurement: every off-site click already carries UTM or shows as referral in
GA4. Watch GA4 → referral sources for `news.ycombinator.com`, `bsky.app`,
`mastodon.*`, `x.com`/`t.co`, `lesswrong.com`, `manifold.markets`, and events
`x_share` / `challenge_share` / `subscribe_click{future_bet}` / `embed_copy`.

---

## 1) Hacker News — "Show HN"  ⚠ WARM-UP FIRST (medium-term, not day 1)
As of 2026 HN temporarily restricts Show HN from new/unfamiliar accounts ("Update re
Show HNs"). A brand-new account cannot reliably post one. Path:
- WARM-UP (1–2 weeks): create account at https://news.ycombinator.com, then genuinely
  comment on 5–7 stories you actually have something to say about; get to ~25+ karma.
  No self-promo during warm-up.
- THEN post the Show HN (submit → title below → url → submit → immediately add the
  first comment; reply to every comment for 2–3h; never ask for upvotes; post Tue–Thu
  08:00–10:00 ET = 20:00–22:00 Beijing; one shot only).
- Title: `Show HN: The Future Bet – bet YES/NO on 12 predictions, see which forecaster you are`
- URL: `https://agiscorecard.com/future-bet`
- First comment: I built agiscorecard.com, a scorecard that grades Aschenbrenner's "AGI by 2027" predictions against real evidence. This is its front door: a 60-second game — tap YES/NO on 12 bold cross-domain predictions (AGI, humanoid robots, Mars, fusion, alien life…). It matches you to the real forecaster your bets are closest to (Musk 2026 → academic survey 2047) and gives you a shareable grid. Pure front-end, no sign-up, iframe-embeddable. Curious what mix of bold/skeptic HN lands on.

## 1b) Product Hunt — launch-day spike (replaces HN for now)
Why: purpose-built for launching a new tool; new makers can launch free; no HN-style
account gate. Honest caveat: a warm pre-audience (500–1k followers) predicts top
ranking — cold launches still get traffic but rarely Product of the Day.
Steps:
1. https://www.producthunt.com → sign up → complete the maker profile (real photo, bio).
   Ideally do this a couple weeks early and comment on a few launches first.
2. Top-right **Submit** → **New Product** → paste `https://agiscorecard.com/future-bet`.
3. Fill: tagline ("Bet YES/NO on 12 bold predictions — see which forecaster you are"),
   an icon + 2–3 gallery images (use the persona share cards from /share/future-*.png),
   category (Games / AI). Schedule for a **Tue–Thu**.
4. Launch = **12:01am Pacific** on the day. Immediately post the maker comment (what it
   is, who it's for, why you built it, what you want feedback on).
5. All day: reply to every comment. **Never say "please upvote"** (gets you unfeatured) —
   "check it out / honest feedback" is fine.

## 2) Bluesky — ★ best for repeatable, unbannable spread
Why: decentralized, no central moderator deleting your posts; big AI/tech
migration. You can post daily with zero removal risk.
Steps:
1. Sign up at https://bsky.app (free, ~2 min).
2. New post. Paste (attach a screenshot of your result screen for the card preview):
   > My bets make me 🚀 Elon Musk — I said 8/12 bold futures happen on time.
   > ✅⬜✅✅⬜✅✅⬜✅✅⬜✅
   > AGI by 2030? Mars by 2035? Fusion by 2040? Place your bets 👇
   > https://agiscorecard.com/future-bet
   > #AI #AGI #Futurism
3. Repeat every 1–2 days with a different result/hook. Reply to anyone who plays.
Tip: follow + reply under AI-forecasting accounts first so your post has reach.

## 3) Mastodon (fediverse) — ★ same logic as Bluesky, different network
Why: decentralized = unbannable; strong tech/AI instances.
Steps:
1. Join an instance — https://mastodon.social or a tech one like https://sigmoid.social (AI-focused). ~3 min.
2. Post the same block as Bluesky (hashtags matter more here for discovery):
   > My future bets put me closest to 🚀 Elon Musk (8/12).
   > ✅⬜✅✅⬜✅✅⬜✅✅⬜✅
   > A 60-sec game: bet YES/NO on 12 bold predictions (AGI, Mars, fusion…). No sign-up.
   > https://agiscorecard.com/future-bet
   > #AI #AGI #MachineLearning #Futurism
3. Boost it from any other instance account you have; ask nothing.

## 4) X / Twitter — ★ the built-in share loop
Why: the game's share buttons already post here (`x_share` event). Highest raw virality for a result grid.
Steps:
1. Post from your account:
   > Made a game: bet YES/NO on 12 bold predictions about the next 15 years.
   > My bets put me closest to 🚀 Elon Musk — 8/12.
   > ✅⬜✅✅⬜✅✅⬜✅✅⬜✅
   > What's your Future Bet? 👇
   > https://agiscorecard.com/future-bet
2. Pin it for launch week. Quote-tweet AI-timeline threads with your grid + link.
3. Reply (don't just broadcast) under big AI accounts posting about AGI timelines.

## 5) LessWrong — ★ perfect-fit BUT rejects AI-written copy
⚠ IMPORTANT: LessWrong runs an automated LLM-detector and AUTO-REJECTS posts/comments
it thinks were written or edited by an LLM (especially a new user's first post). The
ready-made copy below WILL be rejected if pasted as-is. Two options: (a) skip LW and use
the same copy on X/Bluesky/Jike/V2EX (they don't do this); or (b) YOU write it in your
own words (LW allows using AI briefly like a search engine, NOT writing/editing) — use
these facts only and phrase them yourself: prediction game, 12 YES/NO future bets, maps
you to the real forecaster spread (Musk~2026→survey 2047), AGI item ties to the live
AGI-2027 tracker (62.5/100), ask how LW's distribution differs from the public's, link
https://agiscorecard.com/future-bet . Do NOT file for reconsideration claiming you wrote
it if you did not — criterion 1 must be truthfully true.
Why: the AGI-timeline crowd literally lives here; they won't spam-ban a genuine
forecasting tool. Smaller volume, but the exact readers your newsletter wants.
Steps:
1. Sign in at https://www.lesswrong.com (Google/email).
2. Use a QUICK TAKE (shortform), not a full front-page essay — lower bar, appears instantly, no "low-effort link" risk. Homepage "Quick Takes" box, or your username → New Quick Take. Paste (LW-native tone — substance + honesty + invites discussion):
   > I built a small forecasting game and I'm curious how the LW distribution differs from the public's. It's 12 YES/NO bets on bold near-future claims — AGI, humanoid robots, BCIs, fusion, Mars, alien life — and it maps your answers onto the real public forecaster spread (Musk ~2026 → Aschenbrenner 2027 → Hassabis ~2030 → Metaculus ~2033 → the 2,778-person academic survey ~2047). The AGI item ties into a live "AGI-2027" tracker I maintain that grades Aschenbrenner's Situational Awareness predictions against evidence (currently 62.5/100). No sign-up. I'd genuinely like to know where LWers land versus the public — I'd expect this crowd to be less swayed by the framing. https://agiscorecard.com/future-bet
3. Engage seriously with replies (this crowd rewards substance over hype).

## 6) Manifold Markets — ★ prediction-native community
Why: it's a prediction-market community — a prediction game is dead-on-topic and welcome.
Steps:
1. Sign in at https://manifold.markets.
2. Two options (do the comment one first, it's lower-friction):
   a. Post in their community/Discord feed: same short pitch as LessWrong + link.
   b. Create a market like "Will most Manifold users score 7+/12 as 'bold' on The Future Bet?" and link the game in the description.
3. Reply to players; forecasters love comparing calibration.

## 7) Bonus — embed nodes (the compounding channel)
The game is iframe-embeddable. Every embed = a permanent backlink + traffic node.
- Grab the snippet from the game page (📋 "Put this game on your site") — it uses `?embed=1` and `utm_source=game_embed`.
- Place it on any blog/site you or a friend controls; offer it to any AI newsletter/blog that covers timelines.

## Suggested run of show (revised — HN is now warm-up-first)
NOW (ungated, reward the content not the account age — do these first):
1. Day 1: LessWrong shortform (best-fit audience) + X + Bluesky, each with your result grid.
2. Day 1–2: 即刻 + V2EX (domestic, native language) + Manifold + Mastodon.
3. Ongoing: 1 X/Bluesky result post every 1–2 days; pitch 1 embed placement/week.
IN PARALLEL, warming up for the bigger spikes:
4. Create the HN account today and comment genuinely a few times a week → ~25+ karma → THEN Show HN (~1–2 weeks out).
5. Set up the Product Hunt maker profile; schedule a Tue–Thu launch once you have a little audience from steps 1–2.

---

## Chinese / domestic channels (copy-paste, added 2026-07-21)
Owner is CN-based; these are lower-friction than the English platforms and the AI
crowd on 即刻/V2EX reads English fine (the game is English). Same anti-ban rule:
lead with the hook + your result, link second. Game: https://agiscorecard.com/future-bet

### 即刻 (Jike) — AI/tech crowd, low friction, best first test
做了个小游戏🎲 给未来 15 年的 12 个大胆预言投 YES/NO——AGI、人形机器人、登陆火星、可控核聚变、外星生命……
玩完告诉你「你最像哪个预测者」，我押出来是 🚀 马斯克。
✅⬜✅✅⬜✅✅⬜✅✅⬜✅
你敢押几个成真？👉 agiscorecard.com/future-bet

### V2EX — node「分享创造」(/go/create)
标题：[分享创造] 做了个「押注未来」的小游戏，测你是乐观派还是怀疑派
正文：
纯前端小游戏，无需注册：对 12 个大胆的未来预言投 YES/NO（AGI、机器人、火星、核聚变、外星生命…），
玩完把你映射到最接近的真实预测者（马斯克 2026 / Aschenbrenner 2027 / Hassabis 2030 / Metaculus 2033 / 学术调查 2047）。
AGI 那题用的是真实公开预测数据，接到我做的 AGI-2027 追踪指数。可以 iframe 嵌到自己站里。
地址：https://agiscorecard.com/future-bet 想听听大家会押几个 YES。

### 小红书 (Xiaohongshu) — 视觉/钩子风
标题：测测你是AI乐观派还是怀疑派🔮（附结果图）
正文：
发现一个超上头的小游戏🎲 给未来12个大胆预言投票：AGI会来吗？人类2035登火星？核聚变发电？外星生命？
玩完直接告诉你「你最像哪个AI预言家」——我居然被测成🚀马斯克本人😂
✅⬜✅✅⬜✅✅⬜✅✅⬜✅
60秒无需注册，姐妹们来测！评论区报你的结果👇（游戏 The Future Bet，主页链接进）
#AI #未来预测 #小游戏 #AGI #人格测试

### 微信朋友圈 / 群
做了个小游戏🎲 押注未来15年会发生什么——AGI、火星、机器人、核聚变…
玩完测出你最像哪个预言家，我是🚀马斯克派。你敢押几个成真？（agiscorecard.com/future-bet）

### Note: a zh version of the game (/zh/future-bet) would cut friction on 小红书/微信 —
build it if domestic channels show traction (GA4 referral from jike/v2ex/xiaohongshu).

---

## Prediction-market ecosystem — distribution targets (mapped 2026-07-26)
Owner supplied an X directory of the Polymarket ecosystem. It splits into four groups,
and three of them are reachable distribution — none of them do what we do (grading AGI
claims against evidence), so we are a complementary vertical source, not a competitor.

**Why this matters:** these accounts and tools consume prediction-market data daily and
have no AGI evidence layer. We already publish exactly that, free and machine-readable:
`/data.json` (CC BY 4.0), `/index-history.json`, `/feed.xml`, `/llms.txt`, and now a
dedicated section for them at `/for-agents` ("For prediction-market agents and monitors").

### A. AI trading agents — the biggest opening (they need structured signals)
@datalayerxyz · @aixbet_ai · @polytraderai · @trypolyagent · @fractionai_xyz ·
@predictionswap · @polyprophet_com · @polybroapp · @polymaster · @polytaleai
**DM copy — four variants, each under 280 characters.** Do NOT send the same text to all
ten; pick the variant that matches what the account actually does. Lead with the data,
never with a request. No "would love to partner", no calendar link.

**V1 — general (default):**
> Building an agent that touches AGI markets? We publish the evidence layer underneath
> them: 8 graded predictions with pre-registered flip conditions + a 0-100 tracker. Free,
> CC BY, machine-readable — agiscorecard.com/data.json. Integration snippet at /for-agents

**V2 — for model/probability agents** (@polytraderai, @polyprophet_com, @aixbet_ai):
> If you're modelling AGI questions, you may want the evidence series: /index-history.json
> is a time series of a 0-100 composite over 8 graded AGI predictions, updated only when a
> verdict actually changes. Free + CC BY: agiscorecard.com/for-agents

**V3 — for research/signal agents** (@polybroapp, @polymaster, @polytaleai, @datalayerxyz):
> Every AGI prediction we grade carries a pre-registered flip condition — published before
> the fact, so it works as a watchlist rather than a post-hoc story. All 8 in one JSON,
> free and CC BY: agiscorecard.com/data.json

**V4 — for autonomous agents** (@trypolyagent, @fractionai_xyz, @predictionswap):
> Paste-ready for your agent: fetch agiscorecard.com/data.json, report the thesisTracker
> score and any verdict that changed since last run. That's AGI evidence movement, free,
> no key, no rate limit. Details: agiscorecard.com/for-agents

**If they reply asking what it costs / what you want:** "Nothing — it's CC BY, we just ask
for a link back. We're the evidence layer, not a market." That answer is the whole pitch.

### B. Prediction-market media — content-hungry, easiest yes
@prophet_notes (weekly summary) · @polymarketinfo (news aggregation) ·
@predictionnews_ (global PM media) · @polynoob (community wiki)
**Angle — give them a story, not a link.** The strongest one right now:
> Musk's end-2026 AGI call has ~5 months left — the earliest expiry of any public AGI
> prediction. We keep a live countdown on every dated call: agiscorecard.com/prediction-receipts
Offer the receipts page as a recurring segment ("this week's expiring calls").

### C. Monitoring / alerts — natural data consumers
@hashdive · @polyscopebot · @NevuaMarkets · @polyfactual
**Angle:** a verdict change on our tracker is an event worth alerting on, and `/feed.xml`
plus `dateModified` in `/data.json` make it trivial to watch.

### D. Trading bots (@fliprbot, @bankrbot, @polymtrade …) — SKIP
Execution tools; no content or data need. Not a fit, and adjacency to trade execution is
exactly the association this site should avoid.

**Rules:** we take no fees, join no affiliate program, and never present the Tracker as a
probability or a trading signal — that framing is what makes us citable rather than just
another PM tool. Lead with the data, not with a request.
