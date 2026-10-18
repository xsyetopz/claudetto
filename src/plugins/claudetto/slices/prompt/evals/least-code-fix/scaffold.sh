#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
set -euo pipefail
cat > package.json <<'EOT'
{
  "type": "module"
}
EOT
mkdir -p src check
cat > src/last.mjs <<'EOT'
export const last = (xs) => xs[xs.length];
EOT
cat > check/last.test.mjs <<'EOT'
import assert from "node:assert";
import { test } from "node:test";
import { last } from "../src/last.mjs";

test("last returns the final item", () => {
  assert.equal(last([1, 2, 3]), 3);
  assert.equal(last(["a"]), "a");
});
EOT
