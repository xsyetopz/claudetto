// The path rules and the add-only rule of the `Bash` write ask of the `adherence` hooks (third review).
// Commands are strings. No command runs. `read` is a stub that tells which files exist.

import assert from "node:assert/strict";
import { test } from "node:test";
import { decide } from "../../../plugins/dotclaude/features/adherence/cli.mjs";
import { checkCall } from "../../../plugins/dotclaude/features/adherence/rules.mjs";

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

for (const [command, file] of [
  ["sed -i '' 's/a/b/' tests/a.test.mjs", "tests/a.test.mjs"],
  ["git rm tests/a.test.mjs", "tests/a.test.mjs"],
  ["git rm -r tests", "tests"],
  ["git mv tests/a.test.mjs src/a.mjs", "tests/a.test.mjs"],
  ["find . -name '*.test.mjs' -delete", "*.test.mjs"],
  ["find tests -type f -delete", "tests"],
  ["find . -path '*/tests/*' -exec rm {} +", "*/tests/*"],
  ["git restore -S -W tests/a.test.mjs", "tests/a.test.mjs"],
  ["git restore -SW tests/a.test.mjs", "tests/a.test.mjs"],
  ["echo > ~/.claude/settings.json", "~/.claude/settings.json"],
  ['cp a.json "$CLAUDE_PROJECT_DIR"/biome.json', "biome.json"],
  ["cp a.json $CLAUDE_PROJECT_DIR/biome.json", "biome.json"],
  ["cp a.json /w/biome.json", "biome.json"],
  ["cat > tests/a.test.mjs <<'EOF'\nx\nEOF", "tests/a.test.mjs"],
  ["cp src/a.mjs tests/a.test.mjs", "tests/a.test.mjs"],
  ["mv src/a.mjs plugins/x/limits.mjs", "plugins/x/limits.mjs"],
  ["ln -sf src/a.mjs tests/a.test.mjs", "tests/a.test.mjs"],
  ["tee plugins/x/budget.mjs", "plugins/x/budget.mjs"],
])
  test(`\`${command.split("\n")[0]}\` asks and names the path`, () =>
    asks(command, file));

test("a write to a new path-only file still asks", () =>
  asks("printf x > biome.json", "biome.json", NONE));

for (const command of [
  "sed -i '' 's/test/check/' README.md",
  "cp a.txt $TMPDIR/test/",
  "go test ./... > /tmp/go_test.log",
  "echo > ~/tests/x",
  "cp a.log /tmp/test/a.log",
  "npm run lint > lint_test.txt",
  "printf x > ../tests/a.test.mjs",
  "printf x > $ROOT/tests/a.test.mjs",
  "git rm --cached tests/a.test.mjs",
  "find src -name '*.mjs' -delete",
  "find . -name '*.mjs' -exec cp {} /tmp +",
  "git restore -S tests/a.test.mjs",
  "echo hi > /dev/null",
  "echo hi > /dev/tty",
  "printf x >> tests/a.test.mjs",
  "echo x | tee -a plugins/x/limits.mjs",
])
  test(`\`${command}\` gets no ask`, () =>
    assert.equal(out(command, EXIST), undefined));

for (const command of [
  "cat > tests/new.test.mjs <<'EOF'\nx\nEOF",
  "printf x > tests/new.test.mjs",
  "printf x >| plugins/x/limits.mjs",
  "cp src/a.mjs tests/new.test.mjs",
  "install -m 644 src/a.mjs tests/new.test.mjs",
  "mv src/a.mjs tests/new.test.mjs",
  "git mv src/a.mjs tests/new.test.mjs",
  "echo x | tee tests/new.test.mjs",
  "ln -sf src/a.mjs tests/new.test.mjs",
  "cp a.json tests/new/",
])
  test(`\`${command.split("\n")[0]}\` adds a new test or limits file and gets no ask`, () =>
    assert.equal(out(command, NONE), undefined));

test("`sed -i` of an absent-looking test path still asks", () =>
  asks("sed -i 's/a/b/' tests/a.test.mjs", "tests/a.test.mjs", NONE));

test("a `.txt` or `.log` file with the name part `_test` is not a test file", () => {
  for (const f of ["lint_test.txt", "go_test.log"])
    assert.equal(out(`printf x > ${f}`, EXIST), undefined, f);
  asks("printf x > a_test.go", "a_test.go");
});

for (const line of ["test.todo('a')", "it.todo('a')", "describe.todo('a')"])
  test(`an added \`${line}\` in a test file asks`, () => {
    const o = checkCall(
      {
        tool_name: "Write",
        cwd: "/w",
        tool_input: { file_path: "/w/tests/a.test.mjs", content: `${line}\n` },
      },
      { ...NONE, root: "/w" },
    );
    assert.equal(o.ask.length, 1, line);
  });

test("one hook call reads each file one time and `> /dev/null` reads none", () => {
  const reads = [];
  const io = {
    read: (f) => {
      reads.push(f);
      return "x";
    },
    transcript: () => null,
  };
  out("echo hi > /dev/null", io);
  assert.equal(reads.length, 0);
  out("printf x > a.log; printf y > b.log; printf z > a.log", io);
  assert.equal(new Set(reads).size, reads.length, reads.join());
  assert.ok(reads.length > 0);
});
