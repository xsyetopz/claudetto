// The read policy of the `asks` test helper: an absent file gives `null` and any other error passes on.
// The test makes a symbolic link that points to itself (`ELOOP`) in a folder under `TMPDIR`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { tmpDir } from "../../support/repo.ts";
import { readText } from "./verdicts.ts";

const dir = tmpDir("dc-asks-reads");
const loop = path.join(dir, "loop");
fs.symlinkSync(loop, loop);

test("the reads give `null` for an absent file and throw any other error", async () => {
  expect(await readText(path.join(dir, "absent.txt"))).toBe(null);
  await expect(readText(loop)).rejects.toThrow(
    expect.objectContaining({ code: "ELOOP" }),
  );
});
