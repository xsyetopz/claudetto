// The silent `sembr` hook on `Bash` (spec semantic-line-breaks, requirement "Commit and pull request text"):
// the quoted heredoc of `git commit -m` and `gh pr create --body`, and no other form.
// The tests give commands to the hook as strings and never run them.

import { expect, test } from "bun:test";
import { rewrite } from "../../plugins/dotclaude/features/sembr/cli.mjs";
import { rewriteCommand } from "../../plugins/dotclaude/features/sembr/rules.mjs";

const bash = (command) => ({
  tool_name: "Bash",
  cwd: "/w",
  tool_input: { command },
});
const commit = (body, tag = "'EOF'") =>
  `git commit -m "$(cat <<${tag}\n${body}\nEOF\n)"`;
const pr = (body, title = "Fix. It works") =>
  `gh pr create --title "${title}" --body "$(cat <<'EOF'\n${body}\nEOF\n)"`;
const TRAILER = "Co-Authored-By: Claude <noreply@anthropic.com>";

test("a quoted heredoc of `git commit` is rewritten, with the subject and the trailer kept", () => {
  const out = rewrite(
    bash(
      commit(
        `Fix it. Now it works.\n\nRead the file. Then edit it.\n\n${TRAILER}`,
      ),
    ),
  );
  expect(out.hookSpecificOutput.updatedInput.command).toBe(
    commit(
      `Fix it. Now it works.\n\nRead the file.\nThen edit it.\n\n${TRAILER}`,
    ),
  );
});

test("a quoted heredoc of `gh pr create` is rewritten, with the `--title` kept", () => {
  const out = rewrite(bash(pr("Read the file. Then edit it.")));
  expect(out.hookSpecificOutput.updatedInput.command).toBe(
    pr("Read the file.\nThen edit it."),
  );
});

test("the output has `updatedInput` only: no `permissionDecision`, no `additionalContext`", () => {
  const out = rewrite(bash(pr("Read the file. Then edit it.")));
  expect(Object.keys(out)).toEqual(["hookSpecificOutput"]);
  expect(Object.keys(out.hookSpecificOutput).sort()).toEqual([
    "hookEventName",
    "updatedInput",
  ]);
});

test("`-F file` and `--body-file file` are not rewritten", () => {
  expect(rewrite(bash("git commit -F msg.txt"))).toBeUndefined();
  expect(
    rewrite(bash('gh pr create --title "T" --body-file body.md')),
  ).toBeUndefined();
  expect(
    rewrite(bash(`git commit -F - <<'EOF'\nRead the file. Then edit it.\nEOF`)),
  ).toBeUndefined();
});

test("a `-m` string with no heredoc is not rewritten", () => {
  expect(
    rewrite(bash('git commit -m "Read the file. Then edit it."')),
  ).toBeUndefined();
});

test("an unquoted heredoc is not rewritten, because the shell expands it", () => {
  expect(
    rewriteCommand(commit("Read $HOME. Then edit it.", "EOF")),
  ).toBeUndefined();
  expect(
    rewriteCommand(commit("Read the file. Then edit it.", '"EOF"')),
  ).toBeUndefined();
});

test("a body where a sembr output line would equal the delimiter is not rewritten", () => {
  expect(rewriteCommand(commit("Subject\n\nBody text. EOF"))).toBeUndefined();
  expect(rewriteCommand(pr("Body text. EOF"))).toBeUndefined();
});

test("the subject line of a commit stays unchanged", () => {
  expect(rewriteCommand(commit("Fix it. Now it works."))).toBeUndefined();
});

test("trailer lines stay unchanged", () => {
  expect(
    rewriteCommand(
      commit(`Subject\n\nBody.\n\n${TRAILER}\nSigned-off-by: A. B <a@b.c>`),
    ),
  ).toBeUndefined();
});

test("a body that needs no change gives no output", () => {
  expect(rewriteCommand(pr("Read the file.\nThen edit it."))).toBeUndefined();
});

test("another command or a missing closing delimiter gives no output", () => {
  expect(rewriteCommand("echo hi")).toBeUndefined();
  expect(rewriteCommand(undefined)).toBeUndefined();
  expect(
    rewriteCommand(
      `echo "$(cat <<'EOF'\nRead the file. Then edit it.\nEOF\n)"`,
    ),
  ).toBeUndefined();
  expect(
    rewriteCommand(
      `git commit -m "$(cat <<'EOF'\nS\n\nRead it. Then edit it.\n)"`,
    ),
  ).toBeUndefined();
});

test("a second heredoc in the command is not rewritten", () => {
  expect(
    rewriteCommand(
      `${commit("S\n\nRead it. Then edit it.")} && cat <<'X'\nA. B\nX`,
    ),
  ).toBeUndefined();
});
