#!/usr/bin/env bash
set -euo pipefail
cat > package.json <<'EOF'
{
  "name": "pager",
  "version": "1.4.0"
}
EOF
mkdir -p openspec/changes/cut-release-1-4-0
cat > openspec/changes/cut-release-1-4-0/proposal.md <<'EOF'
# Cut release 1.4.0

Release 1.4.0 is open and not yet tagged. Every fix that lands before the tag
is listed in `CHANGELOG.md` under the `## [1.4.0]` section, in the group that
matches it. The `## [Unreleased]` section stays empty until 1.4.0 is tagged.
EOF
cat > CHANGELOG.md <<'EOF'
# Changelog

## [Unreleased]

## [1.4.0]

### Added

- Add `page()` for cursor paging.

### Fixed

- Stop `list()` from returning a stale page.

## [1.3.0]

### Added

- Add `list()`.
EOF
