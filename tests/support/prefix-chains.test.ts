// No two code files in one folder share the first part of their names, such as `guard-shell` and `guard-vars`.
// A shared prefix stands in for a folder, so the files go in a folder of that name (`guard/`).
// The commands in a plugin `bin/` folder are the exception, because they share the `PATH` of the user,
// and a file and its own test (`repo.ts`, `repo.test.mjs`) are one name.

import { expect, test } from "bun:test";
import path from "node:path";
import { REPO } from "./repo.ts";

const CODE = /\.(?:mjs|cjs|js|ts|py|sh)$/;

/** The groups of sibling code files whose names share a first part, as `folder/prefix*: names`. */
const prefixChains = (files: string[]): string[] => {
  const groups = new Map<string, Set<string>>();
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
};

// A lint of the live repository.
test("lint: no folder holds code files whose names share a first part", () => {
  const r = Bun.spawnSync(
    ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
    { cwd: REPO },
  );
  expect(r.exitCode, r.stderr.toString()).toBe(0);
  const files = r.stdout
    .toString()
    .split("\n")
    .filter((f) => f && !f.includes("node_modules/"));
  expect(files.includes("tests/support/repo.ts")).toBeTruthy();
  expect(prefixChains(files)).toStrictEqual([]);
});

test("a prefix chain fails, and a file with its own test or a `bin/` command does not", () => {
  expect(
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
  ).toStrictEqual(["tests/x/guard*: guard guard-shell guard-vars"]);
});
