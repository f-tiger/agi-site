# MCP registry listing — automated, waiting on one secret

An earlier version of this file said registry listing could not be automated.
That was wrong. The official registry proves domain ownership over HTTP: it
fetches a public key from /.well-known/mcp-registry-auth and verifies a
signature made with the matching private key. We control both.

So the mechanism is built and automatic. What is not automated is the
DECISION, and there is exactly one switch:

**Add repository secret `MCP_REGISTRY_PRIVATE_KEY`.** That is the go-ahead.
The next deploy serves the proof, and .github/workflows/mcp-publish.yml lists
the server. Nothing goes public before that, and nothing publishes by default.

Generate the key yourself — it must not pass through a chat transcript or a
build log:

    openssl genpkey -algorithm ed25519 -out mcp-key.pem

**Endpoint:** https://thedollscout.com/mcp
**Docs:** https://thedollscout.com/mcp
**Discovery:** https://thedollscout.com/.well-known/mcp.json
**Auth:** none
**Transport:** streamable HTTP (JSON-RPC POST)
**Content rating:** adult — several registries require this to be declared, and
some will not accept an adult-category server at all. Check before submitting
rather than after.

## Tools

- `doll_weight_by_height` — What adult dolls of a given height actually weigh, from recorded live listings. Listings routinely omit weight, which is why this data was collected. Returns the measured range, median and sample size, or states that no listing at that height was recorded.
- `payment_recourse` — What buyer recourse survives after payment for a consumer purchase: whether a UK Consumer Credit Act section 75 claim appears to apply, and whether a card chargeback is available. Derived from the statute and Financial Ombudsman Service guidance. Not legal advice.
- `first_year_cost` — Realistic first-year cost of owning an adult doll beyond the sticker price: import charge, care supplies, storage and a repair reserve. Conservative editorial estimates, not vendor quotes. The US duty RATE is deliberately not modelled because the tariff classification is unsettled.
- `scam_check_signals` — The ten checks to run against an unfamiliar doll shop before entering a card number, built from documented complaint threads, chargeback cases and counterfeit reports. Passing all ten is not a guarantee — it means no known pattern fired.
- `import_rules` — Legal status, duty and customs treatment for importing an adult-form doll into a given country, with the sources for that country. A reading of published rules, not legal advice. Childlike dolls are prohibited everywhere covered and carry serious criminal penalties.
- `doll_price_bands` — Recorded price distribution for adult dolls: floor, median, top, and how many listings fall under $1,000. Useful for judging whether an advertised price is plausible — prices far below the recorded floor are a counterfeit signal rather than a bargain.

## Before you add the secret

- The endpoint returns no affiliate links and no vendor ranking. Keep it that
  way; a registry listing that turns out to be a referral funnel is the fastest
  way to be delisted, and it would contradict the whole positioning.
- Registries generally want a stable URL. This one is stable, but the data
  behind it is re-recorded weekly — the answers carry their date, so a stale
  cache on their side is visible rather than silent.
