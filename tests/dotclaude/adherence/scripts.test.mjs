// The script files that a `Bash` command runs, for the git ask and the write ask of the `adherence` hooks.
// The files are strings in a fake `read`. No command runs and no file is read.

import assert from "node:assert/strict";
import { test } from "node:test";
import { decide } from "../../../plugins/dotclaude/features/adherence/cli.mjs";
import { SCRIPT_FILES_MAX } from "../../../plugins/dotclaude/features/adherence/limits.mjs";
import { filesByPath } from "./stub-fs.mjs";

const STASH = {
  "/w/x.py": "import os\nos.system('git stash')\n",
  "/w/run.sh": "#!/bin/sh\ngit reset --hard\n",
  "/w/run": "#!/usr/bin/env bash\ngit stash\n",
  "/w/fix.awk": 'BEGIN { system("git stash") }\n',
  "/home/me/x.py": "import os\nos.system('git stash')\n",
  "/w/tests/a.test.mjs": "assert.equal(gitReason('git stash'), 'ask')\n",
  "/w/tool.mjs":
    "readFileSync('tests/a.test.mjs'); readFileSync('biome.json')\n",
  "/w/edit.py": "import os\nos.system('sed -i s/a/b/ tests/a.test.mjs')\n",
};
const out = (command, files = STASH) =>
  decide(
    { tool_name: "Bash", cwd: "/w", tool_input: { command } },
    { HOME: "/home/me" },
    { ...filesByPath(files), transcript: () => null },
  )?.hookSpecificOutput;
const asks = (command, files) =>
  assert.equal(out(command, files)?.permissionDecision, "ask", command);

test("a script file that a program, a shell, or the command itself runs is read", () => {
  for (const command of [
    "python3 x.py",
    "uv run x.py",
    "env A=b python3 -u x.py",
    "bash run.sh",
    "./run",
    "./run.sh",
    "awk -f fix.awk data.txt",
    "python3 ~/x.py",
    "chmod +x run.sh && ./run.sh",
  ])
    asks(command);
});

test("a write form in a script file gets the write ask", () => {
  const o = out("python3 edit.py");
  assert.equal(o?.permissionDecision, "ask");
  assert.ok(o.permissionDecisionReason.includes("`tests/a.test.mjs`"));
});

test("a path that a script file only names gets no ask, unlike a path in inline code", () => {
  assert.equal(out("node tool.mjs"), undefined);
  asks(`node -e "readFileSync('tests/a.test.mjs')"`);
});

test("a test run, a file tool, and an absent file are not read", () => {
  for (const command of [
    "node --test tests/a.test.mjs",
    "npx jest tests/a.test.mjs",
    "python3 -m pytest tests/a.test.mjs",
    "bun test tests/a.test.mjs",
    "cp x.py y.py",
    "sed -i s/a/b/ x.py",
    "rm x.py",
    "python3 absent.py",
    "cat x.py",
  ])
    assert.equal(out(command), undefined, command);
});

test("the asks read at most `SCRIPT_FILES_MAX` files of one command", () => {
  const files = {};
  const names = [];
  for (let n = 0; n <= SCRIPT_FILES_MAX; n++) {
    names.push(`f${n}.py`);
    files[`/w/f${n}.py`] =
      n === SCRIPT_FILES_MAX ? "os.system('git stash')" : "";
  }
  assert.equal(
    out(names.map((f) => `python3 ${f}`).join("; "), files),
    undefined,
  );
  asks(`python3 f${SCRIPT_FILES_MAX}.py`, files);
});

test("an array of options before the git subcommand is read as options", () => {
  assert.equal(out(`git "\${GIT_FIXTURE[@]}" commit -q -m x`), undefined);
  asks(`git "\${GIT_FIXTURE[@]}" stash`);
  asks("git $sub");
});
