// The session start, the sync, and the project folder of the command hooks of dotclaude-codegraph (design D26)
// with a FAKE `codegraph` on `PATH`. Scenarios: no index, a missing CLI, and the background sync.

import { expect, test } from "bun:test";
import fs from "node:fs";
import { grep, runHook, setUp, text } from "./fake-cli.ts";

test("a project with no index: no hook runs a command or adds text", async () => {
  const t = await setUp({ index: false });
  const payload = grep(t.project, "parse_amount");
  expect(runHook("session-start", payload, t.env).out).toBe(null);
  expect(runHook("sync", payload, t.env).out).toBe(null);
  expect(await t.log()).toStrictEqual([]);
});

test("session start in an indexed project syncs and adds one line with the commands for callers, callees, and impact", async () => {
  const t = await setUp();
  const r = runHook("session-start", { cwd: t.project }, t.env);
  expect(await t.log()).toStrictEqual(["sync -q"]);
  expect(r.out?.hookSpecificOutput.hookEventName).toBe("SessionStart");
  const line = text(r);
  expect(!line.includes("\n"), line).toBeTruthy();
  for (const command of [
    "codegraph callers",
    "codegraph callees",
    "codegraph impact",
    "-d 5",
  ])
    expect(line.includes(command), line).toBeTruthy();
});

test("session start with the CLI missing adds nothing", async () => {
  const t = await setUp({ installed: false });
  expect(runHook("session-start", { cwd: t.project }, t.env).out).toBe(null);
});

test("the sync mode runs codegraph sync -q and prints nothing", async () => {
  const t = await setUp();
  const r = runHook("sync", { cwd: t.project, tool_name: "Edit" }, t.env);
  expect(r.out).toBe(null);
  expect(r.status).toBe(0);
  expect(await t.log()).toStrictEqual(["sync -q"]);
});

test("the project folder comes from CLAUDE_PROJECT_DIR before the payload cwd", async () => {
  const t = await setUp();
  const r = runHook(
    "session-start",
    { cwd: "/nonexistent" },
    { ...t.env, CLAUDE_PROJECT_DIR: t.project },
  );
  expect(r.out).not.toBe(null);
});

test("a home folder with .codegraph/ and no database is not an index", async () => {
  const t = await setUp({ index: false });
  fs.mkdirSync(`${t.project}/.codegraph`);
  await Bun.write(`${t.project}/.codegraph/telemetry-queue.jsonl`, "");
  expect(runHook("session-start", { cwd: t.project }, t.env).out).toBe(null);
  expect(await t.log()).toStrictEqual([]);
});
