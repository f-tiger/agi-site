# Shared AGI navigation

The final build in `build.mjs` runs after page generators. Static English and Chinese pages use `site-nav/render.mjs`; discussion pages use the same renderer in the Worker.

Language pairs use existing same-origin hreflang links. Legacy pages that receive hreflang at the edge are paired only when the corresponding static page exists and declares the expected language. The home pair is `/` and `/cn`. Pages without an available counterpart link to the language homepage with an explicit label.

Run `build.mjs`, `build.mjs --check`, `test.mjs` and `browser-test.mjs` from the repository root as wired in the deployment workflow. `verify.mjs` checks deployed asset hashes, 24 representative bilingual pages, all menu destinations, complete link counts and language-pair labels.

The native details menu remains usable without JavaScript. Navigation actions use the existing opt-in analytics channel; private membership, account and moderation pages are excluded.
