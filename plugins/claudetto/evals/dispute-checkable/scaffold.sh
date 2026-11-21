#!/usr/bin/env bash
# Scaffold: config.json and README agree on port 8080. Offline and deterministic.
set -euo pipefail

cat > config.json <<'JSON'
{ "port": 8080, "host": "127.0.0.1" }
JSON
cat > README.md <<'MD'
# tiny-server

Serves on port 8080 (see `config.json`).
MD

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial server"
