// Behavior of the eval rules of `just validate` (D25, 11.1): a case needs a check of a file or a tool call,
// and a wiki line gives no eval with fewer than 10 runs in an arm.

import { expect, test } from "bun:test";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  caseFaults,
  overBudget,
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
  await Bun.write(join(root, "src/wiki/a.md"), "x\n3 runs per arm.\n");
  expect(await thinEvalClaimsIn(root)).toEqual([
    { file: "src/wiki/a.md", line: 2, runs: 3 },
  ]);
});

// The rest of D25: a metric tag, tool-call and token bounds, a recorded bad run, and a held-out split.

const GOOD_TAGS = ["pass^k", "max-tool-calls:10", "max-tokens:50000"];
const failing = { type: "regex", name: "r", pattern: "done" };
const badRun = {
  fails: "r",
  events: [
    {
      type: "result",
      result: "no",
      usage: { input_tokens: 5, output_tokens: 6 },
    },
  ],
  files: {},
};
const doc = (o: Record<string, unknown> = {}) => ({
  file: "src/plugins/p/slices/s/evals/a/case.yaml",
  name: "a",
  tags: GOOD_TAGS,
  graders: [failing],
  ...o,
});

test("a case with a metric, bounds, and a failing bad run has no fault", () => {
  expect(caseFaults([doc()], { a: badRun })).toEqual([]);
});

test("an unmodelled grader or a regex with no pattern is a listed fault", () => {
  const tool = { name: "t", type: "tool_order" };
  const bare = { name: "r", type: "regex" };
  const faults = caseFaults([doc({ graders: [failing, tool, bare] })], {
    a: badRun,
  });
  expect(faults.some((f) => f.includes("unmodelled type tool_order"))).toBe(
    true,
  );
  expect(faults.some((f) => f.includes("needs a pattern"))).toBe(true);
});

test("a case with no metric, two metrics, or a missing bound is a fault", () => {
  const faults = (tags: string[]) => caseFaults([doc({ tags })], { a: badRun });
  expect(faults(["max-tool-calls:10", "max-tokens:5"])).toHaveLength(1);
  expect(
    faults(["pass^k", "pass@1", "max-tool-calls:10", "max-tokens:5"]),
  ).toHaveLength(1);
  expect(faults(["pass^k", "max-tokens:5"])).toHaveLength(1);
  expect(faults(["pass^k", "max-tool-calls:10"])).toHaveLength(1);
  expect(faults(["pass^k", "max-tool-calls:999", "max-tokens:5"])).toHaveLength(
    1,
  );
  expect(
    faults(["pass^k", "max-tool-calls:10", "max-tokens:9999999"]),
  ).toHaveLength(1);
});

test("a case with no bad run, or a bad run that it passes, is a fault", () => {
  expect(caseFaults([doc()], {})).toHaveLength(1);
  const passing = {
    ...badRun,
    events: [{ type: "result", result: "done", usage: { input_tokens: 1 } }],
  };
  expect(caseFaults([doc()], { a: passing })).toHaveLength(1);
});

test("a bad run with no token count is a fault", () => {
  const noUsage = {
    fails: "r",
    events: [{ type: "result", result: "no" }],
    files: {},
  };
  expect(caseFaults([doc()], { a: noUsage })).toHaveLength(1);
});

test("the implementer cases need both splits", () => {
  const impl = (name: string, split?: string) =>
    doc({
      file: `src/plugins/p/evals/${name}/case.yaml`,
      name,
      tags: split ? [...GOOD_TAGS, split] : GOOD_TAGS,
    });
  const runs = { a: badRun, b: badRun };
  expect(
    caseFaults([impl("a", "split:dev"), impl("b", "split:held-out")], runs),
  ).toEqual([]);
  expect(
    caseFaults([impl("a", "split:dev"), impl("b", "split:dev")], runs),
  ).toHaveLength(1);
  expect(
    caseFaults([impl("a"), impl("b", "split:held-out")], runs),
  ).toHaveLength(2);
});

test("a bad run with no events, no `fails`, or a `fails` that is not a failing check is a fault", () => {
  const faults = (run: object) => caseFaults([doc()], { a: run as never });
  expect(faults({ ...badRun, events: [] })).toHaveLength(1);
  expect(faults({ ...badRun, fails: undefined })).toHaveLength(1);
  expect(faults({ ...badRun, fails: "other" })).toHaveLength(1);
  const llm = { type: "llm", name: "j", criteria: "x", focus: "trace" };
  expect(
    caseFaults([doc({ graders: [failing, llm] })], {
      a: { ...badRun, fails: "j" },
    }),
  ).toHaveLength(1);
  const two = { ...failing, name: "s", pattern: "no" };
  expect(
    caseFaults([doc({ graders: [failing, two] })], {
      a: { ...badRun, fails: "s" },
    }),
  ).toHaveLength(1);
});

test("a run over its tool-call or token tags is a fault", () => {
  const call = {
    type: "assistant",
    message: { content: [{ type: "tool_use", name: "Bash", input: {} }] },
  };
  const run = {
    events: [call, call, badRun.events[0] as never],
    files: {},
  };
  expect(overBudget(["max-tool-calls:2", "max-tokens:11"], run)).toEqual([]);
  expect(overBudget(["max-tool-calls:1"], run)).toHaveLength(1);
  expect(overBudget(["max-tokens:10"], run)).toHaveLength(1);
  expect(overBudget([], run)).toEqual([]);
});
