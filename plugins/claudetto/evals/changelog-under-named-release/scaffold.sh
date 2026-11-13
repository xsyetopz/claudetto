#!/usr/bin/env bash
set -euo pipefail
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
