// The `Bash` write ask of the `adherence` hooks (task 29.9): a write form whose target is a protected file gets an ask.
// Commands are strings. No command runs and no file is read.

import { expect, test } from "bun:test";
import { SHELL_SCAN_MAX_CHARS } from "../../../plugins/dotclaude/kernel/budget.ts";
import type { Io } from "../../../plugins/dotclaude/slices/asks/domain/check.ts";
import { shellWriteReasons } from "../../../plugins/dotclaude/slices/asks/domain/writes.ts";
import { filesByPath } from "./stub-fs.ts";
import type { Verdict } from "./verdicts.ts";
import { decideAsk as decide } from "./verdicts.ts";

/** The `hookSpecificOutput` of an ask, as `decide` gives it. */
type Ask = Verdict["hookSpecificOutput"];

/** The `hookSpecificOutput` fields that the `ask` tests read. */

const NO_IO: Partial<Io> = { read: async () => null };
// Every file exists: an overwrite of a test file or a limits file asks, and a new file does not (see `shellpaths.test.ts`).
const EXISTS: Partial<Io> = { read: async () => "x" };
const out = async (command: string, io = NO_IO): Promise<Ask | undefined> =>
  (
    await decide(
      { tool_name: "Bash", cwd: "/w", tool_input: { command } },
      {},
      io,
    )
  )?.hookSpecificOutput;

/** Asserts an ask whose reason names `file`. */
const asks = async (command: string, file: string, io = EXISTS) => {
  const o = await out(command, io);
  expect(o?.permissionDecision, command).toBe("ask");
  expect(
    o?.permissionDecisionReason?.includes(`\`${file}\``),
    command,
  ).toBeTruthy();
};

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
  test(`the \`Bash\` command \`${command}\` gets an ask that names the file`, async () =>
    await asks(command, TEST, EXISTS));

const PROTECTED = [
  "biome.json",
  "tsconfig.json",
  "vitest.config.ts",
  ".github/workflows/ci.yml",
  "plugins/x/hooks/hooks.json",
  "plugins/x/hooks/register.mjs",
  ".claude/settings.json",
  ".claude/settings.local.json",
  "justfile",
  "Makefile",
  "plugins/x/limits.mjs",
  "plugins/x/lib/budget.ts",
  "pkg/__tests__/a.js",
];
for (const file of PROTECTED)
  test(`a \`Bash\` write to \`${file}\` gets an ask that names the file`, async () => {
    const o = await out(`printf '{}' > ${file}`, EXISTS);
    expect(o?.permissionDecision).toBe("ask");
    expect(o?.permissionDecisionReason?.includes(`\`${file}\``)).toBeTruthy();
  });

test("a script that a `hooks.json` names gets an ask", async () => {
  const files = {
    "/w/plugins/x/hooks/hooks.json": JSON.stringify({
      hooks: {
        Stop: [{ hooks: [{ command: "node ./bin/s.mjs" }] }],
      },
    }),
  };
  await asks("tee plugins/x/bin/s.mjs", "plugins/x/bin/s.mjs", {
    ...filesByPath(files),
  });
});

const WRAPS: [string, (c: string) => string][] = [
  ["`&&`", (c) => `cd /w && ${c} && echo done`],
  ["`;`", (c) => `echo a; ${c}`],
  ["`$(...)`", (c) => `echo "$(${c})"`],
  ["`bash -c`", (c) => `bash -c '${c}'`],
  ["`sh -c`", (c) => `sh -c "${c}"`],
  ["a quoted heredoc", (c) => `bash <<'EOF'\n${c}\nEOF`],
  ["a `sudo` wrapper", (c) => `sudo -u me ${c}`],
];
for (const [name, wrap] of WRAPS) {
  for (const form of [`sed -i '/assert/d' ${TEST}`, `printf '{}' > biome.json`])
    test(`\`${form}\` inside ${name} gets an ask`, async () =>
      await asks(wrap(form), form.endsWith("json") ? "biome.json" : TEST));
}

for (const command of [
  "sed -i 's/a/b/' $F",
  "printf x > $OUT",
  "rm $F",
  "cp src/a.mjs src/*.mjs",
  "tee *",
]) {
  test(`an unresolved path in \`${command}\` gets no ask`, async () =>
    expect(await out(command)).toBe(undefined));
}
for (const [command, file] of [
  ["rm tests/*.test.mjs", "tests/*.test.mjs"],
  ["sed -i s/a/b/ tests/*", "tests/*"],
  ["mv *.test.mjs /tmp", "*.test.mjs"],
] as const)
  test(`a glob or variable in \`${command}\` that matches a protected pattern gets an ask`, async () => {
    const o = await out(command);
    expect(o?.permissionDecision).toBe("ask");
    expect(o?.permissionDecisionReason?.includes(file)).toBeTruthy();
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
  test(`the command \`${command.split("\n")[0]}\` gets no write ask`, async () => {
    expect(await out(command)).toBe(undefined);
  });

test("a command over the scan bound gets a write reason, as the git guard does", async () => {
  // The git guard also asks on this command, so `out` cannot tell the write guard apart.
  const long = `sed -i x ${TEST} ${"a".repeat(SHELL_SCAN_MAX_CHARS)}`;
  const reasons = await shellWriteReasons(long, "/w", async () => null, {
    shell: [],
    code: [],
  });
  expect(reasons.length).toBeGreaterThan(0);
});
