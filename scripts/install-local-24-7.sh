#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LAUNCH_AGENTS="$HOME/Library/LaunchAgents"
UID_VALUE="$(id -u)"
NODE_BIN="$(command -v node || true)"

if [ -z "$NODE_BIN" ]; then
  echo "Node.js is required. Install Node.js, then run this script again."
  exit 1
fi
if [ ! -x "$ROOT_DIR/ai-service/.venv/bin/python" ]; then
  echo "AI environment is missing. Run: npm run ai:setup"
  exit 1
fi

cd "$ROOT_DIR"
npm run build
mkdir -p "$LAUNCH_AGENTS"

write_plist() {
  local label="$1"
  local working_dir="$2"
  local program="$3"
  local stdout_path="$4"
  local stderr_path="$5"
  local plist="$LAUNCH_AGENTS/$label.plist"

  cat > "$plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$label</string>
  <key>ProgramArguments</key>
  <array><string>$program</string></array>
  <key>WorkingDirectory</key><string>$working_dir</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ProcessType</key><string>Interactive</string>
  <key>StandardOutPath</key><string>$stdout_path</string>
  <key>StandardErrorPath</key><string>$stderr_path</string>
</dict>
</plist>
EOF
}

write_plist "com.xplainaeye.ai" "$ROOT_DIR/ai-service" "$ROOT_DIR/ai-service/start.sh" \
  "/tmp/xplainaeye-ai.log" "/tmp/xplainaeye-ai.error.log"
AI_PLIST="$LAUNCH_AGENTS/com.xplainaeye.ai.plist"
plutil -replace ProgramArguments.0 -string "$ROOT_DIR/ai-service/.venv/bin/python" "$AI_PLIST"
plutil -remove ProgramArguments.1 "$AI_PLIST"
for index_and_value in \
  "1|-m" "2|uvicorn" "3|app:app" "4|--host" "5|127.0.0.1" "6|--port" "7|8000"; do
  index="${index_and_value%%|*}"
  value="${index_and_value#*|}"
  plutil -insert "ProgramArguments.$index" -string "$value" "$AI_PLIST"
done
write_plist "com.xplainaeye.backend" "$ROOT_DIR/backend" "$NODE_BIN" \
  "/tmp/xplainaeye-backend.log" "/tmp/xplainaeye-backend.error.log"
plutil -insert ProgramArguments.1 -string "$ROOT_DIR/backend/src/server.js" "$LAUNCH_AGENTS/com.xplainaeye.backend.plist"

for label in com.xplainaeye.ai com.xplainaeye.backend; do
  launchctl bootout "gui/$UID_VALUE/$label" 2>/dev/null || true
  launchctl bootstrap "gui/$UID_VALUE" "$LAUNCH_AGENTS/$label.plist"
  launchctl kickstart -k "gui/$UID_VALUE/$label"
done

echo "XplainaEye is installed as a local always-on service."
echo "Open: http://localhost:5001"
echo "AI log: /tmp/xplainaeye-ai.log"
echo "Backend log: /tmp/xplainaeye-backend.log"