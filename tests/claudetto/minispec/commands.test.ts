// The commands `new`, `list`, `show`, `status`, and `validate`, and the root of a linked worktree.

import { expect, test } from "bun:test";
import {
  findRoot,
  localDate,
} from "../../../plugins/claudetto/slices/minispec/adapters/cli.ts";
import { run } from "../../../plugins/claudetto/slices/minispec/adapters/run.ts";
import {
  context,
  memStore,
  PROPOSAL,
  project,
  ROOT,
  TASKS_OPEN,
} from "./store.ts";

const PIPE = { stdout: false, stderr: false, noColorEnv: undefined };

test("`new` makes the files of a medium change, and a big change adds design and specs", async () => {
  const files = project({});
  const make = async () => context(files);
  const a = await run(["new", "add-export"], make, PIPE);
  expect(a.code).toBe(0);
  const base = "/p/minispec/changes/add-export";
  expect(files.has(`${base}/proposal.md`)).toBe(true);
  expect(files.has(`${base}/tasks.md`)).toBe(true);
  expect(files.has(`${base}/design.md`)).toBe(false);
  const b = await run(
    ["new", "big-one", "--tier", "big", "--capability", "export"],
    make,
    PIPE,
  );
  expect(b.code).toBe(0);
  expect(files.has("/p/minispec/changes/big-one/design.md")).toBe(true);
  expect(files.has("/p/minispec/changes/big-one/specs/export/spec.md")).toBe(
    true,
  );
});

test("`new` refuses a bad name and an existing change, and names the next step", async () => {
  const files = project({ "minispec/changes/x/proposal.md": PROPOSAL });
  const make = async () => context(files);
  const bad = await run(["new", "Bad Name"], make, PIPE);
  expect(bad.code).not.toBe(0);
  expect(bad.err).not.toBe("");
  const dup = await run(["new", "x"], make, PIPE);
  expect(dup.code).toBe(1);
  expect(dup.err).toContain("x");
  const none = await run(["new"], make, PIPE);
  expect(none.code).toBe(2);
});

test("`list` shows the open changes and not the archive, and `--json` gives the names", async () => {
  const files = project({
    "minispec/changes/a/proposal.md": PROPOSAL,
    "minispec/changes/a/tasks.md": TASKS_OPEN,
    "minispec/changes/archive/2026-01-01-old/tasks.md": TASKS_OPEN,
  });
  const make = async () => context(files);
  const r = await run(["list", "--json"], make, PIPE);
  expect(r.code).toBe(0);
  expect(r.out).toContain('"a"');
  expect(r.out).not.toContain("old");
});

test("`show` prints a file of the change and `status` counts the tasks", async () => {
  const files = project({
    "minispec/changes/a/proposal.md": PROPOSAL,
    "minispec/changes/a/tasks.md": TASKS_OPEN,
  });
  const make = async () => context(files);
  const show = await run(["show", "a"], make, PIPE);
  expect(show.code).toBe(0);
  expect(show.out).toContain("Because.");
  const status = await run(["status", "a", "--json"], make, PIPE);
  expect(status.code).toBe(0);
  const data = JSON.stringify(JSON.parse(status.out));
  expect(data).toContain("1.2");
});

test("`validate` passes a good change and refuses a prose check (S9)", async () => {
  const good = project({
    "minispec/changes/a/proposal.md": PROPOSAL,
    "minispec/changes/a/tasks.md": TASKS_OPEN,
  });
  expect(
    (await run(["validate", "a"], async () => context(good), PIPE)).code,
  ).toBe(0);
  const prose = project({
    "minispec/changes/a/proposal.md": PROPOSAL,
    "minispec/changes/a/tasks.md": "- [ ] 1.1 A\n  Check: it works well\n",
  });
  const r = await run(["validate", "a"], async () => context(prose), PIPE);
  expect(r.code).toBe(1);
  expect(JSON.stringify(r)).toContain("prose");
});

test("the root is the nearest folder with `minispec/` or `.git`, and a linked worktree has `.git` as a file", async () => {
  const files = new Map([
    [`${ROOT}/wt/.git`, "gitdir: /elsewhere/.git/worktrees/wt"],
    [`${ROOT}/wt/src/a.ts`, ""],
    [`${ROOT}/other/minispec/specs/x/spec.md`, ""],
    [`${ROOT}/other/deep/a.ts`, ""],
  ]);
  const store = memStore(files);
  expect(await findRoot(`${ROOT}/wt/src`, store)).toBe(`${ROOT}/wt`);
  expect(await findRoot(`${ROOT}/other/deep`, store)).toBe(`${ROOT}/other`);
});

test("`localDate` gives the local date, also when the UTC date is another day", () => {
  const zone = process.env["TZ"];
  process.env["TZ"] = "Asia/Tokyo";
  try {
    // 00:30 on 16 October in Tokyo is 15:30 UTC on 15 October.
    expect(localDate(new Date(2026, 9, 16, 0, 30))).toBe("2026-10-16");
  } finally {
    if (zone === undefined) delete process.env["TZ"];
    else process.env["TZ"] = zone;
  }
});

test("`status` names the first open task after the last checked task as the next task", async () => {
  const files = project({
    "minispec/changes/a/proposal.md": PROPOSAL,
    "minispec/changes/a/tasks.md":
      "# Tasks\n\n- [ ] 1.1 a\n  Check: `true`\n- [x] 2.1 b\n  Check: `true`\n- [ ] 2.2 c\n  Check: `true`\n",
  });
  const status = await run(
    ["status", "a", "--json"],
    async () => context(files),
    PIPE,
  );
  expect(JSON.parse(status.out).next.id).toBe("2.2");
});
