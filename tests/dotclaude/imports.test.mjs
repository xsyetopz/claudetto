// Test T1: the import lines of the plugins follow the dependency rule of design D18.
// The rules are in `tests/support/import-rules.mjs`, and this test runs all of them over the files of `plugins/`.
// `import-rules.test.mjs` breaks each rule with a fixture.

import assert from "node:assert/strict";
import { test } from "node:test";
import { parseImports, RULES, repoFiles } from "../support/import-rules.mjs";

test("the plugins hold the files that the rules read", () => {
  const files = Object.keys(repoFiles());
  assert.ok(
    files.includes("plugins/dotclaude/hooks/register.mjs"),
    files.join("\n"),
  );
  assert.ok(
    files.includes("plugins/dotclaude/lib/budget.mjs"),
    files.join("\n"),
  );
  assert.equal(
    files.some((f) => f.includes("/features/")),
    true,
  );
  assert.ok(
    files.includes("plugins/dotclaude-sessions/bin/dotclaude-start"),
    files.join("\n"),
  );
});

for (const [name, check] of Object.entries(RULES))
  test(`the plugins pass ${name}`, () => {
    assert.deepEqual(check(repoFiles()), []);
  });

test("the module graph of `dotclaude-jev` holds its feature files and no `node:` import", () => {
  const files = repoFiles();
  const jev = Object.keys(files).filter((f) =>
    f.startsWith("plugins/dotclaude-jev/"),
  );
  assert.ok(
    jev.includes("plugins/dotclaude-jev/hooks/register.mjs"),
    jev.join("\n"),
  );
  assert.ok(
    jev.includes("plugins/dotclaude-jev/features/jev/tool.mjs"),
    jev.join("\n"),
  );
  const graph = {};
  for (const f of jev) if (!f.endsWith("/cli.mjs")) graph[f] = files[f];
  for (const f of Object.keys(graph))
    for (const { spec } of parseImports(graph[f]))
      assert.equal(spec.startsWith("node:"), false);
  // The client is the one file with `node:` imports, and no module file imports it.
  assert.ok(
    files["plugins/dotclaude-jev/features/jev/cli.mjs"].includes(
      'from "node:fs"',
    ),
    files["plugins/dotclaude-jev/features/jev/cli.mjs"],
  );
  for (const f of Object.keys(graph))
    for (const { spec } of parseImports(graph[f]))
      assert.equal(spec.endsWith("cli.mjs"), false);
});
