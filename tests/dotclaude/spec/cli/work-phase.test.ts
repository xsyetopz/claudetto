import { describe, expect, test } from "bun:test";
import {
  changeFile,
  commitFile,
  eventsOf,
  file,
  frontKey,
  git,
  linkedWorktree,
  makeRepo,
  packageIn,
  phase,
  pkgFile,
  plannedChange,
  write,
} from "./run-phase.ts";

const lastEvent = async (
  root: string,
  pkg = "P1",
): Promise<Record<string, unknown>> =>
  (await eventsOf(root, "c1")).filter((e) => e["package"] === pkg).at(-1) ?? {};
const status = async (root: string, pkg = "P1"): Promise<string> =>
  await frontKey(root, pkgFile("c1", pkg), "status");
const changeStates = async (root: string): Promise<unknown[]> =>
  (await eventsOf(root, "c1"))
    .filter((e) => e["package"] === undefined)
    .map((e) => e["state"]);

describe("implement", () => {
  test("starts a planned package and moves the change to implementing", async () => {
    const root = await plannedChange();
    const r = await phase(root, "implement", "P1", "--json");
    expect(r.code).toBe(0);
    expect(r.json).toEqual({
      command: "implement",
      change: "c1",
      package: "P1",
      from: "planned",
      to: "doing",
    });
    expect(await status(root)).toBe("doing");
    expect(await frontKey(root, changeFile("c1"), "status")).toBe(
      "implementing",
    );
    expect((await changeStates(root)).at(-1)).toBe("implementing");
  });

  test("an open marker refuses, and the package stays planned", async () => {
    const root = await plannedChange();
    await write(
      root,
      changeFile("c1"),
      `${await file(root, changeFile("c1"))}\n[NEEDS CLARIFICATION: why?]\n`,
    );
    expect((await phase(root, "implement", "P1")).code).toBe(1);
    expect(await status(root)).toBe("planned");
    expect(await lastEvent(root)).toEqual({});
  });

  test("a dependency that is not done refuses", async () => {
    const root = await plannedChange();
    await write(
      root,
      pkgFile("c1", "P2"),
      (await file(root, pkgFile("c1")))
        .replace("id: P1", "id: P2")
        .replace(/^deps: .*$/m, 'deps: ["P1"]'),
    );
    expect((await phase(root, "implement", "P2")).code).toBe(1);
    expect(await lastEvent(root, "P2")).toEqual({});
    await phase(root, "implement", "P1");
    expect((await phase(root, "implement", "P2")).code).toBe(1);
  });

  test("a dependency that is done lets the package start", async () => {
    const root = await packageIn("done");
    await write(
      root,
      pkgFile("c1", "P2"),
      (await file(root, pkgFile("c1")))
        .replace("id: P1", "id: P2")
        .replace(/^deps: .*$/m, 'deps: ["P1"]')
        .replace(/^status: .*$/m, "status: planned"),
    );
    expect((await phase(root, "implement", "P2")).code).toBe(0);
    expect(await status(root, "P2")).toBe("doing");
  });

  test("a canceled change refuses", async () => {
    const root = await plannedChange();
    await phase(root, "drop", "c1", "--reason", "no");
    expect((await phase(root, "implement", "P1")).code).toBe(1);
    expect(await status(root)).toBe("canceled");
  });

  test("a done package, and an unknown package, are refused", async () => {
    const root = await packageIn("done");
    expect((await phase(root, "implement", "P1")).code).toBe(1);
    expect((await phase(root, "implement", "P9")).code).toBe(1);
    expect(await status(root)).toBe("done");
  });

  test.each([
    [[]],
    [["P1", "P2"]],
    [["P1", "--decision", "maybe"]],
    [["P1", "--note"]],
    [["P1", "--nope", "x"]],
  ])("wrong arguments %p exit 2", async (args) => {
    const root = await plannedChange();
    expect((await phase(root, "implement", ...args)).code).toBe(2);
    expect(await status(root)).toBe("planned");
  });

  test("--note is in the event", async () => {
    const root = await plannedChange();
    await phase(root, "implement", "P1", "--note", "start");
    expect((await lastEvent(root))["note"]).toBe("start");
  });
});

describe("the --decision rule", () => {
  test("after a failed verify, implement needs a decision", async () => {
    const root = await packageIn("doing", "c1", "false");
    const failed = await phase(root, "verify", "P1");
    expect(failed.code).toBe(1);
    const before = (await eventsOf(root, "c1")).length;
    expect((await phase(root, "implement", "P1")).code).toBe(1);
    expect(await eventsOf(root, "c1")).toHaveLength(before);
    const r = await phase(
      root,
      "implement",
      "P1",
      "--decision",
      "fix-code",
      "--json",
    );
    expect(r.code).toBe(0);
    expect(r.json).toMatchObject({ from: "doing", to: "doing" });
    expect((await lastEvent(root))["decision"]).toBe("fix-code");
    expect(await status(root)).toBe("doing");
  });

  test("after a reject, implement needs a decision", async () => {
    const root = await packageIn("verified");
    await phase(
      root,
      "review",
      "P1",
      "reject",
      "--finding",
      "bad",
      "--decision",
      "revise-spec",
    );
    expect(await status(root)).toBe("doing");
    expect((await phase(root, "implement", "P1")).code).toBe(1);
    expect(
      (await phase(root, "implement", "P1", "--decision", "revise-spec")).code,
    ).toBe(0);
    expect((await lastEvent(root))["decision"]).toBe("revise-spec");
  });
});

