// No two code files in one folder share the first part of their names, such as `guard-shell` and `guard-vars`.
// A shared prefix stands in for a folder, so the files go in a folder of that name (`guard/`).
// The commands in a plugin `bin/` folder are the exception, because they share the `PATH` of the user,
// and a file and its own test (`repo.mjs`, `repo.test.mjs`) are one name.

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { test } from "node:test";
import { REPO } from "./repo.mjs";

const CODE = /\.(?:mjs|cjs|js|ts|py|sh)$/;

/** The groups of sibling code files whose names share a first part, as `folder/prefix*: names`. */
function prefixChains(files) {
  const groups = new Map();
  for (const file of files) {
    const dir = path.posix.dirname(file);
    if (!CODE.test(file) || /(?:^|\/)bin$/.test(dir)) continue;
    const stem = path.posix.basename(file).replace(/(?:\.test)?\.[a-z]+$/, "");
    const key = `${dir}/${stem.split(/[-_.]/)[0]}*`;
    groups.set(key, new Set([...(groups.get(key) ?? []), stem]));
  }
  return [...groups]
    .filter(([, stems]) => stems.size > 1)
    .map(([key, stems]) => `${key}: ${[...stems].sort().join(" ")}`);
}

// A lint of the live repository.
test("lint: no folder holds code files whose names share a first part", () => {
  const r = spawnSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: REPO, encoding: "utf8" },
  );
  assert.equal(r.status, 0, r.stderr);
  const files = r.stdout
    .split("\n")
    .filter((f) => f && !f.includes("node_modules/"));
  assert.ok(files.some((f) => f.startsWith("tests/dotclaude/guard/")));
  assert.deepEqual(prefixChains(files), []);
});

test("a prefix chain fails, and a file with its own test or a `bin/` command does not", () => {
  assert.deepEqual(
    prefixChains([
      "tests/x/guard-shell.test.mjs",
      "tests/x/guard-vars.test.mjs",
      "tests/x/guard.test.mjs",
      "tests/support/code-items.mjs",
      "tests/support/code-items.test.mjs",
      "plugins/p/bin/p-start.mjs",
      "plugins/p/bin/p-usage.mjs",
      "docs/guard-a.md",
      "docs/guard-b.md",
    ]),
    ["tests/x/guard*: guard guard-shell guard-vars"],
  );
});
