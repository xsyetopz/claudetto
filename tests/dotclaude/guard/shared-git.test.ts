// Tests of the deny of the git commands that change the shared checkout, in a subagent (spec P35, step 4).
// The hook lab cannot mark a `tool.call` as a call of a subagent, so the subagent case calls `onBashCall` here.
// The git deny reads no engine call, so the engine stub is an empty object.

import { expect, test } from "bun:test";
import type { EngineInterface } from "claude-code";
import { onBashCall } from "../../../src/plugins/dotclaude/slices/guard/adapters/mod.ts";
import { sharedGitReason } from "../../../src/plugins/dotclaude/slices/guard/domain/git.ts";

/** The `tool.call` event of a `Bash` command, from a subagent when `agentId` is given. */
const bash = (command: string, agentId?: string) => ({
  tool: "Bash" as const,
  tool_use_id: "u1",
  command,
  ...(agentId ? { agentId } : {}),
});

const SHARED_GIT = [
  "git stash",
  "git stash list",
  "git stash push -m wip",
  "git stash pop",
  "git stash apply",
  "git -C /p stash pop",
  "git reset --hard",
  "git reset HEAD --hard",
  "git clean -fd",
  "git checkout HEAD~1 -- .",
  "git checkout v1.0.0 -- ./",
  "git checkout HEAD~1 -- src/",
  "git restore --source=HEAD~1 .",
  "git restore -s HEAD~1 ./",
  "ls && git stash",
  "cd /p; git reset --hard",
];

const SAFE_GIT = [
  "git status",
  "git log --oneline",
  "git reset HEAD src/a.ts",
  "git reset --soft HEAD~1",
  "git checkout -- .",
  "git checkout HEAD~1 -- src/a.ts",
  "git checkout -b feature",
  "git restore src/a.ts",
  "git restore --staged .",
  'echo "git stash"',
];

// The engine call of these commands is not read, so an empty stub stands for it.
const engine = {} as EngineInterface;
const passes = (() => ({ result: "ok" })) as never;

test("a subagent's `Bash` call of each shared-state git command is denied", async () => {
  for (const command of SHARED_GIT) {
    const out = await onBashCall(engine, bash(command, "a1"), passes);
    expect("deny" in out, command).toBe(true);
  }
});

test("a deny of a shared-state git command names the way to set work aside", () => {
  const reason = sharedGitReason("git stash");
  expect(reason).toContain("`git commit`");
});

test("a git command that keeps the shared checkout stays allowed in a subagent", async () => {
  for (const command of SAFE_GIT) {
    const out = await onBashCall(engine, bash(command, "a1"), passes);
    expect("deny" in out, command).toBe(false);
  }
});

test("the main session keeps the shared-state git commands it has now", async () => {
  for (const command of SHARED_GIT) {
    const out = await onBashCall(engine, bash(command), passes);
    expect("deny" in out, command).toBe(false);
  }
});
