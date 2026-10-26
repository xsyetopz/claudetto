// Pins `dev/eval-variant.ts`: the temporary `git worktree` is removed at the end of each run.
// The results tests are in `results-copy.test.ts`, so each file stays inside the time bound of a test file.

import { expect, test } from "bun:test";
import fs from "node:fs";
import { WORKTREE_TEST_TIMEOUT_MS } from "../../tools/limits.ts";
import { run, setUp, worktrees } from "./fixture-repo.ts";

const EXITS: [string, number][] = [
  ["succeeds", 0],
  ["fails", 1],
];
for (const [name, exit] of EXITS) {
  test(
    `the worktree is removed when the eval ${name}`,
    async () => {
      const s = await setUp();
      const r = run(s, "HEAD", exit);
      expect(r.status, r.stderr).toBe(exit);
      expect(fs.readdirSync(s.tmp)).toStrictEqual([]);
      expect(worktrees(s).length).toBe(1);
    },
    WORKTREE_TEST_TIMEOUT_MS,
  );
}

test(
  "a ref that does not exist stops the tool and leaves no worktree",
  async () => {
    const s = await setUp();
    const r = run(s, "no-such-ref", 0);
    expect(r.status).toBe(1);
    expect(worktrees(s).length).toBe(1);
  },
  WORKTREE_TEST_TIMEOUT_MS,
);
