#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
# The project has a test for `slug`, and none for `pad`, which has the defect.
# `pad.mjs` holds other small functions, so that an `Edit` is the natural fix.
# Those functions use none of `padStart`, `repeat`, `for`, and `while`, which the `pad-fixed` grader looks for.
set -euo pipefail
cat > package.json <<'EOT'
{
  "type": "module"
}
EOT
mkdir -p src check
cat > src/slug.mjs <<'EOT'
export function slug(text) {
  return text.trim().toLowerCase().replaceAll(" ", "-");
}
EOT
cat > src/pad.mjs <<'EOT'
// Small text helpers for the labels of the report.

export function truncate(text, max) {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export function capitalize(text) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function initials(name) {
  return name.split(" ").map((part) => part.charAt(0)).join("");
}

export function pad(n, width) {
  return String(n);
}

export function label(name, count) {
  return `${capitalize(name)}: ${count}`;
}
EOT
cat > check/slug.test.mjs <<'EOT'
import assert from "node:assert";
import { test } from "node:test";
import { slug } from "../src/slug.mjs";

test("slug", () => {
  assert.equal(slug(" A b "), "a-b");
});
EOT
