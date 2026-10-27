#!/usr/bin/env bash
set -euo pipefail
# macOS kills any process using Bluetooth whose responsible app lacks NSBluetoothAlwaysUsageDescription,
# and a terminal is not enough. This wraps `uv run g1.py ARGS` in a tiny ad-hoc signed .app so
# CoreBluetooth allows it, and streams its output here. Usage: tools/macos-run.sh watch

here="$(cd "$(dirname "$0")/.." && pwd)"
app="${XDG_CACHE_HOME:-$HOME/.cache}/searly/Searly.app"
log="$(mktemp -t searly)"

mkdir -p "$app/Contents/MacOS"
cat > "$app/Contents/Info.plist" <<'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
<key>CFBundleIdentifier</key><string>gg.rory.searly.cli</string>
<key>CFBundleName</key><string>Searly</string>
<key>CFBundleExecutable</key><string>run</string>
<key>CFBundlePackageType</key><string>APPL</string>
<key>LSBackgroundOnly</key><true/>
<key>NSBluetoothAlwaysUsageDescription</key><string>Searly talks to your ThermoMaven G1 over Bluetooth.</string>
</dict></plist>
EOF
cat > "$app/Contents/MacOS/run" <<'EOF'
#!/bin/zsh
# args: log uv repo_dir g1_args...
log=$1 uv=$2 dir=$3; shift 3
cd "$dir" && "$uv" run -q g1.py "$@" > "$log" 2>&1
EOF
chmod +x "$app/Contents/MacOS/run"
codesign -s - --force "$app" 2> /dev/null

open -W -n "$app" --args "$log" "$(command -v uv)" "$here" "$@" &
opener=$!
tail -f "$log" &
tailer=$!
stop() { pkill -f "$app/Contents/MacOS/run" || true; }
trap stop INT TERM
wait "$opener" || true
sleep 0.2
kill "$tailer" 2> /dev/null || true
