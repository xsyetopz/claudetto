// Regression tests for the ask on a weaker hook script or hooks config (package P36).
// Each weakening input asks, and each safe input gets no ask.
// Files are strings and no file is read.

import { expect, test } from "bun:test";
import { asks, write, writeAsks } from "../../calls.ts";

const SH = "/w/.claude/hooks/guard.sh";
const PY = "/w/.claude/hooks/guard.py";
const JS = "/w/.claude/hooks/guard.js";
const SHELL = "#!/bin/sh\nset -e\ncheck foo\nrun bar\n";
const NAMED = "/w/hooks/g.js";
const HOOKS = "/w/hooks/hooks.json";

const shellWith = (line: string): string =>
  `#!/bin/sh\nset -e\ncheck foo\n${line}\nrun bar\n`;

const WEAKENING_SHELL = [
  "export SKIP=1",
  "PATH=/nonexistent",
  'eval "$X"',
  ". ./skip.sh",
  "sleep 1000",
  "cd /nonexistent",
  "unset PATH",
  "shopt -s nullglob",
];

test.each(WEAKENING_SHELL)(
  "an added shell line `%s` in a hook script gets an ask",
  async (line) => {
    expect(await writeAsks(SH, SHELL, shellWith(line))).toBe(true);
  },
);

test("an added line in a Python hook script gets an ask", async () => {
  const text = 'import os\nprint("ok")\n';
  for (const line of ["check = lambda x: 0", "quit()", "os.abort()"]) {
    expect(await writeAsks(PY, text, `${text}${line}\n`)).toBe(true);
  }
});

test("an added line in a JavaScript hook script gets an ask", async () => {
  const text = "const a = 1;\n";
  expect(
    await writeAsks(JS, text, `${text}globalThis.check = () => 0;\n`),
  ).toBe(true);
});

test("an added `process.exit` in a named hook script gets an ask", async () => {
  const hooks = JSON.stringify({
    hooks: {
      PreToolUse: [
        {
          matcher: "Bash",
          hooks: [{ type: "command", command: "node hooks/g.js" }],
        },
      ],
    },
  });
  const text = "const a = 1;\n";
  expect(
    await asks(write(NAMED, `/* x */ process.exit(0)\n${text}`), {
      [NAMED]: text,
      [HOOKS]: hooks,
    }),
  ).toBe(true);
});

test("a garbage line appended to a hooks.json gets an ask", async () => {
  const hooks =
    '{"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"x"}]}]}}\n';
  expect(await writeAsks(HOOKS, hooks, `${hooks}garbage`)).toBe(true);
});

test("an added `set -euo pipefail` line in a hook shell script gets no ask", async () => {
  expect(
    await writeAsks(
      SH,
      SHELL,
      SHELL.replace("set -e\n", "set -e\nset -euo pipefail\n"),
    ),
  ).toBe(false);
});
