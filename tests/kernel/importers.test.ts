// Each file of `plugins/claudetto/kernel/` has an importer that a file outside the kernel reaches (task 9.3 of `0-3-0`).
// A kernel file that only a dead kernel file imports fails too.

import { expect, test } from "bun:test";
import { edges, type Files } from "../support/graph.ts";
import { repoFiles } from "../support/import-rules.ts";

const KERNEL = "plugins/claudetto/kernel/";

/** The kernel files that no file outside the kernel reaches through imports. */
const unreached = (files: Files): string[] => {
  const all = edges(files);
  const reached = new Set<string>();
  const queue = all
    .filter(({ file }) => !file.startsWith(KERNEL))
    .map(({ target }) => target);
  for (let next = queue.pop(); next !== undefined; next = queue.pop()) {
    if (next === null || !next.startsWith(KERNEL) || reached.has(next))
      continue;
    reached.add(next);
    for (const e of all) if (e.file === next) queue.push(e.target);
  }
  return Object.keys(files)
    .filter((f) => f.startsWith(KERNEL) && !reached.has(f))
    .sort();
};

test("each kernel file has an importer outside the kernel, directly or through other kernel files", async () => {
  const files = await repoFiles(["plugins", "tools"]);
  expect(Object.keys(files).some((f) => f.startsWith(KERNEL))).toBeTruthy();
  expect(unreached(files)).toStrictEqual([]);
});

test("a kernel file that only another kernel file imports, with no outside importer, fails", () => {
  const files = {
    [`${KERNEL}a.ts`]: 'import { b } from "./b.ts";\n',
    [`${KERNEL}b.ts`]: "export const b = 1;\n",
    [`${KERNEL}c.ts`]: "export const c = 1;\n",
    "plugins/claudetto/slices/s/slice.ts":
      'import { c } from "../../kernel/c.ts";\n',
  };
  expect(unreached(files)).toStrictEqual([`${KERNEL}a.ts`, `${KERNEL}b.ts`]);
});
