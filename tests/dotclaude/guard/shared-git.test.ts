// Tests of the destructive floor of the git commands (`domain/matchers/git.ts`), in the main session and in a subagent (spec P35, step 4; spec P37).
// The shared-checkout rule applies only in a subagent, and a branch switch only in the main checkout.
// The engine stub reads a real fixture folder for the `kind` and `.git` lookups, and no command runs.

import { expect, test } from "bun:test";
import fs from "node:fs";
import path from "node:path";
import type { EngineInterface } from "claude-code";
import { onBashCall } from "../../../src/plugins/dotclaude/slices/guard/adapters/mod.ts";
import { guardReason } from "../../../src/plugins/dotclaude/slices/guard/domain/guard.ts";
import { tmpDir } from "../../support/repo.ts";

/** A checkout with a `.git` folder, which is the main checkout of a repository. */
const main = tmpDir("dc-guard-main");
fs.mkdirSync(path.join(main, ".git"), { recursive: true });
fs.mkdirSync(path.join(main, "src"), { recursive: true });
await Bun.write(path.join(main, "src", "a.ts"), "export {};\n");

/** A linked worktree, where `.git` is a file that names the folder of the main checkout. */
const linked = tmpDir("dc-guard-linked");
await Bun.write(path.join(linked, ".git"), `gitdir: ${main}/.git\n`);
fs.mkdirSync(path.join(linked, "src"), { recursive: true });
await Bun.write(path.join(linked, "src", "a.ts"), "export {};\n");

/** The engine ports that the guard reads: `fs.stat` for the kind of a path, relative to `cwd`. */
const engineIn = (cwd: string): EngineInterface =>
  ({
    session: { cwd: async () => cwd },
    fs: {
      stat: async (file: string) => {
        const s = await fs.promises.stat(path.resolve(cwd, file));
        return {
          kind: s.isDirectory() ? "dir" : s.isFile() ? "file" : "other",
          size: s.size,
          mtimeMs: s.mtimeMs,
          isLink: false,
        };
      },
    },
  }) as unknown as EngineInterface;

/** The `tool.call` event of a `Bash` command, from a subagent when `agentId` is given. */
const bash = (command: string, agentId?: string) => ({
  tool: "Bash" as const,
  tool_use_id: "u1",
  command,
  ...(agentId ? { agentId } : {}),
});

/** A call that reaches the guard: the engine would run it, so `next` answers `ok`. */
const passes = (() => ({ result: "ok" })) as never;

/** The shared-checkout commands: denied in a subagent in the main checkout only for a branch switch. */
const SUBAGENT_IN_ANY_CHECKOUT = [
  "git stash",
  "git stash push -m wip",
  "git stash save wip",
  "git stash pop",
  "git stash apply",
  "git -C /p stash pop",
  "git worktree remove --force ../wt",
  "ls && git stash",
];

const SUBAGENT_IN_MAIN_ONLY = [
  "git checkout main",
  "git checkout -b feature",
  "git switch -c feature",
];

/** The destructive floor: denied in every session, with a subagent and the main session alike. */
const FLOOR = [
  "git reset --hard",
  "git reset HEAD --hard",
  "git clean -fd",
  "git checkout HEAD~1 -- .",
  "git checkout v1.0.0 -- ./",
  "git checkout HEAD~1 -- src/",
  "git checkout -- .",
  "git restore --source=HEAD~1 .",
  "git restore -s HEAD~1 ./",
  "git stash drop",
  "cd /p; git reset --hard",
];

/** The git commands that keep the checkout, in a subagent of a linked worktree. */
const SAFE_GIT = [
  "git status",
  "git log --oneline",
  "git stash list",
  "git reset HEAD src/a.ts",
  "git reset --soft HEAD~1",
  "git checkout HEAD~1 -- src/a.ts",
  "git checkout -b feature",
  "git switch -c feature",
  "git checkout main",
  "git restore src/a.ts",
  "git restore --staged .",
  'echo "git stash"',
];

/** The deny of `command` run by a subagent in `cwd`, or `null` when it stays allowed. */
const subagentDeny = (command: string, cwd: string) =>
  onBashCall(engineIn(cwd), bash(command, "a1"), passes);

test("a subagent in any checkout is denied for each stash and worktree command", async () => {
  for (const command of SUBAGENT_IN_ANY_CHECKOUT) {
    const out = await subagentDeny(command, linked);
    expect("deny" in out, command).toBe(true);
    const out2 = await subagentDeny(command, main);
    expect("deny" in out2, command).toBe(true);
  }
});

test("a subagent in the main checkout is denied for a branch switch", async () => {
  for (const command of SUBAGENT_IN_MAIN_ONLY) {
    const out = await subagentDeny(command, main);
    expect("deny" in out, command).toBe(true);
  }
});

test("a subagent in a linked worktree keeps a branch switch", async () => {
  for (const command of SAFE_GIT) {
    const out = await subagentDeny(command, linked);
    expect("deny" in out, command).toBe(false);
  }
});

test("each destructive git command is denied in a subagent and in the main session", async () => {
  for (const command of FLOOR) {
    const sub = await subagentDeny(command, linked);
    expect("deny" in sub, `subagent ${command}`).toBe(true);
    const mainOut = await onBashCall(engineIn(main), bash(command), passes);
    expect("deny" in mainOut, `main ${command}`).toBe(true);
  }
});

test("the main session keeps the stash and branch commands of the shared-checkout rule", async () => {
  for (const command of [
    ...SUBAGENT_IN_ANY_CHECKOUT,
    ...SUBAGENT_IN_MAIN_ONLY,
  ]) {
    const out = await onBashCall(engineIn(main), bash(command), passes);
    expect("deny" in out, command).toBe(false);
  }
});

test("a deny of a destructive command in a subagent holds the exact command", async () => {
  const reason = await guardReason("git stash pop", {
    kind: async () => "folder",
    isMainCheckout: async () => true,
    subagent: true,
  });
  expect(reason).toContain("git stash pop");
});
