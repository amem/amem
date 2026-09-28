#!/usr/bin/env bash
# Build everything: run every test suite, capture screenshots, package ZIPs, make store images.
# Needs: Node 18+ with the `playwright` package (+ Chromium), Python 3.9+ with Pillow, openpyxl, pypdf.
set -euo pipefail
cd "$(dirname "$0")/.."
ROOT="$(pwd)"
export NODE_PATH="${NODE_PATH:-$(npm root -g)}"
PY="${PYTHON:-python3}"

echo "== Product tests (and screenshots for the store images)"
for p in neon-stack invoice-studio watermark-studio; do
  echo "-- $p"
  (cd "products/$p" && SHOT_DIR="$ROOT/images/_shots/$p" node --test tests/*.test.js | grep -E '^# (tests|pass|fail)')
done
mkdir -p images/_shots/{neon-stack,invoice-studio,watermark-studio}
echo "-- py-automation-kit"
(cd products/py-automation-kit && "$PY" -m unittest discover -s tests 2>&1 | tail -1)
echo "-- publisher"
"$PY" -m unittest discover -s publisher/tests 2>&1 | tail -1

echo "== Packaging"
"$PY" scripts/package.py

echo "== Store images"
node scripts/make_images.js

echo "== Publisher plan"
"$PY" publisher/publish.py plan
