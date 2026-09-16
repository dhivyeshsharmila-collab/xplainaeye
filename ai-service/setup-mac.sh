#!/bin/bash
set -e
cd "$(dirname "$0")"

PY=""
for CANDIDATE in python3.12 /opt/homebrew/bin/python3.12 /usr/local/bin/python3.12 python3.11 /opt/homebrew/bin/python3.11 /usr/local/bin/python3.11; do
  if command -v "$CANDIDATE" >/dev/null 2>&1; then
    PY="$CANDIDATE"
    break
  fi
done

if [ -z "$PY" ]; then
  echo "Python 3.11 or 3.12 is required for the TensorFlow AI service."
  echo "On Apple Silicon Mac, install it with: brew install python@3.12"
  exit 1
fi

echo "Using: $($PY --version)"
"$PY" -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

echo
echo "AI environment is ready."
echo "The real research model will download automatically from Hugging Face the first time you start the AI service."