describe("verify", () => {
  test("a passing command moves the package to verified with the head SHA", async () => {
    const root = await packageIn("doing");
    const r = await phase(root, "verify", "P1", "--json");
    expect(r.code).toBe(0);
    expect(r.json).toMatchObject({
      command: "verify",
      change: "c1",
      package: "P1",
      from: "doing",
      to: "verified",
      sha: git(root, "rev-parse", "HEAD"),
      verify: { command: "true", exit: 0 },
    });
    expect(await status(root)).toBe("verified");
  });

  test("a failing command exits 1, records the exit status, and stays doing", async () => {
    const root = await packageIn("doing", "c1", "echo boom; exit 3");
    const r = await phase(root, "verify", "P1");
    expect(r.code).toBe(1);
    expect(r.err.join("\n")).toContain("boom");
    expect(await lastEvent(root)).toMatchObject({
      state: "doing",
      verify: { exit: 3 },
    });
    expect(await status(root)).toBe("doing");
  });

  test("--json prints one line and no output tail", async () => {
    const root = await packageIn("doing", "c1", "echo boom; exit 1");
    const r = await phase(root, "verify", "P1", "--json");
    expect(r.code).toBe(1);
    expect(r.out).toHaveLength(1);
    expect(r.err).toEqual([]);
    expect(r.json).toMatchObject({ to: "doing" });
  });

  test.each(["planned", "verified", "approved", "done"] as const)(
    "a package in %s is refused",
    async (state) => {
      const root =
        state === "planned" ? await plannedChange() : await packageIn(state);
      const before = (await eventsOf(root, "c1")).length;
      expect((await phase(root, "verify", "P1")).code).toBe(1);
      expect(await eventsOf(root, "c1")).toHaveLength(before);
    },
  );

  test("--in runs the command in that folder and records its head", async () => {
    const root = await packageIn("doing", "c1", "test -f marker.txt");
    expect((await phase(root, "verify", "P1")).code).toBe(1);
    const wt = linkedWorktree(root, "feat");
    const sha = commitFile(wt, "marker.txt");
    const r = await phase(root, "verify", "P1", "--in", wt, "--json");
    expect(r.code).toBe(0);
    expect(r.json["sha"]).toBe(sha);
    expect(sha).not.toBe(git(root, "rev-parse", "HEAD"));
    expect(await status(root)).toBe("verified");
  });

  test("a repository with no commit is refused", async () => {
    const root = makeRepo(false);
    await phase(root, "specify", "c1", "--size", "trivial");
    await phase(root, "specify", "c1");
    await phase(root, "implement", "P1");
    expect((await phase(root, "verify", "P1")).code).toBe(1);
    expect(await status(root)).toBe("doing");
  });

  test("wrong arguments exit 2", async () => {
    const root = await packageIn("doing");
    expect((await phase(root, "verify")).code).toBe(2);
    expect((await phase(root, "verify", "P1", "--in")).code).toBe(2);
  });
});

describe("review", () => {
  test("approve records the SHA of the last verify", async () => {
    const root = await packageIn("verified");
    const r = await phase(root, "review", "P1", "approve", "--json");
    expect(r.code).toBe(0);
    expect(r.json).toMatchObject({
      command: "review",
      from: "verified",
      to: "approved",
      verdict: "approve",
      sha: git(root, "rev-parse", "HEAD"),
    });
    expect(await status(root)).toBe("approved");
  });

  test("approve after a new verify records the new SHA", async () => {
    const root = await packageIn("verified");
    await phase(
      root,
      "review",
      "P1",
      "reject",
      "--finding",
      "f",
      "--decision",
      "fix-code",
    );
    await phase(root, "implement", "P1", "--decision", "fix-code");
    const sha = commitFile(root, "new.txt");
    await phase(root, "verify", "P1");
    const r = await phase(root, "review", "P1", "approve", "--json");
    expect(r.code).toBe(0);
    expect(r.json["sha"]).toBe(sha);
  });

  test.each(["planned", "doing", "approved", "done"] as const)(
    "a package in %s is not reviewed",
    async (state) => {
      const root =
        state === "planned" ? await plannedChange() : await packageIn(state);
      const before = (await eventsOf(root, "c1")).length;
      expect((await phase(root, "review", "P1", "approve")).code).toBe(1);
      expect(await eventsOf(root, "c1")).toHaveLength(before);
    },
  );

  test("reject moves the package back to doing with findings and decision", async () => {
    const root = await packageIn("verified");
    const r = await phase(
      root,
      "review",
      "P1",
      "reject",
      "--finding",
      "one",
      "--finding",
      "two",
      "--decision",
      "fix-code",
      "--json",
    );
    expect(r.code).toBe(0);
    expect(r.json).toMatchObject({
      from: "verified",
      to: "doing",
      verdict: "reject",
      findings: ["one", "two"],
      decision: "fix-code",
    });
    expect(await status(root)).toBe("doing");
  });

  test.each([
    ["no finding", ["--decision", "fix-code"]],
    ["no decision", ["--finding", "x"]],
    ["a blank finding", ["--finding", " ", "--decision", "fix-code"]],
  ])(
    "reject with %s is refused and the package stays verified",
    async (_n, flags) => {
      const root = await packageIn("verified");
      expect((await phase(root, "review", "P1", "reject", ...flags)).code).toBe(
        1,
      );
      expect(await status(root)).toBe("verified");
      expect((await lastEvent(root))["state"]).toBe("verified");
    },
  );

  test.each([
    [["P1"]],
    [["P1", "maybe"]],
    [["P1", "approve", "x"]],
    [["P1", "reject", "--decision", "later"]],
  ])("wrong arguments %p exit 2", async (args) => {
    const root = await packageIn("verified");
    expect((await phase(root, "review", ...args)).code).toBe(2);
    expect(await status(root)).toBe("verified");
  });
});

