// dotclaude-jev: the second-opinion tool replaces the skill and the session note.
// With the key set, a session has no second-opinion skill line and no session note.

import { expect, test } from "bun:test";
import { existsSync } from "node:fs";
import path from "node:path";
import { PLUGINS } from "../support/repo.ts";

const PLUGIN = path.join(PLUGINS, "dotclaude-jev");

test("the add-on has no skill and no session note", async () => {
  expect(existsSync(path.join(PLUGIN, "skills"))).toBe(false);
  expect(existsSync(path.join(PLUGIN, "hooks/session-start"))).toBe(false);
  const hooks = await Bun.file(path.join(PLUGIN, "hooks/hooks.json")).json();
  expect(hooks.hooks?.SessionStart).toBe(undefined);
  expect(hooks.modules).toStrictEqual(["./register.ts"]);
});

test("the client script is in `features/jev`", () => {
  expect(existsSync(path.join(PLUGIN, "features/jev/cli.ts"))).toBe(true);
});
