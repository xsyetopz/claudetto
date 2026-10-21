// The rules of the text of `/goal`: the flags, the checks of a text, and the steps of a plan file.

import { expect, test } from "bun:test";
import {
  type Parsed,
  parseArgs,
} from "../../../src/plugins/claudetto/slices/goal/domain/command.ts";
import {
  checksOf,
  planSteps,
} from "../../../src/plugins/claudetto/slices/goal/domain/plan.ts";

/** The parsed flags, with an error line made a failure. */
const parsed = (args: string) => {
  const out = parseArgs(args, 0);
  if (typeof out === "string") throw new Error(out);
  return out;
};

test("the flags set the controls and leave the condition", () => {
  const out = parsed(
    "fix it --max-turns 5 --stall 2 --budget 40% --until 23:30",
  );
  expect(out.condition).toBe("fix it");
  expect(out.controls).toMatchObject({
    maxTurns: 5,
    stall: 2,
    budget: { percent: 40 },
  });
  expect(new Date(out.controls.until ?? 0).getHours()).toBe(23);
});

test("`--budget $2.5` is a cost in USD", () => {
  expect(parsed("x --budget $2.5").controls.budget).toEqual({ usd: 2.5 });
});

test("a date alone for `--until` is midnight in local time", () => {
  const until = parsed("x --until 2030-01-02").controls.until;
  expect(until).toBe(new Date(2030, 0, 2).getTime());
});

test("a value that is not a number above 0, and a time that is not valid, are errors", () => {
  for (const bad of [
    "--stall 0",
    "--max-turns abc",
    "--max-turns -1",
    "--budget $",
    "--until 25:99",
    "--until nonsense",
  ]) {
    expect(typeof parseArgs(`x ${bad}`, 0)).toBe("string");
  }
});

test("a full date in the past for `--until` is an error", () => {
  const now = new Date(2030, 0, 2, 12).getTime();
  expect(String(parseArgs("x --until 2030-01-01", now))).toContain(
    "not after now",
  );
});

test("a date and time in the past for `--until` is an error", () => {
  const now = new Date(2030, 0, 2, 12).getTime();
  expect(typeof parseArgs("x --until 2030-01-02T11:00", now)).toBe("string");
  expect(typeof parseArgs("x --until 2030-01-02T13:00", now)).toBe("object");
});

test("`--until HH:MM` that has passed today is the same time on the next day", () => {
  const now = new Date(2030, 0, 2, 12).getTime();
  const out = parseArgs("x --until 09:00", now) as Parsed;
  expect(out.controls.until).toBe(new Date(2030, 0, 3, 9).getTime());
});

test("a flag starts a word", () => {
  expect(parsed("x--max-turns 3").condition).toBe("x--max-turns 3");
});

test("a text of spans and separators gives a `run` check for each span", () => {
  expect(checksOf("`just check` and `ls`, `pwd`.")).toEqual([
    { kind: "run", command: "just check" },
    { kind: "run", command: "ls" },
    { kind: "run", command: "pwd" },
  ]);
});

test("words that only say a command succeeds add no `judge` check", () => {
  expect(checksOf("`node check/qa.mjs` exits 0")).toEqual([
    { kind: "run", command: "node check/qa.mjs" },
  ]);
  expect(checksOf("`a` and `b` both exit 0")).toEqual([
    { kind: "run", command: "a" },
    { kind: "run", command: "b" },
  ]);
  expect(checksOf("`just check` passes and the docs are done")).toHaveLength(2);
});

test("a span at the start of a text gives a `run` check and a `judge` check of the text", () => {
  const text = "`just test x`, with a test for each cleanup";
  expect(checksOf(text)).toEqual([
    { kind: "run", command: "just test x" },
    { kind: "judge", claim: text },
  ]);
});

test("a text with no span at the start is one `judge` check", () => {
  const text = "each command of the `/goal` condition, in the final turn.";
  expect(checksOf(text)).toEqual([{ kind: "judge", claim: text }]);
});

test("the plan file fixture `design-steps.md` (a copy of the plan of `trim-0-2-0`) gives its numbered steps and their `Check:` lines", async () => {
  const text = await Bun.file(
    "tests/claudetto/goal/fixtures/design-steps.md",
  ).text();
  const steps = planSteps(text);
  expect(steps.length).toBeGreaterThanOrEqual(10);
  const titles = steps.map((s) => s.title);
  expect(titles[0]).toBe("Commit the Start State");
  expect(titles).not.toContain(
    "Notes for the Spec Integration (a Later Change)",
  );
  const by = (title: string) => steps.find((s) => s.title.startsWith(title));
  // Only a span and separators: `run`.
  expect(by("Delete the Cut")?.checks).toEqual([
    { kind: "run", command: "just check" },
  ]);
  // A span, then prose: `run` and `judge`.
  expect(by("Trim `setup`")?.checks).toMatchObject([
    { kind: "run", command: "just test tests/claudetto/setup" },
    { kind: "judge" },
  ]);
  // No span at the start: `judge` only.
  expect(by("Docs and Release")?.checks).toMatchObject([{ kind: "judge" }]);
  // A step with `Check:` lines has no `run` check of a code item such as `true`.
  const runs = steps.flatMap((s) => s.checks).filter((c) => c.kind === "run");
  expect(runs.map((c) => (c.kind === "run" ? c.command : ""))).not.toContain(
    "true",
  );
});
