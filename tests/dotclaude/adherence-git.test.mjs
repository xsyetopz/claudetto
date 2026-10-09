// The git ask of the `adherence` hooks (design D34, case S2) with commands as strings.
// No command runs and no file is read.

import { expect, test } from "bun:test";
import { decide } from "../../plugins/dotclaude/features/adherence/cli.mjs";
import { commands } from "../../plugins/dotclaude/features/adherence/git.mjs";

const NO_IO = { read: () => null, exists: () => false, transcript: () => null };
const out = (command) =>
  decide({ tool_name: "Bash", cwd: "/w", tool_input: { command } }, {}, NO_IO)
    ?.hookSpecificOutput;

test.each([
  "git stash",
  "git stash push -m wip",
  "git stash -u",
  "git stash save wip",
  "git stash pop",
  "git stash apply stash@{1}",
  "git stash drop",
  "git stash clear",
  "git stash -q && git stash pop -q",
  "git checkout -- src/a.mjs",
  "git checkout HEAD~1 -- src/a.mjs",
  "git checkout .",
  "git checkout -f main",
  "git restore src/a.mjs",
  "git restore --source=HEAD~1 src/a.mjs",
  "git restore --staged --worktree src/a.mjs",
  "git reset --hard",
  "git reset --hard origin/main",
  "git reset --soft HEAD~1",
  "git reset --mixed abc1234",
  "git reset HEAD~2",
  "git reset abc1234",
  "git reset main",
  "git -C app stash",
  "git -c user.name=x reset --hard",
  "cd app && git stash pop",
  "FOO=1 sudo git reset --hard",
  "bash -c 'git stash'",
  "echo hi; git stash\ngit status",
])("`%s` gets an ask", (command) => {
  const o = out(command);
  expect(o.hookEventName).toBe("PreToolUse");
  expect(o.permissionDecision).toBe("ask");
  expect(o.permissionDecisionReason).toContain("moves or discards work");
});

test.each([
  "git stash list",
  "git stash show -p",
  "git stash create",
  "git status",
  "git diff --stat",
  "git log --oneline -n 5",
  "git checkout main",
  "git checkout -b feature",
  "git checkout feature/x",
  "git restore --staged src/a.mjs",
  "git reset",
  "git reset src/a.mjs",
  "git reset -- src/a.mjs",
  "git reset HEAD src/a.mjs",
  "git reset -p",
  "git stashed",
  "echo git stash",
  "grep 'git stash' notes.md",
  "git commit -m 'git reset is risky'",
  "cat <<'EOF'\ngit stash\nEOF",
  "git",
  "",
])("`%s` gets no ask", (command) => {
  expect(out(command)).toBeUndefined();
});

test("the command after a heredoc is still read", () => {
  expect(
    out("cat <<'EOF'\ngit status\nEOF\ngit stash").permissionDecision,
  ).toBe("ask");
});

test("the shell reader drops quotes and splits on operators", () => {
  expect(commands(`git commit -m "a b" && echo 'c d'; ls | wc`)).toEqual([
    ["git", "commit", "-m", "a b"],
    ["echo", "c d"],
    ["ls"],
    ["wc"],
  ]);
});

test("a call of another tool, or with no input, gets no ask", () => {
  expect(
    decide({ tool_name: "Read", tool_input: {} }, {}, NO_IO),
  ).toBeUndefined();
  expect(decide({ tool_name: "Bash" }, {}, NO_IO)).toBeUndefined();
  expect(decide(undefined, {}, NO_IO)).toBeUndefined();
});

test("a command that is not text fails open", () => {
  const o = decide(
    { tool_name: "Bash", tool_input: { command: 5 } },
    {},
    NO_IO,
  );
  expect(o).toBeUndefined();
});
