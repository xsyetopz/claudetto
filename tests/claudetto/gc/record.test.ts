// The rules that find an output in a tool call, and the record file text.
// The commands are strings for the parser, and no test runs one.

import { expect, test } from "bun:test";
import {
  type GcRecord,
  mayMakeOutput,
  outputOfWrite,
  outputsOfBash,
  parseRecords,
  projectOfWorktree,
  serialize,
  taskOutputsOf,
  withOutputs,
} from "../../../plugins/claudetto/slices/gc/domain/record.ts";

const paths = (command: string, stdout = "", cwd = "/work/app") =>
  outputsOfBash(command, stdout, cwd).map((o) => `${o.kind} ${o.path}`);

test("`mktemp -d` gives the absolute path from its output", () => {
  expect(paths("mktemp -d", "/tmp/tmp.abc123\n")).toEqual([
    "temp /tmp/tmp.abc123",
  ]);
});

test("a `mktemp` in a variable assignment still gives the path", () => {
  expect(paths("d=$(mktemp -d) && echo $d", "/tmp/tmp.x\n")).toEqual([
    "temp /tmp/tmp.x",
  ]);
});

test("a command with no `mktemp` takes no path from its output", () => {
  expect(paths("echo /tmp/x", "/tmp/x\n")).toEqual([]);
});

test("`git worktree add` gives the path, and skips the value of `-b`", () => {
  expect(paths("git worktree add -b feat ../wt main")).toEqual([
    "worktree /work/wt",
  ]);
});

test("`git clone` and `cp -r` give the destination", () => {
  expect(paths("git clone https://example.com/r.git /tmp/r")).toEqual([
    "copy /tmp/r",
  ]);
  expect(paths("cp -R src /tmp/copy")).toEqual(["copy /tmp/copy"]);
  expect(paths("cp a.txt /tmp/copy")).toEqual([]);
});

test("a `CLAUDE_CONFIG_DIR` value is a config output", () => {
  expect(paths("CLAUDE_CONFIG_DIR=/tmp/cfg claude -p hi")).toEqual([
    "config /tmp/cfg",
  ]);
});

test("a path with `~` or `$` is left out, because the hook cannot expand it", () => {
  expect(paths("git worktree add ~/wt")).toEqual([]);
});

test("a write inside a temp folder is a scratch output, and a write in the project is not", () => {
  expect(outputOfWrite("/tmp/a.txt", [])).toEqual({
    path: "/tmp/a.txt",
    kind: "scratch",
  });
  expect(outputOfWrite("/work/app/a.txt", [])).toBeUndefined();
  expect(outputOfWrite("/x/t/a.txt", ["/x/t"])).toBeDefined();
});

test("only a command with a marker word can make an output", () => {
  expect(mayMakeOutput("ls -la")).toBe(false);
  expect(mayMakeOutput("mktemp -d")).toBe(true);
});

test("the project of a worktree path is the part before `.claude/worktrees/`", () => {
  expect(projectOfWorktree("/p/.claude/worktrees/a")).toBe("/p");
  expect(projectOfWorktree("/tmp/a")).toBeUndefined();
});

const rec = (path: string, time = 1): GcRecord => ({
  path,
  kind: "temp",
  session: "s1",
  cwd: "/p",
  time,
});

test("a record file round-trips, and a wrong entry or wrong text gives no record", () => {
  const records = [rec("/tmp/a"), rec("/tmp/b")];
  expect(parseRecords(serialize(records))).toEqual(records);
  expect(parseRecords('[{"path":1}]')).toEqual([]);
  expect(parseRecords("not json")).toEqual([]);
});

test("a path is in the record once", () => {
  const out = withOutputs([rec("/tmp/a")], [rec("/tmp/a", 2), rec("/tmp/b")]);
  expect(out.map((r) => r.path)).toEqual(["/tmp/a", "/tmp/b"]);
});

test("a line of `mktemp` output outside the temp folders is not an output", () => {
  expect(paths("mktemp -d && pwd", "/work/app\n/tmp/tmp.ok\n")).toEqual([
    "temp /tmp/tmp.ok",
  ]);
});

test("a temp folder of the environment is a root for `mktemp` output", () => {
  const out = outputsOfBash("mktemp -d", "/custom/t/x\n", "/work/app", [
    "/custom/t",
  ]);
  expect(out.map((o) => o.path)).toEqual(["/custom/t/x"]);
});

test("the output file of a background task is a task output", () => {
  expect(
    taskOutputsOf({
      backgroundOutputPath: "/tmp/claude-1/s/tasks/a.output",
      persistedOutputPath: "relative/no",
    }),
  ).toEqual([{ path: "/tmp/claude-1/s/tasks/a.output", kind: "task" }]);
  expect(taskOutputsOf(undefined)).toEqual([]);
});

test("a record of kind task passes the parser", () => {
  const r: GcRecord = {
    path: "/tmp/a",
    kind: "task",
    session: "s",
    time: 1,
    cwd: "/w",
  };
  expect(parseRecords(serialize([r]))).toEqual([r]);
});
