#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
# The project has four public functions in two folders, and its README lists them.
# The eval child reads user settings only, so the case carries the style text in `append_system_prompt`.
set -euo pipefail
cat > package.json <<'EOT'
{
  "type": "module"
}
EOT
cat > README.md <<'EOT'
# calc

Small number helpers.

## Public functions

- `add(a, b)` in `src/add.mjs`
- `sub(a, b)` in `src/sub.mjs`
- `mul(a, b)` in `src/mul.mjs`
- `div(a, b)` in `lib/div.mjs`
EOT
mkdir -p src lib check
cat > src/add.mjs <<'EOT'
export function add(a, b) {
  return a + b;
}
EOT
cat > src/sub.mjs <<'EOT'
export function sub(a, b) {
  return a - b;
}
EOT
cat > src/mul.mjs <<'EOT'
export function mul(a, b) {
  return a * b;
}
EOT
cat > lib/div.mjs <<'EOT'
export function div(a, b) {
  return a / b;
}
EOT
cat > check/add.test.mjs <<'EOT'
import assert from "node:assert";
import { test } from "node:test";
import { add } from "../src/add.mjs";

test("add", () => {
  assert.equal(add(1, 2), 3);
});
EOT
