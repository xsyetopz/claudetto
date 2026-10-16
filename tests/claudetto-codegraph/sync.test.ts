// The background sync of claudetto-codegraph (task 17.5) with a FAKE `codegraph` on `PATH`.
// Claude Code picks the classic hooks with `matcher`, so the test applies that field to a tool call
// as a stand-in for that choice, and then runs the command of each hook that is picked.
// The sync after a `git` command is a mod hook, and its lab test is in `slices/graph/lab/`.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import {
  BACKGROUND_HOOK_TIMEOUT_S,
  LOCK_STALE_MS,
} from "../../plugins/claudetto-codegraph/slices/graph/limits.ts";
import { CLI, PLUGIN, runHook, setUp } from "./fake-cli.ts";

type Hook = {
  type: string;
  command: string;
  async?: boolean;
  timeout: number;
};
type Group = { matcher: string; hooks: Hook[] };

const { PostToolUse }: { PostToolUse: Group[] } = (
  await Bun.file(path.join(PLUGIN, "hooks/hooks.json")).json()
).hooks;

/** STAND-IN for the choice of Claude Code: the hooks whose `matcher` fits the tool name. */
const picked = (tool_name: string) =>
  PostToolUse.filter((g) =>
    new RegExp(`^(${g.matcher})$`).test(tool_name),
  ).flatMap((g) => g.hooks);

test("an edit or a write picks one background sync, and other tools pick none", () => {
  for (const tool of ["Edit", "Write", "MultiEdit", "NotebookEdit"])
    expect(picked(tool).length, tool).toBe(1);
  for (const tool of ["Bash", "Read", "Grep"])
    expect(picked(tool).length, tool).toBe(0);
});

test("every sync hook is async with a time limit that covers the bound of the CLI call", () => {
  for (const hook of PostToolUse.flatMap((g) => g.hooks)) {
    expect(hook.async).toBe(true);
    expect(hook.timeout).toBe(BACKGROUND_HOOK_TIMEOUT_S);
  }
});

test("the command of a picked hook syncs an indexed project and prints nothing", async () => {
  const t = await setUp();
  const [hook] = picked("Edit") as [Hook];
  const mode = (
    hook.command.match(/hook\.ts" (\S+)$/) as RegExpMatchArray
  )[1] as string;
  const r = runHook(mode, { cwd: t.project, tool_name: "Edit" }, t.env);
  expect(r.out).toBe(null);
  expect(r.status).toBe(0);
  expect(await t.log()).toStrictEqual(["sync -q"]);
});

test("the sync of a project with no index, or with no CLI, runs nothing and exits 0", async () => {
  const none = await setUp({ index: false });
  expect(runHook("sync", { cwd: none.project }, none.env).status).toBe(0);
  expect(await none.log()).toStrictEqual([]);
  const missing = await setUp({ installed: false });
  const r = runHook("sync", { cwd: missing.project }, missing.env);
  expect(r.status).toBe(0);
  expect(r.out).toBe(null);
});

test("two edits close together run one sync at a time, and the last sync starts after the last edit", async () => {
  const t = await setUp();
  const env = { ...t.env, FAKE_SLEEP_MS: "800" };
  const payload = JSON.stringify({ cwd: t.project, tool_name: "Edit" });
  const first = Bun.spawn({
    cmd: [process.execPath, "--no-env-file", CLI, "sync"],
    stdin: Buffer.from(payload),
    env,
    stdout: "ignore",
  });
  // The first sync is running when the second edit ends.
  await Bun.sleep(400);
  const second = runHook("sync", { cwd: t.project }, env);
  await first.exited;
  expect(second.status).toBe(0);
  expect(await t.log()).toStrictEqual(["sync -q", "end", "sync -q", "end"]);
  expect(fs.readdirSync(`${t.project}/.codegraph`)).toStrictEqual([
    "codegraph.db",
  ]);
});

test("a lock that a dead process left is removed, and the sync runs", async () => {
  const t = await setUp();
  const lock = `${t.project}/.codegraph/claudetto-sync.lock`;
  await Bun.write(lock, "");
  const old = new Date(Date.now() - 2 * LOCK_STALE_MS);
  fs.utimesSync(lock, old, old);
  runHook("sync", { cwd: t.project }, t.env);
  expect(await t.log()).toStrictEqual(["sync -q"]);
  expect(fs.existsSync(lock)).toBe(false);
});

test("a fresh lock of a running sync makes the caller leave a mark and end", async () => {
  const t = await setUp();
  const lock = `${t.project}/.codegraph/claudetto-sync.lock`;
  await Bun.write(lock, "");
  expect(runHook("sync", { cwd: t.project }, t.env).status).toBe(0);
  expect(await t.log()).toStrictEqual([]);
  expect(fs.existsSync(`${t.project}/.codegraph/claudetto-sync.pending`)).toBe(
    true,
  );
});
