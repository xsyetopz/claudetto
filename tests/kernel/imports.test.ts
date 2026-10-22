// Each add-on works alone (design D8): it holds its own copy of each kernel file that it imports,
// and no import of an add-on leaves its plugin folder.

import { expect, test } from "bun:test";
import { edges, type Files } from "../support/graph.ts";
import { checkPluginBoundary, repoFiles } from "../support/import-rules.ts";

/** Each relative import of `files` whose target is not a file of `files`. */
const unresolved = (files: Files): string[] =>
  edges(files)
    .filter(({ target }) => target && !(target in files))
    .map(({ file, spec }) => `${file}: import ${spec} has no file`);

/** The problems of the add-ons of `files`: an import that leaves its plugin, or an import with no file. */
const problems = (files: Files): string[] => {
  const addOns = Object.fromEntries(
    Object.entries(files).filter(([f]) => f.startsWith("plugins/claudetto-")),
  );
  return [...checkPluginBoundary(addOns), ...unresolved(addOns)];
};

test("each add-on imports only its own files, with a copy of each kernel file that it uses", async () => {
  const files = await repoFiles();
  expect(problems(files)).toStrictEqual([]);
});

test("an add-on that imports the kernel of another plugin fails", () => {
  const files = {
    "plugins/claudetto/kernel/budget.ts": "export const B = 1;\n",
    "plugins/claudetto-x/slices/s/slice.ts":
      'import { B } from "../../../claudetto/kernel/budget.ts";\n',
  };
  expect(problems(files)).toStrictEqual([
    "plugins/claudetto-x/slices/s/slice.ts: import ../../../claudetto/kernel/budget.ts leaves its plugin",
    "plugins/claudetto-x/slices/s/slice.ts: import ../../../claudetto/kernel/budget.ts has no file",
  ]);
});

test("an add-on with no copy of a kernel file that it imports fails", () => {
  const files = {
    "plugins/claudetto-x/slices/s/slice.ts":
      'import { B } from "../../kernel/budget.ts";\n',
  };
  expect(problems(files)).toStrictEqual([
    "plugins/claudetto-x/slices/s/slice.ts: import ../../kernel/budget.ts has no file",
  ]);
});
