// An add-on plugin imports nothing from another plugin, so it keeps its own copy of each kernel file that it uses.
// Each copy stays equal to the file of the core plugin.

import { expect, test } from "bun:test";
import path from "node:path";
import { PLUGINS } from "../support/repo.ts";

const CORE = path.join(PLUGINS, "claudetto/kernel");

const copies = [
  ...new Bun.Glob("claudetto-*/kernel/**/*.ts").scanSync(PLUGINS),
].sort();

test.each(copies)("`plugins/%s` equals the core kernel file", async (rel) => {
  const core = path.join(CORE, rel.split("/kernel/")[1] as string);
  expect(await Bun.file(path.join(PLUGINS, rel)).text()).toBe(
    await Bun.file(core).text(),
  );
});
