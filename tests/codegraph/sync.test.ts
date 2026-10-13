// The background sync of dotclaude-codegraph (task 17.5) with a FAKE `codegraph` on `PATH`.
// Claude Code picks the classic hooks with `matcher`, so the test applies that field to a tool call
// as a stand-in for that choice, and then runs the command of each hook that is picked.
// The sync after a `git` command is a mod hook with the filter `TREE_CHANGE`, and its lab test is in `slices/graph/lab/`.

import { expect, test } from "bun:test";
import path from "node:path";
import { TREE_CHANGE } from "../../plugins/dotclaude-codegraph/slices/graph/domain/graph.ts";
import { BACKGROUND_SYNC_TIMEOUT_MS } from "../../plugins/dotclaude-codegraph/slices/graph/limits.ts";
import { PLUGIN, runHook, setUp } from "./fake-cli.ts";

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

test("each git command that changes the tree fits the filter of the mod hook", () => {
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
    expect(TREE_CHANGE.test(`git ${sub}`), sub).toBe(true);
});

test("a git command with global options before its verb fits the filter", () => {
  for (const command of [
    "git -C dir commit -m x",
    "git -c user.name=x pull --ff-only",
    "git --git-dir=/p/.git --work-tree=/p commit -m x",
    "git --no-pager -C 'my dir' merge main",
    "git -c user.name=\"A B\" rebase main",
  ])
    expect(TREE_CHANGE.test(command), command).toBe(true);
});

test("a git command with global options before a read verb does not fit the filter", () => {
  expect(TREE_CHANGE.test("git -C dir log --oneline")).toBe(false);
});

test("a git command that does not change the tree, and other commands, do not fit the filter", () => {
  for (const command of [
    "git status",
    "git diff HEAD",
    "git log --oneline",
    "git show HEAD",
    "git branch",
    "git push",
    "ls",
  ])
    expect(TREE_CHANGE.test(command), command).toBe(false);
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
