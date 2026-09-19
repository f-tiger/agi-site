# Bing discovery repair — 19 September 2026

Owner supplied Bing Webmaster screenshots: one important URL not submitted via IndexNow (`/tools/google-flow`); five important URLs missing in sitemaps (Google Flow, Cline, Together, Jianying, Grammarly alternatives). Screenshot is evidence of Bing's last scan, not a fresh index crawl. A separate overview reported batch timing, short descriptions and insufficient inbound links; those are separate issues.

Browser inspection confirms a live extensionless BPJ page declares the `.html` URL as canonical. Current build emits `.html` sitemap entries. The previous growth-reset PR #3 remains open; this release ports only the bounded discovery repair onto current main. Do not claim all PR #3 work is deployed.

Changes:
- Normalize BPJ-owned absolute public URLs across generated HTML, language links, JSON-LD, feeds and sitemap. Old `.html` routes continue redirecting through Cloudflare Pages. Third-party URLs are unchanged.
- Adapt local-link checks to Pages extensionless routing and verify all canonical-bearing pages map to their output files before deploy.
- Keep the existing content-fingerprint manifest keys to avoid resetting content dates on every build. Normalize keys when selecting IndexNow updates; otherwise the new clean sitemap URLs would no longer match old manifest keys and silently submit zero pages.
- Check the live verification file, enforce the correct host, set request timeouts, and fail visibly on rejected submissions. API acceptance is not indexing.
- One explicitly tagged release submits only the five screenshot URLs after verifying each is live with a matching canonical. No daily whole-site backfill. Subsequent maintenance retains content-change selection.

Validation: selection tests cover historical `.html` manifest keys against both sitemap formats, the five-page repair, missing sitemap entries and foreign-host rejection. Canonical gate passed on the prior full build (1,601 canonical pages); current main is rebuilt and checked in CI before deployment. Publication and IndexNow response must be confirmed in release logs, not inferred from this source commit.

Primary protocol: https://www.indexnow.org/documentation . HTTP 200 confirms received; HTTP 202 means key validation pending. Warning disappearance requires Bing to re-evaluate; no immediate disappearance is promised.

## Verified publication

Commit `649bd85a685a18bfd67bd642b604541deac76449`, workflow https://github.com/f-tiger/agi-site/actions/runs/35415636259 completed successfully. The 1,603-page distribution passed validation. At 2026-09-19 02:26:51 UTC, IndexNow returned HTTP 200 for all five repair URLs. Live browser inspection confirmed the extensionless Google Flow canonical. This verifies deployment and receipt, not Bing indexing or warning removal.
