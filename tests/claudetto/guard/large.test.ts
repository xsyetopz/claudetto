// The file-print deny for a file too large to read (design D22, `$.fs.read` limit).
// The pure `printReason` gets `Infinity` from its `count`, and the read helper gets a file over `READ_MAX_BYTES`.
// A `.log` name marks a generated file, which the check allows, so the tests use a `.txt` name.
// No guarded command runs, and the test writes its file under the temp folder only.

import { expect, test } from "bun:test";
import path from "node:path";
import { printReason } from "../../../plugins/claudetto/slices/guard/domain/deny.ts";
import { toSlash } from "../../../plugins/claudetto/slices/guard/domain/paths.ts";
import { READ_MAX_BYTES } from "../../../plugins/claudetto/slices/guard/limits.ts";
import { tmpDir } from "../../support/repo.ts";
import { denyOf } from "./support.ts";

const CWD = "/work/app";
const tooLarge = async () => Infinity;

test("a tail print of a too large file names the file with no range", async () => {
  const reason = await printReason("tail -n 3 big.txt", CWD, tooLarge);
  expect(reason).toContain("/work/app/big.txt");
  expect(reason).not.toContain("`offset`");
  expect(reason).not.toContain("Infinity");
});

test("a cat print of a too large file is denied", async () => {
  const reason = await printReason("cat big.txt", CWD, tooLarge);
  expect(reason).toContain("/work/app/big.txt");
});

test("the read helper denies a file over `READ_MAX_BYTES` by its size", async () => {
  const file = path.join(tmpDir("reads-large"), "big.txt");
  await Bun.write(file, "a\n".repeat(READ_MAX_BYTES / 2 + 1));
  // The name is relative to `cwd`, so the print rule reads it as a simple command.
  const reason = await denyOf("tail -n 3 big.txt", path.dirname(file));
  expect(reason).toContain(toSlash(file));
  expect(reason).not.toContain("`offset`");
});
