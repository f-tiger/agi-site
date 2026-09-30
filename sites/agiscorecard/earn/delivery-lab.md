# Local subtitle and workflow delivery checks | AGI Scorecard

**Answer:** Paste an SRT or a workflow-run CSV. The original deterministic checks run in this browser without uploading the file or calling AI. They find structural flags, not translation accuracy or business truth.

---
Canonical page: https://agiscorecard.com/earn/delivery-lab
Machine-readable verdicts: https://agiscorecard.com/data.json (CC BY 4.0)
This Markdown mirror is generated from the page; the HTML page is canonical.

## Delivery guidance

Earn with AI / Delivery lab Try before you quote Check a small client delivery locally Paste an SRT or a workflow-run CSV. The original deterministic checks run in this browser without uploading the file or calling AI. They find structural flags, not translation accuracy or business truth. Task Subtitle timing and readability Workflow run evidence Characters per second (heuristic) Characters per line Defaults are editable examples, not a platform standard. Language, audience and screen size change readability. Review time (ISO with timezone) Freshness window in hours Expected unique successes in window CSV columns: run_id,finished_at,status,output_count. Accepted statuses: success, failed, running, cancelled. Only logged records are checked; compare the actual destination separately. SRT / CSV text Or choose a local text file (under 500 KB) Load fictional example Run local check Download findings Website launch baseline Download the original Playwright CLI. It checks up to five authorized pages at phone and desktop sizes, screenshots, overflow, page titles, missing image alt attributes and browser errors. It does not run Lighthouse/axe, submit forms, test security or make a purchase. Inspect scripts before running. Download website audit CLI npm install playwright npx playwright install chromium node launch-audit.mjs --authorized https://YOUR-STAGING-DOMAIN / /pricing Use a separate working folder. You provide authorization and a staging domain; reports and screenshots are local. Page loading may execute the site’s own scripts. Three business journeys and payments require separate sandbox review. Plan workflow maintenance Plan subtitle delivery Compare the open-source tools
