#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Needs the flag `--scaffold`.
set -euo pipefail
cat > package.json <<'EOF'
{
  "type": "module",
  "scripts": {
    "test": "node check/run.mjs"
  }
}
EOF
mkdir -p check
cat > check/run.mjs <<'EOF'
// The check of `abs`: one line for each case.
// The report keeps the first lines only, so a failure at the end is cut.
import { abs } from "../src/abs.mjs";

const SHOWN = 40;
const cases = [];
for (let n = -50; n <= 50; n++) if (n !== 0) cases.push([n, Math.abs(n)]);
cases.push([0, 0], [-0, 0]);

const lines = [];
let failed = 0;
cases.forEach(([input, want], i) => {
  const pass = Object.is(abs(input), want);
  if (!pass) failed += 1;
  lines.push(
    `${pass ? "ok" : "not ok"} ${i + 1} - abs(${Object.is(input, -0) ? "-0" : input})`,
  );
});

console.log(lines.slice(0, SHOWN).join("\n"));
if (lines.length > SHOWN) {
  console.log(`... ${lines.length - SHOWN} more lines cut.`);
}
process.exitCode = failed > 0 ? 1 : 0;
EOF
mkdir -p src
cat > src/abs.mjs <<'EOF'
export function abs(n) {
  return n < 0 ? n : n;
}
EOF
