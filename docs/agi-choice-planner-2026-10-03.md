# Future Guide: choose a plan without typing

The owner found the action planner too difficult to complete on a phone. It
asked for a task, action, counterexample and exact review date as free input.
The replacement offers six native dropdowns: direction, situation, action,
condition for revising the plan, review interval and progress. An immediate
preview shows the resulting task, concrete action, revision condition and date.

Six existing user needs each have three situations and three action recipes.
The recipes are bilingual editorial starting points, not model output,
predictions or promised results. The article's own test remains beside the
plan. A new situation resets the completion flag; automatic previews produce
no save or completion event. Existing consent-gated save/export actions remain.

The sources are `foresight-assets/planner.mjs` and `planner-ui.mjs`, integrated
by the existing Future Guide build and app. All 60 perspective pages and embed
views receive the form. Canonicals, paired languages, sources and review dates
stay under the existing generators. Agent mirrors are rebuilt by deployment;
IndexNow continues through the established weekly/manual incremental workflow.

The version-1 notebook schema is unchanged. Old text becomes a retained option
and is displayed with textContent. Choosing Save without changing old choices
preserves every note field exactly. Selecting a new action against a custom
saved task uses that task, not a silently substituted example. Review intervals
resolve to a local calendar date when selected; saved dates never slide on a
later visit. Records remain on-device until an explicit save/export/handoff;
the member page still requires a separate explicit upload.

Two adversarial self-checks:

- Choice quality: all 324 bilingual combinations produce the intended scenario,
  action and condition; cross-direction IDs are rejected; each article retains
  its actual evidence test. Native selectors use 16px text and fit 320px screens.
- Preservation and failure: old arbitrary text and date round-trip exactly;
  HTML in notes remains inert; saved dates survive midnight; changing the task
  clears a previous completion; blocked storage does not claim a save. Existing
  local backup, Markdown/calendar export and real member-page handoff tests pass
  with local fixtures and no production writes or payments.

The planner is free and points to the existing optional cloud workspace.
Reducing typing is a usability hypothesis; no retention, conversion, revenue or
learning improvement is claimed from these functional tests.
