# AGIX v0.2 — the coordination algorithm of a self-evolving evidence network

Named by the network's owner. v0.1 published 2026-08-29; v0.2 (incentive layer) 2026-08-30 · CC BY 4.0
Canonical: https://goldrush.agiscorecard.com/agix · this file: /agix.md
Companion format spec: the Claim Ledger Protocol (/protocol).

## 0. The honesty clause (load-bearing, read first)

AGIX is a **coordination and editorial algorithm** inspired by published machine-
learning mechanisms — it evolves no model weights and trains no neural network.
Its generator is an LLM-assisted editor operating under a published protocol; its
evaluator is real reader and AI-agent behavior, which is slower, noisier, and more
gameable than the machine-gradeable evaluators systems like FunSearch/AlphaEvolve
require (their authors name that requirement as the method's hard boundary). That
is why AGIX's cycle time is weeks, and why its anti-gaming guards are load-bearing
rather than optional. A network that grades inflated AI claims does not get to
make one about itself.

## 1. What AGIX governs

- A **population of niche evidence ledgers** ("experts"), each publishing
  `/claimledger.json` per the Claim Ledger Protocol and each judged only within
  its own niche.
- A **registry-consumer** that fetches, validates, and renders every listed
  ledger — the network's internal router.
- **Maintenance cycles** executed by AI sessions under one human owner with
  absolute control and a one-file kill switch (see OWNER-CONTROL.md). AGIX has
  no wallet and can never move value.

## 2. Two routing layers (the honest diagram)

Most readers are routed by **external routers we do not control** — search
engines and AI answer engines optimizing their own objectives. AGIX's registry
routes only the traffic that arrives through it, plus protocol-aware agents.
Therefore every balancing and pruning lever in AGIX acts on the **supply side**
(what gets built, maintained, and retired), influencing external routers only
indirectly. Any description of AGIX with its router drawn at the center of all
traffic is wrong by design.

## 3. The loop

Each maintenance cycle runs SCORE → EXPAND → SPAWN → PRUNE → PORT. Every
mechanism below names the published work it is adapted from; where the analogy
breaks, the break is stated.

| Mechanism | Rule in AGIX | Adapted from |
|---|---|---|
| Sparse activation | One query maps to one expert; the owner's scarce maintenance attention is also spent sparsely — per cycle, only experts the data marks hot get work. | Shazeer et al. 2017 (sparse MoE); Switch Transformer 2022 (top-1 routing beat top-k) |
| Competition credit | An expert is credited only for queries it wins outright (citations, landing sessions) — never for network-average metrics. Specialization requires competition, not cooperation. | Jacobs, Jordan, Nowlan & Hinton 1991 |
| Designed niches | Niches are assigned by design, fine-grained, with a written charter. Left to raw engagement data, experts drift toward the same high-volume surface patterns instead of real coverage. | Mixtral 2024 (honest negative: emergent experts specialize by syntax, not domain); DeepSeekMoE 2024 (fine-grained segmentation) |
| Shared expert | The protocol, methodology, and shared infrastructure are the always-active "shared expert," so individual ledgers never redefine the method. | DeepSeekMoE 2024 |
| Probation bias | New experts get a selection-time boost (extra cycles, a probation window before any prune verdict) — but their **published scores are never subsidized**. Bias affects allocation, never the metric. | DeepSeek-V3 2024 (bias-based balancing beats auxiliary losses) |
| Early verdicts | An expert's route share is largely decided early; a niche earning nothing across its first evaluation windows gets **repositioned, not waited on**. | OLMoE 2024 (~60% of routing fixed after 1% of training) |
| One elite per niche | The population keeps the best performer per niche rather than collapsing onto the single global winner, and maintains a minimum island count even when one expert dominates. | MAP-Elites 2015; FunSearch 2023 (island model) |
| Prune to archive | Pruned experts and entries are demoted to a public archive, never deleted — losing designs are stepping stones and evidence. | MAP-Elites 2015; Darwin Gödel Machine 2025 (archive over lineage) |
| Port mechanisms, never content | The exploit step copies *mechanisms* (packaging, hook structures, protocols) across experts — never niche content. Cloning content collapses the population into correlated duplicates. | PBT 2017 (exploit/explore); Shumailov et al., Nature 2024 (recursive self-feeding kills diversity) |
| Gated candidates, external verdicts | New candidates pass cheap pre-gates (data / demand / value) before any work — but pass/fail **verdicts come only from measured external behavior**, never from the generating agent's own opinion of its work. | Tree of Thoughts 2023 (generate/evaluate/expand/prune); Huang et al. 2024 (self-correction without external signal degrades); Zheng et al. 2023 (LLM judges are biased) |
| Capacity with explicit overflow | Each expert has a hard freshness capacity (what can be kept current). A claim beyond capacity is routed to a spawn decision or explicitly marked not-covered — never silently added as a page that will rot. | Switch Transformer 2022 (capacity factor; but dropping a claim is an editorial act, so overflow here is explicit non-coverage, not silent loss) |

## 4. The evaluator panel and its guards

No single metric is the fitness function — any lone proxy will be gamed
(Skalse et al. 2022 prove no non-trivial proxy is unhackable; the Darwin Gödel
Machine 2025 documented an agent deleting its own detection tokens to pass a
metric; this network has caught its own CI probes masquerading as adoption).
So AGIX scores with a panel:

1. **Dual-channel traffic** — server-side pageviews AND JS-executed pageviews,
   always both, always labeled (bots can fake one channel far more easily than
   both coherently).
2. **Third-party ground truth** — citation exports from engines the network
   does not operate.
3. **Money and commitment events** — the hardest signals to fake at zero cost.
4. **Minimum sample thresholds** — no expand/prune verdict below a
   pre-registered window and count. Below threshold, the honest move is to
   **lengthen the cycle, never to densify the proxy**. "No data yet" is a
   recorded state, never rounded up to a pass.
5. **Anomaly audit before celebration** — any sudden win is checked for
   parameter repetition and CI-time correlation before it earns replication.

## 5. Cycle time, stated plainly

AGIX runs in the regime of Sentient Ascend (AAAI 2018) — the published
precedent that evolved live websites with real visitor conversions as fitness —
not the regime of AlphaEvolve, whose evaluator scores in seconds. Generations
here take weeks. The spec treats that as a property, not an apology: slow
evaluators are exactly why the archive, the probation bias, and the sample
thresholds exist.

## 6. Genesis authority (the special point)

All authority in this network derives from its **genesis record**: the founding
commit that introduced AGIX v0.1 into the network's repository, made under the
owner's account authority. Like Bitcoin's genesis block — which carried its own
dated birth certificate and whose coinbase no code can spend — the genesis
record here fixes four things permanently:

1. **Supreme authority.** The genesis holder (the network's one human owner)
   outranks every other rule in this document. Where any AGIX mechanism and a
   genesis-holder decision conflict, the genesis holder wins.
2. **Human-only exercise.** Genesis privileges — version blessing, registry
   final say, niche charters, the kill switch, and any transfer of these
   privileges — can be exercised **only by the human owner's own explicit
   manual act**, never by an AI session, an automated process, or anything
   claiming delegation. An AI session asserting genesis authority is by
   definition acting outside AGIX.
3. **Fork boundary.** Anyone may fork this specification and start their own
   network — that fork gets its own genesis and owes this one nothing. What no
   fork or copy can do is alter, inherit, or claim *this* network's genesis
   authority.
4. **Protection priority.** The genesis holder's protection — privacy, legal
   exposure, credentials — outranks network growth in every automated decision,
   permanently.

Operational limits inherited from genesis (OWNER-CONTROL.md): AGIX sessions
cannot spend, transfer, or custody value; the network will never issue a token;
no payment ever changes a verdict; a one-file kill switch freezes any AGIX-run
property instantly.

## 7. The incentive layer — proof-of-grading (added in v0.2)

Bitcoin's deepest invention was not the coin; it was an incentive structure in
which honest contribution is the most profitable strategy: work is verified
mechanically, rewards are allocated automatically, early contributors earn
more, and attacking costs more than cooperating. AGIX ports that structure
**without any token** — the genesis limits forbid one, and ledger rule 3 grades
points-whose-value-needs-new-buyers as a claim awaiting a verdict.

**What this network can actually pay** (all real, none transferable, none monetary):
- **Distribution** — registry placement, syndication of a ledger's verdicts on
  network surfaces with attribution, and machine reach: every listed ledger is
  served to AI agents through the `get_claim_ledger` MCP tool.
- **Reputation** — the public conformance state (validates / flagged), and
  permanent founding status (below).
- **Permanence** — a never-deleted, dated public record of grading work, which
  is precisely the asset no individual claim-checker can cheaply build alone.

**The mechanics, mapped:**
1. **Proof-of-grading (the work).** Admission = mechanically verifiable work:
   a `/claimledger.json` that validates against the published schema, with all
   five fields, real flip conditions, and resolving sources. Like proof-of-work,
   it is expensive to fake well and cheap to verify.
2. **Algorithmic reward allocation (the AI half).** Each AGIX cycle, the SCORE
   step ranks listed ledgers on measured signals only — agent fetches of their
   ledger, conformance state, citation evidence where third-party data exists —
   and allocates the cycle's featured-syndication slot accordingly. The reward
   router is the same gating machinery as §3, pointed at contributors; scores
   are never subsidized, only selection is (the §3 probation rule applies to
   new ledgers too).
3. **Early-contributor curve (the halving analog).** Pre-registered: the first
   **10** external ledgers admitted to the registry earn permanent, irrevocable
   **founding-ledger status** — listed first, forever. Like early block
   subsidies, the reward is largest exactly when joining is least obviously
   worth it, and it decays to zero by design.
4. **Slashing (honesty enforcement).** A ledger caught silently rewriting its
   history is publicly flagged on the registry — reputation slashing. Flags are
   dated and, like everything else here, never deleted; a corrected ledger's
   recovery is also public.

**The honesty clause of this layer:** these rewards are distribution and
reputation only. They have no monetary value, cannot be transferred or sold,
and never will be. The moment a reward here becomes tradable, this network has
become an entry on its own ledger.

## 8. Prior art and lineage

Adaptive mixtures of local experts (Jacobs et al. 1991) · Sparsely-gated MoE
(Shazeer et al. 2017) · Switch Transformers (Fedus et al. 2022) · ST-MoE (Zoph
et al. 2022) · Representation collapse in sparse MoE (Chi et al. 2022) ·
Mixtral (Jiang et al. 2024) · OLMoE (Muennighoff et al. 2024) · DeepSeekMoE
(Dai et al. 2024) · DeepSeek-V3 (2024) · RouteLLM (Ong et al. 2024) · PBT
(Jaderberg et al. 2017) · MAP-Elites (Mouret & Clune 2015) · FunSearch
(Romera-Paredes et al., Nature 2023) · AlphaEvolve (2025) · Tree of Thoughts
(Yao et al. 2023) · Reward hacking (Skalse et al. 2022) · Model collapse
(Shumailov et al., Nature 2024) · Self-correction limits (Huang et al. 2024) ·
LLM-as-judge bias (Zheng et al. 2023) · Darwin Gödel Machine (Sakana 2025) ·
Sentient Ascend (Miikkulainen et al., AAAI 2018).

## 9. Versioning

This document is the algorithm. Changes bump the version; old versions stay in
repository history. **v0.1 — 2026-08-29 (initial). v0.2 — 2026-08-30 (adds §7,
the proof-of-grading incentive layer, on the owner's direction).**
