// `verify` reads the head once before the command, and a head or a tree that changed during the command fails the verify.

import { describe, expect, test } from "bun:test";
import {
  eventsOf,
  exists,
  git,
  linkedWorktree,
  makeRepo,
  packageIn,
  phase,
} from "./run-phase.ts";

const COMMIT =
  "git -c user.name=t -c user.email=t@t commit -q --allow-empty -m moved";

const lastEvent = async (root: string): Promise<Record<string, unknown>> =>
  (await eventsOf(root, "c1")).at(-1) ?? {};

describe("verify and a command that changes the head or the tree", () => {
  test("a command that moves the head fails the verify with a reason", async () => {
    const root = await packageIn("doing", "c1", COMMIT);
    const before = git(root, "rev-parse", "HEAD");
    const r = await phase(root, "verify", "P1");
    expect(r.code).toBe(1);
    expect(r.err.join("\n")).toContain("head");
    expect(await lastEvent(root)).toMatchObject({
      state: "doing",
      sha: before,
    });
    expect((await lastEvent(root))["verify"]).not.toMatchObject({ exit: 0 });
    expect((await lastEvent(root))["note"]).toContain("head");
  });

  test("a command that leaves a file outside the spec folder fails the verify", async () => {
    const root = await packageIn("doing", "c1", "echo x > stray.txt");
    const r = await phase(root, "verify", "P1");
    expect(r.code).toBe(1);
    expect(r.err.join("\n")).toContain("stray.txt");
    expect(await lastEvent(root)).toMatchObject({ state: "doing" });
    expect((await lastEvent(root))["verify"]).not.toMatchObject({ exit: 0 });
  });

  test("a command that writes in the spec folder still passes", async () => {
    const root = await packageIn(
      "doing",
      "c1",
      "echo x > .dotclaude/spec/scratch.txt",
    );
    expect((await phase(root, "verify", "P1")).code).toBe(0);
    expect(await lastEvent(root)).toMatchObject({ state: "verified" });
  });
});

describe("verify --in", () => {
  test("a folder that is another repository is refused, and the command does not run", async () => {
    const root = await packageIn("doing", "c1", "touch ran");
    const other = makeRepo();
    const before = await eventsOf(root, "c1");
    const r = await phase(root, "verify", "P1", "--in", other);
    expect(r.code).toBe(1);
    expect(exists(other, "ran")).toBe(false);
    expect(await eventsOf(root, "c1")).toEqual(before);
  });

  test("a linked worktree of the repository is accepted", async () => {
    const root = await packageIn("doing", "c1", "true");
    const wt = linkedWorktree(root, "work");
    expect((await phase(root, "verify", "P1", "--in", wt)).code).toBe(0);
  });
});
