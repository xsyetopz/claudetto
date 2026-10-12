// The pure logic of `dotclaude-run-checks`: the counts of each test runner, the failure lines and their bounds, and how a command runs.

import { expect, test } from "bun:test";
import {
  needsShell,
  plainArgv,
  shellArgv,
} from "../../../src/plugins/dotclaude/slices/checks/domain/command.ts";
import { parseCounts } from "../../../src/plugins/dotclaude/slices/checks/domain/counts.ts";
import { failureLines } from "../../../src/plugins/dotclaude/slices/checks/domain/failures.ts";
import {
  MAX_FAILURE_LINES,
  MAX_LINE_CHARS,
  TAIL_LINES,
} from "../../../src/plugins/dotclaude/slices/checks/limits.ts";

const counts = (passed: number, failed: number, skipped: number) => ({
  passed,
  failed,
  skipped,
});

test("`bun test` counts come from the lines ` N pass`, ` N fail`, and ` N skip`", () => {
  const out =
    "bun test v1.4.3\n\n 5 pass\n 1 skip\n 2 fail\n 9 expect() calls\nRan 8 tests across 2 files.";
  expect(parseCounts(out)).toStrictEqual(counts(5, 2, 1));
});

test("`vitest` counts come from the `Tests` line and not the `Test Files` line", () => {
  const out =
    " Test Files  1 failed | 2 passed (3)\n      Tests  1 failed | 7 passed | 2 skipped (10)";
  expect(parseCounts(out)).toStrictEqual(counts(7, 1, 2));
});

test("`jest` counts come from the `Tests:` line and not the `Test Suites:` line", () => {
  const out =
    "Test Suites: 1 failed, 1 passed, 2 total\nTests:       1 failed, 1 skipped, 4 passed, 6 total";
  expect(parseCounts(out)).toStrictEqual(counts(4, 1, 1));
});

test("`pytest` counts come from the last line, with or without the `=` rule", () => {
  expect(
    parseCounts("=== 2 failed, 10 passed, 1 skipped in 0.52s ==="),
  ).toStrictEqual(counts(10, 2, 1));
  expect(parseCounts("3 passed in 0.01s")).toStrictEqual(counts(3, 0, 0));
});

test("`cargo test` counts add up over the test binaries", () => {
  const out = [
    "test result: ok. 4 passed; 0 failed; 1 ignored; 0 measured; 0 filtered out",
    "test result: FAILED. 2 passed; 1 failed; 0 ignored; 0 measured; 0 filtered out",
  ].join("\n");
  expect(parseCounts(out)).toStrictEqual(counts(6, 1, 1));
});

test("`go test -v` counts each `--- PASS`, `--- FAIL`, and `--- SKIP` line", () => {
  const out =
    "--- PASS: TestA (0.00s)\n--- FAIL: TestB (0.00s)\n    --- SKIP: TestB/sub (0.00s)\n--- PASS: TestC (0.00s)\nFAIL";
  expect(parseCounts(out)).toStrictEqual(counts(2, 1, 1));
});

test("output of no known runner gives no counts", () => {
  expect(parseCounts("compiled 12 files in 3 ms\nall good")).toBeNull();
});

test("failure lines keep the lines with a failure word and drop the rest", () => {
  const f = failureLines("ok line\nerror: bad thing\n(fail) a > b\nfine");
  expect(f.lines).toStrictEqual(["error: bad thing", "(fail) a > b"]);
  expect(f.omitted).toBe(0);
});

test("failure lines stop at the bound and say how many they left out", () => {
  const out = Array.from(
    { length: MAX_FAILURE_LINES + 5 },
    (_, i) => `error ${i}`,
  ).join("\n");
  const f = failureLines(out);
  expect(f.lines).toHaveLength(MAX_FAILURE_LINES);
  expect(f.omitted).toBe(5);
});

test("a failure line over the bound is cut", () => {
  const f = failureLines(`error ${"x".repeat(MAX_LINE_CHARS * 2)}`);
  expect(f.lines[0]).toHaveLength(MAX_LINE_CHARS);
});

test("a failed command with no failure word shows the last lines", () => {
  const out = Array.from(
    { length: TAIL_LINES + 4 },
    (_, i) => `line ${i}`,
  ).join("\n");
  const f = failureLines(out);
  expect(f.lines).toHaveLength(TAIL_LINES);
  expect(f.lines.at(-1)).toBe(`line ${TAIL_LINES + 3}`);
});

test("plain words run with no shell, and shell syntax needs one", () => {
  expect(plainArgv("bun test  tests/a.test.ts")).toStrictEqual({
    file: "bun",
    args: ["test", "tests/a.test.ts"],
  });
  for (const c of [
    "a | b",
    "a && b",
    "a; b",
    "a > f",
    'a "b c"',
    "a $X",
    "A=1 a",
    "a *.ts",
  ]) {
    expect(needsShell(c), c).toBe(true);
    expect(plainArgv(c), c).toBeNull();
  }
  expect(shellArgv("a | b", false)).toStrictEqual({
    file: "sh",
    args: ["-c", "a | b"],
  });
});
