// The classic auto-mode hook of `features/guard/cli.mjs`, with commands as strings.
// No command runs.

import { expect, test } from "bun:test";
import { decide } from "../../plugins/dotclaude/features/guard/cli.mjs";

const env = { CLAUDE_PROJECT_DIR: "/w/app", HOME: "/h", TMPDIR: "/var/tmp/me" };
const payload = (command, mode = "auto") => ({
  session_id: "s1",
  cwd: "/w/app",
  permission_mode: mode,
  tool_name: "Bash",
  tool_input: { command },
});

test("in auto mode, a recursive `rm` outside the project asks", async () => {
  const out = await decide(payload("rm -r ~/victim"), env);
  expect(out.hookSpecificOutput.permissionDecision).toBe("ask");
  expect(
    out.hookSpecificOutput.permissionDecisionReason.length,
  ).toBeGreaterThan(0);
});

test("in auto mode, a recursive `rm` in the project or a temp folder gives no output", async () => {
  for (const command of [
    "rm -rf ./build",
    "rm -rf /tmp/x",
    "rm -rf /var/tmp/me/x",
  ])
    expect(await decide(payload(command), env)).toBeUndefined();
});

test("in each other mode, the script gives no output", async () => {
  for (const mode of ["default", "acceptEdits", "plan", "dontAsk"])
    expect(await decide(payload("rm -r ~/victim", mode), env)).toBeUndefined();
});

test("a call that reaches a repository of another owner gives no output, as the hook keeps no state", async () => {
  expect(await decide(payload("gh repo view other/lib"), env)).toBeUndefined();
});

test("in auto mode, a variable that a later segment resets and a `rm` after `do` or `(` ask", async () => {
  for (const command of [
    'D=$(mktemp -d); read D <<< "$HOME"; rm -rf "$D"',
    'D=$(mktemp -d); D+=/../../..; rm -rf "$D"',
    'D=$(mktemp -d); eval "D=$HOME"; rm -rf "$D"',
    'D=$(mktemp -d); printf -v D %s "$HOME"; rm -rf "$D"',
    'D=$(mktemp -d); for D in ~; do rm -rf "$D"; done',
    "for x in 1; do rm -rf ~; done",
    "(rm -rf ~)",
  ]) {
    const out = await decide(payload(command), env);
    expect(out.hookSpecificOutput.permissionDecision).toBe("ask");
  }
  expect(
    await decide(payload('D=$(mktemp -d); rm -rf "$D"'), env),
  ).toBeUndefined();
});
