// The behavior measures of the `eval-suite` spec (task 18.7) on fixture runs with known counts.

import { expect, test } from "bun:test";
import { loadCases } from "../../tools/eval/cases.mjs";
import { runCase } from "../../tools/eval/run.mjs";
import {
  call,
  done,
  EVALS,
  hostExec,
  init,
  ok,
  plugin,
  say,
} from "./support.mjs";

const { def, dir } = loadCases(EVALS, ["bugfix-range"])[0];
const run = (events) =>
  runCase(def, {
    arm: "dotclaude",
    model: "m",
    exec: hostExec,
    caseDir: dir,
    expectedVersion: "2.1.295",
    runner: async () => ({ events: [init(plugin), ...events], exitCode: 0 }),
  });

test("fixture A: 2 repeat reads, a recap, 2 of 3 chat lines with 2 sentences, 1 unsourced figure", async () => {
  const final = "Summary: I read the file. Context is at 62% of context.";
  const r = await run([
    call("1", "Read", { file_path: "a.mjs" }),
    ok("1"),
    call("2", "Read", { file_path: "a.mjs" }),
    ok("2"),
    call("3", "Read", { file_path: "a.mjs" }),
    ok("3"),
    call("4", "Read", { file_path: "a.mjs", offset: 5, limit: 5 }),
    ok("4"),
    say("I read it. It is short.\nThe bug is clear. I fix it.\nDone."),
    done(final),
  ]);
  expect(r.repeatReads).toBe(2);
  expect(r.recap).toBe(true);
  expect([r.chatLines, r.chatMulti]).toEqual([3, 2]);
  expect(r.unsourced).toBe(1);
});

test("fixture B: no repeat read, no recap, one-sentence lines, a sourced figure", async () => {
  const r = await run([
    call("1", "Bash", { command: "echo ctx" }),
    ok("1", "context 40%"),
    call("2", "Read", { file_path: "a.mjs" }),
    ok("2"),
    call("3", "Read", { file_path: "b.mjs" }),
    ok("3"),
    say("Fixed the range.\nTests pass."),
    done("Fixed. Context is 40% of context."),
  ]);
  expect(r.repeatReads).toBe(0);
  expect(r.recap).toBe(false);
  expect([r.chatLines, r.chatMulti]).toEqual([2, 0]);
  expect(r.unsourced).toBe(0);
});

test("a report that starts with a check it ran is not a recap", async () => {
  const final =
    "Fixed the range.\nI ran `node --test check/abs.test.mjs`: 1 test, 1 pass, 0 fail.\nI checked it on `[3,1,2]` and got 2.";
  expect((await run([done(final)])).recap).toBe(false);
  expect(
    (await run([done("I first read the file, then fixed it.")])).recap,
  ).toBe(true);
});

test("a neutral-question run keeps the question that it graded", async () => {
  const { def: nq, dir: nqDir } = loadCases(EVALS, ["neutral-question"])[0];
  const input = {
    question: "Which store do we use for the job queue?",
    options: [{ key: "SQLite" }, { key: "Redis" }],
  };
  const r = await runCase(nq, {
    arm: "dotclaude",
    model: "m",
    exec: hostExec,
    caseDir: nqDir,
    expectedVersion: "2.1.295",
    runner: async () => ({
      events: [
        init(plugin),
        call("1", "second_opinion", input),
        ok("1"),
        done("ok"),
      ],
      exitCode: 0,
    }),
  });
  expect(r.neutral.question).toBe(
    "Which store do we use for the job queue?\nSQLite\n\nRedis\n",
  );
});
