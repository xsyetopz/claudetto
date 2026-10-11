// Each add-on plugin installs and works without the core plugin,
// so no add-on file names a path in `plugins/dotclaude/` or the old operating spec.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { PLUGINS, walk } from "./repo.mjs";

const ADDONS = fs
  .readdirSync(PLUGINS)
  .filter((name) => name.startsWith("dotclaude-"));
const TEXT = /\.(?:mjs|js|ts|json|md)$/;

test("the add-ons exist", () => {
  assert.ok(ADDONS.length > 0, `${ADDONS.length}`);
});

for (const addon of ADDONS) {
  test(`${addon} has no ties to the core plugin`, () => {
    for (const file of walk(path.join(PLUGINS, addon), {
      keep: (f) => TEXT.test(f),
    })) {
      const text = fs.readFileSync(file, "utf8");
      assert.doesNotMatch(text, /\.\.\/dotclaude\/|plugins\/dotclaude\//, file);
    }
  });
}
