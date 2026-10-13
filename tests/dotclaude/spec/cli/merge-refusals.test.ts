// `merge`: the refusals before the merge leave the commit, the tree, and the log as they were.

import { expect, test } from "bun:test";
import {
  CHANGES,
  file,
  git,
  packageIn,
  phase,
  plannedChange,
} from "./run-phase.ts";

/** The state that a refused `merge` must leave as it was: the commit, the status, and the log. */
const snapshot = async (root: string): Promise<string> =>
  JSON.stringify([
    git(root, "rev-parse", "HEAD"),
    git(root, "status", "--porcelain"),
    await file(root, `${CHANGES}/c1/events.jsonl`),
  ]);

test("merge refuses a package that is planned or done", async () => {
  for (const root of [await plannedChange(), await packageIn("done")]) {
    const before = await snapshot(root);
    expect((await phase(root, "merge", "P1")).code).toBe(1);
    expect(await snapshot(root)).toBe(before);
  }
});

test.each([
  ["--squash", 2],
  ["nope", 1],
  ["main", 1],
] as const)(
  "merge refuses the branch `%s`, and changes nothing",
  async (name, status) => {
    const root = await packageIn("approved");
    git(root, "branch", "p1");
    const before = await snapshot(root);
    expect((await phase(root, "merge", "P1", name)).code).toBe(status);
    expect(await snapshot(root)).toBe(before);
    expect(() => git(root, "rev-parse", "--verify", "MERGE_HEAD")).toThrow();
  },
);
