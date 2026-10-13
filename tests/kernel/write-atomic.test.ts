// Tests of `writeAtomic` in `src/kernel/node/fs.ts`: the file gets the text, and no temp file stays in its folder.

import { expect, test } from "bun:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeAtomic } from "../../src/kernel/node/fs.ts";

const folder = (): string => fs.mkdtempSync(path.join(os.tmpdir(), "atomic-"));

test("`writeAtomic` replaces the text of a file and leaves only that file in its folder", async () => {
  const dir = folder();
  const file = path.join(dir, "rate-limits.jsonl");
  await Bun.write(file, "old");
  await writeAtomic(file, "new");
  expect(await Bun.file(file).text()).toBe("new");
  expect(fs.readdirSync(dir)).toStrictEqual(["rate-limits.jsonl"]);
});

test("`writeAtomic` fails and leaves no temp file when the folder of the file is not a folder", async () => {
  const dir = folder();
  const blocker = path.join(dir, "blocker");
  await Bun.write(blocker, "x");
  let failed = false;
  try {
    await writeAtomic(path.join(blocker, "rate-limits.jsonl"), "new");
  } catch {
    failed = true;
  }
  expect(failed).toBe(true);
  expect(fs.readdirSync(dir)).toStrictEqual(["blocker"]);
});
