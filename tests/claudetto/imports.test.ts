// The import lines of the plugins follow the import rules of `AGENTS.md`.
// The rules are in `tests/support/import-rules.ts`, and this test runs all of them over the files of `plugins/`.
// `import-rules.test.ts` breaks each rule with a fixture.

import { expect, test } from "bun:test";
import { RULES, repoFiles } from "../support/import-rules.ts";

test("the plugins hold the files that the rules read", async () => {
  const files = Object.keys(await repoFiles());
  expect(
    files.includes("plugins/claudetto/hooks/register.ts"),
    files.join("\n"),
  ).toBeTruthy();
  expect(
    files.includes("plugins/claudetto/kernel/slice.ts"),
    files.join("\n"),
  ).toBeTruthy();
  expect(
    files.includes("plugins/claudetto/slices/prompt/adapters/mod.ts"),
    files.join("\n"),
  ).toBeTruthy();
});

for (const [name, check] of Object.entries(RULES))
  test(`the plugins pass ${name}`, async () => {
    expect(check(await repoFiles())).toStrictEqual([]);
  });
