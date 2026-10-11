// The `Bash` write ask of the `adherence` hooks (task 29.9): a write form whose target is a protected file gets an ask.
// Commands are strings. No command runs and no file is read.

import assert from "node:assert/strict";
import { test } from "node:test";
import { decide } from "../../../plugins/dotclaude/features/adherence/cli.mjs";
import { SHELL_SCAN_MAX_CHARS } from "../../../plugins/dotclaude/lib/budget.mjs";

const NO_IO = { read: () => null, transcript: () => null };
// Every file exists: an overwrite of a test file or a limits file asks, and a new file does not (see `shellpaths.test.mjs`).
const EXISTS = { read: () => "x", transcript: () => null };
const out = (command, io = NO_IO) =>
  decide({ tool_name: "Bash", cwd: "/w", tool_input: { command } }, {}, io)
    ?.hookSpecificOutput;

/** Asserts an ask whose reason names `file`. */
function asks(command, file, io) {
  const o = out(command, io);
  assert.equal(o?.permissionDecision, "ask", command);
  assert.ok(o.permissionDecisionReason.includes(`\`${file}\``), command);
}

const TEST = "tests/x.test.mjs";
const FORMS = [
  `sed -i '/assert/d' ${TEST}`,
  `sed -i.bak 's/a/b/' ${TEST}`,
  `sed --in-place 's/a/b/' ${TEST}`,
  `sed -Ei 's/a+/b/' ${TEST}`,
  `sed -n -i -e 's/a/b/' ${TEST}`,
  `perl -i -ne 'print' ${TEST}`,
  `perl -pi -e 's/a/b/' ${TEST}`,
  `perl -pi.bak -e 's/a/b/' ${TEST}`,
  `printf x > ${TEST}`,
  `printf x 1> ${TEST}`,
  `printf x &> ${TEST}`,
  `printf x >| ${TEST}`,
  `printf x >${TEST}`,
  `echo x | tee ${TEST}`,
  `cp src/a.mjs ${TEST}`,
  `cp -f src/a.mjs ${TEST}`,
  `cp -t tests src/a.mjs ./${TEST}`,
  `mv src/a.mjs ${TEST}`,
  `mv ${TEST} /tmp/old`,
  `install -m 644 src/a.mjs ${TEST}`,
  `rm ${TEST}`,
  `rm -f ./tests/../${TEST}`,
  `unlink ${TEST}`,
  `truncate -s 0 ${TEST}`,
  `ln -sf src/a.mjs ${TEST}`,
  `git checkout -- ${TEST}`,
  `git restore ${TEST}`,
  `git restore --source=HEAD~1 ${TEST}`,
  `sudo sed -i 's/a/b/' ${TEST}`,
  `cat src/a.mjs | sed -i 's/a/b/' ${TEST}`,
];
for (const command of FORMS)
  test(`the \`Bash\` command \`${command}\` gets an ask that names the file`, () =>
    asks(command, TEST, EXISTS));

const KINDS = [
  ["biome.json", "a lint config file"],
  ["tsconfig.json", "a lint config file"],
  ["vitest.config.ts", "a check runner config"],
  [".github/workflows/ci.yml", "a CI file"],
  ["plugins/x/hooks/hooks.json", "a hook file"],
  ["plugins/x/hooks/register.mjs", "a hook file"],
  [".claude/settings.json", "a settings file"],
  [".claude/settings.local.json", "a settings file"],
  ["justfile", "a build file with a check recipe"],
  ["Makefile", "a build file with a check recipe"],
  ["plugins/x/limits.mjs", "a limits file"],
  ["plugins/x/lib/budget.mjs", "a limits file"],
  ["pkg/__tests__/a.js", "a test file"],
];
for (const [file, kind] of KINDS)
  test(`a \`Bash\` write to \`${file}\` gets an ask that names the kind`, () => {
    const o = out(`printf '{}' > ${file}`, EXISTS);
    assert.equal(o?.permissionDecision, "ask");
    assert.ok(o.permissionDecisionReason.includes(`\`${file}\``));
    assert.ok(o.permissionDecisionReason.includes(kind));
  });

test("a script that a `hooks.json` names gets an ask", () => {
  const files = {
    "/w/plugins/x/hooks/hooks.json": JSON.stringify({
      hooks: {
        Stop: [{ hooks: [{ command: "node ./bin/s.mjs" }] }],
      },
    }),
  };
  asks("tee plugins/x/bin/s.mjs", "plugins/x/bin/s.mjs", {
    read: (f) => files[f] ?? null,
    transcript: () => null,
  });
});

for (const [name, wrap] of [
  ["`&&`", (c) => `cd /w && ${c} && echo done`],
  ["`;`", (c) => `echo a; ${c}`],
  ["`$(...)`", (c) => `echo "$(${c})"`],
  ["`bash -c`", (c) => `bash -c '${c}'`],
  ["`sh -c`", (c) => `sh -c "${c}"`],
  ["a quoted heredoc", (c) => `bash <<'EOF'\n${c}\nEOF`],
  ["a `sudo` wrapper", (c) => `sudo -u me ${c}`],
]) {
  for (const form of [`sed -i '/assert/d' ${TEST}`, `printf '{}' > biome.json`])
    test(`\`${form}\` inside ${name} gets an ask`, () =>
      asks(wrap(form), form.endsWith("json") ? "biome.json" : TEST));
}

for (const command of [
  "sed -i 's/a/b/' $F",
  "printf x > $OUT",
  "rm $F",
  "cp src/a.mjs src/*.mjs",
  "tee *",
]) {
  test(`an unresolved path in \`${command}\` gets no ask`, () =>
    assert.equal(out(command), undefined));
}
for (const [command, file] of [
  ["rm tests/*.test.mjs", "tests/*.test.mjs"],
  ["sed -i s/a/b/ tests/*", "tests/*"],
  ["mv *.test.mjs /tmp", "*.test.mjs"],
])
  test(`a glob or variable in \`${command}\` that matches a protected pattern gets an ask`, () => {
    const o = out(command);
    assert.equal(o?.permissionDecision, "ask");
    assert.ok(o.permissionDecisionReason.includes(file));
  });

for (const command of [
  `sed -n '1,5p' ${TEST}`,
  "sed 's/a/b/' tests/x.test.mjs",
  "sed -i 's/a/b/' src/a.mjs",
  "printf x > out.log",
  "printf x > $ROOT/tests/a.test.mjs",
  `printf x >> ${TEST}`,
  `echo x | tee -a ${TEST}`,
  "echo hi > /dev/null",
  "echo hi 2>&1 | cat",
  "ls 2>/dev/null",
  "cp src/a.mjs src/b.mjs",
  "cp tests/x.test.mjs src/copy.mjs",
  "cat tests/x.test.mjs",
  "cat tests/x.test.mjs > out.log",
  "grep -r skip tests",
  "ln -s src/a.mjs tests/x.test.mjs",
  "echo 'sed -i x tests/x.test.mjs'",
  "bash -c 'cat tests/x.test.mjs'",
  "bash <<'EOF'\ncat tests/x.test.mjs\nEOF",
  "perl -ne 'print' tests/x.test.mjs",
])
  test(`the command \`${command.split("\n")[0]}\` gets no write ask`, () => {
    assert.equal(out(command), undefined);
  });

test("a command over the scan bound keeps the existing behavior", () => {
  const long = `sed -i x ${TEST} ${"a".repeat(SHELL_SCAN_MAX_CHARS)}`;
  const o = out(long);
  assert.ok(o === undefined || !o.permissionDecisionReason.includes(TEST));
});
