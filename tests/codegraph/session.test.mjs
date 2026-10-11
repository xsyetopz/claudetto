// The session start, the sync, and the project folder of the command hooks of dotclaude-codegraph (design D26)
// with a FAKE `codegraph` on `PATH`. Scenarios: no index, a missing CLI, and the background sync.

import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";
import { grep, runHook, setUp, text } from "./fake-cli.mjs";

test("a project with no index: no hook runs a command or adds text", () => {
  const t = setUp({ index: false });
  const payload = grep(t.project, "parse_amount");
  assert.equal(runHook("session-start", payload, t.env).out, null);
  assert.equal(runHook("search", payload, t.env).out, null);
  assert.equal(runHook("sync", payload, t.env).out, null);
  assert.deepEqual(t.log(), []);
});

test("session start in an indexed project syncs and adds one line with the commands for callers, callees, and impact", () => {
  const t = setUp();
  const r = runHook("session-start", { cwd: t.project }, t.env);
  assert.deepEqual(t.log(), ["sync -q"]);
  assert.equal(r.out.hookSpecificOutput.hookEventName, "SessionStart");
  const line = text(r);
  assert.ok(!line.includes("\n"), line);
  for (const command of [
    "codegraph callers",
    "codegraph callees",
    "codegraph impact",
    "-d 5",
  ])
    assert.ok(line.includes(command), line);
});

test("session start with the CLI missing adds nothing", () => {
  const t = setUp({ installed: false });
  assert.equal(runHook("session-start", { cwd: t.project }, t.env).out, null);
});

test("a missing CLI adds nothing to a search", () => {
  const t = setUp({ installed: false });
  assert.equal(
    runHook("search", grep(t.project, "parse_amount"), t.env).out,
    null,
  );
});

test("the sync mode runs codegraph sync -q and prints nothing", () => {
  const t = setUp();
  const r = runHook("sync", { cwd: t.project, tool_name: "Edit" }, t.env);
  assert.equal(r.out, null);
  assert.equal(r.status, 0);
  assert.deepEqual(t.log(), ["sync -q"]);
});

test("the project folder comes from CLAUDE_PROJECT_DIR before the payload cwd", () => {
  const t = setUp();
  const r = runHook(
    "session-start",
    { cwd: "/nonexistent" },
    { ...t.env, CLAUDE_PROJECT_DIR: t.project },
  );
  assert.notEqual(r.out, null);
});

test("a home folder with .codegraph/ and no database is not an index", () => {
  const t = setUp({ index: false });
  fs.mkdirSync(`${t.project}/.codegraph`);
  fs.writeFileSync(`${t.project}/.codegraph/telemetry-queue.jsonl`, "");
  assert.equal(runHook("session-start", { cwd: t.project }, t.env).out, null);
  assert.deepEqual(t.log(), []);
});
