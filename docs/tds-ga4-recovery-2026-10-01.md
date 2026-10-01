# TDS GA4 recovery and fleet coverage audit — 2026-10-01

## Incident and correction

The September 25 document pivot (`c98f744`) removed `/js/config.js` and `/js/analytics.js` from TDS homepages. New document pages sent only first-party `doc_view` events. The owner's GA4 screenshot shows daily active users at zero from September 26; this is a measurement gap, and the existence of GSC clicks does not refute it.

The common document generator now loads the existing TDS stream (`G-2SEHFY33H8`) through one explicit-consent loader on all 93 EN/DE/ZH pages. Anonymous first-party events remain separate. No migration, property reassignment, new credentials, paid service or schedule is introduced.

The previous loader claimed `client_storage: none` prevented cookies. Running the actual Google tag in Chromium showed `_ga` and `_ga_2SEHFY33H8` cookies, so that claim cannot be reused. The replacement loads Google only after affirmative choice, supports decline/withdrawal/regrant, disables advertising features, and honors DNT/GPC. It excludes CI, automation and preview hosts, strips page query/fragment and referrer path, and publishes matching EN/DE/ZH privacy text. GA4 now measures consenting visitors; it will not equal anonymous action counts, and past missing unique-user history cannot be reconstructed from those counts.

## Verification

- 53 Node tests pass, including opt-in, remembered choices, withdrawal/regrant, QA and privacy exclusions, one initialization, and sanitized page metadata.
- All 93 generated pages pass local release verification, including one analytics/config entry and the expected TDS measurement ID. These checks also run in the existing post-deploy verifier.
- The TDS structured-data check passes: 182 entries, zero invisible entries.
- Real Google gtag code in Chromium 153 generates one `page_view` collect request for the correct stream after opt-in, none before it; no query secret, fingerprint, input text, downloaded file content or filename entered the observed request. Cookies are removed on withdrawal; a declined reload and `?ci=1` create no Google hits. 390px viewport has no horizontal overflow or page errors.
- Browser collect requests were intercepted and fulfilled locally to keep QA out of production analytics. This proves request generation, not acceptance or display in the owner's GA4 backend. The connected GSC Wizard account currently has no GA4 scope, so no backend report was claimed.

## Fleet audit (read-only beyond TDS)

Live HTML and its directly referenced first-party scripts were checked on the 31 host entries in the fleet heartbeat. Every checked root returned HTTP 200. Root coverage is not whole-site coverage, so representative recent pages were also inspected.

| Site | Homepage | Additional live checks | Conclusion |
|---|---|---|---|
| TDS | GA4 absent before this fix | `/image-compressor`, `/pdf-accessibility-checker` also absent | Confirmed pivot regression; fixed in this change |
| AGI | `G-FZXLMBB5QB` present | `/invest/` present; `/earn`, `/create`, `/agents` lack a Google loader | Partial coverage gap; no whole-site outage inferred |
| ECO | `G-E2V0Q9SJ9V` present | `/tools.html` present; `/pro-werkzeuge.html`, `/stromtarif-werkstatt.html`, `/rechner.html`, `/agents/compliance.html` lack a Google loader | Partial coverage gap; first-party counters still exist on affected pages |
| BPJ | `G-H79D948F4Z` present | `/en/`, `/agents/`, `/studio/` retain the GA4 configuration | No equivalent missing-tag regression in the sampled surfaces; backend delivery not verified |
| Other 27 hostname entries | No GA4 ID found in checked roots/scripts | Multiple products use `/e`, `/api/event`, job/feedback or other first-party instrumentation | These are separate measurement designs, not evidence that GA4 was recently removed; do not attach them silently to a main-domain property |

The AGI/ECO page gaps remain open after this TDS-only repair. A fuller repair should use each site's own property and shared page generator, preserve its consent and input-data boundaries, and add site-specific coverage gates. Neither raw edge requests nor a script marker establishes unique human traffic or revenue.
