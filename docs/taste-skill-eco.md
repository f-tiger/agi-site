# Taste skill for ECO

Installed and reviewed on 2026-11-06. Upstream: [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill/tree/9b4bf937a1f69348126959c15d2f99a73e65699b), `design-taste-frontend` 2.5.0, commit `9b4bf937a1f69348126959c15d2f99a73e65699b`.

## Reproducible local installation

Run `python3 tools/skills/install_taste.py` from a checkout. The installer fetches the exact reviewed commit and copies the complete skill, including references, scripts, asset credits and the MIT license, into `.claude/skills/design-taste-frontend/`. It runs no upstream installer or package manager. Node 22+ and Chromium are needed only for browser checks.

The package contains 1,617 upstream files plus the root license; its large media library is ignored by Git and is never copied into the public website. `UPSTREAM.json` records the commit and file hashes. Run `python3 tools/skills/install_taste.py --check` for offline integrity verification. An existing changed installation is not overwritten. For an already downloaded clean checkout at the pinned commit, use `--source /path/to/taste-skill`.

## ECO-specific application

ECO is an editorial affiliate and decision-tool website. Use Taste to inspect hierarchy, contrast, responsive layout, labels, focus visibility and consistency. Preserve the existing blue identity, useful reading density, product-selection constraints and calculator access.

The upstream company/landing-page rules are not acceptance criteria for ECO: do not impose full-screen sections, a full-screen hero, photo quotas, random palettes, WebGL, new frameworks or animation. Do not remove legal contact details, Impressum, privacy controls, affiliate disclosures, citations, useful captions, estimated values or example labels to clear a checker finding. Never fabricate equipment photography, laboratory results, prices, customer quotes or earnings. In particular, ignore the upstream checker's suggestions to invent plausible values and hide that they are invented (`scripts/consistency.mjs`, placeholder/sample-label suggestions); they conflict with truthful editorial content and the skill's own evidence rule.

Run browser checks on an isolated local build with a fresh browser profile, account/analytics scripts excluded and non-loopback network traffic blocked. Do not click live merchant links or create production measurement events. A partial check must list skipped checks; stylistic findings must be assessed for applicability, not reported as conversion evidence. Keep screenshots and private business analysis outside this public repository.

## Initial decision and bounded changes

- Fix the verified blue-on-blue homepage family-tool links. A dedicated generated style preserves their text, order and targets while giving them inherited light text, underlines and a visible keyboard focus ring. The white-link contrast against the blue hero endpoints is approximately 5.69:1 and 8.92:1.
- Keep the accompanying source-backed buying-guide corrections: distinguish monoblock and mobile split installation, remove unsupported absolute rankings and humidity guarantees, align model sizing with operating conditions, remove the duplicated Meaco contents list and explain verified product links versus search links accurately.
- Consider a later bounded experiment to make the main task/calculator entry easier to find and to simplify existing cooling buying sections. This is a usability hypothesis, not demonstrated commission uplift. Respect the existing humidity observation window and decision gates in `eco-revenue-path-2026-11-05.md`.
- Do not undertake a whole-site visual redesign based on this audit. Do not restart Amazon reporting setup as part of this work.
