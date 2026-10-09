// Fixture runs of the `context-handoff` case (task 22.6, spec usage-awareness "Context handoff"):
// the oracle reads `tasks.md`, and `finalMatches` reads the last message.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import { caseFaults, loadCases } from "../../tools/eval/cases.mjs";
import { runCase } from "../../tools/eval/run.mjs";
import {
  done,
  EVALS,
  fakeRunner,
  hostExec,
  init,
  plugin,
  write,
} from "./support.mjs";

const TASKS = "openspec/changes/demo/tasks.md";
const FINAL = "Handoff done. Run `/clear`, and then `/opsx:apply demo`.";
const { def, dir } = loadCases(path.join(EVALS, "handoff"), [
  "context-handoff",
])[0];

const go = (act, final = FINAL) =>
  runCase(def, {
    arm: "dotclaude",
    model: "m",
    runner: fakeRunner([init(plugin), done(final)], act),
    exec: hostExec,
    caseDir: dir,
    expectedVersion: "2.1.295",
  });

/** The audit code of part `n` in the generated log of the run. */
const codeOf = (job, n) =>
  /audit code is (\S+)/.exec(
    fs.readFileSync(
      path.join(job.workDir, `data/part-${String(n).padStart(2, "0")}.log`),
      "utf8",
    ),
  )[1];

/**
 * Do the first `count` tasks and mark them, and add `note` to the next task.
 * `lineAfter` puts the note on its own line after task `lineAfter` in place of the end of the next task.
 */
const work =
  (
    count,
    {
      note = " Status 2026-10-09: part-03 not read, next step reads it.",
      mark = count,
      lineAfter = 0,
    } = {},
  ) =>
  (job) => {
    const codes = Array.from(
      { length: count },
      (_, i) => `part-${String(i + 1).padStart(2, "0")}: ${codeOf(job, i + 1)}`,
    );
    write(job, "notes/codes.md", `# Audit codes\n\n${codes.join("\n")}\n`);
    const lines = fs
      .readFileSync(path.join(job.workDir, TASKS), "utf8")
      .split("\n")
      .map((l) => {
        const n = Number(/^- \[ \] 1\.(\d+) /.exec(l)?.[1]);
        const line = n && n <= mark ? l.replace("- [ ]", "- [x]") : l;
        if (lineAfter)
          return n === lineAfter ? `${line}\n${note.trim()}` : line;
        return n === mark + 1 ? line + note : line;
      });
    write(job, TASKS, lines.join("\n"));
  };

test("a handoff with marked tasks, a status note, and the resume command is resolved", async () => {
  const r = await go(work(2));
  expect(r.oracle.every((o) => o.pass)).toBe(true);
  expect(r.tamper).toBe(false);
  expect(r.finalMissing).toEqual([]);
  expect(r.resolved).toBe(true);
});

test("a last message with no `/clear` is not resolved, and the record names the missing string", async () => {
  const r = await go(
    work(2),
    "Done for now. Continue with `/opsx:apply demo`.",
  );
  expect(r.finalMissing).toEqual(["/clear"]);
  expect(r.resolved).toBe(false);
});

test("an open task with no status note is not resolved", async () => {
  expect((await go(work(2, { note: "" }))).resolved).toBe(false);
});

// Eval runs of 2026-10-09: the model put the note on the line after the last marked task (option (c) of task 22.6).
test("a status note on its own line directly above the first open task is resolved", async () => {
  expect((await go(work(2, { lineAfter: 2 }))).resolved).toBe(true);
});

test("a status note under an earlier marked task is not resolved", async () => {
  expect((await go(work(2, { lineAfter: 1 }))).resolved).toBe(false);
});

test("a marked task whose check fails is not resolved", async () => {
  expect((await go(work(2, { mark: 3 }))).resolved).toBe(false);
});

test("a run that marks every task did not hand off, and is not resolved", async () => {
  expect((await go(work(20))).resolved).toBe(false);
});

test("`finalMatches` must be a list of strings", () => {
  expect(caseFaults({ ...def, finalMatches: "/clear" }, dir)).toContain(
    "finalMatches must be a list of strings",
  );
  expect(caseFaults(def, dir)).toEqual([]);
});
