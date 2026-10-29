#!/usr/bin/env bash
# Render the store listing images from store.html into the fastlane metadata folder.
# Needs a Chromium headless shell: CHROME=/path/to/chrome-headless-shell ./render.sh
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
out="$here/../../../fastlane/metadata/android/en-US/images"
chrome="${CHROME:-$(ls -d ~/Library/Caches/ms-playwright/chromium_headless_shell-*/*/chrome-headless-shell 2>/dev/null | tail -1)}"
mkdir -p "$out/phoneScreenshots"

shoot() { # frame width height file
  "$chrome" --headless --hide-scrollbars --force-device-scale-factor=1 --virtual-time-budget=8000 \
    --allow-file-access-from-files --window-size="$2,$3" --screenshot="$4" "file://$here/store.html#$1" 2>/dev/null
}

i=1
for frame in live probe cook pair themes offline; do
  shoot "$frame" 1080 1920 "$out/phoneScreenshots/$i.png"
  i=$((i + 1))
done
shoot feature 1024 500 "$out/featureGraphic.png"
