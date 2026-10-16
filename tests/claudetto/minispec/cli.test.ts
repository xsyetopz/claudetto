// The CLI against clig.dev: help, the two streams, exit codes, color, no prompt, and errors that name the next step.

import { expect, test } from "bun:test";
import { run } from "../../../plugins/claudetto/slices/minispec/adapters/run.ts";
import {
  context,
  DELTA,
  PROPOSAL,
  project,
  TASKS_DONE,
  TASKS_OPEN,
} from "./store.ts";

const TTY = { stdout: true, stderr: true, noColorEnv: undefined };
const PIPE = { stdout: false, stderr: false, noColorEnv: undefined };
const ESC = "\u001b[";

const withFiles = (rel: Record<string, string>, over = {}) => {
  const files = project(rel);
  return { files, make: async () => context(files, over) };
};

const change = (tasks: string, extra: Record<string, string> = {}) => ({
  "minispec/changes/add-export/proposal.md": PROPOSAL,
  "minispec/changes/add-export/tasks.md": tasks,
  ...extra,
});

test("`--help` and a bare `-h` print help with examples to stdout and exit 0", async () => {
  const { make } = withFiles({});
  for (const argv of [["--help"], ["-h"], []]) {
    const r = await run(argv, make, PIPE);
    expect(r.code).toBe(0);
    expect(r.err).toBe("");
    expect(r.out).toContain("minispec new");
  }
  for (const c of ["new", "list", "show", "status", "validate", "archive"]) {
    const r = await run([c, "--help"], make, PIPE);
    expect(r.code).toBe(0);
    expect(r.out).toContain(`minispec ${c}`);
    expect(r.out.toLowerCase()).toContain("example");
  }
});

test("an unknown command suggests the nearest one, goes to stderr, and exits 2", async () => {
  const { make } = withFiles({});
  const r = await run(["lst"], make, PIPE);
  expect(r.code).toBe(2);
  expect(r.out).toBe("");
  expect(r.err).toContain("list");
  expect(r.err).toContain("--help");
});

test("a bad flag exits 2 and an operation that fails exits 1, both on stderr", async () => {
  const { make } = withFiles({});
  const usage = await run(["list", "--bogus"], make, PIPE);
  expect([usage.code, usage.out]).toEqual([2, ""]);
  expect(usage.err).toContain("--bogus");
  const failed = await run(["show", "nope"], make, PIPE);
  expect([failed.code, failed.out]).toEqual([1, ""]);
  expect(failed.err).toContain("nope");
  expect(failed.err).toContain("minispec list");
});

test("the data goes to stdout and `--json` gives parseable output, also for a failure", async () => {
  const { make } = withFiles(change(TASKS_OPEN));
  const list = await run(["list", "--json"], make, TTY);
  expect(list.code).toBe(0);
  expect(JSON.parse(list.out)).toBeDefined();
  expect(list.out).not.toContain(ESC);
  const bad = withFiles(change("- [ ] 1.1 A\n  Check: it works\n"));
  const v = await run(["validate", "add-export", "--json"], bad.make, TTY);
  expect(v.code).toBe(1);
  expect(JSON.stringify(JSON.parse(v.out))).toContain("prose");
  expect(v.out).not.toContain(ESC);
});

test("color shows only on a terminal, and `NO_COLOR` and `--no-color` turn it off", async () => {
  const { make } = withFiles({});
  const on = await run(["show", "nope"], make, TTY);
  expect(on.err).toContain(ESC);
  const piped = await run(["show", "nope"], make, PIPE);
  expect(piped.err).not.toContain(ESC);
  const env = await run(["show", "nope"], make, { ...TTY, noColorEnv: "1" });
  expect(env.err).not.toContain(ESC);
  const flag = await run(["show", "nope", "--no-color"], make, TTY);
  expect(flag.err).not.toContain(ESC);
  const empty = await run(["show", "nope"], make, { ...TTY, noColorEnv: "" });
  expect(empty.err).toContain(ESC);
});

test("`archive` with no `--yes` fails with a usage fault, names `--yes`, and changes nothing", async () => {
  const { files, make } = withFiles(change(TASKS_DONE));
  for (const piped of [PIPE, TTY]) {
    const r = await run(["archive", "add-export"], make, piped);
    expect(r.code).toBe(2);
    expect(r.err).toContain("--yes");
    expect(files.has("/p/minispec/changes/add-export/tasks.md")).toBe(true);
  }
});

test("`archive --yes` moves the change to the dated folder and merges the deltas", async () => {
  const { files, make } = withFiles(
    change(TASKS_DONE, {
      "minispec/changes/add-export/design.md": "# Design\n",
      "minispec/changes/add-export/specs/export/spec.md": DELTA,
    }),
  );
  const r = await run(["archive", "add-export", "--yes"], make, PIPE);
  expect(r.err).toBe("");
  expect(r.code).toBe(0);
  const moved = "/p/minispec/changes/archive/2026-10-16-add-export";
  expect(files.has(`${moved}/tasks.md`)).toBe(true);
  expect(files.has("/p/minispec/changes/add-export/tasks.md")).toBe(false);
  expect(files.get("/p/minispec/specs/export/spec.md")).toContain(
    "Export a file",
  );
});

test("`archive` refuses a change with an open task and names the next step", async () => {
  const { files, make } = withFiles(change(TASKS_OPEN));
  const r = await run(["archive", "add-export", "--yes"], make, PIPE);
  expect(r.code).toBe(1);
  expect(r.err).toContain("1.2");
  expect(files.has("/p/minispec/changes/add-export/tasks.md")).toBe(true);
});
