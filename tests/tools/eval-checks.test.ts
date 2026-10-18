// Behavior of the eval rule of `just validate` (D25, 11.1): a case needs a check of a file or a tool call.

import { expect, test } from "bun:test";
import { join } from "node:path";
import { replyOnlyCases, replyOnlyCasesIn } from "../../tools/eval-checks.ts";

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
