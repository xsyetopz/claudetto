#!/usr/bin/env bash
# Builds the fixture in the empty workspace.
# Three modules have one bug each, and a style script wants a header line and no `var` in each module.
# Needs the flag `--scaffold`.
set -euo pipefail
cat > package.json <<'EOT'
{
  "type": "module"
}
EOT
mkdir -p src check
cat > src/stack.mjs <<'EOT'
var items = [];

export const push = (x) => {
  items.push(x);
  return items.length;
};

export const pop = () => items.shift();

export const reset = () => {
  items = [];
};
EOT
cat > src/range.mjs <<'EOT'
// Numbers from `from` up to and including `to`.
export const range = (from, to) => {
  const out = [];
  for (let i = from; i < to; i++) out.push(i);
  return out;
};
EOT
cat > src/words.mjs <<'EOT'
// The count of words in a text. Any run of spaces separates two words.
export const wordCount = (text) => text.split(" ").length;
EOT
cat > check/all.test.mjs <<'EOT'
import assert from "node:assert";
import { test } from "node:test";
import { range } from "../src/range.mjs";
import { pop, push, reset } from "../src/stack.mjs";
import { wordCount } from "../src/words.mjs";

test("pop returns the last item pushed", () => {
  reset();
  push(1);
  push(2);
  assert.equal(pop(), 2);
});

test("range includes the end", () => {
  assert.deepEqual(range(1, 3), [1, 2, 3]);
});

test("wordCount skips extra spaces", () => {
  assert.equal(wordCount("a  b   c"), 3);
  assert.equal(wordCount(""), 0);
});
EOT
cat > check/style.mjs <<'EOT'
// Exits 1 when a module of `src/` has no `// @ts-check` first line, or has a `var`.
import fs from "node:fs";

let bad = 0;
for (const file of fs.readdirSync("src")) {
  const text = fs.readFileSync(`src/${file}`, "utf8");
  if (!text.startsWith("// @ts-check\n")) {
    console.error(`${file}: the first line is not "// @ts-check"`);
    bad++;
  }
  if (/\bvar\b/.test(text)) {
    console.error(`${file}: uses var`);
    bad++;
  }
}
process.exit(bad ? 1 : 0);
EOT
