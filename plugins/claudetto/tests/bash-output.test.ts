// Lab tests of the `session.bash-output` hook (task 19.9 of change `redesign-0-4-0`): `session.start` sets `BASH_MAX_OUTPUT_LENGTH` when the user set neither it nor `bashOutputMaxChars`.
// Claude Code keeps the first `BASH_MAX_OUTPUT_LENGTH` characters of a `Bash` result and drops the rest (function `fRn` of 2.1.310), so the bound must not cut the failure lines of a failed `just check` step.
// The file is self-contained, because a lab test cannot import a relative file.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";
import { listing } from "./stubs/files.ts";
import { ran, stubState } from "./stubs/process.ts";

/** The characters of the output of the failed `lab` step of `just check` with 2 broken tests, measured in a scratch copy on 2026-10-26. */
const LAB_FAILURE_CHARS = 21_742;

/** Stubs the env `env`, the settings `settings`, and the files that the other `session.start` hooks read. `set` holds the variables that `env.set` got. */
const stub = (
  on: On,
  env: Record<string, string> = {},
  settings: Record<string, unknown> = {},
) => {
  const set: Record<string, string> = {};
  on("session.start", (_$, e) => ({ cwd: e.cwd }));
  on("env.get", (_$, e) => ({ value: env[e.name] }));
  on("session.id", () => ({ value: "s1" }));
  on("session.cwd", () => ({ value: "/p" }));
  on("session.root", () => ({ value: "/p" }));
  on("env.set", (_$, e) => {
    set[e.name] = e.value ?? "";
    return { value: {} };
  });
  on("settings.read", () => ({ value: settings }));
  on("clock.now", () => ({ value: 0 }));
  stubState(on, new Map());
  on("fs.list", (_$, e) => ({ value: listing([], e.path) }));
  on("fs.exists", () => ({ value: false }));
  on("fs.read", () => ({ deny: "ENOENT" }));
  on("fs.stat", () => ({ deny: "ENOENT" }));
  on("process.run", () => ran("", 128));
  return set;
};

const start = ($: Engine) =>
  $.session.start({ cwd: "/p", surface: "terminal", isInteractive: true });

/** The output of a failed step: passed lines, then the failure lines, then the summary, `LAB_FAILURE_CHARS` long. */
const failedStep = () => {
  const tail =
    "(fail) Field Switch: a case [350.43ms]\n 2 fail\nRan 249 tests\n";
  const pass = "(pass) Long Wait: a subagent call with a timeout is denied\n";
  const body = pass.repeat(
    Math.ceil((LAB_FAILURE_CHARS - tail.length) / pass.length),
  );
  return (body + tail).slice(-LAB_FAILURE_CHARS);
};

test("Bash Output: `session.start` sets `BASH_MAX_OUTPUT_LENGTH` below the default of 30,000 when the user set neither it nor `bashOutputMaxChars`", async ($: Engine, on: On) => {
  const set = stub(on);
  await start($);
  expect(Number(set["BASH_MAX_OUTPUT_LENGTH"])).toBeLessThan(30_000);
});

test("Bash Output: the cut output of a failed step keeps its failure lines", async ($: Engine, on: On) => {
  const set = stub(on);
  await start($);
  const cut = failedStep().slice(0, Number(set["BASH_MAX_OUTPUT_LENGTH"]));
  expect(cut).toContain("(fail) Field Switch");
  expect(cut).toContain(" 2 fail");
});

test("Bash Output: `session.start` keeps the `BASH_MAX_OUTPUT_LENGTH` of the user", async ($: Engine, on: On) => {
  const set = stub(on, { BASH_MAX_OUTPUT_LENGTH: "50000" });
  await start($);
  expect(set["BASH_MAX_OUTPUT_LENGTH"]).toBeUndefined();
});

test("Bash Output: `session.start` sets no env var when `bashOutputMaxChars` is set", async ($: Engine, on: On) => {
  const set = stub(on, {}, { bashOutputMaxChars: 50_000 });
  await start($);
  expect(set["BASH_MAX_OUTPUT_LENGTH"]).toBeUndefined();
});
