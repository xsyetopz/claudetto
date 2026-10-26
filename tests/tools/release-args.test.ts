// `tools/release.ts` makes and pushes tags, so each argument other than `--dry-run` stops it before the first command.
// The test with the script stops at the argument check, so it runs no `claude` and no `git` command.

import { expect, test } from "bun:test";
import path from "node:path";
import { dryRunOf } from "../../tools/release.ts";
import { REPO } from "../support/repo.ts";

test("only `--dry-run` or no argument is a release argument list (review row 124)", () => {
  expect(dryRunOf([])).toBe(false);
  expect(dryRunOf(["--dry-run"])).toBe(true);
  expect(dryRunOf(["--dryrun"])).toBe(null);
  expect(dryRunOf(["x", "--dry-run"])).toBe(null);
  expect(dryRunOf(["--dry-run", "--dry-run"])).toBe(null);
});

test("a mistyped dry run exits 2 with the usage line (review row 124)", () => {
  const run = Bun.spawnSync(
    [process.execPath, path.join(REPO, "tools/release.ts"), "--dryrun"],
    { cwd: REPO, stdout: "pipe", stderr: "pipe" },
  );
  expect(run.exitCode).toBe(2);
  expect(run.stderr.toString()).toContain("tools/release.ts");
  expect(run.stdout.toString()).toBe("");
});
