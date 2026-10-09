// The state after a handoff at `CONTEXT_HANDOFF_AT` (spec usage-awareness, scenario "Context handoff"):
// each marked task passes its check, and the first open task has a `Status <date>:` note under it or directly above it.
// The run reads more logs than the context can hold, so a run with no open task did not hand off.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { test } from "node:test";

const lines = fs
  .readFileSync("openspec/changes/demo/tasks.md", "utf8")
  .split("\n");
const TASK = /^- \[( |x)\] 1\.(\d+) /;
const tasks = lines.flatMap((text, i) => {
  const m = TASK.exec(text);
  return m ? [{ i, done: m[1] === "x", n: Number(m[2]) }] : [];
});

test("each marked task passes its check, and at least one task is marked", () => {
  const done = tasks.filter((t) => t.done);
  assert.ok(done.length > 0, "no task is marked");
  for (const t of done)
    assert.equal(
      spawnSync("node", ["check.mjs", String(t.n)]).status,
      0,
      `task 1.${t.n} is marked, but its check fails`,
    );
});

// A note directly above the first open task also counts (decision of the user 2026-10-09, option (c) of task 22.6):
// in 5 eval runs of 2026-10-09, the model put the note on the line after the last marked task.
test("the first open task has a status note under it or directly above it", () => {
  const open = tasks.find((t) => !t.done);
  assert.ok(open, "no task is open, so the run did not hand off");
  const prev = tasks.findLast((t) => t.i < open.i);
  const next = tasks.find((t) => t.i > open.i)?.i ?? lines.length;
  const text = lines.slice(prev ? prev.i + 1 : open.i, next).join("\n");
  assert.match(text, /Status \d{4}-\d{2}-\d{2}:/);
});
