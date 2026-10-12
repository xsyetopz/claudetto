// The silent `sembr` hook on `Bash` (spec semantic-line-breaks, requirement "Commit and pull request text"):
// the quoted heredoc of `git commit -m` and `gh pr create --body`, and no other form.
// The tests give commands to the hook as strings and never run them.

import { expect, test } from "bun:test";
import { rewriteCommand } from "../../../src/plugins/dotclaude/slices/sembr/domain/rewrite.ts";

const bash = (command: string) => command;
const commit = (body: string, tag = "'EOF'") =>
  `git commit -m "$(cat <<${tag}\n${body}\nEOF\n)"`;
const pr = (body: string, title = "Fix. It works") =>
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
  expect(out).toBe(
    commit(
      `Fix it. Now it works.\n\nRead the file.\nThen edit it.\n\n${TRAILER}`,
    ),
  );
});

test("a quoted heredoc of `gh pr create` is rewritten, with the `--title` kept", () => {
  const out = rewriteCommand(bash(pr("Read the file. Then edit it.")));
  expect(out).toBe(pr("Read the file.\nThen edit it."));
});

test("`-F file` and `--body-file file` are not rewritten", () => {
  expect(rewriteCommand(bash("git commit -F msg.txt"))).toBe(undefined);
  expect(
    rewriteCommand(bash('gh pr create --title "T" --body-file body.md')),
  ).toBe(undefined);
  expect(
    rewriteCommand(
      bash(`git commit -F - <<'EOF'\nRead the file. Then edit it.\nEOF`),
    ),
  ).toBe(undefined);
});

test("a `-m` string with no heredoc is not rewritten", () => {
  expect(
    rewriteCommand(bash('git commit -m "Read the file. Then edit it."')),
  ).toBe(undefined);
});

test("an unquoted heredoc is not rewritten, because the shell expands it", () => {
  expect(rewriteCommand(commit("Read $HOME. Then edit it.", "EOF"))).toBe(
    undefined,
  );
  expect(rewriteCommand(commit("Read the file. Then edit it.", '"EOF"'))).toBe(
    undefined,
  );
});

test("a body where a sembr output line would equal the delimiter is not rewritten", () => {
  expect(rewriteCommand(commit("Subject\n\nBody text. EOF"))).toBe(undefined);
  expect(rewriteCommand(pr("Body text. EOF"))).toBe(undefined);
});

test("the subject line of a commit stays unchanged", () => {
  expect(rewriteCommand(commit("Fix it. Now it works."))).toBe(undefined);
});

test("trailer lines stay unchanged", () => {
  expect(
    rewriteCommand(
      commit(`Subject\n\nBody.\n\n${TRAILER}\nSigned-off-by: A. B <a@b.c>`),
    ),
  ).toBe(undefined);
});

test("a body that needs no change gives no output", () => {
  expect(rewriteCommand(pr("Read the file.\nThen edit it."))).toBe(undefined);
});

test("another command or a missing closing delimiter gives no output", () => {
  expect(rewriteCommand("echo hi")).toBe(undefined);
  expect(rewriteCommand(undefined)).toBe(undefined);
  expect(
    rewriteCommand(
      `echo "$(cat <<'EOF'\nRead the file. Then edit it.\nEOF\n)"`,
    ),
  ).toBe(undefined);
  expect(
    rewriteCommand(
      `git commit -m "$(cat <<'EOF'\nS\n\nRead it. Then edit it.\n)"`,
    ),
  ).toBe(undefined);
});

test("a second heredoc in the command is not rewritten", () => {
  expect(
    rewriteCommand(
      `${commit("S\n\nRead it. Then edit it.")} && cat <<'X'\nA. B\nX`,
    ),
  ).toBe(undefined);
});
