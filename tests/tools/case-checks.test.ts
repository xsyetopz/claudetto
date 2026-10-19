// Behavior of the eval rules of `just validate` (D25, 11.1): a case needs a check of a file or a tool call,
// and a wiki line gives no eval with fewer than 10 runs in an arm.

import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  replyOnlyCases,
  replyOnlyCasesIn,
  thinEvalClaims,
  thinEvalClaimsIn,
} from "../../tools/case-checks.ts";

const reply = { type: "regex", name: "r", pattern: "done" };
const judge = { type: "llm", name: "j", criteria: "x" };
const file = {
  type: "regex",
  name: "f",
  target: { source: "file", path: "src/a.mjs" },
  pattern: "x",
};
const tool = { type: "tool_used", name: "t", tool: "Bash", min: 1 };

test("a case with only a reply regex and a judge fails", () => {
  expect(
    replyOnlyCases([
      { file: "a/case.yaml", graders: [reply, judge] },
      { file: "b/case.yaml", graders: [judge] },
      { file: "c/case.yaml", graders: [] },
    ]),
  ).toEqual(["a/case.yaml", "b/case.yaml", "c/case.yaml"]);
});

test("a case with a file regex or a tool call passes", () => {
  expect(
    replyOnlyCases([
      { file: "a/case.yaml", graders: [reply, file] },
      { file: "b/case.yaml", graders: [judge, tool] },
    ]),
  ).toEqual([]);
});

test("the cases of `src/` each check a file or a tool call", async () => {
  expect(await replyOnlyCasesIn(join(import.meta.dir, "../.."))).toEqual([]);
});

test("the rule flags the cases of a tree that has a reply-only case", async () => {
  const flagged = await replyOnlyCasesIn(
    join(import.meta.dir, "../.."),
    "tests/claudetto/styles/padded/evals/*/case.yaml",
  );
  expect(flagged.map((f) => f.split("/").at(-2))).toEqual([
    "padded-reply",
    "plain-control",
  ]);
});

const WORDS =
  "Arms: `with` and `without`, three runs each.\nA full run used 3 trials per arm.\n";

test("a line that gives fewer than 10 runs in an arm is a claim to flag", () => {
  expect(thinEvalClaims([{ file: "p.md", text: `intro\n${WORDS}` }])).toEqual([
    { file: "p.md", line: 2, runs: 3 },
    { file: "p.md", line: 3, runs: 3 },
  ]);
});

test("a line with 10 or more runs in an arm, or with no run count, passes", () => {
  expect(
    thinEvalClaims([
      {
        file: "p.md",
        text: "Used 10 trials per arm.\n`--runs 10` gave 12 runs each.\n| `runs` | 3 for each arm |\nThree runs failed.\n",
      },
    ]),
  ).toEqual([]);
});

test("the rule flags a wiki tree that cites a thin eval", async () => {
  const root = mkdtempSync(join(tmpdir(), "wiki-"));
  mkdirSync(join(root, "src/wiki"), { recursive: true });
  writeFileSync(join(root, "src/wiki/a.md"), "x\n3 runs per arm.\n");
  expect(await thinEvalClaimsIn(root)).toEqual([
    { file: "src/wiki/a.md", line: 2, runs: 3 },
  ]);
});
