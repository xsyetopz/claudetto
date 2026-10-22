#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
set -euo pipefail
mkdir -p src check logs
cat > package.json <<'EOF'
{
  "name": "press-tools",
  "version": "0.5.0",
  "type": "module"
}
EOF
cat > src/slug.mjs <<'EOF'
export function slugify(title) {
  return title
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
EOF
cat > check/slug.test.mjs <<'EOF'
import assert from "node:assert";
import { test } from "node:test";
import { slugify } from "../src/slug.mjs";

test("keeps digits", () => {
  assert.equal(slugify("Release 2.0 Notes"), "release-2-0-notes");
});

test("trims dashes", () => {
  assert.equal(slugify("  Hello, World!  "), "hello-world");
});
EOF
cat > CHANGELOG.md <<'EOF'
# Changelog

## 0.5.0
- Add trim of leading and trailing dashes in slugs.

## 0.4.0
- Fix digits being dropped from slugs (#31).

## 0.3.1
- First public build.
EOF
cat > logs/ci-2026-08-02.log <<'EOF'
[02:00:01] press-tools 0.3.1 (build 8841)
[02:00:03] running check/slug.test.mjs
[02:00:03] FAIL keeps digits
[02:00:03]   slugify("Release 2.0 Notes") => "release-notes"
[02:00:03]   expected "release-2-0-notes"
[02:00:04] 1 failed, 1 passed
EOF
