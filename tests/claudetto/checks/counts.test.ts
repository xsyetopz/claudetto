// The pure logic of `claudetto-run-checks`: the failure lines and their bounds, and how a command runs.

import { expect, test } from "bun:test";
import {
  needsShell,
  plainArgv,
  shellArgv,
} from "../../../plugins/claudetto/slices/checks/domain/command.ts";
import { failureLines } from "../../../plugins/claudetto/slices/checks/domain/failures.ts";
import {
  MAX_FAILURE_LINES,
  MAX_LINE_CHARS,
} from "../../../plugins/claudetto/slices/checks/limits.ts";

test("the failure lines are the last lines of the output, whatever their words", () => {
  const f = failureLines("ok line\nBłąd: zły test\n失敗しました\nfine");
  expect(f.lines).toStrictEqual([
    "ok line",
    "Błąd: zły test",
    "失敗しました",
    "fine",
  ]);
  expect(f.omitted).toBe(0);
});

test("a line with a failure word that is early in a long output is not picked", () => {
  const out = [
    "error: logged by a passing test",
    ...Array.from({ length: MAX_FAILURE_LINES }, (_, i) => `line ${i}`),
  ].join("\n");
  const f = failureLines(out);
  expect(f.lines).not.toContain("error: logged by a passing test");
  expect(f.lines.at(-1)).toBe(`line ${MAX_FAILURE_LINES - 1}`);
});

test("failure lines stop at the bound, keep the last lines, and say how many they left out", () => {
  const out = Array.from(
    { length: MAX_FAILURE_LINES + 5 },
    (_, i) => `line ${i}`,
  ).join("\n");
  const f = failureLines(out);
  expect(f.lines).toHaveLength(MAX_FAILURE_LINES);
  expect(f.lines[0]).toBe("line 5");
  expect(f.omitted).toBe(5);
});

test("a printed line over the bound is cut", () => {
  const f = failureLines(`x${"x".repeat(MAX_LINE_CHARS * 2)}`);
  expect(f.lines[0]).toHaveLength(MAX_LINE_CHARS);
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
  expect(shellArgv("a | b")).toStrictEqual({
    file: "bash",
    args: ["-o", "pipefail", "-c", "a | b"],
  });
});
