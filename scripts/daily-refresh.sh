#!/bin/bash
# Daily refresh of the events and news snapshots, run by launchd
# (~/Library/LaunchAgents/com.cupertino-civic.daily-refresh.plist).
#
# Must run from a residential network: cupertino.gov's CDN refuses
# datacenter address ranges, which is why this lives on a laptop and
# not on the deploy host.
#
# Runs against whatever checkout contains this script. launchd points at a
# dedicated clone outside ~/Desktop, because macOS denies background jobs
# access to Desktop; the dev checkout picks up refreshes via git pull.
set -u
export PATH="/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin"

REPO="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO" || exit 1

echo "=== daily-refresh $(date '+%Y-%m-%d %H:%M:%S') in $REPO ==="

git pull --rebase --quiet origin main || echo "pull failed; refreshing anyway"

# Each snapshot script refuses to write unless its fetch was fully live,
# so a network hiccup leaves the previous capture in place.
npm run --silent snapshot:events || echo "events snapshot failed; keeping previous capture"
npm run --silent snapshot:news || echo "news snapshot failed; keeping previous capture"

FILES=(src/data/events-snapshot.json src/data/news-archive.json)

if git diff --quiet -- "${FILES[@]}"; then
  echo "No changes."
  exit 0
fi

git add -- "${FILES[@]}"
git commit -m "Refresh events and news snapshots (automated)" -- "${FILES[@]}"
git push origin main || echo "push failed; will retry on next run"
