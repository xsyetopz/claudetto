import { describe, expect, test } from "bun:test";
import {
  CHANGES,
  changeFile,
  commitFile,
  eventsOf,
  exists,
  file,
  frontKey,
  git,
  makeRepo,
  packageIn,
  phase,
  pkgFile,
  plannedChange,
  setVerify,
  write,
} from "./run-phase.ts";

const SPECS = ".dotclaude/spec/specs";
const ARCHIVED = `${CHANGES}/archive/2026-10-13-c1`;
const status = async (root: string): Promise<string> =>
  await frontKey(root, pkgFile("c1"), "status");
const changeStatus = async (root: string): Promise<string> =>
  await frontKey(root, changeFile("c1"), "status");

/** A repository with `P1` approved on the branch `feat`, which has one commit on top of `main`. The checkout is `main`. */
const approvedOnBranch = async (): Promise<{ root: string; sha: string }> => {
  const root = await plannedChange("c1", "test -f feature.txt");
  git(root, "checkout", "-q", "-b", "feat");
  const sha = await commitFile(root, "feature.txt");
  await phase(root, "implement", "P1");
  await phase(root, "verify", "P1");
  await phase(root, "review", "P1", "approve");
  git(root, "checkout", "-q", "main");
  return { root, sha };
};

describe("the short path of a trivial change", () => {
  test("specify twice, implement, verify, review, merge, accept, archive", async () => {
    const root = makeRepo();
    const codes: number[] = [];
    const steps: string[][] = [
      ["specify", "c1", "--size", "trivial"],
      ["specify", "c1"],
    ];
    for (const [name, ...args] of steps)
      codes.push((await phase(root, name as string, ...args)).code);
    await setVerify(root, "c1", "true");
    const rest: string[][] = [
      ["implement", "P1"],
      ["verify", "P1"],
      ["review", "P1", "approve"],
      ["merge", "P1"],
      ["accept", "c1"],
      ["archive", "c1"],
    ];
    for (const [name, ...args] of rest)
      codes.push((await phase(root, name as string, ...args)).code);
    expect(codes).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
    expect(exists(root, `${CHANGES}/c1`)).toBe(false);
    const log = await eventsOf(root, "archive/2026-10-13-c1");
    expect(log.map((e) => `${e["package"] ?? "-"}:${e["state"]}`)).toEqual([
      "-:draft",
      "-:specified",
      "-:planned",
      "-:implementing",
      "P1:doing",
      "P1:verified",
      "P1:approved",
      "P1:done",
      "-:accepted",
      "-:archived",
    ]);
    expect(await file(root, `${SPECS}/c1.md`)).toContain("### REQ-1:");
  });
});

