#!/bin/bash
set -euo pipefail

UID_VALUE="$(id -u)"
LAUNCH_AGENTS="$HOME/Library/LaunchAgents"

for label in com.xplainaeye.ai com.xplainaeye.backend; do
  launchctl bootout "gui/$UID_VALUE/$label" 2>/dev/null || true
  rm -f "$LAUNCH_AGENTS/$label.plist"
done

echo "XplainaEye local services removed."