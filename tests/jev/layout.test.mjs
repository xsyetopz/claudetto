// dotclaude-jev: the second-opinion tool replaces the skill and the session note.
// With the key set, a session has no second-opinion skill line and no session note.

import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const PLUGIN = path.join(import.meta.dirname, "../../plugins/dotclaude-jev");

test("the add-on has no skill and no session note", () => {
  expect(existsSync(path.join(PLUGIN, "skills"))).toBe(false);
  expect(existsSync(path.join(PLUGIN, "hooks/session-start"))).toBe(false);
  const hooks = JSON.parse(
    readFileSync(path.join(PLUGIN, "hooks/hooks.json"), "utf8"),
  );
  expect(hooks.hooks?.SessionStart).toBeUndefined();
  expect(hooks.modules).toEqual(["./register.mjs"]);
});

test("the client script is in `features/jev`", () => {
  expect(existsSync(path.join(PLUGIN, "features/jev/cli.mjs"))).toBe(true);
});