describe("merge", () => {
  test("an approved package whose SHA is in HEAD becomes done and is committed", async () => {
    const root = await packageIn("approved");
    const r = await phase(root, "merge", "P1", "--json");
    expect(r.code).toBe(0);
    expect(r.json).toMatchObject({
      command: "merge",
      change: "c1",
      package: "P1",
      from: "approved",
      to: "done",
      sha: git(root, "rev-parse", "HEAD~1"),
    });
    expect(await status(root)).toBe("done");
    expect(git(root, "status", "--porcelain", "--untracked-files=no")).toBe("");
    expect(git(root, "ls-files", `${CHANGES}/c1`)).toContain("events.jsonl");
  });

  test("with a branch it merges the branch when its head is the approved SHA", async () => {
    const { root, sha } = await approvedOnBranch();
    expect(exists(root, "feature.txt")).toBe(false);
    const r = await phase(root, "merge", "P1", "feat", "--json");
    expect(r.code).toBe(0);
    expect(r.json).toMatchObject({ to: "done", sha });
    expect(exists(root, "feature.txt")).toBe(true);
    expect(await status(root)).toBe("done");
  });

  test("a branch head with another SHA is refused and nothing changes", async () => {
    const { root } = await approvedOnBranch();
    git(root, "checkout", "-q", "feat");
    await commitFile(root, "later.txt");
    git(root, "checkout", "-q", "main");
    const main = git(root, "rev-parse", "HEAD");
    const events = (await eventsOf(root, "c1")).length;
    expect((await phase(root, "merge", "P1", "feat")).code).toBe(1);
    expect(await status(root)).toBe("approved");
    expect(await eventsOf(root, "c1")).toHaveLength(events);
    expect(git(root, "rev-parse", "HEAD")).toBe(main);
    expect(exists(root, "feature.txt")).toBe(false);
  });

  test("with no branch, a HEAD that lacks the approved SHA is refused", async () => {
    const { root } = await approvedOnBranch();
    expect((await phase(root, "merge", "P1")).code).toBe(1);
    expect(await status(root)).toBe("approved");
  });

  test.each([
    ["a name that is no commit", "nope"],
    ["the current branch", "main"],
    ["a name that starts with a dash", "-x"],
  ])("%s is refused", async (_n, branch) => {
    const root = await packageIn("approved");
    expect((await phase(root, "merge", "P1", branch)).code).toBe(1);
    expect(await status(root)).toBe("approved");
  });

  test("a change in a tracked file outside the change folder is refused", async () => {
    const root = await packageIn("approved");
    await commitFile(root, "a.txt");
    await write(root, "a.txt", "changed\n");
    const head = git(root, "rev-parse", "HEAD");
    expect((await phase(root, "merge", "P1")).code).toBe(1);
    expect(await status(root)).toBe("approved");
    expect(git(root, "rev-parse", "HEAD")).toBe(head);
    expect(await file(root, "a.txt")).toBe("changed\n");
  });

  test("a staged change is refused", async () => {
    const root = await packageIn("approved");
    await commitFile(root, "a.txt");
    await write(root, "a.txt", "changed\n");
    git(root, "add", "a.txt");
    expect((await phase(root, "merge", "P1")).code).toBe(1);
    expect(await status(root)).toBe("approved");
  });

  test("a conflict is refused and the package stays approved", async () => {
    const root = await plannedChange("c1", "test -f a.txt");
    git(root, "checkout", "-q", "-b", "feat");
    await commitFile(root, "a.txt", "feat\n");
    await phase(root, "implement", "P1");
    await phase(root, "verify", "P1");
    await phase(root, "review", "P1", "approve");
    git(root, "checkout", "-q", "main");
    await commitFile(root, "a.txt", "main\n");
    const r = await phase(root, "merge", "P1", "feat");
    expect(r.code).toBe(1);
    expect(r.err.join("\n")).toContain("a.txt");
    expect(await status(root)).toBe("approved");
    expect((await eventsOf(root, "c1")).at(-1)?.["state"]).toBe("approved");
  });

  test("a failing just generate is refused and the package stays approved", async () => {
    const root = await packageIn("approved");
    await write(root, "justfile", "generate:\n\tfalse\n");
    git(root, "add", "justfile");
    git(root, "commit", "-q", "-m", "just");
    expect((await phase(root, "merge", "P1")).code).toBe(1);
    expect(await status(root)).toBe("approved");
  });

  test.each(["planned", "doing", "verified", "done"] as const)(
    "a package in %s is refused",
    async (state) => {
      const root =
        state === "planned" ? await plannedChange() : await packageIn(state);
      expect((await phase(root, "merge", "P1")).code).toBe(1);
      expect(await status(root)).toBe(state);
    },
  );

  test("wrong arguments exit 2", async () => {
    const root = await packageIn("approved");
    expect((await phase(root, "merge")).code).toBe(2);
    expect((await phase(root, "merge", "P1", "a", "b")).code).toBe(2);
  });
});

describe("accept", () => {
  test("moves an implementing change with each package done to accepted", async () => {
    const root = await packageIn("done");
    const r = await phase(root, "accept", "c1", "--json");
    expect(r.code).toBe(0);
    expect(r.json).toEqual({
      command: "accept",
      change: "c1",
      from: "implementing",
      to: "accepted",
    });
    expect(await changeStatus(root)).toBe("accepted");
  });

  test("a canceled package counts as closed", async () => {
    const root = await packageIn("doing");
    await phase(root, "drop", "P1", "--reason", "r");
    expect((await phase(root, "accept", "c1")).code).toBe(0);
  });

  test.each(["doing", "verified", "approved"] as const)(
    "a package in %s refuses, and the change stays implementing",
    async (state) => {
      const root = await packageIn(state);
      expect((await phase(root, "accept", "c1")).code).toBe(1);
      expect(await changeStatus(root)).toBe("implementing");
    },
  );

  test("a change with no package event, and a planned change, are refused", async () => {
    const root = await plannedChange();
    expect((await phase(root, "accept", "c1")).code).toBe(1);
    expect(await changeStatus(root)).toBe("planned");
    expect((await phase(root, "accept", "none")).code).toBe(1);
  });

  test("an accepted change is not accepted again", async () => {
    const root = await packageIn("done");
    await phase(root, "accept", "c1");
    expect((await phase(root, "accept", "c1")).code).toBe(1);
  });

  test("wrong arguments exit 2", async () => {
    const root = await packageIn("done");
    expect((await phase(root, "accept")).code).toBe(2);
    expect((await phase(root, "accept", "c1", "x")).code).toBe(2);
  });
});

