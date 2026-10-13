import { describe, expect, test } from "bun:test";
import {
  CHANGES,
  changeFile,
  eventsOf,
  exists,
  file,
  frontKey,
  linkedWorktree,
  makeRepo,
  phase,
  pkgFile,
  write,
} from "./run-phase.ts";

const states = async (root: string, id: string): Promise<unknown[]> =>
  (await eventsOf(root, id)).map((e) => e["state"]);

describe("specify creates a change", () => {
  test("a medium change by default, in draft", async () => {
    const root = makeRepo();
    const r = await phase(root, "specify", "c1", "--json");
    expect(r.code).toBe(0);
    expect(r.json).toEqual({
      command: "specify",
      change: "c1",
      from: "none",
      to: "draft",
    });
    expect(await frontKey(root, changeFile("c1"), "size")).toBe("medium");
    expect(await frontKey(root, changeFile("c1"), "status")).toBe("draft");
    expect(exists(root, `${CHANGES}/c1/requirements/c1.md`)).toBe(true);
    expect(exists(root, `${CHANGES}/c1/design.md`)).toBe(false);
    expect(await states(root, "c1")).toEqual(["draft"]);
  });

  test("a trivial change keeps its requirements in change.md", async () => {
    const root = makeRepo();
    expect((await phase(root, "specify", "c1", "--size", "trivial")).code).toBe(
      0,
    );
    expect(exists(root, `${CHANGES}/c1/requirements`)).toBe(false);
    expect(await file(root, changeFile("c1"))).toContain("REQ-1");
  });

  test("a large change has a design file", async () => {
    const root = makeRepo();
    await phase(root, "specify", "c1", "--size", "large");
    expect(exists(root, `${CHANGES}/c1/design.md`)).toBe(true);
    expect(await frontKey(root, changeFile("c1"), "size")).toBe("large");
  });

  test("--capability names the requirements file", async () => {
    const root = makeRepo();
    await phase(root, "specify", "c1", "--capability", "api");
    expect(exists(root, `${CHANGES}/c1/requirements/api.md`)).toBe(true);
    expect(exists(root, `${CHANGES}/c1/requirements/c1.md`)).toBe(false);
  });

  test("the next change takes the next free requirement ID", async () => {
    const root = makeRepo();
    await phase(root, "specify", "c1", "--size", "trivial");
    await phase(root, "specify", "c2", "--size", "trivial");
    expect(await file(root, changeFile("c1"))).toContain("### REQ-1:");
    expect(await file(root, changeFile("c2"))).toContain("### REQ-2:");
  });

  test.each([
    [["c1", "--size", "huge"], 2],
    [["c1", "--capability", "bad name"], 2],
    [["bad id"], 2],
    [["archive"], 2],
    [[], 2],
    [["c1", "extra"], 2],
    [["c1", "--nope"], 2],
  ])("wrong arguments %p exit %p and create nothing", async (args, code) => {
    const root = makeRepo();
    expect((await phase(root, "specify", ...args)).code).toBe(code);
    expect(exists(root, CHANGES)).toBe(false);
  });

  test("a folder with no events.jsonl is refused and stays", async () => {
    const root = makeRepo();
    await write(root, changeFile("c1"), "keep\n");
    expect((await phase(root, "specify", "c1")).code).toBe(1);
    expect(await file(root, changeFile("c1"))).toBe("keep\n");
    expect(exists(root, `${CHANGES}/c1/events.jsonl`)).toBe(false);
  });
});

