# Inner-page language navigation

Some translated guides had reciprocal search-engine alternates but no visible language control. Other pages only had a local template switch. Every canonical public page now has a consistent, initially collapsed native language menu above the site navigation.

Existing reciprocal alternates determine same-content language/region destinations. Pages without another version explicitly say so. Other language entry points are labelled separately and never presented as translations. Country-specific prices, rules and assumptions may differ. No inputs, query strings or scenario fragments are copied across language versions; nothing automatically redirects the visitor.

The existing free calculators and guides benefit from improved discovery. Paid workbench access and payment readiness are unchanged; private account/member pages are excluded. This release adds no posts, campaigns or spending. Existing consent-based pageviews can measure destination visits; visits alone do not establish a navigation click or conversion.

The generic chrome builder first removes the previous final language layer, so its legacy first-navigation insertion rules cannot nest page content inside the replaceable menu. Run `build_language_nav.py` after all page generators, followed by `test_language_nav.py`. The latter checks coverage, canonical destinations, reciprocal equivalents, no state forwarding and byte stability. `browser_language_nav.cjs` covers eight languages/regions, keyboard use, 320px/1280px layouts, real destination navigation, untranslated pages and JavaScript-disabled operation. Existing hreflang, sitemap and post-generator GA4 gates remain in place. IndexNow uses the existing release mechanism; receipt does not mean indexing.
