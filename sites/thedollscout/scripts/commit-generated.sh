#!/usr/bin/env bash
# Stages generated files and commits them, without the failure mode that has
# now bitten this repository five times.
#
# THE BUG, stated plainly so nobody reintroduces it:
#
#   git add existing.json missing.json
#
# does not stage existing.json. `git add` validates every pathspec first and
# aborts the whole call when one matches nothing — so ONE missing path drops
# EVERY file in the list. Combined with the idiom this repo used —
#
#   git add a b c 2>/dev/null || true
#   if git diff --cached --quiet; then echo "No change."; fi
#
# — the error is swallowed, the diff is empty, the step prints a cheerful
# "No change", and the job goes green. The data was written on the runner and
# thrown away with the runner.
#
# It ran for real. `content/ga4.json` and `content/gsc.json` were added to
# traffic.yml's add-list on 2026-08-01; those files only exist once Google
# credentials are configured, which they are not. traffic-bot's last commit is
# 2026-07-31. Eleven nights of Cloudflare edge traffic were collected and
# discarded, with eleven successful runs. grow.yml listed
# content/crawl-tuning.json, which detect-trends only writes when the pacing
# actually changes — grow-bot has never committed anything at all.
#
# So: filter to paths that exist, name the ones that did not, and never hide
# git's stderr. A path that is legitimately absent (a credential-gated output)
# must be visible as a warning, not as silence.
#
# Usage:
#   commit-generated.sh <bot-name> <commit message> <path|glob>...
#
# Exits 0 when there is nothing to commit — that is a normal result here, and
# the callers rely on it.

set -euo pipefail

# Monorepo (2026-08-19): source of truth is agi-site main. The old site-repo
# branch name lives on only as the Pages project's production-branch label.
BRANCH="${BRANCH:-main}"

BOT="${1:?bot name required}"
MESSAGE="${2:?commit message required}"
shift 2
[ "$#" -gt 0 ] || { echo "commit-generated: no paths given" >&2; exit 2; }

present=()
absent=()
for p in "$@"; do
  # compgen -G expands a glob and succeeds only if something matched, which
  # also covers the plain-path case. A literal unmatched glob passed straight
  # to `git add` is the same abort as a missing filename.
  if mapfile -t hits < <(compgen -G "$p" 2>/dev/null) && [ "${#hits[@]}" -gt 0 ]; then
    present+=("${hits[@]}")
  else
    absent+=("$p")
  fi
done

if [ "${#absent[@]}" -gt 0 ]; then
  # A GitHub Actions warning annotation, so this surfaces in the run summary
  # rather than only in the log nobody opens. Being absent is often fine; being
  # absent AND invisible is what cost eleven days of data.
  echo "::warning::commit-generated: not staged because they do not exist: ${absent[*]}"
fi

if [ "${#present[@]}" -eq 0 ]; then
  echo "commit-generated: none of the listed paths exist — nothing to stage."
  exit 0
fi

# No 2>/dev/null. If git refuses a path we need to see why.
git add -- "${present[@]}"

if git diff --cached --quiet; then
  echo "commit-generated: no change in ${#present[@]} staged path(s). Nothing to commit."
  exit 0
fi

echo "commit-generated: committing —"
git diff --cached --name-only | sed 's/^/    /'

git config user.name "$BOT"
git config user.email "actions@users.noreply.github.com"
git commit -m "$MESSAGE"

# A scrape can run for many minutes and anything pushed to the branch meanwhile
# makes a bare push non-fast-forward — on an ephemeral runner that means the
# work is simply lost. Rebase, then retry the push through transient failures.
git pull --rebase origin "$BRANCH"

for delay in 2 4 8 16 0; do
  if git push origin "$BRANCH"; then
    echo "commit-generated: pushed to $BRANCH"
    exit 0
  fi
  [ "$delay" -eq 0 ] && break
  echo "commit-generated: push failed, retrying in ${delay}s"
  sleep "$delay"
  git pull --rebase origin "$BRANCH"
done

echo "::error::commit-generated: could not push to $BRANCH after 5 attempts"
exit 1
