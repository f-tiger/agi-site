#!/usr/bin/env bash
# Production release guard. A failed freshness check must never permit a deploy.
set -euo pipefail

mode=${1:-}
case "$mode" in prepare|check) ;; *) echo 'Usage: deploy-main-guard.sh prepare|check' >&2; exit 2 ;; esac
if [[ "${GITHUB_REF:-}" != refs/heads/main ]]; then
  echo '::error::Production deployment requires refs/heads/main' >&2
  exit 1
fi

# Do not use a cached origin/main after a failed fetch. The explicit refspec also
# works with shallow checkouts and makes the freshness source unambiguous.
git fetch --no-tags origin '+refs/heads/main:refs/remotes/origin/main'
tip=$(git rev-parse --verify 'refs/remotes/origin/main^{commit}')
[[ "$tip" =~ ^[0-9a-f]{40}$ ]] || { echo '::error::Invalid main commit' >&2; exit 1; }

if [[ "$mode" == prepare ]]; then
  : "${GITHUB_OUTPUT:?GITHUB_OUTPUT is required}"
  # This mode runs only on a fresh checkout, before any generators. Never discard
  # local edits if someone invokes the script outside that intended lifecycle.
  git diff --quiet && git diff --cached --quiet || {
    echo '::error::Refusing to reset a checkout with tracked edits' >&2; exit 1;
  }
  git reset --hard "$tip"
  printf 'sha=%s\n' "$tip" >> "$GITHUB_OUTPUT"
  printf 'Prepared production source: %s\n' "$tip"
else
  [[ "${DEPLOY_SHA:-}" =~ ^[0-9a-f]{40}$ ]] || { echo '::error::Missing or invalid built release SHA' >&2; exit 1; }
  head=$(git rev-parse HEAD)
  if [[ "$head" != "$DEPLOY_SHA" || "$tip" != "$DEPLOY_SHA" ]]; then
    printf '::error::Main or checkout changed during build; refusing stale deployment (built=%s head=%s main=%s)\n' "$DEPLOY_SHA" "$head" "$tip" >&2
    exit 1
  fi
  # Keep generated files exactly as validated; never reset/rebase after the build.
  printf 'Verified production source immediately before deploy: %s\n' "$DEPLOY_SHA"
fi