describe("block", () => {
  test.each(["planned", "doing", "verified", "approved"] as const)(
    "blocks a package in %s with the note",
    async (state) => {
      const root =
        state === "planned" ? await plannedChange() : await packageIn(state);
      const r = await phase(root, "block", "P1", "--note", "wait", "--json");
      expect(r.code).toBe(0);
      expect(r.json).toMatchObject({
        command: "block",
        from: state,
        to: "blocked",
        note: "wait",
      });
      expect(await status(root)).toBe("blocked");
    },
  );

  test("implement from blocked needs a note", async () => {
    const root = await packageIn("doing");
    await phase(root, "block", "P1", "--note", "wait");
    expect((await phase(root, "implement", "P1")).code).toBe(1);
    expect(await status(root)).toBe("blocked");
    expect((await phase(root, "implement", "P1", "--note", "go")).code).toBe(0);
    expect(await status(root)).toBe("doing");
  });

  test("a done package, and a blocked package, are refused", async () => {
    const root = await packageIn("done");
    expect((await phase(root, "block", "P1", "--note", "n")).code).toBe(1);
    expect(await status(root)).toBe("done");
    const other = await plannedChange();
    await phase(other, "block", "P1", "--note", "n");
    expect((await phase(other, "block", "P1", "--note", "n")).code).toBe(1);
  });

  test.each([
    [["P1"]],
    [["P1", "--note", " "]],
    [[]],
    [["P1", "x", "--note", "n"]],
  ])("wrong arguments %p exit 2", async (args) => {
    const root = await plannedChange();
    expect((await phase(root, "block", ...args)).code).toBe(2);
    expect(await status(root)).toBe("planned");
  });
});

describe("drop", () => {
  test("cancels a package with the reason", async () => {
    const root = await packageIn("doing");
    const r = await phase(root, "drop", "P1", "--reason", "no need", "--json");
    expect(r.code).toBe(0);
    expect(r.json).toMatchObject({
      command: "drop",
      package: "P1",
      from: "doing",
      to: "canceled",
      note: "no need",
    });
    expect(await status(root)).toBe("canceled");
  });

  test("a canceled package does not move again", async () => {
    const root = await packageIn("doing");
    await phase(root, "drop", "P1", "--reason", "r");
    for (const args of [
      ["implement", "P1"],
      ["block", "P1", "--note", "n"],
      ["drop", "P1", "--reason", "r"],
    ])
      expect(
        (await phase(root, args[0] as string, ...args.slice(1))).code,
      ).toBe(1);
    expect(await status(root)).toBe("canceled");
  });

  test("a done package is refused", async () => {
    const root = await packageIn("done");
    expect((await phase(root, "drop", "P1", "--reason", "r")).code).toBe(1);
    expect(await status(root)).toBe("done");
  });

  test("a name that is a change cancels the change", async () => {
    const root = await plannedChange();
    const r = await phase(root, "drop", "c1", "--reason", "stop", "--json");
    expect(r.code).toBe(0);
    expect(r.json).toMatchObject({
      change: "c1",
      from: "planned",
      to: "canceled",
      note: "stop",
    });
    expect(await frontKey(root, changeFile("c1"), "status")).toBe("canceled");
    expect(await status(root)).toBe("canceled");
  });

  test("a canceled change cannot be dropped again", async () => {
    const root = await plannedChange();
    await phase(root, "drop", "c1", "--reason", "stop");
    expect((await phase(root, "drop", "c1", "--reason", "again")).code).toBe(1);
  });

  test.each([[["P1"]], [["P1", "--reason", " "]], [[]]])(
    "wrong arguments %p exit 2",
    async (args) => {
      const root = await plannedChange();
      expect((await phase(root, "drop", ...args)).code).toBe(2);
      expect(await status(root)).toBe("planned");
    },
  );
});
