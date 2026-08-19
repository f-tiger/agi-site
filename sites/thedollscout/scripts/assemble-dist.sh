#!/usr/bin/env bash
# Assembles the publishable site into dist/.
#
# This exists as a script rather than inline YAML because two workflows deploy
# (deploy.yml on push, fetch-photos.yml after the weekly scrape) and the
# exclusion list drifted between them — the photo job was still publishing
# MARKETING.md, ANALYTICS.md and the dot-directories weeks after the deploy job
# stopped. One copy, one place to get it right.
#
# Everything excluded here is internal and must never be served.
set -euo pipefail

# The sandbox this repo is edited in has no rsync, so `bash assemble-dist.sh`
# there failed at line 16 and every local "did it publish?" check silently
# passed on an empty dist/. Fail loudly instead of pretending.
command -v rsync >/dev/null || {
  echo "assemble-dist: rsync not found. This runs on GitHub Actions runners," >&2
  echo "which have it; a local check without rsync proves nothing." >&2
  exit 1
}

rm -rf dist
mkdir -p dist

rsync -a \
  --exclude '.git' \
  --exclude '.github' \
  --exclude '.claude' \
  --exclude '.agents' \
  --exclude 'dist' \
  --exclude 'node_modules' \
  --exclude 'scripts' \
  --exclude 'content' \
  --exclude '*.md' \
  --exclude '.gitignore' \
  ./ dist/

echo "--- files that will be published:"
find dist -type f | sort