describe("archive", () => {
  const accepted = async (): Promise<string> => {
    const root = await packageIn("done");
    await phase(root, "accept", "c1");
    return root;
  };

  test("moves the change folder and writes the spec", async () => {
    const root = await accepted();
    const r = await phase(root, "archive", "c1", "--json");
    expect(r.code).toBe(0);
    expect(r.json).toMatchObject({
      command: "archive",
      change: "c1",
      from: "accepted",
      to: "archived",
      specs: [`${SPECS}/c1.md`],
    });
    expect(exists(root, `${CHANGES}/c1`)).toBe(false);
    expect(await frontKey(root, `${ARCHIVED}/change.md`, "status")).toBe(
      "archived",
    );
    expect(await file(root, `${SPECS}/c1.md`)).toContain("### REQ-1:");
  });

  test("a medium change adds each requirements file to the spec of its capability", async () => {
    const root = makeRepo();
    await phase(root, "specify", "c1", "--capability", "api");
    await phase(root, "specify", "c1");
    await setVerify(root, "c1", "true");
    for (const args of [
      ["implement", "P1"],
      ["verify", "P1"],
      ["review", "P1", "approve"],
      ["merge", "P1"],
      ["accept", "c1"],
    ])
      expect(
        (await phase(root, args[0] as string, ...args.slice(1))).code,
      ).toBe(0);
    expect((await phase(root, "archive", "c1")).code).toBe(0);
    expect(await file(root, `${SPECS}/api.md`)).toContain("### REQ-1:");
  });

  test("a requirement is added to a spec that exists", async () => {
    const root = await accepted();
    await write(
      root,
      `${SPECS}/c1.md`,
      "---\nschema: dotclaude-spec/2\nkind: spec\ncapability: c1\n---\n\n# c1\n\n### REQ-7: Old\n\nOld, with MUST.\n",
    );
    expect((await phase(root, "archive", "c1")).code).toBe(0);
    const spec = await file(root, `${SPECS}/c1.md`);
    expect(spec).toContain("### REQ-7:");
    expect(spec).toContain("### REQ-1:");
  });

  test("a requirement ID that the spec has is refused and nothing changes", async () => {
    const root = await accepted();
    const spec =
      "---\nschema: dotclaude-spec/2\nkind: spec\ncapability: c1\n---\n\n# c1\n\n### REQ-1: Old\n\nOld, with MUST.\n";
    await write(root, `${SPECS}/c1.md`, spec);
    expect((await phase(root, "archive", "c1")).code).toBe(1);
    expect(await file(root, `${SPECS}/c1.md`)).toBe(spec);
    expect(exists(root, `${CHANGES}/c1`)).toBe(true);
    expect(await changeStatus(root)).toBe("accepted");
    expect(exists(root, ARCHIVED)).toBe(false);
  });

  test("an archive folder that exists is refused", async () => {
    const root = await accepted();
    await write(root, `${ARCHIVED}/keep.md`, "keep\n");
    expect((await phase(root, "archive", "c1")).code).toBe(1);
    expect(await changeStatus(root)).toBe("accepted");
    expect(exists(root, `${SPECS}/c1.md`)).toBe(false);
  });

  test.each(["planned", "implementing"] as const)(
    "a %s change is refused",
    async (state) => {
      const root =
        state === "planned" ? await plannedChange() : await packageIn("doing");
      expect((await phase(root, "archive", "c1")).code).toBe(1);
      expect(await changeStatus(root)).toBe(state);
      expect(exists(root, `${SPECS}/c1.md`)).toBe(false);
    },
  );

  test("an unknown change is refused, and wrong arguments exit 2", async () => {
    const root = await accepted();
    expect((await phase(root, "archive", "none")).code).toBe(1);
    expect((await phase(root, "archive")).code).toBe(2);
    expect((await phase(root, "archive", "archive")).code).toBe(2);
    expect((await phase(root, "archive", "c1", "x")).code).toBe(2);
  });

  test("the next change takes the next free requirement ID", async () => {
    const root = await accepted();
    await phase(root, "archive", "c1");
    await phase(root, "specify", "c2", "--size", "trivial");
    expect(await file(root, `${CHANGES}/c2/change.md`)).toContain("### REQ-2:");
  });
});
