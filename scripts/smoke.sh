#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."
mkdir -p /tmp/opencode

echo "▶ typecheck"
npm run typecheck

echo "▶ tests"
npm test

echo "▶ build"
npm run build

echo "▶ health smoke"
rm -rf .data-smoke
DATA_DIR="$(pwd)/.data-smoke" SERVE_CLIENT=1 PORT=4099 \
  node server/dist/index.js >/tmp/opencode/smoke.log 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true; rm -rf .data-smoke' EXIT

for _ in $(seq 1 40); do
  if curl -fsS http://127.0.0.1:4099/api/health >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

curl -fsS http://127.0.0.1:4099/api/health
echo
echo "✔ smoke ok"
