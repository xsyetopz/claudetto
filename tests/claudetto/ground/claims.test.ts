// One test for each kind of claim of the table of 2026-10-17 (`trim-0-2-0`, step 9):
// the claim fails with no source and passes with its source.

import { expect, test } from "bun:test";
import {
  type Files,
  findUnsourced,
  type Msg,
} from "../../../plugins/claudetto/slices/ground/domain/claims.ts";
import { planText } from "../../../plugins/claudetto/slices/ground/domain/plan.ts";

const msg = (
  role: Msg["role"],
  text: string,
  results: string[] = [],
  bash = 0,
): Msg => ({
  role,
  text,
  results,
  bash,
});
const none: Files = {};

test("a number with no source fails, and a number in a user message or a tool result passes", () => {
  const text = "The goal prints 9000 or less, and the repo has 31,839 lines.";
  expect(findUnsourced(text, [], none)).toHaveLength(2);
  const msgs = [
    msg("user", "Keep it at 9000."),
    msg("user", "", ["33,219 total", "31839"]),
  ];
  expect(findUnsourced(text, msgs, none)).toStrictEqual([]);
});

test("a number that is a date, a version, a short number, or marked `(proposed)` passes", () => {
  expect(
    findUnsourced("On 2026-10-17 at 0.2.0 of step 12.", [], none),
  ).toStrictEqual([]);
  expect(findUnsourced("The bound is 9000 (proposed)", [], none)).toStrictEqual(
    [],
  );
  expect(
    findUnsourced("9000 [NEEDS CLARIFICATION: which bound?]", [], none),
  ).toStrictEqual([]);
});

test("a number in a fenced code block passes", () => {
  expect(findUnsourced("```\nout: 31839\n```", [], none)).toStrictEqual([]);
});

test("a reference to a line out of range fails, a line in range passes, and a file that does not resolve is skipped", () => {
  const text = "See `setup/slice.ts:119` and `setup/facts.ts:5-15`.";
  expect(findUnsourced(text, [], none)).toStrictEqual([]);
  expect(
    findUnsourced(text, [msg("user", "setup/slice.ts:119")], none),
  ).toStrictEqual([]);
  const files = {
    "setup/slice.ts": "a\n".repeat(50),
    "setup/facts.ts": "a\n".repeat(20),
  };
  expect(findUnsourced(text, [], files)).toStrictEqual([
    "`setup/slice.ts:119`: the file has 50 lines.",
  ]);
  expect(findUnsourced("See setup/facts.ts:5-15.", [], files)).toStrictEqual(
    [],
  );
});

test("an attribution to the user fails with no user message that says it, and passes with one", () => {
  const text = "The user chose a weekly release schedule.";
  expect(findUnsourced(text, [msg("user", "Fix the bug.")], none)).toHaveLength(
    1,
  );
  expect(
    findUnsourced(text, [msg("user", "Use a weekly release schedule.")], none),
  ).toStrictEqual([]);
});

test("`npx` in a `bun.lock` project fails with no user rule, and passes with one", () => {
  const files = { "bun.lock": "" };
  const text = "Run `npx markdownlint-cli2` for the docs.";
  expect(findUnsourced(text, [], files)).toHaveLength(1);
  expect(
    findUnsourced(text, [msg("user", "Use npx here.")], files),
  ).toStrictEqual([]);
  expect(findUnsourced(text, [], none)).toStrictEqual([]);
  expect(
    findUnsourced("Run `bunx markdownlint-cli2`.", [], files),
  ).toStrictEqual([]);
});

test("`pip` in a `uv.lock` project fails with no user rule", () => {
  expect(
    findUnsourced("Run `pip install x`.", [], { "uv.lock": "" }),
  ).toHaveLength(1);
});

test("a mention of `npm` in prose or with a negation is no rule, and a plan line that forbids the tool passes", () => {
  const files = {
    "bun.lock": "",
    "CLAUDE.md": "Do not patch its npm package.\nNever run `npx tsc`.",
  };
  expect(findUnsourced("Run `npx tsc`.", [], files)).toHaveLength(1);
  expect(findUnsourced("Never run `npx tsc` here.", [], files)).toStrictEqual(
    [],
  );
});

test("a rule in `CLAUDE.md` names the tool and passes", () => {
  const files = { "bun.lock": "", "CLAUDE.md": "Use `npm run build` here." };
  expect(findUnsourced("Run `npm run build`.", [], files)).toStrictEqual([]);
});

test("a done-claim fails with no `Bash` result in the turn, and passes with one", () => {
  const text = "The tests pass now.";
  const before = [msg("user", "Go."), msg("assistant", "", [], 0)];
  expect(findUnsourced(text, before, none)).toHaveLength(1);
  expect(
    findUnsourced(
      text,
      [msg("user", "Go."), msg("assistant", "", ["ok"], 1)],
      none,
    ),
  ).toStrictEqual([]);
  // A check of an earlier turn is not a source.
  const old = [
    msg("assistant", "", ["ok"], 1),
    msg("user", "Next."),
    msg("assistant", "", [], 0),
  ];
  expect(findUnsourced(text, old, none)).toHaveLength(1);
});

test("a done-claim in a condition or a check line passes", () => {
  expect(findUnsourced("Check: tests pass.", [], none)).toStrictEqual([]);
  expect(findUnsourced("Done when the tests pass.", [], none)).toStrictEqual(
    [],
  );
});

test("`planText` reads a plan file and no other call", () => {
  const w = {
    tool: "Write",
    file_path: "/p/openspec/changes/c/tasks.md",
    content: "x",
  };
  expect(planText(w)).toBe("x");
  expect(
    planText({ tool: "Edit", file_path: "/p/design.md", new_string: "y" }),
  ).toBe("y");
  expect(
    planText({ tool: "Write", file_path: "/p/src/a.ts", content: "x" }),
  ).toBeNull();
});
