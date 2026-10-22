#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
set -euo pipefail
mkdir -p src check
cat > package.json <<'EOF'
{ "name": "billing", "type": "module" }
EOF
cat > src/money.mjs <<'EOF'
export function formatPrice(cents) {
  const whole = Math.floor(cents / 100);
  const rest = cents % 100;
  return `$${whole}.${rest}`;
}

export function applyDiscount(cents, pct) {
  return cents * (1 - pct / 100);
}
EOF
cat > check/money.test.mjs <<'EOF'
import assert from "node:assert";
import { test } from "node:test";
import { formatPrice } from "../src/money.mjs";

test("pads cents", () => {
  assert.equal(formatPrice(305), "$3.05");
  assert.equal(formatPrice(1000), "$10.00");
  assert.equal(formatPrice(1999), "$19.99");
});
EOF
