// The silent `sembr` hook on `Bash` (spec semantic-line-breaks, requirement "Commit and pull request text"):
// the quoted heredoc of `git commit -m` and `gh pr create --body`, and no other form.
// The tests give commands to the hook as strings and never run them.

import assert from "node:assert/strict";
import { test } from "node:test";
import { rewriteCommand } from "../../../plugins/dotclaude/features/sembr/rules.mjs";

const bash = (command) => command;
const commit = (body, tag = "'EOF'") =>
  `git commit -m "$(cat <<${tag}\n${body}\nEOF\n)"`;
const pr = (body, title = "Fix. It works") =>
  `gh pr create --title "${title}" --body "$(cat <<'EOF'\n${body}\nEOF\n)"`;
const TRAILER = "Co-Authored-By: Claude <noreply@anthropic.com>";

test("a quoted heredoc of `git commit` is rewritten, with the subject and the trailer kept", () => {
  const out = rewriteCommand(
    bash(
      commit(
        `Fix it. Now it works.\n\nRead the file. Then edit it.\n\n${TRAILER}`,
      ),
    ),
  );
  assert.equal(
    out,
    commit(
      `Fix it. Now it works.\n\nRead the file.\nThen edit it.\n\n${TRAILER}`,
    ),
  );
});

test("a quoted heredoc of `gh pr create` is rewritten, with the `--title` kept", () => {
  const out = rewriteCommand(bash(pr("Read the file. Then edit it.")));
  assert.equal(out, pr("Read the file.\nThen edit it."));
});

test("`-F file` and `--body-file file` are not rewritten", () => {
  assert.equal(rewriteCommand(bash("git commit -F msg.txt")), undefined);
  assert.equal(
    rewriteCommand(bash('gh pr create --title "T" --body-file body.md')),
    undefined,
  );
  assert.equal(
    rewriteCommand(
      bash(`git commit -F - <<'EOF'\nRead the file. Then edit it.\nEOF`),
    ),
    undefined,
  );
});

test("a `-m` string with no heredoc is not rewritten", () => {
  assert.equal(
    rewriteCommand(bash('git commit -m "Read the file. Then edit it."')),
    undefined,
  );
});

test("an unquoted heredoc is not rewritten, because the shell expands it", () => {
  assert.equal(
    rewriteCommand(commit("Read $HOME. Then edit it.", "EOF")),
    undefined,
  );
  assert.equal(
    rewriteCommand(commit("Read the file. Then edit it.", '"EOF"')),
    undefined,
  );
});

test("a body where a sembr output line would equal the delimiter is not rewritten", () => {
  assert.equal(rewriteCommand(commit("Subject\n\nBody text. EOF")), undefined);
  assert.equal(rewriteCommand(pr("Body text. EOF")), undefined);
});

test("the subject line of a commit stays unchanged", () => {
  assert.equal(rewriteCommand(commit("Fix it. Now it works.")), undefined);
});

test("trailer lines stay unchanged", () => {
  assert.equal(
    rewriteCommand(
      commit(`Subject\n\nBody.\n\n${TRAILER}\nSigned-off-by: A. B <a@b.c>`),
    ),
    undefined,
  );
});

test("a body that needs no change gives no output", () => {
  assert.equal(rewriteCommand(pr("Read the file.\nThen edit it.")), undefined);
});

test("another command or a missing closing delimiter gives no output", () => {
  assert.equal(rewriteCommand("echo hi"), undefined);
  assert.equal(rewriteCommand(undefined), undefined);
  assert.equal(
    rewriteCommand(
      `echo "$(cat <<'EOF'\nRead the file. Then edit it.\nEOF\n)"`,
    ),
    undefined,
  );
  assert.equal(
    rewriteCommand(
      `git commit -m "$(cat <<'EOF'\nS\n\nRead it. Then edit it.\n)"`,
    ),
    undefined,
  );
});

test("a second heredoc in the command is not rewritten", () => {
  assert.equal(
    rewriteCommand(
      `${commit("S\n\nRead it. Then edit it.")} && cat <<'X'\nA. B\nX`,
    ),
    undefined,
  );
});
