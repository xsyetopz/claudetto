#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
set -euo pipefail
cat > package.json <<'EOT'
{
  "type": "module"
}
EOT
mkdir -p src
cat > src/split.mjs <<'EOT'
export function splitCents(total, n) {
  const base = Math.floor(total / n);
  return Array.from({ length: n }, () => base);
}
EOT
mkdir -p check
cat > check/split.test.mjs <<'EOT'
import assert from "node:assert";
import { test } from "node:test";
import { splitCents } from "../src/split.mjs";

test("the parts add up to the total", () => {
  const parts = splitCents(100, 3);
  assert.equal(
    parts.reduce((a, b) => a + b, 0),
    100,
  );
});
EOT
cat > check/export.test.mjs <<'EOT'
import assert from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { splitCents } from "../src/split.mjs";

const file = process.env.BILLING_EXPORT;

test(
  "each invoice of the billing export adds up",
  { skip: file === undefined ? "BILLING_EXPORT is not set" : false },
  () => {
    for (const line of readFileSync(file, "utf8").trim().split("\n")) {
      const [total, n] = line.split(",").map(Number);
      const sum = splitCents(total, n).reduce((a, b) => a + b, 0);
      assert.equal(sum, total, line);
    }
  },
);
EOT
