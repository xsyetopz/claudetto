// The fourth review of the `Bash` write ask of the `adherence` hooks: path-only kinds outside the root, test suffix names,
// `find` filters, `mv` of a folder, and `git checkout <path>` with no `--`.
// Commands are strings. No command runs. `read` is a stub that tells which files exist.

import { expect, test } from "bun:test";
import type { Io } from "../../../plugins/dotclaude/slices/asks/domain/check.ts";
import type { Verdict } from "./verdicts.ts";
import { decideAsk as decide } from "./verdicts.ts";

/** The `hookSpecificOutput` of an ask, as `decide` gives it. */
type Ask = Verdict["hookSpecificOutput"];

/** The `hookSpecificOutput` fields that the `ask` tests read. */

const NONE: Partial<Io> = { read: async () => null };
const EXIST: Partial<Io> = { read: async () => "x" };
const out = async (command: string, io = NONE): Promise<Ask | undefined> =>
  (
    await decide(
      { tool_name: "Bash", cwd: "/w", tool_input: { command } },
      {},
      io,
    )
  )?.hookSpecificOutput;

async function asks(command: string, file: string, io = EXIST) {
  const o = await out(command, io);
  expect(o?.permissionDecision, command).toBe("ask");
  expect(
    o?.permissionDecisionReason?.includes(`\`${file}\``),
    command,
  ).toBeTruthy();
}

for (const [command, file] of [
  ["cp a ~/.claude/hooks/x.sh", "~/.claude/hooks/x.sh"],
  ["cp a $HOME/.claude/hooks/x.sh", "$HOME/.claude/hooks/x.sh"],
  [`cp a \${HOME}/.claude/hooks/x.sh`, `\${HOME}/.claude/hooks/x.sh`],
  ["cp a ~/work/biome.json", "~/work/biome.json"],
  ["cp a /opt/p/.github/workflows/ci.yml", "/opt/p/.github/workflows/ci.yml"],
  ["printf x > /opt/p/justfile", "/opt/p/justfile"],
  ["printf x > ../biome.json", "../biome.json"],
  ["rm -r ~/.claude/hooks", "~/.claude/hooks"],
] as const)
  test(`\`${command}\` asks`, async () => {
    await asks(command, file);
  });

for (const command of [
  "cp a ~/tests/x.test.mjs",
  "cp a $HOME/limits.mjs",
  "cp a /opt/p/tests/x.test.mjs",
  "printf x > /opt/p/limits.mjs",
  "cp a ~/.claude/notes.md",
])
  test(`\`${command}\` outside the root gets no ask`, async () =>
    expect(await out(command, EXIST)).toBe(undefined));

for (const f of [
  "spec/foo_spec.lua",
  "spec/foo_spec.cr",
  "lib/widget_test.dart",
  "src/foo_test.exs",
  "src/foo_test.scala",
  "src/foo_test.zig",
])
  test(`\`${f}\` is a test file`, async () =>
    await asks(`sed -i s/a/b/ ${f}`, f));

for (const f of ["lint_test.txt", "go_test.log", "a_test.json", "a_spec.md"])
  test(`\`${f}\` is not a test file`, async () =>
    expect(await out(`printf x > ${f}`, EXIST)).toBe(undefined));

for (const command of [
  "find tests -name '*.pyc' -delete",
  "find tests -name __pycache__ -exec rm -rf {} +",
  "find tests -iname '*.pyc' -delete",
])
  test(`\`${command}\` gets no ask`, async () =>
    expect(await out(command, EXIST)).toBe(undefined));

for (const [command, file] of [
  ["find . -name '*.test.mjs' -delete", "*.test.mjs"],
  ["find tests -delete", "tests"],
  ["find .github/workflows -name '*.yml' -delete", ".github/workflows/*.yml"],
] as const)
  test(`\`${command}\` asks`, async () => await asks(command, file));

for (const [command, file] of [
  ["mv tests /tmp/old", "tests"],
  ["git mv tests old", "tests"],
] as const)
  test(`\`${command}\` asks`, async () => await asks(command, file));

for (const command of [
  "git checkout tests/x.test.mjs",
  "git checkout HEAD tests/x.test.mjs",
  "git checkout main -- tests/x.test.mjs",
])
  test(`\`${command}\` asks for an existing test file`, async () =>
    await asks(command, "tests/x.test.mjs"));

for (const command of [
  "git checkout main",
  "git checkout -b new",
  "git checkout -B new main",
  "git checkout --orphan tests/x.test.mjs",
  "git checkout -b new tests/x.test.mjs",
  "git checkout feature/x",
])
  test(`\`${command}\` is a branch switch and gets no write ask`, async () => {
    const o = await out(command, EXIST);
    expect(
      o === undefined || !o.permissionDecisionReason?.includes("tests/x.test"),
      command,
    ).toBeTruthy();
  });

test("`git checkout tests/x.test.mjs` for a path that does not exist gets no write ask", async () => {
  const o = await out("git checkout tests/x.test.mjs", NONE);
  expect(o?.permissionDecision).not.toBe("ask");
});
