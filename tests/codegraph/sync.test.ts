// The background sync of dotclaude-codegraph (task 17.5) with a FAKE `codegraph` on `PATH`.
// Claude Code picks the hooks with `matcher` and `if`, so the test applies both fields to a tool call
// as a stand-in for that choice, and then runs the command of each hook that is picked.

import { expect, test } from "bun:test";
import path from "node:path";
import { BACKGROUND_SYNC_TIMEOUT_MS } from "../../plugins/dotclaude-codegraph/features/graph/limits.ts";
import { PLUGIN, runHook, setUp } from "./fake-cli.ts";

type Hook = {
  type: string;
  command: string;
  if?: string;
  async?: boolean;
  timeout: number;
};
type Group = { matcher: string; hooks: Hook[] };
type ToolInput = { command?: string; file_path?: string; pattern?: string };

const { PostToolUse }: { PostToolUse: Group[] } = (
  await Bun.file(path.join(PLUGIN, "hooks/hooks.json")).json()
).hooks;

/** STAND-IN for the choice of Claude Code: the `Bash(prefix *)` form of `if` against a command. */
const ifMatches = (rule: string | undefined, input: ToolInput | undefined) => {
  if (!rule) return true;
  const prefix = rule.match(/^Bash\((.*) \*\)$/)?.[1];
  return prefix !== undefined && input?.command?.startsWith(`${prefix} `);
};

/** The hooks that a tool call picks. */
const picked = (tool_name: string, tool_input: ToolInput) =>
  PostToolUse.filter((g) => new RegExp(`^(${g.matcher})$`).test(tool_name))
    .flatMap((g) => g.hooks)
    .filter((h) => ifMatches(h.if, tool_input));

const bash = (command: string): [string, ToolInput] => ["Bash", { command }];

test("an edit or a write picks one background sync", () => {
  for (const tool of ["Edit", "Write", "MultiEdit", "NotebookEdit"])
    expect(picked(tool, { file_path: "a.py" }).length, tool).toBe(1);
});

test("each git command that changes the tree picks one background sync", () => {
  for (const sub of [
    "commit -m x",
    "merge main",
    "rebase main",
    "pull --ff-only",
    "checkout main",
    "switch main",
    "reset --hard HEAD~1",
    "cherry-pick abc",
    "revert abc",
    "stash pop",
    "apply a.patch",
    "am a.mbox",
  ])
    expect(picked(...bash(`git ${sub}`)).length, sub).toBe(1);
});

test("a git command that does not change the tree, and other calls, pick no sync", () => {
  for (const command of [
    "git status",
    "git diff HEAD",
    "git log --oneline",
    "git show HEAD",
    "git branch",
    "git push",
    "ls",
  ])
    expect(picked(...bash(command)).length, command).toBe(0);
  expect(picked("Read", { file_path: "a.py" }).length).toBe(0);
  expect(picked("Grep", { pattern: "x" }).length).toBe(0);
});

test("every sync hook is async with a time limit that covers the bound of the CLI call", () => {
  for (const hook of PostToolUse.flatMap((g) => g.hooks)) {
    expect(hook.async).toBe(true);
    expect(
      hook.timeout * 1000 >= BACKGROUND_SYNC_TIMEOUT_MS,
      `${hook.timeout * 1000}`,
    ).toBeTruthy();
  }
});

test("the command of a picked hook syncs an indexed project and prints nothing", async () => {
  const t = await setUp();
  const calls: [string, ToolInput][] = [
    ["Edit", { file_path: "a.py" }],
    bash("git commit -m x"),
  ];
  for (const [tool, input] of calls) {
    const [hook] = picked(tool, input) as [Hook];
    const mode = (
      hook.command.match(/cli\.ts" (\S+)$/) as RegExpMatchArray
    )[1] as string;
    const r = runHook(mode, { cwd: t.project, tool_name: tool }, t.env);
    expect(r.out).toBe(null);
    expect(r.status).toBe(0);
  }
  expect(await t.log()).toStrictEqual(["sync -q", "sync -q"]);
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
