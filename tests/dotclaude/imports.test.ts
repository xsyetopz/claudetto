// Test T1: the import lines of the plugins follow the dependency rule of design D18.
// The rules are in `tests/support/import-rules.ts`, and this test runs all of them over the files of `plugins/`.
// `import-rules.test.ts` breaks each rule with a fixture.

import { expect, test } from "bun:test";
import {
  type Files,
  parseImports,
  RULES,
  repoFiles,
} from "../support/import-rules.ts";

test("the plugins hold the files that the rules read", async () => {
  const files = Object.keys(await repoFiles());
  expect(
    files.includes("plugins/dotclaude/hooks/register.ts"),
    files.join("\n"),
  ).toBeTruthy();
  expect(
    files.includes("plugins/dotclaude/lib/budget.ts"),
    files.join("\n"),
  ).toBeTruthy();
  expect(files.some((f) => f.includes("/features/"))).toBe(true);
  expect(
    files.includes("plugins/dotclaude-sessions/bin/dotclaude-start"),
    files.join("\n"),
  ).toBeTruthy();
});

for (const [name, check] of Object.entries(RULES))
  test(`the plugins pass ${name}`, async () => {
    expect(check(await repoFiles())).toStrictEqual([]);
  });

test("the module graph of `dotclaude-jev` holds its feature files and no `node:` import or `Bun` use", async () => {
  const files = await repoFiles();
  const jev = Object.keys(files).filter((f) =>
    f.startsWith("plugins/dotclaude-jev/"),
  );
  expect(
    jev.includes("plugins/dotclaude-jev/hooks/register.ts"),
    jev.join("\n"),
  ).toBeTruthy();
  expect(
    jev.includes("plugins/dotclaude-jev/features/jev/tool.ts"),
    jev.join("\n"),
  ).toBeTruthy();
  const graph: Files = {};
  for (const f of jev)
    if (!f.endsWith("/cli.ts")) graph[f] = files[f] as string;
  for (const text of Object.values(graph))
    for (const { spec } of parseImports(text))
      expect(spec?.startsWith("node:")).toBe(false);
  // The client is the one file that uses the Bun API, and no module file imports it.
  const client = files["plugins/dotclaude-jev/features/jev/cli.ts"] as string;
  expect(client.includes("Bun."), client).toBeTruthy();
  for (const [f, text] of Object.entries(graph))
    expect(/(?<![\w.$])Bun\b/.test(text), f).toBe(false);
  for (const text of Object.values(graph))
    for (const { spec } of parseImports(text))
      expect(spec?.endsWith("cli.ts")).toBe(false);
});
