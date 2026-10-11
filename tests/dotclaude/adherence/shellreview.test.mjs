// The fourth review of the `Bash` write ask of the `adherence` hooks: path-only kinds outside the root, test suffix names,
// `find` filters, `mv` of a folder, and `git checkout <path>` with no `--`.
// Commands are strings. No command runs. `read` is a stub that tells which files exist.

import assert from "node:assert/strict";
import { test } from "node:test";
import { decide } from "../../../plugins/dotclaude/features/adherence/cli.mjs";

const NONE = { read: () => null, transcript: () => null };
const EXIST = { read: () => "x", transcript: () => null };
const out = (command, io = NONE) =>
  decide({ tool_name: "Bash", cwd: "/w", tool_input: { command } }, {}, io)
    ?.hookSpecificOutput;

function asks(command, file, io = EXIST) {
  const o = out(command, io);
  assert.equal(o?.permissionDecision, "ask", command);
  assert.ok(o.permissionDecisionReason.includes(`\`${file}\``), command);
}

for (const [command, file, kind] of [
  ["cp a ~/.claude/hooks/x.sh", "~/.claude/hooks/x.sh", "hook file"],
  ["cp a $HOME/.claude/hooks/x.sh", "$HOME/.claude/hooks/x.sh", "hook file"],
  [
    `cp a \${HOME}/.claude/hooks/x.sh`,
    `\${HOME}/.claude/hooks/x.sh`,
    "hook file",
  ],
  ["cp a ~/work/biome.json", "~/work/biome.json", "lint config"],
  [
    "cp a /opt/p/.github/workflows/ci.yml",
    "/opt/p/.github/workflows/ci.yml",
    "CI file",
  ],
  ["printf x > /opt/p/justfile", "/opt/p/justfile", "check recipe"],
  ["printf x > ../biome.json", "../biome.json", "lint config"],
  ["rm -r ~/.claude/hooks", "~/.claude/hooks", "hook file"],
])
  test(`\`${command}\` asks and names the kind`, () => {
    asks(command, file);
    assert.ok(out(command, EXIST).permissionDecisionReason.includes(kind));
  });

for (const command of [
  "cp a ~/tests/x.test.mjs",
  "cp a $HOME/limits.mjs",
  "cp a /opt/p/tests/x.test.mjs",
  "printf x > /opt/p/limits.mjs",
  "cp a ~/.claude/notes.md",
])
  test(`\`${command}\` outside the root gets no ask`, () =>
    assert.equal(out(command, EXIST), undefined));

for (const f of [
  "spec/foo_spec.lua",
  "spec/foo_spec.cr",
  "lib/widget_test.dart",
  "src/foo_test.exs",
  "src/foo_test.scala",
  "src/foo_test.zig",
])
  test(`\`${f}\` is a test file`, () => asks(`sed -i s/a/b/ ${f}`, f));

for (const f of ["lint_test.txt", "go_test.log", "a_test.json", "a_spec.md"])
  test(`\`${f}\` is not a test file`, () =>
    assert.equal(out(`printf x > ${f}`, EXIST), undefined));

for (const command of [
  "find tests -name '*.pyc' -delete",
  "find tests -name __pycache__ -exec rm -rf {} +",
  "find tests -iname '*.pyc' -delete",
])
  test(`\`${command}\` gets no ask`, () =>
    assert.equal(out(command, EXIST), undefined));

for (const [command, file] of [
  ["find . -name '*.test.mjs' -delete", "*.test.mjs"],
  ["find tests -delete", "tests"],
  ["find .github/workflows -name '*.yml' -delete", ".github/workflows/*.yml"],
])
  test(`\`${command}\` asks`, () => asks(command, file));

for (const [command, file] of [
  ["mv tests /tmp/old", "tests"],
  ["git mv tests old", "tests"],
])
  test(`\`${command}\` asks`, () => asks(command, file));

for (const command of [
  "git checkout tests/x.test.mjs",
  "git checkout HEAD tests/x.test.mjs",
  "git checkout main -- tests/x.test.mjs",
])
  test(`\`${command}\` asks for an existing test file`, () =>
    asks(command, "tests/x.test.mjs"));

for (const command of [
  "git checkout main",
  "git checkout -b new",
  "git checkout -B new main",
  "git checkout --orphan tests/x.test.mjs",
  "git checkout -b new tests/x.test.mjs",
  "git checkout feature/x",
])
  test(`\`${command}\` is a branch switch and gets no write ask`, () => {
    const o = out(command, EXIST);
    assert.ok(
      o === undefined || !o.permissionDecisionReason.includes("tests/x.test"),
      command,
    );
    assert.ok(
      o === undefined ||
        !o.permissionDecisionReason.includes("writes the path"),
      command,
    );
  });

test("`git checkout tests/x.test.mjs` for a path that does not exist gets no write ask", () => {
  const o = out("git checkout tests/x.test.mjs", NONE);
  assert.ok(
    o === undefined || !o.permissionDecisionReason.includes("writes the path"),
  );
});
