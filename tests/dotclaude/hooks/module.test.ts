// Test of the hooks module of dotclaude: the classic `PreToolUse` checks are in `register.ts`, not in `hooks.json`.
// It reads `hooks/hooks.json` as a file, because the hook lab does not load a JSON file.

import { expect, test } from "bun:test";
import path from "node:path";
import { PLUGINS } from "../../support/repo.ts";

const hooks = await Bun.file(
  path.join(PLUGINS, "dotclaude/hooks/hooks.json"),
).json();

test("`hooks.json` names the module that holds the `PreToolUse` checks", () => {
  expect(hooks.modules).toEqual(["./register.ts"]);
  expect(Object.keys(hooks.hooks)).not.toContain("PreToolUse");
});
