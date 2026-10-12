// Lab tests of the `attribution` `tool.call` handler on `Bash` (design D39).
// `session.model` and `settings.read` are stubbed, and the stub of `tool.call` records the command that reaches the engine.
// The module runs with all its handlers, so a heredoc commit also passes the `sembr` rewrite.

import type { On } from "claude-code";
import { type Engine, expect, test } from "claude-code/testing";

const TRAILER = "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>";
const PR = "🤖 Generated with [Claude Code](https://claude.com/claude-code)";

/** The stub of the main-loop model, the merged settings, and the recorded commands. */
const engine = (
  on: On,
  {
    model = "claude-opus-5-5",
    settings = {},
    seen,
  }: { model?: string; settings?: Record<string, unknown>; seen: string[] },
) => {
  on("session.model", () => ({ value: model }));
  on("settings.read", () => ({ value: settings }));
  on("tool.call", (_$, e) => {
    if (e.tool === "Bash") seen.push(e.command);
    return { result: "ok" };
  });
};

const bash = ($: Engine, command: string, agentId?: string) =>
  $.tool.call({ tool: "Bash", command, ...(agentId ? { agentId } : {}) });

test("a `git commit -m` gets the trailer of the main model, before the message", async ($: Engine, on: On) => {
  const seen: string[] = [];
  engine(on, { seen });
  await bash($, 'git commit -m "Fix it."');
  expect(seen[0]).toBe(`git commit --trailer "${TRAILER}" -m "Fix it."`);
});

test("a `git commit -F` gets the trailer before the file option", async ($: Engine, on: On) => {
  const seen: string[] = [];
  engine(on, { seen });
  await bash($, "git commit -F msg.txt");
  expect(seen[0]).toBe(`git commit --trailer "${TRAILER}" -F msg.txt`);
});

test("a `git commit` with a heredoc gets the trailer before the heredoc", async ($: Engine, on: On) => {
  const seen: string[] = [];
  engine(on, { seen });
  await bash($, "git commit -F - <<'EOF'\nFix it.\nEOF");
  expect(seen[0]).toBe(
    `git commit --trailer "${TRAILER}" -F - <<'EOF'\nFix it.\nEOF`,
  );
});

test("a `git commit --amend` gets the trailer too, because it makes a commit", async ($: Engine, on: On) => {
  const seen: string[] = [];
  engine(on, { seen });
  await bash($, "git commit --amend --no-edit");
  expect(seen[0]).toBe(`git commit --trailer "${TRAILER}" --amend --no-edit`);
});

test("a message that already holds the trailer keeps its command", async ($: Engine, on: On) => {
  const seen: string[] = [];
  engine(on, { seen });
  const command = `git commit -m "Fix it.\n\n${TRAILER}"`;
  await bash($, command);
  expect(seen[0]).toBe(command);
});

test("an empty `commit` setting turns the commit line off", async ($: Engine, on: On) => {
  const seen: string[] = [];
  engine(on, { seen, settings: { attribution: { commit: "" } } });
  await bash($, 'git commit -m "Fix it."');
  expect(seen[0]).toBe('git commit -m "Fix it."');
});

test("`includeCoAuthoredBy: false` turns both lines off", async ($: Engine, on: On) => {
  const seen: string[] = [];
  engine(on, { seen, settings: { includeCoAuthoredBy: false } });
  await bash($, 'git commit -m "Fix it." && gh pr create --body "Text."');
  expect(seen[0]).toBe(
    'git commit -m "Fix it." && gh pr create --body "Text."',
  );
});

test("a user `attribution` line stays in force, with the model not named", async ($: Engine, on: On) => {
  const seen: string[] = [];
  const line = "Co-Authored-By: Team <team@example.com>";
  engine(on, { seen, settings: { attribution: { commit: line } } });
  await bash($, 'git commit -m "Fix it."');
  expect(seen[0]).toBe(`git commit --trailer "${line}" -m "Fix it."`);
});

test("a `gh pr create` with a quoted body gets the pull request line at its end", async ($: Engine, on: On) => {
  const seen: string[] = [];
  engine(on, { seen });
  await bash($, 'gh pr create --title "Fix" --body "Text."');
  expect(seen[0]).toBe(`gh pr create --title "Fix" --body "Text.\n\n${PR}"`);
});

test("a `gh pr create` with a heredoc body gets the pull request line before the closing line", async ($: Engine, on: On) => {
  const seen: string[] = [];
  engine(on, { seen });
  await bash(
    $,
    `gh pr create --title "Fix" --body "$(cat <<'EOF'\nText.\nEOF\n)"`,
  );
  expect(seen[0]).toBe(
    `gh pr create --title "Fix" --body "$(cat <<'EOF'\nText.\n\n${PR}\nEOF\n)"`,
  );
});

test("an empty `pr` setting turns the pull request line off", async ($: Engine, on: On) => {
  const seen: string[] = [];
  engine(on, { seen, settings: { attribution: { pr: "" } } });
  await bash($, 'gh pr create --body "Text."');
  expect(seen[0]).toBe('gh pr create --body "Text."');
});

test("a call that is not a commit or a pull request keeps its command", async ($: Engine, on: On) => {
  const seen: string[] = [];
  engine(on, { seen });
  for (const command of [
    "git status",
    "git commit --dry-run -m x",
    'echo "git commit -m x"',
    "git log --grep commit",
  ])
    await bash($, command);
  expect(seen).toStrictEqual([
    "git status",
    "git commit --dry-run -m x",
    'echo "git commit -m x"',
    "git log --grep commit",
  ]);
});

test("a model that has no name and version gives the `Claude` fallback", async ($: Engine, on: On) => {
  const seen: string[] = [];
  engine(on, { seen, model: "opus" });
  await bash($, 'git commit -m "Fix it."');
  expect(seen[0]).toBe(
    'git commit --trailer "Co-Authored-By: Claude <noreply@anthropic.com>" -m "Fix it."',
  );
});

test("a commit of a subagent names `Claude`, because the model of a subagent is not read", async ($: Engine, on: On) => {
  const seen: string[] = [];
  engine(on, { seen, model: "claude-haiku-5-5" });
  await bash($, 'git commit -m "Fix it."', "agent-1");
  expect(seen[0]).toBe(
    'git commit --trailer "Co-Authored-By: Claude <noreply@anthropic.com>" -m "Fix it."',
  );
});

test("a heredoc commit gets the trailer and the `sembr` rewrite of its body", async ($: Engine, on: On) => {
  const seen: string[] = [];
  engine(on, { seen });
  await bash(
    $,
    `git commit -m "$(cat <<'EOF'\nFix it. Now it works.\n\nRead the file. Then edit it.\nEOF\n)"`,
  );
  expect(seen[0]).toBe(
    `git commit --trailer "${TRAILER}" -m "$(cat <<'EOF'\nFix it. Now it works.\n\nRead the file.\nThen edit it.\nEOF\n)"`,
  );
});

test("a command the shell reader cannot read keeps its command", async ($: Engine, on: On) => {
  const seen: string[] = [];
  engine(on, { seen });
  await bash($, 'git commit -m "Fix it.');
  expect(seen[0]).toBe('git commit -m "Fix it.');
});
