// Error policy of the file-print deny: an absent file stays allowed, and any other read error is thrown again.
// An unexpected error is a symbolic link that points to itself (`ELOOP`), which the test makes in a folder under `TMPDIR`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { tmpDir } from "../../support/repo.ts";
import { denyOf } from "./support.ts";

const dir = tmpDir("dc-guard-errors");
const absent = path.join(dir, "absent.jsonl");
const loop = path.join(dir, "loop");
fs.symlinkSync(loop, loop);

test("the print check allows a file that is absent and throws for any other read error", async () => {
  // The name is relative to `cwd`.
  const tail = (file: string) =>
    denyOf(`tail -n 5 ${path.basename(file)}`, dir);
  expect(await tail(absent)).toBe(null);
  await expect(tail(loop)).rejects.toThrow(
    expect.objectContaining({ code: "ELOOP" }),
  );
});
