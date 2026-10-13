// A `merge` of one change ignores the uncommitted store files of another change, and does not commit them.

import { describe, expect, test } from "bun:test";
import {
  CHANGES,
  commitFile,
  exists,
  file,
  frontKey,
  git,
  phase,
  pkgFile,
  plannedChange,
  write,
} from "./run-phase.ts";

/** `P1` of `c1` approved on the branch `feat`. `c2` is committed, then its log changes and a new file appears, both uncommitted. */
const withOtherChange = async (): Promise<string> => {
  const root = await plannedChange("c1", "test -f feature.txt");
  await phase(root, "specify", "c2", "--size", "trivial");
  git(root, "add", "--", `${CHANGES}/c2`);
  git(root, "commit", "-q", "-m", "c2", "--", `${CHANGES}/c2`);
  git(root, "checkout", "-q", "-b", "feat");
  commitFile(root, "feature.txt");
  await phase(root, "implement", "P1");
  await phase(root, "verify", "P1");
  await phase(root, "review", "P1", "approve");
  git(root, "checkout", "-q", "main");
  await phase(root, "specify", "c2");
  await write(root, `${CHANGES}/c2/note.md`, "new\n");
  return root;
};

describe("merge with an uncommitted write of another change", () => {
  test("ends done and leaves the files of the other change uncommitted and unchanged", async () => {
    const root = await withOtherChange();
    const log = await file(root, `${CHANGES}/c2/events.jsonl`);
    const before = git(root, "status", "--porcelain", "--", `${CHANGES}/c2`);
    expect(before).not.toBe("");
    const r = await phase(root, "merge", "P1", "feat");
    expect(r.err).toEqual([]);
    expect(r.code).toBe(0);
    expect(await frontKey(root, pkgFile("c1"), "status")).toBe("done");
    expect(exists(root, "feature.txt")).toBe(true);
    expect(git(root, "status", "--porcelain", "--", `${CHANGES}/c2`)).toBe(
      before,
    );
    expect(await file(root, `${CHANGES}/c2/events.jsonl`)).toBe(log);
    const committed = git(root, "show", "--name-only", "--format=", "HEAD");
    expect(committed).not.toContain(`${CHANGES}/c2`);
  });

  test("refuses with a reason when the branch changes the same file, and leaves no half merge", async () => {
    const root = await withOtherChange();
    git(root, "checkout", "-q", "feat");
    commitFile(root, `${CHANGES}/c2/clash.md`, "from the branch\n");
    git(root, "checkout", "-q", "main");
    await write(root, `${CHANGES}/c2/clash.md`, "mine\n");
    const r = await phase(root, "merge", "P1", "feat");
    expect(r.code).toBe(1);
    expect(r.err.length).toBeGreaterThan(0);
    expect(await file(root, `${CHANGES}/c2/clash.md`)).toBe("mine\n");
    expect(await frontKey(root, pkgFile("c1"), "status")).toBe("approved");
    expect(exists(root, ".git/MERGE_HEAD")).toBe(false);
  });
});
