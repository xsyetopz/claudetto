// Behavior of the check of files in `plugins/` that the generator did not write (`tools/generate/stray.ts`).
// Each test works in its own copy of the fixture under `TMPDIR`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { generated, problems } from "../../../tools/generate/outputs.ts";
import { strays } from "../../../tools/generate/stray.ts";
import { fixtureRoot, write } from "./fixture.ts";

test("a file the generator wrote passes, and each other file in `plugins/` gets one message", async () => {
  const dir = await fixtureRoot({
    "plugins/q/made.md": "Made.\n",
    "plugins/q/stray.md": "Stray.\n",
  });
  const found = await strays(dir, ["plugins/q/made.md"]);
  expect(found).toHaveLength(1);
  expect(found[0]).toStartWith("plugins/q/stray.md ");
});

test("a file in `plugins/` that git ignores is not a stray", async () => {
  const dir = await fixtureRoot({
    ".gitignore": "plugins/q/local.md\n",
    "plugins/q/local.md": "Local.\n",
  });
  expect(await strays(dir, [])).toStrictEqual([]);
});

test("the generator fails on a stray file in `plugins/`, and passes once the file is deleted", async () => {
  const dir = await fixtureRoot();
  const made = await generated(dir);
  await write(dir, made);
  expect(await problems(dir, made)).toStrictEqual([]);
  await Bun.write(path.join(dir, "plugins/p/old/stray.md"), "Old.\n");
  const found = await problems(dir, made);
  expect(found).toHaveLength(1);
  expect(found[0]).toStartWith("plugins/p/old/stray.md ");
  fs.rmSync(path.join(dir, "plugins/p/old"), { recursive: true });
  expect(await problems(dir, made)).toStrictEqual([]);
});
