#!/bin/bash
set -e
cd "$(dirname "$0")"
if [ ! -f .venv/bin/activate ]; then
  echo "AI environment not found. Run: npm run ai:setup"
  exit 1
fi
source .venv/bin/activate
exec uvicorn app:app --host 127.0.0.1 --port 8000
