// dotclaude-jev: the second-opinion tool replaces the skill and the session note.
// With the key set, a session has no second-opinion skill line and no session note.

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { PLUGINS } from "../support/repo.mjs";

const PLUGIN = path.join(PLUGINS, "dotclaude-jev");

test("the add-on has no skill and no session note", () => {
  assert.equal(existsSync(path.join(PLUGIN, "skills")), false);
  assert.equal(existsSync(path.join(PLUGIN, "hooks/session-start")), false);
  const hooks = JSON.parse(
    readFileSync(path.join(PLUGIN, "hooks/hooks.json"), "utf8"),
  );
  assert.equal(hooks.hooks?.SessionStart, undefined);
  assert.deepEqual(hooks.modules, ["./register.mjs"]);
});

test("the client script is in `features/jev`", () => {
  assert.equal(existsSync(path.join(PLUGIN, "features/jev/cli.mjs")), true);
});
