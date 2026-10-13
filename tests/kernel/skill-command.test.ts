import { expect, test } from "bun:test";
import { COMMAND_OUTPUT_MAX_CHARS } from "../../src/kernel/budget.ts";
import { outputOf } from "../../src/kernel/skill-command.ts";

const run = (exitCode: number, stdout: string, stderr = "") => ({
  exitCode,
  stdout,
  stderr,
});

test("an output within the bound shows whole", () => {
  const text = "x".repeat(COMMAND_OUTPUT_MAX_CHARS);
  expect(outputOf(run(0, text))).toBe(text);
});

test("an output over the bound is cut, and the last line gives the cut size", () => {
  const shown = outputOf(run(0, "x".repeat(COMMAND_OUTPUT_MAX_CHARS + 123)));
  const [body, note] = shown.split("\n");
  expect(body?.length).toBe(COMMAND_OUTPUT_MAX_CHARS);
  expect(note).toContain("123");
});

test("an error text over the bound is cut with the status kept", () => {
  const shown = outputOf(run(2, "", "e".repeat(COMMAND_OUTPUT_MAX_CHARS * 2)));
  expect(shown).toContain("exit status 2");
  expect(shown.length).toBeLessThan(COMMAND_OUTPUT_MAX_CHARS + 200);
});
