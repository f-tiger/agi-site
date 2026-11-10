# CEO decision: acquisition before more tool scope

This review applies the gstack CEO premise/reuse/challenge methodology inside the
current conversation. It is a self-review, not an independent model audit.

## Decision and counterevidence

Prioritize qualified German arrivals. Low traffic makes repeated interface and
feature changes a weak explanation of business growth. Preserve the existing
cooling guides with observed merchant intent even in winter. The humidity,
cold-cellar and laundry cluster remains a bounded seasonal hypothesis; recent
work and seasonality do not prove it deserves the whole acquisition budget.

Do not infer worsening conversion from low click totals alone. Separate complete
UTC periods, acquisition, page use, merchant clicks, Amazon items and verified
commission. Event counts are not unique visitors, sessions or orders; a merchant
click's self-referrer does not identify its original acquisition channel.

## Implemented decision-system correction

The previous daily radar used a capped raw referrer list as a whole-site AI
traffic denominator, matched AI domains by substring and called raw MCP requests
real third-party adoption. It could therefore recommend expanding tools without
verified adoption. This release reuses the existing complete-week, filtered
`affiliate_audit` channels. Its denominator includes direct and self-referrals,
retains explicit historical unknown-UA limits and rejects missing/malformed
windows. The legacy raw referrer list no longer drives this recommendation.

MCP rows remain raw requests, not customers, citations or qualified arrivals.
Neither a tiny AI percentage nor a nonempty request list triggers tool expansion.
This changes the daily report consumed by the existing planning routine, without
adding a job or altering the data collector. It does not claim more traffic.

## Ordered acquisition work

1. Use an existing authorized Search Console/GA4 connection to read German
   query/page impressions, clicks, position, indexability and landing outcomes.
   When inaccessible, record the gap; do not call missing data zero or buy a
   connector subscription automatically. Indexing status cannot be inferred
   from a robots allow rule, an HTTP200 page or an IndexNow receipt.
2. Keep the existing cooling-intent routes and the German humidity cluster.
   For each chosen page, map one question to one useful answer and one matching
   next step. Prefer verifiable comparison conditions and reproducible costs
   over larger catalogs or unsupported test rankings. Avoid repeated title edits
   before impression/position evidence establishes the problem.
3. Use the already-published owned-channel campaign as an acquisition experiment.
   Record platform reach, site arrivals, edited-input completions and merchant
   clicks separately; a lack of tagged arrivals calls for distribution review,
   not another calculator. Do not repost the same video as a substitute for
   measuring it or invent platform performance.
4. Review on 2026-11-24 using two complete weeks after this decision. If the chosen
   cluster still has fewer than 50 filtered pageview events, do not interpret a
   small completion ratio as a conversion verdict; investigate reach first.
   This is an operational sample gate, not statistical significance or a growth
   forecast. If there is use, inspect the actual failed handoff before changing it.

## GEO and release boundaries

Google's official guidance says the normal SEO foundations apply to AI Overviews
and AI Mode, with no special AI files or schema required. Search eligibility,
useful visible content, links and evidence remain prerequisites, not guarantees.
Google AI Search is included in Search Console Web reporting and is not isolated
by the referral report here:
https://developers.google.com/search/docs/appearance/ai-features

This release changes reporting and prioritization, not public HTML, canonical
URLs, product evidence or layout. Browser UI tests are not a new requirement for
the Python report; existing full CI still applies. No authored public page URL
needs IndexNow submission. The ordinary deployment retains its GA4 and live
health gates. No new spend, outreach, recurring job or country expansion.

Validation: regression fixtures cover a truncated/misleading referrer list,
missing audit, tiny samples, zero traffic, invalid dates/counts, and raw MCP
requests. A fresh production snapshot also renders the complete-week result.
Actual income remains a separate unverified business outcome.
