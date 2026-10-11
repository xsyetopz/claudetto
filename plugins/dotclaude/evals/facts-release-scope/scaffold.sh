#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
# The manifest has 1.3.0, the newest tag is `v1.2.0`, and `CHANGELOG.md` has an empty `[Unreleased]` section above `[1.3.0]`.
set -euo pipefail
cat > package.json <<'JSON'
{
  "name": "text-kit",
  "version": "1.3.0",
  "type": "module"
}
JSON
mkdir -p src
cat > src/text.mjs <<'JS'
export function trim(s) {
  return s.trim();
}
JS
cat > CHANGELOG.md <<'MD'
# Changelog

## [Unreleased]

## [1.3.0] - 2026-10-01

### Added

- `trim(s)` removes the white space at the start and the end of `s`.

## [1.2.0] - 2026-09-01

### Added

- The first release.
MD
# The fixture sets its own author and turns signing off, so a global git config does not change it.
GIT_FIXTURE=(-c user.name=fixture -c user.email=fixture@example.com -c commit.gpgsign=false -c tag.gpgsign=false)
git init -q
git add -A
git "${GIT_FIXTURE[@]}" commit -q -m "Release 1.2.0"
git "${GIT_FIXTURE[@]}" tag v1.2.0
git "${GIT_FIXTURE[@]}" commit -q --allow-empty -m "Bump to 1.3.0"