describe("specify on a change that exists", () => {
  test("a trivial change goes to planned with the package P1", async () => {
    const root = makeRepo();
    await phase(root, "specify", "c1", "--size", "trivial");
    const r = await phase(root, "specify", "c1", "--json");
    expect(r.code).toBe(0);
    expect(r.json).toMatchObject({
      command: "specify",
      change: "c1",
      from: "draft",
      to: "planned",
    });
    expect(await states(root, "c1")).toEqual(["draft", "specified", "planned"]);
    expect(await frontKey(root, changeFile("c1"), "status")).toBe("planned");
    expect(await frontKey(root, pkgFile("c1"), "status")).toBe("planned");
    expect(
      JSON.parse(await frontKey(root, pkgFile("c1"), "satisfies")),
    ).toEqual(["REQ-1"]);
  });

  test("a medium change satisfies each requirement of its file", async () => {
    const root = makeRepo();
    await phase(root, "specify", "c1");
    await write(
      root,
      `${CHANGES}/c1/requirements/c1.md`,
      `${await file(root, `${CHANGES}/c1/requirements/c1.md`)}\n### REQ-2: Second\n\nSay it, with MUST.\n`,
    );
    expect((await phase(root, "specify", "c1")).code).toBe(0);
    expect(
      JSON.parse(await frontKey(root, pkgFile("c1"), "satisfies")),
    ).toEqual(["REQ-1", "REQ-2"]);
  });

  test("a large change stops at specified, and a third call is refused", async () => {
    const root = makeRepo();
    await phase(root, "specify", "c1", "--size", "large");
    const r = await phase(root, "specify", "c1", "--json");
    expect(r.code).toBe(0);
    expect(r.json).toMatchObject({ from: "draft", to: "specified" });
    expect(await frontKey(root, changeFile("c1"), "status")).toBe("specified");
    expect(exists(root, pkgFile("c1"))).toBe(false);
    expect((await phase(root, "specify", "c1")).code).toBe(1);
    expect(await states(root, "c1")).toEqual(["draft", "specified"]);
  });

  test("a planned change is refused and stays planned", async () => {
    const root = makeRepo();
    await phase(root, "specify", "c1", "--size", "trivial");
    await phase(root, "specify", "c1");
    expect((await phase(root, "specify", "c1")).code).toBe(1);
    expect(await states(root, "c1")).toEqual(["draft", "specified", "planned"]);
  });

  test("--size on a change that exists exits 2", async () => {
    const root = makeRepo();
    await phase(root, "specify", "c1");
    expect((await phase(root, "specify", "c1", "--size", "large")).code).toBe(
      2,
    );
    expect(await states(root, "c1")).toEqual(["draft"]);
  });

  test.each([
    ["a bad requirement heading", "\n### REQ-x: Bad\n\nText.\n"],
    ["an open marker", "\n[NEEDS CLARIFICATION: which port?]\n"],
  ])("%s refuses, and the change stays in draft", async (_name, extra) => {
    const root = makeRepo();
    await phase(root, "specify", "c1", "--size", "trivial");
    await write(
      root,
      changeFile("c1"),
      (await file(root, changeFile("c1"))) + extra,
    );
    expect((await phase(root, "specify", "c1")).code).toBe(1);
    expect(await states(root, "c1")).toEqual(["draft"]);
    expect(await frontKey(root, changeFile("c1"), "status")).toBe("draft");
    expect(exists(root, pkgFile("c1"))).toBe(false);
  });

  test("a change with no requirement is refused", async () => {
    const root = makeRepo();
    await phase(root, "specify", "c1", "--size", "trivial");
    await write(
      root,
      changeFile("c1"),
      (await file(root, changeFile("c1"))).replace(/### REQ-1:[\s\S]*$/, ""),
    );
    expect((await phase(root, "specify", "c1")).code).toBe(1);
    expect(await states(root, "c1")).toEqual(["draft"]);
  });
});

describe("specify on a short change with a package file", () => {
  test.each(["trivial", "medium"])(
    "a %s change with packages/P1.md is refused and stays in draft",
    async (size) => {
      const root = makeRepo();
      await phase(root, "specify", "c1", "--size", size);
      await write(root, pkgFile("c1"), "kept\n");
      const r = await phase(root, "specify", "c1");
      expect(r.code).toBe(1);
      expect(r.err.join("\n")).toContain("exists already");
      expect(await states(root, "c1")).toEqual(["draft"]);
      expect(await frontKey(root, changeFile("c1"), "status")).toBe("draft");
      expect(await file(root, pkgFile("c1"))).toBe("kept\n");
    },
  );
});

describe("plan", () => {
  const largeChange = async (): Promise<string> => {
    const root = makeRepo();
    await phase(root, "specify", "c1", "--size", "large");
    await phase(root, "specify", "c1");
    return root;
  };
  /** A package file for the large change, with the `satisfies` list `satisfies`. */
  const addPackage = async (
    root: string,
    satisfies: string[],
  ): Promise<void> => {
    const medium = makeRepo();
    await phase(medium, "specify", "m", "--size", "trivial");
    await phase(medium, "specify", "m");
    await write(
      root,
      pkgFile("c1"),
      (await file(medium, pkgFile("m")))
        .replace(/^satisfies: .*$/m, `satisfies: ${JSON.stringify(satisfies)}`)
        .replace("Implement m", "Implement c1"),
    );
  };

  test("moves a specified change with covering packages to planned", async () => {
    const root = await largeChange();
    await addPackage(root, ["REQ-1"]);
    const r = await phase(root, "plan", "c1", "--json");
    expect(r.code).toBe(0);
    expect(r.json).toEqual({
      command: "plan",
      change: "c1",
      from: "specified",
      to: "planned",
    });
    expect(await frontKey(root, changeFile("c1"), "status")).toBe("planned");
    expect(await states(root, "c1")).toEqual(["draft", "specified", "planned"]);
  });

  test("a change with no package file is refused and stays specified", async () => {
    const root = await largeChange();
    expect((await phase(root, "plan", "c1")).code).toBe(1);
    expect(await states(root, "c1")).toEqual(["draft", "specified"]);
    expect(await frontKey(root, changeFile("c1"), "status")).toBe("specified");
  });

  test.each([
    ["a requirement that no package satisfies", ["REQ-9"]],
    ["a satisfies entry that is no requirement", ["REQ-1", "REQ-9"]],
  ])("%s is refused", async (_name, satisfies) => {
    const root = await largeChange();
    await addPackage(root, satisfies);
    expect((await phase(root, "plan", "c1")).code).toBe(1);
    expect(await states(root, "c1")).toEqual(["draft", "specified"]);
  });

  test("a package that fails the format check is refused", async () => {
    const root = await largeChange();
    await write(root, pkgFile("c1"), "not a package\n");
    const r = await phase(root, "plan", "c1");
    expect(r.code).toBe(1);
    expect(r.err.length).toBeGreaterThan(0);
    expect(await states(root, "c1")).toEqual(["draft", "specified"]);
  });

  test("a change in draft, and a change that does not exist, are refused", async () => {
    const root = makeRepo();
    await phase(root, "specify", "c1", "--size", "large");
    expect((await phase(root, "plan", "c1")).code).toBe(1);
    expect((await phase(root, "plan", "none")).code).toBe(1);
    expect(await states(root, "c1")).toEqual(["draft"]);
  });

  test("wrong arguments exit 2", async () => {
    const root = makeRepo();
    expect((await phase(root, "plan")).code).toBe(2);
    expect((await phase(root, "plan", "a", "b")).code).toBe(2);
  });
});

describe("a linked worktree", () => {
  test("no phase command changes a state there", async () => {
    const root = makeRepo();
    const wt = linkedWorktree(root, "wt");
    const calls: string[][] = [
      ["specify", "c1"],
      ["plan", "c1"],
      ["implement", "P1"],
      ["verify", "P1"],
      ["review", "P1", "approve"],
      ["merge", "P1"],
      ["accept", "c1"],
      ["archive", "c1"],
      ["block", "P1", "--note", "n"],
      ["drop", "P1", "--reason", "r"],
    ];
    for (const [name, ...args] of calls)
      expect((await phase(wt, name as string, ...args)).code).toBe(1);
    expect(exists(wt, CHANGES)).toBe(false);
  });
});
