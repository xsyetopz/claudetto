#!/usr/bin/env bash
# Scaffold: one fixed notes file (213 chars; 151 without its TODO line). Offline and deterministic.
set -euo pipefail

cat > notes.txt <<'TXT'
Release checklist for tiny-cart 0.2.0
- bump the version in package.json
- TODO: decide whether the changelog lists internal refactors
- tag the release and push the tag
- announce the release in the team channel
TXT

git init -q -b main
git add -A
git -c user.name=eval -c user.email=eval@example.invalid commit -q -m "chore: initial notes"
