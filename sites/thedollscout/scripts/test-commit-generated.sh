#!/usr/bin/env bash
# Proves the staging bug cannot come back.
#
# This is a gate, not a nicety. The bug it tests for has appeared five times in
# this repository, each time in a different workflow, each time invisible: the
# job goes green, the step prints "No change", and the data written on the
# runner is discarded. Nothing about a passing run distinguishes "there was
# genuinely nothing new" from "eleven days of traffic were dropped".
#
# The last case is a control. It reproduces the OLD idiom and asserts that it
# DOES lose the file — because a test that only checks the fix would still pass
# if someone quietly reverted to `git add a b 2>/dev/null || true`.

set -uo pipefail

SCRIPT="$(cd "$(dirname "$0")" && pwd)/commit-generated.sh"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

failed=0
check() { # check <description> <expected> <actual>
  if [ "$2" = "$3" ]; then
    echo "ok    $1"
  else
    failed=$((failed + 1))
    echo "FAIL  $1"
    echo "        expected: $2"
    echo "        actual:   $3"
  fi
}

# A bare repo standing in for origin, so the push path is exercised too rather
# than stubbed — the push is where a real run would end.
setup() {
  rm -rf "$WORK/origin" "$WORK/repo"
  git init -q --bare "$WORK/origin"
  git init -q -b main "$WORK/repo"
  cd "$WORK/repo"
  git config user.email seed@test; git config user.name seed
  echo seed > seed.txt
  git add seed.txt && git commit -qm seed
  git remote add origin "$WORK/origin"
  git push -q -u origin main
}

export BRANCH=main

# ---- 1. the exact shape that lost eleven days of traffic ----
setup
mkdir -p content
echo '{"days":16}' > content/traffic.json          # written by the script
# content/ga4.json and content/gsc.json are never written without credentials
out=$("$SCRIPT" traffic-bot "record metrics" \
       content/traffic.json content/ga4.json content/gsc.json 2>&1)
check "a missing path does not stop the existing one being committed" \
  "content/traffic.json" \
  "$(git log -1 --name-only --format= | tr -d '\n')"
check "the commit really reached origin" \
  "record metrics" \
  "$(git --git-dir="$WORK/origin" log -1 --format=%s main)"
case "$out" in
  *"do not exist: content/ga4.json content/gsc.json"*)
    echo "ok    the absent paths are named in a warning, not swallowed" ;;
  *)
    failed=$((failed + 1))
    echo "FAIL  the absent paths are named in a warning, not swallowed"
    echo "        output was: $out" ;;
esac

# ---- 2. everything missing is a clean no-op, not a crash ----
setup
if out=$("$SCRIPT" bot "nothing" content/nope.json content/also-nope.json 2>&1); then
  check "all-missing exits 0 and commits nothing" \
    "seed" "$(git log -1 --format=%s)"
else
  failed=$((failed + 1)); echo "FAIL  all-missing should exit 0, got $?"
fi

# ---- 3. present but unchanged is also a clean no-op ----
setup
echo unchanged > tracked.txt
git add tracked.txt && git commit -qm "add tracked"
"$SCRIPT" bot "should not commit" tracked.txt >/dev/null 2>&1
check "an unchanged file produces no empty commit" \
  "add tracked" "$(git log -1 --format=%s)"

# ---- 4. a glob that matches nothing must not drop the ones that do ----
setup
mkdir -p content/snapshots
echo a > content/doll-specs.json
echo b > content/snapshots/2026-08-12.json
"$SCRIPT" specs-bot "collect specs" \
  'content/doll-specs*.json' content/snapshots 'content/never-*.json' >/dev/null 2>&1
check "a non-matching glob does not abort the matching ones" \
  "content/doll-specs.json content/snapshots/2026-08-12.json" \
  "$(git log -1 --name-only --format= | tr '\n' ' ' | sed 's/ *$//')"

# ---- 5. CONTROL: the old idiom must still be shown to lose the file ----
# If this ever passes silently, the bug has been reintroduced somewhere and
# this whole file has stopped meaning anything.
setup
echo new > real.json
git add real.json missing.json 2>/dev/null || true
if git diff --cached --quiet; then
  echo "ok    control: the old idiom does drop the file (the bug is real)"
else
  failed=$((failed + 1))
  echo "FAIL  control: expected 'git add real missing' to stage nothing."
  echo "        git's behaviour changed — re-derive whether the fix is still needed."
fi

cd /
echo
if [ "$failed" -eq 0 ]; then
  echo "All passed."
else
  echo "$failed failed."
fi
exit $((failed > 0))
