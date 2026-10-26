// Each add-on plugin installs and works without the core plugin,
// so no add-on file names a path in `plugins/claudetto/` or the old operating spec.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { PLUGINS, walk } from "../support/repo.ts";

const ADDONS = fs
  .readdirSync(PLUGINS)
  .filter((name) => name.startsWith("claudetto-"));
const TEXT = /\.(?:mjs|js|ts|json|md)$/;

test("the add-ons exist", () => {
  expect(ADDONS.length > 0, `${ADDONS.length}`).toBeTruthy();
});

for (const addon of ADDONS) {
  test(`${addon} has no ties to the core plugin`, async () => {
    for (const file of walk(path.join(PLUGINS, addon), {
      keep: (f) => TEXT.test(f),
    })) {
      const text = await Bun.file(file).text();
      expect(text, file).not.toMatch(/\.\.\/claudetto\/|plugins\/claudetto\//);
    }
  });
}
