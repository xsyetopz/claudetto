// The git ask of the `adherence` hooks (design D34, case S2) with commands as strings.
// No command runs and no file is read.

import assert from "node:assert/strict";
import { test } from "node:test";
import { decide } from "../../../plugins/dotclaude/features/adherence/cli.mjs";
import { SHELL_SCAN_MAX_CHARS } from "../../../plugins/dotclaude/lib/budget.mjs";

const NO_IO = { read: () => null, exists: () => false, transcript: () => null };
const out = (command) =>
  decide({ tool_name: "Bash", cwd: "/w", tool_input: { command } }, {}, NO_IO)
    ?.hookSpecificOutput;

for (const command of [
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
  "timeout 5 git reset --hard",
  "env -i git reset --hard",
  "nice -n 5 git reset --hard",
  "xargs git stash",
  "echo hi; git stash\ngit status",
]) {
  test(`\`${command}\` gets an ask`, () => {
    const o = out(command);
    assert.equal(o.hookEventName, "PreToolUse");
    assert.equal(o.permissionDecision, "ask");
    assert.equal(typeof o.permissionDecisionReason, "string");
  });
}

for (const command of [
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
]) {
  test(`\`${command}\` gets no ask`, () => {
    assert.equal(out(command), undefined);
  });
}

test("the command after a heredoc is still read", () => {
  assert.equal(
    out("cat <<'EOF'\ngit status\nEOF\ngit stash").permissionDecision,
    "ask",
  );
});

test("a `git stash` in the brief of the `test-runner` script gets an ask", () => {
  // The script of `agents/test-runner.md` runs each heredoc line with `bash -c "$c"`.
  const script = (lines) =>
    `d=$(mktemp -d); i=0\nwhile IFS= read -r c; do i=$((i+1))\n  bash -c "$c" > "$d/$i.log" 2>&1 </dev/null; printf '%s :: %s\\n' "$?" "$c"\ndone <<'CMDS'\n${lines}\nCMDS\necho "logs: $d"`;
  assert.equal(
    out(script("just test\ngit stash -q")).permissionDecision,
    "ask",
  );
  assert.equal(out(script("just test\njust lint")), undefined);
});

test("a quoted heredoc or a here-string that a shell, a loop, or `xargs` runs gets an ask", () => {
  for (const command of [
    "cat <<'X' | sh\ngit stash\nX",
    "sh -c \"$(cat)\" <<'X'\ngit stash\nX",
    "eval $(cat <<'X'\ngit stash\nX\n)",
    "xargs -I{} sh -c '{}' <<'X'\ngit stash\nX",
    "xargs git <<'X'\nstash\nX",
    "source /dev/stdin <<'X'\ngit stash\nX",
    ". /dev/stdin <<'X'\ngit stash\nX",
    'f=$(mktemp); cat > "$f" <<\'X\'\ngit stash\nX\nbash "$f"',
    "while read a; do git $a; done <<'X'\nstash\nX",
    "git $(cat <<'X'\nstash\nX\n)",
    "bash <<< 'git stash'",
  ])
    assert.equal(out(command)?.permissionDecision, "ask", command);
});

test("a quoted heredoc of text gets no ask, also next to a script in a variable", () => {
  for (const command of [
    "cat > wiki/Git.md <<'EOF'\nRun `git stash` to keep work.\nEOF\n\"$CLAUDE_PLUGIN_ROOT/bin/x\" build",
    "bash -c 'echo $HOME'\ncat > a.md <<'EOF'\ngit stash\nEOF",
    "cat <<< 'git stash'",
  ])
    assert.equal(out(command), undefined, command);
});

test("a call of another tool, or with no input, gets no ask", () => {
  assert.equal(
    decide({ tool_name: "Read", tool_input: {} }, {}, NO_IO),
    undefined,
  );
  assert.equal(decide({ tool_name: "Bash" }, {}, NO_IO), undefined);
  assert.equal(decide(undefined, {}, NO_IO), undefined);
});

test("a command that is not text fails open", () => {
  const o = decide(
    { tool_name: "Bash", tool_input: { command: 5 } },
    {},
    NO_IO,
  );
  assert.equal(o, undefined);
});

for (const command of [
  "echo $(git stash)",
  'echo "$(git stash)"',
  "echo `git stash`",
  "cat <<EOF\n$(git stash)\nEOF",
  "git \\\nstash",
  "{ git stash; }",
  "if true; then git stash; fi",
  "while x; do git stash; done",
  "! git stash",
  "git stash>/dev/null",
  "bash -c -- 'git stash'",
  "sudo --user x git stash",
  "xargs --max-args 1 git stash",
  "doas -u x git stash",
  "ionice -c 3 git stash",
  "setsid git stash",
  "chrt 10 git stash",
  "echo ok # note\ngit stash",
]) {
  test(`\`${JSON.stringify(command)}\` gets an ask`, () => {
    assert.equal(out(command)?.permissionDecision, "ask");
  });
}

for (const command of [
  "git commit -F - <<'EOF'\nAsk before `git stash`.\nEOF",
  "git commit -m \"$(cat <<'EOF'\nUse `git restore f` here.\nEOF\n)\"",
  "gh pr create --body \"$(cat <<'EOF'\nNever `git reset --hard`.\nEOF\n)\"",
  "git commit -m 'Ask before `git stash`'",
  "cat <<'EOF' > n.md\n$(git stash)\nEOF",
  "echo '$(git stash)'",
  "echo hi # `git stash`",
  "echo ok 2>&1",
]) {
  test(`\`${JSON.stringify(command)}\` gets no ask`, () => {
    assert.equal(out(command), undefined);
  });
}

test("a nest of 2 KB of `$(` ends within 200 ms", () => {
  const started = performance.now();
  out("$(".repeat(1000));
  assert.ok(performance.now() - started < 200);
});

test("a command over the scan bound gets an ask", () => {
  const o = out(`echo ${"a".repeat(SHELL_SCAN_MAX_CHARS)}`);
  assert.equal(o.permissionDecision, "ask");
});
